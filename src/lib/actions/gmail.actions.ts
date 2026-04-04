"use server"

import { auth, clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { connectToDB } from "../database/db";
import User from "../database/models/user.model";
import EmailMemory from "../database/models/email-memory.model";
import { inngest } from "@/inngest/client";
import { generateEmailEmbedding } from "../openai";


export async function getSyncCount(params: { after?: Date; before?: Date }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const client = await clerkClient();
  const tokenResponse = await client.users.getUserOauthAccessToken(userId, "google");
  const token = tokenResponse.data[0]?.token;

  if (!token) {
    console.warn("Google access token not found — user may not be signed in with Google or scopes are missing.");
    return { count: 0, isEstimate: false };
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  let query = "-in:trash -in:spam";
  if (params.after) {
    query += ` after:${Math.floor(params.after.getTime() / 1000)}`;
  }
  if (params.before) {
    const endTimestamp = Math.floor(params.before.getTime() / 1000) + 86400;
    query += ` before:${endTimestamp}`;
  }

  let totalCount = 0;
  let pageToken: string | undefined = undefined;
  const maxPagesToScan = 10; 

  try {
    for (let i = 0; i < maxPagesToScan; i++) {
      const res: any = await gmail.users.messages.list({
        userId: "me",
        q: query,
        pageToken: pageToken,
        maxResults: 500,
      });

      const messages = res.data.messages || [];
      totalCount += messages.length;
      pageToken = res.data.nextPageToken;

      if (!pageToken) break;
    }

    return {
      count: totalCount,
      isEstimate: !!pageToken, 
    };
  } catch (error) {
    console.error("Exact count failed:", error);
    return { count: 0, isEstimate: false };
  }
};

export async function getRecentEmails() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("User not logged in");

    const client = await clerkClient();
    const response = await client.users.getUserOauthAccessToken(userId, "google");
    
    const accessToken = response.data[0]?.token;
    if (!accessToken) throw new Error("No Google access token found.");

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: 5,
    });

    const messageList = listRes.data.messages || [];

    const fullEmails = await Promise.all(
      messageList.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
        });

        const headers = detail.data.payload?.headers;
        
        const subject = headers?.find(h => h.name === 'Subject')?.value || "No Subject";
        const from = headers?.find(h => h.name === 'From')?.value || "Unknown Sender";
        
        const snippet = detail.data.snippet;

        return {
          id: msg.id,
          subject,
          from,
          snippet,
        };
      })
    );

    return fullEmails;

  } catch (error) {
    console.error("Error fetching emails:", error);
    throw error;
  }
}

export async function syncAndFetchPreview(params: { after: Date; before: Date; fetchFullDetails: boolean }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("User not logged in");

    const client = await clerkClient();
    const response = await client.users.getUserOauthAccessToken(userId, "google");
    const accessToken = response.data[0]?.token;
    if (!accessToken) throw new Error("No Google access token found.");

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const start = Math.floor(params.after.getTime() / 1000);
    const end = Math.floor(params.before.getTime() / 1000) + 86400; // Inclusive of end day
    
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: `after:${start} before:${end} -in:trash -in:spam`,
      maxResults: 10, 
    });

    const messageList = listRes.data.messages || [];

    const fullEmails = await Promise.all(
      messageList.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: params.fetchFullDetails ? "full" : "metadata",
          metadataHeaders: params.fetchFullDetails ? [] : ["Subject", "From", "To", "Date"]
        });

        const headers = detail.data.payload?.headers;
        const subject = headers?.find(h => h.name === 'Subject')?.value || "No Subject";
        const from = headers?.find(h => h.name === 'From')?.value || "Unknown Sender";
        const to = headers?.find(h => h.name === 'To')?.value || "Unknown Receiver";
        const date = headers?.find(h => h.name === 'Date')?.value || "Unknown Date";

        let bodyText = "";
        if (params.fetchFullDetails) {
          const payload = detail.data.payload;
          if (payload?.parts) {
            const plainPart = payload.parts.find((part: any) => part.mimeType === "text/plain");
            if (plainPart?.body?.data) {
              bodyText = Buffer.from(plainPart.body.data, 'base64').toString('utf-8');
            }
          } else if (payload?.body?.data) {
            bodyText = Buffer.from(payload.body.data, 'base64').toString('utf-8');
          }
        }

        return {
          id: msg.id,
          date,
          from,
          to,
          subject,
          snippet: detail.data.snippet,
          ...(params.fetchFullDetails && { body: bodyText }) 
        };
      })
    );

    await connectToDB();
    await User.findOneAndUpdate(
      { clerkId: userId },
      { 
        $set: { 
          "syncSettings.lastSyncedTimestamp": params.before.getTime(),
          "syncSettings.isInitialSyncDone": true,
          "syncSettings.updatedAt": new Date()
        } 
      },
      { new: true, upsert: true }
    );

    return fullEmails;

  } catch (error) {
    console.error("Error in sync process:", error);
    throw error;
  }
}

