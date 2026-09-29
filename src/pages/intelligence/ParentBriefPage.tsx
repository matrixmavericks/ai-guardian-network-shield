import React, { useMemo, useState } from "react";
import { Mail, MailOpen, PenLine, ShieldCheck } from "lucide-react";
import { StudyShell } from "@/components/subjects/kit";
import { EmptyState, Panel } from "@/components/student/ui";
import { IntelHeader, ReportSkeleton, RunButton, useIntelReport } from "@/components/intelligence/intel";
import { ClassSelect, CopyButton, PersonChip } from "@/components/teacher/parts";
import { useTeacherData, peopleOf } from "@/components/teacher/data";

const ParentBriefPage = () => {
  const { data } = useTeacherData();
  const [classId, setClassId] = useState("");
  const report = useIntelReport("parent_brief", classId || "none");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const cls = data.classes.find((c) => c.id === classId);

  const letters = useMemo(() => peopleOf(report.reply), [report.reply]);
  const textOf = (name: string, body: string) => edits[`${classId}:${name}`] ?? body;
  const allText = letters.map((l) => `${l.name}\n\n${textOf(l.name, l.body)}`).join("\n\n———\n\n");

  return (
    <StudyShell wide>
      <IntelHeader
        icon={Mail}
        gradient="linear-gradient(135deg, #EC4899, #BE185D 55%, #500724)"
        title="Parent briefs"
        body="A short, warm weekly note for every student's family: one win, one area to grow and one way to help at home. You review and send."
      />

      <Panel className="mt-7 p-5 sm:p-6" delay={60}>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="block text-[12.5px] font-medium text-lp-soft">Class</span>
            <ClassSelect classes={data.classes} value={classId} onChange={setClassId} className="mt-1.5" />
          </label>
          <RunButton loading={report.loading} hasRun={!!report.reply} label="Draft this week's notes" at={report.at} onClick={() => classId && report.run({ classId })} />
        </div>
        <p className="mt-3 flex items-center gap-2 text-[12.5px] text-lp-mute">
          <ShieldCheck className="h-3.5 w-3.5 text-lp-green" /> Nothing is sent from here. Copy a note or open it in your email app, then check it before it goes.
        </p>
        {report.error && <p className="mt-2 text-[13px] text-lp-red">{report.error}</p>}
      </Panel>

      {report.loading ? (
        <div className="mt-6">
          <ReportSkeleton lines={3} />
        </div>
      ) : letters.length ? (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-white">
              {letters.length} notes for {cls?.name ?? "your class"}
            </h2>
            <CopyButton text={allText} label="Copy all" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {letters.map((l, i) => {
              const text = textOf(l.name, l.body);
              const subject = `${cls?.name ?? "Class"}: this week for ${l.name.split(" ")[0]}`;
              return (
                <Panel key={l.name} className="flex flex-col p-5" delay={Math.min(i, 8) * 40}>
                  <div className="flex items-center gap-3">
                    <PersonChip name={l.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-white">{l.name}</p>
                      <p className="truncate text-[12px] text-lp-mute">Subject: {subject}</p>
                    </div>
                  </div>
                  <label className="mt-4 block flex-1">
                    <span className="sr-only">Note for {l.name}'s family</span>
                    <textarea
                      value={text}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [`${classId}:${l.name}`]: e.target.value }))}
                      rows={Math.min(12, Math.max(6, text.split("\n").length + 2))}
                      className="w-full resize-y rounded-2xl border border-lp-line bg-lp-deep/40 p-4 text-[14px] leading-relaxed text-lp-text focus:border-lp-sky/60 focus:outline-none"
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <CopyButton text={text} />
                    <a
                      href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-lp-line px-2.5 text-[12px] font-medium text-lp-soft transition-colors hover:border-lp-sky/50 hover:text-white"
                    >
                      <MailOpen className="h-3.5 w-3.5" /> Open in email
                    </a>
                    {edits[`${classId}:${l.name}`] !== undefined && (
                      <span className="inline-flex items-center gap-1 text-[11.5px] text-lp-mute">
                        <PenLine className="h-3 w-3" /> Edited
                      </span>
                    )}
                  </div>
                </Panel>
              );
            })}
          </div>
        </>
      ) : report.reply ? (
        <Panel className="mt-6 p-6">
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-lp-soft">{report.reply}</p>
        </Panel>
      ) : (
        <Panel className="mt-6 p-2" delay={120}>
          <EmptyState icon={Mail} title="Notes appear here, one per student" body="Built from this week's hand-ins and feedback. Edit any note in place before you copy it." />
        </Panel>
      )}
    </StudyShell>
  );
};

export default ParentBriefPage;
