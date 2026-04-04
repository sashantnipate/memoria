"use server";

import { auth } from "@clerk/nextjs/server";
import { getUpcomingEvents } from "@/lib/agent/tools/calendar";
import { startOfWeek, endOfWeek } from "date-fns";
import { connectToDB } from "@/lib/database/db";
import CalendarEventModel from "@/lib/database/models/calendar-event.model";

export type CalendarEvent = {
  id: string | null | undefined;
  title: string | null | undefined;
  description: string;
  start: string | null | undefined;
  end: string | null | undefined;
  link: string | null | undefined;
  meetLink: string | null;
  source?: "google" | "local"; // helps UI distinguish if needed
};

/* ─────────────────────────────────────────────────────────────────
   GET events for the week:
   Tries Google Calendar first. Falls back to local-only on error.
   Always merges local (MongoDB) events in.
───────────────────────────────────────────────────────────────── */
export async function getCalendarEventsForWeek(
  weekDateISO: string
): Promise<{ events: CalendarEvent[]; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { events: [], error: "Not authenticated" };

  const weekDate = new Date(weekDateISO);
  const timeMin = startOfWeek(weekDate, { weekStartsOn: 0 }).toISOString();
  const timeMax = endOfWeek(weekDate, { weekStartsOn: 0 }).toISOString();

  // 1️⃣ Fetch local events from MongoDB
  await connectToDB();
  const localDocs = await CalendarEventModel.find({
    userId,
    start: { $gte: timeMin },
    end:   { $lte: timeMax },
  }).lean();

  const localEvents: CalendarEvent[] = localDocs.map((doc: any) => ({
    id:          doc._id.toString(),
    title:       doc.title,
    description: doc.description ?? "",
    start:       doc.start,
    end:         doc.end,
    link:        null,
    meetLink:    null,
    source:      "local",
  }));

  // 2️⃣ Try to fetch Google Calendar events (may fail if scope not granted)
  let googleEvents: CalendarEvent[] = [];
  let googleError: string | undefined;
  try {
    const raw = await getUpcomingEvents({ timeMin, timeMax }, userId);
    googleEvents = raw.map((ev) => ({ ...ev, source: "google" as const }));
  } catch (err: any) {
    // Google fetch failed (e.g. insufficient scope) — not fatal, just skip
    googleError = err?.message;
    console.warn("Google Calendar fetch skipped:", googleError);
  }

  // 3️⃣ Merge: local first so duplicates from Google (if any) appear after
  const merged = [...localEvents, ...googleEvents];

  return {
    events: merged,
    // Only surface the Google error if there are no local events either
    error: merged.length === 0 && googleError ? googleError : undefined,
  };
}

/* ─────────────────────────────────────────────────────────────────
   CREATE event — saved directly to MongoDB (no Google API needed)
───────────────────────────────────────────────────────────────── */
export async function createCalendarEventAction(args: {
  title: string;
  description?: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    if (!args.title?.trim()) return { success: false, error: "Title is required" };
    if (!args.start || !args.end) return { success: false, error: "Start and end are required" };
    if (new Date(args.end) <= new Date(args.start))
      return { success: false, error: "End time must be after start time" };

    await connectToDB();
    await CalendarEventModel.create({
      userId,
      title:       args.title.trim(),
      description: args.description?.trim() ?? "",
      start:       new Date(args.start).toISOString(),
      end:         new Date(args.end).toISOString(),
    });

    return { success: true };
  } catch (err: any) {
    console.error("Create local event error:", err);
    return { success: false, error: err?.message || "Failed to save event" };
  }
}
