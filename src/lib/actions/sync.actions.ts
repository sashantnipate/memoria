import { auth } from "@clerk/nextjs/server";
import { connectToDB } from "../database/db";
import User from "../database/models/user.model";

export async function startSyncProcess(params: { after: Date, before: Date }) {
  const { userId } = await auth();
  await connectToDB();


  await User.findOneAndUpdate(
    { clerkId: userId },
    { 
      $set: { 
        "syncSettings.lastSyncedTimestamp": params.before.getTime(),
        "syncSettings.isInitialSyncDone": true 
      } 
    }
  );

  return { success: true };
}