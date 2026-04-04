"use server";

import { auth } from "@clerk/nextjs/server";
import { connectToDB } from "@/lib/database/db";
import { Agent } from "@/lib/database/models/agent.model";
import { revalidatePath } from "next/cache";
import { tools } from "../agent/tools";
import OpenAI from "openai";
import EmailMemory from "../database/models/email-memory.model";
import Chat from "../database/models/chat.model";
import { searchEmails } from "./gmail.actions";

if (!process.env.OPENAI_API_KEY) {
  console.error("CRITICAL ERROR: Missing OPENAI_API_KEY");
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getAgents() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await connectToDB();
    const agents = await Agent.find({ userId }).sort({ createdAt: -1 });
    
    return JSON.parse(JSON.stringify(agents)); 
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
}

export async function createOrUpdateAgent(formData: any) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await connectToDB();

    const agent = await Agent.findOneAndUpdate(
      { userId, name: formData.name }, 
      { 
        ...formData,
        userId, 
      },
      { upsert: true, new: true }
    );

    revalidatePath("/");
    
    return { success: true, agent: JSON.parse(JSON.stringify(agent)) };
  } catch (error) {
    console.error("Failed to save agent:", error);
    return { success: false, error: "Internal Server Error" };
  }
}


// export async function runAgent(userPrompt: string, userId: string, history: any[] = []) {
//   const systemPrompt = `
//     You are an expert Email AI Assistant. You have access to the user's emails via tools.
    
//     RULES:
//     1. For time-based requests (e.g. "this week", "today", "last 3 days"), ALWAYS use 'list_emails'.
//     2. For topic-based searches (e.g. "project update", "flights", "receipts"), use 'search_emails'.
//     3. If a request is vague, use 'search_emails' with a broad query.
//     4. If the user asks for a summary of a specific time AND a topic, you can call both tools.
//     5. ALWAYS answer based ONLY on the tool results provided. If no data is found, say so.
//     6. Current Date: ${new Date().toDateString()}.
//   `;

//   const messages: any[] = [
//     { role: "system", content: systemPrompt },
//     ...history,
//     { role: "user", content: userPrompt }
//   ];

//   try {
//     const response = await openai.chat.completions.create({
//       model: "gpt-4o-mini", 
//       messages,
//       tools: tools as any,
//       tool_choice: "auto",
//     });

//     const message = response.choices?.[0]?.message;
//     if (!message) return "I encountered an error analyzing your request. Please try again.";

//     if (message.tool_calls) {
//       messages.push(message);

//       await connectToDB();

//       for (const toolCall of message.tool_calls) {
//         let args;
        
//         try {
//           args = JSON.parse(toolCall.function.arguments);
//         } catch (parseError) {
//           console.error("LLM generated invalid JSON arguments:", parseError);
//           continue; 
//         }
        
//         let rawToolData = [];

//         if (toolCall.function.name === "search_emails") {
//           rawToolData = await searchEmails(args.query, userId);
//         } 
        
//         if (toolCall.function.name === "list_emails") {
//           const days = args.days || 7;
//           const dateLimit = Date.now() - (days * 24 * 60 * 60 * 1000);
          
//           rawToolData = await EmailMemory.find({ 
//             userId, 
//             internalDate: { $gte: dateLimit } 
//           })
//           .select("subject from date snippet body internalDate") 
//           .limit(15); 
//         }

//         const cleanedToolData = rawToolData.map((email: any) => {
//           let cleanBody = email.body || "";
//           cleanBody = cleanBody.replace(/https?:\/\/[^\s]+/g, '[link]'); 
//           cleanBody = cleanBody.replace(/\s+/g, ' '); 
//           cleanBody = cleanBody.trim().substring(0, 500); 

//           return {
//             subject: email.subject,
//             from: email.from,
//             date: email.date || new Date(email.internalDate).toLocaleDateString(),
//             snippet: email.snippet,
//             body: cleanBody + (email.body?.length > 500 ? "..." : "")
//           };
//         });

//         messages.push({
//           role: "tool",
//           tool_call_id: toolCall.id,
//           content: JSON.stringify(cleanedToolData),
//         });
//       }

//       const finalResponse = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages,
//       });

//       return finalResponse.choices?.[0]?.message?.content || "I searched your emails but couldn't put together a summary.";
//     }

//     return message.content || "I'm not sure how to help with that based on your emails.";

//   } catch (error) {
//     console.error("Agent Execution Error:", error);
//     return "I encountered a system error while fetching your emails. Please try again.";
//   }
// }

// export async function askEmailAgent(userPrompt: string, userId: string) {
//   try {
//     await connectToDB();

//     let chat = await Chat.findOne({ userId }).sort({ updatedAt: -1 });
//     if (!chat) chat = await Chat.create({ userId, messages: [] });

//     const history = chat.messages.slice(-10).map((m: any) => ({
//       role: m.role,
//       content: m.content
//     }));

//     // Pass the history into runAgent!
//     const aiResponse = await runAgent(userPrompt, userId, history);

//     if (chat.messages.length === 0) {
//       chat.title = userPrompt.substring(0, 30) + "..."; 
//     }
//     chat.messages.push({ role: "user", content: userPrompt });
//     chat.messages.push({ role: "assistant", content: aiResponse });
//     await chat.save();

//     return aiResponse;
//   } catch (error) {
//     console.error("askEmailAgent Error:", error);
//     throw new Error("Failed to process chat message");
//   }
// }