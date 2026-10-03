import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, isSameDay } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileQuestion,
  Gauge,
  HeartHandshake,
  Inbox,
  Layers,
  ListChecks,
  Mail,
  MessageSquare,
  NotebookPen,
  Plus,
  Radar,
  Send,
  Sparkles,
  Table2,
  TrendingUp,
  Timer,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SkyHero, { skyBtn } from "@/components/portal/SkyHero";
import { skyMood } from "@/components/portal/sky";
import ClassGalaxy from "@/components/world/ClassGalaxy";
import { StudyShell, primaryBtn } from "@/components/subjects/kit";
import { EmptyState, Panel, PanelHead, Ring, chip, ghostBtn, useCountUp } from "@/components/student/ui";
import { Sparkline } from "@/components/grades/parts";
import { monogram, themeFor } from "@/components/student/themes";
import { modKey, tone } from "@/lib/portalAppearance";
import { cn } from "@/lib/utils";
import {
  classStats,
  firstName,
  initialsOf,
  mean,
  needsMarking,
  pctOf,
  startOfWeek,
  studentRows,
  waited,
  weekLoad,
  useTeacherData,
} from "@/components/teacher/data";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const TOOLS = [
  { title: "Differentiate a lesson", body: "Support and stretch for every student", icon: Layers, to: "/intel/auto-iep", grad: "linear-gradient(135deg,#6366F1,#4338CA)" },
  { title: "Draft parent emails", body: "A warm weekly note per student", icon: Mail, to: "/intel/parent-brief", grad: "linear-gradient(135deg,#EC4899,#BE185D)" },
  { title: "At-risk radar", body: "Early warning across your classes", icon: Radar, to: "/intel/at-risk-radar", grad: "linear-gradient(135deg,#F97316,#C2410C)" },
  { title: "Deadline clashes", body: "Spread the load before it piles up", icon: CalendarClock, to: "/intel/curriculum-conflict", grad: "linear-gradient(135deg,#14B8A6,#0F766E)" },
  { title: "Plan a unit", body: "Lessons, activities and checks", icon: NotebookPen, to: "/teacher-plan-generator", grad: "linear-gradient(135deg,#3B82F6,#1D4ED8)" },
  {
    title: "Build a rubric",
    body: "MYP criteria A–D, ready to share",
    icon: ListChecks,
    to: `/ai-learning-assistant?prompt=${encodeURIComponent("Write an IB MYP rubric (criteria A–D, bands 1–8) for this task: ")}`,
    grad: "linear-gradient(135deg,#A855F7,#6D28D9)",
  },
  {
    title: "Exit ticket",
    body: "Three quick checks for the end of class",
    icon: FileQuestion,
    to: `/ai-learning-assistant?prompt=${encodeURIComponent("Write a 3-question exit ticket (one recall, one apply, one explain) on: ")}`,
    grad: "linear-gradient(135deg,#10B981,#047857)",
  },
  {
    title: "Reteach a concept",
    body: "Two new ways to explain it",
    icon: HeartHandshake,
    to: `/ai-learning-assistant?prompt=${encodeURIComponent("Give me two fresh ways to reteach this concept to students who didn't get it the first time: ")}`,
    grad: "linear-gradient(135deg,#F43F5E,#BE123C)",
  },
];

const ASK_IDEAS = [
  "Write a 3-question exit ticket on photosynthesis",
  "Make a criterion B rubric for a persuasive speech",
  "Explain osmosis two ways for a mixed-ability class",
];

const reasonTone = { red: "#F2706A", amber: "#FBBF24", blue: "#7CB4FF" } as const;

