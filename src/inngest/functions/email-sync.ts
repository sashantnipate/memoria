import { inngest } from "../client";
import { google } from "googleapis";
import { connectToDB } from "@/lib/database/db";
import User from "@/lib/database/models/user.model";
import EmailMemory from "@/lib/database/models/email-memory.model";
import { generateEmailEmbedding } from "@/lib/openai";

export const syncGmailProcess = inngest.createFunction(
  { 
    id: "sync-gmail-and-embed", 
    retries: 3,
    // 🚨 FIX 1: Prevent two syncs for the same user from running at the exact same time
    concurrency: {
      limit: 1, 
      key: "event.data.userId", 
    },
    triggers: [{ event: "gmail/sync.requested" }]
  },
  async ({ event, step }) => { 
    const { userId, accessToken, after, before, autoSyncInterval } = event.data as any;

    const gaps = await step.run("calculate-gaps", async () => {
      await connectToDB();
      const user = await User.findOne({ clerkId: userId });
      const settings = user?.syncSettings;

      const rStart = Math.floor(new Date(after).getTime() / 1000);
      const rEnd = Math.floor(new Date(before).getTime() / 1000);

      const kStart = settings?.oldestSyncedTimestamp ? Math.floor(settings.oldestSyncedTimestamp / 1000) : null;
      const kEnd = settings?.lastSyncedTimestamp ? Math.floor(settings.lastSyncedTimestamp / 1000) : null;

      const queries = [];
      if (!kStart || rStart < kStart) queries.push({ q: `after:${rStart} before:${kStart ? kStart - 1 : rEnd}`, type: 'history' });
      if (kEnd && rEnd > kEnd) queries.push({ q: `after:${kEnd + 1} before:${rEnd}`, type: 'future' });
      if (!kStart && !kEnd) queries.push({ q: `after:${rStart} before:${rEnd}`, type: 'fresh' });
      return queries;
    });

    if (gaps.length === 0) return { message: "Already synced" };

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    let finalTotalProcessed = 0;
    
    // Create one master array to hold all new emails found during this sync
    const allNewAiEvents: any[] = []; 

    for (const gap of gaps) {
      const messageIds = await step.run(`fetch-ids-${gap.type}`, async () => {
        let allIds: string[] = [];
        let pageToken: string | undefined = undefined;
        do {
          const res = await gmail.users.messages.list({
            userId: "me",
            q: `${gap.q} -in:trash -in:spam -label:CHAT -label:DRAFT`,
            maxResults: 500,
            pageToken: pageToken,
          });
          const msgs = res.data.messages || [];
          allIds.push(...msgs.map(m => m.id!));
          pageToken = res.data.nextPageToken || undefined;
        } while (pageToken);
        return allIds.reverse(); 
      });

      if (messageIds.length === 0) continue;

      // 🚨 FIX 2: Deduplicate the array to ensure Gmail didn't send the same ID twice
      const uniqueMessageIds = [...new Set(messageIds)];

      for (let i = 0; i < uniqueMessageIds.length; i += 5) {
        const chunk = uniqueMessageIds.slice(i, i + 5);
        
        const chunkData = await step.run(`process-chunk-${gap.type}-${i}`, async () => {
          await connectToDB();
          
          // Using a Map to guarantee absolutely no duplicates inside the bulkOps array
          const bulkOpsMap = new Map();
          const processedEmails = []; 

          for (const id of chunk) {
            try {
              const detail = await gmail.users.messages.get({ userId: "me", id: id, format: "full" });
              const headers = detail.data.payload?.headers;
              const rawSubject = headers?.find(h => h.name === 'Subject')?.value || "No Subject";
              const cleanSubject = rawSubject.replace(/\r?\n|\r/g, ' ').trim();
              const fromStr = headers?.find(h => h.name === 'From')?.value || "";
              
              let bodyText = "";
              const payload = detail.data.payload;
              if (payload?.parts) {
                const plainPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
                bodyText = plainPart?.body?.data ? Buffer.from(plainPart.body.data, 'base64url').toString('utf-8') : "";
              } else {
                bodyText = payload?.body?.data ? Buffer.from(payload.body.data, 'base64url').toString('utf-8') : "";
              }

              const cleanText = bodyText.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim().slice(0, 8000);
              const vector = await generateEmailEmbedding(cleanSubject, cleanText || "Empty Email Content");

              if (vector) {
                // Add to Map using gmailId as the key to prevent duplicates
                bulkOpsMap.set(id, {
                  updateOne: {
                    filter: { gmailId: id, userId: userId },
                    update: {
                      $set: {
                        threadId: detail.data.threadId,
                        subject: cleanSubject,
                        from: fromStr,
                        to: headers?.find(h => h.name === 'To')?.value || "",
                        date: headers?.find(h => h.name === 'Date')?.value || "",
                        snippet: detail.data.snippet || "",
                        body: cleanText,
                        embedding: vector, 
                        internalDate: parseInt(detail.data.internalDate || "0"),
                      }
                    },
                    upsert: true
                  }
                });

                processedEmails.push({ subject: cleanSubject, from: fromStr, body: cleanText });
              }
            } catch (err) {
              console.error(`Error processing email ${id}:`, err);
            }
          }

          const bulkOps = Array.from(bulkOpsMap.values());

          if (bulkOps.length > 0) {
            await EmailMemory.bulkWrite(bulkOps, { ordered: false });
          }
          
          return processedEmails;
        });

        if (chunkData && chunkData.length > 0 && gap.type !== 'history') {
          const eventsFromThisChunk = chunkData.map(email => ({
            name: "email/new.received",
            data: { userId, subject: email.subject, from: email.from, body: email.body }
          }));
          allNewAiEvents.push(...eventsFromThisChunk);
        }
        
        finalTotalProcessed += (chunkData?.length || 0);
      }
    }

    if (allNewAiEvents.length > 0) {
      await step.sendEvent("dispatch-all-ai-triage-events", allNewAiEvents as any);
    }

    await step.run("final-metadata-update", async () => {
      await connectToDB();
      await User.findOneAndUpdate(
        { clerkId: userId },
        { 
          $set: { 
            "syncSettings.lastSyncedTimestamp": new Date(before).getTime(),
            "syncSettings.oldestSyncedTimestamp": new Date(after).getTime(),
            "syncSettings.isInitialSyncDone": true,
            "syncSettings.autoSyncInterval": autoSyncInterval,
            "syncSettings.updatedAt": new Date()
          } 
        }
      );
    });

    return { success: true, totalProcessed: finalTotalProcessed, totalEventsDispatched: allNewAiEvents.length };
  }
);