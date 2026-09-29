import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GradingSystem } from "@/services/gradingService";
import { byDate, colorFor, gradeIn, toneHex, toneOf, type GradedWork, type SubjectStat } from "./stats";
import { tone } from "@/lib/portalAppearance";

/* ---------- Small pieces ---------- */

export const TrendChip: React.FC<{ delta: number | null; className?: string }> = ({ delta, className }) => {
  if (delta === null) return null;
  const flat = Math.abs(delta) < 1;
  const up = delta > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium tabular-nums",
        flat ? "bg-white/[0.06] text-lp-soft" : up ? "bg-lp-green/15 text-lp-green" : "bg-lp-red/15 text-lp-red",
        className,
      )}
      title="Your latest pieces compared with the ones before"
    >
      <Icon className="h-3 w-3" />
      {flat ? "Steady" : `${up ? "+" : ""}${delta.toFixed(1)} pts`}
    </span>
  );
};

export const GradePill: React.FC<{ pct: number; system: GradingSystem | null; className?: string }> = ({ pct, system, className }) => {
  const c = toneHex[toneOf(pct)];
  return (
    <span className={cn("inline-flex min-w-[2.25rem] items-center justify-center rounded-lg px-2 py-0.5 text-[13px] font-semibold tabular-nums", className)} style={{ color: tone(c), background: `${c}1F` }}>
      {gradeIn(pct, system)}
    </span>
  );
};

