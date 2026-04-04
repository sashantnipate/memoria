import { createAutonomousAgent } from "./tools/agent-factory";
import { createCalendarEvent, getUpcomingEvents } from "./tools/calendar";
import { executeListEmails, executeSearchEmails, sendGmailMessage } from "./tools/emails";
import { createMeetLink, getMeetDetails } from "./tools/meet";

type ToolFunction = (args: any, userId: string) => Promise<any>;

export const toolRegistry: Record<string, ToolFunction> = {
  // ── Email tools ──────────────────────────────────────────────────────────
  search_emails:        executeSearchEmails,
  list_emails:          executeListEmails,
  send_gmail_message:   sendGmailMessage,

  // ── Calendar tools ───────────────────────────────────────────────────────
  get_upcoming_events:  getUpcomingEvents,
  create_calendar_event: createCalendarEvent,

  // ── Meet tools ───────────────────────────────────────────────────────────
  create_meet_link:     createMeetLink,
  get_meet_details:     getMeetDetails,

  create_autonomous_agent: createAutonomousAgent
};  