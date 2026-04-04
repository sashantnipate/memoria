"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Bot, SquareTerminal, HistoryIcon, Calendar } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";

const menuItems = [
  {
    title: "Main",
    items: [
      { title: "Playground", icon: SquareTerminal, url: "/" },
      { title: "Agents", icon: Bot, url: "/agents" },
      { title: "Calendar", icon: Calendar, url: "/calendar" },
      { title: "Executions", icon: HistoryIcon, url: "/executions" },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { user } = useUser();

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-sidebar-border bg-sidebar">

      {/* --- HEADER --- */}
      <SidebarHeader className="border-b border-sidebar-border/50 p-0 h-14 flex items-center justify-center group-data-[collapsible=icon]:justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-14 px-3 rounded-none hover:bg-transparent bg-transparent group-data-[collapsible=icon]:!size-auto group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!h-14 group-data-[collapsible=icon]:!flex group-data-[collapsible=icon]:!items-center group-data-[collapsible=icon]:!justify-center"
            >
              <Link href="/" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                <Bot className="!size-6 text-sidebar-foreground/80 shrink-0" />
                <span className="text-xl tracking-tight text-sidebar-foreground font-medium group-data-[collapsible=icon]:hidden">
                  Memoria
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* --- CONTENT --- */}
      <SidebarContent className="px-2 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2">
        {menuItems.map((group) => (
          <SidebarGroup key={group.title} className="p-0 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:py-2">
            <SidebarGroupContent className="group-data-[collapsible=icon]:w-full">
              <SidebarMenu className="space-y-1 group-data-[collapsible=icon]:space-y-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2">
                {group.items.map((item) => {
                  const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);

                  return (
                    <SidebarMenuItem
                      key={item.url}
                      className="group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!mb-0"
                    >
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        className={`
                          h-11 rounded-xl transition-all duration-200 px-3
                          group-data-[collapsible=icon]:!rounded-xl
                          ${isActive
                            ? "!bg-sidebar-primary !text-sidebar-primary-foreground shadow-md"
                            : "!bg-transparent text-sidebar-foreground/70 hover:!bg-sidebar-accent hover:!text-sidebar-accent-foreground"
                          }
                        `}
                      >
                        <Link
                          href={item.url}
                          className="flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                        >
                          <item.icon className="!size-5 shrink-0" />
                          <span className="font-medium text-[15px] group-data-[collapsible=icon]:hidden">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* --- FOOTER --- */}
      <SidebarFooter className="border-t border-sidebar-border/50 p-3">
        {isCollapsed ? (
          // Collapsed: show only the avatar
          <div className="flex items-center justify-center">
            <UserButton />
          </div>
        ) : (
          // Expanded: show avatar + name + username/email
          <div className="flex items-center gap-3 px-1 py-1 rounded-xl hover:bg-sidebar-accent transition-colors cursor-default">
            <UserButton />
            {user && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-sidebar-foreground truncate leading-tight">
                  {user.fullName || user.firstName || "User"}
                </span>
                <span className="text-[11px] text-sidebar-foreground/50 truncate leading-tight">
                  {user.username
                    ? `@${user.username}`
                    : user.primaryEmailAddress?.emailAddress}
                </span>
              </div>
            )}
          </div>
        )}
      </SidebarFooter>

    </Sidebar>
  );
}