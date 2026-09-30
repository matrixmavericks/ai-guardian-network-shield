import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpenCheck, Check, ChevronDown, CircleHelp, Fingerprint, Info, Lightbulb, ListChecks,
  Loader2, MessageSquareQuote, PenLine, RotateCcw, Search, ShieldCheck, Sparkles, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PP_CRITERIA, PP_FORMAT, PP_STRANDS, bandOf, strandById, type Band, type PPCriterionId, type PPStrandId } from "@/lib/personalProject";
import { locate, type Review, type StrandResult } from "./analyze";

type Mark = { id: string; start: number; end: number; tone: "good" | "gap" | "voice" | "source"; note: string };
const TONE: Record<Mark["tone"], string> = {
  good: "bg-emerald-400/25 decoration-emerald-400",
  gap: "bg-amber-400/25 decoration-amber-400",
  voice: "bg-violet-400/25 decoration-violet-400",
  source: "bg-rose-400/25 decoration-rose-400",
};
const BANDS: Band[] = ["7-8", "5-6", "3-4", "1-2"];
const STRAND_IDS = PP_STRANDS.map((s) => s.id);
const card = "rounded-2xl border border-lp-line bg-lp-surface";

/* ---------- report reader with highlights ---------- */

const Reader: React.FC<{ text: string; marks: Mark[]; active: string | null; onPick: (id: string) => void }> = ({ text, marks, active, onPick }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const el = ref.current?.querySelector(`[data-mark="${CSS.escape(active)}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active]);
  const pages = useMemo(() => {
    // Split into pages (PDFs carry "## Page N" markers), keeping absolute offsets
    const out: { n: number | null; start: number; end: number }[] = [];
    const re = /^## Page (\d+)$/gm;
    let m: RegExpExecArray | null;
    let last = 0;
    let n: number | null = null;
    while ((m = re.exec(text))) {
      if (m.index > last || n !== null) out.push({ n, start: last, end: m.index });
      n = Number(m[1]);
      last = m.index + m[0].length;
    }
    out.push({ n, start: last, end: text.length });
    return out.filter((p) => text.slice(p.start, p.end).trim());
  }, [text]);
  const sorted = useMemo(() => {
    const s = [...marks].sort((a, b) => a.start - b.start);
    const kept: Mark[] = [];
    for (const m of s) if (!kept.length || m.start >= kept[kept.length - 1].end) kept.push(m);
    return kept;
  }, [marks]);
  const render = (from: number, to: number) => {
    const parts: React.ReactNode[] = [];
    let at = from;
    for (const m of sorted) {
      if (m.end <= from || m.start >= to) continue;
      const s = Math.max(m.start, from), e = Math.min(m.end, to);
      if (s > at) parts.push(text.slice(at, s));
      parts.push(
        <mark
          key={`${m.id}-${s}`}
          data-mark={m.id}
          title={m.note}
          onClick={() => onPick(m.id)}
          className={cn("cursor-pointer rounded-[3px] px-0.5 text-inherit underline decoration-2 underline-offset-2 transition-shadow", TONE[m.tone], active === m.id && "ring-2 ring-lp-sky")}
        >
          {text.slice(s, e)}
        </mark>,
      );
      at = e;
    }
    if (at < to) parts.push(text.slice(at, to));
    return parts;
  };
  return (
    <div ref={ref} className="space-y-4">
      {pages.map((p, i) => (
        <div key={i} className="rounded-2xl border border-lp-line bg-lp-deep/40 px-5 py-4 sm:px-7 sm:py-6">
          {p.n !== null && <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-lp-mute">Page {p.n}</p>}
          <div className="whitespace-pre-wrap text-[14.5px] leading-[1.75] text-lp-soft">{render(p.start, p.end)}</div>
        </div>
      ))}
    </div>
  );
};

/* ---------- score strip ---------- */

const LevelPips: React.FC<{ level: number }> = ({ level }) => (
  <div className="flex gap-[3px]" aria-hidden>
    {Array.from({ length: 8 }, (_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < level ? "bg-lp-sky" : "bg-lp-line")} />)}
  </div>
);

const ScoreStrip: React.FC<{ review: Review; previous?: Review | null; onPick: (id: PPStrandId) => void }> = ({ review, previous, onPick }) => (
  <div className="grid gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_180px]">
    {(Object.keys(PP_CRITERIA) as PPCriterionId[]).map((c) => {
      const missing = review.incomplete?.includes(c);
      const delta = previous && !missing && !previous.incomplete?.includes(c) ? review.criteria[c] - previous.criteria[c] : 0;
      return (
        <div key={c} className={cn(card, "p-4")}>
          <div className="flex items-baseline justify-between">
            <p className="text-[12.5px] text-lp-mute">Criterion {c} · {PP_CRITERIA[c].name}</p>
            {delta !== 0 && <span className={cn("text-[11.5px] font-medium", delta > 0 ? "text-lp-green" : "text-amber-400")}>{delta > 0 ? `+${delta}` : delta} since last draft</span>}
          </div>
          <p className="mt-1 text-[28px] font-semibold leading-none tracking-[-0.02em] text-white">{missing ? "–" : review.criteria[c]}<span className="text-[15px] font-normal text-lp-mute">/8</span></p>
          <div className="mt-3"><LevelPips level={missing ? 0 : review.criteria[c]} /></div>
          {missing && <p className="mt-2 text-[11.5px] text-amber-400">A strand wasn't reviewed: try it again to score this criterion.</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PP_CRITERIA[c].strands.map((id) => {
              const r = review.strands[id];
              return (
                <button key={id} type="button" onClick={() => onPick(id)} className="rounded-lg border border-lp-line px-2 py-1 text-[11.5px] text-lp-soft hover:border-lp-blue/50 hover:text-white">
                  {id} <span className="font-semibold text-white">{r?.error ? "–" : r?.level ?? "…"}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    })}
    <div className="lp-keep flex flex-col justify-center rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #3B5BDB 60%, #6D8BFF 100%)" }}>
      <p className="text-[12.5px] text-white/80">Indicative total</p>
      <p className="mt-1 text-[34px] font-semibold leading-none tracking-[-0.02em]">{review.total}<span className="text-[16px] font-normal text-white/70">/24</span></p>
      {!!review.incomplete?.length && <p className="mt-1 text-[12px] text-white/85">Incomplete: criterion {review.incomplete.join(", ")} not scored</p>}
      {previous && !review.incomplete?.length && !previous.incomplete?.length && review.total !== previous.total && <p className="mt-1 text-[12px] text-white/85">{review.total > previous.total ? "▲" : "▼"} {Math.abs(review.total - previous.total)} since your last draft</p>}
      <p className="mt-2 text-[11px] leading-snug text-white/70">Your supervisor marks the real report and the IB moderates.</p>
    </div>
  </div>
);

/* ---------- one strand ---------- */

const BandLadder: React.FC<{ strand: PPStrandId; level: number }> = ({ strand, level }) => {
  const s = strandById(strand);
  const now = bandOf(level);
  const next = now === "7-8" ? null : now === null ? "1-2" : BANDS[BANDS.indexOf(now) - 1];
  return (
    <div className="space-y-1.5">
      {BANDS.map((b) => (
        <div
          key={b}
          className={cn(
            "flex gap-3 rounded-xl border px-3 py-2",
            b === now ? "border-lp-sky/60 bg-lp-blue/15" : b === next ? "border-dashed border-lp-sky/40" : "border-lp-line opacity-70",
          )}
        >
          <span className={cn("w-9 shrink-0 pt-0.5 text-[12px] font-semibold tabular-nums", b === now ? "text-lp-sky" : "text-lp-mute")}>{b}</span>
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-lp-soft">The student {s.bands[b]}.</p>
          {b === now && <span className="shrink-0 self-start rounded-full bg-lp-sky/20 px-2 py-0.5 text-[10.5px] font-medium text-lp-sky">You</span>}
          {b === next && <span className="shrink-0 self-start rounded-full border border-lp-sky/40 px-2 py-0.5 text-[10.5px] font-medium text-lp-sky">Next</span>}
        </div>
      ))}
    </div>
  );
};

const QuoteItem: React.FC<{ id: string; quote: string; note: string; tone: Mark["tone"]; located: boolean; active: boolean; onShow: () => void }> = ({ quote, note, tone, located, active, onShow }) => (
  <li className={cn("rounded-xl border p-3", active ? "border-lp-sky/60 bg-lp-blue/10" : "border-lp-line bg-lp-deep/30")}>
    {quote && (
      <button type="button" onClick={onShow} disabled={!located} className="group flex w-full items-start gap-2 text-left disabled:cursor-default">
        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", tone === "good" ? "bg-emerald-400" : tone === "gap" ? "bg-amber-400" : tone === "voice" ? "bg-violet-400" : "bg-rose-400")} />
        <span className="text-[13px] italic leading-snug text-white/90 group-enabled:group-hover:underline">“{quote}”</span>
      </button>
    )}
    <p className={cn("text-[13px] leading-relaxed text-lp-soft", quote && "mt-1.5 pl-4")}>{note}</p>
  </li>
);

const Collapse: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode; open?: boolean }> = ({ title, icon: Icon, children, open: start = false }) => {
  const [open, setOpen] = useState(start);
  return (
    <div className="rounded-xl border border-lp-line">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium text-white">
        <Icon className="h-4 w-4 text-lp-sky" /> <span className="flex-1">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-lp-mute transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-lp-line px-3 py-2.5">{children}</div>}
    </div>
  );
};

const StrandCard: React.FC<{ r: StrandResult | undefined; located: Set<string>; active: string | null; onShow: (id: string) => void; onRetry?: () => Promise<void> }> = ({ r, located, active, onShow, onRetry }) => {
  const [retrying, setRetrying] = useState(false);
  if (!r) return <div className={cn(card, "p-6 text-[14px] text-lp-mute")}>Waiting for this strand…</div>;
  const s = strandById(r.strand);
  return (
    <div className={cn(card, "p-5")}>
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-lp-sky">Criterion {s.criterion} · strand {s.id.slice(1)}</p>
      <h3 className="mt-1 text-[20px] font-semibold tracking-[-0.01em] text-white">{s.label}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-lp-mute">{s.objective}</p>
      {r.error ? (
        <div className="mt-4 rounded-xl border border-lp-red/40 bg-lp-red/10 p-3">
          <p className="text-[13px] text-lp-red">This strand couldn't be reviewed: {r.error}</p>
          {onRetry && (
            <button type="button" disabled={retrying} onClick={async () => { setRetrying(true); try { await onRetry(); } finally { setRetrying(false); } }} className="mt-2 flex h-9 items-center gap-2 rounded-xl bg-lp-blue px-3.5 text-[13px] font-medium text-white disabled:opacity-60">
              {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Try this strand again
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-lp-blue/15">
              <span className="text-[26px] font-semibold leading-none text-white">{r.level}</span>
              <span className="text-[10.5px] text-lp-mute">of 8</span>
            </div>
            <div className="min-w-0">
              <p className="text-[14px] leading-relaxed text-lp-soft">{r.summary}</p>
              <p className="mt-1 text-[11.5px] text-lp-mute">
                {r.weak ? "Only just fits this level. " : ""}Confidence: {r.confidence}. Indicative, not your final mark.
              </p>
            </div>
          </div>
          <div className="mt-4"><BandLadder strand={s.id} level={r.level} /></div>

          {r.found.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-white"><Check className="h-4 w-4 text-emerald-400" /> What's working</p>
              <ul className="space-y-2">
                {r.found.map((f, i) => { const id = `${s.id}-f${i}`; return <QuoteItem key={id} id={id} quote={f.quote} note={f.note} tone="good" located={located.has(id)} active={active === id} onShow={() => onShow(id)} />; })}
              </ul>
            </div>
          )}
          {r.gaps.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-white"><PenLine className="h-4 w-4 text-amber-400" /> What to improve</p>
              <ul className="space-y-2">
                {r.gaps.map((g, i) => { const id = `${s.id}-g${i}`; return <QuoteItem key={id} id={id} quote={g.quote} note={g.note} tone="gap" located={located.has(id)} active={active === id} onShow={() => onShow(id)} />; })}
              </ul>
            </div>
          )}
          {r.nextBand && r.nextBand.steps.length > 0 && (
            <div className="mt-5 rounded-xl border border-lp-sky/30 bg-lp-blue/10 p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-medium text-white"><Target className="h-4 w-4 text-lp-sky" /> To reach {r.nextBand.band || "the next band"}</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-lp-soft">{r.nextBand.steps.map((t) => <li key={t}>{t}</li>)}</ol>
            </div>
          )}
          {r.questions.length > 0 && (
            <div className="mt-4 rounded-xl border border-lp-line p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-medium text-white"><CircleHelp className="h-4 w-4 text-lp-sky" /> Ask yourself</p>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-lp-soft">{r.questions.map((q) => <li key={q}>• {q}</li>)}</ul>
            </div>
          )}
        </>
      )}
      <div className="mt-4 space-y-2">
        <Collapse title="What examiners look for" icon={BookOpenCheck}>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-lp-soft">{s.lookFor.map((t) => <li key={t}>• {t}</li>)}</ul>
        </Collapse>
        <Collapse title="Common pitfalls" icon={AlertTriangle}>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-lp-soft">{s.pitfalls.map((t) => <li key={t}>• {t}</li>)}</ul>
        </Collapse>
      </div>
    </div>
  );
};

const Overall: React.FC<{ review: Review }> = ({ review }) => (
  <div className={cn(card, "p-5")}>
    <h3 className="text-[18px] font-semibold text-white">How the criterion levels are decided</h3>
    <p className="mt-1 text-[13px] leading-relaxed text-lp-mute">
      Like IB examiners, Refyn judges each strand first, then picks the level that best fits the criterion as a whole. Every strand counts equally. When the work sits between two levels it gets the higher one, unless a strand only just fits its level.
    </p>
    <div className="mt-4 space-y-3">
      {(Object.keys(PP_CRITERIA) as PPCriterionId[]).map((c) => (
        <div key={c} className="rounded-xl border border-lp-line p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-medium text-white">Criterion {c}: {PP_CRITERIA[c].name}</p>
            <p className="text-[14px] font-semibold text-lp-sky">{review.criteria[c]}/8</p>
          </div>
          <p className="mt-1 text-[12.5px] text-lp-mute">
            Strands: {PP_CRITERIA[c].strands.map((id) => { const r = review.strands[id]; return `${id} ${r?.error ? "not reviewed" : `${r?.level ?? "?"}${r?.weak ? " (only just)" : ""}`}`; }).join(" · ")}{review.incomplete?.includes(c) ? " · not scored until every strand is reviewed" : ""}
          </p>
        </div>
      ))}
    </div>
    <p className="mt-4 text-[12px] leading-relaxed text-lp-mute">These are indicative levels from a draft to help you improve. Your supervisor assesses the final report and the IB moderates it; the IB sets grade boundaries each session.</p>
  </div>
);

/* ---------- integrity ---------- */

const googleExact = (quote: string) => `https://www.google.com/search?q=${encodeURIComponent(`"${quote.split(/\s+/).slice(0, 14).join(" ")}"`)}`;

const IntegrityPanel: React.FC<{ review: Review; located: Set<string>; active: string | null; onShow: (id: string) => void }> = ({ review, located, active, onShow }) => {
  const i = review.integrity;
  const w = review.writing;
  const sim = review.similarity;
  const signals = i?.authenticity.signals ?? "some";
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 text-[12.5px] leading-relaxed text-lp-soft">
        <p className="flex items-center gap-2 font-medium text-white"><Info className="h-4 w-4 text-violet-300" /> About these checks</p>
        No tool can reliably tell whether writing came from AI, so this one doesn't try to prove anything or give a percentage. It shows where your report doesn't yet sound like your own account of your own project, and where sources need citing, so you can fix them before you submit. The IB requires the report to be your own work, with any AI use acknowledged as your school asks.
      </div>

      <div className={cn(card, "p-5")}>
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[15px] font-medium text-white"><Sparkles className="h-4 w-4 text-violet-300" /> Your own voice</p>
          <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-medium", signals === "few" ? "bg-emerald-500/15 text-emerald-300" : signals === "some" ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300")}>
            {signals === "few" ? "Few generic passages" : signals === "some" ? "Some generic passages" : "Many generic passages"}
          </span>
        </div>
        {i?.error ? <p className="mt-2 text-[13px] text-lp-red">{i.error}</p> : <p className="mt-2 text-[13.5px] leading-relaxed text-lp-soft">{i?.authenticity.summary}</p>}
        {i && i.authenticity.passages.length > 0 && (
          <ul className="mt-3 space-y-2">
            {i.authenticity.passages.map((p, k) => { const id = `voice-${k}`; return <QuoteItem key={id} id={id} quote={p.quote} note={`${p.why}${p.fix ? ` ${p.fix}` : ""}`} tone="voice" located={located.has(id)} active={active === id} onShow={() => onShow(id)} />; })}
          </ul>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            ["Sentence variety", w.variety.toFixed(2), w.variety < 0.35 ? "Very even sentence lengths: vary them" : "Natural variety"],
            ["Personal voice", `${w.personal}`, w.personal < 12 ? "Few 'I/my': tell it as your story" : "Written as your account"],
            ["Specific details", `${w.specifics}`, w.specifics < 4 ? "Add dates, numbers, specifics" : "Good specifics"],
            ["Stock phrases", `${w.stock.reduce((t, s) => t + s.count, 0)}`, w.stock.length ? "Replace with your own words" : "None found"],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-xl border border-lp-line p-3">
              <p className="text-[11.5px] text-lp-mute">{label}</p>
              <p className="text-[18px] font-semibold text-white">{value}</p>
              <p className="text-[11.5px] leading-snug text-lp-mute">{hint}</p>
            </div>
          ))}
        </div>
        {w.stock.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {w.stock.map((s) => <span key={s.phrase} className="rounded-full border border-lp-line px-2.5 py-0.5 text-[12px] text-lp-soft">“{s.phrase.replace(/,$/, "")}” ×{s.count}</span>)}
          </div>
        )}
        <p className="mt-2 text-[11.5px] text-lp-mute">Per 1,000 words for voice and details. These are writing habits to look at, not evidence of anything.</p>
      </div>

      <div className={cn(card, "p-5")}>
        <p className="flex items-center gap-2 text-[15px] font-medium text-white"><MessageSquareQuote className="h-4 w-4 text-lp-sky" /> Referencing</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
          <span className={cn("rounded-full px-2.5 py-0.5", i?.citations.hasBibliography ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300")}>{i?.citations.hasBibliography ? "Bibliography found" : "No bibliography found"}</span>
          <span className={cn("rounded-full px-2.5 py-0.5", i?.citations.inTextCitations ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300")}>{i?.citations.inTextCitations ? "In-text citations used" : "No in-text citations"}</span>
        </div>
        {i?.citations.summary && <p className="mt-2 text-[13.5px] leading-relaxed text-lp-soft">{i.citations.summary}</p>}
        {i && i.citations.issues.length > 0 && (
          <ul className="mt-3 space-y-2">
            {i.citations.issues.map((c, k) => { const id = `cite-${k}`; return <QuoteItem key={id} id={id} quote={c.quote} note={c.issue} tone="source" located={located.has(id)} active={active === id} onShow={() => onShow(id)} />; })}
          </ul>
        )}
      </div>

      <div className={cn(card, "p-5")}>
        <p className="flex items-center gap-2 text-[15px] font-medium text-white"><Search className="h-4 w-4 text-lp-sky" /> Check against your sources</p>
        <p className="mt-1 text-[13px] leading-relaxed text-lp-mute">These passages read as if they could come from a source. Check each one: quote it and cite it, or put it in your own words.</p>
        {i && i.checkSources.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {i.checkSources.map((c, k) => {
              const id = `src-${k}`;
              return (
                <li key={id} className={cn("rounded-xl border p-3", active === id ? "border-lp-sky/60 bg-lp-blue/10" : "border-lp-line bg-lp-deep/30")}>
                  <button type="button" disabled={!located.has(id)} onClick={() => onShow(id)} className="text-left text-[13px] italic text-white/90 enabled:hover:underline">“{c.quote}”</button>
                  <p className="mt-1 text-[13px] text-lp-soft">{c.why}</p>
                  <a href={googleExact(c.quote)} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] text-lp-sky hover:underline"><Search className="h-3.5 w-3.5" /> Search this sentence online</a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-lp-soft">Nothing stood out.</p>
        )}
      </div>

      <div className={cn(card, "p-5")}>
        <p className="flex items-center gap-2 text-[15px] font-medium text-white"><Fingerprint className="h-4 w-4 text-lp-sky" /> Similarity with other reports at your school</p>
        {!sim ? (
          <p className="mt-2 text-[13px] text-lp-mute">You chose not to compare this draft.</p>
        ) : sim.error ? (
          <p className="mt-2 text-[13px] text-lp-red">{sim.error}</p>
        ) : sim.note ? (
          <p className="mt-2 text-[13px] text-lp-soft">{sim.note}</p>
        ) : sim.matches.length ? (
          <div className="mt-3 space-y-2">
            {sim.matches.map((m, k) => (
              <div key={k} className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                <div className="flex items-center justify-between text-[13px]"><span className="text-white">Another student's report</span><span className="font-semibold text-amber-300">{Math.round(m.overlap * 100)}% shared phrasing</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lp-line"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, m.overlap * 100)}%` }} /></div>
                <p className="mt-1.5 text-[12px] text-lp-mute">{m.shared} identical 8-word phrases. Shared school template text is left out. Talk to your supervisor if this surprises you.</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[13.5px] text-lp-soft">No meaningful overlap with {sim.compared} other report{sim.compared === 1 ? "" : "s"} at your school{sim.template ? ` (${sim.template} shared template phrases ignored)` : ""}.</p>
        )}
        <p className="mt-3 text-[11.5px] leading-relaxed text-lp-mute">Compared anonymously using fingerprints of 8-word phrases, never your text. Refyn doesn't search the web like Turnitin; your school may also ask for a Turnitin report.</p>
      </div>
    </div>
  );
};

/* ---------- format ---------- */

const FormatPanel: React.FC<{ review: Review }> = ({ review }) => (
  <div className="space-y-4">
    <div className={cn(card, "p-5")}>
      <p className="flex items-center gap-2 text-[15px] font-medium text-white"><ListChecks className="h-4 w-4 text-lp-sky" /> Checks on your report</p>
      <ul className="mt-3 space-y-2">
        {review.format.map((c) => (
          <li key={c.id} className="flex gap-3 rounded-xl border border-lp-line p-3">
            {c.ok === true ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : c.ok === false ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-lp-sky" />}
            <div>
              <p className="text-[13.5px] font-medium text-white">{c.title}</p>
              <p className="text-[13px] leading-relaxed text-lp-soft">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
    <div className={cn(card, "p-5")}>
      <p className="flex items-center gap-2 text-[15px] font-medium text-white"><ShieldCheck className="h-4 w-4 text-lp-sky" /> Submission rules</p>
      <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-lp-soft">{PP_FORMAT.notes.map((n) => <li key={n}>• {n}</li>)}</ul>
      <p className="mt-2 text-[11.5px] text-lp-mute">From the IB projects guide as schools publish it. Your coordinator's deadlines and requirements come first.</p>
    </div>
  </div>
);

/* ---------- the review ---------- */

export const ReviewView: React.FC<{ review: Review; previous?: Review | null; onBack: () => void; onRetry?: (id: PPStrandId) => Promise<void> }> = ({ review, previous, onBack, onRetry }) => {
  const [tab, setTab] = useState<"strands" | "integrity" | "format">("strands");
  const [step, setStep] = useState<PPStrandId | "overall">("Ai");
  const [active, setActive] = useState<string | null>(null);

  const all = useMemo(() => {
    const marks: Mark[] = [];
    const located = new Set<string>();
    const add = (id: string, quote: string, tone: Mark["tone"], note: string) => {
      const at = locate(review.text, quote);
      if (!at) return;
      located.add(id);
      marks.push({ id, start: at[0], end: at[1], tone, note });
    };
    for (const id of STRAND_IDS) {
      const r = review.strands[id];
      r?.found.forEach((f, i) => add(`${id}-f${i}`, f.quote, "good", f.note));
      r?.gaps.forEach((g, i) => add(`${id}-g${i}`, g.quote, "gap", g.note));
    }
    review.integrity?.authenticity.passages.forEach((p, i) => add(`voice-${i}`, p.quote, "voice", p.why));
    review.integrity?.citations.issues.forEach((c, i) => add(`cite-${i}`, c.quote, "source", c.issue));
    review.integrity?.checkSources.forEach((c, i) => add(`src-${i}`, c.quote, "source", c.why));
    return { marks, located };
  }, [review]);

  const shownMarks = all.marks.filter((m) =>
    tab === "strands" ? (step === "overall" ? /^(A|B|C)i/.test(m.id) : m.id.startsWith(`${step}-`)) : tab === "integrity" ? /^(voice|cite|src)-/.test(m.id) : false,
  );
  const pick = (id: string) => {
    setActive(id);
    const strand = id.split("-")[0];
    if (STRAND_IDS.includes(strand as PPStrandId)) { setTab("strands"); setStep(strand as PPStrandId); }
    else if (/^(voice|cite|src)$/.test(strand)) setTab("integrity");
  };
  const idx = step === "overall" ? STRAND_IDS.length : STRAND_IDS.indexOf(step);
  const go = (d: number) => {
    const n = idx + d;
    setActive(null);
    setStep(n >= STRAND_IDS.length ? "overall" : STRAND_IDS[Math.max(0, n)]);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="flex h-9 items-center gap-2 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:text-white"><ArrowLeft className="h-4 w-4" /> All drafts</button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-white">{review.title}</p>
          <p className="text-[12px] text-lp-mute">{new Date(review.createdAt).toLocaleString()} · {review.words.toLocaleString()} words{review.pages ? ` · ${review.pages} pages` : ""}</p>
        </div>
      </div>
      <ScoreStrip review={review} previous={previous} onPick={(id) => { setTab("strands"); setStep(id); setActive(null); }} />

      <div className="mt-6 flex gap-1 rounded-xl border border-lp-line bg-lp-surface/60 p-1 text-[13px] sm:inline-flex">
        {([["strands", "Feedback by strand"], ["integrity", "Integrity"], ["format", "Format"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => { setTab(k); setActive(null); }} className={cn("flex-1 rounded-lg px-3.5 py-1.5 sm:flex-none", tab === k ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>{label}</button>
        ))}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
        <div className="order-2 lg:order-1 lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto lg:pr-1">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-[12px] text-lp-mute">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400/60" /> earns credit</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400/60" /> to improve</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-violet-400/60" /> generic voice</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-400/60" /> check source</span>
          </div>
          <Reader text={review.text} marks={shownMarks} active={active} onPick={pick} />
        </div>
        <div className="order-1 lg:order-2 lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto lg:pr-1">
          {tab === "strands" && (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {STRAND_IDS.map((id) => {
                  const r = review.strands[id];
                  return (
                    <button key={id} type="button" onClick={() => { setStep(id); setActive(null); }} className={cn("flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px]", step === id ? "border-lp-sky/60 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white")}>
                      {id}<span className={cn("rounded px-1 text-[11px] font-semibold", step === id ? "bg-lp-sky/25 text-white" : "bg-lp-raised text-lp-soft")}>{r?.error ? "–" : r?.level ?? "…"}</span>
                    </button>
                  );
                })}
                <button type="button" onClick={() => setStep("overall")} className={cn("flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px]", step === "overall" ? "border-lp-sky/60 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white")}>
                  <Lightbulb className="h-3.5 w-3.5" /> Overall
                </button>
              </div>
              {step === "overall" ? <Overall review={review} /> : <StrandCard key={step} r={review.strands[step]} located={all.located} active={active} onShow={setActive} onRetry={onRetry ? () => onRetry(step) : undefined} />}
              <div className="mt-3 flex justify-between">
                <button type="button" onClick={() => go(-1)} disabled={idx === 0} className="flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:text-white disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Previous</button>
                <button type="button" onClick={() => go(1)} disabled={step === "overall"} className="flex h-9 items-center gap-1.5 rounded-xl bg-lp-blue px-3.5 text-[13px] font-medium text-white disabled:opacity-40">
                  {idx === STRAND_IDS.length - 1 ? "Overall" : `Next: ${STRAND_IDS[idx + 1] ?? ""}`} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
          {tab === "integrity" && <IntegrityPanel review={review} located={all.located} active={active} onShow={setActive} />}
          {tab === "format" && <FormatPanel review={review} />}
        </div>
      </div>
    </div>
  );
};
