import { inngest } from "../client";
import { connectToDB } from "@/lib/database/db";
import { Agent } from "@/lib/database/models/agent.model";
import OpenAI from "openai";
import { toolRegistry } from "@/lib/agent/registry";
import { tools } from "@/lib/agent/tools";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const customAgentWorker = inngest.createFunction(
  { 
    id: "execute-custom-agent",
    retries: 2,
    concurrency: {
      limit: 1, 
      key: "event.data.userId", 
    },  
    triggers: [{ event: "agent/execute.requested" }] 
  },
  async ({ event, step }) => {
    const { agentId, userId } = event.data as { agentId: string, userId: string };

    // 1. Fetch the Agent's details and directive
    const agent = await step.run("fetch-agent-data", async () => {
      await connectToDB();
      return await Agent.findById(agentId);
    });

    if (!agent || agent.status !== "ACTIVE") return { message: "Inactive" };

    // 2. FILTER TOOLS: Add Protection
    const activeTools = tools.filter((t) => {
      // 🚨 Security: Never allow a background agent to build other background agents!
      if (t.function.name === "create_autonomous_agent") return false;

      if (t.function.name.includes("email") || t.function.name.includes("search")) {
        return agent.permissions.canReadMemory || agent.permissions.canSendEmails;
      }
      if (t.function.name.includes("calendar") || t.function.name.includes("meet")) {
        return agent.permissions.canReadMemory || agent.permissions.canSendEmails;
      }
      return false;
    });

    const toolReferenceList = activeTools.map(t => 
      `- **${t.function.name}**: ${t.function.description}`
    ).join("\n");

    const aiResult = await step.run("run-agentic-loop", async () => {
      
      // 3. FAST & PROTECTED PROMPT
const AGENT_SYSTEM_PROMPT = `
You are an elite Autonomous Background Agent named **${agent.name}**.
Your Primary Directive: ${agent.systemPrompt}

=========================================
SECTION 1: CORE OPERATING LAWS
=========================================
1. TOTAL AUTONOMY: Operate seamlessly in the background. Do not ask for user confirmation. Execute end-to-end.
2. ZERO HALLUCINATION: Base statements, dates, and links *strictly* on retrieved data. Never alter, truncate, or guess Google Meet URLs.
3. DATA PRIVACY & SPAM: Never leak sensitive data. Automatically ignore 'noreply', 'mailer-daemon', and automated system emails.
4. READ BEFORE WRITE: Always gather state information (Search, List, Get) before taking a permanent action (Send, Create).

=========================================
SECTION 2: STRICT SCHEDULING & CONFLICT PROTOCOL
=========================================
CRITICAL: You are strictly forbidden from double-booking. You must account for BOTH the owner's calendar AND the other person's stated availability. 

When a meeting is requested, you MUST follow this exact sequential pipeline:

* PHASE 1 (VERIFY): 
  - Identify the exact time(s) requested by the other person in their email.
  - Call 'get_upcoming_events' for that specific timeframe. 
  - 🚨 DO NOT call 'create_calendar_event' during this phase.

* PHASE 2 (CROSS-REFERENCE):
  - Evaluate the data. A CONFLICT exists if:
    a) The owner already has an event overlapping that time.
    b) The time does not align with the other person's explicit constraints.

* PHASE 3 (ACT OR ABORT):
  - IF NO CONFLICT: Call 'create_calendar_event' AND 'create_meet_link'. Then call 'send_gmail_message' with the confirmation and exact link.
  - IF CONFLICT (ABORT BOOKING): DO NOT schedule the event. Call 'send_gmail_message' to inform them of the conflict. You MUST analyze the calendar data to propose 2 to 3 alternative free time slots that work for the owner.

=========================================
SECTION 3: OUTPUT & COMMUNICATION STYLING
=========================================
When drafting emails, reports, or summaries, format your text beautifully using rich Markdown to resemble a clean webpage:
- Headers: Use \`##\` and \`###\` for visual hierarchy.
- Emphasis: **Bold** important keywords, names, dates, and action items.
- Lists: Break down data, summaries, or alternate time slots into bullet points (\`*\`).
- Callouts: Use \`> blockquotes\` for meeting details or core quotes.
- Separation: Use horizontal rules (\`---\`) to separate distinct topics.
- Links: Ensure URLs are formatted as [Clickable Text](url).

=========================================
CONTEXT & ENVIRONMENT
=========================================
Timezone: IST (UTC+05:30). 
Current Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}

AVAILABLE TOOLS:
${toolReferenceList}

Execute your directive now, strictly following the phased pipeline above.
`.trim();
      const messages: any[] = [
        { role: "system", content: AGENT_SYSTEM_PROMPT },
        { role: "user", content: "Begin scheduled background task." }
      ];

      // 4. FAST LOOP (Max 3 steps: Read -> Process -> Act)
      for (let i = 0; i < 3; i++) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          tools: activeTools.length > 0 ? (activeTools as any) : undefined,
          parallel_tool_calls: false, // Speeds up execution significantly
        });

        const msg = response.choices[0].message;
        if (!msg) return "Agent unavailable.";

        messages.push(msg);

        // If no tools are called, the AI is done.
        if (!msg.tool_calls) {
          return msg.content || "Task completed successfully.";
        }

        // Execute all requested tools in parallel
        const toolResults = await Promise.all(
          msg.tool_calls.map(async (toolCall) => {
            const fnName = toolCall.function.name;
            
            let args = {};
            try {
              args = JSON.parse(toolCall.function.arguments || "{}");
            } catch (e) {
              console.error("Malformed tool arguments", e);
            }

            const toolFunction = toolRegistry[fnName];
            
            if (toolFunction) {
              try {
                const data = await toolFunction(args, userId);
                return { 
                  role: "tool", 
                  tool_call_id: toolCall.id, 
                  content: JSON.stringify(data) 
                };
              } catch (err) {
                console.error(`Tool Execution Error [${fnName}]:`, err);
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

    // 5. Update the timestamp
    await step.run("update-last-run-timestamp", async () => {
      await connectToDB();
      await Agent.findByIdAndUpdate(agentId, { lastRunAt: new Date() });
    });

    return { success: true, output: aiResult };
  }
);