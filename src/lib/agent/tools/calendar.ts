import { clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";

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
    calendarId: 'primary',
    timeMin: args.timeMin || new Date().toISOString(),
    timeMax: args.timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    fields: 'items(id,summary,description,start,end,htmlLink,conferenceData/entryPoints)', 
  });
  
  const cleanEvents = (res.data.items || []).map(event => ({
    id: event.id,
    title: event.summary,
    description: event.description || "",
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    link: event.htmlLink,
    meetLink: event.conferenceData?.entryPoints?.[0]?.uri || null
  }));

  return cleanEvents;
}

export async function createCalendarEvent(args: any, userId: string) {
  const auth = await getGoogleAuth(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: args.title,
    description: args.description || "Created via Memoria AI Assistant",
    start: {
      dateTime: args.start, 
      timeZone: "UTC", 
    },
    end: {
      dateTime: args.end, 
      timeZone: "UTC",
    },
    ...(args.shouldCreateMeet && {
      conferenceData: {
        createRequest: {
          requestId: `memoria-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    })
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
  } catch (error) {
    console.error("Google Calendar Create Error:", error);
    throw new Error("Failed to create calendar event");
  }
}