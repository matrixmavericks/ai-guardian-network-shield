import React, { useState, useRef, useEffect } from "react";
import {
  Archive, ArrowUp, Beaker, BookMarked, BookOpen, Calculator, Check, ChevronDown, Copy, FileText, Languages,
  LayoutGrid, Lightbulb, Loader2, LogOut, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, PenTool, Plus,
  Puzzle, Route, Search, Sparkles, Terminal, Users, X, Briefcase, Layers, RotateCcw, Paperclip, Library as LibraryIcon,
  AlertCircle, Upload as UploadIcon, Presentation, FileStack,
  Mic, Square, Volume2, VolumeX, Radar, CalendarClock, ClipboardCheck, LineChart, Radio,
} from "lucide-react";
import { BlockView } from "@/components/assistant/powers/BlockView";
import { streamChat, type StreamResult } from "@/components/assistant/powers/chatStream";
import { useDictation, useSpeaker } from "@/components/assistant/powers/voice";
import { loadTask, taskBrief } from "@/components/tasks/task";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import remarkGfm from "remark-gfm";
import { useChatLibrary } from "@/components/assistant/files/library";
import { LibraryPanel, itemIcon } from "@/components/assistant/files/LibraryPanel";
import { FileCard } from "@/components/assistant/files/FileCard";
import { DeckCard } from "@/components/assistant/files/DeckCard";
import { splitReply } from "@/components/assistant/files/outputs";
import { ACCEPT } from "@/components/assistant/files/extract";
import { fetchDriveFile, pickDriveFiles } from "@/components/assistant/files/google";
import { totalChars } from "@/components/assistant/files/library";
import { AUTO_COMPACT_AT, UsageButton, estimateContext, historyBudget } from "@/components/assistant/UsagePanel";
import { useToast } from "@/components/ui/use-toast";
import FeatureGate from "@/components/FeatureGate";
import { IN_ANDROID_APP } from "@/lib/appShell";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useStudentPlan } from "@/hooks/useStudentPlan";
import { useSchoolCheck } from "@/hooks/useSchoolCheck";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, differenceInCalendarDays } from "date-fns";
import { Wordmark } from "@/components/landing/LandingNav";
import { Command, commandsFor, parseCommand } from "@/components/assistant/commands";
import { MAX_INSTALLED, SKILLS, skillContext, skillsForMessage } from "@/components/assistant/skills";
import { NotebookEntry, downloadMarkdown, slugify, useStoredState } from "@/components/assistant/storage";
import {
  ArchivedPanel, CommandsPanel, NotebookPanel, SkillsPanel,
} from "@/components/assistant/panels";
import { ModelPicker, PoweredBy, choiceLabel, type ModelAccess, type ModelChoice } from "@/components/assistant/ModelPicker";
import { AI_MODELS, BASIC_PLANS, DEFAULT_MODEL, REFYN_PICKS, findModel } from "@/lib/aiModels";
import AppearanceToggle from "@/components/student/AppearanceToggle";
import { friendlyFirstName } from "@/lib/studentIds";

// The chat tables aren't in the generated Supabase types yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  /** Skills that shaped this message (only known for messages sent in this visit) */
  skills?: string[];
  /** The model that wrote an assistant reply, and at what reasoning level */
  model?: string;
  effort?: string | null;
  /** Set when a different model answered than the one chosen */
  notice?: string;
  /** Files added with this message */
  attachments?: string[];
  /** How much of the chat library the reply read */
  library?: { items: number; used: number; mode: "full" | "excerpts"; names?: string[] };
  /** Tokens the reply used, as reported by the AI provider */
  usage?: { prompt: number; completion: number };
  /** Past papers the reply quoted from (teachers) */
  pastPapers?: string[];
  /** Arrived in this visit (a presentation in it opens straight away) */
  fresh?: boolean;
  /** Which of the person's own Refyn data the reply could see */
  live?: { role: string; classes: number; assignments: number; waiting?: number; events: number };
  /** Still arriving */
  streaming?: boolean;
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
  { title: "What's due?", body: "What's due for me in the next two weeks and what should I start first? Make me a plan I can add to my calendar.", subject: "general", icon: CalendarClock },
  { title: "Quiz me", body: "Quiz me on [topic] with a mix of question types, then tell me what to go over.", subject: "science", icon: Sparkles },
  { title: "Flashcards", body: "Make me flashcards for [topic] so I can memorise the key terms.", subject: "general", icon: Layers },
  { title: "Graph it", body: "Show me an interactive graph of y = a(x − h)² + k with sliders, and explain what each letter does.", subject: "math", icon: LineChart },
];

const TEACHER_STARTERS = [
  { title: "What needs marking?", body: "What's waiting to be marked across my classes, and who hasn't submitted? Chart the latest class results.", subject: "general", icon: ClipboardCheck },
  { title: "Live quiz", body: "Make a 10-question quiz on [topic] for [year group] that I can launch live in class.", subject: "general", icon: Radio },
  { title: "Build a presentation", body: "Make a 10-slide presentation on [topic] for [year group], with images, a quick quiz and speaker notes.", subject: "general", icon: Presentation },
  { title: "Set an assignment", body: "Write an assignment on [topic] for [class], due next Friday, and set it for me.", subject: "general", icon: FileText },
];

const NOTES_PROMPT =
  "Turn what we've covered in this chat into concise study notes: a short summary, the key ideas under clear headings, any formulas or definitions, and three questions I should be able to answer.";

type ChatState = "idle" | "sending" | "error";
type Panel = "skills" | "notebook" | "commands" | "archived" | "files" | null;
type Suggestion = { key: string; label: string; hint: string; kind: "command" | "skill"; value: string; command?: Command };

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

const iconBtn =
  "relative flex h-9 w-9 items-center justify-center rounded-xl border border-lp-line bg-lp-surface/70 text-lp-soft transition-colors hover:border-lp-blue/50 hover:text-white";

