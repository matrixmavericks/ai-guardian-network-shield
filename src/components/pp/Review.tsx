import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpenCheck, Check, ChevronDown, CircleHelp, CircleSlash, Compass, Fingerprint, Info, Lightbulb, ListChecks,
  Loader2, MessageCircleQuestion, MessageSquareQuote, Minus, RotateCcw, Search, Send, ShieldCheck, Sparkles, Target, Trophy, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PP_CRITERIA, PP_FORMAT, PP_STRANDS, bandOf, strandById, type Band, type PPCriterionId, type PPStrandId } from "@/lib/personalProject";
import { askTutor, type Annotation, type Review, type StrandResult } from "./analyze";
import { DocViewer, TONE_LABEL, TONE_SOLID, type Tone, type ViewMark } from "./DocViewer";

const BANDS: Band[] = ["7-8", "5-6", "3-4", "1-2"];
const STRAND_IDS = PP_STRANDS.map((s) => s.id);
const card = "rounded-2xl border border-lp-line bg-lp-surface";
type Tab = "feedback" | "overview" | "integrity" | "format" | "ask";

/* ---------- small pieces ---------- */

const LevelPips: React.FC<{ level: number }> = ({ level }) => (
  <div className="flex gap-[3px]" aria-hidden>
    {Array.from({ length: 8 }, (_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < level ? "bg-lp-sky" : "bg-lp-line")} />)}
  </div>
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

const Section: React.FC<{ icon: React.ElementType; title: string; tone?: string; children: React.ReactNode }> = ({ icon: Icon, title, tone = "text-lp-sky", children }) => (
  <div className="mt-5">
    <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-white"><Icon className={cn("h-4 w-4", tone)} /> {title}</p>
    {children}
  </div>
);

const toneOf = (t: Annotation["type"]): Tone => (t === "strength" ? "strength" : t === "weakness" ? "weakness" : t === "missing" ? "missing" : "suggestion");

/* ---------- score strip ---------- */

