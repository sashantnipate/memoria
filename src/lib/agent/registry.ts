import { createCalendarEvent, getUpcomingEvents } from "./tools/calendar";
import { executeListEmails, executeSearchEmails, sendGmailMessage } from "./tools/emails";

type ToolFunction = (args: any, userId: string) => Promise<any>;

export const toolRegistry: Record<string, ToolFunction> = {
  search_emails: executeSearchEmails,
  list_emails: executeListEmails,
  send_gmail_message: sendGmailMessage,
  get_upcoming_events: getUpcomingEvents,
  create_calendar_event: createCalendarEvent,
};  