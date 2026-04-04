import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import { connectToDB } from "@/lib/database/db";
import Chat from "@/lib/database/models/chat.model";

export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectToDB();

  const chatSessions = await Chat.find({ userId })
    .select("title _id updatedAt")
    .sort({ updatedAt: -1 });

  return (
    <div className="h-full w-full overflow-hidden bg-background text-foreground">
      <div className="flex h-full w-full">
        
        {/* SIDEBAR: h-full ensures it stretches top to bottom */}
        <aside className="hidden h-full w-[280px] shrink-0 border-r border-border md:block bg-card/30">
          <ChatSidebar initialChats={JSON.parse(JSON.stringify(chatSessions))} />
        </aside>

        {/* MAIN: flex-1 takes the rest of the space, h-full locks its height */}
        <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden relative">
          <ChatWindow userId={userId} initialMessages={[]} chatId={null} />
        </main>
        
      </div>
    </div>
  );
}