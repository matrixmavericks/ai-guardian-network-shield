import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Crosshair, Link2, Loader2, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import type { Subject } from "@/content/myp";
import { EmptyState, Panel, PanelHead } from "@/components/student/ui";
import { primaryBtn, selectCls } from "@/components/subjects/kit";
import { cn } from "@/lib/utils";
import { STATUS_META } from "./store";
import { guessCourse, loadClassProgress, useCourseLinks, type CourseLink, type StudentProgress } from "./classCourses";
import { useTeacherData } from "@/components/teacher/data";

const LinkedClass: React.FC<{ subject: Subject; link: CourseLink; onFocus: (units: string[]) => void; onUnlink: () => void; open: boolean }> = ({ subject, link, onFocus, onUnlink, open }) => {
  const [rows, setRows] = useState<StudentProgress[] | null>(null);
  useEffect(() => {
    loadClassProgress(link.classId, subject).then(setRows).catch(() => setRows([]));
  }, [link.classId, subject]);
  const topics = subject.units.flatMap((u, ui) => u.topics.map((t, ti) => ({ t, u, ui, label: `${ui + 1}.${ti + 1}` })));
  const secure = (id: string) => (rows ?? []).filter((r) => ["mastered", "proficient"].includes(r.statuses[id])).length;
  const avg = rows?.length ? Math.round(rows.reduce((a, r) => a + r.progress, 0) / rows.length) : null;
  const toggleUnit = (id: string) => onFocus(link.focusUnits.includes(id) ? link.focusUnits.filter((x) => x !== id) : [...link.focusUnits, id]);

  return (
    <Panel className="p-5" delay={0}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/class/${link.classId}`} className="text-[16px] font-semibold text-white hover:text-lp-sky">
            {link.className}
          </Link>
          <p className="text-[12.5px] text-lp-mute">
            {rows ? `${rows.length} students` : "Loading…"} {avg !== null && `· average course progress ${avg}%`}
          </p>
        </div>
        <button type="button" onClick={onUnlink} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-lp-mute hover:bg-white/[0.04] hover:text-lp-red">
          <Trash2 className="h-3.5 w-3.5" /> Unlink
        </button>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[12.5px] font-medium text-lp-soft">
        <Crosshair className="h-3.5 w-3.5 text-lp-sky" /> Teaching now (students see this on the course)
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {subject.units.map((u, i) => {
          const on = link.focusUnits.includes(u.id);
          return (
            <button key={u.id} type="button" onClick={() => toggleUnit(u.id)} className={cn("h-8 rounded-full border px-3 text-[12.5px] font-medium", on ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white")}>
              Unit {i + 1}: {u.title}
            </button>
          );
        })}
      </div>

      {open && (
        <div className="mt-5">
          {!rows ? (
            <div className="lp-skeleton h-40 rounded-2xl" />
          ) : !rows.length ? (
            <p className="text-[13px] text-lp-mute">No students in this class yet. Share the class code so they can join.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-lp-line">
              <table className="w-full min-w-max border-separate border-spacing-0 text-[12.5px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-[1] min-w-[150px] border-b border-lp-line bg-lp-surface px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-lp-mute">Student</th>
                    {topics.map(({ t, label, u }) => (
                      <th key={t.id} className={cn("border-b border-l border-lp-line/60 px-1.5 py-2 text-center font-medium", link.focusUnits.includes(u.id) ? "bg-lp-blue/10 text-lp-sky" : "text-lp-mute")} title={`${t.title} (${u.title})`}>
                        <Link to={`/subjects/${subject.slug}/topic/${t.id}`} className="hover:text-white">
                          {label}
                        </Link>
                      </th>
                    ))}
                    <th className="border-b border-l border-lp-line px-3 py-2 text-right text-[11px] font-medium uppercase tracking-[0.12em] text-lp-mute">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.studentId}>
                      <td className="sticky left-0 z-[1] border-b border-lp-line/60 bg-lp-surface px-3 py-1.5">
                        <p className="truncate font-medium text-white">{r.name}</p>
                        <p className="text-[11px] text-lp-mute">{r.lastActive ? `Active ${formatDistanceToNow(r.lastActive, { addSuffix: true })}` : "Not started"}</p>
                      </td>
                      {topics.map(({ t }) => {
                        const st = r.statuses[t.id];
                        return (
                          <td key={t.id} className="border-b border-l border-lp-line/40 p-1 text-center" title={`${t.title}: ${STATUS_META[st].label}`}>
                            <span className="mx-auto block h-6 w-6 rounded-md" style={{ background: st === "unseen" ? "rgb(var(--lp-raised))" : STATUS_META[st].color, opacity: st === "unseen" ? 1 : 0.85 }} />
                          </td>
                        );
                      })}
                      <td className="border-b border-l border-lp-line/60 px-3 py-1.5 text-right font-semibold tabular-nums text-white">{r.progress}%</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="sticky left-0 z-[1] bg-lp-surface px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-lp-mute">Secure</td>
                    {topics.map(({ t }) => (
                      <td key={t.id} className="border-l border-lp-line/40 px-1 py-2 text-center text-[11px] tabular-nums text-lp-soft">
                        {secure(t.id)}/{rows.length}
                      </td>
                    ))}
                    <td className="border-l border-lp-line/60" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {(["mastered", "proficient", "familiar", "learning", "unfamiliar", "unseen"] as const).map((st) => (
              <span key={st} className="inline-flex items-center gap-1.5 text-[11.5px] text-lp-mute">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: st === "unseen" ? "rgb(var(--lp-raised))" : STATUS_META[st].color }} /> {STATUS_META[st].label}
              </span>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
};

/** Teacher-only tab on a course: link classes, set the focus unit, see class progress. */
export const CourseClasses: React.FC<{ subject: Subject; highlightClass?: string | null }> = ({ subject, highlightClass }) => {
  const { links, loading, available, link, unlink, setFocus } = useCourseLinks();
  const { data } = useTeacherData();
  const mine = links.filter((l) => l.subject === subject.slug);
  const linkable = useMemo(() => data.classes.filter((c) => !mine.some((l) => l.classId === c.id)), [data.classes, mine]);
  const suggested = linkable.filter((c) => guessCourse(c.subject) === subject.slug || guessCourse(c.name) === subject.slug);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async (classId: string) => {
    if (!classId) return;
    setBusy(true);
    try {
      await link(classId, subject.slug);
      toast.success(`Linked to ${subject.name}`);
      setPick("");
    } catch {
      toast.error("Couldn't link that class");
    } finally {
      setBusy(false);
    }
  };

  if (!available)
    return (
      <Panel className="p-6">
        <EmptyState icon={Link2} title="Course linking is being switched on" body="The database update for linking classes to MYP courses hasn't been applied yet. Try again shortly." />
      </Panel>
    );

  return (
    <div className="space-y-4">
      <Panel className="p-5" delay={20}>
        <PanelHead title={`Link a class to ${subject.name}`} icon={Link2} />
        <p className="mt-1 text-[13px] leading-relaxed text-lp-mute">
          Students in a linked class get this course in My Subjects with your current unit highlighted, and you see their progress here topic by topic.
        </p>
        {suggested.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggested.map((c) => (
              <button key={c.id} type="button" disabled={busy} onClick={() => add(c.id)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-lp-sky/40 bg-lp-blue/10 px-3 text-[12.5px] font-medium text-lp-sky hover:bg-lp-blue/20">
                <Plus className="h-3.5 w-3.5" /> {c.name}
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className={cn(selectCls, "w-auto min-w-[220px]")} aria-label="Class to link">
            <option value="">{linkable.length ? "Choose one of your classes" : "All your classes are linked"}</option>
            {linkable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="button" disabled={!pick || busy} onClick={() => add(pick)} className={primaryBtn}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Link class
          </button>
        </div>
      </Panel>

      {loading ? (
        <div className="lp-skeleton h-48 rounded-3xl" />
      ) : mine.length ? (
        mine.map((l) => (
          <LinkedClass
            key={l.id}
            subject={subject}
            link={l}
            open={!highlightClass || highlightClass === l.classId || mine.length === 1}
            onFocus={(units) => setFocus(l.id, units).catch(() => toast.error("Couldn't save the focus unit"))}
            onUnlink={() => unlink(l.id).then(() => toast.success("Unlinked")).catch(() => toast.error("Couldn't unlink"))}
          />
        ))
      ) : (
        <Panel className="p-6">
          <EmptyState icon={Users} title="No classes linked yet" body="Link a class above to track it here." />
        </Panel>
      )}
      {mine.length > 0 && (
        <p className="flex items-center gap-2 text-[12px] text-lp-mute">
          <CheckCircle2 className="h-3.5 w-3.5 text-lp-green" /> Progress updates as students study. It reads the same data they see, so nothing extra is collected.
        </p>
      )}
    </div>
  );
};
