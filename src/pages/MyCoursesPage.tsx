import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Flame,
  GraduationCap,
  Library,
  ListChecks,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { SUBJECTS, topicsOf, type Subject } from "@/content/myp";
import { Bar, EmptyState, chip, ghostBtn, useCountUp } from "@/components/student/ui";
import { StudyShell, SubjectGlyph, StatusIcon, primaryBtn } from "@/components/subjects/kit";
import { mySubjects, streak, subjectSummary, topicStatus, useStudy, type StudyState } from "@/components/subjects/store";

type Course = Tables<"courses">;
type EnrolledCourse = Course & {
  enrollment_id: string;
  progress: number;
  mastery_score: number;
  study_time_minutes: number;
  last_studied_at: string | null;
};

const CURRICULUM_LABELS: Record<string, string> = {
  ib: "IB",
  ap: "AP",
  igcse: "IGCSE",
  a_levels: "A-Level",
  cbse: "CBSE",
  general: "General",
  custom: "Custom",
};

/* ---------- Subject card ---------- */

const SubjectCard: React.FC<{ subject: Subject; state: StudyState; index: number }> = ({ subject, state, index }) => {
  const s = subjectSummary(subject, state);
  const started = s.topics - s.counts.unseen;
  return (
    <Link
      to={`/subjects/${subject.slug}`}
      className="lp-fade group relative flex flex-col overflow-hidden rounded-3xl border border-lp-line bg-lp-surface transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_60px_-24px_rgba(59,130,246,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-sky"
      style={{ animationDelay: `${80 + index * 55}ms`, animationFillMode: "both" }}
    >
      <div className="relative h-[124px] overflow-hidden" style={{ background: subject.theme.gradient }}>
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(120% 90% at 100% 100%, black, transparent 70%)",
            WebkitMaskImage: "radial-gradient(120% 90% at 100% 100%, black, transparent 70%)",
          }}
        />
        <SubjectGlyph
          subject={subject}
          className="absolute -bottom-6 -right-4 h-32 w-32 rotate-[-12deg] text-white/25 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm">
          {subject.group}
        </span>
        <span className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm">
          <SubjectGlyph subject={subject} className="h-5 w-5" />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-white">{subject.name}</h3>
        <p className="mt-1 text-[13px] leading-snug text-lp-mute">{subject.description}</p>

        <div className="mt-4 flex flex-wrap gap-1" aria-label="Topic progress">
          {topicsOf(subject).map((t) => (
            <StatusIcon key={t.id} status={topicStatus(t, state)} size={15} />
          ))}
        </div>

        <div className="mt-auto pt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
            <span className="text-lp-mute">
              {started} of {s.topics} topics started
            </span>
            <span className="font-medium tabular-nums text-white">{s.progress}%</span>
          </div>
          <Bar value={s.progress} delay={200 + index * 60} />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-lp-mute">{s.questions} questions · {s.topics} guides</span>
            <span className="inline-flex items-center gap-1 text-[13px] font-medium text-lp-sky transition-transform group-hover:translate-x-0.5">
              Open <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

/* ---------- Change subjects dialog ---------- */

