import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AlertOctagon, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Minus, Target, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { StudyShell } from "@/components/subjects/kit";
import { useTeacherData } from "@/components/teacher/data";
import { MYP, type Letter, type MypGroup } from "@/lib/myp";
import { TrendChart, CRIT_COLOR } from "@/components/progress/TrendChart";
import { classProgress, criteriaIn, myMarks, seriesOf, summary, warningsOf, type ClassProgress, type Mark } from "@/components/progress/data";

const card = "rounded-2xl border border-lp-line bg-lp-surface";
const band = (lv: number) => (lv >= 7 ? 4 : lv >= 5 ? 3 : lv >= 3 ? 2 : 1);

const Delta: React.FC<{ now: number; before: number | null }> = ({ now, before }) => {
  if (before === null) return <span className="text-[12px] text-lp-mute">first mark</span>;
  const d = Math.round((now - before) * 10) / 10;
  if (d === 0) return <span className="inline-flex items-center gap-1 text-[12px] text-lp-mute"><Minus className="h-3.5 w-3.5" /> same as last time</span>;
  return d > 0
    ? <span className="inline-flex items-center gap-1 text-[12px] text-emerald-300"><ArrowUpRight className="h-3.5 w-3.5" /> up {d} from last time</span>
    : <span className="inline-flex items-center gap-1 text-[12px] text-rose-300"><ArrowDownRight className="h-3.5 w-3.5" /> down {Math.abs(d)} from last time</span>;
};

const groupsIn = (marks: Mark[]) => [...new Set(marks.map((m) => m.group))] as MypGroup[];

/* ---------- students ---------- */

