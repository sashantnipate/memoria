"use client"

import * as React from "react"
import { format, subDays } from "date-fns"
import { Database, Loader2, CalendarIcon, CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Notice we changed the import to startInngestSync
import { getSyncCount, startInngestSync } from "@/lib/actions/gmail.actions"

export function SyncManager() {
  const [count, setCount] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)
  
  const [fromDate, setFromDate] = React.useState<Date>(subDays(new Date(), 7))
  const [toDate, setToDate] = React.useState<Date>(new Date())
  
  const [syncInterval, setSyncInterval] = React.useState<string>("1440") 

  const handleCalculate = async () => {
    if (!fromDate || !toDate) return
    setLoading(true)
    try {
      const result = await getSyncCount({ after: fromDate, before: toDate })
      setCount(result.count)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartSync = async () => {
    if (!fromDate || !toDate) return
    setLoading(true)
    try {
      // Trigger the background job instead of waiting for the direct action
      await startInngestSync({ 
        after: fromDate, 
        before: toDate,
        autoSyncInterval: Number(syncInterval)
      })
      
      // Update the message to reflect background processing
      setSuccessMsg("Sync started in the background! You can safely close this window.")
    } catch (error) {
      console.error("Sync failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-full">
          <Database className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Build Memory / Sync</span>
          <span className="sm:hidden">Sync</span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-4" align="start" sideOffset={8}>
        {successMsg ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center animate-in zoom-in-95">
            <div className="rounded-full bg-primary/10 p-3">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">{successMsg}</p>
            <Button variant="secondary" className="w-full" onClick={() => setSuccessMsg(null)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5 border-b pb-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                Sync Strategy
              </h4>
              <p className="text-xs text-muted-foreground">
                Select the date range to index into your AI database.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={cn("w-full justify-start text-left font-normal h-9 px-3 text-xs", !fromDate && "text-muted-foreground")}
                    >
                      {fromDate ? format(fromDate, "MMM dd, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={fromDate} onSelect={(d) => d && setFromDate(d)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={cn("w-full justify-start text-left font-normal h-9 px-3 text-xs", !toDate && "text-muted-foreground")}
                    >
                      {toDate ? format(toDate, "MMM dd, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={toDate} onSelect={(d) => d && setToDate(d)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Label className="text-xs text-muted-foreground">Auto-Sync Background Interval</Label>
              <Select value={syncInterval} onValueChange={setSyncInterval}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select an interval" />
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

            <div className="space-y-3 pt-2">
              <Button 
                className="w-full text-xs font-medium" 
                variant="secondary"
                onClick={handleCalculate}
                disabled={loading || !fromDate || !toDate}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Calculate Sync Size"}
              </Button>

              {count !== null && (
                <div className="rounded-lg border bg-muted/50 p-3 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Messages found:</span>
                    <span className="font-semibold">{count.toLocaleString()}</span>
                  </div>
                  <Button 
                    onClick={handleStartSync}
                    className="w-full text-xs font-semibold"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Background Sync"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}