const ScoreStrip: React.FC<{ review: Review; previous?: Review | null; onPick: (id: PPStrandId) => void }> = ({ review, previous, onPick }) => (
  <div className="grid gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_190px]">
    {(Object.keys(PP_CRITERIA) as PPCriterionId[]).map((c) => {
      const missing = review.incomplete?.includes(c);
      const delta = previous && !missing && !previous.incomplete?.includes(c) ? review.criteria[c] - previous.criteria[c] : 0;
      return (
        <div key={c} className={cn(card, "p-4")}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[12.5px] text-lp-mute">Criterion {c} · {PP_CRITERIA[c].name}</p>
            {delta !== 0 && <span className={cn("shrink-0 text-[11.5px] font-medium", delta > 0 ? "text-lp-green" : "text-amber-400")}>{delta > 0 ? `+${delta}` : delta} vs last</span>}
          </div>
          <p className="mt-1 text-[28px] font-semibold leading-none tracking-[-0.02em] text-white">{missing ? "–" : review.criteria[c]}<span className="text-[15px] font-normal text-lp-mute">/8</span></p>
          <div className="mt-3"><LevelPips level={missing ? 0 : review.criteria[c]} /></div>
          {missing && <p className="mt-2 text-[11.5px] text-amber-400">A strand wasn't graded: try it again to score this criterion.</p>}
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
      {previous && !review.incomplete?.length && !previous.incomplete?.length && review.total !== previous.total && (
        <p className="mt-1 text-[12px] text-white/85">{review.total > previous.total ? "▲" : "▼"} {Math.abs(review.total - previous.total)} since your last draft</p>
      )}
      <p className="mt-2 text-[11px] leading-snug text-white/70">Your supervisor marks the real report and the IB moderates.</p>
    </div>
  </div>
);

/* ---------- strand ---------- */

const BandLadder: React.FC<{ strand: PPStrandId; level: number }> = ({ strand, level }) => {
  const s = strandById(strand);
  const now = bandOf(level);
  const next = now === "7-8" ? null : now === null ? "1-2" : BANDS[BANDS.indexOf(now) - 1];
  return (
    <div className="space-y-1.5">
      {BANDS.map((b) => (
        <div key={b} className={cn("flex gap-3 rounded-xl border px-3 py-2", b === now ? "border-lp-sky/60 bg-lp-blue/15" : b === next ? "border-dashed border-lp-sky/40" : "border-lp-line opacity-70")}>
          <span className={cn("w-9 shrink-0 pt-0.5 text-[12px] font-semibold tabular-nums", b === now ? "text-lp-sky" : "text-lp-mute")}>{b}</span>
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-lp-soft">The student {s.bands[b]}.</p>
          {b === now && <span className="shrink-0 self-start rounded-full bg-lp-sky/20 px-2 py-0.5 text-[10.5px] font-medium text-lp-sky">You</span>}
          {b === next && <span className="shrink-0 self-start rounded-full border border-lp-sky/40 px-2 py-0.5 text-[10.5px] font-medium text-lp-sky">Next</span>}
        </div>
      ))}
    </div>
  );
};

const STATUS = {
  met: { icon: Check, cls: "text-emerald-400", label: "Met" },
  partly: { icon: Minus, cls: "text-amber-400", label: "Partly" },
  missing: { icon: CircleSlash, cls: "text-rose-400", label: "Missing" },
} as const;

const NoteItem: React.FC<{ mark: ViewMark; a: Annotation; placed: boolean; active: boolean; onShow: () => void; onExplain: () => void }> = ({ mark, a, placed, active, onShow, onExplain }) => (
  <li id={`note-${mark.id}`} className={cn("rounded-xl border p-3 transition-colors", active ? "border-lp-sky/60 bg-lp-blue/10" : "border-lp-line bg-lp-deep/30")}>
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: TONE_SOLID[mark.tone] }}>{mark.label}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium" style={{ color: TONE_SOLID[mark.tone] }}>{TONE_LABEL[mark.tone]}{a.descriptor ? ` · “${a.descriptor}”` : ""}{a.page ? ` · p. ${a.page}` : ""}</p>
        {a.quote && (
          <button type="button" disabled={!placed} onClick={onShow} className="mt-1 block text-left text-[13px] italic leading-snug text-white/90 enabled:hover:underline disabled:cursor-default">“{a.quote}”</button>
        )}
        <p className="mt-1 text-[13px] leading-relaxed text-lp-soft">{a.comment}</p>
        {a.fix && <p className="mt-1 text-[13px] leading-relaxed text-lp-soft"><span className="font-medium text-lp-sky">What to do: </span>{a.fix}</p>}
        <div className="mt-1.5 flex flex-wrap gap-3 text-[12px]">
          {a.quote && placed && <button type="button" onClick={onShow} className="text-lp-sky hover:underline">Show in document</button>}
          {a.quote && !placed && <span className="text-lp-mute">Not found in the document</span>}
          <button type="button" onClick={onExplain} className="inline-flex items-center gap-1 text-lp-sky hover:underline"><MessageCircleQuestion className="h-3.5 w-3.5" /> Explain this</button>
        </div>
      </div>
    </div>
  </li>
);

const StrandPanel: React.FC<{
  r: StrandResult | undefined; marks: ViewMark[]; placed: Set<string>; active: string | null; onShow: (id: string) => void;
  onExplain: (focus: string, question: string) => void; onRetry?: () => Promise<void>;
}> = ({ r, marks, placed, active, onShow, onExplain, onRetry }) => {
  const [retrying, setRetrying] = useState(false);
  if (!r) return <div className={cn(card, "p-6 text-[14px] text-lp-mute")}>Waiting for this strand…</div>;
  const s = strandById(r.strand);
  const explainNote = (m: ViewMark, a: Annotation) =>
    onExplain(`Note ${m.label} on ${s.id} (${s.label}): ${TONE_LABEL[m.tone]}. ${a.quote ? `Quote: "${a.quote}". ` : ""}Comment: ${a.comment} ${a.fix ? `What to do: ${a.fix}` : ""}`, "I don't fully understand this note. Can you explain what it means and what I should do, with an example from a different project?");
  return (
    <div className={cn(card, "p-5")}>
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-lp-sky">Criterion {s.criterion} · strand {s.id.slice(1)}</p>
      <h3 className="mt-1 text-[20px] font-semibold tracking-[-0.01em] text-white">{s.label}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-lp-mute">{s.objective}</p>
      {r.error ? (
        <div className="mt-4 rounded-xl border border-lp-red/40 bg-lp-red/10 p-3">
          <p className="text-[13px] text-lp-red">This strand couldn't be graded: {r.error}</p>
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
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                {r.commandTerm && <span className="rounded-full border border-lp-line px-2 py-0.5 text-lp-soft">Your writing {r.commandTerm.toLowerCase().replace(/^(state|outline|describe|explain|evaluate)$/, "$1s")}</span>}
                {r.weak && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">Only just at this level</span>}
                <span className="rounded-full border border-lp-line px-2 py-0.5 text-lp-mute">Confidence: {r.confidence}</span>
              </div>
            </div>
          </div>
          <div className="mt-4"><BandLadder strand={s.id} level={r.level} /></div>

          {(r.whyThisLevel || r.whyNotHigher || r.whyNotLower) && (
            <div className="mt-4 grid gap-2">
              {r.whyThisLevel && <div className="rounded-xl border border-lp-line p-3"><p className="text-[12px] font-medium text-lp-sky">Why {r.level}</p><p className="mt-0.5 text-[13px] leading-relaxed text-lp-soft">{r.whyThisLevel}</p></div>}
              {r.whyNotHigher && r.level < 8 && <div className="rounded-xl border border-lp-line p-3"><p className="text-[12px] font-medium text-amber-300">Why not {r.level + 1}</p><p className="mt-0.5 text-[13px] leading-relaxed text-lp-soft">{r.whyNotHigher}</p></div>}
              {r.whyNotLower && r.level > 1 && <div className="rounded-xl border border-lp-line p-3"><p className="text-[12px] font-medium text-emerald-300">Why not {r.level - 1}</p><p className="mt-0.5 text-[13px] leading-relaxed text-lp-soft">{r.whyNotLower}</p></div>}
            </div>
          )}

          {r.elements.length > 0 && (
            <Section icon={ListChecks} title="Checked against each part of the descriptor">
              <ul className="space-y-1.5">
                {r.elements.map((e, i) => {
                  const st = STATUS[e.status];
                  return (
                    <li key={i} className="flex gap-2.5 rounded-xl border border-lp-line p-2.5">
                      <st.icon className={cn("mt-0.5 h-4 w-4 shrink-0", st.cls)} aria-label={st.label} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-white">{e.element}</p>
                        {e.comment && <p className="mt-0.5 text-[12.5px] leading-relaxed text-lp-soft">{e.comment}</p>}
                        {e.quote && <p className="mt-0.5 text-[12px] italic text-lp-mute">“{e.quote}”{e.page ? ` (p. ${e.page})` : ""}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {r.annotations.length > 0 && (
            <Section icon={MessageSquareQuote} title={`Notes on your report (${r.annotations.length})`}>
              <ul className="space-y-2">
                {r.annotations.map((a, i) => {
                  const m = marks.find((x) => x.id === `${s.id}-a${i}`)!;
                  return <NoteItem key={i} mark={m} a={a} placed={placed.has(m.id)} active={active === m.id} onShow={() => onShow(m.id)} onExplain={() => explainNote(m, a)} />;
                })}
              </ul>
            </Section>
          )}

          {r.nextBand && r.nextBand.steps.length > 0 && (
            <div className="mt-5 rounded-xl border border-lp-sky/30 bg-lp-blue/10 p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-medium text-white"><Target className="h-4 w-4 text-lp-sky" /> To reach {r.nextBand.band || "the next band"}</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-lp-soft">{r.nextBand.steps.map((t) => <li key={t}>{t}</li>)}</ol>
            </div>
          )}
          {r.topBand && (
            <div className="mt-3 rounded-xl border border-lp-line p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-medium text-white"><Trophy className="h-4 w-4 text-amber-300" /> What a 7–8 {s.id} contains</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-lp-soft">{r.topBand}</p>
            </div>
          )}
          {r.questions.length > 0 && (
            <div className="mt-3 rounded-xl border border-lp-line p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-medium text-white"><CircleHelp className="h-4 w-4 text-lp-sky" /> Ask yourself</p>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-lp-soft">{r.questions.map((q) => <li key={q}>• {q}</li>)}</ul>
            </div>
          )}
          <button
            type="button"
            onClick={() => onExplain(`Strand ${s.id} (${s.label}), level ${r.level}. ${r.summary} Why not higher: ${r.whyNotHigher ?? ""}`, `Can you explain my ${s.id} feedback in simple words and tell me the first thing to fix?`)}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-lp-line text-[13px] text-lp-sky hover:border-lp-blue/50"
          >
            <MessageCircleQuestion className="h-4 w-4" /> Ask Refyn about {s.id}
          </button>
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

/* ---------- overview ---------- */

const Tick: React.FC<{ v: boolean | string | undefined }> = ({ v }) =>
  v === true || v === "yes" ? <Check className="mx-auto h-4 w-4 text-emerald-400" aria-label="Yes" /> : v === "partly" ? <Minus className="mx-auto h-4 w-4 text-amber-400" aria-label="Partly" /> : <X className="mx-auto h-4 w-4 text-rose-400" aria-label="No" />;

const OverviewPanel: React.FC<{ review: Review; onStrand: (id: PPStrandId) => void }> = ({ review, onStrand }) => {
  const o = review.overview;
  const m = review.map;
  const criteria = m?.successCriteria ?? [];
  return (
    <div className="space-y-4">
      <div className={cn(card, "p-5")}>
        <p className="flex items-center gap-2 text-[15px] font-medium text-white"><Compass className="h-4 w-4 text-lp-sky" /> Examiner's overview</p>
        {o?.error ? <p className="mt-2 text-[13px] text-lp-red">{o.error}</p> : (
          <>
            {o?.headline && <p className="mt-2 text-[15px] leading-relaxed text-white">{o.headline}</p>}
            {o?.examinerNote && <p className="mt-2 text-[13.5px] leading-relaxed text-lp-soft">{o.examinerNote}</p>}
          </>
        )}
      </div>

      {!!o?.priorities.length && (
        <div className={cn(card, "p-5")}>
          <p className="flex items-center gap-2 text-[15px] font-medium text-white"><Target className="h-4 w-4 text-lp-sky" /> Fix these first (most marks for your effort)</p>
          <ol className="mt-3 space-y-2">
            {o.priorities.map((p, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-lp-line p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lp-blue/20 text-[12px] font-semibold text-lp-sky">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13.5px] font-medium text-white">{p.title}</p>
                    {STRAND_IDS.includes(p.strand as PPStrandId) && <button type="button" onClick={() => onStrand(p.strand as PPStrandId)} className="rounded-md border border-lp-line px-1.5 text-[11px] text-lp-sky hover:border-lp-blue/50">{p.strand}</button>}
                    {p.gain && <span className="text-[11.5px] text-emerald-300">{p.gain}</span>}
                  </div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-lp-soft">{p.action}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(!!o?.strengths.length || !!o?.consistency.length) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {!!o?.strengths.length && (
            <div className={cn(card, "p-5")}>
              <p className="flex items-center gap-2 text-[14px] font-medium text-white"><Sparkles className="h-4 w-4 text-emerald-300" /> Strengths</p>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-lp-soft">{o.strengths.map((s) => <li key={s}>• {s}</li>)}</ul>
            </div>
          )}
          {!!o?.consistency.length && (
            <div className={cn(card, "p-5")}>
              <p className="flex items-center gap-2 text-[14px] font-medium text-white"><AlertTriangle className="h-4 w-4 text-amber-300" /> Joined-up thinking</p>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-lp-soft">{o.consistency.map((c) => <li key={c.issue}>• {c.issue}{c.strands.length ? <span className="text-lp-mute"> ({c.strands.join(", ")})</span> : null}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {criteria.length > 0 && (
        <div className={cn(card, "p-5")}>
          <p className="flex items-center gap-2 text-[15px] font-medium text-white"><ListChecks className="h-4 w-4 text-lp-sky" /> Your success criteria, followed through</p>
          <p className="mt-1 text-[12.5px] text-lp-mute">Each criterion from Aii should be detailed and justified, planned for in Aiii, and evaluated with evidence in Cii.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-[12.5px]">
              <thead>
                <tr className="text-lp-mute">
                  {["Criterion", "Detailed", "Justified", "About the product", "In the plan", "Evaluated", "Evidence"].map((h) => <th key={h} className="px-2 py-1.5 text-left font-medium first:pl-0">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-lp-line">
                {criteria.map((c, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-2 text-white">{c.name}{c.page ? <span className="text-lp-mute"> · p. {c.page}</span> : null}</td>
                    <td className="px-2"><Tick v={c.detailed} /></td>
                    <td className="px-2"><Tick v={c.justified} /></td>
                    <td className="px-2"><Tick v={c.isProductQuality} /></td>
                    <td className="px-2"><Tick v={c.inPlan} /></td>
                    <td className="px-2"><Tick v={c.evaluated} /></td>
                    <td className="px-2"><Tick v={c.evaluationEvidence} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {m && !m.error && (
        <div className={cn(card, "p-5")}>
          <p className="flex items-center gap-2 text-[15px] font-medium text-white"><Lightbulb className="h-4 w-4 text-lp-sky" /> Your report at a glance</p>
          <dl className="mt-3 space-y-2.5 text-[13px]">
            {[
              ["Learning goal", m.learningGoal?.summary, m.learningGoal?.isAboutLearning === false ? "Reads like making the product, not learning" : null, m.learningGoal?.page],
              ["Personal interest", m.personalInterest?.summary, null, m.personalInterest?.page],
              ["Product", m.product?.summary, null, m.product?.page],
              ["Impact", m.impact?.summary, m.impact?.isMoreThanGoal === false ? "Mostly repeats the learning goal" : null, m.impact?.page],
            ].map(([k, v, warn, pg]) => (
              <div key={k as string} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                <dt className="text-lp-mute">{k as string}</dt>
                <dd className="text-lp-soft">{(v as string) || <span className="text-rose-300">Not found</span>}{pg ? <span className="text-lp-mute"> · p. {pg as number}</span> : null}{warn ? <span className="mt-0.5 block text-amber-300">{warn as string}</span> : null}</dd>
              </div>
            ))}
          </dl>
          {(!!m.atlForGoal?.length || !!m.atlForProduct?.length) && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[460px] text-[12.5px]">
                <thead><tr className="text-lp-mute">{["ATL skill", "Cluster", "For", "How far", "Evidence"].map((h) => <th key={h} className="px-2 py-1.5 text-left font-medium first:pl-0">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-lp-line">
                  {[...(m.atlForGoal ?? []).map((a) => ({ ...a, for: "Learning goal (Bi)" })), ...(m.atlForProduct ?? []).map((a) => ({ ...a, for: "Product (Bii)" }))].map((a, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-2 text-white">{a.skill}</td>
                      <td className="px-2 text-lp-soft">{a.cluster}</td>
                      <td className="px-2 text-lp-soft">{a.for}</td>
                      <td className={cn("px-2", a.how === "explained" ? "text-emerald-300" : a.how === "described" ? "text-amber-300" : "text-rose-300")}>{a.how}</td>
                      <td className="px-2"><Tick v={a.evidence} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {m.biBiiSeparated === false && <p className="mt-2 text-[12.5px] text-amber-300">Skills for the learning goal and the product aren't clearly separated. Examiners need Bi and Bii apart.</p>}
            </div>
          )}
        </div>
      )}

      <div className={cn(card, "p-5")}>
        <p className="text-[15px] font-medium text-white">How the criterion levels are decided</p>
        <p className="mt-1 text-[13px] leading-relaxed text-lp-mute">Like IB examiners, Refyn grades each strand first, then picks the level that best fits the criterion as a whole. Every strand counts equally. Between two levels the work gets the higher one, unless a strand only just fits its level.</p>
        <div className="mt-3 space-y-2">
          {(Object.keys(PP_CRITERIA) as PPCriterionId[]).map((c) => (
            <div key={c} className="flex items-center justify-between gap-3 rounded-xl border border-lp-line p-3">
              <p className="text-[13px] text-lp-soft"><span className="font-medium text-white">{c} {PP_CRITERIA[c].name}:</span> {PP_CRITERIA[c].strands.map((id) => { const r = review.strands[id]; return `${id} ${r?.error ? "–" : `${r?.level ?? "?"}${r?.weak ? " (only just)" : ""}`}`; }).join(" · ")}</p>
              <p className="shrink-0 text-[14px] font-semibold text-lp-sky">{review.incomplete?.includes(c) ? "–" : review.criteria[c]}/8</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ---------- integrity ---------- */

const googleExact = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(`"${q.split(/\s+/).slice(0, 14).join(" ")}"`)}`;

const QuoteRow: React.FC<{ id: string; label: string; quote: string; text: string; placed: Set<string>; active: string | null; onShow: (id: string) => void }> = ({ id, label, quote, text, placed, active, onShow }) => (
  <li id={`note-${id}`} className={cn("list-none rounded-xl border p-3", active === id ? "border-lp-sky/60 bg-lp-blue/10" : "border-lp-line bg-lp-deep/30")}>
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-lp-raised px-1 text-[10px] font-bold text-white">{label}</span>
      <div className="min-w-0">
        <button type="button" disabled={!placed.has(id)} onClick={() => onShow(id)} className="text-left text-[13px] italic text-white/90 enabled:hover:underline">“{quote}”</button>
        <p className="mt-1 text-[13px] leading-relaxed text-lp-soft">{text}</p>
      </div>
    </div>
  </li>
);

const IntegrityPanel: React.FC<{ review: Review; placed: Set<string>; active: string | null; onShow: (id: string) => void }> = ({ review, placed, active, onShow }) => {
  const i = review.integrity;
  const w = review.writing;
  const sim = review.similarity;
  const signals = i?.authenticity.signals ?? "some";
  const row = { placed, active, onShow };
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
        {i && i.authenticity.passages.length > 0 && <ul className="mt-3 space-y-2">{i.authenticity.passages.map((p, k) => <QuoteRow key={k} id={`voice-${k}`} label={`V${k + 1}`} quote={p.quote} text={`${p.why}${p.fix ? ` ${p.fix}` : ""}`} {...row} />)}</ul>}
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
        {w.stock.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{w.stock.map((s) => <span key={s.phrase} className="rounded-full border border-lp-line px-2.5 py-0.5 text-[12px] text-lp-soft">“{s.phrase.replace(/,$/, "")}” ×{s.count}</span>)}</div>}
        <p className="mt-2 text-[11.5px] text-lp-mute">Per 1,000 words for voice and details. Writing habits to look at, not evidence of anything.</p>
      </div>
      <div className={cn(card, "p-5")}>
        <p className="flex items-center gap-2 text-[15px] font-medium text-white"><MessageSquareQuote className="h-4 w-4 text-lp-sky" /> Referencing</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
          <span className={cn("rounded-full px-2.5 py-0.5", i?.citations.hasBibliography ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300")}>{i?.citations.hasBibliography ? "Bibliography found" : "No bibliography found"}</span>
          <span className={cn("rounded-full px-2.5 py-0.5", i?.citations.inTextCitations ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300")}>{i?.citations.inTextCitations ? "In-text citations used" : "No in-text citations"}</span>
        </div>
        {i?.citations.summary && <p className="mt-2 text-[13.5px] leading-relaxed text-lp-soft">{i.citations.summary}</p>}
        {i && i.citations.issues.length > 0 && <ul className="mt-3 space-y-2">{i.citations.issues.map((c, k) => <QuoteRow key={k} id={`cite-${k}`} label={`R${k + 1}`} quote={c.quote} text={c.issue} {...row} />)}</ul>}
      </div>
      <div className={cn(card, "p-5")}>
        <p className="flex items-center gap-2 text-[15px] font-medium text-white"><Search className="h-4 w-4 text-lp-sky" /> Check against your sources</p>
        <p className="mt-1 text-[13px] leading-relaxed text-lp-mute">These read as if they could come from a source. Check each: quote it and cite it, or put it in your own words.</p>
        {i && i.checkSources.length > 0 ? (
          <div className="mt-3 space-y-2">
            {i.checkSources.map((c, k) => (
              <div key={k}>
                <QuoteRow id={`src-${k}`} label={`S${k + 1}`} quote={c.quote} text={c.why} {...row} />
                <a href={googleExact(c.quote)} target="_blank" rel="noreferrer" className="ml-3 mt-1 inline-flex items-center gap-1 text-[12.5px] text-lp-sky hover:underline"><Search className="h-3.5 w-3.5" /> Search this sentence online</a>
              </div>
            ))}
          </div>
        ) : <p className="mt-2 text-[13px] text-lp-soft">Nothing stood out.</p>}
      </div>
      <div className={cn(card, "p-5")}>
        <p className="flex items-center gap-2 text-[15px] font-medium text-white"><Fingerprint className="h-4 w-4 text-lp-sky" /> Similarity with other reports at your school</p>
        {!sim ? <p className="mt-2 text-[13px] text-lp-mute">You chose not to compare this draft.</p>
          : sim.error ? <p className="mt-2 text-[13px] text-lp-red">{sim.error}</p>
          : sim.note ? <p className="mt-2 text-[13px] text-lp-soft">{sim.note}</p>
          : sim.matches.length ? (
            <div className="mt-3 space-y-2">
              {sim.matches.map((m, k) => (
                <div key={k} className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                  <div className="flex items-center justify-between text-[13px]"><span className="text-white">Another student's report</span><span className="font-semibold text-amber-300">{Math.round(m.overlap * 100)}% shared phrasing</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lp-line"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, m.overlap * 100)}%` }} /></div>
                  <p className="mt-1.5 text-[12px] text-lp-mute">{m.shared} identical 8-word phrases. Shared school template text is left out. Talk to your supervisor if this surprises you.</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-2 text-[13.5px] text-lp-soft">No meaningful overlap with {sim.compared} other report{sim.compared === 1 ? "" : "s"} at your school{sim.template ? ` (${sim.template} shared template phrases ignored)` : ""}.</p>}
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

/* ---------- tutor ---------- */

const STARTERS = [
  "What should I fix first to raise my score the most?",
  "What's the difference between 'describe' and 'explain' in my report?",
  "Why is my Cii evaluation not higher?",
  "How do I show my success criteria are appropriate?",
];

const AskPanel: React.FC<{ review: Review; focus: { text: string; label: string } | null; draft: string; setDraft: (s: string) => void; clearFocus: () => void; onUpdate: (r: Review) => void }> = ({ review, focus, draft, setDraft, clearFocus, onUpdate }) => {
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const chat = review.chat ?? [];
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [chat.length, busy]);
  const send = async (q: string) => {
    if (!q.trim() || busy) return;
    setBusy(true);
    setDraft("");
    try {
      onUpdate(await askTutor(review, q.trim(), focus?.text));
    } catch (e) {
      toast.error((e as Error).message);
      setDraft(q);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={cn(card, "flex min-h-[420px] flex-col p-4")}>
      <p className="flex items-center gap-2 text-[15px] font-medium text-white"><MessageCircleQuestion className="h-4 w-4 text-lp-sky" /> Ask Refyn about your feedback</p>
      <p className="mt-1 text-[12.5px] text-lp-mute">Ask about anything you don't understand. Refyn explains and helps you plan, but won't write your report: it has to be your own work.</p>
      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto">
        {!chat.length && !busy && (
          <div className="flex flex-wrap gap-1.5">
            {STARTERS.map((s) => <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-lp-line px-3 py-1.5 text-left text-[12.5px] text-lp-soft hover:border-lp-blue/50 hover:text-white">{s}</button>)}
          </div>
        )}
        {chat.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-8 rounded-2xl rounded-br-md bg-lp-blue px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white">{m.content}</div>
          ) : (
            <div key={i} className="lp-md mr-4 rounded-2xl rounded-bl-md border border-lp-line bg-lp-deep/40 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-lp-soft">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
            </div>
          ),
        )}
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
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }}
          rows={2}
          placeholder="e.g. What does 'appropriate success criteria' actually mean?"
          className="min-w-0 flex-1 resize-none rounded-xl border border-lp-line bg-lp-deep/60 px-3 py-2 text-[13.5px] text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60"
        />
        <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lp-blue text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
};

/* ---------- the review ---------- */

export const ReviewView: React.FC<{
  review: Review; previous?: Review | null; file: Blob | null; onBack: () => void; onRetry?: (id: PPStrandId) => Promise<void>; onUpdate: (r: Review) => void;
}> = ({ review, previous, file, onBack, onRetry, onUpdate }) => {
  const [tab, setTab] = useState<Tab>("feedback");
  const [step, setStep] = useState<PPStrandId>("Ai");
  const [active, setActive] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<{ text: string; label: string } | null>(null);
  const [draft, setDraft] = useState("");
  const panel = useRef<HTMLDivElement>(null);

  // Every note as a mark on the document
  const strandMarks = useMemo(() => {
    const out: ViewMark[] = [];
    for (const id of STRAND_IDS) {
      review.strands[id]?.annotations?.forEach((a, i) => {
        out.push({ id: `${id}-a${i}`, quote: a.quote, page: a.page, tone: toneOf(a.type), label: tab === "feedback" ? String(i + 1) : `${id}·${i + 1}`, title: `${id} ${strandById(id).label}`, note: a.comment, fix: a.fix });
      });
    }
    return out;
  }, [review, tab]);
  const integrityMarks = useMemo(() => {
    const i = review.integrity;
    if (!i) return [] as ViewMark[];
    return [
      ...i.authenticity.passages.map((p, k) => ({ id: `voice-${k}`, quote: p.quote, page: p.page, tone: "voice" as Tone, label: `V${k + 1}`, title: "Your own voice", note: p.why, fix: p.fix })),
      ...i.citations.issues.map((c, k) => ({ id: `cite-${k}`, quote: c.quote, page: c.page, tone: "source" as Tone, label: `R${k + 1}`, title: "Referencing", note: c.issue })),
      ...i.checkSources.map((c, k) => ({ id: `src-${k}`, quote: c.quote, page: c.page, tone: "source" as Tone, label: `S${k + 1}`, title: "Check against sources", note: c.why })),
    ];
  }, [review]);
  const marks = useMemo(
    () => (tab === "feedback" ? strandMarks.filter((m) => m.id.startsWith(`${step}-`)) : tab === "integrity" ? integrityMarks : strandMarks),
    [tab, step, strandMarks, integrityMarks],
  );

  const onPlaced = useCallback((ids: Set<string>) => {
    setPlaced((prev) => (prev.size === ids.size && [...ids].every((x) => prev.has(x)) ? prev : ids));
  }, []);
  const pick = useCallback((id: string | null) => {
    setActive(id);
    if (!id) return;
    const [head] = id.split("-");
    if (STRAND_IDS.includes(head as PPStrandId) && tab !== "overview") {
      setTab("feedback");
      setStep(head as PPStrandId);
    }
    window.setTimeout(() => document.getElementById(`note-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  }, [tab]);
  const explain = (text: string, question: string) => {
    setFocus({ text, label: text.slice(0, 90) });
    setDraft(question);
    setTab("ask");
    panel.current?.scrollTo({ top: 0 });
  };
  const explainMark = (m: ViewMark) => explain(`Note ${m.label} (${m.title}): ${TONE_LABEL[m.tone]}. ${m.quote ? `Quote: "${m.quote}". ` : ""}Comment: ${m.note} ${m.fix ? `What to do: ${m.fix}` : ""}`, "I don't fully understand this note. Can you explain what it means and what I should do, with an example from a different project?");
  const idx = STRAND_IDS.indexOf(step);
  const kind = file && review.fileType ? review.fileType : "text";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="flex h-9 items-center gap-2 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:text-white"><ArrowLeft className="h-4 w-4" /> All drafts</button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-white">{review.title}</p>
          <p className="text-[12px] text-lp-mute">{new Date(review.createdAt).toLocaleString()} · {review.words.toLocaleString()} words{review.pages ? ` · ${review.pages} pages` : ""}</p>
        </div>
      </div>
      <ScoreStrip review={review} previous={previous} onPick={(id) => { setTab("feedback"); setStep(id); setActive(null); }} />

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
        <div className="order-2 h-[75vh] min-w-0 lg:sticky lg:top-4 lg:order-1 lg:h-[calc(100vh-140px)]">
          <DocViewer kind={kind} blob={file} text={review.text} marks={marks} active={active} onPick={pick} onExplain={explainMark} onPlaced={onPlaced} />
        </div>
        <div ref={panel} className="order-1 min-w-0 lg:order-2 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto lg:pr-1">
          <div className="sticky top-0 z-10 -mx-1 mb-3 bg-lp-bg/95 px-1 pb-2 backdrop-blur">
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-lp-line bg-lp-surface/60 p-1 text-[12.5px]">
              {([["feedback", "Feedback"], ["overview", "Overview"], ["integrity", "Integrity"], ["format", "Format"], ["ask", "Ask Refyn"]] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => { setTab(k); setActive(null); }} className={cn("flex-1 shrink-0 rounded-lg px-3 py-1.5", tab === k ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>{label}</button>
              ))}
            </div>
            {tab === "feedback" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {STRAND_IDS.map((id) => {
                  const r = review.strands[id];
                  return (
                    <button key={id} type="button" onClick={() => { setStep(id); setActive(null); }} className={cn("flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px]", step === id ? "border-lp-sky/60 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white")}>
                      {id}<span className={cn("rounded px-1 text-[11px] font-semibold", step === id ? "bg-lp-sky/25 text-white" : "bg-lp-raised text-lp-soft")}>{r?.error ? "–" : r?.level ?? "…"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {tab === "feedback" && (
            <>
              <StrandPanel key={step} r={review.strands[step]} marks={strandMarks} placed={placed} active={active} onShow={pick} onExplain={explain} onRetry={onRetry ? () => onRetry(step) : undefined} />
              <div className="mt-3 flex justify-between">
                <button type="button" onClick={() => { setStep(STRAND_IDS[Math.max(0, idx - 1)]); setActive(null); }} disabled={idx === 0} className="flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:text-white disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Previous</button>
                {idx < STRAND_IDS.length - 1 ? (
                  <button type="button" onClick={() => { setStep(STRAND_IDS[idx + 1]); setActive(null); }} className="flex h-9 items-center gap-1.5 rounded-xl bg-lp-blue px-3.5 text-[13px] font-medium text-white">Next: {STRAND_IDS[idx + 1]} <ArrowRight className="h-4 w-4" /></button>
                ) : (
                  <button type="button" onClick={() => setTab("overview")} className="flex h-9 items-center gap-1.5 rounded-xl bg-lp-blue px-3.5 text-[13px] font-medium text-white">Overview <ArrowRight className="h-4 w-4" /></button>
                )}
              </div>
            </>
          )}
          {tab === "overview" && <OverviewPanel review={review} onStrand={(id) => { setTab("feedback"); setStep(id); }} />}
          {tab === "integrity" && <IntegrityPanel review={review} placed={placed} active={active} onShow={pick} />}
          {tab === "format" && <FormatPanel review={review} />}
          {tab === "ask" && <AskPanel review={review} focus={focus} draft={draft} setDraft={setDraft} clearFocus={() => setFocus(null)} onUpdate={onUpdate} />}
        </div>
      </div>
    </div>
  );
};
