import { clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";

/** Strip markdown syntax so Google Calendar shows clean plain text. */
function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$2")   // [text](url) → url
    .replace(/(\*\*|__)(.*?)\1/g, "$2")            // **bold** → bold
    .replace(/(\*|_)(.*?)\1/g, "$2")               // *italic* → italic
    .replace(/`([^`]+)`/g, "$1")                    // `code` → code
    .replace(/^#{1,6}\s+/gm, "")                   // ## Heading → Heading
    .replace(/^[\*\-]\s+/gm, "")                   // - item → item
    .trim();
}

/* ─── Shared Google OAuth helper (same pattern as emails.ts / calendar.ts) ── */
async function getGoogleAuth(userId: string) {
  try {
    const client = await clerkClient();
    const response = await client.users.getUserOauthAccessToken(userId, "oauth_google");
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

/* ─────────────────────────────────────────────────────────────────────────────
   createMeetLink
   ─────────────────────────────────────────────────────────────────────────────
   Creates a minimal Google Calendar event whose only purpose is to generate a
   Google Meet conference link.  The event can optionally be given a title,
   start / end time, and a description; sensible defaults are applied when they
   are omitted.

   args shape:
     title?       – string  – display name of the meeting (default: "Quick Meet")
     description? – string  – event description
     start?       – string  – ISO-8601 datetime (default: now)
     end?         – string  – ISO-8601 datetime (default: 1 hour after start)
     attendees?   – string[] – email addresses to invite (optional)

   Returns:
     { success: true,  meetLink, htmlLink, eventId }
     { success: false, error }
───────────────────────────────────────────────────────────────────────────── */
export async function createMeetLink(args: any, userId: string) {
  const auth     = await getGoogleAuth(userId);
  const calendar = google.calendar({ version: "v3", auth });

  /* ── Resolve start / end times ── */
  const startTime = args.start
    ? new Date(args.start)
    : new Date();

  const endTime = args.end
    ? new Date(args.end)
    : new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour default

  /* ── Optional attendees ── */
  const attendees =
    Array.isArray(args.attendees) && args.attendees.length > 0
      ? args.attendees.map((email: string) => ({ email }))
      : undefined;

  /* ── Sanitize description (AI may include markdown) ── */
  const cleanDescription = args.description
    ? stripMarkdown(args.description)
    : "Created via Memoria AI Assistant";

  const eventBody: any = {
    summary:     args.title || "Quick Meet",
    description: cleanDescription,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: "UTC",
    },
    /* Attach a Meet conference to the event */
    conferenceData: {
      createRequest: {
        requestId:           `memoria-meet-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    ...(attendees && { attendees }),
  };

  try {
    const response = await calendar.events.insert({
      calendarId:           "primary",
      conferenceDataVersion: 1, // required for Meet link generation
      requestBody:           eventBody,
      sendUpdates:           attendees ? "all" : "none",
    });

    const meetLink =
      response.data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video"
      )?.uri ||
      response.data.conferenceData?.entryPoints?.[0]?.uri ||
      null;

    if (!meetLink) {
      throw new Error(
        "Event created but no Meet link was returned. " +
        "Make sure your Google account has Meet enabled."
      );
    }

    return {
      success:  true,
      meetLink,
      htmlLink: response.data.htmlLink,
      eventId:  response.data.id,
      message:  `Google Meet link created: ${meetLink}`,
    };
  } catch (error: any) {
    console.error("Create Meet Link Error:", error);
    const msg =
      error?.response?.data?.error?.message ||
      error?.message ||
      "Failed to create Meet link";
    return { success: false, error: msg };
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   getMeetDetails
   ─────────────────────────────────────────────────────────────────────────────
   Looks up an existing Google Calendar event by event ID and returns its Meet
   conference details.

   args shape:
     eventId – string – the Google Calendar event ID

   Returns:
     { success: true, meetLink, htmlLink, title, start, end }
     { success: false, error }
───────────────────────────────────────────────────────────────────────────── */
export async function getMeetDetails(args: any, userId: string) {
  if (!args.eventId) {
    return { success: false, error: "eventId is required" };
  }

  try {
    const auth     = await getGoogleAuth(userId);
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.get({
      calendarId: "primary",
      eventId:    args.eventId,
      fields:     "id,summary,start,end,htmlLink,conferenceData/entryPoints",
    });

    const ev = response.data;
    const meetLink =
      ev.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video"
      )?.uri ||
      ev.conferenceData?.entryPoints?.[0]?.uri ||
      null;

    return {
      success:  true,
      meetLink,
      htmlLink: ev.htmlLink,
      title:    ev.summary,
      start:    ev.start?.dateTime || ev.start?.date,
      end:      ev.end?.dateTime   || ev.end?.date,
    };
  } catch (error: any) {
    console.error("Get Meet Details Error:", error);
    return {
      success: false,
      error:   error?.response?.data?.error?.message || error?.message || "Failed to fetch event",
    };
  }
}
