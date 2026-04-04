import { clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";

/**
 * Converts a markdown string to clean plain text suitable for Google Calendar.
 * Handles links, bold, italic, inline code, headers, and list markers.
 */
function stripMarkdown(text: string): string {
  return text
    // [link text](url)  →  url
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$2")
    // **bold** / __bold__  →  bold
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    // *italic* / _italic_  →  italic
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // `inline code`  →  inline code
    .replace(/`([^`]+)`/g, "$1")
    // ## Heading  →  Heading
    .replace(/^#{1,6}\s+/gm, "")
    // - list / * list  →  list
    .replace(/^[\*\-]\s+/gm, "")
    .trim();
}

async function getGoogleAuth(userId: string) {
  try {
    const provider = "oauth_google";
    const client = await clerkClient();

    const response = await client.users.getUserOauthAccessToken(userId, provider);

    const accessToken = response.data[0]?.token;

    if (!accessToken) {
      throw new Error("No Google Access Token found. Please re-sync your account.");
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
  } catch (error) {
    console.error("Clerk Auth Error:", error);
    throw error;
  }
}

export async function getUpcomingEvents(args: any, userId: string) {
  const auth = await getGoogleAuth(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: args.timeMin || new Date().toISOString(),
    timeMax: args.timeMax,
    singleEvents: true,
    orderBy: "startTime",
    fields: "items(id,summary,description,start,end,htmlLink,conferenceData/entryPoints)",
  });

  const cleanEvents = (res.data.items || []).map((event) => ({
    id: event.id,
    title: event.summary,
    description: event.description || "",
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    link: event.htmlLink,
    meetLink: event.conferenceData?.entryPoints?.[0]?.uri || null,
  }));

  return cleanEvents;
}

export async function createCalendarEvent(args: any, userId: string) {
  const auth = await getGoogleAuth(userId);
  const calendar = google.calendar({ version: "v3", auth });

  // Sanitize description: strip any markdown the AI may have included
  const cleanDescription = args.description
    ? stripMarkdown(args.description)
    : "Created via Memoria AI Assistant";

  /**
   * TIMEZONE FIX:
   * Always store events in Asia/Kolkata (IST, UTC+5:30).
   * The model is instructed to send times as local IST strings
   * (e.g. "2026-04-06T17:00:00+05:30"). By also setting timeZone
   * here, Google Calendar correctly anchors the event to IST
   * regardless of the server's system timezone.
   */
  const USER_TIMEZONE = "Asia/Kolkata";

  const event = {
    summary: args.title,
    description: cleanDescription,
    start: {
      dateTime: args.start,
      timeZone: USER_TIMEZONE,
    },
    end: {
      dateTime: args.end,
      timeZone: USER_TIMEZONE,
    },
    ...(args.shouldCreateMeet && {
      conferenceData: {
        createRequest: {
          requestId: `memoria-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    }),
  };

  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: event,
    });

    return {
      success: true,
      htmlLink: response.data.htmlLink,
      meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
      event: response.data,
    };
  } catch (error: any) {
    console.error("Google Calendar Create Error:", error);
    const msg =
      error?.response?.data?.error?.message ||
      error?.message ||
      "Failed to create calendar event";
    throw new Error(msg);
  }
}