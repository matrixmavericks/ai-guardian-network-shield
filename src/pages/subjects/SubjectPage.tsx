import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  BookText,
  Brain,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  GraduationCap,
  Layers,
  LayoutGrid,
  ListChecks,
  MessageCircleQuestion,
  PlayCircle,
  RotateCcw,
  ScrollText,
  Timer,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { findTopic, getSubject, questionsOf, topicsOf, type Subject } from "@/content/myp";
import { Bar, EmptyState, Ring, chip, ghostBtn } from "@/components/student/ui";
import { Crumbs, StatusIcon, StudyShell, SubjectGlyph, TabBar, iconBtn, primaryBtn } from "@/components/subjects/kit";
import {
  STATUS_META,
  STATUS_ORDER,
  buildPlan,
  subjectSummary,
  today,
  topicScore,
  topicStatus,
  useStudy,
  type PlanTask,
  type StudyPlan,
  type StudyState,
} from "@/components/subjects/store";
import { tone } from "@/lib/portalAppearance";

type TabId = "resources" | "topics" | "plan" | "saved";

export const SubjectMissing: React.FC = () => (
  <StudyShell>
    <EmptyState
      icon={GraduationCap}
      title="Subject not found"
      body="That subject doesn't exist. Head back to your subjects to pick another."
      action={
        <Link to="/my-courses" className={ghostBtn}>
          My subjects
        </Link>
      }
    />
  </StudyShell>
);

/* ---------- Header ---------- */

