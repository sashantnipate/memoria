"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  format, startOfWeek, endOfWeek, addDays, addMonths, subMonths,
  startOfMonth, endOfMonth, startOfDay, addHours, isSameDay,
  isSameMonth, isToday, differenceInMinutes, parseISO, getDay,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Loader2, VideoIcon,
  CalendarX, Menu, X, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getCalendarEventsForWeek,
  createCalendarEventAction,
  type CalendarEvent,
} from "@/lib/actions/calendar.actions";

/* ─── Constants ─────────────────────────────────────── */
const HOUR_HEIGHT = 112;
const COLORS = [
  { bg: "bg-blue-500/20 border-blue-500",       text: "text-blue-700 dark:text-blue-300",   bgSolid: "#dbeafe" },
  { bg: "bg-violet-500/20 border-violet-500",   text: "text-violet-700 dark:text-violet-300", bgSolid: "#ede9fe" },
  { bg: "bg-emerald-500/20 border-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bgSolid: "#d1fae5" },
  { bg: "bg-amber-500/20 border-amber-500",     text: "text-amber-700 dark:text-amber-300",   bgSolid: "#fef3c7" },
  { bg: "bg-rose-500/20 border-rose-500",       text: "text-rose-700 dark:text-rose-300",   bgSolid: "#ffe4e6" },
];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/* ─── Helpers ───────────────────────────────────────── */
function eventToStyle(start: string, end: string) {
  const s = parseISO(start);
  const e = parseISO(end);
  const top    = (differenceInMinutes(s, startOfDay(s)) / 60) * HOUR_HEIGHT;
  const height = Math.max((differenceInMinutes(e, s) / 60) * HOUR_HEIGHT, 44);
  return { top, height };
}

function toInputLocal(d: Date) {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

/* ─── Overlap layout ─────────────────────────────────
   Groups events that overlap in time within the same day
   and assigns them side-by-side column positions so they
   never visually stack on top of each other.
──────────────────────────────────────────────────────── */
interface LayoutSlot { col: number; totalCols: number; }

function computeOverlapLayout(events: CalendarEvent[]): Map<string | number, LayoutSlot> {
  const result = new Map<string | number, LayoutSlot>();
  if (events.length === 0) return result;

  // Work with indices so we can sort without mutating
  const indices = events.map((_, i) => i).sort((a, b) => {
    try { return parseISO(events[a].start!).getTime() - parseISO(events[b].start!).getTime(); }
    catch { return 0; }
  });

  // Cluster: group all events that overlap with at least one other in the group
  const clusters: number[][] = [];
  for (const idx of indices) {
    const ev      = events[idx];
    const evStart = parseISO(ev.start!).getTime();
    const evEnd   = parseISO(ev.end!).getTime();
    let placed    = false;

    for (const cluster of clusters) {
      const overlaps = cluster.some(ci => {
        const o = events[ci];
        return evStart < parseISO(o.end!).getTime() && evEnd > parseISO(o.start!).getTime();
      });
      if (overlaps) { cluster.push(idx); placed = true; break; }
    }
    if (!placed) clusters.push([idx]);
  }

  for (const cluster of clusters) {
    const totalCols = cluster.length;
    cluster.forEach((evIdx, col) => {
      const key = events[evIdx].id ?? evIdx;
      result.set(key, { col, totalCols });
    });
  }

  return result;
}

/* ─── Mini Month Calendar ───────────────────────────── */
function MiniCalendar({ focusDate, onDateSelect }: { focusDate: Date; onDateSelect: (d: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(focusDate));

  useEffect(() => {
    setViewMonth(startOfMonth(focusDate));
  }, [focusDate.getMonth(), focusDate.getFullYear()]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd   = endOfMonth(viewMonth);
  const gridStart  = addDays(monthStart, -getDay(monthStart));
  const gridEnd    = addDays(monthEnd, 6 - getDay(monthEnd));

  const days: Date[] = [];
  let d = gridStart;
  while (d <= gridEnd) { days.push(d); d = addDays(d, 1); }

  return (
    <div className="select-none px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">{format(viewMonth, "MMMM yyyy")}</span>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewMonth(m => addMonths(m, 1))}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((l, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onDateSelect(day)}
            className={cn(
              "h-7 w-7 mx-auto flex items-center justify-center rounded-full text-[11px] font-medium transition-colors",
              !isSameMonth(day, viewMonth) && "text-muted-foreground/25",
              isSameMonth(day, viewMonth) && !isToday(day) && !isSameDay(day, focusDate) && "hover:bg-muted text-foreground",
              isToday(day) && !isSameDay(day, focusDate) && "text-primary font-bold",
              isSameDay(day, focusDate) && "bg-primary text-primary-foreground font-bold",
            )}
          >
            {format(day, "d")}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Create Event Modal ────────────────────────────── */
function CreateEventModal({
  defaultDate,
  onClose,
  onCreated,
}: {
  defaultDate: Date;
  onClose: () => void;
  onCreated: () => void;
}) {
  const defaultStart = addHours(startOfDay(defaultDate), 9);
  const defaultEnd   = addHours(startOfDay(defaultDate), 10);

  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [startVal, setStartVal]       = useState(toInputLocal(defaultStart));
  const [endVal, setEndVal]           = useState(toInputLocal(defaultEnd));
  const [saving, setSaving]           = useState(false);
  const [err, setErr]                 = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setErr("Title is required"); return; }
    if (new Date(endVal) <= new Date(startVal)) {
      setErr("End time must be after start time");
      return;
    }
    setSaving(true);
    setErr(null);
    const result = await createCalendarEventAction({
      title: title.trim(),
      description,
      start: new Date(startVal).toISOString(),
      end:   new Date(endVal).toISOString(),
    });
    setSaving(false);
    if (result.success) { onCreated(); onClose(); }
    else setErr(result.error ?? "Something went wrong");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b">
          <h2 className="text-base font-semibold">New event</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <Input
            autoFocus
            placeholder="Event title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-base border-0 border-b rounded-none px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Start</label>
              <Input type="datetime-local" value={startVal} onChange={e => { setStartVal(e.target.value); setErr(null); }} className="text-xs h-9" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">End</label>
              <Input type="datetime-local" value={endVal} onChange={e => { setEndVal(e.target.value); setErr(null); }} className="text-xs h-9" />
            </div>
          </div>
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="text-sm min-h-[72px] resize-none"
          />

          {err && <p className="text-xs text-destructive">{err}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main CalendarPage ─────────────────────────────── */
export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents]           = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCreate, setShowCreate]   = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  /* ── Fetch events ──────────────────────────────────── */
  const fetchEvents = useCallback(async () => {
    setIsLoading(true); setError(null);
    const result = await getCalendarEventsForWeek(currentDate.toISOString());
    if (result.error) setError(result.error);
    else setEvents(result.events);
    setIsLoading(false);
  }, [currentDate]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  /* Scroll time grid to 8 AM on first load */
  const timeBodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (timeBodyRef.current) timeBodyRef.current.scrollTop = HOUR_HEIGHT * 7;
  }, []);

  /* ── Helpers ───────────────────────────────────────── */
  const eventsForDay = (day: Date) =>
    events.filter(ev => {
      if (!ev.start) return false;
      try { return isSameDay(parseISO(ev.start), day); } catch { return false; }
    });

  const now      = new Date();
  const todayTop = (differenceInMinutes(now, startOfDay(now)) / 60) * HOUR_HEIGHT;
  const todayIdx = weekDays.findIndex(d => isSameDay(d, now));

  return (
    <div className="flex w-full bg-background" style={{ height: '100%', overflow: 'hidden' }}>

      {/* ════ LEFT SIDEBAR — its own independent scroll ════ */}
      <aside
        className={cn(
          "flex-shrink-0 border-r border-border bg-card/40 transition-all duration-300",
          sidebarOpen ? "w-[220px]" : "w-0 overflow-hidden"
        )}
        style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        {/* Fixed top buttons — never scroll */}
        <div className="w-[220px] shrink-0 pt-3 px-3">
          <Button
            className="w-full h-9 rounded-full gap-2 shadow-md mb-2"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" /> Create
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs rounded-full"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>

        {/* Scrollable area — ONLY this sidebar content scrolls independently */}
        <div
          className="w-[220px] mt-2"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}
        >
          <MiniCalendar focusDate={currentDate} onDateSelect={setCurrentDate} />
          {error && (
            <div className="px-3 mt-2">
              <Badge variant="destructive" className="text-[10px] w-full justify-center">{error}</Badge>
            </div>
          )}
        </div>
      </aside>

      {/* ════ RIGHT: HEADER + WEEK VIEW — its own independent scroll ════ */}
      <div className="flex flex-col min-w-0" style={{ flex: 1, height: '100%', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* ── Top header (static) */}
        <header className="flex items-center gap-2 px-4 py-2 border-b shrink-0 bg-background/90 backdrop-blur-sm z-10">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
            onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          <h1 className="text-sm font-semibold tracking-tight truncate">
            {format(weekStart, "MMM d")}
            {" – "}
            {format(addDays(weekStart, 6),
              isSameMonth(weekStart, addDays(weekStart, 6)) ? "d, yyyy" : "MMM d, yyyy"
            )}
          </h1>

          <div className="flex items-center gap-0.5 ml-auto">
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setCurrentDate(d => addDays(d, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs rounded-full"
              onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setCurrentDate(d => addDays(d, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {!sidebarOpen && (
            <Button size="sm" className="h-8 rounded-full gap-1.5 ml-1"
              onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" /> Create
            </Button>
          )}

          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0 ml-1" />}
        </header>

        {/* ── Week grid — fills remaining height, clips overflow ── */}
        <div className="flex flex-col min-w-0" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* ZONE 1 — Day-of-week headers (static, does NOT scroll) */}
          <div className="flex border-b shrink-0 bg-background z-10">
            {/* Spacer matching time-label column width */}
            <div className="w-14 flex-shrink-0" />
            <div className="flex flex-1 min-w-[400px]">
              {weekDays.map(day => {
                const today    = isToday(day);
                const selected = isSameDay(day, currentDate);
                return (
                  <div
                    key={day.toISOString()}
                    className="flex-1 py-2 text-center border-l first:border-l-0 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setCurrentDate(day)}
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {format(day, "EEE")}
                    </p>
                    <div className={cn(
                      "mt-0.5 h-8 w-8 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-colors",
                      today && !selected && "text-primary font-bold",
                      selected && "bg-primary text-primary-foreground",
                      !today && !selected && "text-foreground",
                    )}>
                      {format(day, "d")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ZONE 2 — Time grid scrolls ONLY here, independent of sidebar */}
          <div
            ref={timeBodyRef}
            className="relative"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto' }}
          >
            <div className="flex min-w-[540px] w-full">

              {/* ── Y-axis time labels — centered BETWEEN the hour lines ── */}
              <div className="w-14 flex-shrink-0 select-none relative" style={{ height: HOUR_HEIGHT * 24 }}>
                {timeSlots.map(hour => (
                  <div
                    key={hour}
                    className="absolute w-full flex items-center justify-end pr-2"
                    style={{
                      /* Shift label down by half an hour so it sits between
                         the line above (hour) and the line below (hour+1)   */
                      top:    hour === 0 ? 0 : hour * HOUR_HEIGHT - HOUR_HEIGHT / 2,
                      height: HOUR_HEIGHT,
                    }}
                  >
                    {hour === 0 ? (
                      ""
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50 leading-none">
                        {format(addHours(startOfDay(new Date()), hour), "h a")}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Day columns ── */}
              <div className="flex flex-1 border-l relative" style={{ height: HOUR_HEIGHT * 24 }}>

                {/* Grid lines */}
                <div className="absolute inset-0 pointer-events-none z-0">
                  {timeSlots.map(hour => (
                    <div key={hour} style={{ height: HOUR_HEIGHT }} className="border-b border-border/40" />
                  ))}
                </div>

                {/* Current-time red line */}
                {todayIdx >= 0 && (
                  <div className="absolute z-30 pointer-events-none"
                    style={{ top: todayTop, left: `${(todayIdx / 7) * 100}%`, width: `${100 / 7}%` }}>
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                      <div className="flex-1 h-[1.5px] bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Event columns — events in same slot tile side-by-side */}
                {weekDays.map(day => {
                  const dayEvents = eventsForDay(day);
                  const layout    = computeOverlapLayout(dayEvents);

                  return (
                    <div key={day.toISOString()}
                      className="flex-1 border-r last:border-r-0 relative"
                      style={{ height: HOUR_HEIGHT * 24 }}>

                      {dayEvents.map((ev, evIdx) => {
                        if (!ev.start || !ev.end) return null;
                        let style = { top: 0, height: 22 };
                        try { style = eventToStyle(ev.start, ev.end); } catch { return null; }

                        const key         = ev.id ?? evIdx;
                        const slot        = layout.get(key) ?? { col: 0, totalCols: 1 };
                        const colW        = 100 / slot.totalCols;
                        const leftPct     = slot.col * colW;
                        const color       = COLORS[evIdx % COLORS.length];

                        /* Leave a small inset on both sides; halve the inner gap */
                        const gapPx = 2;
                        const leftStyle  = `calc(${leftPct}% + ${gapPx}px)`;
                        const widthStyle = `calc(${colW}% - ${gapPx * 2}px)`;

                        return (
                          /* Outer div — reserves the original slot space in the grid */
                          <div
                            key={key}
                            className="absolute group"
                            style={{
                              top:    style.top,
                              height: style.height,
                              left:   leftStyle,
                              width:  widthStyle,
                              zIndex: 10 + evIdx,
                            }}
                          >
                            {/* Inner div — expands on hover to reveal all details */}
                            <div
                              className={cn(
                                "absolute top-0 left-0 rounded border-l-[3px] px-2.5 py-1.5 cursor-pointer transition-all duration-200 ease-in-out",
                                "overflow-hidden group-hover:overflow-visible group-hover:shadow-2xl group-hover:z-[999]",
                                color.bg
                              )}
                              style={{
                                minHeight: style.height,
                                height: 'auto',
                                width: '100%',
                              }}
                              onMouseEnter={e => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.width = '200px';
                                el.style.minWidth = '200px';
                                el.style.zIndex = '2000';
                                el.style.overflow = 'visible';
                                el.style.backgroundColor = color.bgSolid;
                                el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
                              }}
                              onMouseLeave={e => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.width = '100%';
                                el.style.minWidth = '';
                                el.style.zIndex = '';
                                el.style.overflow = 'hidden';
                                el.style.backgroundColor = '';
                                el.style.boxShadow = '';
                              }}
                            >
                              {/* Title — always visible */}
                              <p className={cn("text-[11px] font-semibold leading-tight group-hover:whitespace-normal", color.text,
                                "truncate group-hover:truncate-none group-hover:text-[12px]"
                              )}>
                                {ev.title ?? "Untitled"}
                              </p>

                              {/* Time range — always visible if block tall enough, always on hover */}
                              <p className={cn(
                                "text-[10px] leading-tight opacity-80 mt-0.5 whitespace-nowrap",
                                style.height <= 44 ? "hidden group-hover:block" : "",
                                color.text
                              )}>
                                {format(parseISO(ev.start), "h:mm a")} – {format(parseISO(ev.end), "h:mm a")}
                              </p>

                              {/* Description — only on hover */}
                              {ev.description && (
                                <p className={cn(
                                  "hidden group-hover:block text-[10px] leading-snug opacity-70 mt-1 whitespace-normal",
                                  color.text
                                )}>
                                  {ev.description}
                                </p>
                              )}

                              {/* Meet link — always on hover */}
                              {ev.meetLink && (
                                <a
                                  href={ev.meetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className={cn(
                                    "mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium underline whitespace-nowrap",
                                    style.height <= 64 ? "hidden group-hover:inline-flex" : "inline-flex",
                                    color.text
                                  )}
                                >
                                  <VideoIcon className="h-3 w-3" /> Join Meet
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {!isLoading && !error && events.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none mt-16">
            <CalendarX className="h-9 w-9 text-muted-foreground/25" />
            <p className="text-xs text-muted-foreground/40">No events this week</p>
          </div>
        )}
      </div>

      {/* ════ Create Event Modal ════ */}
      {showCreate && (
        <CreateEventModal
          defaultDate={currentDate}
          onClose={() => setShowCreate(false)}
          onCreated={fetchEvents}
        />
      )}
    </div>
  );
}