import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp, Beaker, BookOpen, Calculator, Check, ChevronDown, Copy, FileText, Languages, LayoutGrid,
  Lightbulb, Loader2, LogOut, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, PenTool, Plus,
  Route, Search, Sparkles, Users, X, Briefcase,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import FeatureGate from "@/components/FeatureGate";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useStudentPlan } from "@/hooks/useStudentPlan";
import { useSchoolCheck } from "@/hooks/useSchoolCheck";
import { cn } from "@/lib/utils";
import { isToday, isYesterday, differenceInCalendarDays } from "date-fns";
import { Wordmark } from "@/components/landing/LandingNav";

// The chat tables aren't in the generated Supabase types yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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

const STARTERS = [
  { title: "Plan my essay", body: "Help me build an argument and an outline before I start writing.", subject: "writing", icon: PenTool },
  { title: "Explain a concept", body: "Break a topic I'm stuck on into steps I can follow.", subject: "general", icon: Lightbulb },
  { title: "Check my working", body: "Look at how I solved a problem and show me where it went wrong.", subject: "math", icon: Calculator },
  { title: "Quiz me", body: "Ask me questions to test what I know before a test.", subject: "science", icon: Sparkles },
];

type ChatState = "idle" | "sending" | "error";

const groupSessions = (sessions: ChatSession[]) => {
  const groups: { label: string; items: ChatSession[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];
  sessions.forEach((s) => {
    const d = new Date(s.updated_at);
    if (isToday(d)) groups[0].items.push(s);
    else if (isYesterday(d)) groups[1].items.push(s);
    else if (differenceInCalendarDays(new Date(), d) <= 7) groups[2].items.push(s);
    else groups[3].items.push(s);
  });
  return groups.filter((g) => g.items.length > 0);
};

const RefynMark: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={cn(
      "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-lp-blue to-[#1E3A8A] text-[13px] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(59,130,246,0.8)]",
      className,
    )}
  >
    R<span className="text-lp-cyan">.</span>
  </span>
);