const SubjectHero: React.FC<{ subject: Subject; state: StudyState }> = ({ subject, state }) => {
  const s = subjectSummary(subject, state);
  return (
    <section
      className="lp-fade relative mt-4 overflow-hidden rounded-3xl border border-lp-line bg-lp-surface p-5 sm:p-7"
      style={{ animationFillMode: "both" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-2/3 opacity-25" style={{ background: `radial-gradient(70% 90% at 100% 0%, ${subject.theme.accent}, transparent 70%)` }} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ background: subject.theme.gradient }} />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="lp-keep flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: subject.theme.gradient }}>
            <SubjectGlyph subject={subject} className="h-7 w-7 text-white" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">MYP · {subject.group}</p>
            <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[30px]">{subject.name}</h1>
            <p className="mt-1 text-[13.5px] text-lp-soft">
              {subject.units.length} units · {s.topics} topics · {s.questions} practice questions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Ring value={s.progress} size={76} label={`${s.progress}%`} />
          <div className="text-[12.5px] leading-relaxed text-lp-mute">
            <p>
              <span className="font-medium text-white">{s.counts.mastered}</span> mastered
            </p>
            <p>
              <span className="font-medium text-white">{s.answered}</span>/{s.questions} answered
            </p>
            <p>
              <span className={cn("font-medium", s.mistakes ? "text-lp-red" : "text-white")}>{s.mistakes}</span> to review
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- Resources ---------- */

const ResourceCard: React.FC<{
  to: string;
  icon: React.ElementType;
  title: string;
  body: string;
  meta?: string;
  accent: string;
  delay: number;
}> = ({ to, icon: Icon, title, body, meta, accent, delay }) => (
  <Link
    to={to}
    className="lp-fade group relative flex items-start gap-4 rounded-2xl border border-lp-line bg-lp-surface/70 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-lp-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-sky"
    style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
  >
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-white/5" style={{ background: `${accent}1F`, color: tone(accent) }}>
      <Icon className="h-5 w-5" />
    </span>
    <div className="min-w-0 pr-5">
      <p className="text-[14.5px] font-medium text-white">{title}</p>
      <p className="mt-0.5 text-[12.5px] leading-snug text-lp-mute">{body}</p>
      {meta && <span className={cn(chip, "mt-2.5")}>{meta}</span>}
    </div>
    <ArrowUpRight className="absolute right-3.5 top-3.5 h-4 w-4 text-lp-mute opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
  </Link>
);

const Resources: React.FC<{ subject: Subject; state: StudyState }> = ({ subject, state }) => {
  const s = subjectSummary(subject, state);
  const base = `/subjects/${subject.slug}`;
  const cards = topicsOf(subject).reduce((n, t) => n + t.flashcards.length, 0);
  const terms = topicsOf(subject).reduce((n, t) => n + t.keyTerms.length, 0);
  const read = topicsOf(subject).filter((t) => state.read[t.id]).length;
  const groups: { title: string; items: Omit<React.ComponentProps<typeof ResourceCard>, "delay">[] }[] = [
    {
      title: "Practice",
      items: [
        { to: `${base}/questionbank`, icon: ListChecks, title: "Questionbank", body: "Practice questions with instant feedback and AI explanations.", meta: `${s.answered}/${s.questions} answered`, accent: "#7CB4FF" },
        { to: `${base}/teach`, icon: MessageCircleQuestion, title: "Teach Refyn", body: "Explain a topic to Refyn. It asks questions until the gaps show.", meta: "Feynman method", accent: "#3FE9FF" },
        { to: `${base}/exam`, icon: Timer, title: "Exam builder", body: "Build a timed paper from the topics you choose.", meta: "Timed or untimed", accent: "#A78BFA" },
        { to: `${base}/mistakes`, icon: RotateCcw, title: "Mistakes log", body: "Every question you got wrong, ready to retry.", meta: s.mistakes ? `${s.mistakes} to review` : "All clear", accent: "#F2706A" },
      ],
    },
    {
      title: "Learn",
      items: [
        { to: `${base}/guides`, icon: BookOpen, title: "Study guide", body: "Clear notes for every topic, with worked examples and exam tips.", meta: `${read}/${s.topics} read`, accent: "#34D399" },
        { to: `${base}/lessons`, icon: PlayCircle, title: "Lessons", body: "Short, step-by-step walkthroughs that end with a quick check.", meta: `${s.topics} lessons`, accent: "#FBBF24" },
        { to: `${base}/flashcards`, icon: Layers, title: "Flashcards", body: "Flip, rate and repeat until every card sticks.", meta: `${cards} cards`, accent: "#F472B6" },
        { to: `${base}/cheatsheets`, icon: ScrollText, title: "Cheatsheets", body: "One-page unit summaries you can print or download.", meta: `${subject.units.length} sheets`, accent: "#7CB4FF" },
      ],
    },
    {
      title: "Reference",
      items: [{ to: `${base}/definitions`, icon: BookText, title: "Key definitions", body: "Every key term in one searchable glossary.", meta: `${terms} terms`, accent: "#5EEAD4" }],
    },
  ];
  let n = 0;
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-lp-mute">{g.title}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {g.items.map((it) => (
              <ResourceCard key={it.title} {...it} delay={40 + n++ * 35} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

/* ---------- Topics & progress ---------- */

export const StatusLegend: React.FC<{ counts?: Record<string, number>; className?: string }> = ({ counts, className }) => (
  <div className={cn("flex flex-wrap gap-x-5 gap-y-2", className)}>
    {STATUS_ORDER.map((st) => (
      <span key={st} title={STATUS_META[st].hint} className="inline-flex items-center gap-2 text-[12.5px] text-lp-soft">
        <StatusIcon status={st} size={16} />
        {STATUS_META[st].label}
        {counts && <span className="tabular-nums text-lp-mute">{counts[st]}</span>}
      </span>
    ))}
  </div>
);

const TopicsProgress: React.FC<{ subject: Subject; state: StudyState }> = ({ subject, state }) => {
  const s = subjectSummary(subject, state);
  const base = `/subjects/${subject.slug}`;
  return (
    <div className="space-y-4">
      <div className="lp-fade rounded-2xl border border-lp-line bg-lp-surface/70 p-4" style={{ animationFillMode: "both" }}>
        <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-lp-mute">Topic progress</p>
        <StatusLegend counts={s.counts} />
        <p className="mt-3 text-[12.5px] leading-relaxed text-lp-mute">
          Status comes from your latest answer to each practice question. Reading a guide or reviewing flashcards moves a topic to Learning.
        </p>
      </div>

      {subject.units.map((unit, ui) => {
        const unitWeight = unit.topics.reduce((a, t) => a + STATUS_META[topicStatus(t, state)].weight, 0) / unit.topics.length;
        return (
          <section
            key={unit.id}
            className="lp-fade overflow-hidden rounded-2xl border border-lp-line bg-lp-surface/70"
            style={{ animationDelay: `${60 + ui * 60}ms`, animationFillMode: "both" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lp-line px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">Unit {ui + 1}</p>
                <h3 className="text-[15.5px] font-medium text-white">{unit.title}</h3>
              </div>
              <div className="flex w-40 items-center gap-2">
                <Bar value={unitWeight} />
                <span className="w-9 text-right text-[12px] tabular-nums text-lp-soft">{Math.round(unitWeight)}%</span>
              </div>
            </div>
            <ul className="divide-y divide-lp-line/70">
              {unit.topics.map((t) => {
                const st = topicStatus(t, state);
                const sc = topicScore(t, state);
                return (
                  <li key={t.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]">
                    <StatusIcon status={st} size={20} />
                    <Link to={`${base}/guide/${t.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-white group-hover:text-lp-sky">{t.title}</p>
                      <p className="truncate text-[12.5px] text-lp-mute">{t.summary}</p>
                    </Link>
                    <span className="hidden shrink-0 text-[12px] tabular-nums text-lp-mute sm:inline" title="Correct on latest attempt">
                      {sc.correct}/{sc.total}
                    </span>
                    <span className="hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium md:inline" style={{ color: tone(STATUS_META[st].color), background: `${STATUS_META[st].color}18` }}>
                      {STATUS_META[st].label}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <Link to={`${base}/guide/${t.id}`} className={iconBtn} title="Study guide" aria-label={`Study guide: ${t.title}`}>
                        <BookOpen className="h-4 w-4" />
                      </Link>
                      <Link to={`${base}/flashcards?topic=${t.id}`} className={iconBtn} title="Flashcards" aria-label={`Flashcards: ${t.title}`}>
                        <Layers className="h-4 w-4" />
                      </Link>
                      <Link to={`${base}/questionbank?topic=${t.id}`} className={iconBtn} title="Practice" aria-label={`Practice: ${t.title}`}>
                        <ListChecks className="h-4 w-4" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

/* ---------- Study plan ---------- */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return today(d);
};

const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, opts);

const PlanForm: React.FC<{ subject: Subject; state: StudyState; onCreate: (p: StudyPlan) => void; onCancel?: () => void }> = ({ subject, state, onCreate, onCancel }) => {
  const [examDate, setExamDate] = useState(addDays(28));
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5, 6]);
  const [minutes, setMinutes] = useState(40);
  const preview = useMemo(() => buildPlan(subject, state, examDate, weekdays, minutes), [subject, state, examDate, weekdays, minutes]);
  const tooSoon = preview.days.length < 2;
  return (
    <div className="lp-fade rounded-3xl border border-lp-line bg-lp-surface/70 p-5 sm:p-6" style={{ animationFillMode: "both" }}>
      <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-white">Create a study plan</h3>
      <p className="mt-1 text-[13.5px] text-lp-mute">Refyn spreads every topic across your study days, weakest first, and ends with a mock exam.</p>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        <label className="block">
          <span className="text-[12.5px] font-medium text-lp-soft">Exam or test date</span>
          <input
            type="date"
            value={examDate}
            min={addDays(2)}
            onChange={(e) => setExamDate(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-lp-line bg-lp-deep px-3 text-[13.5px] text-white [color-scheme:dark] focus:border-lp-sky/60 focus:outline-none"
          />
        </label>
        <div>
          <span className="text-[12.5px] font-medium text-lp-soft">Study days</span>
          <div className="mt-1.5 flex gap-1">
            {WEEKDAYS.map((w, i) => {
              const on = weekdays.includes(i);
              return (
                <button
                  key={w}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setWeekdays((d) => (on ? d.filter((x) => x !== i) : [...d, i]))}
                  className={cn(
                    "h-10 flex-1 rounded-lg border text-[12px] font-medium transition-colors",
                    on ? "border-lp-sky/50 bg-lp-blue/20 text-white" : "border-lp-line text-lp-mute hover:text-white",
                  )}
                >
                  {w.slice(0, 2)}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <span className="text-[12.5px] font-medium text-lp-soft">Session length</span>
          <div className="mt-1.5 flex gap-1">
            {[20, 40, 60].map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={minutes === m}
                onClick={() => setMinutes(m)}
                className={cn(
                  "h-10 flex-1 rounded-lg border text-[12.5px] font-medium transition-colors",
                  minutes === m ? "border-lp-sky/50 bg-lp-blue/20 text-white" : "border-lp-line text-lp-mute hover:text-white",
                )}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lp-line bg-lp-deep/50 px-4 py-3">
        <p className="text-[13px] text-lp-soft">
          {tooSoon ? (
            <span className="text-lp-red">Pick a later date or more study days to fit at least two sessions.</span>
          ) : (
            <>
              <span className="font-medium text-white">{preview.days.length} sessions</span> until {fmtDate(examDate, { day: "numeric", month: "long" })} ·{" "}
              {preview.days.reduce((n, d) => n + d.tasks.length, 0)} tasks
            </>
          )}
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className={ghostBtn}>
              Cancel
            </button>
          )}
          <button type="button" disabled={tooSoon} onClick={() => onCreate(preview)} className={primaryBtn}>
            <CalendarDays className="h-4 w-4" /> Create plan
          </button>
        </div>
      </div>
    </div>
  );
};

const taskInfo = (subject: Subject, task: PlanTask) => {
  const base = `/subjects/${subject.slug}`;
  const t = task.topicId ? findTopic(subject, task.topicId)?.topic : undefined;
  switch (task.kind) {
    case "guide":
      return { icon: BookOpen, label: `Read the guide: ${t?.title}`, to: `${base}/guide/${task.topicId}` };
    case "flashcards":
      return { icon: Layers, label: `Flashcards: ${t?.title}`, to: `${base}/flashcards?topic=${task.topicId}` };
    case "practice":
      return { icon: ListChecks, label: `Practice questions: ${t?.title}`, to: `${base}/questionbank?topic=${task.topicId}` };
    case "mistakes":
      return { icon: RotateCcw, label: "Clear your mistakes log", to: `${base}/mistakes` };
    case "exam":
      return { icon: Timer, label: "Mock exam: mixed topics", to: `${base}/exam` };
  }
};

/** A task also counts as done once the student has actually done the work. */
const autoDone = (subject: Subject, state: StudyState, plan: StudyPlan, task: PlanTask) => {
  const t = task.topicId ? findTopic(subject, task.topicId)?.topic : undefined;
  if (!t) return false;
  if (task.kind === "guide") return !!state.read[t.id];
  if (task.kind === "flashcards") return t.flashcards.every((f) => state.cards[f.id] !== undefined);
  if (task.kind === "practice") return t.questions.every((q) => (state.attempts[q.id] || []).some((a) => a.at >= plan.createdAt));
  return false;
};

const StudyPlanTab: React.FC<{ subject: Subject; state: StudyState; study: ReturnType<typeof useStudy> }> = ({ subject, state, study }) => {
  const plan = state.plans[subject.slug];
  const [creating, setCreating] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (!plan && !creating) {
    return (
      <div className="lp-fade rounded-3xl border border-dashed border-lp-line" style={{ animationFillMode: "both" }}>
        <EmptyState
          icon={CalendarDays}
          title="No study plan yet"
          body="Tell Refyn when your exam is and which days you can study. It builds a schedule that covers every topic, weakest first."
          action={
            <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>
              <CalendarDays className="h-4 w-4" /> Create study plan
            </button>
          }
        />
      </div>
    );
  }
  if (!plan || creating) {
    return (
      <PlanForm
        subject={subject}
        state={state}
        onCancel={() => setCreating(false)}
        onCreate={(p) => {
          study.setPlan(subject.slug, p);
          setCreating(false);
        }}
      />
    );
  }

  const now = today();
  const isDone = (t: PlanTask) => t.done || autoDone(subject, state, plan, t);
  const all = plan.days.flatMap((d) => d.tasks);
  const done = all.filter(isDone).length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const daysLeft = Math.max(0, Math.round((new Date(`${plan.examDate}T00:00:00`).getTime() - new Date(`${now}T00:00:00`).getTime()) / 86400000));
  const overdue = plan.days.filter((d) => d.date < now && d.tasks.some((t) => !isDone(t)));
  const upcoming = plan.days.filter((d) => d.date >= now);
  const shown = showAll ? upcoming : upcoming.slice(0, 6);

  const dayCard = (d: StudyPlan["days"][number], i: number) => {
    const isToday = d.date === now;
    const allDone = d.tasks.every(isDone);
    return (
      <li
        key={d.date}
        className={cn(
          "lp-fade rounded-2xl border p-4",
          isToday ? "border-lp-sky/40 bg-lp-blue/[0.08]" : "border-lp-line bg-lp-surface/70",
          d.date < now && !allDone && "border-lp-red/30",
        )}
        style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
      >
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-[13.5px] font-medium text-white">
            {isToday ? "Today" : fmtDate(d.date)}
            {isToday && <span className="ml-2 text-[12px] font-normal text-lp-mute">{fmtDate(d.date)}</span>}
          </p>
          {allDone ? (
            <span className="inline-flex items-center gap-1 text-[12px] text-lp-green">
              <Check className="h-3.5 w-3.5" /> Done
            </span>
          ) : (
            <span className="text-[12px] text-lp-mute">
              {d.tasks.filter(isDone).length}/{d.tasks.length}
            </span>
          )}
        </div>
        <ul className="space-y-1.5">
          {d.tasks.map((t) => {
            const info = taskInfo(subject, t);
            const ok = isDone(t);
            const Icon = info.icon;
            return (
              <li key={t.id} className="flex items-center gap-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={ok}
                  aria-label={`Mark "${info.label}" ${ok ? "not done" : "done"}`}
                  onClick={() => study.togglePlanTask(subject.slug, d.date, t.id)}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    ok ? "border-lp-green bg-lp-green text-lp-deep" : "border-lp-line hover:border-lp-sky",
                  )}
                >
                  {ok && <Check className="h-3.5 w-3.5" />}
                </button>
                <Link to={info.to} className={cn("flex min-w-0 flex-1 items-center gap-2 text-[13px] transition-colors hover:text-lp-sky", ok ? "text-lp-mute line-through" : "text-lp-soft")}>
                  <Icon className="h-3.5 w-3.5 shrink-0 text-lp-mute" />
                  <span className="truncate">{info.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="lp-fade flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-lp-line bg-lp-surface/70 p-5" style={{ animationFillMode: "both" }}>
        <div className="flex items-center gap-4">
          <Ring value={pct} size={68} label={`${pct}%`} tone="green" />
          <div>
            <p className="text-[16px] font-semibold text-white">
              {daysLeft} day{daysLeft === 1 ? "" : "s"} to go
            </p>
            <p className="text-[13px] text-lp-mute">
              Exam {fmtDate(plan.examDate, { weekday: "long", day: "numeric", month: "long" })} · {done}/{all.length} tasks done
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setCreating(true)} className={ghostBtn}>
            <RotateCcw className="h-4 w-4" /> Rebuild
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this study plan?")) study.setPlan(subject.slug, null);
            }}
            className={iconBtn + " h-10 w-10"}
            aria-label="Delete plan"
            title="Delete plan"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {overdue.length > 0 && (
        <section>
          <h3 className="mb-2 text-[12px] font-medium uppercase tracking-[0.18em] text-lp-red">Catch up</h3>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{overdue.map(dayCard)}</ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-[12px] font-medium uppercase tracking-[0.18em] text-lp-mute">Coming up</h3>
        {upcoming.length ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{shown.map(dayCard)}</ul>
        ) : (
          <p className="text-[13.5px] text-lp-mute">No sessions left. Good luck in the exam!</p>
        )}
        {upcoming.length > shown.length && (
          <button type="button" onClick={() => setShowAll(true)} className={cn(ghostBtn, "mt-3")}>
            Show all {upcoming.length} sessions
          </button>
        )}
      </section>
    </div>
  );
};

/* ---------- Saved ---------- */

const SavedTab: React.FC<{ subject: Subject; state: StudyState; study: ReturnType<typeof useStudy> }> = ({ subject, state, study }) => {
  const base = `/subjects/${subject.slug}`;
  const items = state.saved.filter((x) => x.subject === subject.slug);
  if (!items.length) {
    return (
      <div className="lp-fade rounded-3xl border border-dashed border-lp-line" style={{ animationFillMode: "both" }}>
        <EmptyState icon={Bookmark} title="Nothing saved yet" body="Tap the bookmark on any guide, cheatsheet, question or key term and it will wait for you here." />
      </div>
    );
  }
  const questions = questionsOf(subject);
  const terms = topicsOf(subject).flatMap((t) => t.keyTerms.map((k) => ({ ...k, topicId: t.id })));
  const rows = items
    .map((it) => {
      if (it.kind === "topic") {
        const f = findTopic(subject, it.id);
        return f && { it, icon: BookOpen, kind: "Study guide", title: f.topic.title, body: f.topic.summary, to: `${base}/guide/${it.id}` };
      }
      if (it.kind === "cheatsheet") {
        const u = subject.units.find((x) => x.id === it.id);
        return u && { it, icon: FileText, kind: "Cheatsheet", title: u.title, body: `${u.topics.length} topics on one page`, to: `${base}/cheatsheet/${it.id}` };
      }
      if (it.kind === "question") {
        const q = questions.find((x) => x.id === it.id);
        return q && { it, icon: ClipboardList, kind: "Question", title: q.q, body: `Answer: ${q.options[q.answer]}`, to: `${base}/questionbank?topic=${q.topicId}` };
      }
      const t = terms.find((x) => x.term === it.id);
      return t && { it, icon: BookText, kind: "Key term", title: t.term, body: t.def, to: `${base}/definitions?q=${encodeURIComponent(t.term)}` };
    })
    .filter(Boolean) as { it: (typeof items)[number]; icon: React.ElementType; kind: string; title: string; body: string; to: string }[];

  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {rows.map((r, i) => {
        const Icon = r.icon;
        return (
          <li
            key={`${r.it.kind}-${r.it.id}`}
            className="lp-fade group relative flex items-start gap-3 rounded-2xl border border-lp-line bg-lp-surface/70 p-4 transition-colors hover:border-white/20"
            style={{ animationDelay: `${i * 35}ms`, animationFillMode: "both" }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lp-raised text-lp-sky">
              <Icon className="h-4 w-4" />
            </span>
            <Link to={r.to} className="min-w-0 flex-1 pr-7">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-lp-mute">{r.kind}</p>
              <p className="mt-0.5 line-clamp-2 text-[14px] font-medium text-white group-hover:text-lp-sky">{r.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[12.5px] text-lp-mute">{r.body}</p>
            </Link>
            <button
              type="button"
              onClick={() => study.toggleSaved({ kind: r.it.kind, id: r.it.id, subject: subject.slug })}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white"
              aria-label="Remove from saved"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
};

/* ---------- Page ---------- */

const SubjectPage = () => {
  const { slug } = useParams();
  const subject = getSubject(slug);
  const [params, setParams] = useSearchParams();
  const study = useStudy();
  const { state } = study;
  const tab = (["resources", "topics", "plan", "saved"].includes(params.get("tab") || "") ? params.get("tab") : "resources") as TabId;

  useEffect(() => {
    if (subject) study.visit({ subject: subject.slug, path: `/subjects/${subject.slug}`, label: subject.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject?.slug]);

  if (!subject) return <SubjectMissing />;
  const savedCount = state.saved.filter((x) => x.subject === subject.slug).length;

  return (
    <StudyShell>
      <Crumbs items={[{ label: "My subjects", to: "/my-courses" }, { label: "MYP", to: "/my-courses" }, { label: subject.name }]} />
      <SubjectHero subject={subject} state={state} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <TabBar
          value={tab}
          onChange={(v: TabId) => setParams(v === "resources" ? {} : { tab: v }, { replace: true })}
          tabs={[
            { id: "resources", label: "Resources", icon: LayoutGrid },
            { id: "topics", label: "Topics & Progress", icon: TrendingUp },
            { id: "plan", label: "Study plan", icon: CalendarDays },
            { id: "saved", label: "Saved", icon: Bookmark, count: savedCount },
          ]}
        />
        <Link to={`/subjects/${subject.slug}/questionbank`} className={cn(primaryBtn, "hidden sm:inline-flex")}>
          <Brain className="h-4 w-4" /> Practise now
        </Link>
      </div>

      <div className="mt-6">
        {tab === "resources" && <Resources subject={subject} state={state} />}
        {tab === "topics" && <TopicsProgress subject={subject} state={state} />}
        {tab === "plan" && <StudyPlanTab subject={subject} state={state} study={study} />}
        {tab === "saved" && <SavedTab subject={subject} state={state} study={study} />}
      </div>
    </StudyShell>
  );
};

export default SubjectPage;
