"use client"

import * as React from "react"
import { Moon, Sun, Clock } from "lucide-react"
import { useTheme } from "next-themes"
import { formatDistanceToNow } from "date-fns"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { UserButton } from "@clerk/nextjs"

import { SyncManager } from "@/components/SyncManager"
import { getSyncStatus } from "@/lib/actions/user.actions"
import { ThemeToggle } from "../theme/theme-toggle"

export default function Header() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [syncData, setSyncData] = React.useState<{ lastSynced: number | null } | null>(null)

  React.useEffect(() => {
    setMounted(true)
    const fetchStatus = async () => {
      const data = await getSyncStatus()
      setSyncData(data)
    }
    fetchStatus()
    
    const interval = setInterval(fetchStatus, 120000)
    return () => clearInterval(interval)
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    /* FIXED HEADER CHANGES:
       1. sticky top-0: Keeps it at the top of the viewport.
       2. z-50: Ensures it stays on top of chat messages/sidebar.
       3. w-full: Ensures it spans the full width.
    */
    <header className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b px-4 bg-background/80 backdrop-blur-md transition-all">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        
        <div className="flex items-center gap-4">
          <SyncManager />
          
          {syncData?.lastSynced && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border text-[10px] text-muted-foreground transition-all animate-in fade-in">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Clock className="h-3 w-3" />
              <span>
                Memory synced: {new Date(syncData.lastSynced).toLocaleDateString()} 
                <span className="ml-1 hidden md:inline">
                  ({formatDistanceToNow(syncData.lastSynced)} ago)
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="h-9 w-9"
        >
          {mounted ? (
            resolvedTheme === "dark" ? (
              <Sun className="h-[1.2rem] w-[1.2rem] text-orange-300 transition-all" />
            ) : (
              <Moon className="h-[1.2rem] w-[1.2rem] text-slate-700 transition-all" />
            )
          ) : (
            <div className="h-[1.2rem] w-[1.2rem]" />
          )}
        </Button>

        {/* Theme palette toggle */}
        <ThemeToggle />

        <Separator orientation="vertical" className="mx-1 h-4" />

        {/* User avatar */}
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-8 w-8"
            }
          }}
        />
      </div>
    </header>
  )
}