import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, BookOpen, GraduationCap, Layers, MessageSquare,
  ShieldCheck, Sparkles, Users, Zap, RefreshCcw, ExternalLink, Radio,
  FileText, Award, Gauge, Loader2, Download, Copy, TrendingUp, LineChart as LineChartIcon, Printer, Clock,
} from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

const SUBDOMAIN = "mahindra-pune";
const MASTER_ADMIN_EMAIL = "info.aiconditioner@gmail.com";

type SchoolRow = { id: string; name: string; subdomain: string; description: string | null };
type TeacherView = {
  user_id: string; full_name: string; email: string;
  classes: number; students: number;
  prompts_7d: number; flagged_7d: number;
  tokens_used: number; token_limit: number;
};
type PulseEvent = {
  id: string; kind: "prompt" | "flag" | "path" | "capstone" | "bypass";
  who: string; what: string; when: string;
};
type Spotlight = { teacher: string; headline: string; evidence: string; suggestion: string };
type Health = {
  score: number; grade: string;
  subscores: Record<string, { value: number; note: string }>;
  top_risk: string; top_win: string;
};

const formatNum = (n: number) => new Intl.NumberFormat().format(n);
const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const Stat = ({ icon: Icon, label, value, sub, tone = "default" }: any) => {
  const toneCls =
    tone === "success" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
    : tone === "warn" ? "text-amber-400 border-amber-500/30 bg-amber-500/5"
    : tone === "danger" ? "text-rose-400 border-rose-500/30 bg-rose-500/5"
    : "text-slate-200 border-slate-700/60 bg-slate-900/40";
  return (
    <div className={`rounded-xl border ${toneCls} backdrop-blur p-5 transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-slate-400">{label}</span>
        <Icon className="h-4 w-4 opacity-70" />
      </div>
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
};

const PilotMahindraConsole: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [teachers, setTeachers] = useState<TeacherView[]>([]);
  const [totals, setTotals] = useState({
    classes: 0, students: 0, prompts_7d: 0, flagged_7d: 0,
    tokens_used: 0, token_limit: 0, paths: 0, capstones: 0, bypass_7d: 0, cost_7d: 0,
  });
  const [pulse, setPulse] = useState<PulseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState("overview");

  // AI feature state
  const [briefing, setBriefing] = useState<string>("");
  const [briefLoading, setBriefLoading] = useState(false);
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [spotLoading, setSpotLoading] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Trends state
  const [trendRows, setTrendRows] = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  // Authorize
  useEffect(() => {
    if (isLoading) return;
    (async () => {
      if (!user) { setAuthorized(false); return; }
      if (user.email?.toLowerCase() === MASTER_ADMIN_EMAIL) { setAuthorized(true); return; }
      const { data: s } = await supabase.from("schools").select("id").eq("subdomain", SUBDOMAIN).maybeSingle();
      if (!s) { setAuthorized(false); return; }
      const { data: m } = await supabase
        .from("school_members").select("school_role")
        .eq("school_id", s.id).eq("user_id", user.id).maybeSingle();
      setAuthorized(!!m && m.school_role === "admin");
    })();
  }, [user, isLoading]);

  // Load metrics
  useEffect(() => {
    if (!authorized) return;
    (async () => {
      setLoading(true);
      try {
        const { data: s } = await supabase.from("schools")
          .select("id, name, subdomain, description").eq("subdomain", SUBDOMAIN).maybeSingle();
        if (!s) { setLoading(false); return; }
        setSchool(s);

        const { data: members } = await supabase.from("school_members")
          .select("user_id, school_role").eq("school_id", s.id);
        const teacherIds = (members ?? []).filter(m => m.school_role === "teacher").map(m => m.user_id);

        const { data: profiles } = await supabase.from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", teacherIds.length ? teacherIds : ["00000000-0000-0000-0000-000000000000"]);

        const { data: classes } = await supabase.from("classes")
          .select("id, name, teacher_id").eq("school_id", s.id);
        const classIds = (classes ?? []).map(c => c.id);

        let classMembers: any[] = [];
        if (classIds.length) {
          const res = await supabase.from("class_members").select("student_id, class_id").in("class_id", classIds);
          classMembers = (res.data as any[]) ?? [];
        }

        const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
        const studentSet = new Set(classMembers.map(m => m.student_id));
        const allIds = [...new Set([...teacherIds, ...studentSet])];

        let logs: any[] = [];
        let chats: any[] = [];
        let bypass: any[] = [];
        if (allIds.length) {
          const [l, c, b] = await Promise.all([
            supabase.from("ai_usage_logs")
              .select("user_id, total_tokens, estimated_cost_usd, model, created_at")
              .in("user_id", allIds).gte("created_at", sevenAgo)
              .order("created_at", { ascending: false }),
            supabase.from("ai_chat_messages")
              .select("id, user_id, role, content, moderation_status, severity, created_at")
              .in("user_id", allIds).gte("created_at", sevenAgo)
              .order("created_at", { ascending: false }).limit(200),
            supabase.from("bypass_attempts")
              .select("id, user_id, attempt_type, severity, created_at")
              .in("user_id", allIds).gte("created_at", sevenAgo)
              .order("created_at", { ascending: false }),
          ]);
          logs = (l.data as any[]) ?? [];
          chats = (c.data as any[]) ?? [];
          bypass = (b.data as any[]) ?? [];
        }

        let plans: any[] = [];
        if (teacherIds.length) {
          const r = await supabase.from("user_plans")
            .select("user_id, tokens_used_this_month, monthly_token_limit, status")
            .in("user_id", teacherIds).eq("status", "active");
          plans = (r.data as any[]) ?? [];
        }
        let paths: any[] = [];
        if (teacherIds.length) {
          const r = await supabase.from("learning_paths")
            .select("id, title, created_by, created_at")
            .in("created_by", teacherIds)
            .order("created_at", { ascending: false }).limit(20);
          paths = (r.data as any[]) ?? [];
        }
        let caps: any[] = [];
        if (classIds.length) {
          const r = await (supabase.from("capstone_submissions") as any)
            .select("id, class_id, status, created_at")
            .in("class_id", classIds)
            .order("created_at", { ascending: false }).limit(20);
          caps = (r.data as any[]) ?? [];
        }

        const nameOf = (uid: string) =>
          (profiles ?? []).find(p => p.user_id === uid)?.full_name
          ?? (profiles ?? []).find(p => p.user_id === uid)?.email
          ?? "Student";

        const teacherView: TeacherView[] = (profiles ?? []).map(p => {
          const tClasses = (classes ?? []).filter(c => c.teacher_id === p.user_id);
          const tClassIds = tClasses.map(c => c.id);
          const tStudents = new Set(classMembers.filter(m => tClassIds.includes(m.class_id)).map(m => m.student_id));
          const tStudentIds = [...tStudents];
          const tChats = chats.filter(c => c.user_id === p.user_id || tStudentIds.includes(c.user_id));
          const plan = plans.find(pl => pl.user_id === p.user_id);
          return {
            user_id: p.user_id,
            full_name: p.full_name ?? p.email ?? "Teacher",
            email: p.email ?? "",
            classes: tClasses.length,
            students: tStudents.size,
            prompts_7d: tChats.filter(c => c.role === "user").length,
            flagged_7d: tChats.filter(c => c.moderation_status === "flagged").length,
            tokens_used: plan?.tokens_used_this_month ?? 0,
            token_limit: plan?.monthly_token_limit ?? 0,
          };
        }).sort((a, b) => b.prompts_7d - a.prompts_7d);
        setTeachers(teacherView);

        // Live pulse — interleave most recent events
        const events: PulseEvent[] = [];
        chats.slice(0, 40).filter(c => c.role === "user").forEach(c => events.push({
          id: `c-${c.id}`,
          kind: c.moderation_status === "flagged" ? "flag" : "prompt",
          who: nameOf(c.user_id),
          what: c.moderation_status === "flagged"
            ? `Flagged prompt — ${(c.content ?? "").slice(0, 90)}…`
            : (c.content ?? "").slice(0, 110),
          when: c.created_at,
        }));
        paths.slice(0, 10).forEach(p => events.push({
          id: `p-${p.id}`, kind: "path",
          who: nameOf(p.created_by),
          what: `Authored learning path · ${p.title}`,
          when: p.created_at,
        }));
        caps.slice(0, 10).forEach(c => events.push({
          id: `k-${c.id}`, kind: "capstone",
          who: "Student",
          what: `Capstone submission · ${c.status ?? "submitted"}`,
          when: c.created_at,
        }));
        bypass.slice(0, 10).forEach(b => events.push({
          id: `b-${b.id}`, kind: "bypass",
          who: nameOf(b.user_id),
          what: `Bypass attempt · ${b.attempt_type ?? "unknown"} (${b.severity ?? "—"})`,
          when: b.created_at,
        }));
        events.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
        setPulse(events.slice(0, 60));

        setTotals({
          classes: (classes ?? []).length,
          students: studentSet.size,
          prompts_7d: chats.filter(c => c.role === "user").length,
          flagged_7d: chats.filter(c => c.moderation_status === "flagged").length,
          tokens_used: plans.reduce((s, p) => s + (p.tokens_used_this_month ?? 0), 0),
          token_limit: plans.reduce((s, p) => s + (p.monthly_token_limit ?? 0), 0),
          paths: paths.length,
          capstones: caps.length,
          bypass_7d: bypass.length,
          cost_7d: logs.reduce((s, l) => s + Number(l.estimated_cost_usd ?? 0), 0),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [authorized, refreshKey]);

  const tokenPct = useMemo(
    () => totals.token_limit ? Math.min(100, Math.round((totals.tokens_used / totals.token_limit) * 100)) : 0,
    [totals],
  );

  // Load pilot_metrics trend history
  useEffect(() => {
    if (!school?.id) return;
    (async () => {
      setTrendLoading(true);
      try {
        const { data } = await supabase.from("pilot_metrics")
          .select("*").eq("school_id", school.id).order("snapshot_date", { ascending: true });
        setTrendRows((data ?? []) as any[]);
      } finally { setTrendLoading(false); }
    })();
  }, [school?.id, refreshKey]);


  const callIntel = async (action: "briefing" | "spotlights" | "health") => {
    const { data, error } = await supabase.functions.invoke("pilot-mahindra-intelligence", { body: { action } });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const runBriefing = async () => {
    setBriefLoading(true);
    try {
      const d = await callIntel("briefing");
      setBriefing((d as any).result ?? "");
      toast.success("Weekly executive briefing generated");
    } catch (e: any) { toast.error(e.message ?? "Failed to generate briefing"); }
    finally { setBriefLoading(false); }
  };
  const runSpotlights = async () => {
    setSpotLoading(true);
    try {
      const d = await callIntel("spotlights");
      const r = (d as any).result;
      const arr: Spotlight[] = Array.isArray(r) ? r : (r?.spotlights ?? r?.teachers ?? []);
      setSpotlights(arr);
      toast.success("Teacher spotlights ready");
    } catch (e: any) { toast.error(e.message ?? "Failed to generate spotlights"); }
    finally { setSpotLoading(false); }
  };
  const runHealth = async () => {
    setHealthLoading(true);
    try {
      const d = await callIntel("health");
      setHealth((d as any).result);
      toast.success("Pilot health score computed");
    } catch (e: any) { toast.error(e.message ?? "Failed to compute health score"); }
    finally { setHealthLoading(false); }
  };

  const copyBriefing = () => {
    navigator.clipboard.writeText(briefing);
    toast.success("Briefing copied to clipboard");
  };
  const downloadBriefing = () => {
    const blob = new Blob([briefing], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mahindra-pilot-briefing-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
  };

  if (isLoading || authorized === null) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">Loading pilot console…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200 p-8">
        <Card className="max-w-md w-full border-rose-500/30 bg-slate-900/60">
          <CardHeader><CardTitle className="text-rose-400 flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Access restricted</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-400">
            This console is reserved for the Refyn master admin and the Mahindra International School Pune pilot administrator.
          </CardContent>
        </Card>
      </div>
    );
  }

  const pulseColor = (k: PulseEvent["kind"]) =>
    k === "flag" ? "bg-amber-500" : k === "bypass" ? "bg-rose-500"
    : k === "path" ? "bg-violet-500" : k === "capstone" ? "bg-emerald-500" : "bg-sky-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-950 to-[#0a1a2e] text-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
          <div>
            <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-amber-400 mb-2">Refyn × Mahindra Pilot Console</div>
            <h1 className="text-4xl font-semibold tracking-tight">{school?.name ?? "Mahindra International School Pune"}</h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm">
              Mission control for the pilot — live activity, AI-authored executive briefings, per-teacher spotlights, and a composite health score.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">Pilot active</Badge>
            <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} className="border-slate-700">
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
            <Link to="/pilot/mahindra/report">
              <Button variant="outline" size="sm" className="border-slate-700">
                <Printer className="h-3.5 w-3.5 mr-1.5" /> Export results report
              </Button>
            </Link>
            <Link to={`/s/${SUBDOMAIN}`}>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> School portal
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-slate-900/60 border border-slate-800 mb-6">
            <TabsTrigger value="overview"><Activity className="h-3.5 w-3.5 mr-1.5" /> Overview</TabsTrigger>
            <TabsTrigger value="pulse"><Radio className="h-3.5 w-3.5 mr-1.5" /> Live Pulse</TabsTrigger>
            <TabsTrigger value="briefing"><FileText className="h-3.5 w-3.5 mr-1.5" /> Exec Briefing</TabsTrigger>
            <TabsTrigger value="spotlights"><Award className="h-3.5 w-3.5 mr-1.5" /> Teacher Spotlights</TabsTrigger>
            <TabsTrigger value="health"><Gauge className="h-3.5 w-3.5 mr-1.5" /> Health Score</TabsTrigger>
            <TabsTrigger value="trends"><LineChartIcon className="h-3.5 w-3.5 mr-1.5" /> Trends</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Stat icon={GraduationCap} label="Teachers" value={teachers.length} sub="Onboarded" />
              <Stat icon={Layers}        label="Classes"  value={totals.classes}  sub="Active" />
              <Stat icon={Users}         label="Students" value={totals.students} sub="Enrolled" />
              <Stat icon={MessageSquare} label="Prompts · 7d" value={formatNum(totals.prompts_7d)} sub={`${formatNum(totals.flagged_7d)} flagged`} tone={totals.flagged_7d > 0 ? "warn" : "default"} />
              <Stat icon={BookOpen}      label="Learning paths" value={totals.paths} sub="Authored" />
              <Stat icon={Sparkles}      label="Capstones" value={totals.capstones} sub="Submissions" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-slate-800 bg-slate-900/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> Token economy</CardTitle>
                  <span className="text-xs text-slate-400">{formatNum(totals.tokens_used)} / {formatNum(totals.token_limit)} tokens</span>
                </CardHeader>
                <CardContent>
                  <Progress value={tokenPct} className="h-2" />
                  <div className="grid grid-cols-4 gap-4 mt-6 text-sm">
                    <div><div className="text-slate-400 text-xs">Used this month</div><div className="text-lg font-medium">{formatNum(totals.tokens_used)}</div></div>
                    <div><div className="text-slate-400 text-xs">Remaining</div><div className="text-lg font-medium">{formatNum(Math.max(0, totals.token_limit - totals.tokens_used))}</div></div>
                    <div><div className="text-slate-400 text-xs">Utilisation</div><div className="text-lg font-medium">{tokenPct}%</div></div>
                    <div><div className="text-slate-400 text-xs">7-day cost</div><div className="text-lg font-medium">${totals.cost_7d.toFixed(2)}</div></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-800 bg-slate-900/50">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-400" /> Governance · 7d</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-400">Flagged prompts</span><span className={totals.flagged_7d > 0 ? "text-amber-300" : ""}>{totals.flagged_7d}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Bypass attempts</span><span className={totals.bypass_7d > 0 ? "text-rose-300" : ""}>{totals.bypass_7d}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Health</span>
                    <Badge variant="outline" className={totals.bypass_7d > 0 || totals.flagged_7d > 5 ? "border-amber-500/40 text-amber-300" : "border-emerald-500/40 text-emerald-300"}>
                      {totals.bypass_7d > 0 || totals.flagged_7d > 5 ? "Review needed" : "All green"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-amber-400" /> Teacher activity</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 border-b border-slate-800">
                        <th className="py-3 px-4">Teacher</th><th className="py-3 px-4">Classes</th><th className="py-3 px-4">Students</th>
                        <th className="py-3 px-4">Prompts · 7d</th><th className="py-3 px-4">Flagged</th><th className="py-3 px-4 w-[28%]">Token usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && <tr><td colSpan={6} className="text-center py-10 text-slate-500">Loading teachers…</td></tr>}
                      {!loading && teachers.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-500">No teachers found yet.</td></tr>}
                      {teachers.map(t => {
                        const pct = t.token_limit ? Math.min(100, Math.round((t.tokens_used / t.token_limit) * 100)) : 0;
                        return (
                          <tr key={t.user_id} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                            <td className="py-3 px-4">
                              <div className="font-medium">{t.full_name}</div>
                              <div className="text-xs text-slate-500">{t.email}</div>
                            </td>
                            <td className="py-3 px-4">{t.classes}</td>
                            <td className="py-3 px-4">{t.students}</td>
                            <td className="py-3 px-4">{formatNum(t.prompts_7d)}</td>
                            <td className="py-3 px-4">
                              {t.flagged_7d > 0
                                ? <Badge variant="outline" className="border-amber-500/40 text-amber-300">{t.flagged_7d}</Badge>
                                : <span className="text-slate-500">0</span>}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <Progress value={pct} className="h-1.5 flex-1" />
                                <span className="text-xs text-slate-400 whitespace-nowrap">{formatNum(t.tokens_used)} / {formatNum(t.token_limit)}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LIVE PULSE */}
          <TabsContent value="pulse">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live pulse · last 7 days
                </CardTitle>
                <span className="text-xs text-slate-500">{pulse.length} events</span>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh] pr-4">
                  <ol className="relative border-l border-slate-800 ml-2 space-y-4">
                    {pulse.length === 0 && <li className="text-slate-500 text-sm pl-6">No activity in the last 7 days yet.</li>}
                    {pulse.map(e => (
                      <li key={e.id} className="ml-4">
                        <span className={`absolute -left-1.5 h-3 w-3 rounded-full ${pulseColor(e.kind)} ring-4 ring-slate-950`} />
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">{e.kind}</span>
                          <span className="text-xs text-slate-500">· {timeAgo(e.when)}</span>
                        </div>
                        <div className="text-sm"><span className="text-slate-200 font-medium">{e.who}</span> <span className="text-slate-400">— {e.what}</span></div>
                      </li>
                    ))}
                  </ol>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BRIEFING */}
          <TabsContent value="briefing">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-amber-400" /> AI Executive Briefing</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">One-page weekly memo for the Head of School — generated from live pilot data.</p>
                </div>
                <div className="flex items-center gap-2">
                  {briefing && <>
                    <Button variant="outline" size="sm" onClick={copyBriefing} className="border-slate-700"><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy</Button>
                    <Button variant="outline" size="sm" onClick={downloadBriefing} className="border-slate-700"><Download className="h-3.5 w-3.5 mr-1.5" /> .md</Button>
                  </>}
                  <Button size="sm" onClick={runBriefing} disabled={briefLoading} className="bg-amber-500 hover:bg-amber-400 text-slate-950">
                    {briefLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                    {briefing ? "Regenerate" : "Generate briefing"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!briefing && !briefLoading && (
                  <div className="text-sm text-slate-500 py-10 text-center border border-dashed border-slate-800 rounded-lg">
                    Click "Generate briefing" to compose the weekly executive memo from this week's pilot data.
                  </div>
                )}
                {briefLoading && (
                  <div className="flex items-center justify-center py-16 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Composing executive briefing…
                  </div>
                )}
                {briefing && (
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200 font-sans">{briefing}</pre>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SPOTLIGHTS */}
          <TabsContent value="spotlights">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2"><Award className="h-4 w-4 text-amber-400" /> Teacher Spotlights</h3>
                <p className="text-xs text-slate-500">An instructional-coach-quality win + suggestion for every teacher this week.</p>
              </div>
              <Button size="sm" onClick={runSpotlights} disabled={spotLoading} className="bg-amber-500 hover:bg-amber-400 text-slate-950">
                {spotLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                {spotlights.length ? "Regenerate" : "Generate spotlights"}
              </Button>
            </div>
            {!spotlights.length && !spotLoading && (
              <div className="text-sm text-slate-500 py-10 text-center border border-dashed border-slate-800 rounded-lg">
                Click "Generate spotlights" to highlight each teacher's wins and next moves.
              </div>
            )}
            {spotLoading && (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Analysing teacher activity…
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {spotlights.map((s, i) => (
                <Card key={i} className="border-slate-800 bg-slate-900/50">
                  <CardHeader className="pb-2">
                    <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-400">{s.teacher}</div>
                    <CardTitle className="text-base leading-snug mt-1">{s.headline}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-1">Evidence</div>
                      <div className="text-slate-300">{s.evidence}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-1">Suggested next move</div>
                      <div className="text-slate-300">{s.suggestion}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* HEALTH SCORE */}
          <TabsContent value="health">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2"><Gauge className="h-4 w-4 text-amber-400" /> Pilot Health Score</h3>
                <p className="text-xs text-slate-500">Composite 0–100 score across adoption, pedagogy, governance and efficiency.</p>
              </div>
              <Button size="sm" onClick={runHealth} disabled={healthLoading} className="bg-amber-500 hover:bg-amber-400 text-slate-950">
                {healthLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                {health ? "Recompute" : "Compute score"}
              </Button>
            </div>
            {!health && !healthLoading && (
              <div className="text-sm text-slate-500 py-10 text-center border border-dashed border-slate-800 rounded-lg">
                Click "Compute score" to assess the pilot across four dimensions.
              </div>
            )}
            {healthLoading && (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Crunching the numbers…
              </div>
            )}
            {health && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-slate-800 bg-gradient-to-br from-amber-500/10 to-slate-900/50">
                  <CardContent className="p-8 text-center">
                    <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-400 mb-3">Overall Health</div>
                    <div className="text-7xl font-semibold tracking-tight text-amber-300">{health.score}</div>
                    <div className="mt-2 text-sm text-slate-400">Grade <span className="text-slate-200 font-medium">{health.grade}</span></div>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-2 border-slate-800 bg-slate-900/50">
                  <CardContent className="p-6 space-y-4">
                    {Object.entries(health.subscores ?? {}).map(([k, v]: any) => (
                      <div key={k}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm capitalize text-slate-300">{k}</span>
                          <span className="text-sm font-medium">{v.value}</span>
                        </div>
                        <Progress value={v.value} className="h-1.5" />
                        <p className="text-xs text-slate-500 mt-1">{v.note}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border-emerald-500/30 bg-emerald-500/5 lg:col-span-3">
                  <CardContent className="p-5 grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-400 mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Top win</div>
                      <div className="text-slate-200">{health.top_win}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-rose-400 mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Top risk</div>
                      <div className="text-slate-200">{health.top_risk}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          {/* TRENDS */}
          <TabsContent value="trends" className="space-y-6">
            {(() => {
              const rows = trendRows;
              const latest = rows[rows.length - 1];
              const singlePoint = rows.length < 2;
              const chartConfig = {
                wau: { label: "WAU", color: "hsl(43 96% 56%)" },
                prompts_7d: { label: "Prompts (7d)", color: "hsl(199 89% 60%)" },
                teacher_hours_saved: { label: "Hours saved", color: "hsl(160 84% 55%)" },
                cost_7d_usd: { label: "Cost (7d)", color: "hsl(280 80% 65%)" },
                learning_path_completion_pct: { label: "Path completion %", color: "hsl(20 90% 60%)" },
              } as const;
              const data = rows.map((r: any) => ({
                date: new Date(r.snapshot_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                wau: r.wau, prompts_7d: r.prompts_7d,
                teacher_hours_saved: Number(r.teacher_hours_saved) || 0,
                cost_7d_usd: Number(r.cost_7d_usd) || 0,
                learning_path_completion_pct: Number(r.learning_path_completion_pct) || 0,
              }));

              if (trendLoading) return <div className="text-slate-400 py-16 text-center"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading trends…</div>;
              if (!latest) {
                return <div className="text-sm text-slate-500 py-10 text-center border border-dashed border-slate-800 rounded-lg">
                  No metric snapshots yet. The daily job will populate this as the pilot runs.
                </div>;
              }

              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Stat icon={Clock}         label="Hours saved"       value={formatNum(latest.teacher_hours_saved)} sub="Cumulative" tone="success" />
                    <Stat icon={Users}         label="WAU"               value={formatNum(latest.wau)} sub={`${latest.dau} DAU`} />
                    <Stat icon={BookOpen}      label="Path completion"   value={`${latest.learning_path_completion_pct}%`} sub={`${latest.learning_paths_total} paths`} />
                    <Stat icon={Sparkles}      label="Capstone avg"      value={latest.capstones_avg_score || "—"} sub={`${latest.capstones_total} subs`} />
                    <Stat icon={AlertTriangle} label="Governance · 7d"   value={`${latest.flagged_7d} / ${latest.bypass_7d}`} sub="flag / bypass" tone={latest.bypass_7d ? "danger" : latest.flagged_7d ? "warn" : "default"} />
                    <Stat icon={Zap}           label="Cost · 7d"         value={`$${Number(latest.cost_7d_usd).toFixed(2)}`} sub={`${formatNum(latest.tokens_7d)} tok`} />
                  </div>

                  {singlePoint && (
                    <div className="text-xs text-slate-500 font-mono uppercase tracking-[0.18em]">
                      Trends build daily — check back as the pilot runs. ({rows.length} snapshot)
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <TrendCard title="Engagement" config={{ wau: chartConfig.wau, prompts_7d: chartConfig.prompts_7d }} data={data} keys={["wau","prompts_7d"]} type="area" />
                    <TrendCard title="Teacher hours saved" config={{ teacher_hours_saved: chartConfig.teacher_hours_saved }} data={data} keys={["teacher_hours_saved"]} type="area" />
                    <TrendCard title="Token cost (USD · 7d)" config={{ cost_7d_usd: chartConfig.cost_7d_usd }} data={data} keys={["cost_7d_usd"]} type="line" />
                    <TrendCard title="Learning path completion %" config={{ learning_path_completion_pct: chartConfig.learning_path_completion_pct }} data={data} keys={["learning_path_completion_pct"]} type="line" />
                  </div>
                </>
              );
            })()}
          </TabsContent>
        </Tabs>

        <div className="mt-10 text-center text-xs text-slate-500 font-mono tracking-[0.18em] uppercase">
          Pilot console · v2 · Refyn Technologies
        </div>
      </div>
    </div>
  );
};

const TrendCard = ({ title, config, data, keys, type }: {
  title: string; config: any; data: any[]; keys: string[]; type: "area" | "line";
}) => (
  <Card className="border-slate-800 bg-slate-900/50">
    <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-200">{title}</CardTitle></CardHeader>
    <CardContent>
      <div className="h-56">
        <ChartContainer config={config} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            {type === "area" ? (
              <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {keys.map(k => (
                  <Area key={k} type="monotone" dataKey={k} stroke={`var(--color-${k})`} fill={`var(--color-${k})`} fillOpacity={0.25} strokeWidth={2} />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {keys.map(k => (
                  <Line key={k} type="monotone" dataKey={k} stroke={`var(--color-${k})`} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </CardContent>
  </Card>
);

export default PilotMahindraConsole;
