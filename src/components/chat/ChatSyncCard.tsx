"use client";

import * as React from "react";
import { format, subDays } from "date-fns";
import {
  CalendarIcon,
  CheckCircle2,
  Database,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { startInngestSync } from "@/lib/actions/gmail.actions";

interface ChatSyncCardProps {
  onDismiss?: () => void;
  onSynced?: () => void;
}

export function ChatSyncCard({ onDismiss, onSynced }: ChatSyncCardProps) {
  const [loading, setLoading] = React.useState(false);
  const [synced, setSynced] = React.useState(false);

  const [fromDate, setFromDate] = React.useState<Date>(subDays(new Date(), 7));
  const [toDate, setToDate] = React.useState<Date>(new Date());
  const [syncInterval, setSyncInterval] = React.useState<string>("1440");

  const handleStartSync = async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    try {
      await startInngestSync({
        after: fromDate,
        before: toDate,
        autoSyncInterval: Number(syncInterval),
      });
      setSynced(true);
      // Notify parent after a brief moment to let success state render
      setTimeout(() => onSynced?.(), 2500);
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out">
      <div className="relative rounded-2xl border border-primary/25 bg-card shadow-md overflow-hidden">

        {/* Dismiss button */}
        {onDismiss && !synced && (
          <button
            onClick={onDismiss}
            className="absolute top-2.5 right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-b border-primary/10">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-foreground leading-tight">
              Sync Recommendation
            </p>
            <p className="text-[10px] text-muted-foreground">
              Proactive suggestion from Memoria
            </p>
          </div>
        </div>

        <div className="px-4 py-4">
          {synced ? (
            /* ── Success ── */
            <div className="flex flex-col items-center gap-3 py-3 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  Sync started!
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  I&apos;ll have your email context ready in the background. Keep chatting!
                </p>
              </div>
            </div>
          ) : (
            /* ── Form ── */
            <div className="space-y-3.5">
              {/* Prompt text */}
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                I noticed your emails aren&apos;t synced yet. Syncing is important for me to{" "}
                <span className="text-foreground font-medium">
                  remember your conversations
                </span>{" "}
                and provide better assistance.
              </p>

              {/* Date range */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Date Range
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* From */}
                  <Popover modal={false}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-8 px-2.5 text-xs",
                          !fromDate && "text-muted-foreground"
                        )}
                      >
                        <span className="text-muted-foreground mr-1">From</span>
                        {fromDate ? format(fromDate, "MMM d") : "Pick"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" onInteractOutside={(e) => e.preventDefault()}>
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={(d) => d && setFromDate(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  {/* To */}
                  <Popover modal={false}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-8 px-2.5 text-xs",
                          !toDate && "text-muted-foreground"
                        )}
                      >
                        <span className="text-muted-foreground mr-1">To</span>
                        {toDate ? format(toDate, "MMM d") : "Pick"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" onInteractOutside={(e) => e.preventDefault()}>
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={(d) => d && setToDate(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Interval */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Auto-Sync Interval
                </Label>
                <Select value={syncInterval} onValueChange={setSyncInterval}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Disabled (Manual Only)</SelectItem>
                    <SelectItem value="5">Every 5 Minutes</SelectItem>
                    <SelectItem value="30">Every 30 Minutes</SelectItem>
                    <SelectItem value="60">Every 1 Hour</SelectItem>
                    <SelectItem value="1440">Every 24 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleStartSync}
                  disabled={loading || !fromDate || !toDate}
                  size="sm"
                  className="flex-1 gap-1.5 text-xs font-semibold h-8"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Database className="h-3.5 w-3.5" />
                  )}
                  {loading ? "Starting…" : "Start Sync"}
                </Button>
                {onDismiss && (
                  <Button
                    onClick={onDismiss}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground h-8 px-3"
                  >
                    Later
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
