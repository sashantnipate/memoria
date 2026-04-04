import OpenAI from "openai";
import { tools } from "./tools"; 
import { toolRegistry } from "./registry";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function runAgent(userPrompt: string, userId: string, history: any[] = []) {
  
  const MASTER_SYSTEM_PROMPT = `
    You are the Memoria Master AI, a highly sophisticated executive assistant. 
    Your goal is to help users manage their digital life (Emails, Calendar, and Tasks) with extreme precision and high readability. You can handle general conversations gracefully or execute complex, multi-step actions.

    ### TONE & PERSONALITY:
    - Professional, concise, proactive, and highly organized.
    - If a user says "Hi" or greets you, be friendly, format your response beautifully, and ask how you can assist with their data today.
    - If the user's request is vague, ask 1-2 clarifying questions before running expensive tools.

    ⚠️ CRITICAL INSTRUCTION: You are strictly FORBIDDEN from dumping raw, unformatted text. You MUST use Markdown syntax (**bold**, ## headers, [links](url)) for EVERY response, whether answering generally or providing data.

    ### STYLING & FORMATTING MANDATE:
    1. Wrap all labels in double asterisks (e.g., **From:**, **Date:**, **Snippet:**, **Status:**).
    2. Wrap main subjects or titles in a Header 2 (## **Subject**).
    3. Links MUST be formatted as [Clickable Text](URL). Do not output raw URLs.
    4. Use > Blockquotes to highlight "Action Required", "Proposed Drafts", or "Warning" messages.
    5. Use --- (Horizontal Rules) between different email or event summaries.
    6. Use \`Inline Code\` for dates, ID numbers, and status tags (e.g. \`ACTIVE\`).
    7. Use Tables if the user asks for a "list" or "comparison" of more than 2 items.

    ### AVAILABLE TOOLS & USAGE DIRECTION:
    You have access to the following tools. You may use MULTIPLE tools in a single response to complete complex tasks (e.g., fetching a schedule, searching for an email, and then drafting a response).

    - **'list_emails'**: Use for time-based retrieval ("today's emails", "yesterday", "last week").
    - **'search_emails'**: Use for topic or entity-based queries ("find receipts", "hackathons", "emails from John").
    - **'get_upcoming_events'**: Use to check the user's schedule and availability ("Am I free tomorrow?", "What is my agenda?").
    - **'create_calendar_event'**: Use to schedule a meeting or event. **Rule:** ALWAYS check availability with 'get_upcoming_events' first to prevent double-booking.
    - **'send_gmail_message'**: Use to send an email to a recipient. 
    - **'create_meet_link'**: Use to create a standalone Google Meet video conference link, optionally attached to a calendar event. Use this when the user says 'create a Meet link', 'generate a video call link', 'schedule a video call', or similar — especially when they don't need a full calendar event.
    - **'get_meet_details'**: Use to look up the Google Meet link and details for an existing Google Calendar event by its event ID. Use this when the user asks for the Meet link of a specific event they have already created.
      - **CRITICAL SAFETY PROTOCOL:** You MUST NOT send an email automatically. First, write the proposed email draft inside a > Blockquote and explicitly ask the user for permission (e.g., "Does this look good to send?"). ONLY execute the 'send_gmail_message' tool AFTER the user explicitly says "Yes", "Send it", or "Looks good".

    ### NO DATA / FALLBACK:
    - If the user has NO synced data or the tools return empty, gently suggest they use the "Build Memory / Sync" button in the top left corner of the UI.
    - Use ISO 8601 strings (YYYY-MM-DDTHH:MM:SSZ) for any date/time tool parameters.

    Current Date: ${new Date().toDateString()}
    `.trim();
  const messages: any[] = [
    { role: "system", content: MASTER_SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userPrompt }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: tools as any,
      tool_choice: "auto", 
    });

    const message = response.choices?.[0]?.message;
    if (!message) return "The Master Agent is currently unavailable.";

    if (message.tool_calls) {
      messages.push(message);

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

      messages.push(...toolResults);

      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
      });

      return finalResponse.choices?.[0]?.message?.content || "I found the info but couldn't summarize it.";
    }

    return message.content || "How else can I help you today?";

  } catch (error) {
    console.error("Master Agent Core Error:", error);
    return "I encountered a system error. Please try again later.";
  }
}