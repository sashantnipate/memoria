"use server";

import { connectToDB } from "@/lib/database/db";
import Chat from "@/lib/database/models/chat.model";
import { runAgent } from "@/lib/agent/cors"; // Ensure path is correct

export async function askEmailAgent(userPrompt: string, userId: string, chatId?: string | null) {
  try {
    await connectToDB();

    let chat;

    if (chatId) {
      chat = await Chat.findById(chatId);
    } 

    if (!chat) {
      chat = await Chat.create({ 
        userId, 
        messages: [], 
        title: userPrompt.substring(0, 30) + "..." 
      });
    }

    const history = chat.messages.slice(-10).map((m: any) => ({
      role: m.role,
      content: m.content
    }));

    const aiResponse = await runAgent(userPrompt, userId, history);

    chat.messages.push({ role: "user", content: userPrompt });
    chat.messages.push({ role: "assistant", content: aiResponse });
    
    chat.updatedAt = new Date();
    await chat.save();

    return { 
      response: aiResponse, 
      chatId: chat._id.toString() 
    };

  } catch (error) {
    console.error("Chat Action Error:", error);
    throw new Error("Failed to process chat message");
  }
}

export async function deleteChat(chatId: string) {
  try {
    await connectToDB();
    await Chat.findByIdAndDelete(chatId);
    return { success: true };
  } catch (error) {
    console.error("Delete Chat Error:", error);
    throw new Error("Failed to delete chat");
  }
}