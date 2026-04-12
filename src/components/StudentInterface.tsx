import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Brain, Send, BookOpen, Calculator, PenTool, Languages, Loader,
  AlertTriangle, Beaker, Sparkles, User, Bot, Trash2, History,
  FileText, X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DashboardSidebar from "@/components/DashboardSidebar";
import FeatureGate from "@/components/FeatureGate";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { useStudentPlan } from "@/hooks/useStudentPlan";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  subject: string;
  updated_at: string;
}

const SUBJECTS = [
  { id: "general", name: "General", icon: BookOpen },
  { id: "math", name: "Math", icon: Calculator },
  { id: "writing", name: "Writing", icon: PenTool },
  { id: "languages", name: "Languages", icon: Languages },
  { id: "science", name: "Science", icon: Beaker },
];

type ChatState = "idle" | "sending" | "error";

const StudentInterface = () => {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessTeaching, setIsProcessTeaching] = useState(true);
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [activeSubject, setActiveSubject] = useState("general");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [resourceContext, setResourceContext] = useState<{ title: string; description: string; url?: string } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { canUseTokens, tokensRemaining, plan } = useStudentPlan();
  const [searchParams, setSearchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Pick up resource context from URL params (from "Use in AI" button)
  useEffect(() => {
    const resTitle = searchParams.get("resourceTitle");
    const resDesc = searchParams.get("resourceDesc");
    const resUrl = searchParams.get("resourceUrl");
    if (resTitle) {
      setResourceContext({ title: resTitle, description: resDesc || "", url: resUrl || undefined });
      // Clean URL params
      searchParams.delete("resourceTitle");
      searchParams.delete("resourceDesc");
      searchParams.delete("resourceUrl");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load sessions on mount
  useEffect(() => {
    if (user) loadSessions();
  }, [user]);

  const loadSessions = async () => {
    const { data } = await (supabase as any)
      .from('ai_chat_sessions')
      .select('id, title, subject, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20);
    if (data) setSessions(data);
  };

  const loadSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    const { data } = await (supabase as any)
      .from('ai_chat_messages')
      .select('id, role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at),
      })));
    }
    const session = sessions.find(s => s.id === sessionId);
    if (session) setActiveSubject(session.subject || 'general');
    setShowHistory(false);
  };

  const createSession = async (): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await (supabase as any)
      .from('ai_chat_sessions')
      .insert({ user_id: user.id, subject: activeSubject, title: 'New Chat' })
      .select('id')
      .single();
    if (error || !data) {
      console.error('Failed to create session:', error);
      return null;
    }
    setCurrentSessionId(data.id);
    return data.id;
  };

  const saveMessage = async (sessionId: string, role: string, content: string, meta?: Record<string, unknown>) => {
    if (!user) return;
    await (supabase as any).from('ai_chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role,
      content,
      moderation_status: (meta?.moderationStatus as string) || 'approved',
      severity: (meta?.severity as string) || 'low',
      metadata: meta ? meta : {},
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || chatState === "sending") return;

    if (plan && !canUseTokens(1)) {
      toast({
        title: "Token limit reached",
        description: `You've used all ${plan.monthly_token_limit} tokens this month. Upgrade your plan for more.`,
        variant: "destructive",
      });
      return;
    }
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const sentPrompt = prompt.trim();
    setPrompt("");
    setChatState("sending");

    try {
      // Ensure session exists
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = await createSession();
        if (!sessionId) throw new Error("Could not create chat session");
      }

      // Save user message
      await saveMessage(sessionId, 'user', sentPrompt);

      // Update session title on first message
      if (messages.length === 0) {
        const title = sentPrompt.length > 50 ? sentPrompt.substring(0, 50) + '...' : sentPrompt;
        await (supabase as any).from('ai_chat_sessions').update({ title }).eq('id', sessionId);
      }

      // Call AI
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          prompt: sentPrompt,
          subject: activeSubject,
          gradeLevel: "high-school",
          processTeaching: isProcessTeaching,
          sessionId,
          resourceContext: resourceContext
            ? `Title: ${resourceContext.title}\nDescription: ${resourceContext.description}${resourceContext.url ? `\nURL: ${resourceContext.url}` : ""}`
            : null,
        },
      });

      if (error) throw new Error(error.message || "Failed to get AI response");

      // Extract reply with guaranteed fallback
      const reply = data?.reply || data?.response || "I'm sorry, I couldn't generate a response. Please try again.";
      const meta = data?.meta || {};

      if (data?.error && !data?.success) {
        toast({ title: "Warning", description: data.error, variant: "destructive" });
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(sessionId, 'assistant', reply, meta);
      setChatState("idle");
      loadSessions(); // refresh sidebar
    } catch (error: any) {
      console.error("AI Chat error:", error);

      // Insert fallback assistant message so the user sees something
      const fallbackMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "⚠️ Something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, fallbackMsg]);

      toast({
        title: "Error",
        description: error.message || "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      setChatState("error");
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
    setCurrentSessionId(null);
    setChatState("idle");
  };

  const activeSubjectData = SUBJECTS.find(s => s.id === activeSubject)!;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <FeatureGate feature="aiAssistant" className="flex-1">
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
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
              <History className="h-4 w-4 mr-1" /> History
            </Button>
            <div className="flex items-center gap-2">
              <Switch id="process-mode" checked={isProcessTeaching} onCheckedChange={setIsProcessTeaching} />
              <Label htmlFor="process-mode" className="text-sm cursor-pointer">Process Teaching</Label>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearChat}>
                <Trash2 className="h-4 w-4 mr-1" /> New Chat
              </Button>
            )}
          </div>
        </header>

        {/* Subject tabs */}
        <div className="border-b border-border px-6 py-2 flex gap-2 shrink-0 bg-card overflow-x-auto">
          {SUBJECTS.map(subject => {
            const Icon = subject.icon;
            const isActive = activeSubject === subject.id;
            return (
              <button key={subject.id} onClick={() => setActiveSubject(subject.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}>
                <Icon className="h-3.5 w-3.5" />{subject.name}
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex min-h-0">
          {/* History panel */}
          {showHistory && (
            <div className="w-64 border-r border-border bg-card overflow-y-auto p-3 space-y-1">
              <h3 className="text-sm font-semibold mb-2">Chat History</h3>
              {sessions.length === 0 && <p className="text-xs text-muted-foreground">No previous chats</p>}
              {sessions.map(s => (
                <button key={s.id} onClick={() => loadSession(s.id)}
                  className={`w-full text-left text-sm p-2 rounded hover:bg-accent truncate ${currentSessionId === s.id ? 'bg-accent' : ''}`}>
                  {s.title || 'Untitled'}
                </button>
              ))}
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Start Learning</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Ask any question about <span className="font-medium text-foreground">{activeSubjectData.name}</span>.
                  {isProcessTeaching
                    ? " I'll guide you through the thinking process step by step."
                    : " I'll give you clear, detailed explanations."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  <SuggestionChip onClick={t => setPrompt(t)} text="How can I study more effectively?" />
                  <SuggestionChip onClick={t => setPrompt(t)} text="Explain critical thinking skills" />
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
                {chatState === "sending" && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                      <Loader className="h-4 w-4 animate-spin" /> Thinking...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-border px-6 py-4 bg-card shrink-0">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            {/* Resource context indicator */}
            {resourceContext && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1 truncate">
                  Referencing: <span className="font-medium">{resourceContext.title}</span>
                </span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setResourceContext(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Textarea
                  placeholder={resourceContext ? `Ask about "${resourceContext.title}"...` : `Ask about ${activeSubjectData.name.toLowerCase()}...`}
                  value={prompt} onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[44px] max-h-[160px] resize-none" rows={1}
                />
              </div>
              <Button type="submit" disabled={chatState === "sending" || !prompt.trim()} size="icon" className="h-11 w-11 shrink-0">
                {chatState === "sending" ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {isProcessTeaching ? "📚 Process Teaching ON" : "💡 Direct mode"} · Enter to send, Shift+Enter for new line
            </p>
          </form>
        </div>
      </div>
      </FeatureGate>
    </div>
  );
};

function SuggestionChip({ text, onClick }: { text: string; onClick: (t: string) => void }) {
  return (
    <button onClick={() => onClick(text)}
      className="text-left text-sm px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground">
      {text}
    </button>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-primary text-primary-foreground" : "bg-primary/10"}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
      </div>
      <div className={`rounded-2xl px-4 py-3 max-w-[85%] ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
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
