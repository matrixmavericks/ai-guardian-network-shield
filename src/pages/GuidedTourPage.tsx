import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Play, Pause, RotateCcw, Sparkles, X, MousePointerClick,
  GraduationCap, Users, Shield, Heart, TrendingUp, MessageSquare, BookOpen,
  Briefcase, Settings, Brain, Layers, Radar, FlaskConical, DollarSign, Building2,
  Activity, Send, ChevronRight, CheckCircle2, AlertTriangle, Lightbulb, Plus,
  Search, Bell, Compass, Trophy, Mail, Star, Zap, Network, Calendar,
} from "lucide-react";

/* ============================================================================
   GUIDED TOUR — /tour
   Arcade-style interactive product walkthrough. Each role has a scripted flow
   that drives a high-fidelity (real-looking) Refyn dashboard. Spotlight pins
   anchor to actual DOM elements via data-tour-id, dim the rest of the screen,
   and advance the app state when clicked.
   ============================================================================ */

type Role = "student" | "teacher" | "admin" | "parent";

type ViewId =
  | "s-dash" | "s-chat" | "s-paths" | "s-path-detail" | "s-portfolio" | "s-badges"
  | "t-dash" | "t-class" | "t-mapper" | "t-studio" | "t-marketplace"
  | "a-overview" | "a-atc" | "a-policy" | "a-budget"
  | "p-dash";

type AppState = {
  view: ViewId;
  // chat
  chatMessages: { role: "user" | "ai"; text: string }[];
  chatComposer: string;
  // paths
  pathOpen: number | null;
  moduleDone: number[];
  // portfolio
  portfolioShared: boolean;
  // teacher
  classExpanded: string | null;
  mapperCell: number | null;
  // admin
  policyStrictness: number; // 0-100
  budgetSlider: number;     // 0-100
  alertOpen: boolean;
};

const INITIAL: AppState = {
  view: "s-dash",
  chatMessages: [],
  chatComposer: "",
  pathOpen: null,
  moduleDone: [],
  portfolioShared: false,
  classExpanded: null,
  mapperCell: null,
  policyStrictness: 50,
  budgetSlider: 50,
  alertOpen: false,
};

type Step = {
  id: string;
  view: ViewId;
  title: string;
  body: string;
  target: string;                    // data-tour-id of element to spotlight
  placement?: "top" | "bottom" | "left" | "right" | "auto";
  cta?: string;
  apply?: (s: AppState) => AppState; // mutation when arriving
  onAdvance?: (s: AppState) => AppState; // mutation when user clicks Next/spotlight
};

/* ────────────────────────────────────────────────────────────────────────────
   ROLE META
   ──────────────────────────────────────────────────────────────────────────── */
const ROLE_META: Record<Role, { label: string; icon: React.ReactNode; accent: string; ring: string }> = {
  student: { label: "Student", icon: <GraduationCap className="w-4 h-4" />, accent: "from-emerald-500 to-cyan-500", ring: "ring-emerald-400/60" },
  teacher: { label: "Teacher", icon: <Users className="w-4 h-4" />,         accent: "from-violet-500 to-fuchsia-500", ring: "ring-violet-400/60" },
  admin:   { label: "Admin",   icon: <Shield className="w-4 h-4" />,        accent: "from-amber-500 to-rose-500", ring: "ring-amber-400/60" },
  parent:  { label: "Parent",  icon: <Heart className="w-4 h-4" />,         accent: "from-sky-500 to-indigo-500", ring: "ring-sky-400/60" },
};

/* ────────────────────────────────────────────────────────────────────────────
   FLOWS
   ──────────────────────────────────────────────────────────────────────────── */
const STUDENT_FLOW: Step[] = [
  {
    id: "s-1", view: "s-dash",
    title: "Welcome — Student Dashboard",
    body: "This is the first thing every student sees. Continue your active learning path, see your week at a glance, and earn IB Learner Profile badges from real work.",
    target: "s-continue", placement: "right", cta: "Show me the sidebar",
  },
  {
    id: "s-2", view: "s-dash",
    title: "Everything in one click",
    body: "The sidebar is your map. AI Chat, Learning Paths, Portfolio, Classes — all anchored on the left so you never get lost.",
    target: "nav-s-chat", placement: "right", cta: "Open AI Chat",
    onAdvance: (s) => ({ ...s, view: "s-chat" }),
  },
  {
    id: "s-3", view: "s-chat",
    title: "Process Teaching Mode",
    body: "The AI will not give you the answer. It asks the next question that moves your thinking forward — like a great tutor.",
    target: "s-chat-badge", placement: "bottom", cta: "Send a question",
    onAdvance: (s) => ({
      ...s,
      chatMessages: [{ role: "user", text: "How do I solve x² − 5x + 6 = 0?" }],
    }),
  },
  {
    id: "s-4", view: "s-chat",
    title: "Guided, not given",
    body: "Watch — instead of the answer, the AI asks a question that unlocks your reasoning. Every reply ends with a hint, check, or question.",
    target: "s-chat-stream", placement: "left", cta: "Reply with my idea",
    onAdvance: (s) => ({
      ...s,
      chatMessages: [
        ...s.chatMessages,
        { role: "ai", text: "Great question — let's not skip to the answer. What two numbers multiply to 6 and add to −5?" },
        { role: "user", text: "Maybe −2 and −3?" },
        { role: "ai", text: "Yes! So how can you rewrite the equation as a product of two brackets?" },
      ],
    }),
  },
  {
    id: "s-5", view: "s-chat",
    title: "Jump into a Learning Path",
    body: "Every chat suggests a path. AI-generated, mapped to your real gaps, with persistent progress.",
    target: "nav-s-paths", placement: "right", cta: "Open Learning Paths",
    onAdvance: (s) => ({ ...s, view: "s-paths" }),
  },
  {
    id: "s-6", view: "s-paths",
    title: "Your active paths",
    body: "Each path is built from YOUR gaps. Click one to open module-by-module: concept → practice → reflect.",
    target: "s-path-card-0", placement: "right", cta: "Open Energy & Work",
    onAdvance: (s) => ({ ...s, view: "s-path-detail", pathOpen: 0 }),
  },
  {
    id: "s-7", view: "s-path-detail",
    title: "Tap a module to complete it",
    body: "Modules unlock as you go. Progress persists across devices, and reflections feed your Learner Profile badges.",
    target: "s-module-0", placement: "right", cta: "Mark module complete",
    onAdvance: (s) => ({ ...s, moduleDone: [...s.moduleDone, 0] }),
  },
  {
    id: "s-8", view: "s-path-detail",
    title: "Your Portfolio collects evidence",
    body: "Reflections, lab reports, group projects — all auto-collected into a shareable portfolio.",
    target: "nav-s-portfolio", placement: "right", cta: "Open Portfolio",
    onAdvance: (s) => ({ ...s, view: "s-portfolio" }),
  },
  {
    id: "s-9", view: "s-portfolio",
    title: "Share with anyone",
    body: "Generate a public link (refyntech.us/p/…) that bypasses the preview auth — perfect for university applications.",
    target: "s-portfolio-share", placement: "left", cta: "Share my portfolio",
    onAdvance: (s) => ({ ...s, portfolioShared: true }),
  },
];

