import React, { useCallback, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStoredState } from "@/components/assistant/storage";
import { cn } from "@/lib/utils";
import { primaryBtn } from "@/components/subjects/kit";

type Cached = { reply: string; at: number };

/**
 * Runs a refyn-intelligence report and keeps the latest one per student (and
 * per `cacheKey`, e.g. the career) in this browser, so revisits are instant.
 */
export const useIntelReport = (feature: string, cacheKey = "default") => {
  const { user } = useAuth();
  const [cache, setCache] = useStoredState<Record<string, Cached>>(user ? `refyn:${user.id}:intel:${feature}` : null, {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const current = cache[cacheKey];

  const run = useCallback(
    async (params: Record<string, unknown> = {}, key = cacheKey) => {
      setLoading(true);
      setError("");
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("refyn-intelligence", { body: { feature, params } });
        if (fnErr) throw fnErr;
        if (!data?.success) throw new Error(data?.error || "Analysis failed");
        setCache((prev) => ({ ...prev, [key]: { reply: data.reply as string, at: Date.now() } }));
      } catch (e) {
        setError((e as Error)?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [feature, cacheKey, setCache],
  );

  return { reply: current?.reply ?? "", at: current?.at ?? null, loading, error, run, cache };
};

/* ---------- Markdown → sections / items ---------- */

export type Section = { title: string; body: string };

export const parseSections = (md: string): Section[] => {
  const parts = md.replace(/\r\n/g, "\n").split(/\n(?=##\s)/);
  return parts
    .map((p) => {
      const m = /^##\s+(.*)\n?([\s\S]*)$/.exec(p.trim());
      return m ? { title: m[1].replace(/[*#]/g, "").trim(), body: m[2].trim() } : { title: "", body: p.trim() };
    })
    .filter((s) => s.title || s.body);
};

export const findSection = (sections: Section[], ...keys: string[]) =>
  sections.find((s) => keys.some((k) => s.title.toLowerCase().includes(k.toLowerCase())));

/** Bullet / numbered items, with ### sub-headings kept as group labels. */
export const itemsOf = (body = "") => {
  const out: { group?: string; text: string }[] = [];
  let group: string | undefined;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const h = /^#{3,6}\s+(.*)$/.exec(line);
    if (h) {
      group = h[1].replace(/[*]/g, "").trim();
      continue;
    }
    const b = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (b) out.push({ group, text: b[1] });
    else if (out.length && /^\s{2,}/.test(raw)) out[out.length - 1].text += ` ${line}`;
    else out.push({ group, text: line });
  }
  return out;
};

/** "**Biology:** strong" -> { label: "Biology", rest: "strong" } */
export const splitLabel = (text: string) => {
  const m = /^\*\*(.+?)\*\*:?\s*(.*)$/.exec(text) || /^([^:]{2,40}):\s+(.*)$/.exec(text);
  return m ? { label: m[1].replace(/:$/, "").trim(), rest: m[2].trim() } : { label: "", rest: text };
};

/** Light inline formatting for **bold** and *italic* in AI text. */
export const Inline: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <strong key={i} className="font-semibold text-white">
            {p.slice(2, -2)}
          </strong>
        ) : p.startsWith("*") && p.length > 2 ? (
          <em key={i}>{p.slice(1, -1)}</em>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
};

/* ---------- Page header + run bar ---------- */

export const IntelHeader: React.FC<{ icon: React.ElementType; gradient: string; title: string; body: string; badge?: string }> = ({ icon: Icon, gradient, title, body, badge }) => (
  <header className="lp-fade flex flex-wrap items-center gap-5" style={{ animationFillMode: "both" }}>
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_18px_50px_-18px_rgba(59,130,246,0.9)]" style={{ background: gradient }}>
      <Icon className="h-7 w-7" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">
        Intelligence {badge && <span className="rounded-full bg-lp-cyan/15 px-2 py-0.5 text-[10px] tracking-[0.12em] text-lp-cyan">{badge}</span>}
      </p>
      <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[32px]">{title}</h1>
      <p className="mt-1 max-w-[640px] text-[14.5px] text-lp-soft">{body}</p>
    </div>
  </header>
);

export const RunButton: React.FC<{ loading: boolean; hasRun: boolean; label: string; onClick: () => void; at: number | null; className?: string }> = ({ loading, hasRun, label, onClick, at, className }) => (
  <div className={cn("flex flex-wrap items-center gap-3", className)}>
    <button type="button" onClick={onClick} disabled={loading} className={primaryBtn}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : hasRun ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      {loading ? "Analysing…" : hasRun ? "Run again" : label}
    </button>
    {at && !loading && <span className="text-[12px] text-lp-mute">Last run {formatDistanceToNow(at, { addSuffix: true })}</span>}
  </div>
);

/** Shimmer shown while a report is being written. */
export const ReportSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="lp-skeleton h-24 rounded-3xl" style={{ opacity: 1 - i * 0.2 }} />
    ))}
  </div>
);
