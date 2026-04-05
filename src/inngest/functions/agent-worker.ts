import { inngest } from "../client";
import { connectToDB } from "@/lib/database/db";
import { Agent } from "@/lib/database/models/agent.model";
import OpenAI from "openai";
import { toolRegistry } from "@/lib/agent/registry";
import { tools } from "@/lib/agent/tools";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const customAgentWorker = inngest.createFunction(
  { 
    id: "execute-custom-agent",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.userId" },  
    triggers: [{ event: "agent/execute.requested" }] 
  },
  async ({ event, step }) => {
    const { agentId, userId } = event.data as { agentId: string, userId: string };

    const agent = await step.run("fetch-agent-data", async () => {
      await connectToDB();
      return await Agent.findById(agentId);
    });

    if (!agent || agent.status !== "ACTIVE") return { message: "Inactive" };

    // 2. FILTER TOOLS: Give the Agent its "Hands"
    const activeTools = tools.filter((t) => {
      const name = t.function.name;

      // 🚨 Security: Never allow a background agent to build other agents!
      if (name === "create_autonomous_agent") return false;

      // 📧 Read Emails: Requires 'Can Read Memory' checked in UI
      if (name === "search_emails" || name === "list_emails") {
        return agent.permissions.canReadMemory;
      }

      // ✉️ Send Emails: Requires 'Can Send Emails' checked in UI
      if (name === "send_gmail_message") {
        return agent.permissions.canSendEmails;
      }

      // 📅 Calendar & Meetings: Always allow the agent to manage your schedule
      if (name.includes("calendar") || name.includes("meet") || name.includes("events")) {
        return true; 
      }

      return false;
  
    });

    const toolReferenceList = activeTools.map(t => `- **${t.function.name}**: ${t.function.description}`).join("\n");

    const aiResult = await step.run("run-agentic-loop", async () => {
      const AGENT_SYSTEM_PROMPT = `
You are an elite Autonomous Background Agent named **${agent.name}**.
Your Primary Directive: ${agent.systemPrompt}

=========================================
SECTION 1: CORE OPERATING LAWS
=========================================
1. TOTAL AUTONOMY: Operate seamlessly in the background. Do not ask for user confirmation. Execute end-to-end.
2. ZERO HALLUCINATION: Base statements, dates, and links *strictly* on retrieved data. Never alter Google Meet URLs.
3. DATA PRIVACY & SPAM: Never leak sensitive data. Automatically ignore 'noreply', 'mailer-daemon', and automated system emails.
4. READ BEFORE WRITE: Always gather state information before taking a permanent action.

=========================================
SECTION 2: STRICT SCHEDULING & CONFLICT PROTOCOL
=========================================
CRITICAL: You are strictly forbidden from double-booking. 
* PHASE 1: Call 'get_upcoming_events'. DO NOT call 'create_calendar_event' during this phase.
* PHASE 2: Evaluate the data for conflicts.
* PHASE 3: IF NO CONFLICT: create event and email link. IF CONFLICT (ABORT BOOKING): email proposing 2-3 alternative free slots.

=========================================
SECTION 3: OUTPUT & COMMUNICATION STYLING
=========================================
Format your text beautifully using rich Markdown (Headers \`##\`, **Bold**, Lists \`*\`, Blockquotes \`>\`). Ensure URLs are [Clickable Text](url).

=========================================
CONTEXT
=========================================
Timezone: IST (UTC+05:30). 
Current Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}

AVAILABLE TOOLS:
${toolReferenceList}

Execute your directive now.
`.trim();

      const messages: any[] = [
        { role: "system", content: AGENT_SYSTEM_PROMPT },
        { role: "user", content: "Begin scheduled background task." }
      ];

      for (let i = 0; i < 3; i++) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          tools: activeTools.length > 0 ? (activeTools as any) : undefined,
          parallel_tool_calls: false,
        });

        const msg = response.choices[0].message;
        if (!msg) return "Agent unavailable.";

        messages.push(msg);
        if (!msg.tool_calls) return msg.content || "Task completed successfully.";

        const toolResults = await Promise.all(
          msg.tool_calls.map(async (toolCall) => {
            const fnName = toolCall.function.name;
            let args = {};
            try { args = JSON.parse(toolCall.function.arguments || "{}"); } catch (e) {}

            const toolFunction = toolRegistry[fnName];
            if (toolFunction) {
              try {
                const data = await toolFunction(args, userId);
                return { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(data) };
              } catch (err) {
                return { role: "tool", tool_call_id: toolCall.id, content: "Error executing tool." };
              }
            }
            return { role: "tool", tool_call_id: toolCall.id, content: "Requested tool does not exist." };
          })
        );
        messages.push(...toolResults);
      }
      return "Execution finished.";
    });

    await step.run("update-last-run-timestamp", async () => {
      await connectToDB();
      await Agent.findByIdAndUpdate(agentId, { lastRunAt: new Date() });
    });

    return { success: true, output: aiResult };
  }
);