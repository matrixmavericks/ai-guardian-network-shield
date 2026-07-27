import React, { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Printer, ArrowLeft, ShieldCheck, Sparkles, Clock, Users, BookOpen, AlertTriangle, DollarSign } from "lucide-react";

const SUBDOMAIN = "mahindra-pune";
const MASTER_ADMIN_EMAIL = "info.aiconditioner@gmail.com";

type MetricRow = {
  snapshot_date: string;
  teachers: number; students: number; classes: number;
  wau: number; dau: number;
  prompts_7d: number; prompts_total: number;
  flagged_7d: number; bypass_7d: number;
  learning_paths_total: number; learning_path_completion_pct: number;
  capstones_total: number; capstones_avg_score: number;
  tokens_7d: number; cost_7d_usd: number;
  teacher_hours_saved: number;
};
type School = { id: string; name: string; description: string | null; created_at: string };

const fmt = (n: number) => new Intl.NumberFormat().format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const PilotMahindraReport: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    (async () => {
      if (!user) { setAuthorized(false); return; }
      if (user.email?.toLowerCase() === MASTER_ADMIN_EMAIL) { setAuthorized(true); return; }
      const { data: s } = await supabase.from("schools").select("id").eq("subdomain", SUBDOMAIN).maybeSingle();
      if (!s) { setAuthorized(false); return; }
      const { data: m } = await supabase.from("school_members").select("school_role")
        .eq("school_id", s.id).eq("user_id", user.id).maybeSingle();
      setAuthorized(!!m && m.school_role === "admin");
    })();
  }, [user, isLoading]);

  useEffect(() => {
    if (!authorized) return;
    (async () => {
      setLoading(true);
      try {
        const { data: s } = await supabase.from("schools")
          .select("id, name, description, created_at").eq("subdomain", SUBDOMAIN).maybeSingle();
        if (!s) return;
        setSchool(s);
        const { data } = await supabase.from("pilot_metrics")
          .select("*").eq("school_id", s.id).order("snapshot_date", { ascending: true });
        setRows((data ?? []) as MetricRow[]);
      } finally { setLoading(false); }
    })();
  }, [authorized]);

  if (isLoading || authorized === null) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">Loading report…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200 p-8">
        <Card className="max-w-md w-full border-rose-500/30 bg-slate-900/60">
          <CardHeader><CardTitle className="text-rose-400 flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Access restricted</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-400">
            This pilot results report is available to the Refyn master admin and the Mahindra pilot administrator.
          </CardContent>
        </Card>
      </div>
    );
  }

  const latest = rows[rows.length - 1];
  const first = rows[0];
  const singlePoint = rows.length < 2;

  const chartConfig = {
    wau: { label: "Weekly active users", color: "hsl(43 96% 56%)" },
    prompts_7d: { label: "Prompts (7d)", color: "hsl(199 89% 60%)" },
    teacher_hours_saved: { label: "Teacher hours saved", color: "hsl(160 84% 55%)" },
    cost_7d_usd: { label: "Cost (7d, USD)", color: "hsl(280 80% 65%)" },
    learning_path_completion_pct: { label: "Path completion %", color: "hsl(20 90% 60%)" },
  } as const;

  const chartData = rows.map(r => ({
    date: fmtDate(r.snapshot_date),
    wau: r.wau, prompts_7d: r.prompts_7d,
    teacher_hours_saved: Number(r.teacher_hours_saved) || 0,
    cost_7d_usd: Number(r.cost_7d_usd) || 0,
    learning_path_completion_pct: Number(r.learning_path_completion_pct) || 0,
  }));

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white print-report">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          .no-print { display: none !important; }
          .print-report { background: white !important; color: #0f172a !important; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Top bar (screen only) */}
      <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
          <Link to="/pilot/mahindra">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to console</Button>
          </Link>
          <Button size="sm" onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white">
            <Printer className="h-4 w-4 mr-1.5" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 print:py-4 space-y-10 print:space-y-6">
        {/* Header */}
        <header className="avoid-break border-b border-slate-200 pb-6">
          <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-amber-600 mb-2">Refyn Technologies · Pilot Results Report</div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">{school?.name ?? "Mahindra International School Pune"}</h1>
          <p className="text-slate-600 mt-2 max-w-3xl">
            {school?.description ?? "Pilot deployment of Refyn — an AI governance and instructional intelligence platform."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <div><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 mr-2">Pilot start</span>{school?.created_at ? new Date(school.created_at).toLocaleDateString() : "—"}</div>
            <div><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 mr-2">Report generated</span>{new Date().toLocaleDateString()}</div>
            <div><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 mr-2">Snapshots</span>{rows.length}</div>
          </div>
        </header>

        {loading && <div className="text-slate-500">Loading metrics…</div>}

        {!loading && !latest && (
          <div className="text-slate-500 border border-dashed border-slate-300 rounded-lg p-8 text-center">
            No metric snapshots yet. The daily job populates this report as the pilot runs.
          </div>
        )}

        {latest && (
          <>
            {/* Hero stat */}
            <section className="avoid-break rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-white p-8 text-center">
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-600 mb-3 flex items-center justify-center gap-2">
                <Clock className="h-3 w-3" /> Hero metric — Teacher hours reclaimed
              </div>
              <div className="text-7xl font-semibold tracking-tight text-slate-900">{fmt(latest.teacher_hours_saved)}</div>
              <div className="text-slate-600 mt-2">hours of teacher time saved by AI-assisted planning, tutoring & assessment</div>
            </section>

            {/* KPI grid */}
            <section className="avoid-break">
              <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-slate-500 mb-4">Latest snapshot · {fmtDate(latest.snapshot_date)}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Kpi icon={Users} label="Weekly active users" value={fmt(latest.wau)} sub={`${fmt(latest.dau)} in last 24h`} />
                <Kpi icon={BookOpen} label="Path completion" value={`${latest.learning_path_completion_pct}%`} sub={`${latest.learning_paths_total} paths authored`} />
                <Kpi icon={Sparkles} label="Capstone avg score" value={latest.capstones_avg_score ? String(latest.capstones_avg_score) : "—"} sub={`${latest.capstones_total} submissions`} />
                <Kpi icon={AlertTriangle} label="Governance · 7d" value={`${latest.flagged_7d} / ${latest.bypass_7d}`} sub="Flagged / bypass" tone={latest.bypass_7d ? "danger" : latest.flagged_7d ? "warn" : "ok"} />
                <Kpi icon={DollarSign} label="AI cost · 7d" value={`$${Number(latest.cost_7d_usd).toFixed(2)}`} sub={`${fmt(latest.tokens_7d)} tokens`} />
                <Kpi icon={Users} label="Reach" value={`${latest.teachers} · ${latest.students}`} sub={`${latest.classes} classes`} />
              </div>
            </section>

            {/* Trends */}
            <section className="avoid-break">
              <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-slate-500 mb-4">Trends</h2>
              {singlePoint && (
                <p className="text-xs text-slate-500 mb-3">Trends build daily — this snapshot represents Day {rows.length} of the pilot.</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReportChart title="Engagement" config={{ wau: chartConfig.wau, prompts_7d: chartConfig.prompts_7d }} data={chartData} keys={["wau","prompts_7d"]} type="area" />
                <ReportChart title="Teacher hours saved" config={{ teacher_hours_saved: chartConfig.teacher_hours_saved }} data={chartData} keys={["teacher_hours_saved"]} type="area" />
                <ReportChart title="AI cost (USD · 7d)" config={{ cost_7d_usd: chartConfig.cost_7d_usd }} data={chartData} keys={["cost_7d_usd"]} type="line" />
                <ReportChart title="Learning path completion %" config={{ learning_path_completion_pct: chartConfig.learning_path_completion_pct }} data={chartData} keys={["learning_path_completion_pct"]} type="line" />
              </div>
            </section>

            {/* Governance summary */}
            <section className="avoid-break page-break">
              <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-slate-500 mb-4">Governance summary</h2>
              <div className="rounded-lg border border-slate-200 p-6 grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Flagged prompts · 7d</div>
                  <div className="text-3xl font-semibold">{latest.flagged_7d}</div>
                  <div className="text-xs text-slate-500 mt-1">of {fmt(latest.prompts_7d)} total prompts</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Bypass attempts · 7d</div>
                  <div className="text-3xl font-semibold">{latest.bypass_7d}</div>
                  <div className="text-xs text-slate-500 mt-1">Prompt-injection / jailbreak attempts blocked</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Posture</div>
                  <Badge className={latest.bypass_7d || latest.flagged_7d > 5 ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-emerald-100 text-emerald-800 border-emerald-300"}>
                    {latest.bypass_7d || latest.flagged_7d > 5 ? "Review recommended" : "All green"}
                  </Badge>
                </div>
              </div>
            </section>

            {/* Delta since day 0 */}
            {first && first !== latest && (
              <section className="avoid-break">
                <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-slate-500 mb-4">Change since pilot Day 0 ({fmtDate(first.snapshot_date)})</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Delta label="Hours saved" from={first.teacher_hours_saved} to={latest.teacher_hours_saved} />
                  <Delta label="WAU" from={first.wau} to={latest.wau} />
                  <Delta label="Path completion %" from={first.learning_path_completion_pct} to={latest.learning_path_completion_pct} suffix="%" />
                  <Delta label="Cost · 7d" from={Number(first.cost_7d_usd)} to={Number(latest.cost_7d_usd)} prefix="$" />
                </div>
              </section>
            )}

            {/* Briefing slot */}
            <section className="avoid-break">
              <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-slate-500 mb-4">Executive briefing</h2>
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                Generate the latest AI executive briefing in the pilot console (Exec Briefing tab), then attach it to this report.
              </div>
            </section>

            <footer className="text-center text-xs text-slate-400 font-mono tracking-[0.18em] uppercase pt-6 border-t border-slate-200">
              Refyn Technologies · Pilot report · {new Date().toLocaleDateString()}
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

const Kpi = ({ icon: Icon, label, value, sub, tone = "default" }: any) => {
  const border =
    tone === "danger" ? "border-rose-300 bg-rose-50"
    : tone === "warn" ? "border-amber-300 bg-amber-50"
    : tone === "ok" ? "border-emerald-300 bg-emerald-50"
    : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border ${border} p-5`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
};

const Delta = ({ label, from, to, prefix = "", suffix = "" }: { label: string; from: number; to: number; prefix?: string; suffix?: string }) => {
  const diff = Number(to) - Number(from);
  const positive = diff >= 0;
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-semibold text-slate-900">{prefix}{Number(to).toFixed?.(diff % 1 ? 2 : 0) ?? to}{suffix}</div>
      <div className={`text-xs mt-1 ${positive ? "text-emerald-600" : "text-rose-600"}`}>
        {positive ? "▲" : "▼"} {prefix}{Math.abs(diff).toFixed(diff % 1 ? 2 : 0)}{suffix} since Day 0
      </div>
    </div>
  );
};

const ReportChart = ({ title, config, data, keys, type }: {
  title: string;
  config: any;
  data: any[];
  keys: string[];
  type: "area" | "line";
}) => (
  <div className="rounded-lg border border-slate-200 p-4 avoid-break">
    <div className="text-sm font-medium text-slate-800 mb-3">{title}</div>
    <div className="h-56">
      <ChartContainer config={config} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === "area" ? (
            <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {keys.map(k => (
                <Area key={k} type="monotone" dataKey={k} stroke={`var(--color-${k})`} fill={`var(--color-${k})`} fillOpacity={0.2} strokeWidth={2} />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
  </div>
);

export default PilotMahindraReport;
