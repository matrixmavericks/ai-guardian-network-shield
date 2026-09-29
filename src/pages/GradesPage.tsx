import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { differenceInCalendarDays, format } from "date-fns";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CalendarClock,
  ChevronDown,
  Download,
  GraduationCap,
  ListChecks,
  MessageSquareQuote,
  Search,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { fetchGradingSystems, getGradeBoundaries, type GradingSystem } from "@/services/gradingService";
import { EmptyState, Panel, PanelHead, Ring, chip, ghostBtn, useCountUp } from "@/components/student/ui";
import { StudyShell, primaryBtn, selectCls } from "@/components/subjects/kit";
import { downloadMarkdown, useStoredState } from "@/components/assistant/storage";
import { mySubjects, subjectSummary, useStudy } from "@/components/subjects/store";
import { Distribution, FeedbackCard, GradePill, SubjectCard, Timeline, TrendChip } from "@/components/grades/parts";
import {
  avg,
  byDate,
  colorFor,
  distribution,
  gpaOf,
  gradeIn,
  neededFor,
  scaleNote,
  standing,
  subjectStats,
  toCsv,
  toneHex,
  toneOf,
  trendOf,
  type GradedWork,
  type Upcoming,
} from "@/components/grades/stats";
import { tone } from "@/lib/portalAppearance";

const SYSTEM_SHORT: Record<string, string> = { ib: "MYP 1–7", percentage: "Percent", igcse: "IGCSE", us_letter: "US GPA" };

/* ---------- Goal planner + what-if ---------- */

