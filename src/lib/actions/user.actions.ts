"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../database/db";
import User from "../database/models/user.model";
import { auth } from "@clerk/nextjs/server";
import EmailMemory from "../database/models/email-memory.model";

export async function createUser(user: any) {
  try {
    await connectToDB();
    const newUser = await User.create(user);
    console.log("USER SAVED TO MONGODB:", newUser);
    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    console.error("ERROR SAVING USER TO MONGODB:", error);
    throw new Error(typeof error === "string" ? error : JSON.stringify(error));
  }
}

export async function updateUser(clerkId: string, user: any) {
  try {
    await connectToDB();
    const updatedUser = await User.findOneAndUpdate({ clerkId }, user, {
      new: true,
    });
    
    if (!updatedUser) throw new Error("User update failed");
    console.log("USER UPDATED IN MONGODB");
    
    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    console.error("ERROR UPDATING USER:", error);
    throw new Error(typeof error === "string" ? error : JSON.stringify(error));
  }
}

export async function deleteUser(clerkId: string) {
  try {
    await connectToDB();
    const userToDelete = await User.findOne({ clerkId });

    if (!userToDelete) {
      throw new Error("User not found");
    }

    const deletedEmails = await EmailMemory.deleteMany({ userId: clerkId });
    console.log(`DELETED ${deletedEmails.deletedCount} emails from memory for user ${clerkId}`);


    const deletedUser = await User.findByIdAndDelete(userToDelete._id);
    
    revalidatePath("/"); 
    console.log("USER DELETED FROM MONGODB");

    return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null;
  } catch (error) {
    console.error("ERROR DELETING USER:", error);
    throw new Error(typeof error === "string" ? error : JSON.stringify(error));
  }
}


export async function updateUserSyncProgress(timestamp: number) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await connectToDB();

    const updatedUser = await User.findOneAndUpdate(
      { clerkId: userId },
      { 
        $set: { 
          "syncSettings.lastSyncedTimestamp": timestamp,
          "syncSettings.isInitialSyncDone": true,
          "syncSettings.updatedAt": new Date()
        } 
      },
      { new: true, upsert: true } 
    );

    return { success: true, user: JSON.parse(JSON.stringify(updatedUser)) };
  } catch (error) {
    console.error("Failed to update sync progress:", error);
    return { success: false };
  }
}

export async function getSyncStatus() {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    await connectToDB();
    const user = await User.findOne({ clerkId: userId }).select("syncSettings");

    return {
      lastSynced: user?.syncSettings?.lastSyncedTimestamp || null,
      isInitialSyncDone: user?.syncSettings?.isInitialSyncDone || false
    };
  } catch (error) {
    console.error("Failed to fetch sync status:", error);
    return null;
  }
}