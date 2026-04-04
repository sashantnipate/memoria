import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectToDB } from "@/lib/database/db";
import Chat from "@/lib/database/models/chat.model";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";

export default async function SavedChatPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectToDB();

  const chatSessions = await Chat.find({ userId }).sort({ updatedAt: -1 });
  
  const currentChat = await Chat.findById(id);
  
  if (!currentChat || currentChat.userId !== userId) {
    redirect("/"); 
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <aside className="w-[280px] border-r border-border hidden md:block bg-card/30">
        <ChatSidebar initialChats={JSON.parse(JSON.stringify(chatSessions))} />
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <ChatWindow 
          userId={userId} 
          chatId={id} 
          initialMessages={JSON.parse(JSON.stringify(currentChat.messages))} 
        />
      </main>
    </div>
  );
}