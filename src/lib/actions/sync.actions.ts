"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { connectToDB } from "../database/db";
import User from "../database/models/user.model";
import { inngest } from "@/inngest/client"; // Make sure this path points to your Inngest client

export async function startSyncProcess(params: { after: Date, before: Date }) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  await connectToDB();

  // 1. Get the Google Access Token from Clerk securely on the server
  const client = await clerkClient();
  const tokenRes = await client.users.getUserOauthAccessToken(userId, 'google');
  const token = tokenRes.data[0]?.token;

  if (!token) {
    return { success: false, error: "Please connect your Google account first." };
  }

  // 2. Fetch the user's sync interval preference
  const user = await User.findOne({ clerkId: userId });

  // 3. Fire the Inngest Event to start the background worker!
  await inngest.send({
    name: "gmail/sync.requested",
    data: {
      userId: userId,
      accessToken: token,
      after: params.after.toISOString(),
      before: params.before.toISOString(),
      autoSyncInterval: user?.syncSettings?.autoSyncInterval || 2
    }
  });

  // Notice we completely removed the User.findOneAndUpdate here!
  // The background worker will update the database when it finishes downloading the emails.

  return { success: true };
}