'use client';
import { AppSidebar } from "@/components/side-bar/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import Header from "@/components/side-bar/app-header"
import { Toaster } from "sonner";

const Layout = ({children} : {children: React.ReactNode;}) => {
    return (
        <SidebarProvider
        >
            <AppSidebar />
            
            <SidebarInset className="bg-accent/20 flex flex-col">
                <Header />
                <main className="flex-1 overflow-hidden flex flex-col h-full">
                    {children}
                    <Toaster/>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default Layout;