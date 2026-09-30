import React, { useCallback, useEffect, useRef, useState } from "react";
import { format, startOfDay, startOfMonth, addMonths } from "date-fns";
import { Gauge, Layers, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { findModel } from "@/lib/aiModels";
import { libraryBudget } from "./files/library";

// "How full is this chat, and how much AI have I used?" — the context window
// the next reply will read, when the chat auto-compacts, and usage against
// the monthly budget and plan allowance.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Context window of a model family, in tokens (approximate). */
export const contextWindow = (model: string) => {
  const m = findModel(model);
  if (!m) return 1_000_000;
  if (m.provider === "google") return 1_048_576;
  if (m.provider === "openai") return 400_000;
  return /haiku/i.test(m.id) ? 200_000 : 1_000_000;
};

/** Characters of conversation a reply may read (mirrors the server). */
export const historyBudget = (inputPrice: number) => (inputPrice <= 0.35 ? 120_000 : inputPrice <= 1.5 ? 70_000 : 45_000);

/** Compact automatically once the conversation fills this share of its budget. */
export const AUTO_COMPACT_AT = 0.85;

export type ContextEstimate = {
  /** What Refyn lets one reply read with this model */
  window: number;
  /** What the model itself can read */
  modelMax: number;
  modelName: string;
  used: number;
  parts: { key: string; label: string; tokens: number; color: string }[];
  conversationTokens: number;
  untilCompact: number;
  measured: boolean;
};

const INSTRUCTION_TOKENS = { teacher: 1500, student: 1300 };

export function estimateContext(args: {
  model: string;
  teacher: boolean;
  libraryChars: number;
  conversationChars: number;
  images: number;
  lastPromptTokens?: number | null;
}): ContextEstimate {
  const price = findModel(args.model)?.price.input ?? 0.3;
  const modelMax = contextWindow(args.model);
  const instructions = args.teacher ? INSTRUCTION_TOKENS.teacher : INSTRUCTION_TOKENS.student;
  const window = Math.min(modelMax, Math.round((libraryBudget(price) + historyBudget(price)) / 4 + instructions + 6000));
  const lib = Math.min(args.libraryChars, libraryBudget(price)) / 4;
  const hBudget = historyBudget(price);
  const conv = Math.min(args.conversationChars, hBudget) / 4;
  const parts = [
    { key: "instructions", label: "Instructions", tokens: args.teacher ? INSTRUCTION_TOKENS.teacher : INSTRUCTION_TOKENS.student, color: "#7CB4FF" },
    { key: "library", label: "Files & context", tokens: Math.round(lib), color: "#34D399" },
    { key: "conversation", label: "Conversation", tokens: Math.round(conv), color: "#3B82F6" },
    { key: "images", label: "Images", tokens: args.images * 1500, color: "#FBBF24" },
  ].filter((p) => p.tokens > 0);
  const estimated = parts.reduce((a, p) => a + p.tokens, 0);
  // Prefer the real count from the last reply when it's bigger (it includes everything)
  const used = Math.max(estimated, args.lastPromptTokens ?? 0);
  const scale = used / Math.max(1, estimated);
  return {
    window,
    modelMax,
    modelName: findModel(args.model)?.name ?? "This model",
    used,
    parts: parts.map((p) => ({ ...p, tokens: Math.round(p.tokens * scale) })),
    conversationTokens: Math.round(conv),
    untilCompact: Math.max(0, Math.round((hBudget * AUTO_COMPACT_AT - args.conversationChars) / 4)),
    measured: !!args.lastPromptTokens && args.lastPromptTokens >= estimated,
  };
}

type Usage = {
  chat: number;
  today: number;
  month: number;
  monthCost: number;
  quotaUsd: number | null;
  plan: { name: string; used: number; limit: number } | null;
};

export function useUsage(userId: string | null, sessionId: string | null) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const monthStart = startOfMonth(new Date()).toISOString();
    const dayStart = startOfDay(new Date()).getTime();
    const [logs, quotas, plan] = await Promise.all([
      db.from("ai_usage_logs").select("session_id, total_tokens, estimated_cost_usd, created_at").eq("user_id", userId).gte("created_at", monthStart).limit(5000),
      db.from("ai_usage_quotas").select("monthly_limit_usd").eq("student_id", userId),
      db.from("user_plans").select("plan_id, monthly_token_limit, tokens_used_this_month").eq("user_id", userId).eq("status", "active").maybeSingle(),
    ]);
    const rows = (logs.data ?? []) as { session_id: string | null; total_tokens: number; estimated_cost_usd: number; created_at: string }[];
    const limits = ((quotas.data ?? []) as { monthly_limit_usd: number }[]).map((q) => Number(q.monthly_limit_usd)).filter((n) => n > 0);
    setUsage({
      chat: rows.filter((r) => sessionId && r.session_id === sessionId).reduce((a, r) => a + (r.total_tokens || 0), 0),
      today: rows.filter((r) => Date.parse(r.created_at) >= dayStart).reduce((a, r) => a + (r.total_tokens || 0), 0),
      month: rows.reduce((a, r) => a + (r.total_tokens || 0), 0),
      monthCost: rows.reduce((a, r) => a + Number(r.estimated_cost_usd || 0), 0),
      quotaUsd: limits.length ? Math.min(...limits) : null,
      plan: plan.data ? { name: String(plan.data.plan_id).replace(/_/g, " "), used: plan.data.tokens_used_this_month ?? 0, limit: plan.data.monthly_token_limit ?? 0 } : null,
    });
    setLoading(false);
  }, [userId, sessionId]);
  return { usage, loading, load };
}