const StudentInterface = () => {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessTeaching, setIsProcessTeaching] = useState(true);
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [activeSubject, setActiveSubject] = useState("general");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  // A chat started with a Gem, in a World or in a role-play scene keeps that context when reopened here
  const [space, setSpace] = useState<{ gemId: string | null; worldId: string | null; sceneId: string | null } | null>(null);
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

  // Suite: skills, notebook, archive, commands, compaction
  const storeKey = user ? `refyn:${user.id}` : null;
  const [installedSkills, setInstalledSkills] = useStoredState<string[]>(storeKey && `${storeKey}:skills`, []);
  const [notebook, setNotebook] = useStoredState<NotebookEntry[]>(storeKey && `${storeKey}:notebook`, []);
  const [archived, setArchived] = useStoredState<string[]>(storeKey && `${storeKey}:archived`, []);
  const [panel, setPanel] = useState<Panel>(null);
  const [notebookFocus, setNotebookFocus] = useState<string | null>(null);
  const [compact, setCompact] = useState<{ index: number; summary: string } | null>(null);
  const [compacting, setCompacting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  // Model choice (per student, this browser) and what their school/plan allows
  const [modelChoice, setModelChoice] = useStoredState<ModelChoice>(storeKey && `${storeKey}:model`, { model: DEFAULT_MODEL, effort: null });
  const [modelAccess, setModelAccess] = useState<ModelAccess | null>(null);
  const [retryMenu, setRetryMenu] = useState(false);
  const [pendingModel, setPendingModel] = useState<string | null>(null);

  // Teachers get the planning and content assistant; students the guided tutor
  const teacherMode = user?.role === "teacher" || user?.role === "admin";

  // Assistant powers: streamed replies, the person's own Refyn data, voice
  const [useLive, setUseLive] = useStoredState<boolean>(storeKey && `${storeKey}:live`, true);
  const abortRef = useRef<AbortController | null>(null);
  const dictation = useDictation(t => setPrompt(p => (p && !/\s$/.test(p) ? `${p} ` : p) + t));
  const speaker = useSpeaker();

  // Chat library: files, notes and saved replies Refyn reads on every reply
  const lib = useChatLibrary(user?.id ?? null, currentSessionId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const readyUploads = lib.uploads.filter(u => u.status === "ready");
  const pendingUploads = lib.uploads.filter(u => u.status === "uploading" || u.status === "reading");

  // Pick up resource context from URL params (from "Use in AI" button)
  useEffect(() => {
    const resTitle = searchParams.get("resourceTitle");
    const resDesc = searchParams.get("resourceDesc");
    const resUrl = searchParams.get("resourceUrl");
    const draft = searchParams.get("prompt");
    // "Ask Refyn about this task" from a task page: the whole task becomes the context
    const task = searchParams.get("task");
    if (task) {
      loadTask(task, null).then(r => {
        if (r) setResourceContext({ title: `Task: ${r.task.title}`, description: taskBrief(r.task, r.cls) });
      });
      searchParams.delete("task");
      setSearchParams(searchParams, { replace: true });
    }
    // Coming back from a presentation made in a chat
    const back = searchParams.get("session");
    if (back) {
      loadSession(back);
      searchParams.delete("session");
      setSearchParams(searchParams, { replace: true });
    }
    if (resTitle || draft) {
      if (resTitle) setResourceContext({ title: resTitle, description: resDesc || "", url: resUrl || undefined });
      // A starter message from a study page (e.g. Teach Refyn), left for the student to finish
      if (draft) setPrompt(draft);
      // Clean URL params
      searchParams.delete("resourceTitle");
      searchParams.delete("resourceDesc");
      searchParams.delete("resourceUrl");
      searchParams.delete("prompt");
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

  // Which models this student can pick. If the server can't say (older
  // deployment, offline), fall back to the plan: premium models need Premium.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const planLocked = !!plan && BASIC_PLANS.includes(plan.plan_id);
    const local = (): ModelAccess => ({
      default: DEFAULT_MODEL,
      schoolRestricted: false,
      models: Object.fromEntries(AI_MODELS.map(m => [m.id, { available: !(m.premium && planLocked), reason: m.premium && planLocked ? "plan" as const : null }])),
    });
    supabase.functions
      .invoke("ai-chat", { body: { action: "models" } })
      .then(({ data }) => {
        if (cancelled) return;
        if (Array.isArray(data?.models)) {
          setModelAccess({
            default: data.default || DEFAULT_MODEL,
            schoolRestricted: !!data.schoolRestricted,
            models: Object.fromEntries((data.models as { id: string; available: boolean; reason?: "school" | "plan" | "unavailable" | null }[]).map(m => [m.id, { available: m.available, reason: m.reason ?? null }])),
          });
        } else setModelAccess(local());
      })
      .catch(() => !cancelled && setModelAccess(local()));
    return () => { cancelled = true; };
  }, [user, plan?.plan_id]);

  // The model actually sent: the student's choice if they may use it, else the default
  const activeModel = modelAccess && modelAccess.models[modelChoice.model]?.available === false
    ? modelAccess.default
    : findModel(modelChoice.model)?.id ?? DEFAULT_MODEL;

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

  useEffect(() => {
    setSuggestionsDismissed(false);
    setHighlight(0);
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
    setCompact(null);
    setSpace(null);
    db.from('ai_chat_sessions').select('gem_id, world_id, scene_id').eq('id', sessionId).maybeSingle()
      .then(({ data: row }: { data: { gem_id: string | null; world_id: string | null; scene_id: string | null } | null }) => {
        if (row && (row.gem_id || row.world_id || row.scene_id)) setSpace({ gemId: row.gem_id, worldId: row.world_id, sceneId: row.scene_id });
      });
    const { data } = await db
      .from('ai_chat_messages')
      .select('id, role, content, created_at, metadata')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (data) {
      type Row = { id: string; role: string; content: string; created_at: string; metadata: { model?: string; effort?: string | null; notice?: string; attachments?: string[]; library?: ChatMessage["library"]; usage?: ChatMessage["usage"]; pastPapers?: string[]; live?: ChatMessage["live"] } | null };
      setMessages(data.map((m: Row) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at),
        model: m.metadata?.model,
        effort: m.metadata?.effort ?? null,
        notice: m.metadata?.notice,
        attachments: m.metadata?.attachments,
        library: m.metadata?.library,
        usage: m.metadata?.usage,
        pastPapers: m.metadata?.pastPapers,
        live: m.metadata?.live,
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

  /** The chat to save files into, created on first use. */
  const ensureSession = async () => currentSessionId ?? (await createSession());

  const addFiles = (files: File[]) => {
    if (!files.length) return;
    lib.addFiles(files, ensureSession).then(loadSessions);
  };

  const importFromDrive = async () => {
    try {
      const picked = await pickDriveFiles();
      if (!picked.length) return;
      const files: File[] = [];
      for (const f of picked) files.push(await fetchDriveFile(f));
      await lib.addFiles(files, ensureSession, picked.map(p => ({ kind: "google" as const, url: p.url })));
      loadSessions();
    } catch (e) {
      toast({ title: "Google Drive", description: (e as Error).message, variant: "destructive" });
    }
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

  const currentTitle = sessions.find(s => s.id === currentSessionId)?.title || "New chat";

  /** Prior turns sent for context; after /compact, earlier turns are replaced by the summary. */
  const buildHistory = (list: ChatMessage[] = messages, c: typeof compact = compact) => {
    const turns = (l: ChatMessage[]) => l.map(m => ({ role: m.role, content: m.content }));
    if (!c) return turns(list);
    return [
      { role: "user" as const, content: "Here is a summary of our conversation so far." },
      { role: "assistant" as const, content: c.summary },
      ...turns(list.slice(c.index)),
    ];
  };

  /** Characters of conversation the next reply would carry. */
  const conversationChars = (list: ChatMessage[] = messages, c: typeof compact = compact) =>
    buildHistory(list, c).reduce((a, m) => a + m.content.length, 0);

  const resourceText = () =>
    resourceContext
      ? `Title: ${resourceContext.title}\nDescription: ${resourceContext.description}${resourceContext.url ? `\nURL: ${resourceContext.url}` : ""}`
      : null;

  const saveToNotebook = (content: string, title: string) => {
    const entry: NotebookEntry = { id: crypto.randomUUID(), title, content, source: currentTitle, createdAt: new Date().toISOString() };
    setNotebook(prev => [entry, ...prev].slice(0, 100));
    return entry.id;
  };

  /**
   * Send a message. `retry` re-asks the last question (the student's message is
   * already on screen and saved), optionally with a different `model`.
   */
  const sendPrompt = async (
    text: string,
    opts: { saveAs?: string; retry?: boolean; model?: string; base?: ChatMessage[] } = {},
  ) => {
    const attached = opts.retry ? [] : readyUploads;
    const typed = !!text.trim();
    if ((!text.trim() && !attached.length) || chatState === "sending") return;
    if (!text.trim()) text = `I've added ${attached.map(u => `"${u.name}"`).join(", ")}. Give me a short overview of ${attached.length === 1 ? "it" : "them"} and ask what I'd like to do next.`;
    const base = opts.base ?? messages;
    const model = opts.model ?? activeModel;
    const info = findModel(model);
    const effort = info?.efforts.length
      ? (modelChoice.effort && info.efforts.includes(modelChoice.effort) && model === activeModel ? modelChoice.effort : info.defaultEffort ?? null)
      : null;

    if (plan && !canUseTokens(1)) {
      toast({
        title: "Token limit reached",
        description: `You've used all ${plan.monthly_token_limit} tokens this month. ${IN_ANDROID_APP ? "They reset next month." : "Upgrade your plan for more."}`,
        variant: "destructive",
      });
      return;
    }
    const activeSkills = skillsForMessage(text, installedSkills);
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
      skills: activeSkills.map(s => s.name),
      attachments: attached.length ? attached.map(u => u.name) : undefined,
    };

    if (!opts.retry) setMessages(prev => [...prev, userMessage]);
    const sentPrompt = text.trim();
    if (!opts.retry) setPrompt("");
    setPendingModel(model);
    setChatState("sending");

    try {
      // Ensure session exists
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = await createSession();
        if (!sessionId) throw new Error("Could not create chat session");
      }

      // Save user message (a retry re-uses the one already saved)
      if (!opts.retry) await saveMessage(sessionId, 'user', sentPrompt, attached.length ? { attachments: attached.map(u => u.name) } : undefined);
      if (attached.length) lib.clearUploads(attached.map(u => u.key));

      // Update session title on first message
      if (base.length === 0 && !opts.retry) {
        const titleText = typed ? sentPrompt : attached.map(u => u.name).join(", ");
        const title = titleText.length > 50 ? titleText.substring(0, 50) + '...' : titleText;
        await db.from('ai_chat_sessions').update({ title }).eq('id', sessionId);
      }

      // Auto-compact: once the conversation nears what one reply can read, summarise the earlier part
      let activeCompact = compact;
      if (!opts.retry && base.length >= 6 && conversationChars(base) > historyBudget(info?.price.input ?? 0.3) * AUTO_COMPACT_AT) {
        activeCompact = (await compactChat({ auto: true, list: base })) ?? compact;
      }

      // Build conversation history (prior turns) to send for context
      const history = buildHistory(base, activeCompact);

      // Class resource + any skills, sent as extra context for this reply
      const context = [resourceText(), skillContext(activeSkills)].filter(Boolean).join("\n\n") || null;

      // Call AI: the reply streams in as it's written
      const assistantId = crypto.randomUUID();
      let shown = false;
      let latest: string | null = null;
      let frame = 0;
      const show = (patch: Partial<ChatMessage>) => {
        if (!shown) {
          shown = true;
          setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date(), fresh: true, streaming: true, ...patch }]);
        } else setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, ...patch } : m)));
      };
      const controller = new AbortController();
      abortRef.current = controller;
      let result: StreamResult;
      try {
        result = await streamChat(
          {
            prompt: sentPrompt,
            subject: activeSubject,
            gradeLevel: "high-school",
            processTeaching: teacherMode ? false : isProcessTeaching,
            sessionId,
            history,
            resourceContext: context,
            model,
            effort,
            library: true,
            images: attached.map(u => u.image).filter(Boolean),
            live: useLive,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            gemId: space?.gemId ?? undefined,
            worldId: space?.worldId ?? undefined,
            sceneId: space?.sceneId ?? undefined,
          },
          {
            start: st => { if (st.model) setPendingModel(st.model); show({ model: st.model, effort: st.effort ?? null, notice: st.notice }); },
            delta: (_, full) => {
              // Paint at most once a frame, however fast the words arrive
              latest = full;
              if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (latest !== null) show({ content: latest }); });
            },
          },
          controller.signal,
        );
      } catch (e) {
        if ((e as Error).name !== "AbortError") throw e;
        result = { kind: "stream", text: "", meta: {}, interrupted: false, aborted: true };
      } finally {
        abortRef.current = null;
        if (frame) cancelAnimationFrame(frame);
      }

      let reply: string;
      let meta: Record<string, unknown>;
      let ok = true;
      if (result.kind === "json") {
        const data = result.data ?? {};
        reply = (typeof data.reply === "string" && data.reply) || (typeof data.response === "string" && data.response) || "I'm sorry, I couldn't generate a response. Please try again.";
        meta = (data.meta as Record<string, unknown>) || {};
        ok = data.success !== false;
        if (data.error && data.success === false) toast({ title: "Warning", description: String(data.error), variant: "destructive" });
      } else {
        meta = result.meta;
        reply = result.text;
        if (result.aborted) reply = reply ? `${reply}\n\n_Stopped._` : "_Stopped before Refyn replied._";
        else if (result.interrupted) reply = reply ? `${reply}\n\n_The reply was cut off. Try again for the rest._` : "I'm sorry, the AI is temporarily unavailable. Please try again in a moment.";
        ok = !!result.text && !result.interrupted && !result.aborted;
      }

      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: reply,
        timestamp: new Date(),
        // Only what the server reports: never claim a model that didn't answer
        model: typeof meta.model === "string" ? meta.model : undefined,
        effort: typeof meta.effort === "string" ? meta.effort : null,
        notice: typeof meta.notice === "string" ? meta.notice : undefined,
        library: meta.library && typeof meta.library === "object" ? (meta.library as ChatMessage["library"]) : undefined,
        usage: meta.usage && typeof meta.usage === "object" ? (meta.usage as ChatMessage["usage"]) : undefined,
        pastPapers: Array.isArray(meta.pastPapers) ? meta.pastPapers : undefined,
        live: meta.live && typeof meta.live === "object" ? (meta.live as ChatMessage["live"]) : undefined,
        fresh: true,
        streaming: false,
      };

      setMessages(prev => (prev.some(m => m.id === assistantId) ? prev.map(m => (m.id === assistantId ? assistantMessage : m)) : [...prev, assistantMessage]));
      await saveMessage(sessionId, 'assistant', reply, meta);
      setChatState("idle");
      loadSessions(); // refresh sidebar

      if (opts.saveAs && ok) {
        saveToNotebook(reply, opts.saveAs);
        toast({ title: "Saved to your Notebook", description: opts.saveAs });
      }
    } catch (error: unknown) {
      console.error("AI Chat error:", error);
      // A reply that had started arriving stays on screen
      setMessages(prev => prev.map(m => (m.streaming ? { ...m, streaming: false } : m)));

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

  /** Stop the reply that's arriving (what has arrived is kept). */
  const stopReply = () => abortRef.current?.abort();

  /** Replace the last reply with a fresh one, optionally from another model. */
  const regenerate = (model?: string) => {
    setRetryMenu(false);
    const last = messages.length - 1;
    if (last < 1 || messages[last].role !== "assistant" || chatState === "sending") return;
    const userIndex = messages.slice(0, last).map(m => m.role).lastIndexOf("user");
    if (userIndex < 0) return;
    setMessages(messages.slice(0, last));
    sendPrompt(messages[userIndex].content, { retry: true, model, base: messages.slice(0, userIndex) });
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setSpace(null);
    setChatState("idle");
    setCompact(null);
    setDrawerOpen(false);
  };

  /**
   * /compact (or automatically as a chat fills up): summarise the conversation,
   * use the summary in place of the earlier turns, and keep it, pinned, in the
   * chat's files so it survives reloads.
   */
  const compactChat = async (opts: { auto?: boolean; list?: ChatMessage[] } = {}): Promise<{ index: number; summary: string } | null> => {
    const list = opts.list ?? messages;
    if (list.length < 4) {
      if (!opts.auto) toast({ title: "Not much to compact yet", description: "Compacting helps once a chat gets long." });
      return null;
    }
    setCompacting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          prompt: "Summarise our conversation so far in under 220 words, as notes for yourself: the goal, key facts and decisions, anything already produced (files, plans, answers), and what's still open. Write notes, not a reply.",
          subject: activeSubject,
          gradeLevel: "high-school",
          processTeaching: false,
          sessionId: currentSessionId,
          history: buildHistory(list),
          resourceContext: resourceText(),
          live: false,
          powers: false,
        },
      });
      const summary = data?.reply || data?.response;
      if (error || !summary || data?.success === false) throw new Error(error?.message || "Couldn't summarise this chat");
      const next = { index: list.length, summary };
      setCompact(next);
      setShowSummary(false);
      lib.addText("note", `Summary of earlier messages (${format(new Date(), "d MMM, p")})`, summary, ensureSession, { compaction: true }, true).catch(() => undefined);
      toast({ title: opts.auto ? "Chat compacted automatically" : "Chat compacted", description: "Earlier messages are summarised and pinned in this chat's files." });
      return next;
    } catch (e: unknown) {
      if (!opts.auto) toast({ title: "Couldn't compact", description: (e as { message?: string } | null)?.message || "Please try again.", variant: "destructive" });
      return null;
    } finally {
      setCompacting(false);
    }
  };

  const exportChat = () => {
    if (messages.length === 0) {
      toast({ title: "Nothing to export yet" });
      return;
    }
    const body = messages.map(m => `**${m.role === "user" ? "You" : "Refyn"}:**\n\n${m.content}`).join("\n\n---\n\n");
    downloadMarkdown(`${slugify(currentTitle)}.md`, `# ${currentTitle}\n\n_Exported from Refyn on ${format(new Date(), "d MMMM yyyy, p")}_\n\n${body}\n`);
  };

  const runCommand = async (cmd: Command, arg: string) => {
    const done = () => setPrompt("");
    const needsChat = () => {
      if (messages.length > 0) return false;
      toast({ title: "Start a chat first", description: `/${cmd.name} works once you've asked something.` });
      return true;
    };
    switch (cmd.name) {
      case "new": done(); clearChat(); break;
      case "rename":
        if (!currentSessionId) { toast({ title: "Nothing to rename yet", description: "Send a message first." }); return; }
        if (!arg) { setPrompt("/rename "); textareaRef.current?.focus(); return; }
        await db.from('ai_chat_sessions').update({ title: arg.slice(0, 80) }).eq('id', currentSessionId);
        done(); loadSessions(); toast({ title: "Chat renamed", description: arg.slice(0, 80) });
        break;
      case "export": done(); exportChat(); break;
      case "archive":
        if (!currentSessionId) { toast({ title: "Nothing to archive yet" }); return; }
        setArchived(prev => (prev.includes(currentSessionId) ? prev : [...prev, currentSessionId]));
        done(); clearChat(); toast({ title: "Chat archived", description: "Find it under Archived in the sidebar." });
        break;
      case "compact": done(); await compactChat(); break;
      case "notes":
        if (needsChat()) return;
        await sendPrompt(NOTES_PROMPT, { saveAs: `Study notes: ${currentTitle}` });
        break;
      case "quiz":
        if (!arg && messages.length === 0) {
          setPrompt("/quiz ");
          toast({ title: "What should I quiz you on?", description: "Add a topic, e.g. /quiz photosynthesis" });
          return;
        }
        await sendPrompt(
          `Quiz me on ${arg || "what we've covered in this chat"}. Ask one question at a time and wait for my answer before the next.`,
        );
        break;
      case "hint":
        if (needsChat()) return;
        await sendPrompt("Give me just the next hint for what I'm working on: one small step, nothing more.");
        break;
      case "explain":
        if (!arg) { setPrompt("/explain "); textareaRef.current?.focus(); return; }
        await sendPrompt(`Explain ${arg} in plain words, step by step, then check I've understood with one question.`);
        break;
      case "flashcards":
        if (!arg && messages.length === 0) { setPrompt("/flashcards "); toast({ title: "What should the cards cover?", description: "Add a topic, e.g. /flashcards cell organelles" }); return; }
        await sendPrompt(`Make flashcards for ${arg || "the key ideas in this chat"}.`);
        break;
      case "graph":
        if (!arg) { setPrompt("/graph "); textareaRef.current?.focus(); return; }
        await sendPrompt(`Show an interactive graph: ${arg}. Then explain its key features in two or three sentences.`);
        break;
      case "plan":
        await sendPrompt(`Make me a dated study plan${arg ? ` for ${arg}` : ""} from today, built around my real deadlines, with short sessions I can actually do. Put it in a plan I can add to my calendar.`);
        break;
      case "due":
        await sendPrompt("What's due for me, what's overdue, and what should I do first? Be specific about dates, then suggest how to fit it into this week.");
        break;
      case "livequiz":
        if (!arg) { setPrompt("/livequiz "); textareaRef.current?.focus(); return; }
        await sendPrompt(`Make a quiz on ${arg} that I can launch live with a class: 8 to 10 multiple-choice and true/false questions with short explanations.`);
        break;
      case "assign":
        if (!arg) { setPrompt("/assign "); textareaRef.current?.focus(); return; }
        await sendPrompt(`Write an assignment for this: ${arg}. Then give me the action to set it for the right class.`);
        break;
      case "marking":
        await sendPrompt("What's waiting to be marked across my classes, how long has it waited, and who hasn't submitted recent work? Suggest an order to tackle it.");
        break;
      case "message":
        if (!arg) { setPrompt("/message "); textareaRef.current?.focus(); return; }
        await sendPrompt(`Draft this message: ${arg}. Give it to me as a message action so I can check it and send it.`);
        break;
      case "chart":
        await sendPrompt(`Chart ${arg || "my classes' recent results"} using my real Refyn data, then tell me the one thing that stands out.`);
        break;
      case "skills": done(); setPanel("skills"); break;
      case "notebook": done(); setNotebookFocus(null); setPanel("notebook"); break;
      case "files": done(); setPanel("files"); break;
      case "help": done(); setPanel("commands"); break;
      case "guided":
        if (teacherMode) { done(); toast({ title: "You're in teacher mode", description: "Refyn writes complete materials for you. Guided mode is for students." }); break; }
        done(); setIsProcessTeaching(true); toast({ title: "Guided mode on", description: "Refyn will help you work it out." }); break;
      case "direct": done(); setIsProcessTeaching(false); toast({ title: "Direct mode on", description: "Refyn will explain things clearly and directly." }); break;
      case "subject": {
        const s = SUBJECTS.find(x => x.id === arg.toLowerCase() || x.name.toLowerCase() === arg.toLowerCase());
        if (!s) { setPrompt("/subject "); toast({ title: "Pick a subject", description: SUBJECTS.map(x => x.id).join(", ") }); return; }
        done(); setActiveSubject(s.id); toast({ title: `Subject: ${s.name}` });
        break;
      }
      case "model": {
        // "/model apex", "/model gpt-6 sol", "/model high"
        const a = arg.toLowerCase().trim();
        const effort = (["low", "medium", "high"] as const).find(e => a === e);
        if (effort) {
          const m = findModel(activeModel);
          if (!m?.efforts.includes(effort)) { toast({ title: `${m?.name ?? "This model"} doesn't take a reasoning level` }); return; }
          done(); setModelChoice({ model: activeModel, effort }); toast({ title: `Reasoning: ${effort}` });
          break;
        }
        const pick = REFYN_PICKS.find(p => a && (p.key === a || p.name.toLowerCase().includes(a)));
        const m = findModel(pick?.model) ?? AI_MODELS.find(x => a && (x.id.includes(a.replace(/\s+/g, "-")) || x.name.toLowerCase().includes(a)));
        if (!m) { setPrompt("/model "); toast({ title: "Pick a model", description: `Try ${REFYN_PICKS.map(p => p.key).join(", ")}, a model name, or low/medium/high` }); return; }
        if (modelAccess?.models[m.id]?.available === false) {
          toast({ title: `${m.name} isn't available`, description: modelAccess.models[m.id].reason === "school" ? "Your school hasn't enabled it." : modelAccess.models[m.id].reason === "unavailable" ? "It isn't live on Refyn yet." : "It needs the Premium plan.", variant: "destructive" });
          return;
        }
        done(); setModelChoice({ model: m.id, effort: null }); toast({ title: `Model: ${choiceLabel(m.id)}`, description: m.name });
        break;
      }
      case "dashboard": navigate(user?.role === "teacher" ? "/dashboard" : "/student-dashboard"); break;
      case "paths": navigate("/learning-paths"); break;
      case "portfolio": navigate("/portfolio"); break;
      case "grades": navigate("/grades"); break;
      case "messages": navigate("/messages"); break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (pendingUploads.length) {
      toast({ title: "Still reading your files", description: "Send once they've finished loading." });
      return;
    }
    if (!text && readyUploads.length) { await sendPrompt(""); return; }
    if (!text) return;
    if (text.startsWith("/")) {
      const parsed = parseCommand(text, teacherMode);
      if (parsed) await runCommand(parsed.cmd, parsed.arg);
      else toast({ title: "Unknown command", description: "Type /help to see every command." });
      return;
    }
    await sendPrompt(text);
  };

  // ─── / and @ suggestions ─────────────────────────────────────────────
  const atMatch = prompt.match(/(^|\s)@([a-z0-9-]*)$/i);
  const suggestions: Suggestion[] = suggestionsDismissed
    ? []
    : prompt.startsWith("/") && !/\s/.test(prompt)
      ? commandsFor(teacherMode).filter(c => c.name.startsWith(prompt.slice(1).toLowerCase())).map(c => ({
          key: c.name, label: `/${c.name}${c.args ? ` ${c.args}` : ""}`, hint: c.description, kind: "command" as const, value: c.name, command: c,
        }))
      : atMatch
        ? SKILLS.filter(s => s.slug.startsWith(atMatch[2].toLowerCase()) || s.name.toLowerCase().startsWith(atMatch[2].toLowerCase())).map(s => ({
            key: s.slug, label: `@${s.slug}`, hint: `${s.name} · ${s.description}`, kind: "skill" as const, value: s.slug,
          }))
        : [];
  const hi = Math.min(highlight, Math.max(0, suggestions.length - 1));

  const pickSuggestion = (s: Suggestion) => {
    if (s.kind === "command" && s.command) {
      if (s.command.takesInput) {
        setPrompt(`/${s.command.name} `);
        textareaRef.current?.focus();
      } else {
        runCommand(s.command, "");
      }
    } else {
      setPrompt(prompt.replace(/@([a-z0-9-]*)$/i, `@${s.value} `));
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((hi + 1) % suggestions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((hi - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) { e.preventDefault(); pickSuggestion(suggestions[hi]); return; }
      if (e.key === "Escape") { e.preventDefault(); setSuggestionsDismissed(true); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
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

  const saveMessageToNotebook = (m: ChatMessage) => {
    const heading = m.content.match(/^#{1,3}\s+(.+)$/m)?.[1];
    const id = saveToNotebook(m.content, heading ? heading.slice(0, 80) : `From “${currentTitle}”`);
    setNotebookFocus(id);
    toast({ title: "Saved to your Notebook", description: "Open it from the notebook icon at the top." });
  };

  const toggleSkill = (slug: string) =>
    setInstalledSkills(prev => (prev.includes(slug) ? prev.filter(s => s !== slug) : prev.length >= MAX_INSTALLED ? prev : [...prev, slug]));

  const lastUsage = compact ? null : [...messages].reverse().find(m => m.role === "assistant" && m.usage)?.usage ?? null;
  const contextEstimate = estimateContext({
    model: activeModel,
    teacher: teacherMode,
    libraryChars: totalChars(lib.items),
    conversationChars: conversationChars(),
    images: readyUploads.filter(u => u.image).length,
    lastPromptTokens: lastUsage?.prompt ?? null,
  });

  const activeSubjectData = SUBJECTS.find(s => s.id === activeSubject)!;
  const SubjectIcon = activeSubjectData.icon;
  const firstName = friendlyFirstName(user?.fullName, "there");
  const visibleSessions = sessions.filter(s => !archived.includes(s.id));
  const archivedSessions = sessions.filter(s => archived.includes(s.id));
  const filteredSessions = visibleSessions.filter(s => (s.title || "Untitled").toLowerCase().includes(chatSearch.toLowerCase()));
  const grouped = groupSessions(filteredSessions);
  const previewSkills = prompt && !prompt.startsWith("/") ? skillsForMessage(prompt, installedSkills) : [];
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
  const tools = [
    { title: "Files", icon: LibraryIcon, count: lib.items.length, onClick: () => setPanel("files") },
    { title: "Notebook", icon: BookMarked, count: notebook.length, onClick: () => { setNotebookFocus(null); setPanel("notebook"); } },
    { title: "Skills", icon: Puzzle, count: installedSkills.length, onClick: () => setPanel("skills") },
    { title: "Commands", icon: Terminal, onClick: () => setPanel("commands") },
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

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="mt-5">
          <p className="mb-1.5 px-3 text-[10.5px] font-medium uppercase tracking-[0.2em] text-lp-mute">Tools</p>
          {tools.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.title}
                type="button"
                onClick={() => { t.onClick(); setDrawerOpen(false); }}
                className="flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-[13.5px] text-lp-soft transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                <Icon className="h-4 w-4 text-lp-mute" /> {t.title}
                {!!t.count && <span className="ml-auto rounded-full bg-lp-blue/15 px-2 text-[11px] tabular-nums text-lp-sky">{t.count}</span>}
              </button>
            );
          })}
        </div>

        {!isInSchool && (
          <div className="mt-4">
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

        <div className="mt-4">
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
      </div>

      <div className="border-t border-lp-line px-3 pt-2">
        <button
          type="button"
          onClick={() => { setPanel("archived"); setDrawerOpen(false); }}
          className="flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-[13.5px] text-lp-soft transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <Archive className="h-4 w-4 text-lp-mute" /> Archived
          {archivedSessions.length > 0 && <span className="ml-auto text-[12px] tabular-nums text-lp-mute">{archivedSessions.length}</span>}
        </button>
      </div>

      {!isInSchool && (
        <div className="p-3 pt-1">
          <div className="flex items-center gap-3 rounded-xl p-1.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lp-blue to-[#1E3A8A] text-[12px] font-semibold text-white ring-2 ring-lp-blue/30">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-white">{user?.fullName || user?.email}</p>
              <p className="truncate text-[11.5px] capitalize text-lp-mute">{user?.role}</p>
            </div>
            <AppearanceToggle />
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
    <form onSubmit={handleSubmit} className="relative mx-auto w-full max-w-[800px]">
      {suggestions.length > 0 && (
        <div role="listbox" aria-label={suggestions[0].kind === "command" ? "Commands" : "Skills"} className="lp-fade absolute bottom-full left-0 right-0 z-20 mb-2 max-h-[320px] overflow-y-auto rounded-2xl border border-lp-line bg-lp-deep/95 p-1.5 shadow-2xl backdrop-blur-xl">
          <p className="px-3 pb-1 pt-1.5 text-[10.5px] font-medium uppercase tracking-[0.2em] text-lp-mute">
            {suggestions[0].kind === "command" ? "Commands" : "Skills"}
          </p>
          {suggestions.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="option"
              aria-selected={i === hi}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={e => { e.preventDefault(); pickSuggestion(s); }}
              className={cn("flex w-full items-baseline gap-3 rounded-xl px-3 py-2 text-left", i === hi ? "bg-lp-blue/15" : "hover:bg-white/[0.04]")}
            >
              <code className="shrink-0 text-[13px] text-lp-sky">{s.label}</code>
              <span className="truncate text-[13px] text-lp-soft">{s.hint}</span>
            </button>
          ))}
          <p className="px-3 pb-1 pt-1.5 text-[11px] text-lp-mute">↑↓ to move · Enter or Tab to pick · Esc to close</p>
        </div>
      )}

      <div data-tour="composer" className="lp-pop rounded-[26px] border border-lp-line bg-lp-surface/90 p-2 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-[border-color,box-shadow] focus-within:border-lp-blue/60 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.12),0_20px_60px_-30px_rgba(0,0,0,0.9)]">
        {lib.uploads.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1.5 pt-1.5">
            {lib.uploads.map(u => {
              const Icon = itemIcon({ kind: "file", name: u.name });
              return (
                <span
                  key={u.key}
                  title={u.detail || u.name}
                  className={cn(
                    "lp-fade flex max-w-[240px] items-center gap-2 rounded-xl border py-1.5 pl-2 pr-1 text-[12.5px]",
                    u.status === "error" ? "border-lp-red/40 bg-lp-red/10 text-lp-red" : "border-lp-line bg-lp-raised/70 text-white",
                  )}
                >
                  {u.status === "error" ? <AlertCircle className="h-4 w-4 shrink-0" /> : u.status === "ready" ? (u.image ? <img src={u.image} alt="" className="h-6 w-6 shrink-0 rounded object-cover" /> : <Icon className="h-4 w-4 shrink-0 text-lp-sky" />) : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-lp-sky" />}
                  <span className="min-w-0 truncate">{u.name}</span>
                  <span className="shrink-0 text-[11px] text-lp-mute">{u.status === "uploading" ? "Uploading" : u.status === "reading" ? "Reading" : u.status === "error" ? "Failed" : ""}</span>
                  <button type="button" onClick={() => lib.clearUploads([u.key])} aria-label={`Remove ${u.name} from this message`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-lp-mute hover:bg-white/10 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
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
          onPaste={e => {
            const files = Array.from(e.clipboardData.files);
            if (files.length) { e.preventDefault(); addFiles(files); }
          }}
          rows={1}
          aria-label="Message Refyn"
          placeholder={readyUploads.length ? "Ask about your files, or send them as they are" : teacherMode && !resourceContext ? "Ask Refyn to plan, write or mark something, or type / for commands" : resourceContext ? `Ask about "${resourceContext.title}"…` : `Ask Refyn about ${activeSubjectData.name.toLowerCase()}, or type / for commands`}
          className="block max-h-[200px] min-h-[48px] w-full resize-none bg-transparent px-3.5 pb-1 pt-3 text-[15.5px] leading-relaxed text-white placeholder:text-lp-mute outline-none"
        />
        {dictation.listening && (
          <p className="lp-fade flex items-center gap-2 px-3.5 pb-1 text-[13px] text-lp-mute">
            <span className="h-2 w-2 animate-pulse rounded-full bg-lp-red" /> Listening{dictation.interim ? ":" : "…"} <span className="truncate italic text-lp-soft">{dictation.interim}</span>
          </p>
        )}
        <div className="flex items-end justify-between gap-2 px-1.5 pb-1 pt-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {/* Attach files */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Add files"
              title="Add files: PDF, Word, Excel, PowerPoint, CSV, images"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lp-soft transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Paperclip className="h-[18px] w-[18px]" />
            </button>
            {dictation.supported && (
              <button
                type="button"
                onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
                aria-label={dictation.listening ? "Stop listening" : "Speak your message"}
                aria-pressed={dictation.listening}
                title={dictation.listening ? "Stop listening" : "Speak your message"}
                className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors", dictation.listening ? "bg-lp-red/15 text-lp-red" : "text-lp-soft hover:bg-white/[0.06] hover:text-white")}
              >
                {dictation.listening && <span className="absolute inset-0 animate-ping rounded-full bg-lp-red/20" />}
                <Mic className="relative h-[18px] w-[18px]" />
              </button>
            )}
            {lib.items.length > 0 && (
              <button
                type="button"
                onClick={() => setPanel("files")}
                title="This chat's files and context"
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-lp-line px-2.5 text-[13px] font-medium text-lp-soft transition-colors hover:border-lp-blue/50 hover:text-white sm:px-3"
              >
                <LibraryIcon className="h-4 w-4 text-lp-sky" /> {lib.items.length}
              </button>
            )}
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
                <span className="hidden sm:inline">{activeSubjectData.name}</span>
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

            {/* Model + reasoning level */}
            <ModelPicker
              value={{ model: activeModel, effort: modelChoice.effort }}
              onChange={setModelChoice}
              access={modelAccess}
              onLocked={(m, reason) =>
                toast({
                  title: `${m.name} is locked`,
                  description:
                    reason === "school"
                      ? "Your school hasn't enabled this model. Ask your school admin."
                      : reason === "unavailable"
                        ? "The AI gateway doesn't serve this model for Refyn yet. We check again every few hours."
                        : "Premium-priced models come with the Premium plan.",
                })
              }
            />

            {/* Guided mode (process teaching) — students only */}
            {teacherMode ? (
              <span
                title="Teacher mode: Refyn writes complete materials, with answer keys, model answers and mark schemes"
                className="flex h-9 items-center gap-1.5 rounded-full border border-lp-green/40 bg-lp-green/10 px-3 text-[13px] font-medium text-lp-green"
              >
                <PenTool className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Teacher mode</span>
              </span>
            ) : (
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
            )}

            {/* The person's own Refyn data: deadlines, grades, classes, marking */}
            <button
              type="button"
              role="switch"
              aria-checked={useLive}
              onClick={() => setUseLive(!useLive)}
              title={useLive
                ? (teacherMode ? "Refyn can see your classes, assignments and marking queue. Click to turn off." : "Refyn can see your classes, deadlines and grades. Click to turn off.")
                : "Refyn can't see your Refyn data. Click to let it use your deadlines and classes."}
              className={cn("flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[13px] font-medium transition-colors sm:px-3", useLive ? "border-lp-sky/40 bg-lp-blue/10 text-lp-sky" : "border-lp-line text-lp-mute hover:text-white")}
            >
              <Radar className="h-4 w-4" /> <span className="hidden sm:inline">{useLive ? "My Refyn" : "Private"}</span>
            </button>

            {/* Skills that will shape this message */}
            {previewSkills.map(s => (
              <span key={s.slug} className="lp-fade hidden items-center gap-1 rounded-full border border-lp-cyan/30 bg-lp-cyan/10 px-2.5 py-1 text-[12px] text-lp-cyan md:flex" title={s.description}>
                <Puzzle className="h-3 w-3" /> {s.name}
              </span>
            ))}
          </div>

          {chatState === "sending" && !compacting ? (
            <button
              type="button"
              onClick={stopReply}
              aria-label="Stop"
              title="Stop"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#0B1220] shadow-[0_8px_24px_-8px_rgba(255,255,255,0.5)] transition-all hover:bg-white/90"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
          <button
            type="submit"
            disabled={chatState === "sending" || compacting || pendingUploads.length > 0 || (!prompt.trim() && !readyUploads.length)}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lp-blue text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,0.9)] transition-all hover:bg-[#2F6FE0] disabled:bg-lp-raised disabled:text-lp-mute disabled:shadow-none"
          >
            {chatState === "sending" || compacting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-[18px] w-[18px]" />}
          </button>
          )}
        </div>
      </div>
      <p className="mt-2.5 text-center text-[12px] text-lp-mute">
        {teacherMode ? "Teacher mode: Refyn plans and writes complete materials, answers included." : isProcessTeaching ? "Guided mode is on: Refyn helps you work it out." : "Direct mode: clear, detailed explanations."}{" "}
        Type <code className="text-lp-sky">/</code> for commands and <code className="text-lp-sky">@</code> for skills.
        <span className="hidden sm:inline"> AI can make mistakes, so double-check.</span>
      </p>
    </form>
  );

  const compactDivider = compact && (
    <div className="lp-fade rounded-2xl border border-lp-line bg-lp-surface/60 p-4">
      <button type="button" onClick={() => setShowSummary(v => !v)} className="flex w-full items-center gap-2 text-left text-[13px] text-lp-soft">
        <Layers className="h-4 w-4 text-lp-sky" />
        Earlier messages summarised to keep replies focused
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", showSummary && "rotate-180")} />
      </button>
      {showSummary && (
        <div className="lp-md mt-3 border-t border-lp-line pt-3 text-[14px]">
          <ReactMarkdown>{compact.summary}</ReactMarkdown>
        </div>
      )}
    </div>
  );

  return (
    <div className="lp-app relative z-[1] flex h-screen bg-lp-bg font-ui antialiased selection:bg-lp-blue/40 selection:text-white">
      {/* Desktop chat sidebar */}
      <aside
        className={cn(
          "lp-chrome hidden shrink-0 border-r border-lp-line bg-lp-deep transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block",
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
          "lp-chrome fixed bottom-0 left-0 top-0 z-50 w-[86%] max-w-[300px] border-r border-lp-line bg-lp-deep shadow-2xl transition-[transform,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          drawerOpen ? "translate-x-0" : "invisible -translate-x-full",
        )}
      >
        {sidebarBody(true)}
      </aside>

      <FeatureGate feature="aiAssistant" className="flex min-w-0 flex-1">
        <main
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden"
          onDragOver={e => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
          onDragLeave={e => { if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
        >
          {dragging && (
            <div className="pointer-events-none absolute inset-3 z-30 flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-lp-sky/60 bg-lp-deep/85 text-center backdrop-blur-sm">
              <UploadIcon className="h-8 w-8 text-lp-sky" />
              <p className="mt-3 text-[16px] font-medium text-white">Drop files to add them to this chat</p>
              <p className="mt-1 text-[13px] text-lp-mute">PDF, Word, Excel, PowerPoint, CSV, text and images</p>
            </div>
          )}
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
              <NotificationBell placement="header" />
              <UsageButton
                ctx={contextEstimate}
                userId={user?.id ?? null}
                sessionId={currentSessionId}
                refreshKey={messages.length}
                canCompact={messages.length >= 4}
                compacting={compacting}
                onCompact={() => compactChat()}
              />
              {tools.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.title} type="button" onClick={t.onClick} className={cn(iconBtn, "hidden sm:flex")} title={t.title} aria-label={t.title}>
                    <Icon className="h-4 w-4" />
                    {!!t.count && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lp-blue px-1 text-[10px] font-semibold text-white">
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
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
                  <span className="text-lp-mute">{teacherMode ? "What are we making today?" : "What are we working on?"}</span>
                </h2>
                <p className="lp-fade mt-4 max-w-[34rem] text-[15.5px] text-lp-soft" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
                  {teacherMode
                    ? "Plans, worksheets, quizzes with answer keys, rubrics, feedback and emails. Add your files and I'll build from them."
                    : isProcessTeaching
                      ? "Ask about anything you're studying. I'll guide you through the thinking, step by step."
                      : "Ask about anything you're studying and I'll explain it clearly."}
                </p>

                <div className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {(teacherMode ? TEACHER_STARTERS : STARTERS).map((s, i) => {
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

                <div className="lp-fade mt-6 flex flex-wrap items-center gap-2 text-[12.5px] text-lp-mute" style={{ animationDelay: "380ms", animationFillMode: "both" }}>
                  <span>Try</span>
                  {(teacherMode
                    ? [
                        { label: "/marking", run: () => setPrompt("/marking") },
                        { label: "/livequiz photosynthesis", run: () => setPrompt("/livequiz photosynthesis") },
                        { label: "Plan a lesson", run: () => applyStarter("Plan a 60-minute lesson on [topic] for [year group], with a starter, main activities, differentiation and an exit ticket.", "general") },
                        { label: "Make a worksheet", run: () => applyStarter("Make a worksheet on [topic] for [year group] with a mix of recall and extended questions, plus an answer key.", "general") },
                        { label: "Write a rubric", run: () => applyStarter("Write an MYP criterion-based rubric for [task], with descriptors for each band.", "general") },
                        { label: "Add files", run: () => fileInputRef.current?.click() },
                      ]
                    : [
                        { label: "/plan", run: () => setPrompt("/plan ") },
                        { label: "/graph y = sin(x)", run: () => setPrompt("/graph y = sin(x) and y = cos(x)") },
                        { label: "Plan my essay", run: () => applyStarter("Help me build an argument and an outline before I start writing.", "writing") },
                        { label: "Check my working", run: () => applyStarter("Look at how I solved a problem and show me where it went wrong.", "math") },
                        { label: "@essay-coach", run: () => setPrompt("@essay-coach ") },
                        { label: "Add files", run: () => fileInputRef.current?.click() },
                      ]
                  ).map(c => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => { c.run(); textareaRef.current?.focus(); }}
                      className="rounded-full border border-lp-line bg-lp-surface/60 px-3 py-1 text-lp-soft transition-colors hover:border-lp-blue/50 hover:text-white"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ─── Conversation ─── */
            <div className="relative min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
              <div className="mx-auto w-full max-w-[800px] space-y-8 py-6">
                {messages.map((msg, i) => msg.streaming && !msg.content ? null : (
                  <div key={msg.id} className="space-y-8">
                    {compact && compact.index === i && compactDivider}
                    {msg.role === "user" ? (
                      <div className="lp-fade flex flex-col items-end gap-1.5">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
                            {msg.attachments.map(name => {
                              const Icon = itemIcon({ kind: "file", name });
                              return (
                                <button key={name} type="button" onClick={() => setPanel("files")} className="flex max-w-[260px] items-center gap-2 rounded-xl border border-lp-line bg-lp-surface px-2.5 py-1.5 text-[12.5px] text-white hover:border-lp-blue/50">
                                  <Icon className="h-4 w-4 shrink-0 text-lp-sky" /> <span className="truncate">{name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-lp-blue px-5 py-3 text-[15px] leading-relaxed text-white shadow-[0_10px_30px_-12px_rgba(59,130,246,0.8)]">
                          {msg.content}
                        </p>
                        {msg.skills && msg.skills.length > 0 && (
                          <p className="flex flex-wrap justify-end gap-1.5 text-[11.5px] text-lp-mute">
                            Using
                            {msg.skills.map(s => (
                              <span key={s} className="inline-flex items-center gap-1 rounded-full border border-lp-cyan/30 bg-lp-cyan/10 px-2 text-lp-cyan">
                                <Puzzle className="h-3 w-3" /> {s}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="lp-fade group flex gap-4">
                        <RefynMark className="mt-0.5 h-9 w-9" />
                        <div className="min-w-0 flex-1">
                          {splitReply(msg.content).map((seg, k) =>
                            seg.type === "text" ? (
                              <div key={k} className="lp-md">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{seg.text}</ReactMarkdown>
                              </div>
                            ) : seg.type === "block" ? (
                              <BlockView
                                key={k}
                                kind={seg.kind}
                                attrs={seg.attrs}
                                body={seg.body}
                                complete={seg.complete}
                                teacher={teacherMode}
                                files={splitReply(msg.content).flatMap(s => (s.type === "file" && s.complete ? [s.file] : []))}
                                onAsk={p => { if (chatState !== "sending") sendPrompt(p); }}
                                onSave={(title, md) => { const id = saveToNotebook(md, title); setNotebookFocus(id); toast({ title: "Saved to your Notebook", description: title }); }}
                              />
                            ) : seg.type === "deck" && msg.streaming ? (
                              <p key={k} className="my-3 flex items-center gap-2 text-[13.5px] text-lp-soft"><Loader2 className="h-4 w-4 animate-spin text-lp-sky" /> Planning your presentation…</p>
                            ) : seg.type === "deck" ? (
                              <DeckCard
                                key={k}
                                deck={seg.deck}
                                userId={user?.id}
                                sessionId={currentSessionId}
                                canBuild={teacherMode}
                                autoStart={teacherMode && msg.fresh && !msg.streaming && i === messages.length - 1}
                              />
                            ) : (
                              <FileCard
                                key={k}
                                file={seg.file}
                                complete={seg.complete}
                                teacher={isTeacher}
                                onSaveToLibrary={async f => { await lib.addOutput(f, ensureSession); }}
                              />
                            ),
                          )}
                          {msg.streaming ? (
                            <span className="lp-dots mt-1 inline-flex items-center gap-1" aria-label="Still writing"><span /><span /><span /></span>
                          ) : (
                          <div className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1">
                            <div className={cn("flex items-center gap-0.5 transition-opacity focus-within:opacity-100 group-hover:opacity-100", i === messages.length - 1 ? "opacity-100" : "opacity-0")}>
                              <button
                                type="button"
                                onClick={() => copyMessage(msg)}
                                title={copiedId === msg.id ? "Copied" : "Copy"}
                                aria-label="Copy reply"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white"
                              >
                                {copiedId === msg.id ? <Check className="h-4 w-4 text-lp-green" /> : <Copy className="h-4 w-4" />}
                              </button>
                              {speaker.supported && (
                                <button
                                  type="button"
                                  onClick={() => (speaker.speaking === msg.id ? speaker.stop() : speaker.speak(msg.id, msg.content))}
                                  title={speaker.speaking === msg.id ? "Stop reading" : "Read aloud"}
                                  aria-label={speaker.speaking === msg.id ? "Stop reading" : "Read aloud"}
                                  className={cn("flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/[0.06] hover:text-white", speaker.speaking === msg.id ? "text-lp-sky" : "text-lp-mute")}
                                >
                                  {speaker.speaking === msg.id ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                </button>
                              )}
                              {i === messages.length - 1 && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setRetryMenu(v => !v)}
                                    disabled={chatState === "sending"}
                                    title="Try again"
                                    aria-label="Try again"
                                    aria-haspopup="menu"
                                    aria-expanded={retryMenu}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                  {retryMenu && (
                                    <>
                                      <div className="fixed inset-0 z-10" onClick={() => setRetryMenu(false)} />
                                      <div role="menu" className="lp-fade absolute bottom-10 left-0 z-20 w-64 rounded-2xl border border-lp-line bg-lp-deep p-1.5 shadow-2xl">
                                        <button type="button" role="menuitem" onClick={() => regenerate()} className="flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[13.5px] text-white hover:bg-white/[0.05]">
                                          <RotateCcw className="h-4 w-4 text-lp-sky" /> Try again
                                        </button>
                                        <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-lp-mute">Try with</p>
                                        {REFYN_PICKS.filter(p => p.model !== (msg.model ?? activeModel) && modelAccess?.models[p.model]?.reason !== "unavailable").map(p => {
                                          const m = findModel(p.model);
                                          const locked = modelAccess?.models[p.model]?.available === false;
                                          return (
                                            <button
                                              key={p.key}
                                              type="button"
                                              role="menuitem"
                                              disabled={locked}
                                              onClick={() => regenerate(p.model)}
                                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-45"
                                            >
                                              <span className="min-w-0 flex-1">
                                                <span className="block text-[13px] text-white">{p.name}</span>
                                                <span className="block text-[11.5px] text-lp-mute">{m?.name}{locked ? " · locked" : ""}</span>
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => saveMessageToNotebook(msg)}
                                title="Save to notebook"
                                aria-label="Save to notebook"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white"
                              >
                                <BookMarked className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const heading = msg.content.match(/^#{1,3}\s+(.+)$/m)?.[1];
                                  try {
                                    await lib.addText("message", heading ? heading.slice(0, 80) : `Reply from ${format(msg.timestamp, "d MMM, p")}`, msg.content, ensureSession);
                                    toast({ title: "Added to this chat's files", description: "Refyn will keep it in mind for the rest of the chat." });
                                  } catch (e) {
                                    toast({ title: "Couldn't add it", description: (e as Error).message, variant: "destructive" });
                                  }
                                }}
                                title="Keep in this chat's files"
                                aria-label="Keep in this chat's files"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white"
                              >
                                <LibraryIcon className="h-4 w-4" />
                              </button>
                            </div>
                            {msg.model && <PoweredBy model={msg.model} effort={msg.effort} className="ml-1" />}
                            {msg.live && (
                              <span
                                title={msg.live.role === "teacher"
                                  ? `Read your ${msg.live.classes} class${msg.live.classes === 1 ? "" : "es"}, ${msg.live.assignments} recent assignment${msg.live.assignments === 1 ? "" : "s"}${typeof msg.live.waiting === "number" ? ` and ${msg.live.waiting} waiting to be marked` : ""}`
                                  : `Read your ${msg.live.classes} class${msg.live.classes === 1 ? "" : "es"}, ${msg.live.assignments} upcoming or late assignment${msg.live.assignments === 1 ? "" : "s"}, recent grades and ${msg.live.events} school event${msg.live.events === 1 ? "" : "s"}`}
                                className="ml-1 flex items-center gap-1 rounded-full border border-lp-line px-2 py-0.5 text-[11.5px] text-lp-mute"
                              >
                                <Radar className="h-3 w-3 text-lp-sky" /> Knew your Refyn
                              </span>
                            )}
                            {msg.library && msg.library.used > 0 && (
                              <button
                                type="button"
                                onClick={() => setPanel("files")}
                                title={msg.library.names?.join(", ")}
                                className="ml-1 flex items-center gap-1 rounded-full border border-lp-line px-2 py-0.5 text-[11.5px] text-lp-mute hover:text-white"
                              >
                                <LibraryIcon className="h-3 w-3 text-lp-sky" />
                                {msg.library.mode === "full"
                                  ? `Read ${msg.library.used} file${msg.library.used === 1 ? "" : "s"}`
                                  : `Searched ${msg.library.items} files, used ${msg.library.used}`}
                              </button>
                            )}
                            {msg.pastPapers && msg.pastPapers.length > 0 && (
                              <Link
                                to="/past-papers"
                                title={msg.pastPapers.join("\n")}
                                className="ml-1 flex items-center gap-1 rounded-full border border-lp-line px-2 py-0.5 text-[11.5px] text-lp-mute hover:text-white"
                              >
                                <FileStack className="h-3 w-3 text-lp-sky" />
                                {`Used ${msg.pastPapers.length} past paper${msg.pastPapers.length === 1 ? "" : "s"}`}
                              </Link>
                            )}
                          </div>
                          )}
                          {msg.notice && !msg.streaming && <p className="mt-1 text-[12px] text-[#FBBF24]/90">{msg.notice}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {compact && compact.index >= messages.length && compactDivider}
                {((chatState === "sending" && !messages.some(m => m.streaming && m.content)) || compacting) && (
                  <div className="lp-fade flex items-center gap-4">
                    <RefynMark className="h-9 w-9" />
                    <div className="flex items-center gap-3 text-[14px] text-lp-soft">
                      <span className="lp-dots flex items-center gap-1"><span /><span /><span /></span>
                      {compacting
                        ? "Summarising this chat…"
                        : `${findModel(pendingModel ?? activeModel)?.name ?? "Refyn"} is ${!teacherMode && isProcessTeaching ? "working out how to guide you" : "thinking"}…`}
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

      <SkillsPanel open={panel === "skills"} onClose={() => setPanel(null)} installed={installedSkills} onToggle={toggleSkill} />
      <NotebookPanel
        open={panel === "notebook"}
        onClose={() => setPanel(null)}
        entries={notebook}
        focusId={notebookFocus}
        onDelete={id => setNotebook(prev => prev.filter(e => e.id !== id))}
      />
      <CommandsPanel
        open={panel === "commands"}
        onClose={() => setPanel(null)}
        onPick={c => { setPanel(null); setPrompt(`/${c.name}${c.takesInput ? " " : ""}`); textareaRef.current?.focus(); }}
        teacher={teacherMode}
      />
      <LibraryPanel
        open={panel === "files"}
        onClose={() => setPanel(null)}
        items={lib.items}
        uploads={lib.uploads}
        loading={lib.loading}
        available={lib.available}
        modelPrice={findModel(activeModel)?.price.input ?? 0.3}
        teacher={isTeacher}
        onUpload={() => fileInputRef.current?.click()}
        onDrive={importFromDrive}
        onAddNote={async (name, text) => {
          try {
            await lib.addText("note", name, text, ensureSession);
            loadSessions();
          } catch (e) {
            toast({ title: "Couldn't save the note", description: (e as Error).message, variant: "destructive" });
          }
        }}
        onRemove={item => lib.remove(item)}
        onTogglePin={item => lib.togglePin(item)}
        onDownload={item => lib.download(item).catch(e => toast({ title: "Couldn't download", description: (e as Error).message, variant: "destructive" }))}
        onPreview={item => lib.readText(item)}
        loadOthers={lib.fromOtherChats}
        onCopy={async item => {
          try { await lib.copyFrom(item, ensureSession); } catch (e) { toast({ title: "Couldn't add it", description: (e as Error).message, variant: "destructive" }); }
        }}
      />
      <ArchivedPanel
        open={panel === "archived"}
        onClose={() => setPanel(null)}
        sessions={archivedSessions}
        onRestore={id => setArchived(prev => prev.filter(x => x !== id))}
        onOpen={id => { setPanel(null); loadSession(id); }}
      />
    </div>
  );
};

export default StudentInterface;