const GoalPlanner: React.FC<{
  items: GradedWork[];
  system: GradingSystem | null;
  target: number;
  setTarget: (v: number) => void;
}> = ({ items, system, target, setTarget }) => {
  const [n, setN] = useState(3);
  const [next, setNext] = useState(80);

  // Plan over as few pieces as makes the goal realistic (95% or less each), up to 10
  useEffect(() => {
    if (!items.length) return;
    let k = 1;
    while (k < 10 && neededFor(items, target, k) > 95) k++;
    setN(Math.max(1, k));
  }, [target, items]);
  const bands = useMemo(() => (system ? getGradeBoundaries(system).filter((b) => b.min > 0).slice(0, 5) : []), [system]);
  const current = avg(items.map((g) => g.pct));
  const need = neededFor(items, target, n);
  const whatIf = (items.reduce((a, g) => a + g.pct, 0) + next) / (items.length + 1);
  const targetLabel = system ? gradeIn(target, system) : `${target}%`;
  const done = need <= current && current >= target;
  const impossible = need > 100;

  return (
    <Panel className="flex flex-col p-5" delay={80}>
      <PanelHead title="Goal planner" icon={Target} meta={<span>{items.length} graded so far</span>} />

      <p className="mt-4 text-[12px] font-medium uppercase tracking-[0.16em] text-lp-mute">Aim for</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {bands.map((b) => (
          <button
            key={b.label}
            type="button"
            aria-pressed={target === b.min}
            onClick={() => setTarget(b.min)}
            className={cn(
              "h-9 min-w-[2.75rem] rounded-xl border px-3 text-[14px] font-semibold tabular-nums transition-colors",
              target === b.min ? "border-lp-cyan/60 bg-lp-cyan/15 text-white" : "border-lp-line text-lp-soft hover:text-white",
            )}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 text-[13px] text-lp-soft">
        over the next
        <div className="flex items-center rounded-xl border border-lp-line bg-lp-deep/60">
          <button type="button" onClick={() => setN((v) => Math.max(1, v - 1))} className="h-8 w-8 text-lp-mute hover:text-white" aria-label="Fewer pieces">
            −
          </button>
          <span className="w-6 text-center font-semibold tabular-nums text-white">{n}</span>
          <button type="button" onClick={() => setN((v) => Math.min(10, v + 1))} className="h-8 w-8 text-lp-mute hover:text-white" aria-label="More pieces">
            +
          </button>
        </div>
        piece{n === 1 ? "" : "s"} of work
      </div>

      <div
        className={cn(
          "mt-4 rounded-2xl border p-4",
          done ? "border-lp-green/30 bg-lp-green/[0.07]" : impossible ? "border-lp-red/30 bg-lp-red/[0.06]" : "border-lp-cyan/25 bg-lp-cyan/[0.06]",
        )}
      >
        {done ? (
          <>
            <p className="text-[15px] font-semibold text-lp-green">You're already there</p>
            <p className="mt-1 text-[13px] text-lp-soft">
              Your average is at a {targetLabel}. Keep scoring around {Math.round(current)}% to hold it.
            </p>
          </>
        ) : impossible ? (
          <>
            <p className="text-[15px] font-semibold text-lp-red">Out of reach in {n} piece{n === 1 ? "" : "s"}</p>
            <p className="mt-1 text-[13px] text-lp-soft">
              You'd need {Math.round(need)}% on average.{" "}
              {bands.find((b) => b.min < target) ? (
                <>
                  Try aiming for a{" "}
                  <button type="button" onClick={() => setTarget(bands.find((b) => b.min < target)!.min)} className="font-semibold text-lp-cyan hover:underline">
                    {bands.find((b) => b.min < target)!.label}
                  </button>{" "}
                  first.
                </>
              ) : (
                "Plan over more pieces of work."
              )}
            </p>
          </>
        ) : (
          <>
            <p className="text-[13px] text-lp-soft">To finish at a {targetLabel}, average</p>
            <p className="mt-0.5 text-[30px] font-semibold leading-tight tabular-nums text-white">
              {Math.max(0, Math.ceil(need))}%
              <span className="ml-2 text-[13px] font-normal text-lp-mute">on each of the next {n}</span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-lp-line">
              <div className="lp-bar-in h-full rounded-full bg-gradient-to-r from-lp-blue to-lp-cyan" style={{ width: `${Math.min(100, Math.max(0, need))}%` }} />
            </div>
          </>
        )}
      </div>

      <div className="mt-5 border-t border-lp-line pt-4">
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-lp-mute">What if</p>
        <p className="mt-1.5 text-[13px] text-lp-soft">
          If your next piece scores <span className="font-semibold text-white">{next}%</span>, your average becomes{" "}
          <span className="font-semibold" style={{ color: tone(toneHex[toneOf(whatIf)]) }}>
            {whatIf.toFixed(1)}%
          </span>{" "}
          ({gradeIn(whatIf, system)}), {whatIf >= current ? "up" : "down"} {Math.abs(whatIf - current).toFixed(1)} pts.
        </p>
        <input
          type="range"
          min={20}
          max={100}
          value={next}
          onChange={(e) => setNext(Number(e.target.value))}
          aria-label="Score on your next piece of work"
          className="lp-range mt-3"
          style={{ ["--fill" as string]: `${((next - 20) / 80) * 100}%` }}
        />
      </div>
    </Panel>
  );
};

/* ---------- Page ---------- */

const GradesPage = () => {
  const { user } = useAuth();
  const { state: study } = useStudy();
  const [grades, setGrades] = useState<GradedWork[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [systems, setSystems] = useState<GradingSystem[]>([]);
  const [classSystem, setClassSystem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"new" | "old" | "high" | "low">("new");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [storedSystem, setStoredSystem] = useStoredState<string | null>(user ? `refyn:${user.id}:grading-system` : null, null);
  const [target, setTarget] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [sys, subsRes, memberRes] = await Promise.all([
          fetchGradingSystems(),
          supabase
            .from("assignment_submissions")
            .select("id, grade, max_grade, feedback, graded_at, assignment_id, status")
            .eq("student_id", user.id),
          supabase.from("class_members").select("class_id").eq("student_id", user.id),
        ]);
        if (cancelled) return;
        setSystems(sys);

        const subs = subsRes.data || [];
        const memberClassIds = (memberRes.data || []).map((m) => m.class_id);
        const assignmentIds = [...new Set(subs.map((s) => s.assignment_id))];
        const [{ data: assignments }, { data: dueSoon }] = await Promise.all([
          assignmentIds.length
            ? supabase.from("class_assignments").select("id, title, subject, class_id").in("id", assignmentIds)
            : Promise.resolve({ data: [] as { id: string; title: string; subject: string | null; class_id: string }[] }),
          memberClassIds.length
            ? supabase
                .from("class_assignments")
                .select("id, title, subject, class_id, due_date")
                .in("class_id", memberClassIds)
                .gte("due_date", new Date().toISOString())
                .order("due_date", { ascending: true })
                .limit(12)
            : Promise.resolve({ data: [] as { id: string; title: string; subject: string | null; class_id: string; due_date: string | null }[] }),
        ]);
        const classIds = [...new Set([...memberClassIds, ...(assignments || []).map((a) => a.class_id)])];
        const { data: classes } = classIds.length
          ? await supabase.from("classes").select("id, name, subject, grading_system_id, curriculum_type").in("id", classIds)
          : { data: [] as { id: string; name: string; subject: string | null; grading_system_id: string | null; curriculum_type: string | null }[] };
        if (cancelled) return;

        const aMap = new Map((assignments || []).map((a) => [a.id, a]));
        const cMap = new Map((classes || []).map((c) => [c.id, c]));

        setGrades(
          subs
            .filter((s) => s.status === "graded" && s.grade !== null && s.max_grade)
            .map((s) => {
              const a = aMap.get(s.assignment_id);
              const c = a ? cMap.get(a.class_id) : undefined;
              return {
                id: s.id,
                pct: Math.max(0, Math.min(100, ((s.grade as number) / (s.max_grade as number)) * 100)),
                grade: s.grade as number,
                max: s.max_grade as number,
                feedback: s.feedback?.trim() ? s.feedback : null,
                gradedAt: s.graded_at || new Date().toISOString(),
                title: a?.title || "Untitled assignment",
                subject: a?.subject || c?.subject || c?.name || "General",
                className: c?.name ?? null,
              };
            }),
        );

        const submitted = new Set(subs.map((s) => s.assignment_id));
        setUpcoming(
          (dueSoon || [])
            .filter((a) => !submitted.has(a.id) && a.due_date)
            .map((a) => {
              const c = cMap.get(a.class_id);
              return { id: a.id, title: a.title, subject: a.subject || c?.subject || "General", className: c?.name ?? null, due: a.due_date as string };
            }),
        );

        // The grading system the student's classes use most, e.g. IB for MYP classes
        const counts = new Map<string, number>();
        for (const c of classes || []) if (c.grading_system_id) counts.set(c.grading_system_id, (counts.get(c.grading_system_id) || 0) + 1);
        const top = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
        const ibClass = (classes || []).some((c) => /ib|myp/i.test(c.curriculum_type || ""));
        setClassSystem(top ?? (ibClass ? sys.find((s) => s.code === "ib")?.id ?? null : null));
      } catch (err) {
        console.error("Failed to load grades:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const system = useMemo(
    () => systems.find((s) => s.id === storedSystem) ?? systems.find((s) => s.id === classSystem) ?? systems.find((s) => s.is_default) ?? systems[0] ?? null,
    [systems, storedSystem, classSystem],
  );

  const subjects = useMemo(() => subjectStats(grades).map((s) => s.subject), [grades]);
  const scoped = useMemo(() => (subject ? grades.filter((g) => g.subject === subject) : grades), [grades, subject]);
  const stats = useMemo(() => subjectStats(grades), [grades]);
  const overall = avg(scoped.map((g) => g.pct));
  const trend = trendOf(scoped);
  const st = standing(overall);
  const gpa = gpaOf(scoped, system);
  const bands = useMemo(() => distribution(scoped, system), [scoped, system]);
  const mostImproved = [...stats].filter((s) => (s.trend ?? 0) >= 1).sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0))[0];
  const weakest = stats[stats.length - 1];
  const bestPiece = [...scoped].sort((a, b) => b.pct - a.pct)[0];
  const latestPiece = [...scoped].sort(byDate)[scoped.length - 1];
  const shown = useCountUp(Math.round(overall));

  // Default goal: the next band above the current average
  const boundaryList = useMemo(() => (system ? getGradeBoundaries(system).filter((b) => b.min > 0) : []), [system]);
  const nextBand = [...boundaryList].reverse().find((b) => b.min > overall);
  const goal = target ?? nextBand?.min ?? boundaryList[0]?.min ?? 85;

  const feedback = useMemo(() => [...scoped].filter((g) => g.feedback).sort(byDate).reverse().slice(0, 6), [scoped]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = scoped.filter((g) => !q || `${g.title} ${g.subject} ${g.className ?? ""} ${g.feedback ?? ""}`.toLowerCase().includes(q));
    const sorted = [...rows].sort(byDate);
    if (sort === "new") sorted.reverse();
    if (sort === "high") sorted.sort((a, b) => b.pct - a.pct);
    if (sort === "low") sorted.sort((a, b) => a.pct - b.pct);
    return sorted;
  }, [scoped, query, sort]);

  const planLink = weakest
    ? `/ai-learning-assistant?${new URLSearchParams({
        resourceTitle: "My grades",
        resourceDesc: [
          `Overall average ${Math.round(avg(grades.map((g) => g.pct)))}% (${gradeIn(avg(grades.map((g) => g.pct)), system)} ${scaleNote(system)}).`,
          `By subject: ${stats.map((s) => `${s.subject} ${Math.round(s.pct)}%`).join(", ")}.`,
          ...grades
            .filter((g) => g.subject === weakest.subject && g.feedback)
            .slice(0, 3)
            .map((g) => `Feedback on ${g.title}: ${g.feedback}`),
        ]
          .join(" ")
          .slice(0, 1500),
        prompt: `@revision-planner Using my grades, help me make a plan to improve in ${weakest.subject}.`,
      })}`
    : "/ai-learning-assistant";

  const practice = mySubjects(study)
    .map((s) => ({ s, sum: subjectSummary(s, study) }))
    .filter((x) => x.sum.answered > 0);

  const exportCsv = () => downloadMarkdown(`refyn-grades-${format(new Date(), "yyyy-MM-dd")}.csv`, toCsv(grades, system));

  /* ----- Sections ----- */

  const header = (
    <header className="lp-fade flex flex-wrap items-end justify-between gap-4" style={{ animationFillMode: "both" }}>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">Progress</p>
        <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[34px]">Grades</h1>
        <p className="mt-1.5 max-w-[560px] text-[14.5px] text-lp-soft">Every marked piece of work, what your teachers said, and what it takes to reach your next grade.</p>
      </div>
      {systems.length > 0 && (
        <div role="radiogroup" aria-label="Grading scale" className="flex gap-1 rounded-2xl border border-lp-line bg-lp-deep/70 p-1">
          {systems.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={system?.id === s.id}
              title={s.name}
              onClick={() => {
                setStoredSystem(s.id);
                setTarget(null);
              }}
              className={cn(
                "h-9 rounded-xl px-3 text-[13px] font-medium transition-all",
                system?.id === s.id ? "bg-lp-raised text-white shadow-[0_0_0_1px_rgba(124,180,255,0.3)]" : "text-lp-mute hover:text-white",
              )}
            >
              {SYSTEM_SHORT[s.code] ?? s.name}
            </button>
          ))}
        </div>
      )}
    </header>
  );

  const practicePanel = (
    <Panel className="p-5" delay={180}>
      <PanelHead title="Practice results" icon={ListChecks} meta={<Link to="/my-courses" className="text-lp-sky hover:underline">My subjects</Link>} />
      <p className="mt-1 text-[12px] text-lp-mute">From your own practice. These aren't teacher grades.</p>
      {practice.length ? (
        <ul className="mt-4 space-y-3">
          {practice.map(({ s, sum }) => {
            const acc = sum.answered ? ((sum.answered - sum.mistakes) / sum.answered) * 100 : 0;
            return (
              <li key={s.slug}>
                <Link to={`/subjects/${s.slug}`} className="group block">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13.5px] text-white group-hover:text-lp-sky">{s.name}</span>
                    <span className="shrink-0 text-[12px] tabular-nums text-lp-mute">
                      {Math.round(acc)}% right · {sum.counts.mastered} mastered
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-lp-line">
                    <div className="lp-bar-in h-full rounded-full" style={{ width: `${acc}%`, background: s.theme.accent }} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-lp-line p-4 text-center">
          <p className="text-[13px] text-lp-soft">Practise in My Subjects and your accuracy shows up here.</p>
          <Link to="/my-courses" className={cn(ghostBtn, "mt-3 h-9")}>
            <BookOpen className="h-4 w-4" /> Open My Subjects
          </Link>
        </div>
      )}
    </Panel>
  );

  const upcomingPanel = upcoming.length > 0 && (
    <Panel className="p-5" delay={140}>
      <PanelHead title="Coming up" icon={CalendarClock} meta={<span>{upcoming.length} due</span>} />
      <ul className="mt-3 divide-y divide-lp-line/70">
        {upcoming.slice(0, 6).map((a) => {
          const days = differenceInCalendarDays(new Date(a.due), new Date());
          return (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border text-center leading-none",
                  days <= 2 ? "border-lp-red/40 bg-lp-red/10 text-lp-red" : "border-lp-line bg-lp-raised text-lp-soft",
                )}
              >
                <span className="text-[14px] font-semibold">{format(new Date(a.due), "d")}</span>
                <span className="text-[9.5px] uppercase">{format(new Date(a.due), "MMM")}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] text-white">{a.title}</p>
                <p className="truncate text-[11.5px] text-lp-mute">
                  {a.subject}
                  {a.className ? ` · ${a.className}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-[12px] text-lp-mute">{days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days} days`}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );

  if (loading) {
    return (
      <StudyShell>
        {header}
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="lp-skeleton h-[250px] rounded-3xl" />
          <div className="lp-skeleton h-[250px] rounded-3xl" />
        </div>
        <div className="lp-skeleton mt-4 h-[320px] rounded-3xl" />
      </StudyShell>
    );
  }

  if (!grades.length) {
    return (
      <StudyShell>
        {header}
        <Panel className="relative mt-8 overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)" }} />
          <EmptyState
            icon={GraduationCap}
            title="No marked work yet"
            body="When your teachers mark assignments, they'll appear here with your grade on your school's scale, trends over time, their feedback and a planner for your next grade."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/my-courses" className={primaryBtn}>
                  <BookOpen className="h-4 w-4" /> Practise in My Subjects
                </Link>
                <Link to="/classes" className={ghostBtn}>
                  See my classes
                </Link>
              </div>
            }
            className="py-14"
          />
        </Panel>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {practicePanel}
          {upcomingPanel || (
            <Panel className="p-5" delay={140}>
              <PanelHead title="Coming up" icon={CalendarClock} />
              <p className="mt-3 text-[13px] text-lp-mute">Nothing due right now. Assignments from your classes will show here with their due dates.</p>
            </Panel>
          )}
        </div>
      </StudyShell>
    );
  }

  return (
    <StudyShell>
      {header}

      {/* Subject filter */}
      {subjects.length > 1 && (
        <div className="lp-fade -mx-1 mt-6 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" style={{ animationDelay: "40ms", animationFillMode: "both" }}>
          <button
            type="button"
            aria-pressed={!subject}
            onClick={() => setSubject(null)}
            className={cn("h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium", !subject ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white")}
          >
            All subjects
          </button>
          {stats.map((s) => (
            <button
              key={s.subject}
              type="button"
              aria-pressed={subject === s.subject}
              onClick={() => setSubject(subject === s.subject ? null : s.subject)}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium",
                subject === s.subject ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white",
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: colorFor(s.subject, subjects) }} />
              {s.subject}
              <span className="tabular-nums text-lp-mute">{Math.round(s.pct)}%</span>
            </button>
          ))}
        </div>
      )}

      {/* Hero + goal planner */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Panel className="relative overflow-hidden p-6">
          <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl" style={{ background: `radial-gradient(circle, ${toneHex[st.tone]}, transparent 70%)` }} />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <Ring
              value={overall}
              size={148}
              stroke={11}
              tone={st.tone}
              label={
                <span className="flex flex-col items-center leading-none">
                  <span className="text-[38px] font-semibold tracking-[-0.03em] text-white">{gradeIn(overall, system)}</span>
                  <span className="mt-1.5 text-[12px] font-medium text-lp-mute">{shown}%</span>
                </span>
              }
              className="mx-auto sm:mx-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">{subject ?? "Overall"}</p>
              <h2 className="mt-1 text-[22px] font-semibold leading-snug tracking-[-0.02em] text-white">
                {system?.code === "ib" ? `Grade ${gradeIn(overall, system)} of 7` : `${gradeIn(overall, system)} average`}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ color: tone(toneHex[st.tone]), background: `${toneHex[st.tone]}1F` }}>
                  {st.label}
                </span>
                <TrendChip delta={trend} />
                {gpa !== null && <span className={chip}>GPA {gpa.toFixed(2)}</span>}
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-lp-soft">
                {nextBand ? (
                  <>
                    You're <span className="font-semibold text-white">{(nextBand.min - overall).toFixed(1)} points</span> from a{" "}
                    <span className="font-semibold text-lp-cyan">{nextBand.label}</span>.
                  </>
                ) : (
                  <>You're in the top band. Keep it steady.</>
                )}{" "}
                {trend !== null && Math.abs(trend) >= 1 && (trend > 0 ? "Your recent work is trending up." : "Your recent scores have dipped a little.")}
              </p>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(subject
              ? [
                  { label: "Graded work", value: `${scoped.length}`, icon: Award },
                  { label: "Class", value: scoped[0]?.className ?? subject, icon: BookOpen },
                  { label: "Best piece", value: bestPiece ? `${Math.round(bestPiece.pct)}%` : "–", sub: bestPiece?.title, icon: TrendingUp },
                  { label: "Latest", value: latestPiece ? `${Math.round(latestPiece.pct)}%` : "–", sub: latestPiece ? format(new Date(latestPiece.gradedAt), "d MMM") : undefined, icon: Sparkles },
                ]
              : [
                  { label: "Graded work", value: `${scoped.length}`, icon: Award },
                  { label: "Subjects", value: `${stats.length}`, icon: BookOpen },
                  { label: "Best subject", value: stats[0] ? `${stats[0].subject}` : "–", sub: stats[0] ? `${Math.round(stats[0].pct)}%` : undefined, icon: TrendingUp },
                  { label: "Most improved", value: mostImproved ? mostImproved.subject : "–", sub: mostImproved ? `+${mostImproved.trend!.toFixed(1)} pts` : "Needs 2+ grades", icon: Sparkles },
                ]
            ).map((k) => (
              <div key={k.label} className="rounded-2xl border border-lp-line bg-lp-deep/50 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[11px] text-lp-mute">
                  <k.icon className="h-3.5 w-3.5 text-lp-sky" /> {k.label}
                </p>
                <p className="mt-0.5 truncate text-[15px] font-semibold text-white">{k.value}</p>
                {k.sub && <p className="truncate text-[11px] text-lp-mute">{k.sub}</p>}
              </div>
            ))}
          </div>

          <div className="relative mt-5 flex flex-wrap gap-2">
            <Link to={planLink} className={primaryBtn}>
              <Sparkles className="h-4 w-4" /> Ask Refyn for a plan
            </Link>
            <button type="button" onClick={exportCsv} className={ghostBtn}>
              <Download className="h-4 w-4" /> Download CSV
            </button>
          </div>
        </Panel>

        <GoalPlanner items={scoped} system={system} target={goal} setTarget={setTarget} />
      </div>

      {/* Timeline + distribution */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-2" delay={100}>
          <PanelHead
            title="Over time"
            icon={BarChart3}
            meta={
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded bg-lp-sky" /> Score
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0 w-4 border-t border-dashed border-lp-cyan" /> Goal
                </span>
              </span>
            }
          />
          <div className="mt-3">
            <Timeline items={scoped} subjects={subjects} system={system} goal={goal} goalLabel={`Goal · ${gradeIn(goal, system)}`} />
          </div>
        </Panel>
        <Panel className="p-5" delay={140}>
          <PanelHead title="Distribution" icon={GraduationCap} meta={<span>{system?.name}</span>} />
          <div className="mt-4">
            <Distribution bands={bands} total={scoped.length} />
          </div>
        </Panel>
      </div>

      {/* Subjects */}
      {stats.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-medium text-white">
            <BookOpen className="h-4 w-4 text-lp-sky" /> By subject
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s, i) => (
              <SubjectCard
                key={s.subject}
                stat={s}
                color={colorFor(s.subject, subjects)}
                system={system}
                active={subject === s.subject}
                onClick={() => setSubject(subject === s.subject ? null : s.subject)}
                badge={i === 0 && stats.length > 1 ? "Strongest" : mostImproved?.subject === s.subject ? "Most improved" : undefined}
                delay={60 + i * 45}
              />
            ))}
          </div>
        </section>
      )}

      {/* Feedback */}
      {feedback.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-medium text-white">
            <MessageSquareQuote className="h-4 w-4 text-lp-sky" /> What your teachers said
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {feedback.map((g, i) => (
              <FeedbackCard key={g.id} g={g} color={colorFor(g.subject, subjects)} system={system} delay={60 + i * 45} />
            ))}
          </div>
        </section>
      )}

      {/* All work + side panels */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel className="p-5" delay={120}>
          <PanelHead title="All graded work" icon={Award} meta={<span>{list.length} shown</span>} />
          <div className="mt-4 flex flex-wrap gap-2">
            <label className="relative min-w-[180px] flex-1">
              <span className="sr-only">Search graded work</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles and feedback"
                className="h-10 w-full rounded-xl border border-lp-line bg-lp-surface pl-9 pr-3 text-[13.5px] text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none"
              />
            </label>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={selectCls} aria-label="Sort">
              <option value="new">Newest first</option>
              <option value="old">Oldest first</option>
              <option value="high">Highest score</option>
              <option value="low">Lowest score</option>
            </select>
          </div>
          <ul className="mt-3 divide-y divide-lp-line/70">
            {(showAll ? list : list.slice(0, 8)).map((g) => {
              const open = expanded === g.id;
              const c = toneHex[toneOf(g.pct)];
              return (
                <li key={g.id}>
                  <button type="button" onClick={() => setExpanded(open ? null : g.id)} aria-expanded={open} className="flex w-full items-center gap-3 py-3 text-left">
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: colorFor(g.subject, subjects) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-white">{g.title}</span>
                      <span className="block truncate text-[11.5px] text-lp-mute">
                        {g.subject} · {format(new Date(g.gradedAt), "d MMM yyyy")}
                      </span>
                    </span>
                    <span className="hidden w-28 shrink-0 sm:block">
                      <span className="block h-1.5 overflow-hidden rounded-full bg-lp-line">
                        <span className="block h-full rounded-full" style={{ width: `${g.pct}%`, background: c }} />
                      </span>
                    </span>
                    <span className="w-12 shrink-0 text-right text-[13px] tabular-nums text-lp-soft">{Math.round(g.pct)}%</span>
                    <GradePill pct={g.pct} system={system} className="shrink-0" />
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-lp-mute transition-transform", open && "rotate-180")} />
                  </button>
                  {open && (
                    <div className="lp-fade mb-3 ml-4 rounded-xl border border-lp-line bg-lp-deep/50 p-3 text-[13px] text-lp-soft" style={{ animationFillMode: "both" }}>
                      <p>
                        Scored <span className="font-semibold text-white">{g.grade}/{g.max}</span>
                        {g.className ? ` in ${g.className}` : ""}.
                      </p>
                      <p className="mt-1.5 leading-relaxed">{g.feedback ?? <span className="text-lp-mute">No written feedback on this one.</span>}</p>
                    </div>
                  )}
                </li>
              );
            })}
            {list.length === 0 && <li className="py-8 text-center text-[13px] text-lp-mute">Nothing matches "{query}".</li>}
          </ul>
          {list.length > 8 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className={cn(ghostBtn, "mt-3 h-9 w-full")}>
              {showAll ? "Show fewer" : `Show all ${list.length}`}
            </button>
          )}
        </Panel>

        <div className="space-y-4">
          {upcomingPanel}
          {practicePanel}
          <Panel className="p-5" delay={220}>
            <PanelHead title="Next step" icon={ArrowRight} />
            <p className="mt-2 text-[13.5px] leading-relaxed text-lp-soft">
              {weakest && stats.length > 1 ? (
                <>
                  <span className="font-semibold text-white">{weakest.subject}</span> is where extra practice pays off most right now ({Math.round(weakest.pct)}%).
                </>
              ) : (
                <>Keep practising little and often. Short, regular sessions beat long ones.</>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={planLink} className={cn(ghostBtn, "h-9")}>
                <Sparkles className="h-4 w-4 text-lp-cyan" /> Make a plan
              </Link>
              <Link to="/my-courses" className={cn(ghostBtn, "h-9")}>
                Practise
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </StudyShell>
  );
};

export default GradesPage;