const Stat: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string; delay: number; to?: string }> = ({
  icon: Icon,
  label,
  value,
  sub,
  accent = "#7CB4FF",
  delay,
  to,
}) => {
  const body = (
    <Panel className="h-full p-5 transition-colors hover:border-lp-sky/30" delay={delay}>
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${accent}1F`, color: tone(accent) }}>
          <Icon className="h-4 w-4" />
        </span>
        {to && <ArrowUpRight className="h-4 w-4 text-lp-mute" />}
      </div>
      <p className="mt-4 text-[30px] font-semibold leading-none tracking-[-0.03em] text-white tabular-nums">{value}</p>
      <p className="mt-1.5 text-[13px] text-lp-soft">{label}</p>
      {sub && <p className="mt-0.5 text-[12px] text-lp-mute">{sub}</p>}
    </Panel>
  );
  return to ? (
    <Link to={to} className="block rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-lp-sky">
      {body}
    </Link>
  ) : (
    body
  );
};

const Avatar: React.FC<{ name: string; size?: "sm" | "md" }> = ({ name, size = "md" }) => {
  const t = themeFor(name);
  return (
    <span
      className={cn("lp-keep flex shrink-0 items-center justify-center rounded-full font-semibold text-white", size === "sm" ? "h-8 w-8 text-[11px]" : "h-9 w-9 text-[12px]")}
      style={{ background: t.gradient }}
    >
      {initialsOf(name)}
    </span>
  );
};

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading } = useTeacherData();
  const [ask, setAsk] = useState("");
  const now = Date.now();

  const stats = useMemo(() => classStats(data, now), [data, now]);
  const rows = useMemo(() => studentRows(data, now), [data, now]);
  const flagged = useMemo(() => rows.filter((r) => r.reasons.length).sort((a, b) => b.risk - a.risk), [rows]);
  const queue = useMemo(() => data.submissions.filter(needsMarking).sort((a, b) => (a.submitted_at < b.submitted_at ? -1 : 1)), [data]);
  const week = useMemo(() => weekLoad(data, startOfWeek(new Date(now))), [data, now]);
  const dueThisWeek = week.reduce((n, d) => n + d.items.length, 0);

  const graded = data.submissions.map(pctOf).filter((x): x is number => x !== null);
  const avgAll = mean(graded);
  const recent = mean(data.submissions.filter((s) => s.graded_at && now - new Date(s.graded_at).getTime() < 30 * 86_400_000).map(pctOf).filter((x): x is number => x !== null));
  const older = mean(data.submissions.filter((s) => s.graded_at && now - new Date(s.graded_at).getTime() >= 30 * 86_400_000).map(pctOf).filter((x): x is number => x !== null));
  const handInAll = mean(stats.map((s) => s.handIn).filter((x): x is number => x !== null));
  const studentsCount = new Set(data.members.map((m) => m.student_id)).size;
  const toMarkShown = useCountUp(queue.length);

  const name = firstName(user?.fullName || user?.email?.split("@")[0] || "there");
  const summary = [
    queue.length ? `${queue.length} ${queue.length === 1 ? "piece" : "pieces"} to mark` : "nothing to mark",
    dueThisWeek ? `${dueThisWeek} ${dueThisWeek === 1 ? "deadline" : "deadlines"} this week` : "no deadlines this week",
    flagged.length ? `${flagged.length} ${flagged.length === 1 ? "student" : "students"} worth a check-in` : "every student on track",
  ];

  const askRefyn = (text: string) => {
    if (!text.trim()) return;
    navigate(`/ai-learning-assistant?prompt=${encodeURIComponent(text.trim())}`);
  };

  if (!loading && !data.classes.length) {
    return (
      <StudyShell wide>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">{format(now, "EEEE, d MMMM")}</p>
        <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.035em] text-white">
          {greeting()}, <span className="bg-gradient-to-r from-lp-sky via-[#A5CCFF] to-lp-cyan bg-clip-text text-transparent">{name}</span>
        </h1>
        <Panel className="mt-8 p-8">
          <EmptyState
            icon={Users}
            title="Create your first class"
            body="Add a class, share its six-character join code with students, and this page fills up with marking, hand-in rates and students to check on."
            action={
              <Link to="/classes?new=1" className={primaryBtn}>
                <Plus className="h-4 w-4" /> Create a class
              </Link>
            }
          />
        </Panel>
      </StudyShell>
    );
  }

  return (
    <StudyShell wide>
      {/* Header */}
      <SkyHero
        eyebrow={`${format(now, "EEEE, d MMMM")} · Week ${format(now, "w")} · ${skyMood()}`}
        title={
          <>
            {greeting()}, <span className="bg-gradient-to-r from-[#ffffff] via-[#dbeafe] to-[#a5f3fc] bg-clip-text text-transparent">{name}</span>
          </>
        }
        summary={`You have ${summary[0]}, ${summary[1]} and ${summary[2]}.`}
        actions={
          <>
            <Link to="/grades" className={skyBtn}>
              <Table2 className="h-4 w-4" /> Gradebook
            </Link>
            <Link to="/focus" className={skyBtn}>
              <Timer className="h-4 w-4" /> Class timer
            </Link>
            <Link to="/marking" className={cn(primaryBtn, "h-11 rounded-2xl")}>
              <ClipboardCheck className="h-4 w-4" /> {queue.length ? `Start marking (${queue.length})` : "Open marking"}
            </Link>
          </>
        }
      />

      {/* Ask Refyn */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          askRefyn(ask);
        }}
        className="lp-fade mt-6 rounded-3xl border border-lp-line bg-lp-surface/70 p-2 pl-4"
        style={{ animationDelay: "40ms", animationFillMode: "both" }}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4 shrink-0 text-lp-cyan" />
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            placeholder="Ask Refyn to plan, differentiate, write a rubric or draft feedback…"
            className="h-11 min-w-0 flex-1 bg-transparent text-[14.5px] text-white placeholder:text-lp-mute focus:outline-none"
            aria-label="Ask Refyn"
          />
          <button type="submit" disabled={!ask.trim()} className={cn(primaryBtn, "h-10 px-3.5")} aria-label="Ask Refyn">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 px-1 pb-1.5 pt-1">
          {ASK_IDEAS.map((idea) => (
            <button key={idea} type="button" onClick={() => askRefyn(idea)} className="rounded-full border border-lp-line px-3 py-1 text-[12px] text-lp-soft transition-colors hover:border-lp-sky/40 hover:text-white">
              {idea}
            </button>
          ))}
        </div>
      </form>

      <div className="lp-fade mt-6" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
        <ClassGalaxy data={data} />
      </div>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading && !data.classes.length ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="lp-skeleton h-[150px] rounded-3xl" />)
        ) : (
          <>
            <Stat icon={ClipboardList} label="To mark" value={Math.round(toMarkShown)} sub={queue.length ? `Oldest waiting ${waited(queue[0].submitted_at, now)}` : "All caught up"} accent="#7CB4FF" delay={60} to="/marking" />
            <Stat icon={Inbox} label="Hand-in rate" value={handInAll === null ? "—" : `${Math.round(handInAll)}%`} sub="On work already due" accent="#34D399" delay={100} />
            <Stat
              icon={Gauge}
              label="Class average"
              value={avgAll === null ? "—" : `${Math.round(avgAll)}%`}
              sub={
                recent !== null && older !== null ? (
                  <span className={recent >= older ? "text-lp-green" : "text-lp-red"}>
                    {recent >= older ? "▲" : "▼"} {Math.abs(Math.round(recent - older))} pts vs earlier work
                  </span>
                ) : (
                  "Across marked work"
                )
              }
              accent="#A78BFA"
              delay={140}
              to="/grades"
            />
            <Stat icon={Users} label="Students" value={studentsCount} sub={`Across ${data.classes.length} ${data.classes.length === 1 ? "class" : "classes"}`} accent="#FBBF24" delay={180} to="/classes" />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="min-w-0 space-y-6">
          {/* Marking queue */}
          <Panel className="p-5 sm:p-6" delay={120}>
            <PanelHead
              title="Marking queue"
              icon={ClipboardCheck}
              meta={
                <Link to="/marking" className="inline-flex items-center gap-1 text-lp-sky hover:text-white">
                  Open marking <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            {queue.length ? (
              <ul className="mt-4 divide-y divide-lp-line/70">
                {queue.slice(0, 6).map((s) => {
                  const a = data.assignments.find((x) => x.id === s.assignment_id);
                  const cls = data.classes.find((c) => c.id === a?.class_id);
                  const student = data.students[s.student_id];
                  const days = (now - new Date(s.submitted_at).getTime()) / 86_400_000;
                  const late = a?.due_date && new Date(s.submitted_at) > new Date(a.due_date);
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-3">
                      <Avatar name={student?.name ?? "Student"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-white">
                          {student?.name ?? "Student"} <span className="font-normal text-lp-mute">· {a?.title ?? "Assignment"}</span>
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-lp-mute">
                          {cls && (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: themeFor(cls.subject).accent }} /> {cls.name}
                            </span>
                          )}
                          {late && <span className="rounded-full bg-lp-amber/15 px-1.5 py-px text-[10.5px] font-medium text-lp-amber">Late</span>}
                          {s.file_name && <span>· File attached</span>}
                        </p>
                      </div>
                      <span className={cn("hidden text-[12px] tabular-nums sm:block", days >= 5 ? "text-lp-red" : days >= 2 ? "text-lp-amber" : "text-lp-mute")}>
                        {waited(s.submitted_at, now)}
                      </span>
                      <Link to={`/marking?sub=${s.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg border border-lp-line px-3 text-[12.5px] font-medium text-lp-soft transition-colors hover:border-lp-sky/50 hover:text-white">
                        Mark
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={CheckCircle2} title="All caught up" body="New hand-ins will show up here, oldest first." className="py-8" />
            )}
            {queue.length > 6 && <p className="mt-2 text-[12.5px] text-lp-mute">+ {queue.length - 6} more waiting</p>}
          </Panel>

          {/* Class pulse */}
          <Panel className="p-5 sm:p-6" delay={160}>
            <PanelHead
              title="Class pulse"
              icon={TrendingUp}
              meta={
                <Link to="/classes" className="inline-flex items-center gap-1 text-lp-sky hover:text-white">
                  All classes <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {stats.map((s) => {
                const t = themeFor(s.cls.subject);
                return (
                  <div key={s.cls.id} className="group relative overflow-hidden rounded-2xl border border-lp-line bg-lp-deep/40 transition-colors hover:border-lp-sky/30">
                    <div className="lp-keep relative h-16 overflow-hidden" style={{ background: t.gradient }}>
                      <span aria-hidden className="absolute -bottom-3 right-3 select-none text-[56px] font-semibold leading-none tracking-[-0.06em] text-white/25">
                        {monogram(s.cls.name)}
                      </span>
                      <p className="absolute bottom-2.5 left-4 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/85">{s.cls.subject}</p>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link to={`/class/${s.cls.id}`} className="block truncate text-[15px] font-semibold text-white hover:text-lp-sky">
                            {s.cls.name}
                          </Link>
                          <p className="text-[12px] text-lp-mute">
                            {s.students} students · {s.assignments} assignments
                          </p>
                        </div>
                        <Ring value={s.avg ?? 0} size={46} stroke={5} tone={s.avg === null ? "blue" : s.avg >= 75 ? "green" : s.avg >= 60 ? "blue" : "amber"} label={<span className="text-[11px]">{s.avg === null ? "—" : Math.round(s.avg)}</span>} />
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between text-[11.5px] text-lp-mute">
                            <span>Hand-in</span>
                            <span className="tabular-nums text-lp-soft">{s.handIn === null ? "—" : `${Math.round(s.handIn)}%`}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-lp-line">
                            <div className="lp-bar-in h-full rounded-full" style={{ width: `${s.handIn ?? 0}%`, background: t.accent }} />
                          </div>
                        </div>
                        <Sparkline values={s.series} color={t.accent} className="h-8 w-24 shrink-0" />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                        {s.toMark > 0 ? (
                          <Link to={`/marking?class=${s.cls.id}`} className="rounded-full bg-lp-blue/15 px-2 py-0.5 font-medium text-lp-sky hover:bg-lp-blue/25">
                            {s.toMark} to mark
                          </Link>
                        ) : (
                          <span className="rounded-full bg-lp-green/10 px-2 py-0.5 font-medium text-lp-green">Marked up</span>
                        )}
                        {s.nextDue && (
                          <span className="truncate text-lp-mute">
                            Next: <span className="text-lp-soft">{s.nextDue.title}</span> · {format(new Date(s.nextDue.due_date!), "EEE d MMM")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* AI toolkit */}
          <Panel className="p-5 sm:p-6" delay={200}>
            <PanelHead title="AI toolkit" icon={Sparkles} meta="Refyn does the first draft, you decide" />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TOOLS.map((t) => (
                <Link key={t.title} to={t.to} className="group rounded-2xl border border-lp-line bg-lp-deep/40 p-4 transition-all hover:-translate-y-0.5 hover:border-lp-sky/40">
                  <span className="lp-keep flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: t.grad }}>
                    <t.icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-[14px] font-medium text-white">{t.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-lp-mute">{t.body}</p>
                </Link>
              ))}
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          {/* Students to check on */}
          <Panel className="p-5 sm:p-6" delay={140}>
            <PanelHead title="Students to check on" icon={AlertTriangle} meta={flagged.length ? `${flagged.length} flagged` : undefined} />
            {flagged.length ? (
              <ul className="mt-4 space-y-2.5">
                {flagged.slice(0, 6).map((r) => (
                  <li key={r.student.id} className="rounded-2xl border border-lp-line bg-lp-deep/40 p-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.student.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-white">{r.student.name}</p>
                        <p className="truncate text-[11.5px] text-lp-mute">
                          {r.classIds.map((id) => data.classes.find((c) => c.id === id)?.name).filter(Boolean).join(", ")}
                        </p>
                      </div>
                      <Link to={`/messages?to=${r.student.id}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white" title="Message" aria-label={`Message ${r.student.name}`}>
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                      <Link to={`/grades?student=${r.student.id}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white" title="Open in gradebook" aria-label={`Open ${r.student.name} in gradebook`}>
                        <Table2 className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-11">
                      {r.reasons.map((x) => (
                        <span key={x.text} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: tone(reasonTone[x.tone]), background: `${reasonTone[x.tone]}1A` }}>
                          {x.text}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={CheckCircle2} title="Everyone looks on track" body="Nobody has missing work, a low average or a sharp drop right now." className="py-8" />
            )}
            <p className="mt-4 text-[11.5px] leading-relaxed text-lp-mute">
              Based on missing work, averages and recent trends in your classes. Only you see this.{" "}
              <Link to="/intel/at-risk-radar" className="text-lp-sky hover:text-white">
                Run the full radar
              </Link>
            </p>
          </Panel>

          {/* This week */}
          <Panel className="p-5 sm:p-6" delay={180}>
            <PanelHead title="This week" icon={CalendarDays} meta={`${dueThisWeek} due`} />
            <ol className="mt-4 space-y-1.5">
              {week.map((d) => {
                const today = isSameDay(d.date, now);
                return (
                  <li key={d.date.toISOString()} className={cn("flex gap-3 rounded-2xl px-3 py-2.5", today ? "bg-lp-blue/10 ring-1 ring-inset ring-lp-sky/25" : "")}>
                    <div className="w-11 shrink-0 text-center">
                      <p className={cn("text-[10.5px] font-medium uppercase tracking-[0.14em]", today ? "text-lp-sky" : "text-lp-mute")}>{format(d.date, "EEE")}</p>
                      <p className={cn("text-[17px] font-semibold tabular-nums", today ? "text-white" : "text-lp-soft")}>{format(d.date, "d")}</p>
                    </div>
                    <div className="min-w-0 flex-1 self-center">
                      {d.items.length ? (
                        <ul className="space-y-1">
                          {d.items.map((a) => {
                            const cls = data.classes.find((c) => c.id === a.class_id);
                            return (
                              <li key={a.id} className="flex items-center gap-2 text-[13px]">
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: themeFor(cls?.subject).accent }} />
                                <span className="truncate text-white">{a.title}</span>
                                <span className="hidden shrink-0 text-[11.5px] text-lp-mute sm:inline">{cls?.name}</span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-[12.5px] text-lp-mute">No deadlines</p>
                      )}
                      {d.clash && (
                        <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-lp-amber/15 px-2 py-0.5 text-[11px] font-medium text-lp-amber">
                          <AlertTriangle className="h-3 w-3" /> {d.clash.shared} {d.clash.shared === 1 ? "student has" : "students have"} two deadlines
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>

          <Panel className="p-5" delay={220}>
            <div className="flex flex-wrap gap-2">
              <Link to="/classes?new=1" className={cn(chip, "px-3 py-1.5 text-[12.5px] hover:border-lp-sky/40 hover:text-white")}>
                <Plus className="h-3.5 w-3.5" /> New class
              </Link>
              <Link to="/messages" className={cn(chip, "px-3 py-1.5 text-[12.5px] hover:border-lp-sky/40 hover:text-white")}>
                <MessageSquare className="h-3.5 w-3.5" /> Messages
              </Link>
              <Link to="/library" className={cn(chip, "px-3 py-1.5 text-[12.5px] hover:border-lp-sky/40 hover:text-white")}>
                <ClipboardList className="h-3.5 w-3.5" /> Content library
              </Link>
              <Link to="/student-portfolios" className={cn(chip, "px-3 py-1.5 text-[12.5px] hover:border-lp-sky/40 hover:text-white")}>
                <Users className="h-3.5 w-3.5" /> Portfolios
              </Link>
            </div>
            <p className="mt-3 text-[12px] text-lp-mute">
              Tip: press <kbd className="rounded border border-lp-line px-1 text-[11px]">{modKey()} K</kbd> to jump to any class, student or assignment.
            </p>
          </Panel>
        </div>
      </div>
    </StudyShell>
  );
};

export default TeacherDashboard;
