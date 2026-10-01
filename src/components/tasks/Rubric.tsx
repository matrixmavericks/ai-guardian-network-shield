import React, { useMemo, useState } from "react";
import { BookOpenText, ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMAND_TERMS, GRADE_BOUNDARIES, MYP, type Letter } from "@/lib/myp";
import type { Assessment } from "@/components/criteria/engine";
import { BANDS, BAND_PLAIN, type Band, type CustomRubric, type MypRubric, type Rubric } from "./task";

const bandOf = (level: number): Band | null => (level >= 7 ? "7-8" : level >= 5 ? "5-6" : level >= 3 ? "3-4" : level >= 1 ? "1-2" : null);

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi"];
const BAND_TONE: Record<Band, string> = {
  "7-8": "border-emerald-500/40 bg-emerald-500/[0.07]",
  "5-6": "border-sky-500/40 bg-sky-500/[0.07]",
  "3-4": "border-amber-500/40 bg-amber-500/[0.07]",
  "1-2": "border-rose-500/40 bg-rose-500/[0.07]",
};
const BAND_INK: Record<Band, string> = { "7-8": "text-emerald-300", "5-6": "text-sky-300", "3-4": "text-amber-300", "1-2": "text-rose-300" };

/** Command terms that appear in a piece of text, with what they ask for. */
const termsIn = (text: string) => {
  const lower = text.toLowerCase();
  return Object.entries(COMMAND_TERMS).filter(([t]) => new RegExp(`\\b${t}(s|es|d|ed|ing)?\\b`).test(lower)).slice(0, 8);
};

