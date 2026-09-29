import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Crosshair, GraduationCap, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SUBJECTS, getSubject } from "@/content/myp";
import { Panel, PanelHead } from "@/components/student/ui";
import { SubjectGlyph } from "@/components/subjects/kit";
import { cn } from "@/lib/utils";
import { guessCourse, type useCourseLinks } from "./classCourses";

type Links = ReturnType<typeof useCourseLinks>;

/**
 * The MYP course(s) a class is aligned to. Teachers link, unlink and set the
 * unit they're teaching; students see it with a shortcut into that unit.
 */
export const ClassMypCard: React.FC<{ classId: string; classSubject?: string | null; isTeacher: boolean; courses: Links; delay?: number }> = ({
  classId,
  classSubject,
  isTeacher,
  courses,
  delay = 0,
}) => {
  const { links, loading, available, link, unlink, setFocus } = courses;
  const mine = links.filter((l) => l.classId === classId);
  const [busy, setBusy] = useState<string | null>(null);
  const guess = guessCourse(classSubject ?? "");
  const options = SUBJECTS.filter((s) => !mine.some((l) => l.subject === s.slug)).sort((a, b) => Number(b.slug === guess) - Number(a.slug === guess));

  if (!isTeacher && !mine.length) return null;
  if (isTeacher && !available)
    return (
      <Panel className="p-5" delay={delay}>
        <PanelHead title="MYP course" icon={GraduationCap} />
        <p className="mt-2 text-[13px] text-lp-mute">Course alignment is being switched on for your school. Check back shortly.</p>
      </Panel>
    );

  const add = async (slug: string) => {
    setBusy(slug);
    try {
      await link(classId, slug);
      toast.success(`Aligned to ${getSubject(slug)?.name}`);
    } catch {
      toast.error("Couldn't align the class");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel className="p-5" delay={delay}>
      <PanelHead title={isTeacher ? "MYP course alignment" : "Your MYP course"} icon={GraduationCap} />
      {isTeacher && (
        <p className="mt-1 text-[13px] leading-relaxed text-lp-mute">
          Students in this class get the course in My Subjects with the unit you pick highlighted. You follow their progress topic by topic.
        </p>
      )}

      {loading ? (
        <div className="lp-skeleton mt-4 h-24 rounded-2xl" />
      ) : (
        <div className="mt-4 space-y-3">
          {mine.map((l) => {
            const subject = getSubject(l.subject)!;
            const focused = subject.units.map((u, i) => ({ u, i })).filter(({ u }) => l.focusUnits.includes(u.id));
            const firstTopic = focused[0]?.u.topics[0] ?? subject.units[0].topics[0];
            return (
              <div key={l.id} className="rounded-2xl border border-lp-line bg-lp-raised/40 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="lp-keep flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: subject.theme.gradient }}>
                    <SubjectGlyph subject={subject} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-medium text-white">{subject.name}</p>
                    <p className="text-[12px] text-lp-mute">
                      {focused.length ? (
                        <span className="text-lp-sky">
                          <Crosshair className="-mt-0.5 mr-1 inline h-3 w-3" />
                          {focused.map(({ u, i }) => `Unit ${i + 1}: ${u.title}`).join(", ")}
                        </span>
                      ) : isTeacher ? (
                        "Pick the unit you're teaching below"
                      ) : (
                        `${subject.units.length} units · study guides, exam practice and quizzes`
                      )}
                    </p>
                  </div>
                  {isTeacher ? (
                    <div className="flex gap-1.5">
                      <Link
                        to={`/subjects/${subject.slug}?tab=classes&class=${classId}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-lp-blue px-3 text-[12.5px] font-medium text-white hover:bg-[#2F6FE0]"
                      >
                        <BarChart3 className="h-3.5 w-3.5" /> Class progress
                      </Link>
                      <button
                        type="button"
                        aria-label={`Unlink ${subject.name}`}
                        onClick={() => unlink(l.id).then(() => toast.success("Unlinked")).catch(() => toast.error("Couldn't unlink"))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.05] hover:text-lp-red"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Link
                      to={`/subjects/${subject.slug}/topic/${firstTopic.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-lp-blue px-3 text-[12.5px] font-medium text-white hover:bg-[#2F6FE0]"
                    >
                      {focused.length ? "Go to the unit" : "Open course"} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
                {isTeacher && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {subject.units.map((u, i) => {
                      const on = l.focusUnits.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setFocus(l.id, on ? l.focusUnits.filter((x) => x !== u.id) : [...l.focusUnits, u.id]).catch(() => toast.error("Couldn't save the unit"))}
                          className={cn(
                            "h-7 rounded-full border px-2.5 text-[12px] font-medium transition-colors",
                            on ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white",
                          )}
                        >
                          Unit {i + 1}: {u.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {isTeacher && (
            <div>
              <p className="mb-2 text-[12px] font-medium text-lp-soft">{mine.length ? "Add another course" : "Align to a course"}</p>
              <div className="flex flex-wrap gap-1.5">
                {options.map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    disabled={!!busy}
                    onClick={() => add(s.slug)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors disabled:opacity-60",
                      s.slug === guess ? "border-lp-sky/40 bg-lp-blue/10 text-lp-sky hover:bg-lp-blue/20" : "border-lp-line text-lp-soft hover:border-lp-sky/40 hover:text-white",
                    )}
                  >
                    {busy === s.slug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {s.name}
                    {s.slug === guess && !mine.length && <span className="text-[10.5px] uppercase tracking-[0.1em] text-lp-sky/80">Suggested</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
};
