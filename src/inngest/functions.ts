import { inngest } from "./client";
import { google } from "googleapis";
import { connectToDB } from "@/lib/database/db";
import User from "@/lib/database/models/user.model";
import EmailMemory from "@/lib/database/models/email-memory.model";
import { generateEmailEmbedding } from "@/lib/openai";

export const syncGmailProcess = inngest.createFunction(
  { 
    id: "sync-gmail-and-embed", 
    retries: 3,
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
      if (!kStart || rStart < kStart) {
        queries.push({ q: `after:${rStart} before:${kStart ? kStart - 1 : rEnd}`, type: 'history' });
      }
      if (kEnd && rEnd > kEnd) {
        queries.push({ q: `after:${kEnd + 1} before:${rEnd}`, type: 'future' });
      }
      if (!kStart && !kEnd) { 
         queries.push({ q: `after:${rStart} before:${rEnd}`, type: 'fresh' });
      }
      return queries;
    });

    if (gaps.length === 0) return { message: "Already synced" };

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    let totalProcessed = 0;

    for (const gap of gaps) {
      
      const messageIds = await step.run(`fetch-ids-${gap.type}`, async () => {
        let allIds: string[] = [];
        let pageToken: string | undefined = undefined;

        do {
          const res = await gmail.users.messages.list({
            userId: "me",
            // Gets EVERYTHING except noise. No tab limits.
            q: `${gap.q} -in:trash -in:spam -label:CHAT -label:DRAFT`,
            maxResults: 500, // Google's strict API max per call
            pageToken: pageToken,
          });

          const msgs = res.data.messages || [];
          allIds.push(...msgs.map(m => m.id!));
          
          pageToken = res.data.nextPageToken || undefined;
        } while (pageToken);

        return allIds.reverse(); 
      });

      for (let i = 0; i < messageIds.length; i += 10) {
        const chunk = messageIds.slice(i, i + 10);
        
        await step.run(`process-chunk-${gap.type}-${i}`, async () => {
          await connectToDB();
          
          const bulkOps = await Promise.all(chunk.map(async (id) => {
            const detail = await gmail.users.messages.get({ userId: "me", id: id, format: "full" });
            
            const headers = detail.data.payload?.headers;
            const subject = headers?.find(h => h.name === 'Subject')?.value || "No Subject";
            
            let bodyText = "";
            const payload = detail.data.payload;
            if (payload?.parts) {
              const plainPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
              bodyText = plainPart?.body?.data ? Buffer.from(plainPart.body.data, 'base64').toString('utf-8') : "";
            } else {
              bodyText = payload?.body?.data ? Buffer.from(payload.body.data, 'base64').toString('utf-8') : "";
            }

            
            const vector = await generateEmailEmbedding(subject, bodyText.slice(0, 8000));

            return {
              updateOne: {
                filter: { gmailId: id },
                update: {
                  $set: {
                    userId,
                    threadId: detail.data.threadId,
                    subject,
                    from: headers?.find(h => h.name === 'From')?.value || "",
                    to: headers?.find(h => h.name === 'To')?.value || "",
                    date: headers?.find(h => h.name === 'Date')?.value || "",
                    snippet: detail.data.snippet,
                    body: bodyText,
                    embedding: vector, 
                    internalDate: parseInt(detail.data.internalDate || "0"),
                  }
                },
                upsert: true
              }
            };
          }));

          await EmailMemory.bulkWrite(bulkOps);
        });
        
        totalProcessed += chunk.length;
      }
    }

    await step.run("final-metadata-update", async () => {
      await connectToDB();
      
      const safeLastSynced = new Date(before).getTime() || Date.now();
      const safeOldestSynced = new Date(after).getTime() || Date.now();

      await User.findOneAndUpdate(
        { clerkId: userId },
        { 
          $set: { 
            "syncSettings.lastSyncedTimestamp": safeLastSynced,
            "syncSettings.oldestSyncedTimestamp": safeOldestSynced,
            "syncSettings.isInitialSyncDone": true,
            "syncSettings.autoSyncInterval": autoSyncInterval,
            "syncSettings.updatedAt": new Date()
          } 
        }
      );
    });

    return { totalProcessed };
  }
);