const TEACHER_FLOW: Step[] = [
  {
    id: "t-1", view: "t-dash",
    title: "Mission Control",
    body: "Every class as a tile. The Risk Radar rolls up real AI interactions into a green/amber/red readiness score.",
    target: "t-radar", placement: "bottom", cta: "Click the red class",
    onAdvance: (s) => ({ ...s, classExpanded: "12 HL", view: "t-class" }),
  },
  {
    id: "t-2", view: "t-class",
    title: "Why is it red?",
    body: "Refyn shows the three students driving the score, the topics they're stuck on, and a one-click suggested intervention.",
    target: "t-class-insight", placement: "left", cta: "See IB coverage",
    onAdvance: (s) => ({ ...s, view: "t-mapper" }),
  },
  {
    id: "t-3", view: "t-mapper",
    title: "IB Standards Auto-Mapper",
    body: "Every AI chat and assignment is auto-tagged to IB guides. The heatmap shows coverage per unit — green strong, red blind spots.",
    target: "t-mapper-grid", placement: "top", cta: "Click a thin cell",
    onAdvance: (s) => ({ ...s, mapperCell: 7 }),
  },
  {
    id: "t-4", view: "t-mapper",
    title: "Drill into evidence",
    body: "Clicking a cell surfaces the exact chats, paths, and artefacts that earned (or didn't earn) that coverage.",
    target: "t-mapper-evidence", placement: "left", cta: "Open Subject Studio",
    onAdvance: (s) => ({ ...s, view: "t-studio" }),
  },
  {
    id: "t-5", view: "t-studio",
    title: "Subject Studios",
    body: "Specialist AI tools curated for your subject — Physics IA reviewer, Math notation stepper, Econ data response trainer.",
    target: "t-studio-list", placement: "right", cta: "Browse Marketplace",
    onAdvance: (s) => ({ ...s, view: "t-marketplace" }),
  },
  {
    id: "t-6", view: "t-marketplace",
    title: "Recipe Marketplace",
    body: "Teachers worldwide publish prompt recipes. Browse, rate, fork, and run them with one tap.",
    target: "t-recipe-0", placement: "right", cta: "Done — explore freely",
  },
];

const ADMIN_FLOW: Step[] = [
  {
    id: "a-1", view: "a-overview",
    title: "Whole-school pulse",
    body: "Live counters for students, prompts, bypass attempts, and budget — no hunting through dashboards.",
    target: "a-kpis", placement: "bottom", cta: "Watch a live incident",
    onAdvance: (s) => ({ ...s, alertOpen: true }),
  },
  {
    id: "a-2", view: "a-overview",
    title: "Auto-flagged incidents",
    body: "Refyn surfaces moments worth a human look — bypass attempts, off-policy prompts, anomalous sessions.",
    target: "a-alert", placement: "left", cta: "Open Air-Traffic Control",
    onAdvance: (s) => ({ ...s, view: "a-atc", alertOpen: false }),
  },
  {
    id: "a-3", view: "a-atc",
    title: "Air-Traffic Control",
    body: "Every active class as a live tile. Hover for the live transcript. Red tiles auto-page you.",
    target: "a-atc-grid", placement: "top", cta: "Try the Policy Sandbox",
    onAdvance: (s) => ({ ...s, view: "a-policy" }),
  },
  {
    id: "a-4", view: "a-policy",
    title: "Policy Sandbox — What If?",
    body: "Move the strictness slider — Refyn simulates the impact against the last 30 days of real traffic.",
    target: "a-policy-slider", placement: "bottom", cta: "Crank strictness up",
    onAdvance: (s) => ({ ...s, policyStrictness: 85 }),
  },
  {
    id: "a-5", view: "a-policy",
    title: "Projected impact",
    body: "Engagement, bypass, spend, teacher load — all re-simulated live. Ship the change with confidence.",
    target: "a-policy-impact", placement: "left", cta: "Open Budget Optimizer",
    onAdvance: (s) => ({ ...s, view: "a-budget" }),
  },
  {
    id: "a-6", view: "a-budget",
    title: "Budget Optimizer",
    body: "Refyn proposes the cheapest model routing that preserves quality — every prompt is metered and audited.",
    target: "a-budget-slider", placement: "bottom", cta: "Done — explore freely",
    onAdvance: (s) => ({ ...s, budgetSlider: 78 }),
  },
];

const PARENT_FLOW: Step[] = [
  {
    id: "p-1", view: "p-dash",
    title: "A filtered window into your child's week",
    body: "Never raw transcripts. Sessions, subjects covered, and a gentle wellbeing read derived from interaction signals.",
    target: "p-summary", placement: "bottom", cta: "Read the weekly brief",
  },
  {
    id: "p-2", view: "p-dash",
    title: "Multilingual weekly brief",
    body: "Auto-translated into your family's preferred language, with one suggested at-home conversation.",
    target: "p-brief", placement: "left", cta: "Done — explore freely",
  },
];

const FLOWS: Record<Role, Step[]> = {
  student: STUDENT_FLOW,
  teacher: TEACHER_FLOW,
  admin: ADMIN_FLOW,
  parent: PARENT_FLOW,
};

/* ────────────────────────────────────────────────────────────────────────────
   APP SHELL — sidebar + topbar mirroring the real Refyn app
   ──────────────────────────────────────────────────────────────────────────── */

type NavItem = { id: string; label: string; icon: React.ReactNode; targetView?: ViewId };

const STUDENT_NAV: NavItem[] = [
  { id: "nav-s-dash",      label: "Dashboard",      icon: <TrendingUp className="w-4 h-4" />,    targetView: "s-dash" },
  { id: "nav-s-chat",      label: "AI Assistant",   icon: <Brain className="w-4 h-4" />,         targetView: "s-chat" },
  { id: "nav-s-paths",     label: "Learning Paths", icon: <BookOpen className="w-4 h-4" />,      targetView: "s-paths" },
  { id: "nav-s-courses",   label: "My Courses",     icon: <GraduationCap className="w-4 h-4" /> },
  { id: "nav-s-portfolio", label: "Portfolio",      icon: <Briefcase className="w-4 h-4" />,     targetView: "s-portfolio" },
  { id: "nav-s-classes",   label: "Classes",        icon: <Users className="w-4 h-4" /> },
  { id: "nav-s-messages",  label: "Messages",       icon: <MessageSquare className="w-4 h-4" /> },
  { id: "nav-s-settings",  label: "Settings",       icon: <Settings className="w-4 h-4" /> },
];
const TEACHER_NAV: NavItem[] = [
  { id: "nav-t-dash",        label: "Overview",       icon: <TrendingUp className="w-4 h-4" />,   targetView: "t-dash" },
  { id: "nav-t-classes",     label: "Classes",        icon: <Users className="w-4 h-4" />,        targetView: "t-class" },
  { id: "nav-t-plans",       label: "Teaching Plans", icon: <Layers className="w-4 h-4" /> },
  { id: "nav-t-studio",      label: "Studio",         icon: <FlaskConical className="w-4 h-4" />, targetView: "t-studio" },
  { id: "nav-t-marketplace", label: "Marketplace",    icon: <Sparkles className="w-4 h-4" />,     targetView: "t-marketplace" },
  { id: "nav-t-mapper",      label: "IB Mapper",      icon: <Network className="w-4 h-4" />,      targetView: "t-mapper" },
  { id: "nav-t-radar",       label: "Risk Radar",     icon: <Radar className="w-4 h-4" /> },
  { id: "nav-t-messages",    label: "Messages",       icon: <MessageSquare className="w-4 h-4" /> },
];
const ADMIN_NAV: NavItem[] = [
  { id: "nav-a-over",   label: "Overview",       icon: <TrendingUp className="w-4 h-4" />,  targetView: "a-overview" },
  { id: "nav-a-schools",label: "Schools",        icon: <Building2 className="w-4 h-4" /> },
  { id: "nav-a-users",  label: "Users",          icon: <Users className="w-4 h-4" /> },
  { id: "nav-a-gov",    label: "AI Governance",  icon: <Shield className="w-4 h-4" /> },
  { id: "nav-a-atc",    label: "Air-Traffic",    icon: <Activity className="w-4 h-4" />,    targetView: "a-atc" },
  { id: "nav-a-policy", label: "Policy Sandbox", icon: <FlaskConical className="w-4 h-4" />, targetView: "a-policy" },
  { id: "nav-a-budget", label: "Budget",         icon: <DollarSign className="w-4 h-4" />,  targetView: "a-budget" },
  { id: "nav-a-set",    label: "Settings",       icon: <Settings className="w-4 h-4" /> },
];
const PARENT_NAV: NavItem[] = [
  { id: "nav-p-dash",   label: "Dashboard", icon: <TrendingUp className="w-4 h-4" />, targetView: "p-dash" },
  { id: "nav-p-usage",  label: "Child Usage", icon: <Activity className="w-4 h-4" /> },
  { id: "nav-p-brief",  label: "Briefings",   icon: <Mail className="w-4 h-4" /> },
  { id: "nav-p-msg",    label: "Messages",    icon: <MessageSquare className="w-4 h-4" /> },
];

