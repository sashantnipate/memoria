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
        EXTERNAL TRIGGER: A new email has arrived in the user's inbox.
        
        FROM: ${from}
        SUBJECT: ${subject}
        BODY: ${body}

        ### YOUR INSTRUCTIONS:
        1. Evaluate if this email requires action (scheduling, information lookup, or a reply).
        2. If it is a question about the user's data, use 'search_emails' to find context.
        3. If they want to meet, use 'get_upcoming_events' and 'create_calendar_event'.
        4. If action is needed, use 'send_gmail_message'.
        5. If NO action is needed (it's informational or a 'thank you'), just state "No action needed" and end.
        
        Do not explain your reasoning to the user. Just execute the tools.
      `.trim();


      return await runAgent(triagePrompt, userId, []);
    });

    return { success: true, result: aiAction };
  }
);