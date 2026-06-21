import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Play, Pause, RotateCcw, MapPin,
  GraduationCap, Users, Shield, Heart, Sparkles, X,
} from "lucide-react";

/**
 * GUIDED TOUR — /tour
 *
 * A public, no-login guided walkthrough showing WHERE everything lives in the
 * real Refyn app. Each step renders a realistic mock of an actual screen with
 * numbered callout pins pointing to real UI regions. Synthetic data only — no
 * student/teacher PII is referenced.
 */

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
type Pin = {
  x: number; // % from left
  y: number; // % from top
  label: string;
  detail: string;
};

type TourStep = {
  id: string;
  title: string;
  route: string;            // the actual app route this represents
  blurb: string;            // 1–2 sentence orientation
  Screen: React.FC;         // mock UI
  pins: Pin[];              // numbered callouts
};

type Role = "student" | "teacher" | "admin" | "parent";

// ────────────────────────────────────────────────────────────────────────────
// Shared mock chrome (sidebar, top bar) — matches the real app's silhouette
// ────────────────────────────────────────────────────────────────────────────
const MockChrome: React.FC<{
  role: Role;
  active: string;
  children: React.ReactNode;
}> = ({ role, active, children }) => {
  const items: Record<Role, string[]> = {
    student: ["Dashboard", "AI Chat", "Learning Paths", "My Courses", "Portfolio", "Classes", "Messages", "Settings"],
    teacher: ["Dashboard", "Classes", "Plan Generator", "Studio", "Marketplace", "IB Mapper", "Subject Labs", "Messages", "Settings"],
    admin:   ["Overview", "Schools", "Users", "AI Governance", "Air-Traffic", "Policy Sandbox", "Budget", "Pilot Console", "Settings"],
    parent:  ["Dashboard", "Child Usage", "Briefings", "Messages", "Settings"],
  };
  const accent: Record<Role, string> = {
    student: "from-emerald-500/30 to-cyan-500/20",
    teacher: "from-violet-500/30 to-fuchsia-500/20",
    admin:   "from-amber-500/30 to-rose-500/20",
    parent:  "from-sky-500/30 to-indigo-500/20",
  };
  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 bg-[#0b1020] text-slate-200 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/10 bg-black/40 p-3 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 py-2 mb-2">
          <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${accent[role]} grid place-items-center text-xs font-bold`}>R</div>
          <div className="text-sm font-semibold">Refyn</div>
        </div>
        {items[role].map((it) => (
          <div
            key={it}
            className={`px-3 py-2 rounded-md text-xs ${
              it === active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"
            }`}
          >
            {it}
          </div>
        ))}
        <div className="mt-auto text-[10px] text-slate-500 px-2">Tour: synthetic data</div>
      </aside>
      {/* Body */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-black/30">
          <div className="text-xs text-slate-400">
            <span className="capitalize">{role}</span> · {active}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <div className="text-xs text-slate-300">Demo Student A</div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-800" />
          </div>
        </header>
        <main className="flex-1 overflow-hidden p-4">{children}</main>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Small UI primitives for mocks
// ────────────────────────────────────────────────────────────────────────────
const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = "", children }) => (
  <div className={`rounded-lg border border-white/10 bg-white/[0.03] p-3 ${className}`}>{children}</div>
);
const Bar: React.FC<{ w: string; c?: string }> = ({ w, c = "bg-slate-600" }) => (
  <div className={`h-2 rounded ${c}`} style={{ width: w }} />
);

// ────────────────────────────────────────────────────────────────────────────
// Mock screens — these mirror the real app's layouts
// ────────────────────────────────────────────────────────────────────────────

// --- STUDENT --------------------------------------------------------------
const StudentDashboardMock = () => (
  <MockChrome role="student" active="Dashboard">
    <div className="grid grid-cols-3 gap-3 h-full">
      <Card className="col-span-2">
        <div className="text-[11px] uppercase tracking-wider text-emerald-300 mb-1">Continue learning</div>
        <div className="text-lg font-semibold mb-3">Physics · Kinematics</div>
        <Bar w="62%" c="bg-emerald-500" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["Concept", "Practice", "Reflect"].map(s => <Card key={s} className="text-[11px]">{s}</Card>)}
        </div>
      </Card>
      <Card>
        <div className="text-[11px] uppercase tracking-wider text-cyan-300 mb-1">Quick start</div>
        <div className="space-y-2 mt-2">
          {["Ask the AI", "Open a path", "Join a class"].map(s => (
            <div key={s} className="px-2 py-2 rounded bg-white/5 text-xs">{s}</div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="text-xs text-slate-400">Badges</div>
        <div className="mt-2 flex gap-1 flex-wrap">
          {["Inquirer", "Thinker", "Communicator"].map(b => (
            <span key={b} className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-200">{b}</span>
          ))}
        </div>
      </Card>
      <Card className="col-span-2">
        <div className="text-xs text-slate-400 mb-2">This week</div>
        <div className="h-20 flex items-end gap-1">
          {[40, 60, 30, 80, 55, 70, 45].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-cyan-500/50" style={{ height: `${h}%` }} />
          ))}
        </div>
      </Card>
    </div>
  </MockChrome>
);

const StudentChatMock = () => (
  <MockChrome role="student" active="AI Chat">
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="max-w-[70%] bg-white/5 rounded-lg p-2 text-xs">How do I solve x² − 5x + 6 = 0?</div>
        <div className="max-w-[80%] ml-auto bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-2 text-xs">
          Great question — let's not skip to the answer. What do you notice about the two numbers that multiply to 6 and add to −5?
        </div>
        <div className="max-w-[70%] bg-white/5 rounded-lg p-2 text-xs">Maybe −2 and −3?</div>
        <div className="max-w-[80%] ml-auto bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-2 text-xs">
          Yes! So how can you rewrite the equation as a product?
        </div>
      </div>
      <div className="border border-white/10 rounded-lg p-2 flex items-center gap-2">
        <div className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-200">Process Teaching ON</div>
        <div className="flex-1 text-xs text-slate-500">Type your reasoning…</div>
        <div className="text-xs px-2 py-1 rounded bg-white/10">Send</div>
      </div>
    </div>
  </MockChrome>
);

const StudentPathMock = () => (
  <MockChrome role="student" active="Learning Paths">
    <div className="grid grid-cols-3 gap-3 h-full">
      {["Energy & Work", "Waves", "Electricity"].map((t, i) => (
        <Card key={t}>
          <div className="text-xs text-slate-400">Path</div>
          <div className="text-sm font-semibold mb-2">{t}</div>
          <Bar w={`${30 + i * 20}%`} c="bg-cyan-500" />
          <div className="mt-2 text-[11px] text-slate-400">{4 + i} modules · {i === 0 ? "in progress" : "next up"}</div>
        </Card>
      ))}
    </div>
  </MockChrome>
);

const StudentPortfolioMock = () => (
  <MockChrome role="student" active="Portfolio">
    <div className="grid grid-cols-4 gap-3 h-full">
      {["Reflection #4", "IA draft", "Group project", "Poster", "Lab report", "Notes", "Video", "Code"].map(n => (
        <Card key={n}>
          <div className="aspect-video rounded bg-gradient-to-br from-slate-700 to-slate-900 mb-2" />
          <div className="text-xs">{n}</div>
        </Card>
      ))}
    </div>
  </MockChrome>
);

// --- TEACHER --------------------------------------------------------------
const TeacherDashboardMock = () => (
  <MockChrome role="teacher" active="Dashboard">
    <div className="grid grid-cols-3 gap-3 h-full">
      <Card className="col-span-2">
        <div className="text-[11px] uppercase tracking-wider text-violet-300">Class risk radar</div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[
            { n: "11A Phys", r: "green" },
            { n: "11B Math", r: "amber" },
            { n: "10 Econ", r: "green" },
            { n: "12 HL",   r: "red" },
          ].map(c => (
            <Card key={c.n}>
              <div className="text-xs">{c.n}</div>
              <div className={`mt-2 h-2 rounded ${c.r === "green" ? "bg-emerald-500" : c.r === "amber" ? "bg-amber-500" : "bg-rose-500"}`} />
              <div className="text-[10px] text-slate-400 mt-1">readiness</div>
            </Card>
          ))}
        </div>
      </Card>
      <Card>
        <div className="text-xs text-slate-400 mb-2">Quick tools</div>
        {["Plan Generator", "IB Mapper", "Subject Lab", "Marketplace"].map(s => (
          <div key={s} className="px-2 py-2 mt-1 rounded bg-white/5 text-xs">{s}</div>
        ))}
      </Card>
      <Card className="col-span-3">
        <div className="text-xs text-slate-400 mb-2">Today's classes</div>
        <div className="grid grid-cols-4 gap-2">
          {["08:30 · 11A", "10:15 · 12HL", "11:30 · 10", "13:45 · 11B"].map(s => (
            <div key={s} className="px-2 py-3 rounded bg-white/5 text-xs">{s}</div>
          ))}
        </div>
      </Card>
    </div>
  </MockChrome>
);

const TeacherStudioMock = () => (
  <MockChrome role="teacher" active="Studio">
    <div className="h-full grid grid-cols-3 gap-3">
      <Card>
        <div className="text-xs text-slate-400">Studios</div>
        {["Physics IA Reviewer", "Math Notation Stepper", "Econ Data Response"].map((s, i) => (
          <div key={s} className={`px-2 py-2 mt-1 rounded text-xs ${i === 0 ? "bg-violet-600/20 border border-violet-500/30" : "bg-white/5"}`}>{s}</div>
        ))}
      </Card>
      <Card className="col-span-2">
        <div className="text-xs text-violet-300 mb-2">Physics IA Reviewer</div>
        <div className="space-y-2">
          <div className="bg-white/5 rounded p-2 text-xs">Paste a student IA draft…</div>
          <div className="grid grid-cols-2 gap-2">
            {["Personal engagement", "Exploration", "Analysis", "Evaluation"].map(c => (
              <div key={c} className="text-[11px] px-2 py-2 rounded bg-violet-500/10 border border-violet-500/20">{c}</div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  </MockChrome>
);

const TeacherMapperMock = () => (
  <MockChrome role="teacher" active="IB Mapper">
    <div className="h-full grid grid-cols-5 gap-2">
      {Array.from({ length: 25 }).map((_, i) => {
        const v = (i * 37) % 100;
        const bg =
          v > 70 ? "bg-emerald-500/70" : v > 40 ? "bg-amber-500/60" : "bg-rose-500/50";
        return <div key={i} className={`rounded ${bg}`} />;
      })}
    </div>
  </MockChrome>
);

// --- ADMIN ---------------------------------------------------------------
const AdminOverviewMock = () => (
  <MockChrome role="admin" active="Overview">
    <div className="grid grid-cols-4 gap-3 h-full">
      {[
        { k: "Active students", v: "1,284" },
        { k: "AI prompts / day", v: "9,431" },
        { k: "Bypass attempts", v: "12" },
        { k: "Token budget", v: "76%" },
      ].map(s => (
        <Card key={s.k}>
          <div className="text-[11px] text-slate-400">{s.k}</div>
          <div className="text-xl font-semibold mt-1">{s.v}</div>
        </Card>
      ))}
      <Card className="col-span-2">
        <div className="text-xs text-slate-400 mb-2">Usage velocity</div>
        <div className="h-24 flex items-end gap-1">
          {[20, 35, 28, 50, 60, 45, 70, 65, 80, 72, 90, 85].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-amber-500/60" style={{ height: `${h}%` }} />
          ))}
        </div>
      </Card>
      <Card className="col-span-2">
        <div className="text-xs text-slate-400 mb-2">Flagged incidents (today)</div>
        {["Bypass attempt · 11B Math", "Off-policy prompt · 12 HL", "Long session · 10 Econ"].map(x => (
          <div key={x} className="text-xs px-2 py-2 mt-1 rounded bg-rose-500/10 border border-rose-500/20">{x}</div>
        ))}
      </Card>
    </div>
  </MockChrome>
);

const AdminAirTrafficMock = () => (
  <MockChrome role="admin" active="Air-Traffic">
    <div className="h-full grid grid-cols-4 gap-2">
      {Array.from({ length: 16 }).map((_, i) => {
        const status = i % 7 === 0 ? "rose" : i % 4 === 0 ? "amber" : "emerald";
        return (
          <Card key={i}>
            <div className="flex items-center justify-between">
              <div className="text-xs">Class {String.fromCharCode(65 + (i % 8))}{(i % 5) + 1}</div>
              <div className={`w-2 h-2 rounded-full bg-${status}-400`} />
            </div>
            <div className="mt-2 text-[10px] text-slate-400">{8 + (i % 12)} live · {i * 3} prompts/min</div>
            <div className={`mt-1 h-1 rounded bg-${status}-500/60`} />
          </Card>
        );
      })}
    </div>
  </MockChrome>
);

const AdminPolicyMock = () => (
  <MockChrome role="admin" active="Policy Sandbox">
    <div className="grid grid-cols-2 gap-3 h-full">
      <Card>
        <div className="text-xs text-slate-400 mb-2">Policy levers</div>
        {["Process Teaching strictness", "Token quota / student", "Allowed subjects", "Off-hours access"].map(s => (
          <div key={s} className="mt-2">
            <div className="text-[11px] mb-1">{s}</div>
            <div className="h-1.5 rounded bg-white/10 relative">
              <div className="absolute inset-y-0 left-0 w-1/2 rounded bg-amber-500" />
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <div className="text-xs text-slate-400 mb-2">Projected impact</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: "Engagement", v: "+12%" },
            { k: "Bypass", v: "−38%" },
            { k: "Token spend", v: "−21%" },
            { k: "Teacher load", v: "+4%" },
          ].map(x => (
            <Card key={x.k}>
              <div className="text-[10px] text-slate-400">{x.k}</div>
              <div className="text-base font-semibold">{x.v}</div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  </MockChrome>
);

// --- PARENT --------------------------------------------------------------
const ParentDashboardMock = () => (
  <MockChrome role="parent" active="Dashboard">
    <div className="grid grid-cols-3 gap-3 h-full">
      <Card className="col-span-2">
        <div className="text-[11px] uppercase tracking-wider text-sky-300">Your child this week</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { k: "Sessions", v: "11" },
            { k: "Subjects", v: "4" },
            { k: "Wellbeing", v: "Good" },
          ].map(x => (
            <Card key={x.k}>
              <div className="text-[10px] text-slate-400">{x.k}</div>
              <div className="text-base font-semibold">{x.v}</div>
            </Card>
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-300">
          Conversation prompt: "Ask about the kinematics graph she sketched on Tuesday."
        </div>
      </Card>
      <Card>
        <div className="text-xs text-slate-400 mb-2">Weekly brief</div>
        <div className="text-[11px] leading-relaxed text-slate-300">
          A short, multilingual summary of progress, struggles and one suggested at-home conversation.
        </div>
        <div className="mt-2 text-[10px] px-2 py-1 rounded bg-sky-500/20 text-sky-200 inline-block">Read brief</div>
      </Card>
    </div>
  </MockChrome>
);

// ────────────────────────────────────────────────────────────────────────────
// Tour registry
// ────────────────────────────────────────────────────────────────────────────
const STUDENT_TOUR: TourStep[] = [
  {
    id: "s-dash", title: "Student Dashboard", route: "/dashboard",
    blurb: "Where every student lands after signing in. Pick up where you left off, see your week, and jump into anything.",
    Screen: StudentDashboardMock,
    pins: [
      { x: 8, y: 10, label: "Sidebar", detail: "Every major area is one click away — Chat, Paths, Courses, Portfolio." },
      { x: 38, y: 30, label: "Continue", detail: "Resumes your active learning path at the exact module you left." },
      { x: 78, y: 28, label: "Quick start", detail: "Three big actions: open chat, browse paths, or join a class with a 6-character code." },
      { x: 78, y: 60, label: "Badges", detail: "IB Learner Profile badges earned from your real work — Inquirer, Thinker, Communicator…" },
    ],
  },
  {
    id: "s-chat", title: "AI Chat (Process Teaching)", route: "/student",
    blurb: "The AI never gives the answer. It asks the next question that moves your thinking forward.",
    Screen: StudentChatMock,
    pins: [
      { x: 22, y: 78, label: "PT badge", detail: "When Process Teaching is on, the AI rewrites direct answer requests into step-by-step guidance." },
      { x: 70, y: 35, label: "Guided turn", detail: "Each AI reply ends with a question, hint, or check — never a finished solution." },
      { x: 88, y: 78, label: "Send", detail: "Show your reasoning. The AI calibrates the next prompt to your last sentence." },
    ],
  },
  {
    id: "s-paths", title: "Learning Paths", route: "/learning-paths",
    blurb: "AI-generated routes built around YOUR gaps, with persistent progress and reflection checkpoints.",
    Screen: StudentPathMock,
    pins: [
      { x: 22, y: 35, label: "Active path", detail: "Tap a path to open module-by-module — concept, practice, then reflect." },
      { x: 78, y: 35, label: "Suggested next", detail: "Recommended based on your performance and class coverage." },
    ],
  },
  {
    id: "s-portfolio", title: "Portfolio", route: "/portfolio",
    blurb: "Your evidence wall. Files, reflections, group projects — shareable via a public refyntech.us link.",
    Screen: StudentPortfolioMock,
    pins: [
      { x: 30, y: 35, label: "Artefacts", detail: "Drop in files, link reflections, attach group submissions." },
      { x: 78, y: 35, label: "Share", detail: "Generate a public URL that bypasses preview auth — perfect for university applications." },
    ],
  },
];

const TEACHER_TOUR: TourStep[] = [
  {
    id: "t-dash", title: "Teacher Dashboard", route: "/dashboard",
    blurb: "Mission control for your classes. Risk radar up top, quick tools on the right.",
    Screen: TeacherDashboardMock,
    pins: [
      { x: 40, y: 28, label: "Risk Radar", detail: "Per-class readiness rolled up from real AI interactions — green / amber / red." },
      { x: 78, y: 35, label: "Quick tools", detail: "Plan Generator, IB Mapper, Subject Labs, Recipe Marketplace." },
      { x: 50, y: 78, label: "Today", detail: "Your next four periods with one-tap join into class context." },
    ],
  },
  {
    id: "t-studio", title: "Teacher Studio", route: "/studio",
    blurb: "Subject-specific AI labs — Physics IA reviewer, Math notation stepper, Econ data response trainer.",
    Screen: TeacherStudioMock,
    pins: [
      { x: 20, y: 30, label: "Studio picker", detail: "Switch between the AI tools curated for your subject." },
      { x: 65, y: 55, label: "Rubric mode", detail: "Pasted student work is scored against IB criteria with examiner-style feedback." },
    ],
  },
  {
    id: "t-mapper", title: "IB Standards Auto-Mapper", route: "/intel/ib-mapper",
    blurb: "Every AI chat and assignment auto-tagged to IB guides. The grid shows live coverage per unit.",
    Screen: TeacherMapperMock,
    pins: [
      { x: 30, y: 30, label: "Heatmap", detail: "Green = strong coverage. Amber = thin. Red = untouched. Spot blind spots instantly." },
      { x: 75, y: 70, label: "Click any cell", detail: "Drills into the specific evidence — chats, paths, artefacts — that earned that coverage." },
    ],
  },
];

const ADMIN_TOUR: TourStep[] = [
  {
    id: "a-overview", title: "Admin Overview", route: "/admin",
    blurb: "Whole-school pulse: usage, incidents, budget. One screen, no hunting.",
    Screen: AdminOverviewMock,
    pins: [
      { x: 22, y: 22, label: "Headline KPIs", detail: "Live counters for active students, prompts, bypass attempts and token spend." },
      { x: 30, y: 65, label: "Usage curve", detail: "Hour-by-hour velocity — catch spikes during exam weeks." },
      { x: 75, y: 65, label: "Incidents", detail: "Auto-flagged moments worth a human look. Click to triage." },
    ],
  },
  {
    id: "a-atc", title: "Air-Traffic Control", route: "/intel/at-risk-radar",
    blurb: "Every active class as a tile. Green = healthy, amber = drifting, red = needs attention NOW.",
    Screen: AdminAirTrafficMock,
    pins: [
      { x: 25, y: 25, label: "Class tile", detail: "Live student count and prompts/min. Hover for the live class transcript." },
      { x: 75, y: 75, label: "Red tile", detail: "Auto-paged when bypass attempts, off-policy prompts or session anomalies spike." },
    ],
  },
  {
    id: "a-policy", title: "Policy Sandbox", route: "/intel/policy-sandbox",
    blurb: "Move the sliders, see the projected impact on engagement, bypass, spend and teacher load before you ship.",
    Screen: AdminPolicyMock,
    pins: [
      { x: 25, y: 45, label: "Levers", detail: "Adjust strictness, quotas, allowed subjects, off-hours rules." },
      { x: 75, y: 45, label: "Impact panel", detail: "Refyn simulates the change against the last 30 days of real traffic." },
    ],
  },
];

const PARENT_TOUR: TourStep[] = [
  {
    id: "p-dash", title: "Parent Dashboard", route: "/parent",
    blurb: "Filtered, age-appropriate view of your child's week — never raw transcripts.",
    Screen: ParentDashboardMock,
    pins: [
      { x: 38, y: 30, label: "Week summary", detail: "Sessions, subjects covered and a wellbeing read derived from interaction signals." },
      { x: 78, y: 40, label: "Multilingual brief", detail: "Weekly summary auto-translated into your family's preferred language." },
    ],
  },
];

const TOURS: Record<Role, TourStep[]> = {
  student: STUDENT_TOUR,
  teacher: TEACHER_TOUR,
  admin: ADMIN_TOUR,
  parent: PARENT_TOUR,
};

const ROLE_META: Record<Role, { label: string; icon: React.ReactNode; accent: string }> = {
  student: { label: "Student",  icon: <GraduationCap className="w-4 h-4" />, accent: "from-emerald-500 to-cyan-500" },
  teacher: { label: "Teacher",  icon: <Users className="w-4 h-4" />,         accent: "from-violet-500 to-fuchsia-500" },
  admin:   { label: "Admin",    icon: <Shield className="w-4 h-4" />,        accent: "from-amber-500 to-rose-500" },
  parent:  { label: "Parent",   icon: <Heart className="w-4 h-4" />,         accent: "from-sky-500 to-indigo-500" },
};

// ────────────────────────────────────────────────────────────────────────────
// Pin overlay
// ────────────────────────────────────────────────────────────────────────────
const PinOverlay: React.FC<{ pins: Pin[]; active: number; onSelect: (i: number) => void }> = ({ pins, active, onSelect }) => (
  <div className="absolute inset-0 pointer-events-none">
    {pins.map((p, i) => (
      <button
        key={i}
        onClick={() => onSelect(i)}
        className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${p.x}%`, top: `${p.y}%` }}
      >
        <span
          className={`grid place-items-center w-7 h-7 rounded-full text-xs font-bold shadow-lg transition
            ${active === i
              ? "bg-white text-slate-900 scale-110 ring-4 ring-white/30"
              : "bg-amber-400 text-slate-900 hover:scale-110"}`}
        >
          {i + 1}
        </span>
        {active === i && (
          <span className="absolute inset-0 -m-2 rounded-full border-2 border-white/60 animate-ping" />
        )}
      </button>
    ))}
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────
const GuidedTourPage: React.FC = () => {
  const [role, setRole] = useState<Role>("student");
  const [stepIdx, setStepIdx] = useState(0);
  const [pinIdx, setPinIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<number | null>(null);

  const steps = TOURS[role];
  const step = steps[stepIdx];

  // Auto-advance pins, then steps
  useEffect(() => {
    if (!playing) return;
    timer.current = window.setTimeout(() => {
      if (pinIdx < step.pins.length - 1) {
        setPinIdx(pinIdx + 1);
      } else if (stepIdx < steps.length - 1) {
        setStepIdx(stepIdx + 1);
        setPinIdx(0);
      } else {
        setPlaying(false);
      }
    }, 3200);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [playing, pinIdx, stepIdx, step.pins.length, steps.length]);

  const resetTo = (r: Role) => {
    setRole(r); setStepIdx(0); setPinIdx(0); setPlaying(true);
  };

  const totalPins = useMemo(() => steps.reduce((a, s) => a + s.pins.length, 0), [steps]);
  const donePins  = useMemo(() => steps.slice(0, stepIdx).reduce((a, s) => a + s.pins.length, 0) + pinIdx + 1, [steps, stepIdx, pinIdx]);

  return (
    <div className="min-h-screen bg-[#070912] text-slate-100">
      {/* Top bar */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="w-4 h-4 text-amber-300" />
            Refyn · Guided Tour
          </Link>
          <div className="hidden md:flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5" /> Synthetic data · no login required
          </div>
          <div className="flex items-center gap-2">
            <Link to="/demo" className="text-xs text-slate-300 hover:text-white">Feature demos</Link>
            <Link to="/login" className="text-xs px-3 py-1.5 rounded bg-white text-slate-900 font-medium">Sign in</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Hero / role picker */}
        <section className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            A guided tour of <span className="bg-gradient-to-r from-amber-300 to-rose-300 bg-clip-text text-transparent">the entire Refyn app</span>
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl">
            Pick a role. We'll walk you through every screen with numbered callouts showing exactly where each feature lives — no account needed.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(TOURS) as Role[]).map(r => (
              <button
                key={r}
                onClick={() => resetTo(r)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition
                  ${r === role
                    ? `bg-gradient-to-r ${ROLE_META[r].accent} text-white border-transparent shadow-lg`
                    : "border-white/10 text-slate-300 hover:bg-white/5"}`}
              >
                {ROLE_META[r].icon}
                {ROLE_META[r].label}
                <span className="text-[10px] opacity-70">· {TOURS[r].length} stops</span>
              </button>
            ))}
          </div>
        </section>

        {/* Main panel */}
        <section className="grid lg:grid-cols-[1fr_320px] gap-4">
          {/* Stage */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">
                  Stop {stepIdx + 1} of {steps.length} · {step.route}
                </div>
                <div className="text-lg font-semibold mt-0.5">{step.title}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setStepIdx(Math.max(0, stepIdx - 1)); setPinIdx(0); }}
                  className="p-2 rounded hover:bg-white/10" aria-label="Previous">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPlaying(p => !p)}
                  className="p-2 rounded hover:bg-white/10" aria-label="Play/Pause">
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { setStepIdx(0); setPinIdx(0); setPlaying(true); }}
                  className="p-2 rounded hover:bg-white/10" aria-label="Restart">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (pinIdx < step.pins.length - 1) setPinIdx(pinIdx + 1);
                    else if (stepIdx < steps.length - 1) { setStepIdx(stepIdx + 1); setPinIdx(0); }
                  }}
                  className="p-2 rounded hover:bg-white/10" aria-label="Next">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-400 mb-3">{step.blurb}</p>

            <div className="relative rounded-xl overflow-hidden aspect-[16/10] bg-[#0b1020]">
              <step.Screen />
              <PinOverlay pins={step.pins} active={pinIdx} onSelect={setPinIdx} />
            </div>

            {/* Pin description */}
            <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 flex gap-3">
              <div className="w-8 h-8 shrink-0 rounded-full bg-amber-400 text-slate-900 grid place-items-center text-sm font-bold">
                {pinIdx + 1}
              </div>
              <div>
                <div className="text-sm font-semibold">{step.pins[pinIdx].label}</div>
                <div className="text-xs text-slate-300 mt-0.5">{step.pins[pinIdx].detail}</div>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${ROLE_META[role].accent} transition-all`}
                style={{ width: `${(donePins / totalPins) * 100}%` }}
              />
            </div>
          </div>

          {/* Stop list */}
          <aside className="rounded-2xl border border-white/10 bg-black/40 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 px-1 mb-2">
              {ROLE_META[role].label} tour · {steps.length} stops
            </div>
            <ol className="space-y-1">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <button
                    onClick={() => { setStepIdx(i); setPinIdx(0); }}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition
                      ${i === stepIdx
                        ? "border-white/20 bg-white/10"
                        : "border-transparent hover:bg-white/5"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 grid place-items-center rounded-full text-[10px] font-bold
                        ${i === stepIdx ? "bg-white text-slate-900" : "bg-white/10 text-slate-300"}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium">{s.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 pl-7">{s.route}</div>
                  </button>
                </li>
              ))}
            </ol>

            <div className="mt-4 p-3 rounded-lg border border-white/10 bg-white/[0.03]">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">After the tour</div>
              <p className="text-xs text-slate-400 mb-2">
                Want to try the real product with synthetic data?
              </p>
              <Link to="/demo" className="block text-center text-xs px-3 py-2 rounded bg-white/10 hover:bg-white/20">
                Open feature demos →
              </Link>
            </div>
          </aside>
        </section>

        <footer className="mt-10 text-center text-[11px] text-slate-500">
          All names, classes and numbers shown are synthetic. No student or teacher data is exposed on this page.
        </footer>
      </div>
    </div>
  );
};

export default GuidedTourPage;
