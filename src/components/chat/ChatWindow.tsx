"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { askEmailAgent } from "@/lib/actions/chat.actions";
import { getSyncStatus } from "@/lib/actions/user.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Plus, Bot, History, Sparkles } from "lucide-react";
import Link from "next/link";
import { ChatSyncCard } from "@/components/chat/ChatSyncCard";

const GREETING_RE = /^(hi|hello|hey|howdy|hiya|yo|sup)\b/i;
const SYNC_CARD_KEY = "memoria_show_sync_card";

import AgentForm from "@/components/create-agent/create-form"; 

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
  const [showSyncCard, setShowSyncCard] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = messages.length === 0 && !isLoading && !showSyncCard;

  useEffect(() => {
    if (sessionStorage.getItem(SYNC_CARD_KEY) === "1") {
      setShowSyncCard(true);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, showSyncCard]);

  const triggerSyncCard = () => {
    setShowSyncCard(true);
    sessionStorage.setItem(SYNC_CARD_KEY, "1");
  };

  const dismissSyncCard = () => {
    setShowSyncCard(false);
    sessionStorage.removeItem(SYNC_CARD_KEY);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const isGreeting = GREETING_RE.test(text);

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const syncCheckPromise = isGreeting && !showSyncCard
        ? getSyncStatus()
            .then((status) => {
              if (status && !status.isInitialSyncDone) triggerSyncCard();
            })
            .catch(() => {})
        : null;

      const [result] = await Promise.all([
        askEmailAgent(text, userId, chatId),
        syncCheckPromise,
      ]);

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

  const InputBox = (
    <div className="relative flex items-center border border-input bg-card/80 backdrop-blur-md shadow-xl focus-within:border-primary/30 transition-all px-3 py-2" style={{ borderRadius: '36px' }}>
      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0 text-muted-foreground ml-1">
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
        placeholder="Ask anything…"
        className="min-h-[44px] max-h-32 resize-none border-0 bg-transparent px-3 py-2.5 shadow-none focus-visible:ring-0 text-[14px]"
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
        className={`h-10 w-10 shrink-0 rounded-3xl transition-all duration-300 mr-1 ${input.trim()
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground opacity-40"
          }`}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    // Fixed
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">

      {/* --- MOBILE HEADER --- */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur-md z-10 shrink-0 w-full absolute top-0 left-0 right-0">
        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
          <Bot className="h-4 w-4" />
          Memoria
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full h-7 px-3 text-[10px]">
            <Link href="/"><Plus className="h-3 w-3 mr-1" /> New</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-muted-foreground"
            onClick={() => window.dispatchEvent(new Event("toggle-sidebar"))}
            aria-label="Toggle sidebar"
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ✅ Inner column: takes full height, clips overflow */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">

        {isEmpty ? (
          /* ============================================================
             EMPTY STATE
          ============================================================ */
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 overflow-hidden">
            <div className="mb-8 flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                How can I help you?
              </h1>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ask me anything about your emails, tasks, or memories.
              </p>
            </div>
            <div className="w-full max-w-2xl">
              {InputBox}
              <p className="mt-2 text-center text-[10px] text-muted-foreground/50 italic">
                Memoria Assistant &bull; AI may vary
              </p>
            </div>
          </div>

        ) : (
          /* ============================================================
             ACTIVE STATE
          ============================================================ */
          <>
            {/* ✅ This div scrolls, nothing else does */}
            <div className="flex-1 overflow-y-auto px-2 md:px-6 custom-scrollbar">
              <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col pb-44 pt-6">

                {messages.map((m, i) => {
                  let isGenerativeUI = false;
                  let textPart = m.content;
                  let draftedAgentData = null;

                  if (m.role === "assistant" && m.content.includes("[RENDER_AGENT_FORM]")) {
                    isGenerativeUI = true;
                    const parts = m.content.split("[RENDER_AGENT_FORM]");
                    textPart = parts[0];
                    
                    try {
                      draftedAgentData = JSON.parse(parts[1]);
                    } catch (e) {
                      console.error("Failed to parse agent draft payload", e);
                    }
                  }

                  return (
                    <div
                      key={i}
                      className={`flex w-full mb-4 animate-in fade-in slide-in-from-bottom-1 duration-300 ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`shadow-sm ${
                          m.role === "user"
                            ? "max-w-[80%] bg-muted/80 px-4 py-2.5 rounded-2xl rounded-tr-none text-[13px] text-foreground border border-border/50"
                            : "max-w-[95%] w-full bg-card border border-border rounded-xl px-5 py-4 text-[14px] leading-relaxed"
                        }`}
                      >
                        {m.role === "user" ? (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        ) : (
                          <div className="flex flex-col w-full">
                            {textPart && (
                              <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-p:leading-6 prose-headings:mb-2 prose-p:my-1">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{textPart}</ReactMarkdown>
                              </div>
                            )}

                            {isGenerativeUI && draftedAgentData && (
                              <div className="mt-4 pt-2 border-t border-border/40">
                                <AgentForm 
                                  initialData={draftedAgentData} 
                                  onSuccess={() => {
                                    console.log("Agent saved successfully from Generative UI!");
                                  }} 
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex w-full mb-8 justify-start">
                    <div className="flex items-center gap-1 px-3 py-2.5 bg-card border border-border rounded-xl">
                      <span className="h-1.5 w-1.5 bg-foreground/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 bg-foreground/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 bg-foreground/30 rounded-full animate-bounce" />
                    </div>
                  </div>
                )}

                <div ref={bottomRef} className="h-4" />
              </div>
            </div>

            {/* Floating bottom input */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none bg-gradient-to-t from-background via-background/90 to-transparent pt-10 pb-4">
              <div className="mx-auto w-full max-w-3xl px-4 pointer-events-auto">
                {InputBox}
                <p className="mt-2 text-center text-[10px] text-muted-foreground/50 italic">
                  Memoria Assistant &bull; AI may vary
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}