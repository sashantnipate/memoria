"use server"

import { auth, clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";

export async function getRecentEmails() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("User not logged in");

    const client = await clerkClient();
    // Clerk updated their naming: use 'google' instead of 'oauth_google' 
    const response = await client.users.getUserOauthAccessToken(userId, "google");
    
    const accessToken = response.data[0]?.token;
    if (!accessToken) throw new Error("No Google access token found.");

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // 1. Get the list of message IDs
    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: 5,
    });

    const messageList = listRes.data.messages || [];

    // 2. Fetch the full detail for each message ID
    const fullEmails = await Promise.all(
      messageList.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
        });

        const headers = detail.data.payload?.headers;
        
        // Extract Subject and From from the headers array
        const subject = headers?.find(h => h.name === 'Subject')?.value || "No Subject";
        const from = headers?.find(h => h.name === 'From')?.value || "Unknown Sender";
        
        // Snippet is a short preview of the body
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
    console.error("❌ Error fetching emails:", error);
    throw error;
  }
}