export async function syncAndSaveEmails(params: { 
  after: Date; 
  before: Date; 
  autoSyncInterval: number; 
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDB();

  const user = await User.findOne({ clerkId: userId });
  const settings = user?.syncSettings;
  const requestedStart = Math.floor(params.after.getTime() / 1000);
  const requestedEnd = Math.floor(params.before.getTime() / 1000);
  const knownStart = settings?.oldestSyncedTimestamp ? Math.floor(settings.oldestSyncedTimestamp / 1000) : null;
  const knownEnd = settings?.lastSyncedTimestamp ? Math.floor(settings.lastSyncedTimestamp / 1000) : null;

  const gapQueries: string[] = [];
  if (!knownStart || requestedStart < knownStart) {
    const gapEnd = knownStart ? knownStart - 1 : requestedEnd;
    gapQueries.push(`after:${requestedStart} before:${gapEnd}`);
  }
  if (knownEnd && requestedEnd > knownEnd) {
    const gapStart = knownEnd + 1;
    gapQueries.push(`after:${gapStart} before:${requestedEnd}`);
  }

  if (gapQueries.length === 0) return { saved: 0, message: "Already synced" };

  const client = await clerkClient();
  const tokenRes = await client.users.getUserOauthAccessToken(userId, "google");
  const token = tokenRes.data[0]?.token;
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  let totalSaved = 0;

  for (const q of gapQueries) {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: `${q} -in:trash -in:spam`,
    });

    const messages = listRes.data.messages || [];
    const sortedMessages = messages.reverse(); 

    for (let i = 0; i < sortedMessages.length; i += 20) {
      const chunk = sortedMessages.slice(i, i + 20);
      
      const bulkOps = await Promise.all(
        chunk.map(async (msg) => {
          const detail = await gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
            format: "full",
          });

          const headers = detail.data.payload?.headers;
          const subject = headers?.find(h => h.name === 'Subject')?.value || "";
          const from = headers?.find(h => h.name === 'From')?.value || "";
          const to = headers?.find(h => h.name === 'To')?.value || "";
          const date = headers?.find(h => h.name === 'Date')?.value || "";
          
          let bodyText = "";
          const payload = detail.data.payload;
          if (payload?.parts) {
            const plainPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
            bodyText = plainPart?.body?.data ? Buffer.from(plainPart.body.data, 'base64').toString('utf-8') : "";
          } else {
            bodyText = payload?.body?.data ? Buffer.from(payload.body.data, 'base64').toString('utf-8') : "";
          }

          return {
            updateOne: {
              filter: { gmailId: msg.id },
              update: {
                $set: {
                  userId,
                  threadId: detail.data.threadId,
                  subject, from, to, date,
                  snippet: detail.data.snippet,
                  body: bodyText,
                  internalDate: parseInt(detail.data.internalDate || "0"),
                }
              },
              upsert: true
            }
          };
        })
      );

      const result = await EmailMemory.bulkWrite(bulkOps);
      totalSaved += (result.upsertedCount + result.modifiedCount);
      console.log(`Saved batch of ${bulkOps.length} emails. Total: ${totalSaved}`);
    }
  }

  const finalOldest = Math.min(requestedStart * 1000, settings?.oldestSyncedTimestamp || requestedStart * 1000);
  const finalLatest = Math.max(requestedEnd * 1000, settings?.lastSyncedTimestamp || requestedEnd * 1000);

  await User.findOneAndUpdate(
    { clerkId: userId },
    { 
      $set: { 
        "syncSettings.lastSyncedTimestamp": finalLatest,
        "syncSettings.oldestSyncedTimestamp": finalOldest,
        "syncSettings.isInitialSyncDone": true,
        "syncSettings.autoSyncInterval": params.autoSyncInterval,
        "syncSettings.updatedAt": new Date()
      } 
    }
  );

  return { saved: totalSaved };
}

export async function startInngestSync(params: { after: Date; before: Date; autoSyncInterval: number }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const client = await clerkClient();
  const tokenRes = await client.users.getUserOauthAccessToken(userId, "google");
  const token = tokenRes.data[0]?.token;

  await inngest.send({
    name: "gmail/sync.requested",
    data: {
      userId,
      accessToken: token,
      after: params.after,
      before: params.before,
      autoSyncInterval: params.autoSyncInterval,
    },
  });

  return { success: true, message: "Sync started in background" };
}

export async function searchEmails(query: string, userId: string) {
  await connectToDB();
  
  const vector = await generateEmailEmbedding(query, "");

  const results = await EmailMemory.aggregate([
    {
      $vectorSearch: {
        index: "default", 
        path: "embedding",
        queryVector: vector,
        numCandidates: 100,
        limit: 5,
        filter: { userId: { $eq: userId } } 
      }
    },
    {
      $project: {
        embedding: 0, 
        score: { $meta: "vectorSearchScore" }
      }
    }
  ]);

  return results;
} 

