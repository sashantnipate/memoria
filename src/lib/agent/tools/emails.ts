import EmailMemory from "@/lib/database/models/email-memory.model";
import { searchEmails as vectorSearch } from "@/lib/actions/gmail.actions";
import { google } from "googleapis";
import { clerkClient } from "@clerk/nextjs/server";

async function getGoogleAuth(userId: string) {
  try {
    const provider = "oauth_google";
    const client = await clerkClient(); 
    
    const response = await client.users.getUserOauthAccessToken(userId, provider);
    
    const accessToken = response.data[0]?.token;
    
    if (!accessToken) {
      throw new Error("No Google Access Token found. Please re-sync your account.");
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
  } catch (error) {
    console.error("Clerk Auth Error:", error);
    throw error;
  }
}
export async function executeSearchEmails(args: any, userId: string) {
  const rawData = await vectorSearch(args.query, userId);
  return cleanEmailData(rawData);
}

export async function executeListEmails(args: any, userId: string) {
  const days = args.days || 7;
  const dateLimit = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  const rawData = await EmailMemory.find({ userId, internalDate: { $gte: dateLimit } })
    .select("subject from date snippet body internalDate")
    .limit(15);
    
  return cleanEmailData(rawData);
}

function cleanEmailData(emails: any[]) {
  return emails.map((email: any) => {
    let cleanBody = email.body || "";
    cleanBody = cleanBody.replace(/https?:\/\/[^\s]+/g, '[link]'); 
    cleanBody = cleanBody.replace(/\s+/g, ' '); 
    
    return {
      subject: email.subject,
      from: email.from,
      date: email.date || new Date(email.internalDate).toLocaleDateString(),
      snippet: email.snippet,
      body: cleanBody.trim().substring(0, 500)
    };
  });
}

export async function sendGmailMessage(args: any, userId: string) {
  const auth = await getGoogleAuth(userId);
  const gmail = google.gmail({ version: "v1", auth });


  let htmlBody = args.body
    .replace(/^### (.*$)/gim, '<h3>$1</h3>') // Headers
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')  // Headers
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/`(.*?)`/g, '<code style="background:#eee;padding:2px 4px;">$1</code>') // Inline code
    .replace(/\n/g, '<br/>'); // New lines

  const finalHtml = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
      ${htmlBody}
    </div>
  `;

  const utf8Subject = `=?utf-8?B?${Buffer.from(args.subject).toString("base64")}?=`;
  const messageParts = [
    `To: ${args.to}`,
    `Subject: ${utf8Subject}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    finalHtml,
  ];

  const encodedMessage = Buffer.from(messageParts.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });

  return { success: true, message: `Email sent to ${args.to}` };
}