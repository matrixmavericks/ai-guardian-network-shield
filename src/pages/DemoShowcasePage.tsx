import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Play, Pause, RotateCcw, ChevronLeft, ChevronRight,
  Shield, GraduationCap, BookOpen, Sparkles, Brain, BarChart3, MessageSquare,
  AlertTriangle, Award, FlaskConical, Compass, Users, Wand2, FileText, Lock,
  TrendingUp, Heart, Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
type Chapter = {
  id: string;
  title: string;
  blurb: string;
  icon: React.ReactNode;
  duration: number; // ms
  Scene: React.FC<{ progress: number }>;
};

/* ------------------------------------------------------------------ */
/* Reusable sim chrome                                                */
/* ------------------------------------------------------------------ */
const FakeWindow: React.FC<{ title: string; children: React.ReactNode; accent?: string }> = ({
  title, children, accent = "from-primary/30 to-purple-500/20",
}) => (
  <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur overflow-hidden shadow-2xl">
    <div className={`flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-gradient-to-r ${accent}`}>
      <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
      <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
      <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
      <span className="ml-3 text-xs text-foreground/70 font-medium">{title}</span>
    </div>
    <div className="p-5 min-h-[360px]">{children}</div>
  </div>
);

const TypeOn: React.FC<{ text: string; progress: number; className?: string }> = ({ text, progress, className }) => {
  const n = Math.floor(text.length * Math.min(1, progress));
  return <span className={className}>{text.slice(0, n)}<span className="opacity-60 animate-pulse">▍</span></span>;
};

const Bar: React.FC<{ label: string; value: number; max?: number; tint?: string }> = ({ label, value, max = 100, tint = "bg-primary" }) => (
  <div>
    <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{label}</span><span className="font-medium">{Math.round(value)}</span></div>
    <div className="h-2 rounded bg-muted overflow-hidden"><div className={`h-full ${tint} transition-all duration-300`} style={{ width: `${(value / max) * 100}%` }} /></div>
  </div>
);

