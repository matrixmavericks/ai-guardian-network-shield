import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpenCheck, Check, CheckCircle2, CircleHelp, Loader2, MessageCircleQuestion, MessageSquareQuote, PenLine, RotateCcw, Send, Target, Trophy, Undo2, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MYP, type Letter, type MypGroup } from "@/lib/myp";
import { DocViewer, TONE_LABEL, TONE_SOLID, type Tone, type ViewMark } from "@/components/pp/DocViewer";
import type { Annotation, ChatMessage } from "@/components/pp/analyze";
import { totals, type CriterionResult, type Results } from "./engine";

const card = "rounded-2xl border border-lp-line bg-lp-surface";
const DEMAND = ["none", "limited", "adequate", "substantial", "excellent"] as const;
const toneOf = (t: Annotation["type"]): Tone => (t === "strength" ? "strength" : t === "weakness" ? "weakness" : t === "missing" ? "missing" : "suggestion");

/* ---------- one criterion ---------- */

const DemandMeter: React.FC<{ demand: string }> = ({ demand }) => {
  const i = DEMAND.indexOf(demand as (typeof DEMAND)[number]);
  if (i < 0) return <span className="text-[11px] text-lp-mute">not assessed</span>;
  return (
    <div className="flex items-center gap-1.5" aria-label={`Demand reached: ${demand}`}>
      <div className="flex gap-[2px]">{[1, 2, 3, 4].map((k) => <span key={k} className={cn("h-1.5 w-4 rounded-full", k <= i ? (i >= 4 ? "bg-emerald-400" : i >= 3 ? "bg-lp-sky" : i >= 2 ? "bg-amber-400" : "bg-rose-400") : "bg-lp-line")} />)}</div>
      <span className="text-[11px] capitalize text-lp-mute">{demand}</span>
    </div>
  );
};

