"use client"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  HistoryIcon,
  Calendar 
} from "lucide-react"
import { UserButton } from "@clerk/nextjs";

const menuItems = [
    {
        title: "Main",
        items : [
            {
                title: "Playground",
                icon: SquareTerminal,
                url: "/"
            },
            {
                title: "Calender",
                icon: Calendar,
                url: "/calender"
            },
            {
                title: "Executions",
                icon: HistoryIcon,
                url: "/executions",
            }
        ]
    }
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  
    const router = useRouter();
    const pathname = usePathname();
    return(
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild className="gap-x-4 h-10 px-4">
                        <Link href ="/" prefetch>
                            <span className="font-semibold text-sm">Memoria</span>
                        </Link>

                    </SidebarMenuButton>
                </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {menuItems.map((group) => (
                    <SidebarGroup key = {group.title}>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
                                    const active = pathname === item.url;

                                    return (
                                        <SidebarMenuItem key={item.url}>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            isActive={active}
                                            asChild
                                            className="gap-x-4 h-10 px-4 transition-all"
                                        >
                                            <Link href={item.url}>
                                            <item.icon className={`size-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <span className={active ? "font-medium" : ""}>{item.title}</span>
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
            <SidebarFooter>
                <UserButton/>
            </SidebarFooter>
        </Sidebar>
    );
  
}