const StudentInterface = () => {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessTeaching, setIsProcessTeaching] = useState(true);
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [activeSubject, setActiveSubject] = useState("general");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [resourceContext, setResourceContext] = useState<{ title: string; description: string; url?: string } | null>(null);
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const { canUseTokens, tokensRemaining, plan } = useStudentPlan();
  const [searchParams, setSearchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const isInSchool = useSchoolCheck();

  // Layout-only state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("refyn-chat-sidebar") === "collapsed"; } catch { return false; }
  });
  const [chatSearch, setChatSearch] = useState("");
  const [subjectMenu, setSubjectMenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  useEffect(() => {
    try { localStorage.setItem("refyn-chat-sidebar", collapsed ? "collapsed" : "open"); } catch { /* storage unavailable */ }
  }, [collapsed]);

  // Grow the composer with its content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [prompt]);

  const loadSessions = async () => {
    if (!user) return;
    const { data } = await db
      .from('ai_chat_sessions')
      .select('id, title, subject, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (data) setSessions(data);
  };

  const loadSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    const { data } = await db
      .from('ai_chat_messages')
      .select('id, role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data.map((m: { id: string; role: string; content: string; created_at: string }) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at),
      })));
    }
    const session = sessions.find(s => s.id === sessionId);
    if (session) setActiveSubject(session.subject || 'general');
    setDrawerOpen(false);
  };

  const createSession = async (): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await db
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
    await db.from('ai_chat_messages').insert({
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
        await db.from('ai_chat_sessions').update({ title }).eq('id', sessionId);
      }

      // Build conversation history (prior turns) to send for context
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      // Call AI
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          prompt: sentPrompt,
          subject: activeSubject,
          gradeLevel: "high-school",
          processTeaching: isProcessTeaching,
          sessionId,
          history,
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
    } catch (error: unknown) {
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
        description: (error as { message?: string } | null)?.message || "Failed to get AI response. Please try again.",
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
    setDrawerOpen(false);
  };

  const applyStarter = (text: string, subject: string) => {
    setActiveSubject(subject);
    setPrompt(text);
    textareaRef.current?.focus();
  };

  const copyMessage = async (m: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const activeSubjectData = SUBJECTS.find(s => s.id === activeSubject)!;
  const SubjectIcon = activeSubjectData.icon;
  const firstName = (user?.fullName || user?.email?.split("@")[0] || "there").split(" ")[0];
  const currentTitle = sessions.find(s => s.id === currentSessionId)?.title || "New chat";
  const filteredSessions = sessions.filter(s => (s.title || "Untitled").toLowerCase().includes(chatSearch.toLowerCase()));
  const grouped = groupSessions(filteredSessions);
  const isTeacher = user?.role === "teacher";
  const workspace = isTeacher
    ? [
        { title: "Overview", href: "/dashboard", icon: LayoutGrid },
        { title: "Classes", href: "/classes", icon: Users },
        { title: "Learning Paths", href: "/learning-paths", icon: Route },
        { title: "Messages", href: "/messages", icon: MessageSquare },
      ]
    : [
        { title: "Overview", href: "/student-dashboard", icon: LayoutGrid },
        { title: "Learning Paths", href: "/learning-paths", icon: Route },
        { title: "Portfolio", href: "/portfolio", icon: Briefcase },
        { title: "Messages", href: "/messages", icon: MessageSquare },
      ];
  const initials = (user?.fullName || user?.email || "U").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  // ─── Chat sidebar ────────────────────────────────────────────────────
  const sidebarBody = (inDrawer: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-5">
        <Link to={isTeacher ? "/dashboard" : "/student-dashboard"} className="flex items-center gap-2 text-white">
          <Wordmark className="text-[20px]" />
          <span className="rounded-full border border-lp-blue/40 bg-lp-blue/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-lp-sky">
            Assistant
          </span>
        </Link>
        {inDrawer ? (
          <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-soft hover:bg-white/[0.06] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar" title="Collapse sidebar" className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white">
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-1.5 px-3">
        <button
          type="button"
          onClick={clearChat}
          className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-lp-line bg-lp-surface px-3 text-[14px] font-medium text-white transition-all hover:border-lp-blue/50 hover:bg-lp-raised"
        >
          <Plus className="h-4 w-4 text-lp-sky" /> New chat
        </button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
          <input
            value={chatSearch}
            onChange={e => setChatSearch(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="h-10 w-full rounded-xl border border-transparent bg-transparent pl-9 pr-3 text-[14px] text-white placeholder:text-lp-soft outline-none transition hover:bg-white/[0.04] focus:border-lp-line focus:bg-lp-surface"
          />
        </div>
      </div>

      {!isInSchool && (
        <div className="mt-5 px-3">
          <p className="mb-1.5 px-3 text-[10.5px] font-medium uppercase tracking-[0.2em] text-lp-mute">Workspace</p>
          {workspace.map(w => {
            const Icon = w.icon;
            return (
              <NavLink
                key={w.href}
                to={w.href}
                className="flex h-9 items-center gap-2.5 rounded-xl px-3 text-[13.5px] text-lp-soft transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                <Icon className="h-4 w-4 text-lp-mute" /> {w.title}
              </NavLink>
            );
          })}
        </div>
      )}

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <p className="mb-1.5 px-3 text-[10.5px] font-medium uppercase tracking-[0.2em] text-lp-mute">Chats</p>
        {grouped.length === 0 ? (
          <p className="px-3 py-2 text-[13px] leading-relaxed text-lp-mute">
            {chatSearch ? "No chats match that search." : "No chats yet. Ask Refyn anything and it shows up here."}
          </p>
        ) : (
          grouped.map(g => (
            <div key={g.label} className="mb-3">
              <p className="px-3 pb-1 pt-2 text-[11.5px] text-lp-mute">{g.label}</p>
              {g.items.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => loadSession(s.id)}
                  title={s.title || "Untitled"}
                  className={cn(
                    "group flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-[13.5px] transition-colors",
                    currentSessionId === s.id
                      ? "bg-gradient-to-r from-lp-blue/25 to-transparent text-white"
                      : "text-lp-soft hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  <MessageSquare className={cn("h-3.5 w-3.5 shrink-0", currentSessionId === s.id ? "text-lp-sky" : "text-lp-mute")} />
                  <span className="truncate">{s.title || "Untitled"}</span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {!isInSchool && (
        <div className="border-t border-lp-line p-3">
          <div className="flex items-center gap-3 rounded-xl p-1.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lp-blue to-[#1E3A8A] text-[12px] font-semibold text-white ring-2 ring-lp-blue/30">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-white">{user?.fullName || user?.email}</p>
              <p className="truncate text-[11.5px] capitalize text-lp-mute">{user?.role}</p>
            </div>
            <button
              type="button"
              onClick={async () => { await logout(); navigate("/login"); }}
              title="Sign out"
              aria-label="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Composer ────────────────────────────────────────────────────────
  const composer = (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[800px]">
      <div className="rounded-[26px] border border-lp-line bg-lp-surface/90 p-2 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-[border-color,box-shadow] focus-within:border-lp-blue/60 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.12),0_20px_60px_-30px_rgba(0,0,0,0.9)]">
        {resourceContext && (
          <div className="m-1.5 flex items-center gap-2 rounded-2xl border border-lp-blue/30 bg-lp-blue/10 px-3 py-2 text-[13px] text-lp-soft">
            <FileText className="h-4 w-4 shrink-0 text-lp-sky" />
            <span className="flex-1 truncate">
              Referencing: <span className="font-medium text-white">{resourceContext.title}</span>
            </span>
            <button type="button" onClick={() => setResourceContext(null)} aria-label="Remove reference" className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white/10">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          aria-label="Message Refyn"
          placeholder={resourceContext ? `Ask about "${resourceContext.title}"…` : `Ask Refyn about ${activeSubjectData.name.toLowerCase()}…`}
          className="block max-h-[200px] min-h-[48px] w-full resize-none bg-transparent px-3.5 pb-1 pt-3 text-[15.5px] leading-relaxed text-white placeholder:text-lp-mute outline-none"
        />
        <div className="flex items-center justify-between gap-2 px-1.5 pb-1 pt-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {/* Subject */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSubjectMenu(v => !v)}
                aria-haspopup="menu"
                aria-expanded={subjectMenu}
                className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-lp-soft transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <SubjectIcon className="h-4 w-4 text-lp-sky" />
                {activeSubjectData.name}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", subjectMenu && "rotate-180")} />
              </button>
              {subjectMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSubjectMenu(false)} />
                  <div role="menu" className="lp-fade absolute bottom-11 left-0 z-20 w-48 rounded-2xl border border-lp-line bg-lp-deep p-1.5 shadow-2xl">
                    {SUBJECTS.map(s => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={activeSubject === s.id}
                          onClick={() => { setActiveSubject(s.id); setSubjectMenu(false); }}
                          className={cn(
                            "flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[13.5px] transition-colors",
                            activeSubject === s.id ? "bg-lp-blue/15 text-white" : "text-lp-soft hover:bg-white/[0.05] hover:text-white",
                          )}
                        >
                          <Icon className="h-4 w-4 text-lp-sky" /> {s.name}
                          {activeSubject === s.id && <Check className="ml-auto h-3.5 w-3.5 text-lp-sky" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Guided mode (process teaching) */}
            <button
              type="button"
              role="switch"
              aria-checked={isProcessTeaching}
              onClick={() => setIsProcessTeaching(v => !v)}
              title={isProcessTeaching ? "Guided mode: Refyn helps you work it out" : "Direct mode: clear, detailed explanations"}
              className={cn(
                "flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-all",
                isProcessTeaching ? "border-lp-blue/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white",
              )}
            >
              <span className={cn("relative h-4 w-7 rounded-full transition-colors", isProcessTeaching ? "bg-lp-blue" : "bg-lp-line")}>
                <span className={cn("absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-[#FFFFFF] transition-transform", isProcessTeaching ? "translate-x-3" : "translate-x-0")} />
              </span>
              <span className="hidden sm:inline">{isProcessTeaching ? "Guided" : "Direct"}</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={chatState === "sending" || !prompt.trim()}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lp-blue text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,0.9)] transition-all hover:bg-[#2F6FE0] disabled:bg-lp-raised disabled:text-lp-mute disabled:shadow-none"
          >
            {chatState === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>
      <p className="mt-2.5 text-center text-[12px] text-lp-mute">
        {isProcessTeaching
          ? "Guided mode is on: Refyn helps you work it out instead of handing over the answer."
          : "Direct mode: clear, detailed explanations."}{" "}
        <span className="hidden sm:inline">Enter to send, Shift+Enter for a new line. AI can make mistakes, so double-check.</span>
      </p>
    </form>
  );

  return (
    <div className={cn("lp-app relative z-[1] flex bg-lp-bg font-ui antialiased selection:bg-lp-blue/40 selection:text-white", "h-screen")}>
      {/* Desktop chat sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-lp-line bg-lp-deep transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block",
          collapsed ? "w-0 overflow-hidden border-r-0" : "w-[280px]",
        )}
      >
        <div className="h-full w-[280px]">{sidebarBody(false)}</div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn("fixed inset-0 z-50 bg-lp-deep/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden", drawerOpen ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        aria-hidden={!drawerOpen}
        className={cn(
          "fixed bottom-0 left-0 top-0 z-50 w-[86%] max-w-[300px] border-r border-lp-line bg-lp-deep shadow-2xl transition-[transform,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          drawerOpen ? "translate-x-0" : "invisible -translate-x-full",
        )}
      >
        {sidebarBody(true)}
      </aside>

      <FeatureGate feature="aiAssistant" className="flex min-w-0 flex-1">
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[800px] -translate-x-1/2 rounded-full opacity-40 blur-[130px]"
            style={{ background: "radial-gradient(closest-side, rgba(59,130,246,0.45), transparent)" }}
          />

          {/* Top bar */}
          <header className="relative flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open chats" className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-soft hover:bg-white/[0.06] hover:text-white lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              {collapsed && (
                <button type="button" onClick={() => setCollapsed(false)} aria-label="Show sidebar" title="Show sidebar" className="hidden h-9 w-9 items-center justify-center rounded-xl text-lp-soft hover:bg-white/[0.06] hover:text-white lg:flex">
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
              )}
              <h1 className="truncate text-[15px] font-medium text-white">{currentTitle}</h1>
            </div>
            <div className="flex items-center gap-2">
              {plan && Number.isFinite(tokensRemaining) && (
                <span className="hidden items-center gap-1.5 rounded-full border border-lp-line bg-lp-surface/70 px-3 py-1 text-[12px] text-lp-soft sm:flex" title="Tokens left this month">
                  <Sparkles className="h-3.5 w-3.5 text-lp-cyan" />
                  {tokensRemaining.toLocaleString()} tokens left
                </span>
              )}
              {messages.length > 0 && (
                <button type="button" onClick={clearChat} className="flex h-9 items-center gap-1.5 rounded-xl border border-lp-line bg-lp-surface/70 px-3 text-[13px] font-medium text-white transition-colors hover:border-lp-blue/50">
                  <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New chat</span>
                </button>
              )}
            </div>
          </header>

          {messages.length === 0 ? (
            /* ─── Welcome ─── */
            <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 sm:px-6">
              <div className="mx-auto flex w-full max-w-[800px] flex-1 flex-col justify-center py-8">
                <h2 className="lp-fade text-[40px] font-medium leading-[1.05] tracking-[-0.045em] sm:text-[56px]">
                  <span className="bg-gradient-to-r from-lp-sky via-[#A5CCFF] to-lp-cyan bg-clip-text text-transparent">Hello, {firstName}</span>
                  <br />
                  <span className="text-lp-mute">What are we working on?</span>
                </h2>
                <p className="lp-fade mt-4 max-w-[34rem] text-[15.5px] text-lp-soft" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
                  {isProcessTeaching
                    ? "Ask about anything you're studying. I'll guide you through the thinking, step by step."
                    : "Ask about anything you're studying and I'll explain it clearly."}
                </p>

                <div className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {STARTERS.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.title}
                        type="button"
                        onClick={() => applyStarter(`${s.body}`, s.subject)}
                        className="lp-fade group flex min-h-[140px] flex-col rounded-3xl border border-lp-line bg-lp-surface/60 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-lp-blue/50 hover:bg-lp-surface"
                        style={{ animationDelay: `${120 + i * 60}ms`, animationFillMode: "both" }}
                      >
                        <span className="text-[15px] font-medium text-white">{s.title}</span>
                        <span className="mt-2 text-[12.5px] leading-relaxed text-lp-mute sm:text-[13px]">{s.body}</span>
                        <span className="mt-auto flex h-9 w-9 items-center justify-center self-end rounded-full bg-lp-raised text-lp-sky transition-colors group-hover:bg-lp-blue group-hover:text-white">
                          <Icon className="h-4 w-4" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ─── Conversation ─── */
            <div className="relative min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
              <div className="mx-auto w-full max-w-[800px] space-y-8 py-6">
                {messages.map(msg =>
                  msg.role === "user" ? (
                    <div key={msg.id} className="lp-fade flex justify-end">
                      <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-lp-blue px-5 py-3 text-[15px] leading-relaxed text-white shadow-[0_10px_30px_-12px_rgba(59,130,246,0.8)]">
                        {msg.content}
                      </p>
                    </div>
                  ) : (
                    <div key={msg.id} className="lp-fade group flex gap-4">
                      <RefynMark className="mt-0.5 h-9 w-9" />
                      <div className="min-w-0 flex-1">
                        <div className="lp-md">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => copyMessage(msg)}
                            className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[12px] text-lp-mute hover:bg-white/[0.06] hover:text-white"
                          >
                            {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-lp-green" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedId === msg.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ),
                )}
                {chatState === "sending" && (
                  <div className="lp-fade flex items-center gap-4">
                    <RefynMark className="h-9 w-9" />
                    <div className="flex items-center gap-3 text-[14px] text-lp-soft">
                      <span className="lp-dots flex items-center gap-1"><span /><span /><span /></span>
                      {isProcessTeaching ? "Thinking about how to guide you…" : "Thinking…"}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          <div className="relative shrink-0 px-4 pb-4 pt-2 sm:px-6 sm:pb-5">{composer}</div>
        </main>
      </FeatureGate>
    </div>
  );
};

export default StudentInterface;
