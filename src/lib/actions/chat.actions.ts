"use server";

import { connectToDB } from "@/lib/database/db";
import Chat from "@/lib/database/models/chat.model";
import { runAgent } from "@/lib/agent/cors";

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
        title: userPrompt.substring(0, 30) + "...",
      });
    }

    const history = chat.messages.slice(-10).map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    const aiResponse = await runAgent(userPrompt, userId, history);

    chat.messages.push({ role: "user", content: userPrompt });
    chat.messages.push({ role: "assistant", content: aiResponse });

    chat.updatedAt = new Date();
    await chat.save();

    return {
      response: aiResponse,
      chatId: chat._id.toString(),
    };

  } catch (error: any) {
    // Log server-side but return a graceful response so the client
    // never sees an opaque "fetch failed / AggregateError"
    console.error("Chat Action Error:", error?.message ?? error);
    return {
      response: "I'm having trouble connecting right now. Please try again in a moment.",
      chatId: chatId ?? null,
      error: true,
    };
  }
}

export async function deleteChat(chatId: string) {
  try {
    await connectToDB();
    await Chat.findByIdAndDelete(chatId);
    return { success: true };
  } catch (error: any) {
    console.error("Delete Chat Error:", error?.message ?? error);
    return { success: false, error: "Failed to delete chat" };
  }
}