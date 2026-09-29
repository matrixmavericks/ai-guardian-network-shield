import React, { useMemo } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { AlertTriangle, ArrowRightLeft, CalendarClock, CalendarRange, Layers, SearchX } from "lucide-react";
import { StudyShell } from "@/components/subjects/kit";
import { EmptyState, Panel, PanelHead } from "@/components/student/ui";
import { IntelHeader, Inline, ReportSkeleton, RunButton, findSection, itemsOf, parseSections, useIntelReport } from "@/components/intelligence/intel";
import { startOfWeek, useTeacherData, weekLoad } from "@/components/teacher/data";
import { themeFor } from "@/components/student/themes";
import { cn } from "@/lib/utils";
import { tone } from "@/lib/portalAppearance";

const CARDS = [
  { keys: ["workload", "high-workload"], title: "Heavy weeks", icon: CalendarRange, color: "#F2706A" },
  { keys: ["overlap"], title: "Topic overlaps", icon: Layers, color: "#A78BFA" },
  { keys: ["gap"], title: "Coverage gaps", icon: SearchX, color: "#FBBF24" },
  { keys: ["reschedule", "recommend"], title: "Suggested moves", icon: ArrowRightLeft, color: "#34D399" },
];

const CurriculumConflictPage = () => {
  const { data } = useTeacherData();
  const report = useIntelReport("curriculum_conflict");
  const now = new Date();

  // Four weeks of deadlines from your own classes, heaviest days highlighted
  const weeks = useMemo(() => {
    const start = startOfWeek(now);
    return [0, 1, 2, 3].map((w) => weekLoad(data, addDays(start, w * 7)));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const clashes = weeks.flat().filter((d) => d.clash);
  const busiest = Math.max(1, ...weeks.flat().map((d) => d.items.length));

  const sections = parseSections(report.reply);

  return (
    <StudyShell wide>
      <IntelHeader
        icon={CalendarClock}
        gradient="linear-gradient(135deg, #14B8A6, #0F766E 55%, #042F2E)"
        title="Workload & clashes"
        body="See where deadlines pile up on the same students, then let Refyn check upcoming work across the school for overlaps, gaps and better dates."
      />

      <Panel className="mt-7 p-5 sm:p-6" delay={60}>
        <PanelHead
          title="Your next four weeks"
          icon={CalendarRange}
          meta={clashes.length ? <span className="text-lp-amber">{clashes.length} clash {clashes.length === 1 ? "day" : "days"}</span> : "No clashes"}
        />
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] gap-1.5 text-center text-[10.5px] font-medium uppercase tracking-[0.14em] text-lp-mute">
              <span />
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            {weeks.map((days, w) => (
              <div key={w} className="mt-1.5 grid grid-cols-[72px_repeat(7,minmax(0,1fr))] gap-1.5">
                <span className="self-center text-[11.5px] text-lp-mute">{format(days[0].date, "d MMM")}</span>
                {days.map((d) => {
                  const today = isSameDay(d.date, now);
                  const heat = d.items.length / busiest;
                  return (
                    <div
                      key={d.date.toISOString()}
                      title={d.items.map((a) => a.title).join("\n") || "No deadlines"}
                      className={cn("relative min-h-[64px] rounded-xl border p-2 text-left", d.clash ? "border-lp-amber/50" : "border-lp-line", today && "ring-1 ring-lp-sky/50")}
                      style={{ background: d.items.length ? `rgb(var(--lp-blue) / ${0.06 + heat * 0.22})` : undefined }}
                    >
                      <span className={cn("text-[11px] tabular-nums", today ? "font-semibold text-lp-sky" : "text-lp-mute")}>{format(d.date, "d")}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {d.items.slice(0, 4).map((a) => {
                          const cls = data.classes.find((c) => c.id === a.class_id);
                          return <span key={a.id} className="h-2 w-2 rounded-full" style={{ background: themeFor(cls?.subject).accent }} />;
                        })}
                      </div>
                      {d.clash && <AlertTriangle className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-lp-amber" />}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {clashes.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {clashes.slice(0, 4).map((d) => (
              <li key={d.date.toISOString()} className="flex flex-wrap items-center gap-2 text-[13px] text-lp-soft">
                <AlertTriangle className="h-3.5 w-3.5 text-lp-amber" />
                <span className="font-medium text-white">{format(d.date, "EEE d MMM")}:</span> {d.items.map((a) => a.title).join(" + ")}
                <span className="text-lp-mute">
                  · {d.clash!.shared} {d.clash!.shared === 1 ? "student" : "students"} affected
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="mt-6 p-5 sm:p-6" delay={100}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-medium text-white">Check the whole school calendar</p>
            <p className="mt-0.5 text-[13px] text-lp-mute">Refyn reads every upcoming assignment across classes, not just yours.</p>
          </div>
          <RunButton loading={report.loading} hasRun={!!report.reply} label="Scan the calendar" at={report.at} onClick={() => report.run()} />
        </div>
        {report.error && <p className="mt-3 text-[13px] text-lp-red">{report.error}</p>}
      </Panel>

      {report.loading ? (
        <div className="mt-6">
          <ReportSkeleton lines={2} />
        </div>
      ) : report.reply ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {CARDS.map((c, i) => {
            const s = findSection(sections, ...c.keys);
            const items = itemsOf(s?.body);
            return (
              <Panel key={c.title} className="p-5" delay={i * 40}>
                <p className="flex items-center gap-2 text-[15px] font-medium text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${c.color}1F`, color: tone(c.color) }}>
                    <c.icon className="h-4 w-4" />
                  </span>
                  {c.title}
                </p>
                {items.length ? (
                  <ul className="mt-3 space-y-2">
                    {items.map((it, j) => (
                      <li key={j} className="flex gap-2.5 text-[13.5px] leading-relaxed text-lp-soft">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.color }} />
                        <span>
                          {it.group && <span className="font-medium text-white">{it.group}: </span>}
                          <Inline text={it.text} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[13px] text-lp-mute">Nothing flagged here.</p>
                )}
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel className="mt-6 p-2" delay={140}>
          <EmptyState icon={CalendarClock} title="The school-wide scan appears here" body="Heavy weeks, topics taught twice, gaps in coverage and three to five specific date changes." />
        </Panel>
      )}
    </StudyShell>
  );
};

export default CurriculumConflictPage;