const NAV: Record<Role, NavItem[]> = {
  student: STUDENT_NAV, teacher: TEACHER_NAV, admin: ADMIN_NAV, parent: PARENT_NAV,
};

const AppShell: React.FC<{
  role: Role;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  children: React.ReactNode;
}> = ({ role, state, setState, children }) => {
  const nav = NAV[role];
  const accent = ROLE_META[role].accent;
  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 bg-[#0a0f1f] text-slate-200 flex shadow-2xl">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/10 bg-black/50 flex flex-col">
        <div className="px-4 py-4 flex items-center gap-2 border-b border-white/5">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent} grid place-items-center text-sm font-bold text-white shadow-md`}>R</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Refyn</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Governance OS</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          <div className="px-4 text-[10px] uppercase tracking-widest text-slate-500 mb-1">Core</div>
          {nav.map(item => {
            const isActive = item.targetView === state.view;
            return (
              <button
                key={item.id}
                data-tour-id={item.id}
                onClick={() => item.targetView && setState(s => ({ ...s, view: item.targetView! }))}
                className={`group w-full text-left px-4 py-2 flex items-center gap-2.5 text-[13px] transition relative
                  ${isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
              >
                {isActive && <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-r bg-gradient-to-b ${accent}`} />}
                <span className={isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-2 p-2 rounded-md bg-white/5">
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${accent} grid place-items-center text-[11px] font-bold text-white`}>
              {role === "student" ? "DA" : role === "teacher" ? "MS" : role === "admin" ? "AD" : "PA"}
            </div>
            <div className="leading-tight min-w-0 flex-1">
              <div className="text-xs font-semibold truncate text-white">
                {role === "student" ? "Demo Student" : role === "teacher" ? "Ms. Sample" : role === "admin" ? "Pilot Admin" : "Parent Demo"}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-black/40 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="capitalize">{role}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-200">{viewLabel(state.view)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="bg-white/5 border border-white/10 rounded pl-7 pr-2 py-1 text-xs w-44 placeholder:text-slate-600" placeholder="Search…" readOnly />
            </div>
            <button className="relative p-1.5 rounded hover:bg-white/5">
              <Bell className="w-4 h-4 text-slate-400" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-400" />
            </button>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-slate-400">Live · synthetic data</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-5 bg-gradient-to-br from-[#0a0f1f] via-[#0b1126] to-[#0a0f1f]">
          {children}
        </main>
      </div>
    </div>
  );
};

const viewLabel = (v: ViewId): string => ({
  "s-dash": "Dashboard", "s-chat": "AI Assistant", "s-paths": "Learning Paths",
  "s-path-detail": "Energy & Work", "s-portfolio": "Portfolio", "s-badges": "Badges",
  "t-dash": "Overview", "t-class": "Class · 12 HL Physics", "t-mapper": "IB Mapper",
  "t-studio": "Studio", "t-marketplace": "Recipe Marketplace",
  "a-overview": "Overview", "a-atc": "Air-Traffic Control", "a-policy": "Policy Sandbox",
  "a-budget": "Budget Optimizer", "p-dash": "Dashboard",
}[v]);

/* ────────────────────────────────────────────────────────────────────────────
   UI PRIMITIVES
   ──────────────────────────────────────────────────────────────────────────── */
const Panel: React.FC<{ className?: string; children: React.ReactNode; id?: string; tourId?: string }> = ({ className = "", children, id, tourId }) => (
  <div id={id} data-tour-id={tourId} className={`rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-4 shadow-lg ${className}`}>
    {children}
  </div>
);

const Eyebrow: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = "text-slate-400" }) => (
  <div className={`text-[10px] uppercase tracking-[0.18em] font-semibold ${color}`}>{children}</div>
);

const Bar: React.FC<{ w: string; c?: string }> = ({ w, c = "bg-emerald-500" }) => (
  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
    <div className={`h-full ${c} transition-all duration-700`} style={{ width: w }} />
  </div>
);

/* ────────────────────────────────────────────────────────────────────────────
   VIEWS
   ──────────────────────────────────────────────────────────────────────────── */

// --- STUDENT ---------------------------------------------------------------
const StudentDashboard: React.FC<{ state: AppState }> = ({ state }) => (
  <div className="grid grid-cols-6 gap-4">
    <Panel className="col-span-4" tourId="s-continue">
      <Eyebrow color="text-emerald-300">Continue learning</Eyebrow>
      <div className="mt-1 flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-white">Physics · Kinematics</div>
          <div className="text-xs text-slate-400 mt-1">Module 4 of 7 · last opened 12 min ago</div>
        </div>
        <button className="text-xs px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold inline-flex items-center gap-1">
          Resume <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="mt-4"><Bar w="62%" /></div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { t: "Concept", d: "Velocity vs speed", icon: <Lightbulb className="w-3.5 h-3.5" /> },
          { t: "Practice", d: "5 problems", icon: <Zap className="w-3.5 h-3.5" /> },
          { t: "Reflect", d: "1 prompt", icon: <Brain className="w-3.5 h-3.5" /> },
        ].map(s => (
          <div key={s.t} className="rounded-lg border border-white/10 bg-black/30 p-2.5">
            <div className="flex items-center gap-1.5 text-emerald-300 text-[10px] uppercase tracking-wider">{s.icon}{s.t}</div>
            <div className="text-xs text-slate-300 mt-1">{s.d}</div>
          </div>
        ))}
      </div>
    </Panel>

    <Panel className="col-span-2">
      <Eyebrow color="text-cyan-300">IB Learner Profile</Eyebrow>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[
          { n: "Inquirer", c: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30" },
          { n: "Thinker", c: "bg-cyan-500/20 text-cyan-200 border-cyan-500/30" },
          { n: "Comm.", c: "bg-violet-500/20 text-violet-200 border-violet-500/30" },
          { n: "Risk", c: "bg-white/5 text-slate-500 border-white/10" },
          { n: "Caring", c: "bg-white/5 text-slate-500 border-white/10" },
          { n: "Open", c: "bg-white/5 text-slate-500 border-white/10" },
        ].map(b => (
          <div key={b.n} className={`text-[10px] text-center px-1 py-2 rounded border ${b.c}`}>{b.n}</div>
        ))}
      </div>
      <div className="text-[10px] text-slate-500 mt-2">3 of 10 earned · keep going</div>
    </Panel>

    <Panel className="col-span-4">
      <div className="flex items-center justify-between mb-3">
        <Eyebrow>This week</Eyebrow>
        <div className="text-[10px] text-slate-500">M T W T F S S</div>
      </div>
      <div className="h-24 flex items-end gap-2">
        {[40, 60, 30, 80, 55, 70, 45].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t bg-gradient-to-t from-cyan-500/60 to-emerald-400/80" style={{ height: `${h}%` }} />
            <div className="text-[9px] text-slate-500">{["M","T","W","T","F","S","S"][i]}</div>
          </div>
        ))}
      </div>
    </Panel>

    <Panel className="col-span-2">
      <Eyebrow>Quick start</Eyebrow>
      <div className="mt-2 space-y-1.5">
        {[
          { t: "Ask the AI", i: <Brain className="w-3.5 h-3.5 text-emerald-300" /> },
          { t: "Open a path", i: <Compass className="w-3.5 h-3.5 text-cyan-300" /> },
          { t: "Join a class", i: <Users className="w-3.5 h-3.5 text-violet-300" /> },
        ].map(s => (
          <button key={s.t} className="w-full text-left px-2.5 py-2 rounded-md bg-white/5 hover:bg-white/10 text-xs flex items-center gap-2">
            {s.i}{s.t}
          </button>
        ))}
      </div>
    </Panel>
  </div>
);

