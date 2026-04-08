"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Bot, User } from "lucide-react";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch("/api/ai/chat");
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : data.messages || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, sending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.reply || data.content || data.message || "No response received.",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please check your connection and try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-[calc(100vh-300px)] rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 200px)" }}>
      {/* Chat Header */}
      <Card className="border border-gray-200 rounded-xl shadow-sm mb-4">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-sky/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-brand-sky" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-brand-charcoal">ReputrAQ AI Assistant</h2>
            <p className="text-xs text-gray-500">Ask about your brand reputation, media mentions, sentiment trends, and more</p>
          </div>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {messages.length === 0 && !sending && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-brand-sky/10 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-brand-sky" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">Start a Conversation</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Ask me about your brand&apos;s reputation, sentiment analysis, media coverage, or risk assessment.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-brand-sky" : "bg-gray-200"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-600" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-brand-sky text-white rounded-2xl rounded-tr-md"
                      : "bg-gray-100 text-gray-800 rounded-2xl rounded-tl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Loading indicator while AI is responding */}
            {sending && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </Card>

      {/* Input Form */}
      <Card className="border border-gray-200 rounded-xl shadow-sm mt-4">
        <CardContent className="p-3">
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1"
              autoFocus
            />
            <Button
              type="submit"
              disabled={!input.trim() || sending}
              className="bg-brand-sky hover:bg-brand-sky/90 text-white shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
