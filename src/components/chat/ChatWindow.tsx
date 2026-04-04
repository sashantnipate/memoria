"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm'; // Ensure this is installed: npm install remark-gfm
import { askEmailAgent } from "@/lib/actions/chat.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Plus, Bot } from "lucide-react";
import Link from "next/link";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatWindow({
  userId,
  initialMessages = [],
  chatId = null,
}: {
  userId: string;
  initialMessages?: Message[];
  chatId?: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await askEmailAgent(text, userId, chatId);
      if (result && result.response) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
        if (!chatId && result.chatId) {
          router.push(`/chat/${result.chatId}`);
        }
      }
    } catch (error) {
      console.error("Frontend Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-background relative overflow-hidden">
      
      {/* --- MOBILE HEADER --- */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
          <Bot className="h-4 w-4" />
          Memoria
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full h-7 px-3 text-[10px]">
          <Link href="/"><Plus className="h-3 w-3 mr-1" /> New</Link>
        </Button>
      </div>

      {/* --- MAIN CHAT STREAM --- */}
      <div className="flex-1 overflow-y-auto px-2 md:px-6 custom-scrollbar">
        {/* max-w-4xl allows for wider cards; pt-6 reduces top margin */}
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col pb-44 pt-6">
          
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-20 opacity-40">
              <h2 className="text-2xl font-light tracking-tight">What can I help with?</h2>
            </div>
          ) : (
            messages.map((m, i) => (
              <div 
                key={i} 
                className={`flex w-full mb-4 animate-in fade-in slide-in-from-bottom-1 duration-300 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div className={`shadow-sm ${
                  m.role === "user"
                    ? "max-w-[80%] bg-muted/80 px-4 py-2.5 rounded-2xl rounded-tr-none text-[13px] text-foreground border border-border/50"
                    // Assistant: max-w-[95%] for large cards, reduced padding, small text
                    : "max-w-[95%] w-full bg-card border border-border rounded-xl px-5 py-4 text-[14px] leading-relaxed"
                }`}>
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    // prose-sm lowers the text size significantly
                    <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-p:leading-6 prose-headings:mb-2 prose-p:my-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex w-full mb-8 justify-start">
              <div className="flex items-center gap-1 px-2 py-2 bg-muted/30 rounded-full">
                <span className="h-1.5 w-1.5 bg-foreground/30 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-1.5 w-1.5 bg-foreground/30 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-1.5 w-1.5 bg-foreground/30 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          
          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {/* --- FLOATING INPUT PILL --- */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none bg-gradient-to-t from-background via-background/90 to-transparent pt-10 pb-4">
        <div className="mx-auto w-full max-w-3xl px-4 pointer-events-auto">
          <div className="relative flex items-center rounded-2xl border border-input bg-card/80 backdrop-blur-md shadow-xl focus-within:border-primary/30 transition-all px-2 py-1.5">
            
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full shrink-0 text-muted-foreground ml-1">
              <Plus className="h-4 w-4" />
            </Button>

            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder="Ask anything"
              className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent px-3 py-2.5 shadow-none focus-visible:ring-0 text-[14px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className={`h-9 w-9 shrink-0 rounded-xl transition-all duration-300 mr-1 ${
                input.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground opacity-40"
              }`}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/50 italic">
            Memoria Assistant &bull; AI may vary
          </p>
        </div>
      </div>
    </div>
  );
} 