const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : String(n));

const Bar: React.FC<{ value: number; color?: string }> = ({ value, color = "#3B82F6" }) => (
  <div className="h-1.5 overflow-hidden rounded-full bg-lp-line">
    <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(value > 0 ? 1.5 : 0, value))}%`, background: value >= 90 ? "#F2706A" : color }} />
  </div>
);

/** Header button + popover, like a context meter. */
export const UsageButton: React.FC<{
  ctx: ContextEstimate;
  userId: string | null;
  sessionId: string | null;
  refreshKey: number;
  canCompact: boolean;
  compacting: boolean;
  onCompact: () => void;
}> = ({ ctx, userId, sessionId, refreshKey, canCompact, compacting, onCompact }) => {
  const [open, setOpen] = useState(false);
  const { usage, loading, load } = useUsage(userId, sessionId);
  const ref = useRef<HTMLDivElement>(null);
  const pct = (ctx.used / ctx.window) * 100;

  useEffect(() => {
    if (open) load();
  }, [open, refreshKey, load]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onDown); };
  }, [open]);

  const reset = format(addMonths(startOfMonth(new Date()), 1), "d MMM");
  const ring = 2 * Math.PI * 7;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Context and usage: ${pct.toFixed(0)}% of the context window`}
        title="Context and usage"
        className="flex h-9 items-center gap-2 rounded-xl border border-lp-line bg-lp-surface/70 px-2.5 text-[12.5px] text-lp-soft transition-colors hover:border-lp-blue/50 hover:text-white"
      >
        <svg viewBox="0 0 18 18" className="h-[18px] w-[18px] -rotate-90">
          <circle cx="9" cy="9" r="7" fill="none" stroke="rgb(var(--lp-line))" strokeWidth="2.5" />
          <circle cx="9" cy="9" r="7" fill="none" stroke={pct >= 85 ? "#F2706A" : "#3B82F6"} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${Math.max(0.4, (Math.min(100, pct) / 100) * ring)} ${ring}`} />
        </svg>
        <span className="tabular-nums">{pct < 1 ? "<1" : pct.toFixed(0)}%</span>
      </button>

      {open && (
        <div role="dialog" aria-label="Context and usage" className="lp-pop lp-fade fixed inset-x-3 top-16 z-40 rounded-2xl border border-lp-line bg-lp-deep p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[380px]">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-[14px] font-medium text-white">
              <Gauge className="h-4 w-4 text-lp-sky" /> Context window
            </p>
            <span className="flex items-center gap-2">
              <span className="text-[13px] tabular-nums text-lp-soft">
                {fmt(ctx.used)} / {fmt(ctx.window)} ({pct < 1 ? "<1" : pct.toFixed(0)}%)
              </span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-6 w-6 items-center justify-center rounded-md text-lp-mute hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
          <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-lp-line">
            {ctx.parts.map((p) => (
              <span key={p.key} style={{ width: `${Math.max(0.6, (p.tokens / ctx.window) * 100)}%`, background: p.color }} className="h-full border-r border-lp-deep last:border-0" />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {ctx.parts.map((p) => (
              <span key={p.key} className="flex items-center gap-1.5 text-[11.5px] text-lp-mute">
                <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} /> {p.label} <span className="tabular-nums text-lp-soft">{fmt(p.tokens)}</span>
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[13px] text-lp-soft">
              {canCompact ? (ctx.untilCompact > 0 ? `${fmt(ctx.untilCompact)} until auto-compact` : "Compacts before the next reply") : "Nothing to compact yet"}
            </p>
            <button
              type="button"
              onClick={onCompact}
              disabled={!canCompact || compacting}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-lp-line px-2.5 text-[12.5px] text-lp-soft hover:border-lp-blue/50 hover:text-white disabled:opacity-40"
            >
              {compacting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />} Compact chat
            </button>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-lp-mute">
            {ctx.modelName} can read up to {fmt(ctx.modelMax)} tokens; Refyn keeps each reply within {fmt(ctx.window)} to keep answers focused and costs down.{" "}
            Compacting summarises earlier messages into the chat's files, so nothing important is lost.{ctx.measured ? "" : " Estimated until the next reply."}
          </p>

          <div className="my-4 h-px bg-lp-line" />
          <p className="text-[13px] text-lp-mute">AI usage</p>
          {loading && !usage ? (
            <div className="lp-skeleton mt-3 h-24 rounded-xl" />
          ) : usage ? (
            <div className="mt-2 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "This chat", value: usage.chat },
                  { label: "Today", value: usage.today },
                  { label: "This month", value: usage.month },
                ].map((r) => (
                  <div key={r.label} className="rounded-xl border border-lp-line bg-lp-surface/60 px-3 py-2">
                    <p className="text-[16px] font-semibold tabular-nums text-white">{fmt(r.value)}</p>
                    <p className="text-[11.5px] text-lp-mute">{r.label} · tokens</p>
                  </div>
                ))}
              </div>
              {usage.quotaUsd !== null && (
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                    <span className="text-white">Monthly AI budget</span>
                    <span className="text-lp-mute">Resets {reset} · {Math.round((usage.monthCost / usage.quotaUsd) * 100)}%</span>
                  </div>
                  <Bar value={(usage.monthCost / usage.quotaUsd) * 100} />
                </div>
              )}
              {usage.plan && usage.plan.limit > 0 && (
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                    <span className="capitalize text-white">Plan · {usage.plan.name}</span>
                    <span className="text-lp-mute">Resets {reset} · {Math.round((usage.plan.used / usage.plan.limit) * 100)}%</span>
                  </div>
                  <Bar value={(usage.plan.used / usage.plan.limit) * 100} color="#34D399" />
                  <p className="mt-1 text-[11.5px] text-lp-mute">
                    {fmt(usage.plan.used)} of {fmt(usage.plan.limit)} plan tokens, used by study tools like learning paths and quizzes.
                  </p>
                </div>
              )}
              {usage.quotaUsd === null && <p className="text-[11.5px] text-lp-mute">No monthly AI budget is set for your account.</p>}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
