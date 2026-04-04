export const tools = [
  /* ── Email tools ──────────────────────────────────────────────────────── */
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
            description: "The natural language topic or keywords to search for.",
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
            description: "The number of days to look back from today. Default to 7 if not specified.",
          },
          from: {
            type: "string",
            description: "The email address of the sender to filter by.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_gmail_message",
      description: "Compose and immediately send an email.",
      parameters: {
        type: "object",
        properties: {
          to:      { type: "string", description: "Recipient email" },
          subject: { type: "string" },
          body:    { type: "string", description: "The message content (supports HTML/Plaintext)" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },

  /* ── Calendar tools ───────────────────────────────────────────────────── */
  {
    type: "function",
    function: {
      name: "get_upcoming_events",
      description: "Retrieve calendar events for a specific time range.",
      parameters: {
        type: "object",
        properties: {
          timeMin: { type: "string", description: "ISO start search time" },
          timeMax: { type: "string", description: "ISO end search time" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a new meeting or appointment on the user's Google Calendar. Use this when the user explicitly asks to schedule something or agrees to a suggested time slot.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The summary or name of the calendar event (e.g., 'Interview with GE Appliances').",
          },
          start: {
            type: "string",
            description: "The start date and time in ISO 8601 format (e.g., '2026-04-04T14:00:00Z').",
          },
          end: {
            type: "string",
            description: "The end date and time in ISO 8601 format. Usually 30-60 minutes after the start time.",
          },
          description: {
            type: "string",
            description: "Additional details for the event. Mention that it was 'Scheduled via Memoria AI' and include any relevant context from previous emails.",
          },
          shouldCreateMeet: {
            type: "boolean",
            description: "Whether to generate a Google Meet video conference link for this event. Set to true for interviews or remote meetings.",
          },
        },
        required: ["title", "start", "end"],
      },
    },
  },

  /* ── Meet tools ───────────────────────────────────────────────────────── */
  {
    type: "function",
    function: {
      name: "create_meet_link",
      description: "Create a standalone Google Meet video conference link, optionally attached to a calendar event. Use this when the user says 'create a Meet link', 'generate a video call link', 'schedule a video call', or similar — especially when they don't need a full calendar event.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Display name for the meeting (e.g., 'Team standup'). Defaults to 'Quick Meet' if omitted.",
          },
          start: {
            type: "string",
            description: "ISO 8601 start datetime for the meeting (e.g., '2026-04-04T14:00:00Z'). Defaults to now if omitted.",
          },
          end: {
            type: "string",
            description: "ISO 8601 end datetime. Defaults to 1 hour after start if omitted.",
          },
          description: {
            type: "string",
            description: "Optional agenda or description shown in the calendar invite.",
          },
          attendees: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of attendee email addresses to invite to the meeting.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_meet_details",
      description: "Look up the Google Meet link and details for an existing Google Calendar event by its event ID. Use this when the user asks for the Meet link of a specific event they have already created.",
      parameters: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "The Google Calendar event ID whose Meet conference details should be retrieved.",
          },
        },
        required: ["eventId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_autonomous_agent",
      description: "Generates an interactive UI form for the user to review and deploy a new background AI agent. Use this when the user asks for automation (e.g., 'send me a daily summary'). Do not tell the user it is saved—tell them you have 'drafted' the agent and they must review and save it below.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "A short, catchy name for the agent.",
          },
          systemPrompt: {
            type: "string",
            description: "The core directive. Be specific about which tools it should use.",
          },
          scheduleInterval: {
            type: "number",
            description: "Frequency in minutes (e.g., 60 for hourly, 1440 for daily).",
          },
          permissions: {
            type: "object",
            properties: {
              canReadMemory: { type: "boolean" },
              canDraftEmails: { type: "boolean" },
              canSendEmails: { type: "boolean" },
            },
            required: ["canReadMemory", "canDraftEmails", "canSendEmails"],
          },
        },
        required: ["name", "systemPrompt", "scheduleInterval", "permissions"],
      },
    },
  },
];