import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Send,
  BookOpen,
  Calculator,
  PenTool,
  Languages,
  Loader,
  AlertTriangle,
  Beaker,
  Sparkles,
  User,
  Bot,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DashboardSidebar from "@/components/DashboardSidebar";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUBJECTS = [
  { id: "general", name: "General", icon: BookOpen },
  { id: "math", name: "Math", icon: Calculator },
  { id: "writing", name: "Writing", icon: PenTool },
  { id: "languages", name: "Languages", icon: Languages },
  { id: "science", name: "Science", icon: Beaker },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const StudentInterface = () => {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessTeaching, setIsProcessTeaching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubject, setActiveSubject] = useState("general");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setIsLoading(true);
    setBlockedMessage(null);

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          subject: activeSubject,
          gradeLevel: "high-school",
          processTeaching: isProcessTeaching,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => null);

        if (errorData?.blocked) {
          setBlockedMessage(errorData.reason);
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
          toast({ title: "Prompt Blocked", description: errorData.reason, variant: "destructive" });
          return;
        }

        if (resp.status === 429) {
          toast({ title: "Rate Limited", description: "Too many requests. Please wait a moment.", variant: "destructive" });
          return;
        }
        if (resp.status === 402) {
          toast({ title: "Credits Required", description: "AI credits needed. Please add funds.", variant: "destructive" });
          return;
        }

        throw new Error(errorData?.error || "Failed to get AI response");
      }

      // Check if response is JSON (blocked) or SSE stream
      const contentType = resp.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await resp.json();
        if (data.blocked) {
          setBlockedMessage(data.reason);
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
          toast({ title: "Prompt Blocked", description: data.reason, variant: "destructive" });
          return;
        }
        // Non-streaming fallback
        assistantContent = data.response || data.choices?.[0]?.message?.content || "";
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: assistantContent, timestamp: new Date() },
        ]);
        return;
      }

      // SSE streaming
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      const assistantId = crypto.randomUUID();

      // Add empty assistant message
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
      ]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const snapshot = assistantContent;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m))
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const snapshot = assistantContent;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m))
              );
            }
          } catch { /* ignore */ }
        }
      }
    } catch (error: any) {
      console.error("AI Chat error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      // Remove the user message if no assistant response was generated
      if (!assistantContent) {
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setBlockedMessage(null);
  };

  const activeSubjectData = SUBJECTS.find((s) => s.id === activeSubject)!;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">AI Learning Assistant</h1>
              <p className="text-xs text-muted-foreground">
                {isProcessTeaching ? "Process Teaching Mode" : "Direct Answer Mode"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="process-mode"
                checked={isProcessTeaching}
                onCheckedChange={setIsProcessTeaching}
              />
              <Label htmlFor="process-mode" className="text-sm cursor-pointer">
                Process Teaching
              </Label>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearChat}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </header>

        {/* Subject tabs */}
        <div className="border-b border-border px-6 py-2 flex gap-2 shrink-0 bg-card overflow-x-auto">
          {SUBJECTS.map((subject) => {
            const Icon = subject.icon;
            const isActive = activeSubject === subject.id;
            return (
              <button
                key={subject.id}
                onClick={() => setActiveSubject(subject.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {subject.name}
              </button>
            );
          })}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {blockedMessage && (
            <Alert variant="destructive" className="mb-4 max-w-2xl mx-auto">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{blockedMessage}</AlertDescription>
            </Alert>
          )}

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Start Learning</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Ask any question about{" "}
                <span className="font-medium text-foreground">{activeSubjectData.name}</span>.
                {isProcessTeaching
                  ? " I'll guide you through the thinking process step by step."
                  : " I'll give you clear, detailed explanations."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {activeSubject === "math" && (
                  <>
                    <SuggestionChip onClick={(t) => setPrompt(t)} text="How do I solve quadratic equations?" />
                    <SuggestionChip onClick={(t) => setPrompt(t)} text="Explain the Pythagorean theorem" />
                  </>
                )}
                {activeSubject === "writing" && (
                  <>
                    <SuggestionChip onClick={(t) => setPrompt(t)} text="How do I write a strong thesis statement?" />
                    <SuggestionChip onClick={(t) => setPrompt(t)} text="Tips for structuring a persuasive essay" />
                  </>
                )}
                {activeSubject === "languages" && (
                  <>
                    <SuggestionChip onClick={(t) => setPrompt(t)} text="How do verb conjugations work in Spanish?" />
                    <SuggestionChip onClick={(t) => setPrompt(t)} text="Tips for learning vocabulary faster" />
                  </>
                )}
                {activeSubject === "science" && (
                  <>
                    <SuggestionChip onClick={(t) => setPrompt(t)} text="Explain photosynthesis step by step" />
                    <SuggestionChip onClick={(t) => setPrompt(t)} text="How does Newton's second law work?" />
                  </>
                )}
                {activeSubject === "general" && (
                  <>
                    <SuggestionChip onClick={(t) => setPrompt(t)} text="How can I study more effectively?" />
                    <SuggestionChip onClick={(t) => setPrompt(t)} text="Explain critical thinking skills" />
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                    <Loader className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-border px-6 py-4 bg-card shrink-0">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  placeholder={`Ask about ${activeSubjectData.name.toLowerCase()}...`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[44px] max-h-[160px] resize-none pr-4"
                  rows={1}
                />
              </div>
              <Button type="submit" disabled={isLoading || !prompt.trim()} size="icon" className="h-11 w-11 shrink-0">
                {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {isProcessTeaching
                ? "📚 Process Teaching ON — guiding you to discover answers"
                : "💡 Direct mode — clear explanations with answers"}
              {" · "}Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

function SuggestionChip({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="text-left text-sm px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground"
    >
      {text}
    </button>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-primary/10"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
      </div>
      <div
        className={`rounded-2xl px-4 py-3 max-w-[85%] ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5 prose-headings:my-2">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentInterface;