const StudentProgress: React.FC<{ userId: string }> = ({ userId }) => {
  const [marks, setMarks] = useState<Mark[] | null>(null);
  useEffect(() => { myMarks(userId).then(setMarks, () => setMarks([])); }, [userId]);
  if (!marks) return <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="lp-skeleton h-40 rounded-2xl" />)}</div>;
  if (!marks.length) {
    return (
      <div className="rounded-3xl border border-dashed border-lp-line p-10 text-center">
        <TrendingUp className="mx-auto h-7 w-7 text-lp-mute" />
        <p className="mt-2 text-[15px] text-white">Your progress shows up here</p>
        <p className="mx-auto mt-1 max-w-[460px] text-[13px] text-lp-mute">Once a teacher marks one of your tasks with the MYP rubric, you'll see each criterion's level here and how it changes from task to task.</p>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {groupsIn(marks).map((g) => {
        const ms = marks.filter((m) => m.group === g);
        const crit = criteriaIn(ms);
        const stats = crit.map((l) => ({ l, s: summary(ms, l)! }));
        const latest = ms[ms.length - 1];
        const ranked = [...stats].sort((a, b) => b.s.average - a.s.average);
        return (
          <section key={g}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-white">{MYP[g].name}</h2>
              <p className="text-[12.5px] text-lp-mute">{ms.length} marked task{ms.length === 1 ? "" : "s"}{ranked.length > 1 ? ` · strongest: ${ranked[0].l} · focus: ${ranked[ranked.length - 1].l}` : ""}</p>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              {stats.map(({ l, s }) => (
                <div key={l} className={cn(card, "p-4")}>
                  <p className="flex items-center gap-2 truncate text-[12px] text-lp-mute"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CRIT_COLOR[l] }} />{l} · {MYP[g].criteria[l].name}</p>
                  <p className="mt-1.5 text-[28px] font-semibold leading-none text-white">{s.latest}<span className="text-[14px] font-normal text-lp-mute">/8</span></p>
                  <p className="mt-1.5"><Delta now={s.latest} before={s.previous} /></p>
                  <p className="mt-1 text-[11.5px] text-lp-mute">average {s.average} over {s.count} task{s.count === 1 ? "" : "s"}</p>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <TrendChart data={seriesOf(ms)} criteria={crit} group={g} title="Your levels, task by task" caption="Each point is a task your teacher marked against the MYP criteria (0–8)." />
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {latest.targets.length > 0 && (
                <div className="rounded-2xl border border-lp-sky/40 bg-lp-blue/10 p-4">
                  <p className="flex items-center gap-2 text-[14px] font-medium text-white"><Target className="h-4 w-4 text-lp-sky" /> What to work on next</p>
                  <ol className="mt-2 space-y-1.5">{latest.targets.map((t, i) => <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-lp-soft"><span className="font-semibold text-lp-sky">{i + 1}</span>{t}</li>)}</ol>
                  <Link to={`/task/${latest.taskId}`} className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-lp-sky hover:underline">From "{latest.title}" <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              )}
              <div className={cn(card, "p-4")}>
                <p className="text-[14px] font-medium text-white">Marked tasks</p>
                <ul className="mt-2 divide-y divide-lp-line">
                  {[...ms].reverse().slice(0, 8).map((m) => (
                    <li key={m.taskId}>
                      <Link to={`/task/${m.taskId}`} className="flex items-center gap-3 py-2 hover:text-white">
                        <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] text-white">{m.title}</span><span className="block text-[11.5px] text-lp-mute">{m.className} · {format(new Date(m.at), "d MMM")}</span></span>
                        <span className="flex shrink-0 gap-1">{crit.filter((l) => typeof m.levels[l] === "number").map((l) => <span key={l} className="rounded-md bg-lp-raised px-1.5 py-0.5 text-[11.5px] tabular-nums text-lp-soft">{l} {m.levels[l]}</span>)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};

/* ---------- teachers ---------- */

const ClassView: React.FC = () => {
  const { data } = useTeacherData();
  const [classId, setClassId] = useState("");
  const [cp, setCp] = useState<ClassProgress | null>(null);
  useEffect(() => { if (!classId && data.classes.length) setClassId(data.classes[0].id); }, [data.classes, classId]);
  const cls = data.classes.find((c) => c.id === classId);
  useEffect(() => {
    if (!cls) return;
    setCp(null);
    classProgress(cls.id, cls.name).then(setCp, () => setCp({ students: [], marks: [], missing: {} }));
  }, [cls]);
  const groups = useMemo(() => (cp ? groupsIn(cp.marks) : []), [cp]);
  const [group, setGroup] = useState<MypGroup | null>(null);
  useEffect(() => { setGroup(groups[0] ?? null); }, [groups]);
  const warnings = useMemo(() => (cp ? warningsOf(cp) : []), [cp]);

  if (!data.classes.length) return <p className="rounded-3xl border border-dashed border-lp-line p-10 text-center text-[13.5px] text-lp-mute">Create a class to see its progress here.</p>;
  const ms = cp && group ? cp.marks.filter((m) => m.group === group) : [];
  const crit = criteriaIn(ms);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class" className="h-10 rounded-xl border border-lp-line bg-lp-deep/60 px-3 text-[14px] text-white outline-none focus:border-lp-blue/60">
          {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {groups.length > 1 && groups.map((g) => (
          <button key={g} type="button" onClick={() => setGroup(g)} className={cn("h-10 rounded-xl border px-3 text-[13px]", group === g ? "border-lp-sky/60 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white")}>{MYP[g].name}</button>
        ))}
      </div>

      {!cp ? <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="lp-skeleton h-40 rounded-2xl" />)}</div> : (
        <>
          <section className={cn(card, "p-4 sm:p-5")}>
            <p className="text-[14.5px] font-medium text-white">Early warnings</p>
            <p className="mt-0.5 text-[12.5px] text-lp-mute">A criterion in the 1–2 band, a drop of two or more levels from a student's own average, or two or more tasks past their deadline.</p>
            {warnings.length ? (
              <ul className="mt-3 divide-y divide-lp-line">
                {warnings.map((w, i) => {
                  const Icon = w.severity === "critical" ? AlertOctagon : AlertTriangle;
                  return (
                    <li key={i} className="flex flex-wrap items-start gap-3 py-2.5">
                      <span className={cn("mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold", w.severity === "critical" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300")}><Icon className="h-3.5 w-3.5" />{w.severity === "critical" ? "Act now" : "Watch"}</span>
                      <span className="min-w-0 flex-1"><span className="block text-[13.5px] text-white"><span className="font-medium">{w.name}</span> · {w.label}</span><span className="block text-[12px] text-lp-mute">{w.detail}</span></span>
                      <span className="flex shrink-0 gap-3 text-[12.5px]"><Link to={w.link} className="text-lp-sky hover:underline">Open task</Link><Link to="/messages" className="text-lp-sky hover:underline">Message</Link></span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-3 text-[13px] text-lp-soft">Nothing to flag right now.</p>}
          </section>

          {!group ? (
            <div className="rounded-3xl border border-dashed border-lp-line p-10 text-center">
              <Users className="mx-auto h-7 w-7 text-lp-mute" />
              <p className="mt-2 text-[15px] text-white">No rubric marks yet for {cls?.name}</p>
              <p className="mx-auto mt-1 max-w-[480px] text-[13px] text-lp-mute">Set a task with an MYP rubric, pre-mark the hand-ins from its task page, and save the approved marks to the gradebook. Levels then build up here, task by task.</p>
            </div>
          ) : (
            <>
              <section className={cn(card, "p-4 sm:p-5")}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[14.5px] font-medium text-white">Latest level per student</p>
                  <ul className="flex items-center gap-1.5 text-[11.5px] text-lp-mute" aria-label="Level bands">
                    {["1–2", "3–4", "5–6", "7–8"].map((b, i) => <li key={b} className="flex items-center gap-1"><span className="h-3 w-5 rounded" style={{ background: `var(--band-${i + 1})` }} />{b}</li>)}
                  </ul>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-[13px]">
                    <thead><tr className="text-left text-[12px] text-lp-mute"><th className="sticky left-0 bg-lp-surface py-2 pr-3 font-medium">Student</th>{crit.map((l) => <th key={l} className="px-1 py-2 text-center font-medium" title={MYP[group].criteria[l].name}>{l}</th>)}<th className="px-2 py-2 text-center font-medium">Marked</th><th className="px-2 py-2 text-center font-medium">Missing</th></tr></thead>
                    <tbody>
                      {cp.students.map((st) => {
                        const mine = ms.filter((m) => m.studentId === st.id);
                        return (
                          <tr key={st.id} className="border-t border-lp-line">
                            <td className="sticky left-0 max-w-[160px] truncate bg-lp-surface py-1.5 pr-3 text-white">{st.name}</td>
                            {crit.map((l) => {
                              const s = summary(mine, l);
                              return (
                                <td key={l} className="px-1 py-1.5 text-center">
                                  {s ? (
                                    <span title={`Latest ${s.latest}, average ${s.average} over ${s.count}`} className="inline-flex h-8 min-w-11 items-center justify-center gap-0.5 rounded-lg px-1.5 font-semibold tabular-nums" style={{ background: `var(--band-${band(s.latest)})`, color: `var(--band-ink-${band(s.latest)})` }}>
                                      {s.latest}{s.previous !== null && s.latest !== s.previous && (s.latest > s.previous ? <ArrowUpRight className="h-3.5 w-3.5" aria-label="up" /> : <ArrowDownRight className="h-3.5 w-3.5" aria-label="down" />)}
                                    </span>
                                  ) : <span className="text-lp-mute">–</span>}
                                </td>
                              );
                            })}
                            <td className="px-2 text-center tabular-nums text-lp-soft">{new Set(mine.map((m) => m.taskId)).size}</td>
                            <td className={cn("px-2 text-center tabular-nums", (cp.missing[st.id]?.length ?? 0) >= 2 ? "font-semibold text-rose-300" : "text-lp-soft")}>{cp.missing[st.id]?.length ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
              <TrendChart data={seriesOf(ms)} criteria={crit} group={group} title={`${cls?.name}: class average by criterion`} caption="Each point averages the students marked on that task." />
            </>
          )}
        </>
      )}
    </div>
  );
};

const ProgressPage = () => {
  const { user } = useAuth();
  if (!user) return null;
  const teacher = user.role === "teacher" || user.role === "admin";
  return (
    <StudyShell wide>
      <header className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">MYP criteria</p>
        <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">{teacher ? "Class progress" : "Your progress"}</h1>
        <p className="mt-1.5 max-w-[680px] text-[14.5px] text-lp-soft">{teacher ? "Every rubric-marked task adds to this: where each student is on each criterion, how the class is moving, and who needs a word." : "How each criterion is moving from task to task, and what to work on next."}</p>
      </header>
      {teacher ? <ClassView /> : <StudentProgress userId={user.id} />}
    </StudyShell>
  );
};

export default ProgressPage;