const StudentChat: React.FC<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => (
  <div className="h-full grid grid-cols-[1fr_240px] gap-4">
    <Panel className="flex flex-col h-[520px]">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 grid place-items-center text-xs font-bold text-white">R</div>
          <div>
            <div className="text-sm font-semibold">Refyn AI</div>
            <div className="text-[10px] text-emerald-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Process Teaching · Math
            </div>
          </div>
        </div>
        <div data-tour-id="s-chat-badge" className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
          PT MODE ON
        </div>
      </div>

      <div data-tour-id="s-chat-stream" className="flex-1 overflow-y-auto py-4 space-y-3">
        {state.chatMessages.length === 0 && (
          <div className="text-center text-xs text-slate-500 mt-12">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Ask anything — the AI will guide your thinking.
          </div>
        )}
        {state.chatMessages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1`}>
            <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed
              ${m.role === "user"
                ? "bg-white/10 text-slate-100 rounded-br-sm"
                : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-50 rounded-bl-sm"}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 pt-3 flex items-center gap-2">
        <div className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-500">
          Show your reasoning…
        </div>
        <button className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </Panel>

    <div className="space-y-3">
      <Panel>
        <Eyebrow color="text-cyan-300">Suggested paths</Eyebrow>
        <div className="mt-2 space-y-1.5">
          {["Factoring quadratics", "Completing the square", "Discriminant"].map(p => (
            <div key={p} className="text-xs px-2 py-1.5 rounded bg-white/5 flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-cyan-300" />{p}
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <Eyebrow>Session</Eyebrow>
        <div className="mt-2 text-xs text-slate-400">Tokens used</div>
        <div className="text-lg font-semibold text-white">142 <span className="text-xs text-slate-500">/ 1k</span></div>
      </Panel>
    </div>
  </div>
);

const StudentPaths: React.FC<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-xl font-bold text-white">Learning Paths</div>
        <div className="text-xs text-slate-400">AI-generated from your gaps</div>
      </div>
      <button className="text-xs px-3 py-1.5 rounded-md bg-emerald-500 text-emerald-950 font-semibold inline-flex items-center gap-1">
        <Plus className="w-3 h-3" /> Generate new
      </button>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {[
        { t: "Energy & Work", s: "In progress", p: 62, c: "from-emerald-500 to-cyan-500", icon: <Zap className="w-4 h-4" /> },
        { t: "Waves", s: "Next up", p: 30, c: "from-cyan-500 to-sky-500", icon: <Activity className="w-4 h-4" /> },
        { t: "Electricity & Magnetism", s: "Not started", p: 0, c: "from-violet-500 to-fuchsia-500", icon: <Sparkles className="w-4 h-4" /> },
      ].map((p, i) => (
        <button
          key={p.t}
          data-tour-id={`s-path-card-${i}`}
          onClick={() => setState(s => ({ ...s, view: "s-path-detail", pathOpen: i }))}
          className="text-left rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/20 hover:bg-white/[0.05] transition group"
        >
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${p.c} grid place-items-center text-white mb-3`}>{p.icon}</div>
          <div className="text-sm font-semibold text-white">{p.t}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{p.s}</div>
          <div className="mt-3"><Bar w={`${p.p}%`} c={`bg-gradient-to-r ${p.c}`} /></div>
          <div className="mt-2 text-[10px] text-slate-400">{4 + i} modules</div>
        </button>
      ))}
    </div>
  </div>
);

const StudentPathDetail: React.FC<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => {
  const modules = [
    { t: "Defining work and energy", d: "Concept · 8 min" },
    { t: "Kinetic & potential energy", d: "Concept · 12 min" },
    { t: "Conservation problems", d: "Practice · 5 problems" },
    { t: "Reflection: where do you struggle?", d: "Reflect · 3 prompts" },
  ];
  return (
    <div>
      <button onClick={() => setState(s => ({ ...s, view: "s-paths" }))} className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="w-3 h-3" /> Back to paths
      </button>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 p-5 mb-4">
            <Eyebrow color="text-emerald-300">Active path</Eyebrow>
            <div className="text-2xl font-bold text-white mt-1">Energy & Work</div>
            <div className="text-xs text-slate-400 mt-1">4 modules · ~45 min · Physics HL</div>
            <div className="mt-3"><Bar w={`${(state.moduleDone.length / modules.length) * 100}%`} c="bg-gradient-to-r from-emerald-400 to-cyan-400" /></div>
          </div>
          <div className="space-y-2">
            {modules.map((m, i) => {
              const done = state.moduleDone.includes(i);
              return (
                <button
                  key={i}
                  data-tour-id={`s-module-${i}`}
                  onClick={() => setState(s => ({ ...s, moduleDone: done ? s.moduleDone.filter(x => x !== i) : [...s.moduleDone, i] }))}
                  className={`w-full text-left rounded-lg border p-3 flex items-center gap-3 transition
                    ${done ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                >
                  <div className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold
                    ${done ? "bg-emerald-500 text-emerald-950" : "bg-white/10 text-slate-300"}`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{m.t}</div>
                    <div className="text-[10px] text-slate-500">{m.d}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              );
            })}
          </div>
        </div>
        <Panel>
          <Eyebrow>Reflection</Eyebrow>
          <div className="mt-2 text-xs text-slate-300 leading-relaxed">
            "What surprised you about how energy is conserved in a swinging pendulum?"
          </div>
          <div className="mt-3 text-[10px] text-slate-500">Auto-saved to your Portfolio</div>
        </Panel>
      </div>
    </div>
  );
};

const StudentPortfolio: React.FC<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-xl font-bold text-white">Portfolio</div>
        <div className="text-xs text-slate-400">Your evidence wall</div>
      </div>
      <button
        data-tour-id="s-portfolio-share"
        onClick={() => setState(s => ({ ...s, portfolioShared: !s.portfolioShared }))}
        className={`text-xs px-3 py-1.5 rounded-md font-semibold inline-flex items-center gap-1
          ${state.portfolioShared ? "bg-emerald-500 text-emerald-950" : "bg-white/10 text-white hover:bg-white/15"}`}
      >
        {state.portfolioShared ? <><CheckCircle2 className="w-3 h-3" /> Shared · refyntech.us/p/demo</> : <>Share portfolio</>}
      </button>
    </div>
    <div className="grid grid-cols-4 gap-3">
      {[
        { n: "Reflection #4", t: "Reflect", c: "from-emerald-500/30 to-cyan-500/20" },
        { n: "Kinematics IA draft", t: "IA", c: "from-violet-500/30 to-fuchsia-500/20" },
        { n: "Group project · pendulum", t: "Group", c: "from-amber-500/30 to-orange-500/20" },
        { n: "Poster · energy chain", t: "Visual", c: "from-rose-500/30 to-pink-500/20" },
        { n: "Lab report · friction", t: "Lab", c: "from-sky-500/30 to-indigo-500/20" },
        { n: "Notes · waves", t: "Notes", c: "from-teal-500/30 to-emerald-500/20" },
        { n: "Video · circuit demo", t: "Media", c: "from-fuchsia-500/30 to-purple-500/20" },
        { n: "Code · simulation", t: "Code", c: "from-lime-500/30 to-emerald-500/20" },
      ].map(p => (
        <Panel key={p.n} className="!p-2.5">
          <div className={`aspect-video rounded-md bg-gradient-to-br ${p.c} mb-2 relative overflow-hidden`}>
            <div className="absolute inset-0 grid place-items-center">
              <Briefcase className="w-6 h-6 text-white/40" />
            </div>
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">{p.t}</div>
          <div className="text-xs text-white truncate">{p.n}</div>
        </Panel>
      ))}
    </div>
  </div>
);