const CriterionPanel: React.FC<{
  group: MypGroup; r: CriterionResult | undefined; letter: Letter; mode: "student" | "teacher"; marks: ViewMark[]; placed: Set<string>; active: string | null;
  onShow: (id: string) => void; onExplain?: (focus: string, q: string) => void; onRetry?: () => Promise<void>;
  override?: number | null; onOverride?: (level: number | null) => void;
}> = ({ group, r, letter, mode, marks, placed, active, onShow, onExplain, onRetry, override, onOverride }) => {
  const [retrying, setRetrying] = useState(false);
  const c = MYP[group].criteria[letter];
  if (!r) return <div className={cn(card, "flex items-center gap-2 p-6 text-[14px] text-lp-mute")}><Loader2 className="h-4 w-4 animate-spin" /> Reviewing criterion {letter}…</div>;
  const shown = typeof override === "number" ? override : r.level;
  return (
    <div className={cn(card, "p-5")}>
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-lp-sky">{MYP[group].name} · Criterion {letter}</p>
      <h3 className="mt-1 text-[20px] font-semibold tracking-[-0.01em] text-white">{c.name}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-lp-mute">Assesses {c.focus}.</p>
      {r.error ? (
        <div className="mt-4 rounded-xl border border-lp-red/40 bg-lp-red/10 p-3">
          <p className="text-[13px] text-lp-red">This criterion couldn't be reviewed: {r.error}</p>
          {onRetry && (
            <button type="button" disabled={retrying} onClick={async () => { setRetrying(true); try { await onRetry(); } finally { setRetrying(false); } }} className="mt-2 flex h-9 items-center gap-2 rounded-xl bg-lp-blue px-3.5 text-[13px] font-medium text-white disabled:opacity-60">
              {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Try again
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-lp-blue/15">
              <span className="text-[26px] font-semibold leading-none text-white">{shown}</span>
              <span className="text-[10.5px] text-lp-mute">of 8</span>
            </div>
            <div className="min-w-0">
              <p className="text-[14px] leading-relaxed text-lp-soft">{r.summary}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                {r.weak && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">Only just at this level</span>}
                <span className="rounded-full border border-lp-line px-2 py-0.5 text-lp-mute">Confidence: {r.confidence}</span>
                {typeof override === "number" && override !== r.level && <span className="rounded-full bg-lp-blue/15 px-2 py-0.5 text-lp-sky">You changed it from {r.level}</span>}
              </div>
            </div>
          </div>

          {mode === "teacher" && onOverride && (
            <div className="mt-4 rounded-xl border border-lp-sky/30 bg-lp-blue/10 p-3">
              <p className="text-[12.5px] font-medium text-white">Your level for criterion {letter}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from({ length: 9 }, (_, n) => (
                  <button key={n} type="button" onClick={() => onOverride(n === r.level ? null : n)} aria-pressed={shown === n} className={cn("h-8 w-8 rounded-lg border text-[13px] font-medium", shown === n ? "border-lp-sky bg-lp-blue text-white" : n === r.level ? "border-lp-sky/50 text-lp-sky" : "border-lp-line text-lp-soft hover:text-white")}>{n}</button>
                ))}
                {typeof override === "number" && <button type="button" onClick={() => onOverride(null)} className="ml-1 flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] text-lp-mute hover:text-white"><Undo2 className="h-3.5 w-3.5" /> Use Refyn's {r.level}</button>}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-2">
            {r.whyThisLevel && <div className="rounded-xl border border-lp-line p-3"><p className="text-[12px] font-medium text-lp-sky">Why {r.level}</p><p className="mt-0.5 text-[13px] leading-relaxed text-lp-soft">{r.whyThisLevel}</p></div>}
            {r.whyNotHigher && r.level < 8 && <div className="rounded-xl border border-lp-line p-3"><p className="text-[12px] font-medium text-amber-300">Why not {r.level + 1}</p><p className="mt-0.5 text-[13px] leading-relaxed text-lp-soft">{r.whyNotHigher}</p></div>}
            {r.whyNotLower && r.level > 1 && <div className="rounded-xl border border-lp-line p-3"><p className="text-[12px] font-medium text-emerald-300">Why not {r.level - 1}</p><p className="mt-0.5 text-[13px] leading-relaxed text-lp-soft">{r.whyNotLower}</p></div>}
          </div>

          {r.strands.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-white"><BookOpenCheck className="h-4 w-4 text-lp-sky" /> Strand by strand</p>
              <ul className="space-y-1.5">
                {r.strands.map((s, i) => (
                  <li key={i} className="rounded-xl border border-lp-line p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-white">{s.strand !== "focus" ? `${s.strand}. ` : ""}{s.text || c.focus}</p>
                      <DemandMeter demand={s.demand} />
                    </div>
                    {s.comment && <p className="mt-1 text-[12.5px] leading-relaxed text-lp-soft">{s.comment}</p>}
                    {s.quote && <p className="mt-0.5 text-[12px] italic text-lp-mute">“{s.quote}”{s.page ? ` (p. ${s.page})` : ""}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {r.annotations.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-white"><MessageSquareQuote className="h-4 w-4 text-lp-sky" /> Notes on the work ({r.annotations.length})</p>
              <ul className="space-y-2">
                {r.annotations.map((a, i) => {
                  const m = marks.find((x) => x.id === `${letter}-a${i}`);
                  if (!m) return null;
                  const isPlaced = placed.has(m.id);
                  return (
                    <li key={i} id={`note-${m.id}`} className={cn("rounded-xl border p-3", active === m.id ? "border-lp-sky/60 bg-lp-blue/10" : "border-lp-line bg-lp-deep/30")}>
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: TONE_SOLID[m.tone] }}>{m.label}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11.5px] font-medium" style={{ color: TONE_SOLID[m.tone] }}>{TONE_LABEL[m.tone]}{a.descriptor ? ` · ${a.descriptor}` : ""}{a.page ? ` · p. ${a.page}` : ""}</p>
                          {a.quote && <button type="button" disabled={!isPlaced} onClick={() => onShow(m.id)} className="mt-1 block text-left text-[13px] italic leading-snug text-white/90 enabled:hover:underline">“{a.quote}”</button>}
                          <p className="mt-1 text-[13px] leading-relaxed text-lp-soft">{a.comment}</p>
                          {a.fix && <p className="mt-1 text-[13px] leading-relaxed text-lp-soft"><span className="font-medium text-lp-sky">What to do: </span>{a.fix}</p>}
                          <div className="mt-1.5 flex flex-wrap gap-3 text-[12px]">
                            {a.quote && (isPlaced ? <button type="button" onClick={() => onShow(m.id)} className="text-lp-sky hover:underline">Show in document</button> : <span className="text-lp-mute">Not found in the document</span>)}
                            {onExplain && <button type="button" onClick={() => onExplain(`Note ${m.label} on criterion ${letter}: ${TONE_LABEL[m.tone]}. ${a.quote ? `Quote: "${a.quote}". ` : ""}Comment: ${a.comment} ${a.fix ? `What to do: ${a.fix}` : ""}`, "I don't fully understand this note. Can you explain what it means and what I should do, with an example from a different topic?")} className="inline-flex items-center gap-1 text-lp-sky hover:underline"><MessageCircleQuestion className="h-3.5 w-3.5" /> Explain this</button>}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {r.nextBand && r.nextBand.steps.length > 0 && (
            <div className="mt-5 rounded-xl border border-lp-sky/30 bg-lp-blue/10 p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-medium text-white"><Target className="h-4 w-4 text-lp-sky" /> To reach {r.nextBand.band || "the next band"}</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-lp-soft">{r.nextBand.steps.map((t) => <li key={t}>{t}</li>)}</ol>
            </div>
          )}
          {r.topBand && (
            <div className="mt-3 rounded-xl border border-lp-line p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-medium text-white"><Trophy className="h-4 w-4 text-amber-300" /> What 7–8 work looks like</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-lp-soft">{r.topBand}</p>
            </div>
          )}
          {mode === "student" && r.questions.length > 0 && (
            <div className="mt-3 rounded-xl border border-lp-line p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-medium text-white"><CircleHelp className="h-4 w-4 text-lp-sky" /> Ask yourself</p>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-lp-soft">{r.questions.map((q) => <li key={q}>• {q}</li>)}</ul>
            </div>
          )}
          {mode === "student" && onExplain && (
            <button type="button" onClick={() => onExplain(`Criterion ${letter} (${c.name}), level ${r.level}. ${r.summary} Why not higher: ${r.whyNotHigher}`, `Can you explain my criterion ${letter} feedback simply and tell me the first thing to fix?`)} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-lp-line text-[13px] text-lp-sky hover:border-lp-blue/50">
              <MessageCircleQuestion className="h-4 w-4" /> Ask Refyn about criterion {letter}
            </button>
          )}
        </>
      )}
    </div>
  );
};

/* ---------- tutor ---------- */

const STARTERS = [
  "What should I fix first to raise my levels the most?",
  "What's the difference between 'describe' and 'explain' here?",
  "What would a 7–8 version of my work do differently?",
];

const Tutor: React.FC<{ chat: ChatMessage[]; focus: { text: string; label: string } | null; draft: string; setDraft: (s: string) => void; clearFocus: () => void; onAsk: (q: string, focus?: string) => Promise<void> }> = ({ chat, focus, draft, setDraft, clearFocus, onAsk }) => {
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [chat.length, busy]);
  const send = async (q: string) => {
    if (!q.trim() || busy) return;
    setBusy(true);
    setDraft("");
    try { await onAsk(q.trim(), focus?.text); } catch (e) { toast.error((e as Error).message); setDraft(q); } finally { setBusy(false); }
  };
  return (
    <div className={cn(card, "flex min-h-[420px] flex-col p-4")}>
      <p className="flex items-center gap-2 text-[15px] font-medium text-white"><MessageCircleQuestion className="h-4 w-4 text-lp-sky" /> Ask Refyn about your feedback</p>
      <p className="mt-1 text-[12.5px] text-lp-mute">Ask about anything you don't understand. Refyn explains and helps you plan, but won't do the work for you.</p>
      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto">
        {!chat.length && !busy && <div className="flex flex-wrap gap-1.5">{STARTERS.map((s) => <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-lp-line px-3 py-1.5 text-left text-[12.5px] text-lp-soft hover:border-lp-blue/50 hover:text-white">{s}</button>)}</div>}
        {chat.map((m, i) => m.role === "user"
          ? <div key={i} className="ml-8 rounded-2xl rounded-br-md bg-lp-blue px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white">{m.content}</div>
          : <div key={i} className="lp-md mr-4 rounded-2xl rounded-bl-md border border-lp-line bg-lp-deep/40 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-lp-soft"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>)}
        {busy && <div className="flex items-center gap-2 text-[13px] text-lp-mute"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>}
        <div ref={end} />
      </div>
      {focus && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-lp-sky/30 bg-lp-blue/10 px-3 py-2 text-[12.5px] text-lp-soft">
          <MessageSquareQuote className="h-4 w-4 shrink-0 text-lp-sky" /> <span className="min-w-0 flex-1 truncate">About: {focus.label}</span>
          <button type="button" onClick={clearFocus} aria-label="Stop asking about this" className="text-lp-mute hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(draft); }} className="mt-2 flex items-end gap-2">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }} rows={2} placeholder="Ask anything about your feedback" className="min-w-0 flex-1 resize-none rounded-xl border border-lp-line bg-lp-deep/60 px-3 py-2 text-[13.5px] text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60" />
        <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lp-blue text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
};

/* ---------- the view ---------- */

export const WorkView: React.FC<{
  group: MypGroup; criteria: Letter[]; results: Results; text: string; file: Blob | null; fileType: "pdf" | "docx" | null; mode: "student" | "teacher";
  onRetry?: (l: Letter) => Promise<void>;
  // student
  chat?: ChatMessage[]; onAsk?: (q: string, focus?: string) => Promise<void>;
  // teacher
  overrides?: Partial<Record<Letter, number>>; onOverride?: (l: Letter, level: number | null) => void;
  comment?: string; onComment?: (s: string) => void; approved?: boolean; onApprove?: (v: boolean) => void;
  header?: React.ReactNode;
}> = ({ group, criteria, results, text, file, fileType, mode, onRetry, chat = [], onAsk, overrides = {}, onOverride, comment, onComment, approved, onApprove, header }) => {
  type Tab = Letter | "ask" | "comment";
  const [tab, setTab] = useState<Tab>(criteria[0] ?? "A");
  const [active, setActive] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<{ text: string; label: string } | null>(null);
  const [draft, setDraft] = useState("");
  const key = criteria.join("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setTab(criteria[0] ?? "A"); setActive(null); }, [text, key]);

  const levels = Object.fromEntries(criteria.map((l) => [l, typeof overrides[l] === "number" ? overrides[l]! : results[l] && !results[l]!.error ? results[l]!.level : null])) as Partial<Record<Letter, number | null>>;
  const t = totals(levels, criteria);
  const allMarks = useMemo(() => {
    const out: ViewMark[] = [];
    for (const l of criteria) results[l]?.annotations?.forEach((a, i) => out.push({ id: `${l}-a${i}`, quote: a.quote, page: a.page, tone: toneOf(a.type), label: String(i + 1), title: `Criterion ${l} ${MYP[group].criteria[l].name}`, note: a.comment, fix: a.fix }));
    return out;
  }, [results, criteria, group]);
  const marks = useMemo(() => (tab === "ask" || tab === "comment" ? allMarks.map((m) => ({ ...m, label: `${m.id[0]}${m.label}` })) : allMarks.filter((m) => m.id.startsWith(`${tab}-`))), [tab, allMarks]);
  const onPlaced = useCallback((ids: Set<string>) => setPlaced((prev) => (prev.size === ids.size && [...ids].every((x) => prev.has(x)) ? prev : ids)), []);
  const pick = useCallback((id: string | null) => {
    setActive(id);
    if (!id) return;
    const l = id[0] as Letter;
    if (criteria.includes(l)) setTab(l);
    window.setTimeout(() => document.getElementById(`note-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  }, [criteria]);
  const explain = onAsk ? (text: string, q: string) => { setFocus({ text, label: text.slice(0, 90) }); setDraft(q); setTab("ask"); } : undefined;

  return (
    <div>
      {header}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))` }}>
        {criteria.map((l) => {
          const r = results[l];
          const lv = levels[l];
          return (
            <button key={l} type="button" onClick={() => { setTab(l); setActive(null); }} className={cn(card, "p-4 text-left transition-colors hover:border-lp-blue/50", tab === l && "border-lp-sky/60")}>
              <p className="truncate text-[12px] text-lp-mute">{l} · {MYP[group].criteria[l].name}</p>
              <p className="mt-1 text-[26px] font-semibold leading-none text-white">{r ? (r.error ? "–" : lv) : <Loader2 className="h-5 w-5 animate-spin text-lp-mute" />}<span className="text-[14px] font-normal text-lp-mute">/8</span></p>
              <div className="mt-2.5 flex gap-[3px]">{Array.from({ length: 8 }, (_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", typeof lv === "number" && i < lv ? "bg-lp-sky" : "bg-lp-line")} />)}</div>
              {typeof overrides[l] === "number" && r && overrides[l] !== r.level && <p className="mt-1.5 text-[11px] text-lp-sky">Changed from {r.level}</p>}
            </button>
          );
        })}
        <div className="lp-keep flex flex-col justify-center rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #3B5BDB 60%, #6D8BFF 100%)" }}>
          <p className="text-[12px] text-white/80">{t.complete ? "Total" : "So far"}</p>
          <p className="mt-1 text-[28px] font-semibold leading-none">{t.total}<span className="text-[14px] font-normal text-white/70">/{t.max}</span></p>
          {t.grade && <p className="mt-1 text-[12px] text-white/85">Grade {t.grade} (IB 1–7 guideline)</p>}
          <p className="mt-1.5 text-[10.5px] leading-snug text-white/70">{mode === "student" ? "Indicative: your teacher assesses your work." : "Pre-marked by Refyn: you decide."}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
        <div className="order-2 h-[75vh] min-w-0 lg:sticky lg:top-4 lg:order-1 lg:h-[calc(100vh-140px)]">
          <DocViewer kind={file && fileType ? fileType : "text"} blob={file} text={text} marks={marks} active={active} onPick={pick} onExplain={explain ? (m) => explain(`Note ${m.label} (${m.title}): ${m.note} ${m.fix ? `What to do: ${m.fix}` : ""}`, "I don't fully understand this note. Can you explain it, with an example from a different topic?") : undefined} onPlaced={onPlaced} />
        </div>
        <div className="order-1 min-w-0 lg:order-2 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto lg:pr-1">
          <div className="sticky top-0 z-10 -mx-1 mb-3 bg-lp-bg/95 px-1 pb-2 backdrop-blur">
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-lp-line bg-lp-surface/60 p-1 text-[12.5px]">
              {criteria.map((l) => <button key={l} type="button" onClick={() => { setTab(l); setActive(null); }} className={cn("shrink-0 flex-1 whitespace-nowrap rounded-lg px-3 py-1.5", tab === l ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>Criterion {l}</button>)}
              {mode === "student" && onAsk && <button type="button" onClick={() => setTab("ask")} className={cn("shrink-0 flex-1 whitespace-nowrap rounded-lg px-3 py-1.5", tab === "ask" ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>Ask Refyn</button>}
              {mode === "teacher" && <button type="button" onClick={() => setTab("comment")} className={cn("shrink-0 flex-1 whitespace-nowrap rounded-lg px-3 py-1.5", tab === "comment" ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>Comment</button>}
            </div>
          </div>
          {criteria.includes(tab as Letter) && (
            <CriterionPanel
              key={tab}
              group={group}
              letter={tab as Letter}
              r={results[tab as Letter]}
              mode={mode}
              marks={marks}
              placed={placed}
              active={active}
              onShow={pick}
              onExplain={explain}
              onRetry={onRetry ? () => onRetry(tab as Letter) : undefined}
              override={overrides[tab as Letter]}
              onOverride={onOverride ? (lv) => onOverride(tab as Letter, lv) : undefined}
            />
          )}
          {tab === "ask" && onAsk && <Tutor chat={chat} focus={focus} draft={draft} setDraft={setDraft} clearFocus={() => setFocus(null)} onAsk={onAsk} />}
          {tab === "comment" && (
            <div className={cn(card, "p-5")}>
              <p className="flex items-center gap-2 text-[15px] font-medium text-white"><PenLine className="h-4 w-4 text-lp-sky" /> Comment to the student</p>
              <p className="mt-1 text-[12.5px] text-lp-mute">Drafted from each criterion's feedback. Edit it in your own voice before you approve.</p>
              <textarea value={comment ?? ""} onChange={(e) => onComment?.(e.target.value)} rows={12} className="mt-3 w-full resize-y rounded-xl border border-lp-line bg-lp-deep/60 px-3 py-2.5 text-[13.5px] leading-relaxed text-white outline-none focus:border-lp-blue/60" />
              <button type="button" onClick={() => onApprove?.(!approved)} className={cn("mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13.5px] font-medium", approved ? "border border-emerald-500/50 bg-emerald-500/15 text-emerald-300" : "bg-lp-blue text-white hover:bg-[#2F6FE0]")}>
                {approved ? <><CheckCircle2 className="h-4 w-4" /> Approved: click to undo</> : <><Check className="h-4 w-4" /> Approve levels and comment</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
