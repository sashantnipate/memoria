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
      <SidebarHeader className="border-b border-sidebar-border/50 p-0 h-16 flex items-center justify-center group-data-[collapsible=icon]:justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-16 px-3 rounded-none hover:bg-transparent bg-transparent group-data-[collapsible=icon]:!size-auto group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!h-16 group-data-[collapsible=icon]:!flex group-data-[collapsible=icon]:!items-center group-data-[collapsible=icon]:!justify-center"
            >
              <Link href="/" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                {/* Inline logo SVG — uses currentColor so it inherits sidebar-foreground */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="60 30 480 480"
                  className="!size-8 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                >
                  <defs>
                    <style>{`
                      @keyframes sb-signal-flow {
                        0%   { stroke-dashoffset: 900; opacity: 0; }
                        6%   { opacity: 0.9; }
                        92%  { opacity: 0.9; }
                        100% { stroke-dashoffset: 0; opacity: 0; }
                      }
                      @keyframes sb-signal-rev {
                        0%   { stroke-dashoffset: -900; opacity: 0; }
                        6%   { opacity: 0.9; }
                        92%  { opacity: 0.9; }
                        100% { stroke-dashoffset: 0; opacity: 0; }
                      }
                      .sb-pulse {
                        fill: none;
                        stroke: #ffffff;
                        stroke-linecap: round;
                        opacity: 0;
                      }
                      .sb-p1 { stroke-dasharray: 50 850; animation: sb-signal-flow 4.0s ease-in-out infinite 0.0s; }
                      .sb-p2 { stroke-dasharray: 45 855; animation: sb-signal-flow 4.5s ease-in-out infinite 0.8s; }
                      .sb-p3 { stroke-dasharray: 50 850; animation: sb-signal-flow 3.8s ease-in-out infinite 1.6s; }
                      .sb-p4 { stroke-dasharray: 45 855; animation: sb-signal-rev  4.2s ease-in-out infinite 2.4s; }
                      .sb-p5 { stroke-dasharray: 50 850; animation: sb-signal-flow 5.0s ease-in-out infinite 0.4s; }
                      .sb-p6 { stroke-dasharray: 45 855; animation: sb-signal-rev  3.6s ease-in-out infinite 1.2s; }
                      .sb-p7 { stroke-dasharray: 30 200; animation: sb-signal-flow 3.2s ease-in-out infinite 0.2s; }
                      .sb-p8 { stroke-dasharray: 30 200; animation: sb-signal-rev  3.2s ease-in-out infinite 1.8s; }
                    `}</style>
                  </defs>

                  {/* Left brain lobe */}
                  <path d="M300,50 L300,80 L220,80 L220,110 L180,110 L180,150 L150,150 L150,200 L180,200 L180,230 L155,230 L155,270"/>
                  <path d="M155,270 L155,310 L180,310 L180,340 L150,340 L150,390 L180,390 L180,420 L220,420 L220,450 L300,450 L300,420"/>
                  <path d="M220,110 L250,110 L250,140 L205,140 L205,185 L175,185 L175,220 L205,220 L205,270"/>
                  <path d="M250,140 L272,140 L272,170 L235,170 L235,215 L272,215 L272,270"/>
                  <path d="M205,270 L205,315 L175,315 L175,350 L205,350 L205,390 L250,390 L250,420"/>
                  <path d="M272,270 L272,320 L235,320 L235,360 L272,360 L272,390 L250,390"/>
                  <path d="M150,200 L175,200"/>
                  <path d="M150,340 L175,340"/>
                  {/* Right brain lobe */}
                  <path d="M300,50 L300,80 L380,80 L380,110 L420,110 L420,150 L450,150 L450,200 L420,200 L420,230 L445,230 L445,270"/>
                  <path d="M445,270 L445,310 L420,310 L420,340 L450,340 L450,390 L420,390 L420,420 L380,420 L380,450 L300,450 L300,420"/>
                  <path d="M380,110 L350,110 L350,140 L395,140 L395,185 L425,185 L425,220 L395,220 L395,270"/>
                  <path d="M350,140 L328,140 L328,170 L365,170 L365,215 L328,215 L328,270"/>
                  <path d="M395,270 L395,315 L425,315 L425,350 L395,350 L395,390 L350,390 L350,420"/>
                  <path d="M328,270 L328,320 L365,320 L365,360 L328,360 L328,390 L350,390"/>
                  <path d="M450,200 L425,200"/>
                  <path d="M450,340 L425,340"/>
                  {/* Center spine */}
                  <path strokeWidth="10" d="M300,80 L300,196"/>
                  <path strokeWidth="10" d="M300,344 L300,450"/>
                  {/* Chip stub connections */}
                  <path strokeWidth="7" d="M300,226 L300,246"/>
                  <path strokeWidth="7" d="M300,294 L300,314"/>
                  <path strokeWidth="7" d="M246,270 L266,270"/>
                  <path strokeWidth="7" d="M334,270 L354,270"/>
                  {/* Chip body */}
                  <rect x="256" y="226" width="88" height="88" rx="4" strokeWidth="2" fill="currentColor" fillOpacity="0.15"/>
                  {/* M letter on chip */}
                  <text
                    x="300" y="278"
                    fontFamily="'Courier New', monospace"
                    fontSize="28" fontWeight="700"
                    textAnchor="middle" dominantBaseline="central"
                    fill="currentColor" stroke="none" opacity="0.7"
                  >M</text>

                  {/* ── White signal-pulse overlays ── */}
                  {/* Left outer top */}
                  <path className="sb-pulse sb-p1" strokeWidth="3.5"
                    d="M300,50 L300,80 L220,80 L220,110 L180,110 L180,150 L150,150 L150,200 L180,200 L180,230 L155,230 L155,270"/>
                  {/* Left inner */}
                  <path className="sb-pulse sb-p2" strokeWidth="3"
                    d="M220,110 L250,110 L250,140 L205,140 L205,185 L175,185 L175,220 L205,220 L205,270 L205,315 L175,315 L175,350 L205,350 L205,390 L250,390 L250,420"/>
                  {/* Right outer top */}
                  <path className="sb-pulse sb-p3" strokeWidth="3.5"
                    d="M300,50 L300,80 L380,80 L380,110 L420,110 L420,150 L450,150 L450,200 L420,200 L420,230 L445,230 L445,270"/>
                  {/* Right inner */}
                  <path className="sb-pulse sb-p4" strokeWidth="3"
                    d="M380,110 L350,110 L350,140 L395,140 L395,185 L425,185 L425,220 L395,220 L395,270 L395,315 L425,315 L425,350 L395,350 L395,390 L350,390 L350,420"/>
                  {/* Left outer bottom */}
                  <path className="sb-pulse sb-p5" strokeWidth="3.5"
                    d="M155,270 L155,310 L180,310 L180,340 L150,340 L150,390 L180,390 L180,420 L220,420 L220,450 L300,450 L300,420"/>
                  {/* Right outer bottom */}
                  <path className="sb-pulse sb-p6" strokeWidth="3.5"
                    d="M445,270 L445,310 L420,310 L420,340 L450,340 L450,390 L420,390 L420,420 L380,420 L380,450 L300,450 L300,420"/>
                  {/* Center spine pulses */}
                  <path className="sb-pulse sb-p7" stroke="#ffffff" strokeWidth="3"
                    d="M300,80 L300,196"/>
                  <path className="sb-pulse sb-p8" stroke="#ffffff" strokeWidth="3"
                    d="M300,344 L300,450"/>
                </svg>
                <span className="text-[22px] tracking-tight text-sidebar-foreground font-semibold group-data-[collapsible=icon]:hidden">
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
                            : "!bg-transparent !text-sidebar-foreground/70 hover:!bg-sidebar-accent hover:!text-sidebar-accent-foreground"
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
          <div className="flex items-center justify-center">
            <UserButton />
          </div>
        ) : (
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