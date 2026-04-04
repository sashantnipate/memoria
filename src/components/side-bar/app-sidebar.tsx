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
  SidebarMenuItem 
} from "@/components/ui/sidebar";
import { Bot, SquareTerminal, HistoryIcon, Calendar } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

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

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="h-14 px-2 hover:bg-transparent bg-transparent group-data-[collapsible=icon]:justify-center"
            >
              <Link href="/" className="flex items-center gap-3">
                <Bot className="!size-6 text-sidebar-foreground/80 shrink-0" />
                <span className="text-xl tracking-tight text-sidebar-foreground font-medium group-data-[collapsible=icon]:hidden">
                  Memoria
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-4">
        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-3">
                {group.items.map((item) => {
                  const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        className={`
                          h-12 rounded-xl transition-all duration-200
                          /* CENTER ICONS WHEN COLLAPSED */
                          group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center
                          ${isActive 
                            ? "!bg-sidebar-primary !text-sidebar-primary-foreground shadow-md" 
                            : "!bg-transparent text-sidebar-foreground/70 hover:!bg-sidebar-accent hover:!text-sidebar-accent-foreground"
                          }
                        `}
                      >
                        <Link href={item.url} className="flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center">
                          {/* LARGE ICON FORCED */}
                          <item.icon className="!size-6 shrink-0" />
                          <span className="font-medium text-[15 px] group-data-[collapsible=icon]:hidden">
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

      <SidebarFooter className="p-4 border-t border-sidebar-border/50 flex items-center justify-center">
        <div className="group-data-[collapsible=icon]:p-0">
          <UserButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}