/** Tiny inline trend line. */
export const Sparkline: React.FC<{ values: number[]; color: string; className?: string }> = ({ values, color, className }) => {
  const w = 120;
  const h = 36;
  if (values.length < 2) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke={color} strokeOpacity="0.35" strokeDasharray="3 4" strokeWidth="2" />
        <circle cx={w - 4} cy={h / 2} r="3.5" fill={color} />
      </svg>
    );
  }
  const lo = Math.min(...values, 40);
  const hi = Math.max(...values, 100);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 8) + 4, h - 4 - ((v - lo) / Math.max(1, hi - lo)) * (h - 8)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const id = `sp-${color.slice(1)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${pts[pts.length - 1][0]} ${h} L${pts[0][0]} ${h} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={color} />
    </svg>
  );
};

/* ---------- Timeline ---------- */

type Point = { i: number; label: string; pct: number; ma: number; title: string; subject: string };

const ChartTip: React.FC<{ active?: boolean; payload?: { payload: Point }[]; system: GradingSystem | null; subjects: string[] }> = ({ active, payload, system, subjects }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-lp-line bg-lp-deep/95 px-3 py-2 text-[12px] shadow-2xl backdrop-blur">
      <p className="flex items-center gap-1.5 text-lp-mute">
        <span className="h-2 w-2 rounded-full" style={{ background: colorFor(p.subject, subjects) }} />
        {p.subject} · {p.label}
      </p>
      <p className="mt-0.5 max-w-[220px] truncate font-medium text-white">{p.title}</p>
      <p className="mt-1 text-lp-soft">
        <span className="font-semibold text-white">{Math.round(p.pct)}%</span> · {gradeIn(p.pct, system)}
        <span className="text-lp-mute"> · trend {Math.round(p.ma)}%</span>
      </p>
    </div>
  );
};

export const Timeline: React.FC<{ items: GradedWork[]; subjects: string[]; system: GradingSystem | null; goal: number | null; goalLabel?: string }> = ({ items, subjects, system, goal, goalLabel }) => {
  const data = useMemo<Point[]>(() => {
    const sorted = [...items].sort(byDate);
    return sorted.map((g, i) => {
      const win = sorted.slice(Math.max(0, i - 2), i + 1).map((x) => x.pct);
      return { i, label: format(new Date(g.gradedAt), "d MMM"), pct: g.pct, ma: win.reduce((a, b) => a + b, 0) / win.length, title: g.title, subject: g.subject };
    });
  }, [items]);

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="gradeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(var(--lp-line))" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "rgb(var(--lp-mute))", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: "rgb(var(--lp-mute))", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTip system={system} subjects={subjects} />} cursor={{ stroke: "#33415C", strokeDasharray: "3 3" }} />
          {goal !== null && (
            <ReferenceLine
              y={goal}
              stroke="#3FE9FF"
              strokeDasharray="5 5"
              strokeOpacity={0.7}
              label={{ value: goalLabel ?? `Goal ${Math.round(goal)}%`, position: "insideTopRight", fill: "#3FE9FF", fontSize: 11 }}
            />
          )}
          <Area
            type="monotone"
            dataKey="pct"
            stroke="#7CB4FF"
            strokeWidth={2.5}
            fill="url(#gradeFill)"
            dot={(props: { cx?: number; cy?: number; payload?: Point; index?: number }) => (
              <circle key={props.index} cx={props.cx} cy={props.cy} r={4.5} fill={colorFor(props.payload?.subject ?? "", subjects)} stroke="rgb(var(--lp-bg))" strokeWidth={2} />
            )}
            activeDot={{ r: 6, stroke: "rgb(var(--lp-bg))", strokeWidth: 2, fill: "#FFFFFF" }}
            isAnimationActive
            animationDuration={900}
          />
          {data.length > 2 && <Line type="monotone" dataKey="ma" stroke="#3FE9FF" strokeOpacity={0.55} strokeWidth={1.5} dot={false} strokeDasharray="2 4" isAnimationActive={false} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ---------- Distribution ---------- */

export const Distribution: React.FC<{ bands: { label: string; min: number; count: number }[]; total: number }> = ({ bands, total }) => {
  const max = Math.max(1, ...bands.map((b) => b.count));
  return (
    <ul className="space-y-2">
      {bands.map((b, i) => {
        const c = toneHex[toneOf(Math.min(100, b.min + 5))];
        return (
          <li key={b.label} className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-3">
            <span className="text-[13px] font-semibold tabular-nums text-white">{b.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-lp-line/70">
              <span
                className="lp-bar-in block h-full rounded-full"
                style={{ width: `${(b.count / max) * 100}%`, background: `linear-gradient(90deg, ${c}99, ${c})`, animationDelay: `${i * 60}ms` }}
              />
            </span>
            <span className="text-right text-[12px] tabular-nums text-lp-mute">{total ? `${b.count}` : "–"}</span>
          </li>
        );
      })}
    </ul>
  );
};

/* ---------- Subject cards ---------- */

export const SubjectCard: React.FC<{ stat: SubjectStat; color: string; system: GradingSystem | null; active: boolean; onClick: () => void; badge?: string; delay: number }> = ({ stat, color, system, active, onClick, badge, delay }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "lp-fade group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5",
      active ? "border-lp-sky/50 bg-lp-blue/[0.08]" : "border-lp-line bg-lp-surface/70 hover:border-white/20",
    )}
    style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
  >
    <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color }} />
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[14px] font-medium text-white">{stat.subject}</span>
          {badge && <span className="shrink-0 rounded-full bg-[#FBBF24]/15 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#FCD34D]">{badge}</span>}
        </p>
        <p className="text-[11.5px] text-lp-mute">
          {stat.count} graded · last {format(new Date(stat.last), "d MMM")}
        </p>
      </div>
      <GradePill pct={stat.pct} system={system} />
    </div>
    <div className="mt-3 flex items-end justify-between gap-3">
      <div>
        <p className="text-[24px] font-semibold leading-none tabular-nums text-white">
          {Math.round(stat.pct)}
          <span className="text-[13px] text-lp-mute">%</span>
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <TrendChip delta={stat.trend} />
        </div>
      </div>
      <Sparkline values={stat.series} color={color} className="h-9 w-28 shrink-0" />
    </div>
  </button>
);

/* ---------- Feedback ---------- */

const feedbackLink = (g: GradedWork) =>
  `/ai-learning-assistant?${new URLSearchParams({
    resourceTitle: `Feedback on "${g.title}"`,
    resourceDesc: `${g.subject} · scored ${g.grade}/${g.max} (${Math.round(g.pct)}%). Teacher feedback: ${g.feedback ?? ""}`.slice(0, 1500),
    prompt: `@feedback-decoder My teacher gave me this feedback on "${g.title}" (${g.grade}/${g.max}): "${(g.feedback ?? "").slice(0, 600)}". What should I work on?`,
  })}`;

export const FeedbackCard: React.FC<{ g: GradedWork; color: string; system: GradingSystem | null; delay: number }> = ({ g, color, system, delay }) => {
  const [open, setOpen] = useState(false);
  const long = (g.feedback?.length ?? 0) > 220;
  return (
    <article className="lp-fade flex flex-col rounded-2xl border border-lp-line bg-lp-surface/70 p-4" style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11.5px] text-lp-mute">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            {g.subject} · {format(new Date(g.gradedAt), "d MMM yyyy")}
          </p>
          <p className="mt-0.5 truncate text-[14px] font-medium text-white">{g.title}</p>
        </div>
        <span className="shrink-0 text-right">
          <GradePill pct={g.pct} system={system} />
          <span className="mt-0.5 block text-[11px] tabular-nums text-lp-mute">
            {g.grade}/{g.max}
          </span>
        </span>
      </div>
      <blockquote className={cn("mt-3 border-l-2 pl-3 text-[13.5px] leading-relaxed text-lp-soft", !open && long && "line-clamp-4")} style={{ borderColor: `${color}80` }}>
        {g.feedback}
      </blockquote>
      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        {long ? (
          <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-[12px] text-lp-mute hover:text-white">
            {open ? "Show less" : "Read all"} <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
          </button>
        ) : (
          <span />
        )}
        <Link to={feedbackLink(g)} className="inline-flex items-center gap-1.5 rounded-lg border border-lp-cyan/30 bg-lp-cyan/10 px-2.5 py-1 text-[12px] font-medium text-lp-cyan transition-colors hover:bg-lp-cyan/20">
          <Sparkles className="h-3.5 w-3.5" /> Explain with Refyn
        </Link>
      </div>
    </article>
  );
};
