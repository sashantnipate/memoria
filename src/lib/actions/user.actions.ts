"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../database/db";
import User from "../database/models/user.model";

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

// --- DELETE USER ---
export async function deleteUser(clerkId: string) {
  try {
    await connectToDB();
    const userToDelete = await User.findOne({ clerkId });

    if (!userToDelete) {
      throw new Error("User not found");
    }

    const deletedUser = await User.findByIdAndDelete(userToDelete._id);
    revalidatePath("/"); 
    console.log("USER DELETED FROM MONGODB");

    return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null;
  } catch (error) {
    console.error("ERROR DELETING USER:", error);
    throw new Error(typeof error === "string" ? error : JSON.stringify(error));
  }
}