/* ------------------------------------------------------------------ */
/* STUDENT scenes                                                     */
/* ------------------------------------------------------------------ */
const StudentProcessTeaching: React.FC<{ progress: number }> = ({ progress }) => {
  const step = progress < 0.4 ? 0 : progress < 0.55 ? 1 : 2;
  return (
    <FakeWindow title="Refyn — AI Learning Assistant" accent="from-blue-500/20 to-cyan-400/20">
      <div className="space-y-3 text-sm">
        <div className="flex justify-end">
          <div className="bg-primary/15 border border-primary/30 rounded-2xl rounded-tr-sm px-4 py-2 max-w-md">
            <TypeOn text="Just give me the answer to 7 × 8" progress={Math.min(1, progress / 0.35)} />
          </div>
        </div>
        {step >= 1 && (
          <div className="flex items-center gap-2 text-xs text-yellow-500">
            <Shield className="h-3.5 w-3.5" /> Process Teaching Mode rewriting...
          </div>
        )}
        {step >= 2 && (
          <div className="flex justify-start">
            <div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg space-y-2">
              <div className="font-medium">Let's discover it together! 🧠</div>
              <div className="text-muted-foreground">Think of 7 × 8 as 7 × 10 minus 7 × 2.</div>
              <div className="text-muted-foreground">7 × 10 = 70. What is 7 × 2?</div>
              <div className="flex gap-2 pt-1">
                <Badge variant="secondary" className="text-xs">No direct answer</Badge>
                <Badge variant="outline" className="text-xs">Logged for teacher</Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </FakeWindow>
  );
};

const StudentLearningPath: React.FC<{ progress: number }> = ({ progress }) => {
  const modules = [
    { name: "Forces & Motion", done: progress > 0.2 },
    { name: "Free-body diagrams", done: progress > 0.45 },
    { name: "Newton's 2nd Law mini-quiz", done: progress > 0.7 },
    { name: "Capstone: Bridge design", done: progress > 0.95 },
  ];
  return (
    <FakeWindow title="Personalized Learning Path · Physics MYP 4" accent="from-emerald-500/20 to-teal-400/20">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Compass className="h-5 w-5 text-emerald-400" />
          <div><div className="font-semibold">Forces in 2D</div><div className="text-xs text-muted-foreground">AI-generated · 4 modules · ~3h</div></div>
          <Badge className="ml-auto" variant="secondary">{modules.filter(m => m.done).length}/4 done</Badge>
        </div>
        <div className="space-y-2">
          {modules.map((m, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${m.done ? "bg-emerald-500/10 border-emerald-500/30" : "border-border/60"}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${m.done ? "bg-emerald-500 text-white" : "bg-muted"}`}>{m.done ? "✓" : i + 1}</div>
              <span className={m.done ? "line-through text-muted-foreground" : ""}>{m.name}</span>
            </div>
          ))}
        </div>
        <Bar label="Mastery score" value={20 + progress * 75} tint="bg-emerald-400" />
      </div>
    </FakeWindow>
  );
};

const StudentLearnerProfile: React.FC<{ progress: number }> = ({ progress }) => {
  const badges = [
    { name: "Inquirer", tier: "Gold", icon: "🥇" },
    { name: "Thinker", tier: "Silver", icon: "🥈" },
    { name: "Communicator", tier: "Gold", icon: "🥇" },
    { name: "Reflective", tier: "Silver", icon: "🥈" },
    { name: "Caring", tier: "Bronze", icon: "🥉" },
    { name: "Risk-taker", tier: "Emerging", icon: "⚪" },
  ];
  const shown = Math.ceil(badges.length * Math.min(1, progress / 0.85));
  return (
    <FakeWindow title="IB Learner Profile Portfolio" accent="from-amber-500/20 to-orange-400/20">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Award className="h-5 w-5 text-amber-400" />
          <div className="font-semibold">Aanya's Learner Profile</div>
          <Badge variant="outline" className="ml-auto">Auto-curated from chats & reflections</Badge>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {badges.slice(0, shown).map((b) => (
            <Card key={b.name} className="p-3 text-center animate-in fade-in zoom-in-95">
              <div className="text-3xl">{b.icon}</div>
              <div className="font-medium mt-1 text-sm">{b.name}</div>
              <div className="text-xs text-muted-foreground">{b.tier}</div>
            </Card>
          ))}
        </div>
        {progress > 0.85 && (
          <div className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-3 animate-in fade-in">
            "Aanya consistently reframes problems before solving — a true Inquirer pattern across 14 chat sessions."
          </div>
        )}
      </div>
    </FakeWindow>
  );
};

const StudentLiveQuiz: React.FC<{ progress: number }> = ({ progress }) => {
  const phase = progress < 0.3 ? "lobby" : progress < 0.75 ? "question" : "leaderboard";
  return (
    <FakeWindow title="Live Quiz · Room 4F2K · Q3 of 10" accent="from-fuchsia-500/20 to-pink-500/20">
      {phase === "lobby" && (
        <div className="text-center py-10 space-y-4">
          <div className="text-5xl font-bold tracking-widest text-primary">4F2K</div>
          <div className="text-muted-foreground">Waiting for players...</div>
          <div className="flex justify-center gap-2 flex-wrap">{["Aanya", "Vihaan", "Sara", "Kabir", "Diya"].map(n => <Badge key={n}>{n} ✓</Badge>)}</div>
        </div>
      )}
      {phase === "question" && (
        <div className="space-y-4">
          <div className="font-semibold">What is the unit of force in SI?</div>
          <div className="grid grid-cols-2 gap-2">
            {["Joule", "Newton", "Pascal", "Watt"].map((opt, i) => (
              <button key={opt} className={`p-3 rounded-lg border text-left text-sm transition-all ${i === 1 && progress > 0.6 ? "bg-emerald-500/20 border-emerald-500" : "border-border hover:bg-muted"}`}>
                {String.fromCharCode(65 + i)}. {opt}
              </button>
            ))}
          </div>
          <Progress value={(progress - 0.3) * 200} className="h-1.5" />
        </div>
      )}
      {phase === "leaderboard" && (
        <div className="space-y-2">
          <div className="text-sm font-medium mb-2">🏆 Leaderboard</div>
          {[{ n: "Aanya", s: 2840 }, { n: "Vihaan", s: 2610 }, { n: "Sara", s: 2400 }].map((p, i) => (
            <div key={p.n} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span>{["🥇", "🥈", "🥉"][i]} {p.n}</span><span className="font-mono">{p.s}</span>
            </div>
          ))}
        </div>
      )}
    </FakeWindow>
  );
};

const StudentPortfolio: React.FC<{ progress: number }> = ({ progress }) => (
  <FakeWindow title="Public Portfolio · refyntech.us/p/aanya" accent="from-indigo-500/20 to-purple-500/20">
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
        <div><div className="font-semibold">Aanya Mehta</div><div className="text-xs text-muted-foreground">MYP 4 · Physics & Design</div></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["Bridge Stress IA", "Climate data viz", "Robotics arm", "Sound waves lab"].slice(0, Math.ceil(4 * progress)).map((t, i) => (
          <Card key={i} className="p-3 text-sm animate-in fade-in zoom-in-95">
            <div className="h-16 rounded bg-gradient-to-br from-primary/30 to-accent/30 mb-2" />
            <div className="font-medium truncate">{t}</div>
            <div className="text-xs text-muted-foreground">Capstone · Grade 7/7</div>
          </Card>
        ))}
      </div>
    </div>
  </FakeWindow>
);

/* ------------------------------------------------------------------ */
/* TEACHER scenes                                                     */
/* ------------------------------------------------------------------ */
const TeacherClassRisk: React.FC<{ progress: number }> = ({ progress }) => {
  const students = [
    { n: "Aanya", risk: 12, color: "bg-emerald-400" },
    { n: "Vihaan", risk: 38, color: "bg-yellow-400" },
    { n: "Sara", risk: 71, color: "bg-orange-500" },
    { n: "Kabir", risk: 84, color: "bg-red-500" },
    { n: "Diya", risk: 22, color: "bg-emerald-400" },
  ];
  return (
    <FakeWindow title="Class Risk Radar · Physics MYP 4" accent="from-red-500/15 to-orange-400/15">
      <div className="space-y-3">
        <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-400" /><div className="font-semibold">AI flagged 2 students at risk this week</div></div>
        <div className="space-y-2">
          {students.map((s, i) => (
            <div key={s.n} className="flex items-center gap-3">
              <div className="w-16 text-sm">{s.n}</div>
              <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                <div className={`h-full ${s.color} transition-all duration-700`} style={{ width: `${progress > i * 0.15 ? s.risk : 0}%` }} />
              </div>
              <div className="w-10 text-xs text-right text-muted-foreground">{Math.round(progress > i * 0.15 ? s.risk : 0)}%</div>
            </div>
          ))}
        </div>
        {progress > 0.85 && (
          <div className="text-xs italic border-l-2 border-orange-500/50 pl-3 animate-in fade-in">
            Suggestion: 1-on-1 with Kabir Friday; assign scaffolded practice path; reduce homework load by 20%.
          </div>
        )}
      </div>
    </FakeWindow>
  );
};

const TeacherIBMapper: React.FC<{ progress: number }> = ({ progress }) => {
  const rows = [
    { c: "Criterion A: Knowing", cov: "🟢 Strong", w: 90 },
    { c: "Criterion B: Inquiring", cov: "🟡 Partial", w: 55 },
    { c: "Criterion C: Processing", cov: "🟢 Strong", w: 85 },
    { c: "Criterion D: Reflecting", cov: "🔴 Gap", w: 18 },
  ];
  return (
    <FakeWindow title="IB Standards Auto-Mapper · MYP Sciences" accent="from-teal-500/20 to-cyan-400/20">
      <div className="space-y-3">
        <div className="flex items-center gap-2"><Compass className="h-5 w-5 text-teal-400" /><div className="font-semibold">Coverage Heatmap — Forces Unit</div></div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm"><span>{r.c}</span><span className="text-xs">{r.cov}</span></div>
              <div className="h-2 rounded bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-700" style={{ width: `${progress > i * 0.15 ? r.w : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        {progress > 0.8 && <div className="text-xs italic text-muted-foreground border-l-2 border-teal-500/50 pl-3 animate-in fade-in">Add a reflective journal entry to close Criterion D gap.</div>}
      </div>
    </FakeWindow>
  );
};

const TeacherSubjectLab: React.FC<{ progress: number }> = ({ progress }) => (
  <FakeWindow title="Subject Lab · Physics — Uncertainty Calculator" accent="from-purple-500/20 to-fuchsia-500/20">
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-purple-400" /><span className="font-semibold">Input: L = 1.24 ± 0.02 m, T = 2.21 ± 0.05 s</span></div>
      {progress > 0.3 && (
        <Card className="p-3 font-mono text-xs space-y-1 animate-in fade-in">
          <div>g = 4π²L / T²</div>
          <div>g = 4 × (3.1416)² × 1.24 / (2.21)²</div>
          <div>g = <span className="text-emerald-400">10.02 m/s²</span></div>
        </Card>
      )}
      {progress > 0.6 && (
        <Card className="p-3 text-xs space-y-1 animate-in fade-in">
          <div>Δg/g = ΔL/L + 2·ΔT/T</div>
          <div>= 0.0161 + 0.0452 = <span className="text-orange-400">6.13%</span></div>
          <div className="pt-1 border-t border-border/50">Final: g = 10.0 ± 0.6 m/s²</div>
        </Card>
      )}
      {progress > 0.9 && <Badge className="animate-in fade-in">✓ IA-ready snippet generated</Badge>}
    </div>
  </FakeWindow>
);

const TeacherParentBrief: React.FC<{ progress: number }> = ({ progress }) => (
  <FakeWindow title="Parent Brief Co-Pilot · Weekly emails" accent="from-rose-500/20 to-pink-400/20">
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-rose-400" /><span className="font-semibold">5 personalised parent emails drafted in 4 seconds</span></div>
      <Card className="p-3 text-xs space-y-2">
        <div className="font-medium">📩 To: Mr & Mrs Sharma — about Vihaan</div>
        <div className="text-muted-foreground italic">
          <TypeOn progress={Math.min(1, progress / 0.9)} text="Dear Mr & Mrs Sharma, Vihaan had a strong week with energy diagrams — he explained one to a peer unprompted. He's still working on units in calculations; a 5-minute nightly review of SI prefixes would help. Thank you for partnering with us." />
        </div>
        <div className="flex gap-1"><Badge variant="secondary" className="text-xs">EN</Badge><Badge variant="outline" className="text-xs">HI translation ready</Badge></div>
      </Card>
    </div>
  </FakeWindow>
);

const TeacherRecipeMarket: React.FC<{ progress: number }> = ({ progress }) => {
  const recipes = [
    { t: "Vinod's Hypothesis Generator", r: 4.9, runs: 142 },
    { t: "Vineet's Math IA Sparker", r: 4.8, runs: 98 },
    { t: "Rohit's Source Triangulator", r: 4.7, runs: 67 },
  ];
  return (
    <FakeWindow title="Process Recipe Marketplace" accent="from-amber-500/20 to-yellow-400/20">
      <div className="space-y-3">
        <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-400" /><span className="font-semibold">Top recipes at MISP this week</span></div>
        <div className="grid gap-2">
          {recipes.slice(0, Math.ceil(recipes.length * progress)).map((r, i) => (
            <Card key={i} className="p-3 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
              <div><div className="font-medium text-sm">{r.t}</div><div className="text-xs text-muted-foreground">⭐ {r.r} · {r.runs} runs</div></div>
              <Button size="sm" variant="outline">Use</Button>
            </Card>
          ))}
        </div>
      </div>
    </FakeWindow>
  );
};

/* ------------------------------------------------------------------ */
/* ADMIN scenes                                                       */
/* ------------------------------------------------------------------ */
const AdminGovernance: React.FC<{ progress: number }> = ({ progress }) => {
  const stats = [
    { l: "Prompts today", v: Math.round(progress * 12480), icon: <MessageSquare className="h-4 w-4" /> },
    { l: "Moderated", v: Math.round(progress * 184), icon: <Shield className="h-4 w-4" /> },
    { l: "Bypass attempts", v: Math.round(progress * 7), icon: <AlertTriangle className="h-4 w-4" /> },
    { l: "Active classes", v: Math.round(progress * 42), icon: <Users className="h-4 w-4" /> },
  ];
  return (
    <FakeWindow title="AI Governance Dashboard · Live" accent="from-blue-500/20 to-indigo-500/20">
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {stats.map((s, i) => (
            <Card key={i} className="p-3 text-center">
              <div className="flex justify-center text-primary mb-1">{s.icon}</div>
              <div className="text-xl font-bold tabular-nums">{s.v.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.l}</div>
            </Card>
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">Live prompt feed</div>
          {["✅ Math: 'Help me factor 6x² + 5x − 4'", "🛡️ Rewritten: 'Just give me the answer'", "✅ Bio: 'Why do cells divide?'", "🚨 Bypass attempt blocked: model jailbreak"].map((t, i) => (
            <div key={i} className="text-xs px-2 py-1.5 rounded bg-muted/50 font-mono">{t}</div>
          ))}
        </div>
      </div>
    </FakeWindow>
  );
};

const AdminAirTraffic: React.FC<{ progress: number }> = ({ progress }) => {
  const classes = [
    { n: "MYP 4 Physics", h: 92, c: "bg-emerald-400" },
    { n: "DP Math AA HL", h: 76, c: "bg-emerald-400" },
    { n: "MYP 3 I&S", h: 54, c: "bg-yellow-400" },
    { n: "PYP 5 UoI", h: 88, c: "bg-emerald-400" },
    { n: "DP Econ SL", h: 31, c: "bg-orange-400" },
  ];
  return (
    <FakeWindow title="Pilot Command Center · Air Traffic Control" accent="from-cyan-500/20 to-sky-500/20">
      <div className="space-y-3">
        <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-cyan-400" /><span className="font-semibold">Live class health</span></div>
        <div className="grid grid-cols-5 gap-2 h-32 items-end">
          {classes.map((c, i) => (
            <div key={c.n} className="flex flex-col items-center gap-1">
              <div className={`w-full ${c.c} rounded-t transition-all duration-700`} style={{ height: `${progress > i * 0.1 ? c.h : 0}%` }} />
              <div className="text-[10px] text-center leading-tight">{c.n}</div>
            </div>
          ))}
        </div>
        {progress > 0.8 && <div className="text-xs italic border-l-2 border-cyan-500/50 pl-3 animate-in fade-in">⚠️ DP Econ SL energy dipping — recommend check-in with teacher.</div>}
      </div>
    </FakeWindow>
  );
};

const AdminPolicySandbox: React.FC<{ progress: number }> = ({ progress }) => (
  <FakeWindow title="Policy Sandbox · Simulate before you ship" accent="from-violet-500/20 to-purple-500/20">
    <div className="space-y-3 text-sm">
      <Card className="p-3"><div className="text-xs text-muted-foreground">Proposed change</div><div className="font-medium">Disable image generation for grades 6–8</div></Card>
      {progress > 0.4 && (
        <div className="grid grid-cols-3 gap-2 animate-in fade-in">
          <Card className="p-3 text-center"><div className="text-xs text-muted-foreground">Affected users</div><div className="text-xl font-bold text-orange-400">412</div></Card>
          <Card className="p-3 text-center"><div className="text-xs text-muted-foreground">Friction risk</div><div className="text-xl font-bold text-yellow-400">Medium</div></Card>
          <Card className="p-3 text-center"><div className="text-xs text-muted-foreground">Verdict</div><div className="text-xl font-bold text-emerald-400">🟢 GO</div></Card>
        </div>
      )}
      {progress > 0.8 && <div className="text-xs italic border-l-2 border-violet-500/50 pl-3 animate-in fade-in">Phased rollout: grade 6 first (2 weeks), then 7-8. Estimated complaint volume: low.</div>}
    </div>
  </FakeWindow>
);

const AdminBudget: React.FC<{ progress: number }> = ({ progress }) => (
  <FakeWindow title="AI Budget Optimizer" accent="from-emerald-500/20 to-lime-400/20">
    <div className="space-y-3">
      <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-400" /><span className="font-semibold">Last 30 days spend by model</span></div>
      <Bar label="gemini-2.5-pro · $412" value={progress * 100} tint="bg-red-400" />
      <Bar label="gemini-3-flash · $148" value={progress * 60} tint="bg-yellow-400" />
      <Bar label="gemini-3-flash-lite · $22" value={progress * 18} tint="bg-emerald-400" />
      {progress > 0.7 && (
        <Card className="p-3 text-sm bg-emerald-500/10 border-emerald-500/30 animate-in fade-in">
          <div className="font-medium text-emerald-400">💡 Save $260/mo</div>
          <div className="text-xs text-muted-foreground mt-1">Route MYP chat → Flash; reserve Pro for DP IA reviews only.</div>
        </Card>
      )}
    </div>
  </FakeWindow>
);

/* ------------------------------------------------------------------ */
/* Chapter registry                                                   */
/* ------------------------------------------------------------------ */
const STUDENT: Chapter[] = [
  { id: "pt", title: "Process Teaching Mode", blurb: "AI never gives the answer — it guides students to discover it.", icon: <Brain />, duration: 7000, Scene: StudentProcessTeaching },
  { id: "lp", title: "Personalized Learning Paths", blurb: "AI builds a custom journey from your gaps, with adaptive modules.", icon: <Compass />, duration: 6500, Scene: StudentLearningPath },
  { id: "badges", title: "IB Learner Profile Portfolio", blurb: "Evidence-based Bronze/Silver/Gold badges across all 10 attributes.", icon: <Award />, duration: 6000, Scene: StudentLearnerProfile },
  { id: "quiz", title: "Live Multiplayer Quizzes", blurb: "Kahoot-style real-time quizzes with a 'Second Chance' mechanic.", icon: <Zap />, duration: 8000, Scene: StudentLiveQuiz },
  { id: "port", title: "Shareable Portfolio", blurb: "A public web portfolio for capstones, projects, and reflections.", icon: <FileText />, duration: 5500, Scene: StudentPortfolio },
];

const TEACHER: Chapter[] = [
  { id: "risk", title: "Class Risk Radar", blurb: "AI surfaces students at risk weeks before grades drop.", icon: <AlertTriangle />, duration: 6500, Scene: TeacherClassRisk },
  { id: "ib", title: "IB Standards Auto-Mapper", blurb: "Every lesson auto-tagged to PYP/MYP/DP with live coverage heatmaps.", icon: <Compass />, duration: 6500, Scene: TeacherIBMapper },
  { id: "lab", title: "Subject-Specific AI Labs", blurb: "Deep tools for Physics IA, Math explorations, I&S cases, Econ Paper-2.", icon: <FlaskConical />, duration: 6500, Scene: TeacherSubjectLab },
  { id: "parent", title: "Parent Brief Co-Pilot", blurb: "Personalised weekly parent emails — multilingual, in seconds.", icon: <Heart />, duration: 7000, Scene: TeacherParentBrief },
  { id: "rec", title: "Process Recipe Marketplace", blurb: "Share, rate, and reuse the best AI prompt recipes school-wide.", icon: <Sparkles />, duration: 5500, Scene: TeacherRecipeMarket },
];

const ADMIN: Chapter[] = [
  { id: "gov", title: "AI Governance Dashboard", blurb: "Live monitoring of every prompt, moderation, and bypass attempt.", icon: <Shield />, duration: 7000, Scene: AdminGovernance },
  { id: "atc", title: "Pilot Air-Traffic Control", blurb: "Real-time school-wide health for every class, every period.", icon: <BarChart3 />, duration: 6500, Scene: AdminAirTraffic },
  { id: "pol", title: "Policy Sandbox", blurb: "Simulate the impact of an AI policy change before you ship it.", icon: <Wand2 />, duration: 6500, Scene: AdminPolicySandbox },
  { id: "bud", title: "AI Budget Optimizer", blurb: "Auto-routing recommendations to cut spend 30–60% with no quality loss.", icon: <TrendingUp />, duration: 6500, Scene: AdminBudget },
];

const ROLES = {
  student: { label: "Student", icon: <GraduationCap className="h-4 w-4" />, color: "from-blue-500 to-cyan-400", chapters: STUDENT },
  teacher: { label: "Teacher", icon: <BookOpen className="h-4 w-4" />, color: "from-emerald-500 to-teal-400", chapters: TEACHER },
  admin: { label: "Admin", icon: <Shield className="h-4 w-4" />, color: "from-purple-500 to-fuchsia-400", chapters: ADMIN },
} as const;
type RoleKey = keyof typeof ROLES;

/* ------------------------------------------------------------------ */
/* Player                                                             */
/* ------------------------------------------------------------------ */
const RolePlayer: React.FC<{ role: RoleKey }> = ({ role }) => {
  const chapters = ROLES[role].chapters;
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 within current chapter
  const [playing, setPlaying] = useState(true);
  const startRef = useRef<number>(Date.now());

  // reset when role/chapter changes
  useEffect(() => { startRef.current = Date.now(); setProgress(0); }, [idx, role]);
  useEffect(() => { setIdx(0); }, [role]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(1, elapsed / chapters[idx].duration);
      setProgress(p);
      if (p >= 1) {
        if (idx < chapters.length - 1) {
          setIdx(idx + 1);
        } else {
          setPlaying(false);
        }
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, idx, chapters]);

  const chapter = chapters[idx];
  const Scene = chapter.Scene;

  const jump = (i: number) => { setIdx(i); setPlaying(true); };
  const next = () => idx < chapters.length - 1 && jump(idx + 1);
  const prev = () => idx > 0 && jump(idx - 1);
  const restart = () => { setIdx(0); setProgress(0); startRef.current = Date.now(); setPlaying(true); };

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6">
      {/* Chapter list */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Chapters</div>
        {chapters.map((c, i) => (
          <button
            key={c.id}
            onClick={() => jump(i)}
            className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
              i === idx
                ? `border-primary bg-gradient-to-r ${ROLES[role].color} bg-opacity-10 shadow-lg`
                : "border-border/50 hover:border-border hover:bg-muted/40"
            }`}
          >
            <div className={`mt-0.5 ${i === idx ? "text-primary-foreground" : "text-muted-foreground"}`}>{c.icon}</div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${i === idx ? "" : ""}`}>{c.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.blurb}</div>
            </div>
            {i === idx && playing && <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse mt-1.5" />}
          </button>
        ))}
      </div>

      {/* Stage */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Chapter {idx + 1} of {chapters.length}</div>
            <h3 className="text-2xl font-bold mt-1">{chapter.title}</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">{chapter.blurb}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={prev} disabled={idx === 0}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" onClick={() => setPlaying(p => !p)}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
            <Button size="icon" variant="ghost" onClick={next} disabled={idx === chapters.length - 1}><ChevronRight className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={restart}><RotateCcw className="h-4 w-4" /></Button>
          </div>
        </div>

        <Progress value={progress * 100} className="h-1" />

        <div className="relative">
          <Scene progress={progress} />
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */
const DemoShowcasePage: React.FC = () => {
  const [role, setRole] = useState<RoleKey>("student");
  const totalChapters = useMemo(() => STUDENT.length + TEACHER.length + ADMIN.length, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Top bar */}
      <header className="border-b border-border/50 backdrop-blur sticky top-0 z-30 bg-background/70">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center"><Sparkles className="h-4 w-4 text-primary-foreground" /></div>
            <div>
              <div className="font-bold">Refyn · Interactive Demo</div>
              <div className="text-xs text-muted-foreground">No login required · {totalChapters} simulated features</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5"><Lock className="h-3 w-3" /> Safe sandbox · zero real data</Badge>
            <Button asChild size="sm" variant="outline"><Link to="/login">Sign in</Link></Button>
            <Button asChild size="sm"><Link to="/register">Request access</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live simulated walkthrough
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">
          See Refyn for every role,<br className="hidden md:inline" /> in 90 seconds.
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto mt-4 text-lg">
          Watch fully animated, interactive simulations of what students, teachers, and administrators experience inside Refyn — every demo runs locally with synthetic data.
        </p>
      </section>

      {/* Role switcher + player */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <Tabs value={role} onValueChange={(v) => setRole(v as RoleKey)}>
          <TabsList className="grid grid-cols-3 w-full max-w-xl mx-auto mb-8 h-12 p-1">
            {(Object.keys(ROLES) as RoleKey[]).map(k => (
              <TabsTrigger key={k} value={k} className="gap-2 text-sm h-full">
                {ROLES[k].icon} {ROLES[k].label}
              </TabsTrigger>
            ))}
          </TabsList>
          {(Object.keys(ROLES) as RoleKey[]).map(k => (
            <TabsContent key={k} value={k} className="mt-0">
              <RolePlayer role={k} />
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-20 text-center">
        <Card className="p-8 bg-gradient-to-br from-primary/10 via-card to-purple-500/10 border-primary/30">
          <h2 className="text-2xl font-bold">Want this for your school?</h2>
          <p className="text-muted-foreground mt-2">Refyn is currently rolling out with select pilot schools. Request a private walkthrough with your real curriculum.</p>
          <div className="flex justify-center gap-3 mt-5 flex-wrap">
            <Button asChild><Link to="/register">Request a pilot</Link></Button>
            <Button asChild variant="outline"><Link to="/login">I have an account</Link></Button>
          </div>
        </Card>
        <div className="text-xs text-muted-foreground mt-6">All names, scores, and data shown above are synthetic. No student records were used.</div>
      </section>
    </div>
  );
};

export default DemoShowcasePage;
