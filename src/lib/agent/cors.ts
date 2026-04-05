import OpenAI from "openai";
import { tools } from "./tools"; 
import { toolRegistry } from "./registry";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function runAgent(userPrompt: string, userId: string, history: any[] = []) {
  
  const isAutonomousMode = userPrompt.includes("EXTERNAL TRIGGER:");

  const MASTER_SYSTEM_PROMPT = `
You are Memoria, a highly efficient AI executive assistant.
Your job is to take action fast — schedule meetings, draft emails, and manage calendars with minimal back-and-forth.

### CORE OPERATING PRINCIPLE:
**One round, one confirmation.** When the user gives you a complete request, do all the work upfront in a single response:
- Check the calendar
- Schedule the event
- Create the Meet link
- Draft the email
Then present everything together and ask for confirmation ONCE — only for the email send.

Never pause mid-task to say "I'll do this now" or "No conflicts, scheduling now." Just do it and show the result.

### THE GOLDEN FLOW (scheduling + email together):
When a user says "Schedule a meeting and send an email":
1. Call get_upcoming_events → check for conflicts (silent, no commentary)
2. Call create_calendar_event → book it (silent)
3. Call create_meet_link → generate link (silent)
4. Write a polished email draft
5. Present EVERYTHING in one response:
   - Meeting scheduled summary
   - Meet link
   - Email draft in a > blockquote
   - One line: "Ready to send this email?"
6. On user confirmation → call send_gmail_message → done.

### WHAT "SILENT" MEANS:
Do not narrate tool calls. Do not say:
- "Let me check your calendar..."
- "No conflicts found, scheduling now..."
- "I'll create a Meet link..."
These are filler lines. Skip them entirely. Show results, not process.

### DATE & TIME RULES (CRITICAL — READ CAREFULLY):
- The user is in IST (India Standard Time), which is UTC+05:30.
- ALWAYS convert any user-mentioned time to IST and format it as: YYYY-MM-DDTHH:MM:SS+05:30
- NEVER use Z or UTC offset in date/time parameters. Z means UTC and will place the event ~5.5 hours behind the correct time.
- Examples:
  - "5:00 PM on April 6th"  →  2026-04-06T17:00:00+05:30
  - "10:30 AM tomorrow"     →  2026-04-07T10:30:00+05:30
- If no end time is specified, default to 30 minutes after start.
- Always pass both start and end as +05:30 offset strings.

### WHEN TO ASK CLARIFYING QUESTIONS:
Only ask if a blocking detail is truly missing:
- No recipient → ask
- No date/time → ask
- No meeting title/topic → ask (use a sensible default like "Meeting" only if topic is inferable from context)
If even one of these is missing, ask for ALL missing details in one message before doing anything.
Once you have them, execute the full flow without further questions.

### EMAIL DRAFT RULES:
- Always write a professional, complete email — never use "[Your Name]" placeholders. Sign off as "Memoria Assistant" if no sender name is known.
- Embed the Meet link directly in the email body as a clickable link.
- Keep it concise: 3-4 lines max.
- Show the draft inside a > blockquote before sending.

### SINGLE-ACTION REQUESTS (no email involved):
If the user only asks to schedule / only asks for a Meet link / only asks to read emails → execute directly with no confirmation needed. Just do it and report back.

### RESPONSE FORMAT (Markdown always):
- **Bold** for labels: **Date:**, **Time:**, **Status:**
- ## for event/email subject headers
- [Clickable text](url) — never raw URLs
- > Blockquote for email drafts only
- \`Inline code\` for dates, IDs, status tags like \`CONFIRMED\`
- --- between separate sections
- Tables for 3+ item comparisons

### TOOL REFERENCE:
- **get_upcoming_events** — always call first before any scheduling
- **create_calendar_event** — book the meeting (pass start/end as +05:30 ISO strings)
- **create_meet_link** — generate Google Meet link
- **send_gmail_message** — send email (only after user confirms the draft)
- **list_emails** — time-based email retrieval
- **search_emails** — topic/entity-based email search
- **get_meet_details** — get Meet link for an existing event by ID

🤖 **THE AGENT FACTORY ('create_autonomous_agent')**:
- Use this tool to build a draft of a background AI worker.
- When you use this tool, it will generate a form for the user to review. Tell the user: "I have drafted your new agent below. Please review the permissions and click Save when you are ready."

### NO DATA FALLBACK:
If tools return empty, tell the user to click **"Build Memory / Sync"** in the top-left corner.

Current date: ${new Date().toDateString()}
Current timezone: Asia/Kolkata (IST, UTC+05:30)

${isAutonomousMode ? `\n🚨 AUTONOMOUS OVERRIDE: You are currently running in an automated background worker. DO NOT ask the user for confirmation to send emails or schedule events. Take action and execute the tools immediately.` : ""}
  `.trim();
  
  const messages: any[] = [
    { role: "system", content: MASTER_SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userPrompt }
  ];

  try {
    let generativeUITrigger = "";

    // 🚨 THE AGENTIC LOOP: Replaces the static two-call structure
    // This allows the AI to chain up to 5 actions together (Search -> Draft -> Send)
    for (let i = 0; i < 5; i++) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools: tools as any, // Tools are passed on every single iteration
      });

      const message = response.choices?.[0]?.message;
      if (!message) return "The Master Agent is currently unavailable.";

      messages.push(message);

      // If no tools are called, the AI has finalized its thought process. Break the loop.
      if (!message.tool_calls) {
        let finalContent = message.content || "Task completed.";
        
        // Forcefully append the secret UI tag to the very end of the AI's text
        if (generativeUITrigger) {
          finalContent += `\n\n${generativeUITrigger}`;
        }
        
        return finalContent;
      }

      // If tools ARE called, execute them all in parallel
      const toolResults = await Promise.all(
        message.tool_calls.map(async (toolCall) => {
          const name = toolCall.function.name;
          
          let args = {};
          try {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } catch (e) {
            console.error("Malformed tool arguments", e);
          }

          const toolFunction = toolRegistry[name];
          
          if (toolFunction) {
            try {
              const data = await toolFunction(args, userId);
              
              // Intercept the UI tag!
              if (data?.message && typeof data.message === "string" && data.message.includes("[RENDER_AGENT_FORM]")) {
                generativeUITrigger = data.message;
                return { 
                  role: "tool", 
                  tool_call_id: toolCall.id, 
                  content: "Success! Tell the user you have drafted the agent and they should review the form below. DO NOT output the JSON in your response." 
                };
              }

              // Standard tool return
              return { 
                role: "tool", 
                tool_call_id: toolCall.id, 
                content: JSON.stringify(data) 
              };
            } catch (err) {
              console.error(`Tool Execution Error [${name}]:`, err);
              return { role: "tool", tool_call_id: toolCall.id, content: "Error executing tool." };
            }
          }
          
          return { role: "tool", tool_call_id: toolCall.id, content: "Requested tool does not exist." };
        })
      );

      // Push the tool results into the message array so the AI can read them on the next loop
      messages.push(...toolResults);
    }

    // Safety net in case it gets stuck in an infinite loop
    return "Max execution steps reached. Action stopped to prevent infinite loop.";

  } catch (error) { 
    console.error("Master Agent Core Error:", error);
    return "I encountered a system error. Please try again later.";
  }
}