const MypCriterionCard: React.FC<{ r: MypRubric; l: Letter; mark?: { level: number; comment?: string } }> = ({ r, l, mark }) => {
  const c = MYP[r.group].criteria[l];
  const yours = mark ? bandOf(mark.level) : null;
  const tsc = r.clarifications[l] ?? {};
  const terms = termsIn([...(c.strands ?? []), ...Object.values(tsc)].join(" "));
  return (
    <section id={`rubric-${l}`} className="scroll-mt-24 rounded-2xl border border-lp-line bg-lp-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lp-blue text-[17px] font-semibold text-white lp-keep">{l}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold text-white">{c.name}</h3>
          <p className="mt-0.5 text-[13px] leading-relaxed text-lp-soft">Assesses {c.focus}.</p>
        </div>
        {mark ? (
          <span className="lp-keep flex flex-col items-center rounded-xl bg-lp-blue px-3 py-1.5 text-white"><span className="text-[19px] font-semibold leading-none">{mark.level}</span><span className="text-[10.5px] text-white/80">your level</span></span>
        ) : (
          <span className="rounded-full border border-lp-line px-2.5 py-1 text-[12px] text-lp-soft">out of 8</span>
        )}
      </div>
      {mark?.comment && <p className="mt-3 rounded-xl border border-lp-sky/40 bg-lp-blue/10 px-3 py-2.5 text-[13.5px] leading-relaxed text-white"><span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-lp-sky">Your teacher</span>{mark.comment}</p>}

      {c.strands && (
        <div className="mt-4">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-lp-mute">What you need to show</p>
          <ol className="mt-1.5 space-y-1">
            {c.strands.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-white"><span className="w-6 shrink-0 text-lp-mute">{ROMAN[i]}.</span><span>{s.charAt(0).toUpperCase() + s.slice(1)}</span></li>
            ))}
          </ol>
          {r.year < 5 && <p className="mt-1.5 text-[12px] text-lp-mute">These are the year 5 goals. In MYP {r.year} you're expected to show the same skills at a simpler level, in more familiar situations.</p>}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {[...BANDS].reverse().map((b) => (
          <div key={b} className={cn("rounded-xl border p-3", BAND_TONE[b], mark && yours !== b && "opacity-55", yours === b && "ring-2 ring-lp-sky")}>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className={cn("text-[15px] font-semibold tabular-nums", BAND_INK[b])}>{b.replace("-", "–")}</span>
              <span className={cn("text-[12px] font-medium uppercase tracking-[0.1em]", BAND_INK[b])}>{BAND_PLAIN[b].label}</span>
              {yours === b && <span className="ml-auto rounded-full bg-lp-sky/20 px-2 py-0.5 text-[11px] font-semibold text-lp-sky">Your work: {mark!.level}</span>}
            </div>
            {tsc[b] ? (
              <>
                <p className="mt-1 text-[14px] leading-relaxed text-white"><span className="mr-1.5 rounded bg-lp-blue/25 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-lp-sky">In this task</span>{tsc[b]}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-lp-mute">{BAND_PLAIN[b].text}</p>
              </>
            ) : (
              <p className="mt-1 text-[13.5px] leading-relaxed text-lp-soft">{BAND_PLAIN[b].text}</p>
            )}
          </div>
        ))}
        <div className="rounded-xl border border-lp-line px-3 py-2 text-[12.5px] text-lp-mute"><span className="mr-2 font-semibold tabular-nums text-lp-soft">0</span>The work doesn't reach the 1–2 description.</div>
      </div>

      {terms.length > 0 && (
        <div className="mt-4">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-lp-mute">Command terms</p>
          <dl className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {terms.map(([t, d]) => (
              <div key={t} className="rounded-lg bg-lp-raised/60 px-2.5 py-1.5 text-[12.5px]"><dt className="inline font-semibold capitalize text-white">{t}: </dt><dd className="inline text-lp-soft">{d}</dd></div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
};

const MypRubricView: React.FC<{ r: MypRubric; assessment?: Assessment | null }> = ({ r, assessment }) => {
  const [bounds, setBounds] = useState(false);
  const max = r.criteria.length * 8;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-lp-line bg-lp-surface/60 p-3">
        <BookOpenText className="h-4 w-4 text-lp-sky" />
        <p className="min-w-0 flex-1 text-[13.5px] text-lp-soft">IB MYP {MYP[r.group].name} · year {r.year} · {r.criteria.length} {r.criteria.length === 1 ? "criterion" : "criteria"}, each out of 8 · total {max}</p>
        <div className="flex flex-wrap gap-1.5">
          {r.criteria.map((l) => <a key={l} href={`#rubric-${l}`} className="rounded-lg border border-lp-line px-2 py-1 text-[12px] text-lp-soft hover:border-lp-blue/50 hover:text-white">{l} · {MYP[r.group].criteria[l].name}</a>)}
        </div>
      </div>
      <p className="flex gap-2 rounded-xl bg-lp-blue/10 px-3 py-2.5 text-[12.5px] leading-relaxed text-lp-soft">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-lp-sky" />
        Your teacher uses best fit: they find the description your work matches most closely. The higher number in a band means you fully meet it; the lower means you only just do.
      </p>
      {r.notes && <p className="whitespace-pre-wrap rounded-xl border border-lp-line p-3 text-[13.5px] leading-relaxed text-white">{r.notes}</p>}
      {r.criteria.map((l) => <MypCriterionCard key={l} r={r} l={l} mark={typeof assessment?.levels[l] === "number" ? { level: assessment.levels[l]!, comment: assessment.comments[l] } : undefined} />)}
      {r.criteria.length === 4 && (
        <div className="rounded-2xl border border-lp-line">
          <button type="button" onClick={() => setBounds((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left text-[13.5px] text-white">
            How the total becomes a 1–7 grade <ChevronDown className={cn("h-4 w-4 text-lp-mute transition-transform", bounds && "rotate-180")} />
          </button>
          {bounds && (
            <div className="grid grid-cols-7 gap-1 px-4 pb-4 text-center text-[12px]">
              {GRADE_BOUNDARIES.map((g) => <div key={g.grade} className="rounded-lg bg-lp-raised/60 py-2"><p className="text-[16px] font-semibold text-white">{g.grade}</p><p className="tabular-nums text-lp-mute">{g.min}–{g.max}</p></div>)}
              <p className="col-span-7 mt-1 text-left text-[11.5px] text-lp-mute">The IB's guideline boundaries for a total out of 32. Your school's final grades come from your teacher.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CustomRubricView: React.FC<{ r: CustomRubric }> = ({ r }) => {
  const total = r.criteria.reduce((t, c) => t + c.points, 0);
  const cols = useMemo(() => Math.max(...r.criteria.map((c) => c.levels.length)), [r]);
  return (
    <div className="space-y-3">
      {r.notes && <p className="whitespace-pre-wrap rounded-xl border border-lp-line p-3 text-[13.5px] leading-relaxed text-white">{r.notes}</p>}
      <div className="hidden overflow-x-auto rounded-2xl border border-lp-line md:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-lp-line text-left text-[12px] text-lp-mute">
              <th className="px-3 py-2.5 font-medium">Criterion</th>
              {Array.from({ length: cols }, (_, i) => <th key={i} className="px-3 py-2.5 font-medium">{r.criteria[0]?.levels[i]?.label || `Level ${i + 1}`}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-lp-line">
            {r.criteria.map((c) => (
              <tr key={c.name} className="align-top">
                <td className="w-44 px-3 py-3"><p className="font-medium text-white">{c.name}</p><p className="text-[12px] text-lp-mute">{c.points} points</p></td>
                {Array.from({ length: cols }, (_, i) => <td key={i} className="px-3 py-3 leading-relaxed text-lp-soft">{c.levels[i]?.descriptor}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {r.criteria.map((c) => (
          <section key={c.name} className="rounded-2xl border border-lp-line p-4">
            <p className="font-medium text-white">{c.name} <span className="text-[12px] font-normal text-lp-mute">· {c.points} points</span></p>
            <div className="mt-2 space-y-2">{c.levels.map((l, i) => <div key={i} className="rounded-lg bg-lp-raised/50 p-2.5 text-[13px]"><p className="text-[12px] font-semibold text-lp-sky">{l.label}</p><p className="mt-0.5 leading-relaxed text-lp-soft">{l.descriptor}</p></div>)}</div>
          </section>
        ))}
      </div>
      {total > 0 && <p className="text-right text-[12.5px] text-lp-mute">Total: {total} points</p>}
    </div>
  );
};

export const RubricView: React.FC<{ rubric: Rubric; assessment?: Assessment | null }> = ({ rubric, assessment }) => (rubric.kind === "myp" ? <MypRubricView r={rubric} assessment={assessment} /> : <CustomRubricView r={rubric} />);
