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
    <div className="h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="flex h-full w-full">
        <ChatSidebar initialChats={JSON.parse(JSON.stringify(chatSessions))} />
        <main className="flex flex-col h-full min-w-0 flex-1 overflow-hidden">
          <ChatWindow userId={userId} initialMessages={[]} chatId={null} />
        </main>
      </div>
    </div>
  );
}