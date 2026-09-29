import React, { useMemo, useState } from "react";
import { AlertTriangle, BookOpenText, Layers, Lightbulb, Rocket, Scaling, Users } from "lucide-react";
import { StudyShell } from "@/components/subjects/kit";
import { EmptyState, Panel, PanelHead } from "@/components/student/ui";
import { IntelHeader, Inline, ReportSkeleton, RunButton, itemsOf, splitLabel, useIntelReport } from "@/components/intelligence/intel";
import { ClassSelect, CopyButton, PersonChip } from "@/components/teacher/parts";
import { mean, pctOf, studentsOf, useTeacherData, peopleOf } from "@/components/teacher/data";
import { tone } from "@/lib/portalAppearance";
import { cn } from "@/lib/utils";

const TIERS = [
  { id: "support", label: "Support", body: "Below 60%", color: "#F2706A" },
  { id: "core", label: "Core", body: "60–80%", color: "#7CB4FF" },
  { id: "stretch", label: "Stretch", body: "80% and up", color: "#34D399" },
] as const;

const FIELD_ICONS: [RegExp, React.ElementType][] = [
  [/reading/i, BookOpenText],
  [/example|analogy/i, Lightbulb],
  [/scaffold/i, Scaling],
  [/stretch/i, Rocket],
  [/watch/i, AlertTriangle],
];
const iconFor = (label: string) => FIELD_ICONS.find(([re]) => re.test(label))?.[1] ?? Lightbulb;

const AutoIEPPage = () => {
  const { data } = useTeacherData();
  const [classId, setClassId] = useState("");
  const [topic, setTopic] = useState("");
  const key = `${classId}:${topic.trim().toLowerCase()}`;
  const report = useIntelReport("auto_iep", key);

  // Instant tiers from marked work, before any AI runs
  const tiers = useMemo(() => {
    if (!classId) return null;
    const asg = new Set(data.assignments.filter((a) => a.class_id === classId).map((a) => a.id));
    const out: Record<string, { name: string; avg: number | null }[]> = { support: [], core: [], stretch: [], unknown: [] };
    for (const st of studentsOf(data, classId)) {
      const avg = mean(data.submissions.filter((s) => s.student_id === st.id && asg.has(s.assignment_id)).map(pctOf).filter((x): x is number => x !== null));
      const tier = avg === null ? "unknown" : avg < 60 ? "support" : avg < 80 ? "core" : "stretch";
      out[tier].push({ name: st.name, avg });
    }
    return out;
  }, [classId, data]);

  const people = peopleOf(report.reply);
  const cls = data.classes.find((c) => c.id === classId);

  return (
    <StudyShell wide>
      <IntelHeader
        icon={Layers}
        gradient="linear-gradient(135deg, #6366F1, #4338CA 55%, #1E1B4B)"
        title="Differentiate a lesson"
        body="Pick a class and a lesson. Refyn reads each student's recent marks and writes support, examples and stretch for every one of them."
      />

      <Panel className="mt-7 p-5 sm:p-6" delay={60}>
        <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
          <label className="block">
            <span className="block text-[12.5px] font-medium text-lp-soft">Class</span>
            <ClassSelect classes={data.classes} value={classId} onChange={setClassId} className="mt-1.5" />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-medium text-lp-soft">Lesson or topic</span>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Osmosis and water potential"
              className="mt-1.5 h-10 w-full rounded-xl border border-lp-line bg-lp-deep/40 px-3 text-[14px] text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none"
            />
          </label>
          <RunButton loading={report.loading} hasRun={!!report.reply} label="Differentiate" at={report.at} onClick={() => classId && report.run({ classId, topic: topic.trim() || "current lesson" })} />
        </div>
        {!classId && <p className="mt-3 text-[12.5px] text-lp-mute">Choose a class to see its support, core and stretch groups.</p>}
        {report.error && <p className="mt-3 text-[13px] text-lp-red">{report.error}</p>}
      </Panel>

      {tiers && (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {TIERS.map((t, i) => (
            <Panel key={t.id} className="p-5" delay={100 + i * 40}>
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-[15px] font-medium text-white">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} /> {t.label}
                </p>
                <span className="text-[12px] text-lp-mute">{t.body}</span>
              </div>
              <p className="mt-3 text-[30px] font-semibold leading-none tabular-nums text-white">{tiers[t.id].length}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {tiers[t.id].map((p) => (
                  <li key={p.name} className="rounded-full px-2 py-0.5 text-[12px]" style={{ color: tone(t.color), background: `${t.color}1A` }}>
                    {p.name.split(" ")[0]} {p.avg !== null && <span className="opacity-70">{Math.round(p.avg)}%</span>}
                  </li>
                ))}
                {!tiers[t.id].length && <li className="text-[12.5px] text-lp-mute">Nobody right now</li>}
              </ul>
            </Panel>
          ))}
        </div>
      )}
      {tiers && tiers.unknown.length > 0 && (
        <p className="mt-2 text-[12px] text-lp-mute">
          {tiers.unknown.length} {tiers.unknown.length === 1 ? "student has" : "students have"} no marked work yet, so Refyn plans for them from the class picture.
        </p>
      )}

      {report.loading ? (
        <div className="mt-6">
          <ReportSkeleton lines={3} />
        </div>
      ) : people.length ? (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.02em] text-white">
              <Users className="h-5 w-5 text-lp-sky" /> Plan for {cls?.name ?? "the class"} {topic.trim() && <span className="font-normal text-lp-mute">· {topic.trim()}</span>}
            </h2>
            <CopyButton text={report.reply} label="Copy whole plan" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {people.map((p, i) => (
              <Panel key={p.name} className="p-5" delay={Math.min(i, 8) * 40}>
                <div className="flex items-center gap-3">
                  <PersonChip name={p.name} />
                  <p className="min-w-0 flex-1 truncate text-[15.5px] font-semibold text-white">{p.name}</p>
                  <CopyButton text={`${p.name}\n${p.body}`} />
                </div>
                <ul className="mt-4 space-y-3">
                  {itemsOf(p.body).map((it, j) => {
                    const { label, rest } = splitLabel(it.text);
                    const Icon = iconFor(label);
                    return (
                      <li key={j} className="flex gap-3">
                        <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", /watch/i.test(label) ? "bg-lp-amber/15 text-lp-amber" : "bg-lp-blue/15 text-lp-sky")}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          {label && <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-lp-mute">{label}</p>}
                          <p className="text-[13.5px] leading-relaxed text-lp-soft">
                            <Inline text={rest} />
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ))}
          </div>
        </>
      ) : report.reply ? (
        <Panel className="mt-6 p-6" delay={0}>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-lp-soft">{report.reply}</p>
        </Panel>
      ) : (
        <Panel className="mt-6 p-2" delay={140}>
          <EmptyState icon={Layers} title="Your plan will appear here" body="Each student gets a reading-level tweak, an example that fits them, scaffolding, a stretch question and one thing to watch for." />
        </Panel>
      )}
    </StudyShell>
  );
};

export default AutoIEPPage;
