import React, { useEffect, useMemo, useState } from "react";
import { Check, ClipboardList, Eye, FileText, ListChecks, MessageCircleQuestion, Radio, RotateCcw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizQuestion, QuizSpec } from "./blocks";
import { Card, CardHead, chip, ghost, primary, useSaved } from "./ui";

type Given = { value: number | boolean | string; correct: boolean | null };
type Saved = { answers: Record<number, Given>; idx: number; done: boolean };

const LETTERS = "ABCDEF";
const answerText = (q: QuizQuestion) => (q.type === "mcq" ? `${LETTERS[q.answer]}. ${q.options[q.answer]}` : q.type === "tf" ? (q.answer ? "True" : "False") : q.answer);
const givenText = (q: QuizQuestion, g?: Given) => (!g ? "no answer" : q.type === "mcq" ? `${LETTERS[g.value as number]}. ${q.options[g.value as number]}` : q.type === "tf" ? (g.value ? "True" : "False") : String(g.value));

export const Quiz: React.FC<{
  spec: QuizSpec;
  storeKey: string;
  teacher: boolean;
  onAsk?: (prompt: string) => void;
  onLaunchLive?: (spec: QuizSpec) => void;
}> = ({ spec, storeKey, teacher, onAsk, onLaunchLive }) => {
  const [saved, setSaved] = useSaved<Saved>(storeKey, { answers: {}, idx: 0, done: false });
  const [draft, setDraft] = useState("");
  const [key, setKey] = useState(teacher);
  const { answers, idx, done } = saved;
  const n = spec.questions.length;
  const q = spec.questions[Math.min(idx, n - 1)];
  const given = answers[idx];
  const marked = Object.values(answers).filter((a) => a.correct !== null);
  const score = marked.filter((a) => a.correct).length;
  useEffect(() => setDraft(""), [idx]);

  const answer = (value: Given["value"]) => {
    if (given) return;
    const correct = q.type === "mcq" ? value === q.answer : q.type === "tf" ? value === q.answer : null;
    setSaved({ ...saved, answers: { ...answers, [idx]: { value, correct } } });
  };
  const selfMark = (correct: boolean) => setSaved({ ...saved, answers: { ...answers, [idx]: { ...given!, correct } } });
  const next = () => {
    // Go to the next unanswered question, or finish
    const order = [...Array(n).keys()];
    const after = order.slice(idx + 1).concat(order.slice(0, idx + 1)).find((i) => !answers[i] || answers[i].correct === null);
    setSaved({ ...saved, idx: after ?? idx, done: after === undefined });
  };
  const wrong = useMemo(() => spec.questions.map((x, i) => ({ x, i })).filter(({ i }) => answers[i]?.correct === false), [spec, answers]);
  const liveable = spec.questions.filter((x) => x.type !== "short").length;

  const head = (
    <CardHead icon={ListChecks} kind="Quiz" title={spec.title}>
      <span className={chip}>{done ? `${score}/${n}` : `${Math.min(idx + 1, n)} of ${n}`}</span>
      {teacher && <button type="button" onClick={() => setKey((v) => !v)} className={cn(chip, "hover:text-white", key && "border-lp-sky/50 text-lp-sky")}><Eye className="h-3 w-3" /> Answer key</button>}
    </CardHead>
  );

  if (key) {
    return (
      <Card>
        {head}
        <ol className="mt-4 space-y-3">
          {spec.questions.map((x, i) => (
            <li key={i} className="rounded-xl border border-lp-line p-3">
              <p className="text-[14px] text-white"><span className="mr-1.5 text-lp-mute">{i + 1}.</span>{x.q}</p>
              {x.type === "mcq" && <ul className="mt-2 grid gap-1 sm:grid-cols-2">{x.options.map((o, k) => <li key={k} className={cn("rounded-lg px-2.5 py-1.5 text-[13px]", k === x.answer ? "bg-emerald-500/15 text-emerald-300" : "text-lp-soft")}>{LETTERS[k]}. {o}</li>)}</ul>}
              {x.type !== "mcq" && <p className="mt-1.5 text-[13px] text-emerald-300">Answer: {answerText(x)}</p>}
              {x.explain && <p className="mt-1.5 text-[12.5px] text-lp-mute">{x.explain}</p>}
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          {onLaunchLive && liveable > 0 && <button type="button" onClick={() => onLaunchLive(spec)} className={primary}><Radio className="h-4 w-4" /> Launch as live quiz</button>}
          {onAsk && <button type="button" onClick={() => onAsk(`Turn the quiz "${spec.title}" into a printable worksheet with space for answers, plus a separate answer key, as a file.`)} className={ghost}><FileText className="h-4 w-4" /> Make a worksheet</button>}
          {onAsk && <button type="button" onClick={() => onAsk(`Make a harder version of the quiz "${spec.title}" with the same number of questions, and an easier one for students who need support.`)} className={ghost}><Sparkles className="h-4 w-4" /> Differentiate</button>}
          <button type="button" onClick={() => setKey(false)} className={ghost}><ClipboardList className="h-4 w-4" /> Try it as a student</button>
        </div>
        {onLaunchLive && liveable < n && <p className="mt-2 text-[11.5px] text-lp-mute">Live quizzes use the {liveable} multiple-choice and true/false questions; short answers stay in the worksheet.</p>}
      </Card>
    );
  }

  if (done) {
    const pct = n ? Math.round((score / n) * 100) : 0;
    return (
      <Card>
        {head}
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <div className="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" className="stroke-lp-line" /><circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" strokeLinecap="round" className={pct >= 70 ? "stroke-emerald-400" : pct >= 40 ? "stroke-amber-400" : "stroke-rose-400"} strokeDasharray={`${(pct / 100) * 97.4} 97.4`} /></svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[22px] font-semibold text-white">{score}/{n}</span><span className="text-[10.5px] text-lp-mute">{pct}%</span></span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-medium text-white">{pct === 100 ? "Perfect score." : pct >= 70 ? "Strong work." : pct >= 40 ? "Getting there." : "Good start: now fix the gaps."}</p>
            <p className="mt-1 text-[13px] text-lp-soft">{wrong.length ? `${wrong.length} to go back over. Retry them, or ask Refyn to explain what went wrong.` : "Try a harder set to stretch yourself."}</p>
          </div>
        </div>
        <ol className="mt-4 space-y-1.5">
          {spec.questions.map((x, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px]">
              {answers[i]?.correct ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />}
              <span className="min-w-0 text-lp-soft">{x.q}{!answers[i]?.correct && <span className="block text-[12px] text-lp-mute">You: {givenText(x, answers[i])} · Answer: {answerText(x)}</span>}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          {wrong.length > 0 && <button type="button" onClick={() => { const a = { ...answers }; wrong.forEach(({ i }) => delete a[i]); setSaved({ answers: a, idx: wrong[0].i, done: false }); }} className={primary}><RotateCcw className="h-4 w-4" /> Retry the {wrong.length} I missed</button>}
          {wrong.length > 0 && onAsk && <button type="button" onClick={() => onAsk(`I just did the quiz "${spec.title}" and got these wrong:\n${wrong.map(({ x, i }) => `- ${x.q} (I said: ${givenText(x, answers[i])}; the answer is: ${answerText(x)})`).join("\n")}\nHelp me understand where my thinking went wrong, one at a time.`)} className={ghost}><MessageCircleQuestion className="h-4 w-4" /> Go over my mistakes</button>}
          {onAsk && <button type="button" onClick={() => onAsk(`Give me a harder quiz on the same topic as "${spec.title}", focusing on ${wrong.length ? "what I got wrong" : "the trickier ideas"}.`)} className={ghost}><Sparkles className="h-4 w-4" /> Harder quiz</button>}
          <button type="button" onClick={() => setSaved({ answers: {}, idx: 0, done: false })} className={ghost}>Start again</button>
          {teacher && onLaunchLive && liveable > 0 && <button type="button" onClick={() => onLaunchLive(spec)} className={ghost}><Radio className="h-4 w-4" /> Launch as live quiz</button>}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {head}
      <div className="mt-3 flex gap-1">{spec.questions.map((_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", answers[i]?.correct === true ? "bg-emerald-400" : answers[i]?.correct === false ? "bg-rose-400" : i === idx ? "bg-lp-sky" : "bg-lp-line")} />)}</div>
      <p className="mt-4 text-[15.5px] leading-relaxed text-white">{q.q}</p>
      {q.type === "mcq" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {q.options.map((o, k) => {
            const isAns = k === q.answer;
            const chosen = given?.value === k;
            return (
              <button key={k} type="button" disabled={!!given} onClick={() => answer(k)} className={cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[14px] transition-colors", !given ? "border-lp-line text-white hover:border-lp-blue/60 hover:bg-lp-blue/10" : isAns ? "border-emerald-500/60 bg-emerald-500/15 text-white" : chosen ? "border-rose-500/60 bg-rose-500/15 text-white" : "border-lp-line text-lp-mute")}>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-semibold", given && isAns ? "bg-emerald-500 text-white" : given && chosen ? "bg-rose-500 text-white" : "bg-lp-raised text-lp-soft")}>{LETTERS[k]}</span>
                <span className="min-w-0 pt-0.5">{o}</span>
              </button>
            );
          })}
        </div>
      )}
      {q.type === "tf" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" disabled={!!given} onClick={() => answer(v)} className={cn("h-11 rounded-xl border text-[14px] font-medium transition-colors", !given ? "border-lp-line text-white hover:border-lp-blue/60 hover:bg-lp-blue/10" : v === q.answer ? "border-emerald-500/60 bg-emerald-500/15 text-white" : given.value === v ? "border-rose-500/60 bg-rose-500/15 text-white" : "border-lp-line text-lp-mute")}>
              {v ? "True" : "False"}
            </button>
          ))}
        </div>
      )}
      {q.type === "short" && !given && (
        <form className="mt-3" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) answer(draft.trim()); }}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder="Your answer" className="w-full resize-y rounded-xl border border-lp-line bg-lp-deep/60 px-3 py-2 text-[14px] text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60" />
          <button type="submit" disabled={!draft.trim()} className={cn(primary, "mt-2")}>Check</button>
        </form>
      )}
      {given && (
        <div className={cn("mt-3 rounded-xl border p-3 text-[13.5px]", given.correct === true ? "border-emerald-500/40 bg-emerald-500/10" : given.correct === false ? "border-rose-500/40 bg-rose-500/10" : "border-lp-sky/40 bg-lp-blue/10")}>
          <p className="font-medium text-white">{given.correct === true ? "Correct" : given.correct === false ? `Not quite: the answer is ${answerText(q)}` : `Model answer: ${q.type === "short" ? q.answer : ""}`}</p>
          {q.explain && <p className="mt-1 text-lp-soft">{q.explain}</p>}
          {given.correct === null && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] text-lp-mute">How did you do?</span>
              <button type="button" onClick={() => selfMark(true)} className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/50 px-2.5 text-[12.5px] text-emerald-300"><Check className="h-3.5 w-3.5" /> I got it</button>
              <button type="button" onClick={() => selfMark(false)} className="flex h-8 items-center gap-1.5 rounded-lg border border-rose-500/50 px-2.5 text-[12.5px] text-rose-300"><X className="h-3.5 w-3.5" /> Not quite</button>
            </div>
          )}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-lp-mute">{marked.length ? `${score} of ${marked.length} right so far` : "Answer to see if you're right"}</span>
        <div className="flex gap-2">
          {given && onAsk && given.correct === false && <button type="button" onClick={() => onAsk(`In the quiz "${spec.title}", the question was: "${q.q}". I answered ${givenText(q, given)} but the answer is ${answerText(q)}. Help me see why.`)} className={ghost}><MessageCircleQuestion className="h-4 w-4" /> Why?</button>}
          <button type="button" disabled={!given || given.correct === null} onClick={next} className={primary}>{Object.keys(answers).length >= n && Object.values(answers).every((a) => a.correct !== null) ? "See results" : "Next"}</button>
        </div>
      </div>
    </Card>
  );
};
