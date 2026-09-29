import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CheckCircle2, ListChecks, MessageSquare, Radar, Table2, TrendingDown } from "lucide-react";
import { StudyShell } from "@/components/subjects/kit";
import { EmptyState, Panel, PanelHead } from "@/components/student/ui";
import { IntelHeader, Inline, ReportSkeleton, RunButton, findSection, itemsOf, parseSections, useIntelReport } from "@/components/intelligence/intel";
import { PersonChip } from "@/components/teacher/parts";
import { studentRows, useTeacherData } from "@/components/teacher/data";
import { useStoredState } from "@/components/assistant/storage";
import { useAuth } from "@/contexts/AuthContext";
import { tone } from "@/lib/portalAppearance";
import { cn } from "@/lib/utils";

const reasonTone = { red: "#F2706A", amber: "#FBBF24", blue: "#7CB4FF" } as const;
const BANDS = [
  { id: "high", label: "Act now", min: 5, color: "#F2706A" },
  { id: "medium", label: "Check in", min: 2.5, color: "#FBBF24" },
  { id: "watch", label: "Keep an eye", min: 0.1, color: "#7CB4FF" },
] as const;

const AtRiskRadarPage = () => {
  const { user } = useAuth();
  const { data, loading } = useTeacherData();
  const report = useIntelReport("at_risk_radar");
  const [classId, setClassId] = useState("");
  const [done, setDone] = useStoredState<string[]>(user ? `refyn:${user.id}:radar-done` : null, []);

  const rows = useMemo(
    () =>
      studentRows(data)
        .filter((r) => r.reasons.length && (!classId || r.classIds.includes(classId)))
        .sort((a, b) => b.risk - a.risk),
    [data, classId],
  );
  const band = (risk: number) => BANDS.find((b) => risk >= b.min) ?? BANDS[2];
  const counts = BANDS.map((b) => ({ ...b, n: rows.filter((r) => band(r.risk).id === b.id).length }));

  const sections = parseSections(report.reply);
  const trends = itemsOf(findSection(sections, "trend")?.body);
  const thisWeek = itemsOf(findSection(sections, "this week", "recommended")?.body);
  const highRisk = findSection(sections, "high-risk", "high risk students");

  return (
    <StudyShell wide>
      <IntelHeader
        icon={Radar}
        gradient="linear-gradient(135deg, #F97316, #C2410C 55%, #431407)"
        title="At-risk radar"
        body="Spot students who are slipping before it shows up in a report card. The radar reads missing work, averages and recent drops in your classes; Refyn adds cohort-wide patterns."
      />

      {/* Local radar */}
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {counts.map((c, i) => (
          <Panel key={c.id} className="relative overflow-hidden p-5" delay={60 + i * 40}>
            <span aria-hidden className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: c.color }} />
            <p className="text-[12.5px] font-medium" style={{ color: tone(c.color) }}>
              {c.label}
            </p>
            <p className="mt-2 text-[34px] font-semibold leading-none tabular-nums text-white">{loading && !data.classes.length ? "–" : c.n}</p>
            <p className="mt-1 text-[12px] text-lp-mute">{c.n === 1 ? "student" : "students"}</p>
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel className="p-5 sm:p-6" delay={120}>
          <PanelHead
            title="From your classes"
            icon={Activity}
            meta={
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="h-8 rounded-lg border border-lp-line bg-lp-deep/40 px-2 text-[12.5px] text-lp-soft focus:outline-none" aria-label="Filter by class">
                <option value="">All classes</option>
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            }
          />
          {rows.length ? (
            <ul className="mt-4 space-y-2.5">
              {rows.map((r) => {
                const b = band(r.risk);
                const handled = done.includes(r.student.id);
                return (
                  <li key={r.student.id} className={cn("rounded-2xl border border-lp-line bg-lp-deep/40 p-3.5 transition-opacity", handled && "opacity-50")}>
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: b.color }} />
                      <PersonChip name={r.student.name} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-white">{r.student.name}</p>
                        <p className="truncate text-[11.5px] text-lp-mute">
                          {b.label} · {r.classIds.map((id) => data.classes.find((c) => c.id === id)?.name).filter(Boolean).join(", ")}
                        </p>
                      </div>
                      <Link to={`/messages?to=${r.student.id}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white" aria-label={`Message ${r.student.name}`} title="Message">
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                      <Link to={`/grades?student=${r.student.id}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white" aria-label={`Open ${r.student.name} in gradebook`} title="Gradebook">
                        <Table2 className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDone((d) => (handled ? d.filter((x) => x !== r.student.id) : [...d, r.student.id]))}
                        className={cn("flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/[0.06]", handled ? "text-lp-green" : "text-lp-mute hover:text-white")}
                        aria-label={handled ? "Mark as not followed up" : "Mark as followed up"}
                        title={handled ? "Followed up" : "Mark as followed up"}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-[58px]">
                      {r.reasons.map((x) => (
                        <span key={x.text} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: tone(reasonTone[x.tone]), background: `${reasonTone[x.tone]}1A` }}>
                          {x.text}
                        </span>
                      ))}
                      {r.avg !== null && <span className="text-[11px] text-lp-mute">avg {Math.round(r.avg)}%</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={CheckCircle2} title="Nobody flagged" body="No missing work, low averages or sharp drops right now." className="py-8" />
          )}
        </Panel>

        <div className="space-y-6">
          <Panel className="p-5 sm:p-6" delay={160}>
            <PanelHead title="Cohort patterns" icon={TrendingDown} />
            <p className="mt-2 text-[13px] leading-relaxed text-lp-mute">Refyn looks across AI study habits and hand-ins for patterns a single class can't show.</p>
            <RunButton className="mt-4" loading={report.loading} hasRun={!!report.reply} label="Scan the cohort" at={report.at} onClick={() => report.run()} />
            {report.error && <p className="mt-3 text-[13px] text-lp-red">{report.error}</p>}
            {report.loading && (
              <div className="mt-4">
                <ReportSkeleton lines={2} />
              </div>
            )}
            {!report.loading && trends.length > 0 && (
              <ul className="mt-5 space-y-2.5">
                {trends.map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-lp-soft">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lp-amber" />
                    <Inline text={t.text} />
                  </li>
                ))}
              </ul>
            )}
            {!report.loading && highRisk && (
              <details className="mt-4 rounded-2xl border border-lp-line bg-lp-deep/40 p-3 text-[13px] text-lp-soft">
                <summary className="cursor-pointer font-medium text-white">Refyn's high-risk notes</summary>
                <ul className="mt-2 space-y-1.5">
                  {itemsOf(highRisk.body).map((it, i) => (
                    <li key={i}>
                      {it.group && <span className="font-medium text-white">{it.group}: </span>}
                      <Inline text={it.text} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Panel>

          {thisWeek.length > 0 && !report.loading && (
            <Panel className="p-5 sm:p-6" delay={200}>
              <PanelHead title="Recommended this week" icon={ListChecks} />
              <ul className="mt-4 space-y-2">
                {thisWeek.map((t, i) => (
                  <li key={i} className="flex gap-3 rounded-xl border border-lp-line bg-lp-deep/40 p-3 text-[13.5px] leading-relaxed text-lp-soft">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lp-blue/15 text-[11.5px] font-semibold text-lp-sky">{i + 1}</span>
                    <Inline text={t.text} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </StudyShell>
  );
};

export default AtRiskRadarPage;