const SubjectPicker: React.FC<{ current: string[]; onClose: () => void; onSave: (slugs: string[]) => void }> = ({ current, onClose, onSave }) => {
  const [picked, setPicked] = useState<string[]>(current);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const toggle = (slug: string) => setPicked((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : [...p, slug]));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-lp-deep/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pick-title"
        onClick={(e) => e.stopPropagation()}
        className="lp-app lp-fade w-full max-w-[560px] rounded-t-3xl border border-lp-line bg-lp-surface p-6 font-ui sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="pick-title" className="text-[18px] font-semibold tracking-[-0.015em] text-white">
              Choose your subjects
            </h2>
            <p className="mt-1 text-[13.5px] text-lp-mute">Pick the MYP subjects you take. You can change this any time.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-mute hover:bg-white/[0.06] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUBJECTS.map((s) => {
            const on = picked.includes(s.slug);
            return (
              <button
                key={s.slug}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(s.slug)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                  on ? "border-lp-sky/50 bg-lp-blue/10" : "border-lp-line bg-lp-deep/40 hover:border-white/20",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: s.theme.gradient }}>
                  <SubjectGlyph subject={s} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-[13.5px] font-medium text-white">{s.name}</span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    on ? "border-lp-sky bg-lp-blue text-white" : "border-lp-line",
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setPicked(SUBJECTS.map((s) => s.slug))} className="text-[13px] text-lp-mute hover:text-white">
            Select all
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={ghostBtn}>
              Cancel
            </button>
            <button type="button" disabled={!picked.length} onClick={() => onSave(picked)} className={primaryBtn}>
              Save subjects
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- School course library (catalogue + enrolment) ---------- */

const CourseLibrary: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [curriculumFilter, setCurriculumFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [tab, setTab] = useState<"enrolled" | "browse">("enrolled");

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: allCourses } = await supabase.from("courses").select("*").order("curriculum_type").order("title");
      const { data: enrollments } = await supabase.from("student_courses").select("*").eq("user_id", user.id);
      setCourses(allCourses || []);
      const enrolled = (enrollments || [])
        .map((e) => {
          const course = (allCourses || []).find((c) => c.id === e.course_id);
          return course
            ? {
                ...course,
                enrollment_id: e.id,
                progress: e.progress ?? 0,
                mastery_score: e.mastery_score ?? 0,
                study_time_minutes: e.study_time_minutes ?? 0,
                last_studied_at: e.last_studied_at,
              }
            : null;
        })
        .filter(Boolean) as EnrolledCourse[];
      setEnrolledCourses(enrolled);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("student_courses").insert({ user_id: user.id, course_id: courseId });
      if (error) {
        if (error.code === "23505") {
          toast.info("Already enrolled!");
          return;
        }
        throw error;
      }
      toast.success("Enrolled successfully!");
      fetchData();
    } catch {
      toast.error("Failed to enroll");
    }
  };

  const enrolledIds = new Set(enrolledCourses.map((c) => c.id));
  const filteredCourses = courses.filter((c) => {
    if (enrolledIds.has(c.id)) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.subject.toLowerCase().includes(search.toLowerCase())) return false;
    if (curriculumFilter !== "all" && c.curriculum_type !== curriculumFilter) return false;
    if (subjectFilter !== "all" && c.subject !== subjectFilter) return false;
    return true;
  });
  const subjects = [...new Set(courses.map((c) => c.subject))].sort();
  const canCreate = user?.role === "teacher" || user?.role === "admin";

  const courseCard = (course: Course, enrolled?: EnrolledCourse) => (
    <div
      key={course.id}
      className={cn(
        "group flex flex-col rounded-2xl border border-lp-line bg-lp-surface/70 p-4 transition-all",
        enrolled && "cursor-pointer hover:-translate-y-0.5 hover:border-white/20",
      )}
      onClick={enrolled ? () => navigate(`/course/${course.id}`) : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-lp-line bg-lp-raised text-[20px]">
          {course.icon_emoji || "📘"}
        </span>
        <span className={chip}>{CURRICULUM_LABELS[course.curriculum_type] || course.curriculum_type}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-[14.5px] font-medium text-white group-hover:text-lp-sky">{course.title}</p>
      <p className="mt-0.5 text-[12px] text-lp-mute">
        {course.subject} · {course.level}
      </p>
      {enrolled ? (
        <div className="mt-auto pt-4">
          <div className="mb-1.5 flex justify-between text-[12px]">
            <span className="text-lp-mute">Mastery</span>
            <span className="font-medium text-white">{Math.round(enrolled.mastery_score)}%</span>
          </div>
          <Bar value={enrolled.mastery_score} />
          <div className="mt-3 flex justify-between text-[12px] text-lp-mute">
            <span>{Math.round(enrolled.study_time_minutes / 60)}h studied</span>
            <span className="inline-flex items-center gap-1 text-lp-sky">
              Continue <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-lp-soft">{course.description}</p>
          <div className="mt-auto flex items-center justify-between pt-4">
            <span className="inline-flex items-center gap-1 text-[12px] text-lp-mute">
              <Clock className="h-3 w-3" /> ~{course.estimated_hours ?? "?"}h
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEnroll(course.id);
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-lp-blue px-3 text-[12.5px] font-medium text-white hover:bg-[#2F6FE0]"
            >
              <Plus className="h-3.5 w-3.5" /> Enroll
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <section className="lp-fade mt-14" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-mute">Beyond MYP</p>
          <h2 className="mt-1 flex items-center gap-2 text-[20px] font-semibold tracking-[-0.02em] text-white">
            <Library className="h-5 w-5 text-lp-sky" /> Course library
          </h2>
          <p className="mt-1 text-[13.5px] text-lp-mute">IB, AP, IGCSE and A-Level courses with AI study tools.</p>
        </div>
        <div role="tablist" className="flex gap-1 rounded-xl border border-lp-line bg-lp-deep/70 p-1">
          {(
            [
              ["enrolled", `Enrolled (${enrolledCourses.length})`],
              ["browse", "Browse catalogue"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn("h-8 rounded-lg px-3 text-[13px] font-medium transition-colors", tab === id ? "bg-lp-raised text-white" : "text-lp-mute hover:text-white")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "enrolled" ? (
        loading ? (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="lp-skeleton h-[168px] rounded-2xl" />
            ))}
          </div>
        ) : enrolledCourses.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-lp-line">
            <EmptyState
              icon={GraduationCap}
              title="No library courses yet"
              body="Enrol in an IB, AP, IGCSE or A-Level course to get AI study notes, flashcards and mock exams for it."
              action={
                <button type="button" onClick={() => setTab("browse")} className={ghostBtn}>
                  <Search className="h-4 w-4" /> Browse catalogue
                </button>
              }
            />
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{enrolledCourses.map((c) => courseCard(c, c))}</div>
        )
      ) : (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[220px] flex-1">
              <span className="sr-only">Search courses</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses"
                className="h-10 w-full rounded-xl border border-lp-line bg-lp-surface pl-9 pr-3 text-[13.5px] text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-1">
              {["all", "ib", "ap", "igcse", "a_levels"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurriculumFilter(c)}
                  className={cn(
                    "h-10 rounded-xl border px-3 text-[13px] font-medium transition-colors",
                    curriculumFilter === c ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white",
                  )}
                >
                  {c === "all" ? "All" : CURRICULUM_LABELS[c]}
                </button>
              ))}
            </div>
            <label className="relative">
              <span className="sr-only">Subject</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-lp-mute" />
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="h-10 appearance-none rounded-xl border border-lp-line bg-lp-surface pl-8 pr-8 text-[13px] text-white focus:border-lp-sky/60 focus:outline-none"
              >
                <option value="all">All subjects</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            {canCreate && (
              <button type="button" onClick={() => navigate("/course/create")} className={ghostBtn}>
                <Plus className="h-4 w-4" /> Custom course
              </button>
            )}
          </div>
          {loading ? (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="lp-skeleton h-[180px] rounded-2xl" />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <p className="py-14 text-center text-[13.5px] text-lp-mute">No courses match your filters. Try a different search.</p>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredCourses.map((c) => courseCard(c))}</div>
          )}
        </div>
      )}
    </section>
  );
};

