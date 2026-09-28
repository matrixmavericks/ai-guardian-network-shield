import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Check,
  Circle,
  Clock,
  ListChecks,
  PartyPopper,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { findTopic, questionsOf, type Question, type Subject } from "@/content/myp";
import { Bar, EmptyState, Ring, chip, ghostBtn } from "@/components/student/ui";
import { ToolHeader, iconBtn, primaryBtn, selectCls, shuffle } from "@/components/subjects/kit";
import { askRefyn } from "@/components/subjects/AskPanel";
import { isSaved, latest, useStudy } from "@/components/subjects/store";

export type QItem = Question & { topicId: string };

const LETTERS = ["A", "B", "C", "D", "E"];

/* ---------- Quiz runner (practice + exam) ---------- */

type OptionState = "idle" | "selected" | "correct" | "wrong" | "dim";

const OptionButton: React.FC<{ letter: string; text: string; state: OptionState; onClick: () => void; disabled?: boolean }> = ({ letter, text, state, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "group flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-[14.5px] leading-snug transition-all duration-200",
      state === "idle" && "border-lp-line bg-lp-surface/70 text-lp-text hover:-translate-y-px hover:border-lp-sky/50 hover:bg-lp-surface",
      state === "selected" && "border-lp-sky bg-lp-blue/15 text-white",
      state === "correct" && "border-lp-green/60 bg-lp-green/10 text-white",
      state === "wrong" && "border-lp-red/60 bg-lp-red/10 text-white",
      state === "dim" && "border-lp-line/70 bg-lp-surface/30 text-lp-mute",
      disabled && state === "idle" && "cursor-default",
    )}
  >
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[12px] font-semibold transition-colors",
        state === "correct" ? "border-lp-green bg-lp-green text-lp-deep" : state === "wrong" ? "border-lp-red bg-lp-red text-lp-deep" : state === "selected" ? "border-lp-sky bg-lp-blue text-white" : "border-lp-line text-lp-soft group-hover:border-lp-sky/60",
      )}
    >
      {state === "correct" ? <Check className="h-4 w-4" /> : state === "wrong" ? <X className="h-4 w-4" /> : letter}
    </span>
    <span className="min-w-0 flex-1">{text}</span>
  </button>
);

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export const QuizRunner: React.FC<{
  subject: Subject;
  questions: QItem[];
  mode: "practice" | "exam";
  minutes?: number;
  onDone: () => void;
  onRetry?: (qs: QItem[]) => void;
}> = ({ subject, questions, mode, minutes = 0, onDone, onRetry }) => {
  const study = useStudy();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const [ai, setAi] = useState<Record<string, { loading: boolean; text?: string }>>({});
  const [left, setLeft] = useState(minutes * 60);
  const q = questions[i];
  const answered = q ? picked[q.id] !== undefined : false;
  const topicTitle = (id: string) => findTopic(subject, id)?.topic.title ?? "";

  const submit = () => {
    questions.forEach((x) => {
      const c = picked[x.id];
      if (c !== undefined) study.answer(x.id, c, c === x.answer);
    });
    setFinished(true);
  };

  const choose = (choice: number) => {
    if (finished || !q) return;
    if (mode === "practice") {
      if (picked[q.id] !== undefined) return;
      study.answer(q.id, choice, choice === q.answer);
    }
    setPicked((p) => ({ ...p, [q.id]: choice }));
  };

  const next = () => {
    if (i < questions.length - 1) setI(i + 1);
    else if (mode === "practice") setFinished(true);
  };

  // Countdown for timed exams
  useEffect(() => {
    if (mode !== "exam" || !minutes || finished) return;
    const t = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => window.clearInterval(t);
  }, [mode, minutes, finished]);
  useEffect(() => {
    if (mode === "exam" && minutes && left === 0 && !finished) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  // Keyboard: 1-4 / A-D to answer, Enter or → for next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target;
      if (finished || (el instanceof Element && el.closest("input, textarea, select"))) return;
      const k = e.key.toLowerCase();
      const idx = ["1", "2", "3", "4", "5"].indexOf(k) >= 0 ? Number(k) - 1 : ["a", "b", "c", "d", "e"].indexOf(k);
      if (q && idx >= 0 && idx < q.options.length) {
        e.preventDefault();
        choose(idx);
      } else if ((k === "enter" || k === "arrowright") && (mode === "exam" || answered)) {
        e.preventDefault();
        next();
      } else if (k === "arrowleft" && mode === "exam" && i > 0) {
        setI(i - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const explain = async (x: QItem) => {
    const choice = picked[x.id];
    setAi((a) => ({ ...a, [x.id]: { loading: true } }));
    const t = findTopic(subject, x.topicId)?.topic;
    try {
      const text = await askRefyn(
        subject,
        `I answered "${x.options[choice]}" to this question: "${x.q}". The correct answer is "${x.options[x.answer]}". Help me understand the idea behind it in a few short sentences, and give me a tip so I remember it.`,
        `IB MYP ${subject.name} practice question on "${t?.title}". Model explanation: ${x.explain}\n\nTopic notes:\n${t?.guide ?? ""}`,
      );
      setAi((a) => ({ ...a, [x.id]: { loading: false, text } }));
    } catch {
      setAi((a) => ({ ...a, [x.id]: { loading: false, text: "Couldn't reach Refyn just now. Please try again." } }));
    }
  };

  /* ----- Results ----- */
  if (finished) {
    const correct = questions.filter((x) => picked[x.id] === x.answer).length;
    const pct = Math.round((correct / questions.length) * 100);
    const missed = questions.filter((x) => picked[x.id] !== x.answer);
    const byTopic = Object.entries(
      questions.reduce<Record<string, { c: number; n: number }>>((acc, x) => {
        acc[x.topicId] = acc[x.topicId] || { c: 0, n: 0 };
        acc[x.topicId].n++;
        if (picked[x.id] === x.answer) acc[x.topicId].c++;
        return acc;
      }, {}),
    );
    const tone = pct >= 80 ? "green" : pct >= 50 ? "blue" : pct >= 30 ? "amber" : "red";
    return (
      <div className="space-y-5">
        <section className="lp-fade flex flex-wrap items-center gap-6 rounded-3xl border border-lp-line bg-lp-surface/70 p-6" style={{ animationFillMode: "both" }}>
          <Ring value={pct} size={96} stroke={8} label={`${pct}%`} tone={tone} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[20px] font-semibold tracking-[-0.02em] text-white">
              {pct >= 80 && <PartyPopper className="h-5 w-5 text-[#FBBF24]" />}
              {pct >= 80 ? "Excellent work" : pct >= 50 ? "Solid. Keep going" : "Good start. Review and retry"}
            </p>
            <p className="mt-1 text-[14px] text-lp-soft">
              {correct} of {questions.length} correct{mode === "exam" && minutes ? ` · ${fmtTime(minutes * 60 - left)} used` : ""}. Your topic progress has been updated.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {onRetry && missed.length > 0 && (
                <button type="button" onClick={() => onRetry(missed)} className={primaryBtn}>
                  <RotateCcw className="h-4 w-4" /> Retry the {missed.length} I missed
                </button>
              )}
              <button type="button" onClick={onDone} className={ghostBtn}>
                Done
              </button>
            </div>
          </div>
        </section>

        {byTopic.length > 1 && (
          <section className="lp-fade rounded-3xl border border-lp-line bg-lp-surface/70 p-5" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
            <h3 className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-lp-mute">By topic</h3>
            <ul className="space-y-3">
              {byTopic.map(([id, r]) => (
                <li key={id} className="grid grid-cols-[minmax(0,1fr)_120px_44px] items-center gap-3">
                  <Link to={`/subjects/${subject.slug}/guide/${id}`} className="truncate text-[13.5px] text-lp-soft hover:text-white">
                    {topicTitle(id)}
                  </Link>
                  <Bar value={(r.c / r.n) * 100} tone={r.c === r.n ? "green" : r.c / r.n >= 0.5 ? "blue" : "red"} />
                  <span className="text-right text-[12.5px] tabular-nums text-lp-mute">
                    {r.c}/{r.n}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="lp-fade space-y-3" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
          <h3 className="text-[12px] font-medium uppercase tracking-[0.18em] text-lp-mute">Review</h3>
          {questions.map((x, n) => {
            const c = picked[x.id];
            const ok = c === x.answer;
            return (
              <div key={x.id} className="rounded-2xl border border-lp-line bg-lp-surface/70 p-4">
                <div className="flex items-start gap-3">
                  <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", ok ? "bg-lp-green/15 text-lp-green" : "bg-lp-red/15 text-lp-red")}>
                    {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-white">
                      {n + 1}. {x.q}
                    </p>
                    <p className="mt-1.5 text-[13px] text-lp-soft">
                      {c === undefined ? <span className="text-lp-mute">Not answered</span> : <>Your answer: <span className={ok ? "text-lp-green" : "text-lp-red"}>{x.options[c]}</span></>}
                      {!ok && (
                        <>
                          {" · "}Correct: <span className="text-lp-green">{x.options[x.answer]}</span>
                        </>
                      )}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-lp-mute">{x.explain}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    );
  }

  if (!q) return null;

  /* ----- Question ----- */
  const saved = isSaved(study.state, "question", q.id);
  const choice = picked[q.id];
  const answeredCount = Object.keys(picked).length;
  const correctSoFar = questions.filter((x) => picked[x.id] === x.answer).length;
  const optionState = (n: number): OptionState => {
    if (mode === "exam") return choice === n ? "selected" : "idle";
    if (choice === undefined) return "idle";
    if (n === q.answer) return "correct";
    if (n === choice) return "wrong";
    return "dim";
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <Bar value={((mode === "exam" ? answeredCount : i + (answered ? 1 : 0)) / questions.length) * 100} />
          <span className="shrink-0 text-[12.5px] tabular-nums text-lp-mute">
            {i + 1}/{questions.length}
          </span>
        </div>

        <div key={q.id} className="lp-fade rounded-3xl border border-lp-line bg-lp-surface/70 p-5 sm:p-7" style={{ animationFillMode: "both" }}>
          <div className="flex items-start justify-between gap-3">
            <span className={chip}>{topicTitle(q.topicId)}</span>
            <button
              type="button"
              onClick={() => study.toggleSaved({ kind: "question", id: q.id, subject: subject.slug })}
              className={cn(iconBtn, "h-8 w-8", saved && "border-lp-sky/50 text-lp-sky")}
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved" : "Save question"}
              title={saved ? "Saved" : "Save question"}
            >
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </button>
          </div>
          <h2 className="mt-4 text-[18px] font-medium leading-snug tracking-[-0.01em] text-white sm:text-[20px]">{q.q}</h2>
          <div className="mt-5 space-y-2.5">
            {q.options.map((o, n) => (
              <OptionButton key={n} letter={LETTERS[n]} text={o} state={optionState(n)} onClick={() => choose(n)} disabled={mode === "practice" && answered} />
            ))}
          </div>

          {mode === "practice" && answered && (
            <div className="lp-fade mt-5 space-y-3" style={{ animationFillMode: "both" }}>
              <div className={cn("rounded-2xl border p-4", choice === q.answer ? "border-lp-green/30 bg-lp-green/[0.06]" : "border-lp-red/30 bg-lp-red/[0.06]")}>
                <p className={cn("text-[14px] font-semibold", choice === q.answer ? "text-lp-green" : "text-lp-red")}>{choice === q.answer ? "Correct" : "Not quite"}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-lp-soft">{q.explain}</p>
              </div>
              {ai[q.id]?.text ? (
                <div className="rounded-2xl border border-lp-blue/30 bg-lp-blue/[0.06] p-4">
                  <p className="mb-1 flex items-center gap-1.5 text-[12.5px] font-medium text-lp-sky">
                    <Sparkles className="h-3.5 w-3.5" /> Refyn
                  </p>
                  <div className="lp-md !text-[13.5px]">
                    <ReactMarkdown>{ai[q.id].text!}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => explain(q)} disabled={ai[q.id]?.loading} className={ghostBtn}>
                  {ai[q.id]?.loading ? (
                    <span className="lp-dots inline-flex gap-1" aria-label="Thinking">
                      <span />
                      <span />
                      <span />
                    </span>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-lp-cyan" /> Explain it with Refyn
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            {mode === "exam" ? (
              <button type="button" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className={ghostBtn}>
                Previous
              </button>
            ) : (
              <span className="hidden text-[12px] text-lp-mute sm:inline">Keys 1–4 to answer · Enter for next</span>
            )}
            {mode === "exam" && i === questions.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  const missing = questions.length - answeredCount;
                  if (!missing || window.confirm(`${missing} question${missing === 1 ? " is" : "s are"} unanswered. Submit anyway?`)) submit();
                }}
                className={primaryBtn}
              >
                Submit exam
              </button>
            ) : (
              <button type="button" onClick={next} disabled={mode === "practice" && !answered} className={primaryBtn}>
                {mode === "practice" && i === questions.length - 1 ? "See results" : "Next"} <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        {mode === "exam" && minutes > 0 && (
          <div className={cn("flex items-center gap-3 rounded-2xl border p-4", left < 60 ? "border-lp-red/40 bg-lp-red/[0.06]" : "border-lp-line bg-lp-surface/70")}>
            <Clock className={cn("h-5 w-5", left < 60 ? "text-lp-red" : "text-lp-sky")} />
            <div>
              <p className="text-[20px] font-semibold tabular-nums text-white">{fmtTime(left)}</p>
              <p className="text-[12px] text-lp-mute">time left</p>
            </div>
          </div>
        )}
        <div className="rounded-2xl border border-lp-line bg-lp-surface/70 p-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">{mode === "exam" ? "Questions" : "This set"}</p>
          <div className="grid grid-cols-6 gap-1.5">
            {questions.map((x, n) => {
              const c = picked[x.id];
              const st = c === undefined ? "none" : mode === "exam" ? "done" : c === x.answer ? "ok" : "bad";
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => (mode === "exam" || c !== undefined || n <= i ? setI(n) : undefined)}
                  aria-label={`Question ${n + 1}`}
                  aria-current={n === i ? "step" : undefined}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-lg border text-[12px] font-medium tabular-nums transition-colors",
                    st === "none" && "border-lp-line text-lp-mute",
                    st === "done" && "border-lp-blue/50 bg-lp-blue/20 text-white",
                    st === "ok" && "border-lp-green/40 bg-lp-green/15 text-lp-green",
                    st === "bad" && "border-lp-red/40 bg-lp-red/15 text-lp-red",
                    n === i && "ring-2 ring-lp-sky ring-offset-2 ring-offset-lp-surface",
                  )}
                >
                  {n + 1}
                </button>
              );
            })}
          </div>
          {mode === "practice" && (
            <p className="mt-3 text-[12.5px] text-lp-mute">
              <span className="font-medium text-white">{correctSoFar}</span> correct so far
            </p>
          )}
        </div>
        <button type="button" onClick={() => (mode === "exam" && answeredCount && !window.confirm("Leave this exam? Your answers won't be saved.") ? undefined : onDone())} className={cn(ghostBtn, "w-full")}>
          <X className="h-4 w-4" /> {mode === "exam" ? "Quit exam" : "End practice"}
        </button>
      </aside>
    </div>
  );
};

/* ---------- Questionbank ---------- */

const questionIcon = (ok?: boolean) =>
  ok === undefined ? <Circle className="h-4 w-4 text-lp-line" /> : ok ? <Check className="h-4 w-4 text-lp-green" /> : <X className="h-4 w-4 text-lp-red" />;

export const Questionbank: React.FC<{ subject: Subject }> = ({ subject }) => {
  const [params] = useSearchParams();
  const { state } = useStudy();
  const all = useMemo(() => questionsOf(subject), [subject]);
  const [scope, setScope] = useState(params.get("topic") || "all");
  const [filter, setFilter] = useState<"all" | "new" | "wrong">("all");
  const [count, setCount] = useState(10);
  const [run, setRun] = useState<QItem[] | null>(null);

  const inScope = all.filter((q) => scope === "all" || q.topicId === scope || subject.units.find((u) => u.id === scope)?.topics.some((t) => t.id === q.topicId));
  const filtered = inScope.filter((q) => (filter === "all" ? true : filter === "new" ? !latest(state, q.id) : latest(state, q.id)?.ok === false));
  const start = (qs = filtered) => setRun(shuffle(qs).slice(0, count || qs.length));

  return (
    <>
      <ToolHeader subject={subject} title="Questionbank" body="Practice questions with instant feedback. Every answer updates your topic progress." icon={ListChecks} />
      <div className="mt-6">
        {run ? (
          <QuizRunner key={run.map((q) => q.id).join()} subject={subject} questions={run} mode="practice" onDone={() => setRun(null)} onRetry={(qs) => setRun(shuffle(qs))} />
        ) : (
          <div className="space-y-5">
            <section className="lp-fade rounded-3xl border border-lp-line bg-lp-surface/70 p-5" style={{ animationFillMode: "both" }}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <label className="block min-w-0">
                  <span className="text-[12.5px] font-medium text-lp-soft">Topics</span>
                  <select value={scope} onChange={(e) => setScope(e.target.value)} className={cn(selectCls, "mt-1.5 w-full")}>
                    <option value="all">All topics ({all.length} questions)</option>
                    {subject.units.map((u, ui) => (
                      <optgroup key={u.id} label={`Unit ${ui + 1}: ${u.title}`}>
                        <option value={u.id}>All of {u.title}</option>
                        {u.topics.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="text-[12.5px] font-medium text-lp-soft">Show</span>
                  <div className="mt-1.5 flex gap-1">
                    {(
                      [
                        ["all", "All"],
                        ["new", "Unanswered"],
                        ["wrong", "Got wrong"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={filter === id}
                        onClick={() => setFilter(id)}
                        className={cn("h-10 flex-1 rounded-lg border text-[12.5px] font-medium transition-colors", filter === id ? "border-lp-sky/50 bg-lp-blue/20 text-white" : "border-lp-line text-lp-mute hover:text-white")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[12.5px] font-medium text-lp-soft">Questions</span>
                  <div className="mt-1.5 flex gap-1">
                    {[5, 10, 20, 0].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={count === n}
                        onClick={() => setCount(n)}
                        className={cn("h-10 flex-1 rounded-lg border text-[12.5px] font-medium transition-colors", count === n ? "border-lp-sky/50 bg-lp-blue/20 text-white" : "border-lp-line text-lp-mute hover:text-white")}
                      >
                        {n || "All"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-lp-mute">
                  <span className="font-medium text-white">{filtered.length}</span> question{filtered.length === 1 ? "" : "s"} match
                </p>
                <button type="button" disabled={!filtered.length} onClick={() => start()} className={primaryBtn}>
                  <Play className="h-4 w-4" /> Start practice ({count ? Math.min(count, filtered.length) : filtered.length})
                </button>
              </div>
            </section>

            {filtered.length ? (
              <ul className="lp-fade divide-y divide-lp-line/70 overflow-hidden rounded-3xl border border-lp-line bg-lp-surface/70" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
                {filtered.map((q) => (
                  <li key={q.id}>
                    <button type="button" onClick={() => setRun([q])} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]">
                      {questionIcon(latest(state, q.id)?.ok)}
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-lp-text">{q.q}</span>
                      <span className="hidden shrink-0 text-[12px] text-lp-mute sm:inline">{findTopic(subject, q.topicId)?.topic.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-3xl border border-dashed border-lp-line">
                <EmptyState icon={ListChecks} title={filter === "wrong" ? "No wrong answers here" : "All answered"} body="Try a different filter or topic." />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

/* ---------- Exam builder ---------- */

export const ExamBuilder: React.FC<{ subject: Subject }> = ({ subject }) => {
  const all = useMemo(() => questionsOf(subject), [subject]);
  const allTopicIds = subject.units.flatMap((u) => u.topics.map((t) => t.id));
  const [selected, setSelected] = useState<string[]>(allTopicIds);
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(15);
  const [run, setRun] = useState<{ qs: QItem[]; minutes: number } | null>(null);
  const pool = all.filter((q) => selected.includes(q.topicId));
  const size = Math.min(count, pool.length);

  // Spread questions evenly across the chosen topics.
  const build = () => {
    const groups = selected.map((id) => shuffle(pool.filter((q) => q.topicId === id))).filter((g) => g.length);
    const out: QItem[] = [];
    for (let r = 0; out.length < size; r++) for (const g of shuffle(groups)) if (g[r] && out.length < size) out.push(g[r]);
    setRun({ qs: out, minutes });
  };

  const toggle = (ids: string[], on: boolean) => setSelected((s) => (on ? [...new Set([...s, ...ids])] : s.filter((x) => !ids.includes(x))));

  return (
    <>
      <ToolHeader subject={subject} title="Exam builder" body="Build a paper from the topics you choose. Answers are marked when you submit." icon={Timer} accent="#A78BFA" />
      <div className="mt-6">
        {run ? (
          <QuizRunner key={run.qs.map((q) => q.id).join()} subject={subject} questions={run.qs} mode="exam" minutes={run.minutes} onDone={() => setRun(null)} />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="lp-fade space-y-3" style={{ animationFillMode: "both" }}>
              {subject.units.map((u, ui) => {
                const ids = u.topics.map((t) => t.id);
                const allOn = ids.every((id) => selected.includes(id));
                return (
                  <div key={u.id} className="rounded-2xl border border-lp-line bg-lp-surface/70 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-[14px] font-medium text-white">
                        <span className="text-lp-mute">Unit {ui + 1} · </span>
                        {u.title}
                      </p>
                      <button type="button" onClick={() => toggle(ids, !allOn)} className="text-[12.5px] text-lp-sky hover:underline">
                        {allOn ? "Clear" : "Select all"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                      {u.topics.map((t) => {
                        const on = selected.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => toggle([t.id], !on)}
                            className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13px] transition-colors", on ? "border-lp-sky/40 bg-lp-blue/10 text-white" : "border-lp-line text-lp-mute hover:text-white")}
                          >
                            <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", on ? "border-lp-sky bg-lp-blue text-white" : "border-lp-line")}>
                              {on && <Check className="h-3 w-3" />}
                            </span>
                            <span className="truncate">{t.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>

            <aside className="lp-fade space-y-4 rounded-3xl border border-lp-line bg-lp-surface/70 p-5 lg:sticky lg:top-6 lg:self-start" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
              <div>
                <span className="text-[12.5px] font-medium text-lp-soft">Questions</span>
                <div className="mt-1.5 grid grid-cols-4 gap-1">
                  {[5, 10, 15, 20].map((n) => (
                    <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)} className={cn("h-10 rounded-lg border text-[13px] font-medium", count === n ? "border-lp-sky/50 bg-lp-blue/20 text-white" : "border-lp-line text-lp-mute hover:text-white")}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[12.5px] font-medium text-lp-soft">Time limit</span>
                <div className="mt-1.5 grid grid-cols-4 gap-1">
                  {[0, 10, 15, 30].map((m) => (
                    <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)} className={cn("h-10 rounded-lg border text-[12.5px] font-medium", minutes === m ? "border-lp-sky/50 bg-lp-blue/20 text-white" : "border-lp-line text-lp-mute hover:text-white")}>
                      {m ? `${m}m` : "Off"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-lp-line bg-lp-deep/50 p-3 text-[13px] text-lp-soft">
                <p>
                  <span className="font-medium text-white">{size}</span> questions from <span className="font-medium text-white">{selected.length}</span> topic{selected.length === 1 ? "" : "s"}
                </p>
                <p className="mt-0.5 text-[12px] text-lp-mute">{minutes ? `${minutes} minutes · auto-submits when time runs out` : "Untimed"}</p>
              </div>
              <button type="button" disabled={!size} onClick={build} className={cn(primaryBtn, "w-full")}>
                <Play className="h-4 w-4" /> Start exam
              </button>
            </aside>
          </div>
        )}
      </div>
    </>
  );
};

/* ---------- Mistakes log ---------- */

export const MistakesLog: React.FC<{ subject: Subject }> = ({ subject }) => {
  const { state } = useStudy();
  const all = useMemo(() => questionsOf(subject), [subject]);
  const [run, setRun] = useState<QItem[] | null>(null);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const wrong = all.filter((q) => latest(state, q.id)?.ok === false);
  const cleared = all.filter((q) => (state.attempts[q.id] || []).some((a) => !a.ok) && latest(state, q.id)?.ok).length;
  const groups = subject.units.flatMap((u) => u.topics).map((t) => ({ t, qs: wrong.filter((q) => q.topicId === t.id) })).filter((g) => g.qs.length);

  return (
    <>
      <ToolHeader
        subject={subject}
        title="Mistakes log"
        body="Questions you got wrong on your latest try. Get one right and it clears."
        icon={RotateCcw}
        accent="#F2706A"
        actions={
          !run && wrong.length > 0 ? (
            <button type="button" onClick={() => setRun(shuffle(wrong))} className={primaryBtn}>
              <RotateCcw className="h-4 w-4" /> Retry all {wrong.length}
            </button>
          ) : undefined
        }
      />
      <div className="mt-6">
        {run ? (
          <QuizRunner key={run.map((q) => q.id).join()} subject={subject} questions={run} mode="practice" onDone={() => setRun(null)} onRetry={(qs) => setRun(shuffle(qs))} />
        ) : wrong.length === 0 ? (
          <div className="lp-fade rounded-3xl border border-dashed border-lp-line" style={{ animationFillMode: "both" }}>
            <EmptyState
              icon={PartyPopper}
              title={cleared ? "Mistakes log cleared" : "No mistakes yet"}
              body={cleared ? `You've fixed ${cleared} question${cleared === 1 ? "" : "s"} you once got wrong. Nice.` : "Questions you get wrong in practice or exams will collect here so you can retry them."}
              action={
                <Link to={`/subjects/${subject.slug}/questionbank`} className={ghostBtn}>
                  <ListChecks className="h-4 w-4" /> Go to questionbank
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {cleared > 0 && (
              <p className="text-[13px] text-lp-mute">
                <span className="text-lp-green">{cleared} cleared</span> so far. Keep going.
              </p>
            )}
            {groups.map(({ t, qs }, gi) => (
              <section key={t.id} className="lp-fade rounded-3xl border border-lp-line bg-lp-surface/70 p-4" style={{ animationDelay: `${gi * 50}ms`, animationFillMode: "both" }}>
                <div className="mb-2 flex items-center justify-between gap-3 px-1">
                  <p className="text-[14px] font-medium text-white">{t.title}</p>
                  <div className="flex gap-2">
                    <Link to={`/subjects/${subject.slug}/guide/${t.id}`} className="inline-flex items-center gap-1 text-[12.5px] text-lp-mute hover:text-white">
                      <BookOpen className="h-3.5 w-3.5" /> Guide
                    </Link>
                    <button type="button" onClick={() => setRun(shuffle(qs))} className="inline-flex items-center gap-1 text-[12.5px] text-lp-sky hover:underline">
                      Retry {qs.length}
                    </button>
                  </div>
                </div>
                <ul className="space-y-2">
                  {qs.map((q) => {
                    const a = latest(state, q.id)!;
                    return (
                      <li key={q.id} className="rounded-2xl border border-lp-line bg-lp-deep/40 p-3.5">
                        <p className="text-[13.5px] text-white">{q.q}</p>
                        <p className="mt-1 text-[12.5px] text-lp-soft">
                          You answered <span className="text-lp-red">{q.options[a.choice]}</span>
                        </p>
                        {reveal[q.id] ? (
                          <p className="mt-1.5 text-[12.5px] leading-relaxed text-lp-mute">
                            <span className="text-lp-green">{q.options[q.answer]}</span>. {q.explain}
                          </p>
                        ) : (
                          <button type="button" onClick={() => setReveal((r) => ({ ...r, [q.id]: true }))} className="mt-1.5 text-[12px] text-lp-sky hover:underline">
                            Show the answer
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
