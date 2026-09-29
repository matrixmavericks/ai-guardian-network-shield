import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, ClipboardCheck, Download, Gauge, Inbox, Minus, Plus, Table2, TriangleAlert, Users } from "lucide-react";
import { StudyShell, primaryBtn, selectCls } from "@/components/subjects/kit";
import { EmptyState, Panel, ghostBtn } from "@/components/student/ui";
import { downloadMarkdown } from "@/components/assistant/storage";
import { themeFor } from "@/components/student/themes";
import { tone } from "@/lib/portalAppearance";
import { cn } from "@/lib/utils";
import { convertPercentageToGrade, fetchGradingSystems, type GradingSystem } from "@/services/gradingService";
import { initialsOf, isGraded, mean, pctOf, studentRows, studentsOf, useTeacherData, type TSubmission } from "@/components/teacher/data";

type Sort = "name" | "high" | "low" | "missing";

const cellTone = (p: number) => (p >= 85 ? "#34D399" : p >= 70 ? "#7CB4FF" : p >= 55 ? "#FBBF24" : "#F2706A");

const Gradebook = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, loading } = useTeacherData();
  const [systems, setSystems] = useState<GradingSystem[]>([]);
  const [useScale, setUseScale] = useState(false);
  const [sort, setSort] = useState<Sort>("name");
  const focusStudent = params.get("student");
  const rowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    fetchGradingSystems().then(setSystems).catch(() => setSystems([]));
  }, []);

  const classId = useMemo(() => {
    const fromUrl = params.get("class");
    if (fromUrl && data.classes.some((c) => c.id === fromUrl)) return fromUrl;
    if (focusStudent) {
      const m = data.members.find((x) => x.student_id === focusStudent);
      if (m) return m.class_id;
    }
    return data.classes[0]?.id ?? "";
  }, [params, data.classes, data.members, focusStudent]);

  const cls = data.classes.find((c) => c.id === classId) ?? null;
  const system = cls?.grading_system_id ? systems.find((s) => s.id === cls.grading_system_id) ?? null : null;
  const show = (p: number) => (useScale && system ? convertPercentageToGrade(p, system) : `${Math.round(p)}`);

  const assignments = useMemo(
    () => data.assignments.filter((a) => a.class_id === classId).sort((a, b) => ((a.due_date ?? a.created_at) < (b.due_date ?? b.created_at) ? -1 : 1)),
    [data.assignments, classId],
  );
  const students = useMemo(() => studentsOf(data, classId), [data, classId]);
  const rowsInfo = useMemo(() => new Map(studentRows(data).map((r) => [r.student.id, r])), [data]);
  const subFor = useMemo(() => {
    const m = new Map<string, TSubmission>();
    const ids = new Set(assignments.map((a) => a.id));
    for (const s of data.submissions) if (ids.has(s.assignment_id)) m.set(`${s.student_id}:${s.assignment_id}`, s);
    return m;
  }, [data.submissions, assignments]);

  const now = Date.now();
  const rows = useMemo(() => {
    const list = students.map((st) => {
      const pcts: number[] = [];
      let missing = 0;
      let toMark = 0;
      for (const a of assignments) {
        const s = subFor.get(`${st.id}:${a.id}`);
        const p = s ? pctOf(s) : null;
        if (p !== null) pcts.push(p);
        else if (s && !isGraded(s)) toMark++;
        else if (!s && a.due_date && new Date(a.due_date).getTime() < now) missing++;
      }
      return { st, avg: mean(pcts), missing, toMark, trend: rowsInfo.get(st.id)?.trend ?? null };
    });
    const byName = (a: (typeof list)[number], b: (typeof list)[number]) => a.st.name.localeCompare(b.st.name);
    return list.sort((a, b) =>
      sort === "name" ? byName(a, b) : sort === "missing" ? b.missing - a.missing || byName(a, b) : sort === "high" ? (b.avg ?? -1) - (a.avg ?? -1) : (a.avg ?? 101) - (b.avg ?? 101),
    );
  }, [students, assignments, subFor, rowsInfo, sort, now]);

  const colStats = assignments.map((a) => {
    const subs = students.map((st) => subFor.get(`${st.id}:${a.id}`)).filter(Boolean) as TSubmission[];
    return { avg: mean(subs.map(pctOf).filter((x): x is number => x !== null)), inCount: subs.length };
  });
  const classAvg = mean(rows.map((r) => r.avg).filter((x): x is number => x !== null));
  const pastDue = assignments.filter((a) => a.due_date && new Date(a.due_date).getTime() < now);
  const handIn = pastDue.length && students.length ? (pastDue.reduce((n, a) => n + students.filter((st) => subFor.has(`${st.id}:${a.id}`)).length, 0) / (pastDue.length * students.length)) * 100 : null;
  const toMark = rows.reduce((n, r) => n + r.toMark, 0);
  const missing = rows.reduce((n, r) => n + r.missing, 0);

  useEffect(() => {
    if (focusStudent) rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusStudent, classId, rows.length]);

  const pickClass = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("class", id);
    next.delete("student");
    setParams(next, { replace: true });
  };

  const exportCsv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const head = ["Student", ...assignments.map((a) => a.title), "Average"].map(esc).join(",");
    const body = rows.map((r) =>
      [
        r.st.name,
        ...assignments.map((a) => {
          const s = subFor.get(`${r.st.id}:${a.id}`);
          const p = s ? pctOf(s) : null;
          return p !== null ? `${s!.grade}/${s!.max_grade}` : s ? "To mark" : a.due_date && new Date(a.due_date).getTime() < now ? "Missing" : "";
        }),
        r.avg === null ? "" : `${r.avg.toFixed(1)}%`,
      ]
        .map((v) => esc(String(v)))
        .join(","),
    );
    downloadMarkdown(`refyn-gradebook-${(cls?.name ?? "class").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${format(now, "yyyy-MM-dd")}.csv`, [head, ...body].join("\n"));
  };

  if (!loading && !data.classes.length) {
    return (
      <StudyShell wide>
        <h1 className="text-[32px] font-semibold tracking-[-0.035em] text-white">Gradebook</h1>
        <Panel className="mt-6 p-8">
          <EmptyState
            icon={Table2}
            title="No classes yet"
            body="Create a class and add assignments. Every hand-in and mark lands here automatically."
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
      <header className="lp-fade flex flex-wrap items-end justify-between gap-4" style={{ animationFillMode: "both" }}>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">Teaching</p>
          <h1 className="mt-1 text-[32px] font-semibold tracking-[-0.035em] text-white">Gradebook</h1>
          <p className="mt-1 text-[14.5px] text-lp-soft">Every student and every piece of work in one grid. Click a mark to open it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {system && (
            <div className="inline-flex rounded-xl border border-lp-line bg-lp-surface/60 p-1">
              <button type="button" onClick={() => setUseScale(false)} className={cn("h-8 rounded-lg px-3 text-[12.5px] font-medium", !useScale ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>
                Percent
              </button>
              <button type="button" onClick={() => setUseScale(true)} className={cn("h-8 rounded-lg px-3 text-[12.5px] font-medium", useScale ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>
                {system.name.replace(/\s*\(.*\)$/, "")}
              </button>
            </div>
          )}
          <button type="button" onClick={exportCsv} disabled={!rows.length} className={ghostBtn}>
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <Link to={`/marking?class=${classId}`} className={primaryBtn}>
            <ClipboardCheck className="h-4 w-4" /> Mark this class
          </Link>
        </div>
      </header>

      {/* Class picker */}
      <div className="lp-fade mt-6 flex flex-wrap gap-2" style={{ animationDelay: "40ms", animationFillMode: "both" }}>
        {data.classes.map((c) => {
          const on = c.id === classId;
          const t = themeFor(c.subject);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => pickClass(c.id)}
              className={cn("inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13.5px] font-medium transition-colors", on ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white")}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: t.accent }} /> {c.name}
              <span className="text-[12px] font-normal text-lp-mute">{data.members.filter((m) => m.class_id === c.id).length}</span>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Gauge, label: "Class average", value: classAvg === null ? "—" : useScale && system ? convertPercentageToGrade(classAvg, system) : `${Math.round(classAvg)}%`, accent: "#A78BFA" },
          { icon: Inbox, label: "Hand-in rate", value: handIn === null ? "—" : `${Math.round(handIn)}%`, accent: "#34D399" },
          { icon: ClipboardCheck, label: "To mark", value: toMark, accent: "#7CB4FF", to: `/marking?class=${classId}` },
          { icon: TriangleAlert, label: "Missing pieces", value: missing, accent: "#F2706A" },
        ].map((s, i) => {
          const inner = (
            <Panel className="flex items-center gap-3 p-4" delay={60 + i * 30}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${s.accent}1F`, color: tone(s.accent) }}>
                <s.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[22px] font-semibold leading-none tabular-nums text-white">{s.value}</p>
                <p className="mt-1 text-[12.5px] text-lp-mute">{s.label}</p>
              </div>
            </Panel>
          );
          return s.to ? (
            <Link key={s.label} to={s.to} className="block rounded-3xl">
              {inner}
            </Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </div>

      <Panel className="mt-5 overflow-hidden p-0" delay={160}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lp-line px-5 py-3.5">
          <p className="flex items-center gap-2 text-[14px] font-medium text-white">
            <Users className="h-4 w-4 text-lp-sky" /> {students.length} students · {assignments.length} assignments
          </p>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 text-[11.5px] text-lp-mute md:flex">
              {[
                ["#34D399", "85+"],
                ["#7CB4FF", "70–84"],
                ["#FBBF24", "55–69"],
                ["#F2706A", "<55"],
              ].map(([c, l]) => (
                <span key={l} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} /> {l}
                </span>
              ))}
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={cn(selectCls, "h-9 w-auto text-[12.5px]")} aria-label="Sort students">
              <option value="name">Name A–Z</option>
              <option value="high">Average: high to low</option>
              <option value="low">Average: low to high</option>
              <option value="missing">Most missing</option>
            </select>
          </div>
        </div>

        {loading && !rows.length ? (
          <div className="p-5">
            <div className="lp-skeleton h-72 rounded-2xl" />
          </div>
        ) : !students.length ? (
          <EmptyState icon={Users} title="No students yet" body={`Share the join code ${cls?.join_code?.toUpperCase() ?? ""} so students can join this class.`} />
        ) : !assignments.length ? (
          <EmptyState icon={Table2} title="No assignments yet" body="Add an assignment from the class page and marks will appear here." action={<Link to={`/class/${classId}`} className={ghostBtn}>Open class</Link>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-[2] min-w-[150px] border-b sm:min-w-[220px] border-lp-line bg-lp-surface px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-lp-mute">Student</th>
                  {assignments.map((a, i) => (
                    <th key={a.id} className="max-w-[150px] border-b border-l border-lp-line/60 px-3 py-3 text-left align-bottom font-normal">
                      <Link to={`/marking?assignment=${a.id}`} className="block max-w-[136px] truncate text-[12.5px] font-medium text-white hover:text-lp-sky" title={a.title}>
                        {a.title}
                      </Link>
                      <span className="text-[11px] text-lp-mute">{a.due_date ? format(new Date(a.due_date), "d MMM") : "No due date"}</span>
                      <span className="mt-1 block text-[11px] tabular-nums text-lp-mute">
                        {colStats[i].avg === null ? "—" : `avg ${show(colStats[i].avg!)}`} · {colStats[i].inCount}/{students.length} in
                      </span>
                    </th>
                  ))}
                  <th className="right-0 z-[2] border-b border-l sm:sticky border-lp-line bg-lp-surface px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-lp-mute">Average</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const focus = r.st.id === focusStudent;
                  return (
                    <tr key={r.st.id} ref={focus ? rowRef : undefined} className={cn("group", focus && "bg-lp-blue/10")}>
                      <td className={cn("sticky left-0 z-[1] border-b border-lp-line/60 px-3 py-2.5 sm:px-5", focus ? "bg-lp-raised" : "bg-lp-surface group-hover:bg-lp-raised")}>
                        <div className="flex items-center gap-2.5">
                          <span className="lp-keep flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold text-white" style={{ background: themeFor(r.st.name).gradient }}>
                            {initialsOf(r.st.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-medium text-white">{r.st.name}</p>
                            {(r.missing > 0 || r.toMark > 0) && (
                              <p className="text-[11px] text-lp-mute">
                                {r.missing > 0 && <span className="text-lp-red">{r.missing} missing</span>}
                                {r.missing > 0 && r.toMark > 0 && " · "}
                                {r.toMark > 0 && <span>{r.toMark} to mark</span>}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {assignments.map((a) => {
                        const s = subFor.get(`${r.st.id}:${a.id}`);
                        const p = s ? pctOf(s) : null;
                        const overdue = !s && a.due_date && new Date(a.due_date).getTime() < now;
                        return (
                          <td key={a.id} className="border-b border-l border-lp-line/40 px-2 py-2 text-center group-hover:bg-white/[0.02]">
                            {p !== null ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/marking?sub=${s!.id}`)}
                                title={s!.feedback ? `Feedback: ${s!.feedback}` : `${s!.grade}/${s!.max_grade}`}
                                className="inline-flex h-8 min-w-[52px] items-center justify-center rounded-lg px-2 text-[13px] font-semibold tabular-nums transition-transform hover:scale-105"
                                style={{ background: `${cellTone(p)}26`, color: tone(cellTone(p)) }}
                              >
                                {show(p)}
                              </button>
                            ) : s ? (
                              <button type="button" onClick={() => navigate(`/marking?sub=${s.id}`)} className="inline-flex h-8 items-center justify-center rounded-lg border border-dashed border-lp-sky/50 px-2 text-[11.5px] font-medium text-lp-sky hover:bg-lp-blue/10">
                                To mark
                              </button>
                            ) : overdue ? (
                              <span className="inline-flex h-8 items-center justify-center rounded-lg bg-lp-red/10 px-2 text-[11.5px] font-medium text-lp-red">Missing</span>
                            ) : (
                              <span className="text-lp-mute">·</span>
                            )}
                          </td>
                        );
                      })}
                      <td className={cn("right-0 z-[1] border-b border-l sm:sticky border-lp-line/60 px-4 py-2.5 text-right", focus ? "bg-lp-raised" : "bg-lp-surface group-hover:bg-lp-raised")}>
                        <span className="inline-flex items-center gap-1.5">
                          {r.trend !== null && Math.abs(r.trend) >= 3 && (r.trend > 0 ? <ArrowUpRight className="h-3.5 w-3.5 text-lp-green" /> : <ArrowDownRight className="h-3.5 w-3.5 text-lp-red" />)}
                          {r.trend !== null && Math.abs(r.trend) < 3 && <Minus className="h-3.5 w-3.5 text-lp-mute" />}
                          <span className="text-[14px] font-semibold tabular-nums" style={{ color: r.avg === null ? undefined : tone(cellTone(r.avg)) }}>
                            {r.avg === null ? "—" : useScale && system ? convertPercentageToGrade(r.avg, system) : `${Math.round(r.avg)}%`}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="mt-3 text-[12px] text-lp-mute">
        “Missing” means the due date has passed with nothing handed in. Averages only use marked work.
      </p>
    </StudyShell>
  );
};

export default Gradebook;
