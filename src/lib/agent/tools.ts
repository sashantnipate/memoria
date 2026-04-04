export const tools = [
  {
    type: "function",
    function: {
      name: "search_emails",
      description: "Search for emails based on their meaning, intent, or specific topics (e.g., 'Find my flight receipts' or 'What did John say about the project?'). Use this for semantic queries.",
      parameters: {
        type: "object",
        properties: {
          query: { 
            type: "string", 
            description: "The natural language topic or keywords to search for." 
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_emails",
      description: "Retrieve a list of recent emails filtered by time or sender. Best for queries like 'Show me today's emails' or 'Last 3 days of emails'.",
      parameters: {
        type: "object",
        properties: {
          days: { 
            type: "number", 
            description: "The number of days to look back from today. Default to 7 if not specified." 
          },
          from: { 
            type: "string", 
            description: "The email address of the sender to filter by." 
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a new event on Google Calendar.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The name of the event" },
          start: { type: "string", description: "ISO 8601 start time" },
          end: { type: "string", description: "ISO 8601 end time" },
          description: { type: "string" }
        },
        required: ["title", "start", "end"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_events",
      description: "Retrieve calendar events for a specific time range.",
      parameters: {
        type: "object",
        properties: {
          timeMin: { type: "string", description: "ISO start search time" },
          timeMax: { type: "string", description: "ISO end search time" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_gmail_message",
      description: "Compose and immediately send an email.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email" },
          subject: { type: "string" },
          body: { type: "string", description: "The message content (supports HTML/Plaintext)" }
        },
        required: ["to", "subject", "body"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a new meeting or appointment on the user's Google Calendar. This tool should be used when the user explicitly asks to schedule something or agrees to a suggested time slot.",
      parameters: {
        type: "object",
        properties: {
          title: { 
            type: "string", 
            description: "The summary or name of the calendar event (e.g., 'Interview with GE Appliances')." 
          },
          start: { 
            type: "string", 
            description: "The start date and time in ISO 8601 format (e.g., '2026-04-04T14:00:00Z')." 
          },
          end: { 
            type: "string", 
            description: "The end date and time in ISO 8601 format. Usually 30-60 minutes after the start time." 
          },
          description: { 
            type: "string", 
            description: "Additional details for the event. Mention that it was 'Scheduled via Memoria AI' and include any relevant context from previous emails." 
          },
          shouldCreateMeet: {
            type: "boolean",
            description: "Whether to generate a Google Meet video conference link for this event. Set to true for interviews or remote meetings."
          }
        },
        required: ["title", "start", "end"]
      }
    }
  }

];