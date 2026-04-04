"use server";

import { auth } from "@clerk/nextjs/server";
import { getUpcomingEvents, createCalendarEvent } from "@/lib/agent/tools/calendar";
import { startOfWeek, endOfWeek } from "date-fns";

export type CalendarEvent = {
  id: string | null | undefined;
  title: string | null | undefined;
  description: string;
  start: string | null | undefined;
  end: string | null | undefined;
  link: string | null | undefined;
  meetLink: string | null;
  source?: "google" | "local";
};

/* ─────────────────────────────────────────────────────────────────
   GET events for the week
   Fetches exclusively from Google Calendar — single source of truth.
   Dates/times are returned exactly as Google stores them (with
   timezone offset) so the UI calendar always matches Google Calendar.
───────────────────────────────────────────────────────────────── */
export async function getCalendarEventsForWeek(
  weekDateISO: string
): Promise<{ events: CalendarEvent[]; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { events: [], error: "Not authenticated" };

  const weekDate = new Date(weekDateISO);
  const timeMin  = startOfWeek(weekDate, { weekStartsOn: 0 }).toISOString();
  const timeMax  = endOfWeek(weekDate,   { weekStartsOn: 0 }).toISOString();

  try {
    const raw    = await getUpcomingEvents({ timeMin, timeMax }, userId);
    const events = raw.map((ev) => ({ ...ev, source: "google" as const }));
    return { events };
  } catch (err: any) {
    console.error("Google Calendar fetch error:", err);
    return {
      events: [],
      error: err?.message || "Could not reach Google Calendar. Please re-sync your account.",
    };
  }
}

/* ─────────────────────────────────────────────────────────────────
   CREATE event — written directly to Google Calendar
   The datetime-local input gives a local-time string (no offset).
   We convert it to a UTC ISO string; Google + UI both show it in
   the user's local timezone, so dates always match.
───────────────────────────────────────────────────────────────── */
export async function createCalendarEventAction(args: {
  title: string;
  description?: string;
  start: string; // ISO datetime (from browser, already UTC via new Date().toISOString())
  end: string;   // ISO datetime
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    if (!args.title?.trim())
      return { success: false, error: "Title is required" };
    if (!args.start || !args.end)
      return { success: false, error: "Start and end are required" };
    if (new Date(args.end) <= new Date(args.start))
      return { success: false, error: "End time must be after start time" };

    await createCalendarEvent(
      {
        title:       args.title.trim(),
        description: args.description?.trim() || "Created via Memoria",
        start:       new Date(args.start).toISOString(),
        end:         new Date(args.end).toISOString(),
      },
      userId
    );

    return { success: true };
  } catch (err: any) {
    console.error("Create Google Calendar event error:", err);
    return { success: false, error: err?.message || "Failed to create event" };
  }
}