// --- TEACHER ---------------------------------------------------------------
const TeacherDashboard: React.FC<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => {
  const classes = [
    { n: "11A Physics", r: "green", s: 24, p: 142 },
    { n: "11B Math", r: "amber", s: 22, p: 98 },
    { n: "10 Econ", r: "green", s: 28, p: 76 },
    { n: "12 HL Physics", r: "red", s: 18, p: 211 },
  ];
  return (
    <div className="grid grid-cols-6 gap-4">
      <Panel className="col-span-4" tourId="t-radar">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Eyebrow color="text-violet-300">Class Risk Radar</Eyebrow>
            <div className="text-sm font-semibold text-white mt-0.5">Today's readiness</div>
          </div>
          <div className="text-[10px] text-slate-500">Updated 2 min ago</div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {classes.map(c => (
            <button
              key={c.n}
              onClick={() => setState(s => ({ ...s, classExpanded: c.n, view: "t-class" }))}
              className={`text-left rounded-lg border p-3 hover:scale-[1.02] transition
                ${c.r === "red" ? "border-rose-500/40 bg-rose-500/5" : c.r === "amber" ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-white">{c.n}</div>
                <div className={`w-2 h-2 rounded-full
                  ${c.r === "red" ? "bg-rose-400 animate-pulse" : c.r === "amber" ? "bg-amber-400" : "bg-emerald-400"}`} />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{c.s} students · {c.p} prompts/day</div>
              <div className="mt-2"><Bar w={c.r === "red" ? "32%" : c.r === "amber" ? "64%" : "88%"} c={c.r === "red" ? "bg-rose-500" : c.r === "amber" ? "bg-amber-500" : "bg-emerald-500"} /></div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="col-span-2">
        <Eyebrow color="text-violet-300">Quick tools</Eyebrow>
        <div className="mt-2 space-y-1.5">
          {[
            { t: "Plan Generator", i: <Layers className="w-3.5 h-3.5 text-violet-300" /> },
            { t: "IB Mapper", i: <Network className="w-3.5 h-3.5 text-cyan-300" /> },
            { t: "Subject Studio", i: <FlaskConical className="w-3.5 h-3.5 text-fuchsia-300" /> },
            { t: "Marketplace", i: <Sparkles className="w-3.5 h-3.5 text-amber-300" /> },
          ].map(s => (
            <button key={s.t} className="w-full text-left px-2.5 py-2 rounded-md bg-white/5 hover:bg-white/10 text-xs flex items-center gap-2">
              {s.i}{s.t}
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="col-span-6">
        <Eyebrow>Today's classes</Eyebrow>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {["08:30 · 11A Physics", "10:15 · 12 HL Physics", "11:30 · 10 Econ", "13:45 · 11B Math"].map(s => (
            <div key={s} className="px-3 py-2.5 rounded-md bg-white/5 text-xs flex items-center justify-between">
              <span>{s}</span>
              <Calendar className="w-3 h-3 text-slate-500" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};

const TeacherClass: React.FC<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => (
  <div>
    <button onClick={() => setState(s => ({ ...s, view: "t-dash" }))} className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 mb-3">
      <ArrowLeft className="w-3 h-3" /> Back
    </button>
    <div className="rounded-xl border border-rose-500/40 bg-gradient-to-br from-rose-500/10 to-transparent p-5 mb-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-300" />
            <Eyebrow color="text-rose-300">Class needs attention</Eyebrow>
          </div>
          <div className="text-2xl font-bold text-white mt-1">12 HL Physics</div>
          <div className="text-xs text-slate-400 mt-1">18 students · readiness 32% · trending down 6 weeks</div>
        </div>
        <div className="text-3xl font-bold text-rose-300">32%</div>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4">
      <Panel className="col-span-2" tourId="t-class-insight">
        <Eyebrow>Why is it red?</Eyebrow>
        <div className="mt-3 space-y-2">
          {[
            { s: "Student A", t: "Stuck on uncertainty propagation", c: "3 chats this week" },
            { s: "Student B", t: "Avoiding practice problems", c: "Only Concept modules" },
            { s: "Student C", t: "Bypass attempts × 4", c: "Asked AI for direct answers" },
          ].map(x => (
            <div key={x.s} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-rose-500/20 grid place-items-center text-[10px] text-rose-200 font-bold">{x.s.split(" ")[1]}</div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-white">{x.s}</div>
                <div className="text-[11px] text-slate-300">{x.t}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{x.c}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <Eyebrow color="text-violet-300">Suggested intervention</Eyebrow>
        <div className="text-xs text-slate-300 mt-2 leading-relaxed">
          Run a 20-min in-class diagnostic on <strong className="text-white">uncertainty propagation</strong>, then assign the auto-generated remediation path.
        </div>
        <button className="mt-3 w-full text-xs px-3 py-2 rounded-md bg-violet-500 hover:bg-violet-400 text-violet-950 font-semibold">
          Generate intervention plan
        </button>
      </Panel>
    </div>
  </div>
);

const TeacherMapper: React.FC<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => {
  const units = ["Mechanics", "Waves", "Electricity", "Atomic", "Energy"];
  const criteria = ["Kn", "App", "Anal", "Eval", "Comm"];
  return (
    <div className="grid grid-cols-3 gap-4">
      <Panel className="col-span-2" tourId="t-mapper-grid">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Eyebrow color="text-cyan-300">IB Standards Auto-Mapper · Physics HL</Eyebrow>
            <div className="text-sm font-semibold text-white mt-0.5">Coverage heatmap</div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Strong</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> Thin</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-500" /> Untouched</span>
          </div>
        </div>
        <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-1.5">
          <div />
          {criteria.map(c => <div key={c} className="text-[10px] text-center text-slate-400">{c}</div>)}
          {units.map((u, ui) => (
            <React.Fragment key={u}>
              <div className="text-[11px] text-slate-300 self-center">{u}</div>
              {criteria.map((_, ci) => {
                const idx = ui * 5 + ci;
                const v = (idx * 37) % 100;
                const isActive = state.mapperCell === idx;
                const c = v > 70 ? "bg-emerald-500/80 hover:bg-emerald-400" : v > 40 ? "bg-amber-500/70 hover:bg-amber-400" : "bg-rose-500/60 hover:bg-rose-400";
                return (
                  <button
                    key={ci}
                    onClick={() => setState(s => ({ ...s, mapperCell: idx }))}
                    className={`aspect-square rounded ${c} transition ${isActive ? "ring-2 ring-white scale-105" : ""}`}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </Panel>
      <Panel tourId="t-mapper-evidence">
        <Eyebrow>Evidence</Eyebrow>
        {state.mapperCell == null ? (
          <div className="text-xs text-slate-500 mt-4 text-center">
            <Network className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Click any cell to see the evidence behind that coverage.
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="text-xs font-semibold text-white">{units[Math.floor(state.mapperCell / 5)]} · {criteria[state.mapperCell % 5]}</div>
            <div className="text-[11px] text-slate-400 mb-2">Coverage thin · 3 artefacts</div>
            {["Chat · Student A · uncertainty", "Path · Wave interference (in progress)", "Lab report · Friction · graded"].map(x => (
              <div key={x} className="text-[11px] px-2 py-1.5 rounded bg-white/5 border border-white/10 flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-slate-500" />{x}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

const TeacherStudio: React.FC = () => (
  <div className="grid grid-cols-3 gap-4">
    <Panel tourId="t-studio-list">
      <Eyebrow color="text-fuchsia-300">Studios</Eyebrow>
      <div className="mt-2 space-y-1.5">
        {[
          { t: "Physics IA Reviewer", a: true },
          { t: "Math Notation Stepper" },
          { t: "Econ Data Response Trainer" },
          { t: "I&S Source Critique" },
          { t: "Language Acquisition · Spanish" },
        ].map(s => (
          <div key={s.t} className={`px-2.5 py-2 rounded-md text-xs flex items-center gap-2
            ${s.a ? "bg-fuchsia-500/15 border border-fuchsia-500/30 text-white" : "bg-white/5 text-slate-300"}`}>
            <FlaskConical className="w-3.5 h-3.5 text-fuchsia-300" />{s.t}
          </div>
        ))}
      </div>
    </Panel>
    <Panel className="col-span-2">
      <Eyebrow color="text-fuchsia-300">Physics IA Reviewer</Eyebrow>
      <div className="text-sm font-semibold text-white mt-1 mb-3">Paste student work, get examiner-style feedback against IB criteria</div>
      <div className="rounded-lg border border-dashed border-white/15 bg-black/30 p-4 text-xs text-slate-500 text-center">
        Drop a PDF or paste the IA text here…
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {["Personal engagement", "Exploration", "Analysis", "Evaluation"].map(c => (
          <div key={c} className="rounded-md border border-fuchsia-500/20 bg-fuchsia-500/5 px-2.5 py-2 text-[11px]">
            <div className="text-slate-300">{c}</div>
            <div className="text-fuchsia-200 font-semibold">Awaiting submission</div>
          </div>
        ))}
      </div>
    </Panel>
  </div>
);

const TeacherMarketplace: React.FC = () => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-xl font-bold text-white">Recipe Marketplace</div>
        <div className="text-xs text-slate-400">Teacher-built prompt templates · forkable · rated</div>
      </div>
      <button className="text-xs px-3 py-1.5 rounded-md bg-violet-500 text-violet-950 font-semibold">+ Publish recipe</button>
    </div>
    <div className="grid grid-cols-3 gap-3">
      {[
        { t: "Socratic seminar prep", s: "I&S · MYP4", r: 4.9, u: 312 },
        { t: "Math FRQ scaffold", s: "Math · IB DP", r: 4.8, u: 287 },
        { t: "Lab evaluation rubric", s: "Physics · HL", r: 4.7, u: 198 },
        { t: "Economics paper 3 data", s: "Econ · HL", r: 4.6, u: 143 },
        { t: "EE supervisor questions", s: "EE · DP", r: 4.6, u: 121 },
        { t: "TOK linking prompts", s: "TOK", r: 4.5, u: 98 },
      ].map((r, i) => (
        <Panel key={r.t} tourId={i === 0 ? "t-recipe-0" : undefined}>
          <Eyebrow>{r.s}</Eyebrow>
          <div className="text-sm font-semibold text-white mt-1">{r.t}</div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-300 fill-amber-300" />{r.r}</span>
            <span>{r.u} forks</span>
          </div>
          <button className="mt-3 w-full text-xs px-2 py-1.5 rounded bg-white/5 hover:bg-white/10">Run recipe</button>
        </Panel>
      ))}
    </div>
  </div>
);

// --- ADMIN -----------------------------------------------------------------
const AdminOverview: React.FC<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => (
  <div className="grid grid-cols-4 gap-4">
    <div className="col-span-4 grid grid-cols-4 gap-3" data-tour-id="a-kpis">
      {[
        { k: "Active students", v: "1,284", d: "+4.2%", c: "text-emerald-300" },
        { k: "AI prompts / day", v: "9,431", d: "+12%", c: "text-amber-300" },
        { k: "Bypass attempts", v: "12", d: "−38%", c: "text-emerald-300" },
        { k: "Token budget used", v: "76%", d: "On track", c: "text-slate-300" },
      ].map(s => (
        <Panel key={s.k}>
          <Eyebrow>{s.k}</Eyebrow>
          <div className="text-2xl font-bold text-white mt-1">{s.v}</div>
          <div className={`text-[10px] ${s.c} mt-0.5`}>{s.d}</div>
        </Panel>
      ))}
    </div>

    <Panel className="col-span-2">
      <Eyebrow color="text-amber-300">Usage velocity · 24h</Eyebrow>
      <div className="h-32 flex items-end gap-1 mt-3">
        {[20, 35, 28, 50, 60, 45, 70, 65, 80, 72, 90, 85, 78, 88, 95, 82].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-amber-500/30 to-rose-500/70" style={{ height: `${h}%` }} />
        ))}
      </div>
    </Panel>

    <Panel className="col-span-2" tourId="a-alert">
      <div className="flex items-center justify-between mb-2">
        <Eyebrow color="text-rose-300">Flagged incidents</Eyebrow>
        {state.alertOpen && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30 animate-pulse">LIVE</span>}
      </div>
      <div className="space-y-2">
        {[
          { t: "Bypass attempt", c: "11B Math · Student M", time: "2 min ago", live: state.alertOpen },
          { t: "Off-policy prompt", c: "12 HL Physics", time: "14 min ago" },
          { t: "Long session anomaly", c: "10 Econ · Student R", time: "32 min ago" },
        ].map(x => (
          <div key={x.t} className={`rounded-lg border p-3 flex items-center gap-3
            ${x.live ? "border-rose-500/50 bg-rose-500/10 animate-in fade-in" : "border-white/10 bg-white/[0.03]"}`}>
            <AlertTriangle className={`w-4 h-4 ${x.live ? "text-rose-300" : "text-slate-400"}`} />
            <div className="flex-1">
              <div className="text-xs font-semibold text-white">{x.t}</div>
              <div className="text-[11px] text-slate-400">{x.c}</div>
            </div>
            <div className="text-[10px] text-slate-500">{x.time}</div>
          </div>
        ))}
      </div>
    </Panel>
  </div>
);

const AdminATC: React.FC = () => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-xl font-bold text-white">Air-Traffic Control</div>
        <div className="text-xs text-slate-400">Every live class · auto-paged on anomalies</div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
      </div>
    </div>
    <div className="grid grid-cols-4 gap-2" data-tour-id="a-atc-grid">
      {Array.from({ length: 16 }).map((_, i) => {
        const status = i === 7 ? "rose" : i % 7 === 0 ? "rose" : i % 4 === 0 ? "amber" : "emerald";
        const cls = `Class ${String.fromCharCode(65 + (i % 8))}${(i % 5) + 1}`;
        return (
          <div key={i} className={`rounded-lg border p-3
            ${status === "rose" ? "border-rose-500/40 bg-rose-500/5" : status === "amber" ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white">{cls}</div>
              <div className={`w-2 h-2 rounded-full ${status === "rose" ? "bg-rose-400 animate-pulse" : status === "amber" ? "bg-amber-400" : "bg-emerald-400"}`} />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{8 + (i % 12)} live · {i * 3} prompts/min</div>
            <div className="mt-2"><Bar w={status === "rose" ? "30%" : status === "amber" ? "60%" : "88%"} c={status === "rose" ? "bg-rose-500" : status === "amber" ? "bg-amber-500" : "bg-emerald-500"} /></div>
          </div>
        );
      })}
    </div>
  </div>
);

const AdminPolicy: React.FC<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => {
  const impact = useMemo(() => {
    const s = state.policyStrictness;
    return {
      engagement: `${s > 70 ? "+18" : s > 40 ? "+12" : "+4"}%`,
      bypass: `${s > 70 ? "−64" : s > 40 ? "−38" : "−12"}%`,
      spend: `${s > 70 ? "−31" : s > 40 ? "−21" : "−8"}%`,
      load: `${s > 70 ? "+8" : "+4"}%`,
    };
  }, [state.policyStrictness]);
  return (
    <div className="grid grid-cols-2 gap-4">
      <Panel>
        <Eyebrow color="text-amber-300">Policy levers</Eyebrow>
        <div className="mt-3 space-y-4">
          <div data-tour-id="a-policy-slider">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs text-slate-200">Process Teaching strictness</div>
              <div className="text-xs font-semibold text-amber-300">{state.policyStrictness}%</div>
            </div>
            <input
              type="range" min={0} max={100} value={state.policyStrictness}
              onChange={(e) => setState(s => ({ ...s, policyStrictness: Number(e.target.value) }))}
              className="w-full accent-amber-400"
            />
          </div>
          {["Token quota / student", "Allowed subjects", "Off-hours access"].map(s => (
            <div key={s}>
              <div className="text-xs text-slate-300 mb-1.5">{s}</div>
              <div className="h-1.5 rounded bg-white/10 relative">
                <div className="absolute inset-y-0 left-0 w-1/2 rounded bg-amber-500/60" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel tourId="a-policy-impact">
        <Eyebrow color="text-emerald-300">Projected impact (30-day replay)</Eyebrow>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[
            { k: "Engagement", v: impact.engagement, c: "text-emerald-300" },
            { k: "Bypass", v: impact.bypass, c: "text-emerald-300" },
            { k: "Token spend", v: impact.spend, c: "text-emerald-300" },
            { k: "Teacher load", v: impact.load, c: "text-amber-300" },
          ].map(x => (
            <div key={x.k} className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{x.k}</div>
              <div className={`text-2xl font-bold mt-1 ${x.c}`}>{x.v}</div>
            </div>
          ))}
        </div>
        <button className="mt-4 w-full text-xs px-3 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold">
          Ship policy change
        </button>
      </Panel>
    </div>
  );
};

const AdminBudget: React.FC<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => (
  <div className="grid grid-cols-3 gap-4">
    <Panel className="col-span-2">
      <Eyebrow color="text-amber-300">Budget Optimizer</Eyebrow>
      <div className="text-sm font-semibold text-white mt-1 mb-4">Route prompts to the cheapest model that preserves quality</div>
      <div data-tour-id="a-budget-slider">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs text-slate-300">Cost-vs-quality balance</div>
          <div className="text-xs font-semibold text-amber-300">
            {state.budgetSlider < 33 ? "Cost-first" : state.budgetSlider > 66 ? "Quality-first" : "Balanced"}
          </div>
        </div>
        <input
          type="range" min={0} max={100} value={state.budgetSlider}
          onChange={(e) => setState(s => ({ ...s, budgetSlider: Number(e.target.value) }))}
          className="w-full accent-amber-400"
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        {[
          { m: "Gemini 3 Flash", p: "62%", c: "bg-emerald-500" },
          { m: "Gemini 2.5 Flash", p: "28%", c: "bg-cyan-500" },
          { m: "Gemini 2.5 Pro", p: "10%", c: "bg-violet-500" },
        ].map(x => (
          <div key={x.m} className="rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="text-[10px] text-slate-400">{x.m}</div>
            <div className="text-lg font-bold text-white mt-0.5">{x.p}</div>
            <div className="mt-2"><Bar w={x.p} c={x.c} /></div>
          </div>
        ))}
      </div>
    </Panel>
    <Panel>
      <Eyebrow color="text-emerald-300">Projected savings</Eyebrow>
      <div className="text-4xl font-bold text-white mt-2">${(state.budgetSlider * 12).toFixed(0)}</div>
      <div className="text-xs text-slate-400">per month at current usage</div>
      <div className="mt-4 text-[11px] text-slate-400 leading-relaxed">
        Refyn re-routes prompts in real time, falling back to a stronger model only when the cheap model's confidence drops.
      </div>
    </Panel>
  </div>
);

// --- PARENT ----------------------------------------------------------------
const ParentDashboard: React.FC = () => (
  <div className="grid grid-cols-3 gap-4">
    <Panel className="col-span-2" tourId="p-summary">
      <Eyebrow color="text-sky-300">Your child this week</Eyebrow>
      <div className="text-sm font-semibold text-white mt-1 mb-3">A gentle, filtered view</div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { k: "Sessions", v: "11" },
          { k: "Subjects", v: "4" },
          { k: "Reflections", v: "3" },
          { k: "Wellbeing", v: "Good", c: "text-emerald-300" },
        ].map(x => (
          <div key={x.k} className="rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{x.k}</div>
            <div className={`text-xl font-bold mt-0.5 ${x.c || "text-white"}`}>{x.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-sky-500/10 border border-sky-500/30 p-3">
        <div className="text-[10px] uppercase tracking-widest text-sky-300">Conversation prompt</div>
        <div className="text-xs text-slate-200 mt-1">"Ask about the kinematics graph she sketched on Tuesday — she was very proud of it."</div>
      </div>
    </Panel>
    <Panel tourId="p-brief">
      <Eyebrow color="text-sky-300">Weekly brief</Eyebrow>
      <div className="text-xs text-slate-300 mt-2 leading-relaxed">
        A short, multilingual summary of progress, struggles and one suggested at-home conversation.
      </div>
      <div className="mt-3 space-y-1.5">
        {["English", "हिन्दी", "मराठी", "Español"].map(l => (
          <button key={l} className="w-full text-left text-xs px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-between">
            {l} <ChevronRight className="w-3 h-3 text-slate-500" />
          </button>
        ))}
      </div>
    </Panel>
  </div>
);

/* ────────────────────────────────────────────────────────────────────────────
   VIEW ROUTER
   ──────────────────────────────────────────────────────────────────────────── */
const ViewRouter: React.FC<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => {
  switch (state.view) {
    case "s-dash":         return <StudentDashboard state={state} />;
    case "s-chat":         return <StudentChat state={state} setState={setState} />;
    case "s-paths":        return <StudentPaths state={state} setState={setState} />;
    case "s-path-detail":  return <StudentPathDetail state={state} setState={setState} />;
    case "s-portfolio":    return <StudentPortfolio state={state} setState={setState} />;
    case "t-dash":         return <TeacherDashboard state={state} setState={setState} />;
    case "t-class":        return <TeacherClass state={state} setState={setState} />;
    case "t-mapper":       return <TeacherMapper state={state} setState={setState} />;
    case "t-studio":       return <TeacherStudio />;
    case "t-marketplace":  return <TeacherMarketplace />;
    case "a-overview":     return <AdminOverview state={state} setState={setState} />;
    case "a-atc":          return <AdminATC />;
    case "a-policy":       return <AdminPolicy state={state} setState={setState} />;
    case "a-budget":       return <AdminBudget state={state} setState={setState} />;
    case "p-dash":         return <ParentDashboard />;
    default:               return null;
  }
};

/* ────────────────────────────────────────────────────────────────────────────
   SPOTLIGHT OVERLAY  (Arcade-style)
   ──────────────────────────────────────────────────────────────────────────── */
type Rect = { x: number; y: number; w: number; h: number };

const Spotlight: React.FC<{
  containerRef: React.RefObject<HTMLDivElement>;
  targetId: string;
  step: Step;
  stepIdx: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}> = ({ containerRef, targetId, step, stepIdx, totalSteps, onNext, onSkip }) => {
  const [rect, setRect] = useState<Rect | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cBox = container.getBoundingClientRect();
    setContainerSize({ w: cBox.width, h: cBox.height });
    const el = container.querySelector(`[data-tour-id="${targetId}"]`) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    const b = el.getBoundingClientRect();
    const PAD = 8;
    setRect({
      x: b.left - cBox.left - PAD,
      y: b.top - cBox.top - PAD,
      w: b.width + PAD * 2,
      h: b.height + PAD * 2,
    });
  }, [containerRef, targetId]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const t = setTimeout(measure, 60); // after content layout
    const t2 = setTimeout(measure, 250);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      clearTimeout(t); clearTimeout(t2);
    };
  }, [measure, step.id]);

  if (!rect) return null;

  // Tooltip placement
  const tooltipW = 320;
  const margin = 14;
  let tx = rect.x + rect.w + margin;
  let ty = rect.y;
  let placement: "right" | "left" | "bottom" | "top" = "right";
  if (tx + tooltipW > containerSize.w - 8) {
    tx = rect.x - tooltipW - margin;
    placement = "left";
    if (tx < 8) {
      tx = Math.min(Math.max(8, rect.x), containerSize.w - tooltipW - 8);
      ty = rect.y + rect.h + margin;
      placement = "bottom";
    }
  }
  ty = Math.min(Math.max(8, ty), containerSize.h - 180);

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      {/* SVG dim mask with cutout */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="10" fill="black" />
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(3,6,18,0.72)" mask="url(#tour-mask)" />
      </svg>

      {/* Pulsing ring around target */}
      <div
        className="absolute rounded-[10px] ring-2 ring-white/80 shadow-[0_0_0_4px_rgba(255,255,255,0.15)]"
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      />
      <div
        className="absolute rounded-[10px] animate-ping ring-4 ring-white/40"
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, animationDuration: "1.8s" }}
      />

      {/* Click target (advances) */}
      <button
        onClick={onNext}
        className="pointer-events-auto absolute cursor-pointer"
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
        aria-label={step.cta || "Next"}
      />

      {/* Tooltip card */}
      <div
        className="pointer-events-auto absolute w-[320px] rounded-xl border border-white/15 bg-[#0e1326]/95 backdrop-blur shadow-2xl p-4 animate-in fade-in zoom-in-95"
        style={{ left: tx, top: ty }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-widest text-amber-300 font-semibold">
            Step {stepIdx + 1} of {totalSteps}
          </div>
          <button onClick={onSkip} className="text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="text-sm font-semibold text-white">{step.title}</div>
        <div className="text-xs text-slate-300 leading-relaxed mt-1.5">{step.body}</div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <MousePointerClick className="w-3 h-3" /> Click highlighted element
          </div>
          <button
            onClick={onNext}
            className="text-xs px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-400 to-rose-400 text-slate-900 font-semibold inline-flex items-center gap-1 hover:scale-105 transition"
          >
            {step.cta || "Next"} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {/* placement indicator arrow */}
        <div
          className={`absolute w-3 h-3 rotate-45 bg-[#0e1326] border-white/15
            ${placement === "right" ? "border-l border-b -left-1.5 top-6"
            : placement === "left"  ? "border-r border-t -right-1.5 top-6"
            : placement === "bottom" ? "border-l border-t -top-1.5 left-6"
            : "border-r border-b -bottom-1.5 left-6"}`}
        />
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
   ──────────────────────────────────────────────────────────────────────────── */
const GuidedTourPage: React.FC = () => {
  const [role, setRole] = useState<Role>("student");
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL);
  const stageRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  const flow = FLOWS[role];
  const step = flow[stepIdx];

  // Apply step.apply when entering a step + sync view
  useEffect(() => {
    setState(s => {
      const base = step.apply ? step.apply(s) : s;
      return { ...base, view: step.view };
    });
  }, [stepIdx, role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance
  useEffect(() => {
    if (!playing) return;
    timer.current = window.setTimeout(() => advance(), 4500);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [playing, stepIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    setState(s => step.onAdvance ? step.onAdvance(s) : s);
    if (stepIdx < flow.length - 1) {
      setTimeout(() => setStepIdx(i => i + 1), 350);
    } else {
      setPlaying(false);
    }
  }, [step, stepIdx, flow.length]);

  const switchRole = (r: Role) => {
    setRole(r); setStepIdx(0); setState(INITIAL); setPlaying(false);
  };

  const reset = () => { setStepIdx(0); setState(INITIAL); setPlaying(false); };

  const progress = ((stepIdx + 1) / flow.length) * 100;

  return (
    <div className="min-h-screen bg-[#04060f] text-slate-100 selection:bg-amber-300/30">
      {/* Ambient bg */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-500/20 to-rose-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-400 to-rose-400 grid place-items-center text-slate-900">
              <Sparkles className="w-4 h-4" />
            </div>
            Refyn · Guided Product Tour
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <Link to="/demo" className="text-slate-300 hover:text-white">Feature demos</Link>
            <Link to="/login" className="px-3 py-1.5 rounded bg-white text-slate-900 font-medium">Sign in</Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Hero */}
        <section className="mb-5 flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Walk through{" "}
              <span className="bg-gradient-to-r from-amber-300 via-rose-300 to-fuchsia-300 bg-clip-text text-transparent">
                the entire Refyn app
              </span>
            </h1>
            <p className="text-slate-400 mt-1 max-w-2xl text-sm">
              Pick a role. We'll spotlight every screen, button, and workflow — click the glowing target (or use Next) to advance through a real, interactive product flow.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FLOWS) as Role[]).map(r => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs transition
                  ${r === role
                    ? `bg-gradient-to-r ${ROLE_META[r].accent} text-white border-transparent shadow-lg`
                    : "border-white/10 text-slate-300 hover:bg-white/5"}`}
              >
                {ROLE_META[r].icon}
                {ROLE_META[r].label}
                <span className="text-[10px] opacity-70">{FLOWS[r].length}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Controls bar */}
        <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur p-3 mb-3 flex items-center gap-3">
          <button onClick={() => { setStepIdx(Math.max(0, stepIdx - 1)); }} className="p-2 rounded hover:bg-white/10" aria-label="Previous">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setPlaying(p => !p)} className={`p-2 rounded ${playing ? "bg-amber-400 text-slate-900" : "hover:bg-white/10"}`} aria-label="Play/Pause">
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={reset} className="p-2 rounded hover:bg-white/10" aria-label="Restart">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={advance} className="p-2 rounded hover:bg-white/10" aria-label="Next">
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex-1 mx-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                {ROLE_META[role].label} flow · Step {stepIdx + 1} of {flow.length}
              </div>
              <div className="text-[10px] text-slate-400">{step.title}</div>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${ROLE_META[role].accent} transition-all duration-500`} style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live interactive · synthetic data
          </div>
        </div>

        {/* Stage */}
        <div
          ref={stageRef}
          className={`relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 ${ROLE_META[role].ring}`}
          style={{ height: "min(78vh, 820px)" }}
        >
          <AppShell role={role} state={state} setState={setState}>
            <ViewRouter state={state} setState={setState} />
          </AppShell>

          <Spotlight
            containerRef={stageRef}
            targetId={step.target}
            step={step}
            stepIdx={stepIdx}
            totalSteps={flow.length}
            onNext={advance}
            onSkip={() => setPlaying(false)}
          />
        </div>

        {/* Stop list */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {flow.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStepIdx(i)}
              className={`text-left p-3 rounded-lg border transition
                ${i === stepIdx ? "border-amber-400/50 bg-amber-400/5" : i < stepIdx ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/[0.02] hover:bg-white/5"}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 grid place-items-center rounded-full text-[10px] font-bold
                  ${i === stepIdx ? "bg-amber-400 text-slate-900"
                  : i < stepIdx ? "bg-emerald-500 text-emerald-950"
                  : "bg-white/10 text-slate-300"}`}>
                  {i < stepIdx ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                </span>
                <span className="text-xs font-medium text-white truncate">{s.title}</span>
              </div>
            </button>
          ))}
        </div>

        <footer className="mt-10 text-center text-[11px] text-slate-500">
          Tour data is synthetic · no student or teacher information is shown.
        </footer>
      </div>
    </div>
  );
};

export default GuidedTourPage;
