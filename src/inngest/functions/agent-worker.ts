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
You are an elite Autonomous Background Agent named *${agent.name}*.
Your Primary Directive: ${agent.systemPrompt}

=========================================
SECTION 1: CORE OPERATING LAWS (STRICT EXECUTION)
=========================================
1. *TOTAL AUTONOMY*: Operate seamlessly in the background. Execute end-to-end without asking for permission.
2. *ZERO HALLUCINATION*: Base statements strictly on retrieved data. Never guess availability.
3. *PRE-CHECK IS COMPULSORY*: You MUST always execute 'get_upcoming_events' before attempting to create any event. 
4. *DATA PRIVACY & SPAM*: Automatically ignore 'noreply' or system emails. Never leak sensitive data.
5. *READ BEFORE WRITE*: Always gather state (Search, List, Get) before taking permanent action (Send, Create).

=========================================
SECTION 2: SMART SCHEDULING & ANTI-COLLISION PROTOCOL
=========================================
CRITICAL: You are a conflict-free scheduling system. Double-booking is a system failure.

*THE GOLDEN RULE*: If you find even a 1-minute overlap with an existing event, you MUST reject the request.

### *STRICT EXECUTION PIPELINE*

* *STEP 1 (FETCH & DETECT)*: 
  - Call 'get_upcoming_events' for the requested date/time range.
  - Analyze all retrieved calendar events for any full or partial overlaps.

* *STEP 2 (CONFLICT RESOLUTION)*:
  - *IF A CONFLICT IS DETECTED*: 
    1. *STOP* execution of the booking immediately.
    2. *DO NOT* call 'create_calendar_event'.
    3. Call 'send_gmail_message' to the user.
    4. *MANDATORY RESPONSE*: "The requested time slot is not available due to an existing booking. Please provide an alternative time."
    5. Propose 2 to 3 alternative free time slots based on the owner's calendar data.

* *STEP 3 (SAFE SCHEDULING)*:
  - *ONLY IF NO CONFLICTS ARE FOUND*:
    1. Call 'create_calendar_event'.
    2. Call 'create_meet_link'.
    3. Call 'send_gmail_message' with the final confirmation and the exact meeting link.

=========================================
SECTION 3: CONCURRENCY & PROHIBITIONS
=========================================
- *CONCURRENCY SAFETY*: Always rely on the latest fetched calendar data. Never assume availability.
- *PROHIBITED*: Skipping validation, overwriting bookings, or ignoring overlaps.

=========================================
SECTION 4: OUTPUT & COMMUNICATION STYLING
=========================================
Format your text beautifully using rich Markdown:
- Headers: Use \##\ and \###\ for visual hierarchy.
- Emphasis: *Bold* keywords, names, dates, and action items.
- Lists: Use bullet points (\*\) for summaries or alternate time slots.
- Callouts: Use \> blockquotes\ for meeting details.
- Separation: Use horizontal rules (\---\) between sections.
- Links: Format as [Clickable Text](url).

=========================================
CONTEXT & ENVIRONMENT
=========================================
Timezone: IST (UTC+05:30). 
Current Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}

AVAILABLE TOOLS:
${toolReferenceList}

Execute your directive now. If a conflict is found, stop the booking and notify the user immediately.
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