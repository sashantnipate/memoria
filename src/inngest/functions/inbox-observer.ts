import { inngest } from "../client";
import { runAgent } from "@/lib/agent/cors";

export const inboxObserver = inngest.createFunction(
  { 
    id: "inbox-observer",
    retries: 1,
    concurrency: {
      limit: 1,
      key: "event.data.userId", 
    },
    triggers: [{ event: "email/new.received" }] 
  },
  async ({ event, step }) => {
    const { userId, subject, from, body } = event.data;

    if (from.includes("noreply") || from.includes("notifications")) {
      return { status: "ignored", reason: "Automated sender" };
    }

    const aiAction = await step.run("ai-triage-email", async () => {
      const triagePrompt = `
        <SYSTEM_OVERRIDE>
        EXTERNAL TRIGGER: A new email has arrived. You are Memoria, the user's autonomous AI assistant. 
        You must handle this email immediately in the background without user intervention.
        
        <CONTEXT>
        Current Date and Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
        Timezone: IST (UTC+05:30)
        FROM: ${from}
        SUBJECT: ${subject}
        BODY: ${body}
        </CONTEXT>

        <EXECUTION_TREE>
        Analyze the email and take EXACTLY ONE of the following paths:

        PATH 1: IGNORING (Informational, Newsletters, 'Thank You's)
        If the email requires no action, reply, or scheduling, output EXACTLY the string "TERMINATE_NO_ACTION" and stop.

        PATH 2: SCHEDULING (Strict Anti-Double-Booking Protocol)
        If the sender wants to schedule a meeting:
        - Step A: If they proposed a time, ALWAYS call 'get_upcoming_events' first. 
        - Step B (Free Slot): If the calendar is clear, call 'create_calendar_event', then 'create_meet_link', then 'send_gmail_message' to confirm with the sender.
        - Step C (Busy Slot): If the calendar has a conflict, DO NOT book. Call 'send_gmail_message' to politely decline the time and propose 2-3 open alternative slots based on the calendar data.
        - Step D (No Time Proposed): If they asked for a meeting but didn't suggest a time, use 'get_upcoming_events' to find 3 open slots in the next few days and use 'send_gmail_message' to offer them.

        PATH 3: QUESTION & ANSWER (Information Retrieval)
        If the sender is asking a specific question requiring past context:
        - Step A: Call 'search_emails' to find the answer.
        - Step B: Call 'send_gmail_message' to reply with a concise, professional answer. Do not leak sensitive internal data.

        <RULES>
        1. SILENT EXECUTION: Output ONLY tool calls or "TERMINATE_NO_ACTION". No conversational filler.
        2. PROFESSIONAL TONE: When drafting emails, speak professionally on behalf of the user. Sign off as "Memoria Assistant".
        3. NEVER double-book. Always verify with the calendar first.
        </RULES>
      `.trim();

      return await runAgent(triagePrompt, userId, []);
    });

    return { success: true, result: aiAction };
  }
);