/* ---------- Page ---------- */

const Stat: React.FC<{ icon: React.ElementType; label: string; value: number; suffix?: string; tone?: string }> = ({ icon: Icon, label, value, suffix, tone = "text-lp-sky" }) => {
  const shown = useCountUp(value);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-lp-line bg-lp-surface/70 px-4 py-3">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-lp-raised", tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[18px] font-semibold tabular-nums leading-tight text-white">
          {shown}
          {suffix}
        </p>
        <p className="truncate text-[12px] text-lp-mute">{label}</p>
      </div>
    </div>
  );
};

const MyCoursesPage = () => {
  const { user } = useAuth();
  const { state, setSubjects } = useStudy();
  const [picking, setPicking] = useState(false);
  const list = mySubjects(state);

  const totals = useMemo(() => {
    let answered = 0;
    let mastered = 0;
    let mistakes = 0;
    for (const s of list) {
      const sum = subjectSummary(s, state);
      answered += sum.answered;
      mastered += sum.counts.mastered;
      mistakes += sum.mistakes;
    }
    return { answered, mastered, mistakes };
  }, [list, state]);

  // Suggest the first unstarted topic in the first chosen subject.
  const suggestion = useMemo(() => {
    for (const s of list) {
      const t = topicsOf(s).find((x) => topicStatus(x, state) === "unseen");
      if (t) return { subject: s, topic: t };
    }
    return null;
  }, [list, state]);

  const first = (user?.fullName || "").split(" ")[0];
  const days = streak(state);

  return (
    <StudyShell>
      <header className="lp-fade flex flex-wrap items-end justify-between gap-4" style={{ animationFillMode: "both" }}>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">IB MYP</p>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[34px]">My subjects</h1>
          <p className="mt-1.5 max-w-[560px] text-[14.5px] text-lp-soft">
            {first ? `${first}, pick` : "Pick"} a subject to revise with study guides, practice questions and flashcards. Your progress shows what to work on next.
          </p>
        </div>
        <button type="button" onClick={() => setPicking(true)} className={ghostBtn}>
          <SlidersHorizontal className="h-4 w-4" /> Change subjects
        </button>
      </header>

      <div className="lp-fade mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        <Stat icon={Flame} label="day streak" value={days} tone="text-[#FBBF24]" />
        <Stat icon={ListChecks} label="questions answered" value={totals.answered} />
        <Stat icon={Target} label="topics mastered" value={totals.mastered} tone="text-lp-green" />
        <Stat icon={RotateCcw} label="mistakes to review" value={totals.mistakes} tone="text-lp-red" />
      </div>

      {(state.recent || suggestion) && (
        <div
          className="lp-fade relative mt-4 overflow-hidden rounded-2xl border border-lp-blue/30 bg-gradient-to-r from-lp-blue/15 via-lp-surface to-lp-surface p-4 sm:p-5"
          style={{ animationDelay: "120ms", animationFillMode: "both" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lp-blue/20 text-lp-cyan">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] text-lp-mute">{state.recent ? "Pick up where you left off" : "A good place to start"}</p>
                <p className="truncate text-[15px] font-medium text-white">
                  {state.recent ? state.recent.label : `${suggestion!.topic.title} · ${suggestion!.subject.name}`}
                </p>
              </div>
            </div>
            <Link
              to={state.recent ? state.recent.path : `/subjects/${suggestion!.subject.slug}/guide/${suggestion!.topic.id}`}
              className={primaryBtn}
            >
              {state.recent ? "Continue" : "Start"} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      <section className="mt-9">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-medium text-white">
            <BookOpen className="h-4 w-4 text-lp-sky" /> {list.length} subject{list.length === 1 ? "" : "s"}
          </h2>
          <span className="text-[12.5px] text-lp-mute">Progress saves on this device</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((s, i) => (
            <SubjectCard key={s.slug} subject={s} state={state} index={i} />
          ))}
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="lp-fade group flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-lp-line p-6 text-center transition-colors hover:border-lp-sky/50 hover:bg-lp-blue/[0.04]"
            style={{ animationDelay: `${80 + list.length * 55}ms`, animationFillMode: "both" }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-lp-line bg-lp-raised text-lp-sky transition-transform group-hover:scale-105">
              <Plus className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[14.5px] font-medium text-white">Change subjects</span>
              <span className="mt-0.5 block text-[12.5px] text-lp-mute">Add or hide MYP subjects</span>
            </span>
          </button>
        </div>
      </section>

      <CourseLibrary />

      {picking && (
        <SubjectPicker
          current={state.subjects ?? SUBJECTS.map((s) => s.slug)}
          onClose={() => setPicking(false)}
          onSave={(slugs) => {
            setSubjects(slugs);
            setPicking(false);
            toast.success("Subjects updated");
          }}
        />
      )}
    </StudyShell>
  );
};

export default MyCoursesPage;
