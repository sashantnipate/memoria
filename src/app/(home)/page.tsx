'use client';
import { AppSidebar } from "@/components/side-bar/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getRecentEmails } from "@/lib/actions/gmail.actions";
export default function Page() {
    const handleFetch = async () => {
    const emails = await getRecentEmails();
    console.log(emails);
  };

  return <button onClick={handleFetch}>Load My Emails</button>
  
}
