"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Clock3 } from "lucide-react";

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

  return (
    <div className="flex h-full min-h-0 flex-col bg-card/50 backdrop-blur-sm">
      {/* Modern sticky header for the New Chat button */}
      <div className="shrink-0 p-4 pb-2">
        <Button 
          asChild 
          className="w-full justify-start gap-3 rounded-xl border border-border shadow-sm hover:shadow-md transition-all h-11 bg-background hover:bg-accent text-foreground"
          variant="outline"
        >
          <Link href="/">
            <Plus className="h-4 w-4" />
            <span className="font-semibold">New chat</span>
          </Link>
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-2">
        <div className="p-2 pt-4">
          <div className="mb-3 flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Recent History
          </div>

          <div className="space-y-1">
            {initialChats.length === 0 ? (
              <div className="px-2 py-4 text-sm text-center text-muted-foreground bg-muted/50 rounded-xl border border-dashed">
                No chats yet
              </div>
            ) : (
              initialChats.map((chat) => {
                const isActive = pathname === `/chat/${chat._id}`;

                return (
                  <Button
                    key={chat._id}
                    asChild
                    variant={isActive ? "secondary" : "ghost"}
                    className={`h-auto w-full justify-start rounded-xl px-3 py-3 transition-all ${
                      isActive 
                        ? "bg-primary/10 hover:bg-primary/15 text-primary font-medium" 
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Link href={`/chat/${chat._id}`}>
                      <MessageSquare className={`mr-3 h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="truncate text-left text-sm">
                        {chat.title || "Untitled Conversation"}
                      </span>
                    </Link>
                  </Button>
                );
              })
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}