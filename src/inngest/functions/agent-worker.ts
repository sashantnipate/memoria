import { inngest } from "../client";
import { connectToDB } from "@/lib/database/db";
import { Agent } from "@/lib/database/models/agent.model";
import OpenAI from "openai";
// 1. IMPORT YOUR REGISTRY & SCHEMAS
import {toolRegistry } from "@/lib/agent/registry";
import { tools } from "@/lib/agent/tools";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const customAgentWorker = inngest.createFunction(
  { 
    id: "execute-custom-agent",
    retries: 2,
    triggers: [{ event: "agent/execute.requested" }] 
  },
  async ({ event, step }) => {
    const { agentId, userId } = event.data as { agentId: string, userId: string };

    const agent = await step.run("fetch-agent-data", async () => {
      await connectToDB();
      return await Agent.findById(agentId);
    });

    if (!agent || agent.status !== "ACTIVE") return { message: "Inactive" };

    // 2. FILTER TOOLS BASED ON AGENT PERMISSIONS
    const activeTools = tools.filter((t) => {
      if (t.function.name.includes("email") || t.function.name.includes("search")) {
        return agent.permissions.canReadMemory || agent.permissions.canSendEmails;
      }
      if (t.function.name.includes("calendar") || t.function.name.includes("meet")) {
        return agent.permissions.canReadMemory || agent.permissions.canSendEmails;
      }
      return false;
    });

    const aiResult = await step.run("run-agentic-loop", async () => {
      const messages: any[] = [
        {
          role: "system",
          content: `You are ${agent.name}. Directive: ${agent.systemPrompt}. 
                    You are running autonomously. Use tools to fulfill your goal.`
        },
        { role: "user", content: "Begin scheduled task." }
      ];

      // 3. EXECUTE THE TOOL LOOP (Max 5 steps to prevent loops)
      for (let i = 0; i < 5; i++) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          tools: activeTools.length > 0 ? activeTools : undefined,
        });

        const msg = response.choices[0].message;
        messages.push(msg);

        if (!msg.tool_calls) return msg.content;

        for (const toolCall of msg.tool_calls) {
          const fnName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          
          // Call the actual function from your registry!
          const result = await toolRegistry[fnName](args, userId);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        }
      }
    });

    await step.run("update-last-run-timestamp", async () => {
      await connectToDB();
      await Agent.findByIdAndUpdate(agentId, { lastRunAt: new Date() });
    });

    return { success: true, output: aiResult };
  }
);