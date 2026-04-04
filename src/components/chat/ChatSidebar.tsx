"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  MessageSquare, 
  History, 
  PanelLeftClose, 
  PanelLeft, 
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ChatItem = {
  _id: string;
  title?: string;
  updatedAt?: string;
};

export default function ChatSidebar({
  initialChats = [],
}: {
  initialChats?: ChatItem[];
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Listen for the toggle event from the Mobile Header (ChatWindow)
  useEffect(() => {
    const handleToggle = () => setIsMobileOpen((prev) => !prev);
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  // Auto-close the mobile sidebar when the user clicks a link (route changes)
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <TooltipProvider>
      {/* --- MOBILE OVERLAY BACKDROP --- */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* --- SIDEBAR CONTAINER --- */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out border-r border-border bg-card md:sticky md:top-0 md:h-screen md:self-start md:z-0",
          // Mobile visibility logic
          isMobileOpen ? "translate-x-0 w-[280px]" : "-translate-x-full md:translate-x-0",
          // Desktop width logic
          isCollapsed ? "md:w-[70px]" : "md:w-[280px]"
        )}
      >
        <div className="flex h-full min-h-0 flex-col bg-card/50 backdrop-blur-sm">
          
          {/* --- HEADER & TOGGLE BUTTON --- */}
          <div className={cn(
            "shrink-0 p-4 flex items-center",
            isCollapsed ? "md:justify-center" : "justify-between"
          )}>
            {(!isCollapsed || isMobileOpen) && (
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Chat History
              </span>
            )}
            
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:bg-accent rounded-lg" 
                  onClick={() => {
                    if (window.innerWidth < 768) setIsMobileOpen(false);
                    else setIsCollapsed(!isCollapsed);
                  }}
                >
                  {isMobileOpen ? (
                    <X className="h-4 w-4 md:hidden" />
                  ) : (
                    isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="md:block hidden">
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* --- NEW CHAT BUTTON --- */}
          <div className="shrink-0 px-4 pb-2">
            <Tooltip delayDuration={isCollapsed ? 0 : 500}>
              <TooltipTrigger asChild>
                <Button 
                  asChild 
                  className={cn(
                    "w-full rounded-xl border border-border shadow-sm hover:shadow-md transition-all h-11 bg-background hover:bg-accent text-foreground",
                    isCollapsed ? "md:px-0 md:justify-center" : "justify-start gap-3 px-3"
                  )}
                  variant="outline"
                >
                  <Link href="/">
                    <Plus className="h-4 w-4 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span className="font-semibold">New chat</span>}
                  </Link>
                </Button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">New chat</TooltipContent>}
            </Tooltip>
          </div>

          {/* --- SCROLLABLE HISTORY AREA --- */}
          <ScrollArea className="min-h-0 flex-1 px-2">
            <div className="p-2 pt-4">
              {(!isCollapsed || isMobileOpen) && (
                <div className="mb-3 flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  <History className="h-3 w-3" />
                  Recent
                </div>
              )}

              <div className="space-y-1">
                {initialChats.length === 0 ? (
                  !isCollapsed && (
                    <div className="px-2 py-4 text-xs text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                      No chats yet
                    </div>
                  )
                ) : (
                  initialChats.map((chat) => {
                    const isActive = pathname === `/chat/${chat._id}`;

                    return (
                      <Tooltip key={chat._id} delayDuration={isCollapsed ? 0 : 500}>
                        <TooltipTrigger asChild>
                          <Button
                            asChild
                            variant={isActive ? "secondary" : "ghost"}
                            className={cn(
                              "h-auto w-full rounded-xl py-3 transition-all",
                              isCollapsed ? "md:px-0 md:justify-center" : "px-3 justify-start",
                              isActive 
                                ? "bg-primary/10 hover:bg-primary/15 text-primary font-medium" 
                                : "hover:bg-accent text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Link href={`/chat/${chat._id}`}>
                              <MessageSquare className={cn(
                                "h-4 w-4 shrink-0",
                                (!isCollapsed || isMobileOpen) && "mr-3",
                                isActive ? "text-primary" : "text-muted-foreground"
                              )} />
                              {(!isCollapsed || isMobileOpen) && (
                                <span className="truncate text-left text-sm">
                                  {chat.title || "Untitled Conversation"}
                                </span>
                              )}
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        {(isCollapsed && !isMobileOpen) && (
                          <TooltipContent side="right">
                            {chat.title || "Untitled Conversation"}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </aside>
    </TooltipProvider>
  );
}