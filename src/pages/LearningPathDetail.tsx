import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Panel, PanelHead, Ring, ghostBtn } from "@/components/student/ui";
import { StudyShell, TabBar, primaryBtn } from "@/components/subjects/kit";
import { DifficultyChip, PathTrail } from "@/components/paths/PathParts";
import { themeFor } from "@/components/student/themes";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  ListChecks,
  Play,
  Route,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import ResourceViewer from "@/components/learning/ResourceViewer";
import QuizPlayer from "@/components/learning/QuizPlayer";
import LearningPathInsights from "@/components/learning/LearningPathInsights";
import ClassRiskSummary from "@/components/learning/ClassRiskSummary";
import CapstoneSubmission from "@/components/learning/CapstoneSubmission";
import CapstoneTeacherReview from "@/components/learning/CapstoneTeacherReview";
import {
  getLearningPathById,
  getPathProgress,
  markModuleComplete,
  touchLearningPath,
  type LearningModule,
  type LearningPath,
  type PathProgress,
} from "@/services/learningPathService";
import { tone } from "@/lib/portalAppearance";

const LearningPathDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isTeacher } = useUserRole();

  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [pathProgress, setPathProgress] = useState<PathProgress | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [assignedStudents, setAssignedStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [path, progress] = await Promise.all([
          getLearningPathById(id),
          user ? getPathProgress(user.id, id) : Promise.resolve(null),
        ]);

        if (!path) {
          toast({
            title: "Learning Path Not Found",
            description: "The requested learning path could not be found.",
            variant: "destructive",
          });
          navigate("/learning-paths");
          return;
        }

        setLearningPath(path);
        setSelectedModule(path.modules[0] ?? null);
        setPathProgress(progress);
      } catch (error) {
        toast({
          title: "Load failed",
          description: (error as Error)?.message || "Could not load this learning path.",
          variant: "destructive",
        });
        navigate("/learning-paths");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, navigate, toast, user]);

  // Load assigned students for teacher view
  useEffect(() => {
    const loadStudents = async () => {
      if (!isTeacher || !id) return;
      try {
        const { data: progressData } = await supabase
          .from("learning_path_progress")
          .select("user_id")
          .eq("path_id", id);
        if (!progressData || progressData.length === 0) return;

        const studentIds = [...new Set(progressData.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", studentIds);

        setAssignedStudents(
          (profiles || []).map(p => ({ id: p.user_id, name: p.full_name }))
        );
      } catch (err) {
        console.error("Failed to load students:", err);
      }
    };
    loadStudents();
  }, [isTeacher, id]);

  const sortedModules = useMemo(
    () => [...(learningPath?.modules ?? [])].sort((a, b) => a.order - b.order),
    [learningPath],
  );

  const completedModules = pathProgress?.completedModules ?? [];
  const progressValue = pathProgress?.progress ?? 0;

  const handleStartLearning = async () => {
    if (!user || !learningPath) return;
    setIsSaving(true);
    try {
      const updated = await touchLearningPath(user.id, learningPath.id);
      setPathProgress(updated);
      setActiveTab("content");
      toast({ title: "Learning started", description: "Your progress is now being tracked." });
    } catch (error) {
      toast({ title: "Unable to start", description: (error as Error)?.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteModule = async () => {
    if (!user || !learningPath || !selectedModule) return;
    setIsSaving(true);
    try {
      const updated = await markModuleComplete(user.id, learningPath.id, selectedModule.id, learningPath.modules.length);
      setPathProgress(updated);
      toast({ title: "Module completed", description: "Progress saved successfully." });
    } catch (error) {
      toast({ title: "Save failed", description: (error as Error)?.message || "Could not save module progress.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <StudyShell wide>
        <div className="lp-skeleton h-[230px] rounded-3xl" />
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="lp-skeleton h-[420px] rounded-3xl" />
          <div className="lp-skeleton h-[420px] rounded-3xl" />
        </div>
      </StudyShell>
    );
  }

  if (!learningPath) return null;

  const theme = themeFor(learningPath.subject);
  const totalResources = sortedModules.reduce((n, m) => n + m.resources.length, 0);
  const totalQuizzes = sortedModules.reduce((n, m) => n + m.quizzes.length, 0);
  const selectedIndex = selectedModule ? sortedModules.findIndex((m) => m.id === selectedModule.id) : -1;
  const nextModule = sortedModules.find((m) => !completedModules.includes(m.id));
  const showTeacher = isTeacher && assignedStudents.length > 0;
  const tabs = [
    { id: "overview", label: "Overview", icon: BookOpen },
    { id: "content", label: "Module", icon: Play },
    { id: "assessment", label: "Assessments", icon: ListChecks },
    { id: "insights", label: "My insights", icon: Sparkles },
    { id: "capstone", label: "Capstone", icon: Award },
    ...(showTeacher
      ? [
          { id: "class-risks", label: "Class risks", icon: Shield },
          { id: "student-insights", label: "Student insights", icon: Users },
          { id: "capstone-review", label: "Review capstones", icon: Award },
        ]
      : []),
  ];
  const openModule = (m: LearningModule) => {
    setSelectedModule(m);
    setActiveTab("content");
  };

  return (
    <StudyShell wide>
      <Link to="/learning-paths" className="inline-flex items-center gap-1.5 text-[13px] text-lp-mute transition-colors hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All learning paths
      </Link>

      {/* Hero */}
      <section className="lp-keep lp-fade relative mt-4 overflow-hidden rounded-3xl border border-white/10" style={{ background: theme.gradient, animationFillMode: "both" }}>
        <PathTrail stops={sortedModules.length} done={completedModules.length} accent="#FFFFFF" className="pointer-events-none absolute inset-x-6 bottom-3 h-20 w-[calc(100%-3rem)] opacity-40" height={80} />
        <div className="relative flex flex-wrap items-center justify-between gap-6 p-6 pb-24 sm:p-8 sm:pb-24">
          <div className="min-w-0 max-w-[720px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">{learningPath.subject}</span>
              <DifficultyChip level={learningPath.difficulty} onDark />
            </div>
            <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">{learningPath.title}</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-white/80">{learningPath.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[12.5px] text-white">
              {[
                `${sortedModules.length} modules`,
                `~${learningPath.estimatedHours} hours`,
                `${totalResources} lessons`,
                `${totalQuizzes} quizzes`,
              ].map((t) => (
                <span key={t} className="rounded-full bg-black/25 px-3 py-1 backdrop-blur-sm">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-3xl border border-white/15 bg-black/20 p-4 backdrop-blur-md">
            <Ring value={progressValue} size={84} stroke={8} tone={progressValue >= 100 ? "green" : "blue"} label={`${progressValue}%`} />
            <div>
              <p className="text-[12px] text-white/70">{progressValue >= 100 ? "Path complete" : `${completedModules.length} of ${sortedModules.length} done`}</p>
              {user && (
                <button type="button" onClick={handleStartLearning} disabled={isSaving} className="mt-2 inline-flex h-10 items-center gap-2 rounded-xl bg-[#FFFFFF] px-4 text-[13.5px] font-semibold text-[#0B1530] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
                  <Play className="h-4 w-4" /> {progressValue > 0 ? "Continue" : "Start learning"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Route */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Panel className="p-4">
            <PanelHead title="Your route" icon={Route} meta={<span>{completedModules.length}/{sortedModules.length}</span>} />
            <ol className="relative mt-4">
              {sortedModules.map((module, index) => {
                const done = completedModules.includes(module.id);
                const active = selectedModule?.id === module.id;
                const isNext = !done && module.id === nextModule?.id;
                return (
                  <li key={module.id} className="relative pb-1 pl-10">
                    {index < sortedModules.length - 1 && (
                      <span aria-hidden className="absolute bottom-0 left-[15px] top-8 w-0.5 rounded-full" style={{ background: done ? theme.accent : "rgb(var(--lp-line))" }} />
                    )}
                    <span
                      className={cn(
                        "absolute left-0 top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 text-[12px] font-semibold",
                        done ? "border-transparent text-[#03060F]" : isNext ? "border-lp-sky bg-lp-blue/20 text-white" : "border-lp-line bg-lp-surface text-lp-mute",
                      )}
                      style={done ? { background: theme.accent } : undefined}
                    >
                      {done ? <CheckCircle className="h-4 w-4" /> : index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => openModule(module)}
                      aria-current={active ? "step" : undefined}
                      className={cn("w-full rounded-xl px-3 py-2 text-left transition-colors", active ? "bg-lp-blue/15" : "hover:bg-white/[0.04]")}
                    >
                      <span className={cn("block text-[13.5px] font-medium", active ? "text-white" : "text-lp-soft")}>{module.title}</span>
                      <span className="block text-[11.5px] text-lp-mute">
                        {module.resources.length} lessons · {module.quizzes.length} quizzes{isNext ? " · up next" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
              <li className="relative pl-10">
                <span className="absolute left-0 top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-[#FBBF24]/60 text-[#FBBF24]">
                  <Award className="h-4 w-4" />
                </span>
                <button type="button" onClick={() => setActiveTab("capstone")} className="w-full rounded-xl px-3 py-2 text-left hover:bg-white/[0.04]">
                  <span className="block text-[13.5px] font-medium text-lp-soft">Capstone project</span>
                  <span className="block text-[11.5px] text-lp-mute">Show what you learned</span>
                </button>
              </li>
            </ol>
          </Panel>
        </aside>

        {/* Content */}
        <div className="min-w-0">
          <TabBar tabs={tabs} value={activeTab} onChange={(v: string) => setActiveTab(v)} />
          <div className="mt-5">
            {activeTab === "overview" && (
              <div className="space-y-4">
                <Panel className="p-5">
                  <PanelHead title="What you'll learn" icon={BookOpen} />
                  <ol className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {sortedModules.map((module, i) => (
                      <li key={module.id}>
                        <button type="button" onClick={() => openModule(module)} className="group flex h-full w-full gap-3 rounded-2xl border border-lp-line bg-lp-deep/40 p-4 text-left transition-colors hover:border-white/20">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold text-white" style={{ background: `${theme.accent}33` }}>
                            {completedModules.includes(module.id) ? <CheckCircle className="h-4 w-4" style={{ color: tone(theme.accent) }} /> : i + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[14px] font-medium text-white group-hover:text-lp-sky">{module.title}</span>
                            <span className="mt-0.5 block text-[12.5px] leading-snug text-lp-mute">{module.description}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </Panel>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { icon: Calendar, label: "Time to complete", value: `~${learningPath.estimatedHours} hours` },
                    { icon: BookOpen, label: "Lessons", value: `${totalResources} AI lessons` },
                    { icon: Award, label: "Finish with", value: "A capstone project" },
                  ].map((k) => (
                    <div key={k.label} className="rounded-2xl border border-lp-line bg-lp-surface/70 p-4">
                      <k.icon className="h-4 w-4 text-lp-sky" />
                      <p className="mt-2 text-[12px] text-lp-mute">{k.label}</p>
                      <p className="text-[15px] font-medium text-white">{k.value}</p>
                    </div>
                  ))}
                </div>
                {user && (
                  <button type="button" onClick={handleStartLearning} disabled={isSaving} className={cn(primaryBtn, "w-full sm:w-auto")}>
                    <Play className="h-4 w-4" /> {progressValue > 0 ? `Continue with ${nextModule?.title ?? "the capstone"}` : "Start learning"}
                  </button>
                )}
              </div>
            )}

            {activeTab === "insights" &&
              (user ? (
                <LearningPathInsights
                  pathId={learningPath.id}
                  pathTitle={learningPath.title}
                  pathSubject={learningPath.subject}
                  pathDifficulty={learningPath.difficulty}
                  modules={learningPath.modules.map((m) => ({ id: m.id, title: m.title, description: m.description }))}
                />
              ) : (
                <p className="rounded-2xl border border-lp-line p-8 text-center text-lp-mute">Please log in to see personalised insights.</p>
              ))}

            {activeTab === "class-risks" && showTeacher && (
              <ClassRiskSummary
                pathId={learningPath.id}
                pathTitle={learningPath.title}
                pathSubject={learningPath.subject}
                pathDifficulty={learningPath.difficulty}
                modules={learningPath.modules.map((m) => ({ id: m.id, title: m.title, description: m.description }))}
                studentIds={assignedStudents.map((s) => s.id)}
              />
            )}

            {activeTab === "student-insights" && showTeacher && (
              <div className="space-y-4">
                <Panel className="p-5">
                  <PanelHead title="Student insights" icon={Users} />
                  <p className="mt-1 text-[13px] text-lp-mute">Pick a student to see where they might struggle on this path.</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {assignedStudents.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => setSelectedStudentId(student.id)}
                        className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px]", selectedStudentId === student.id ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white")}
                      >
                        <Users className="h-4 w-4 text-lp-sky" /> {student.name}
                      </button>
                    ))}
                  </div>
                </Panel>
                {selectedStudentId && (
                  <LearningPathInsights
                    key={selectedStudentId}
                    pathId={learningPath.id}
                    pathTitle={learningPath.title}
                    pathSubject={learningPath.subject}
                    pathDifficulty={learningPath.difficulty}
                    modules={learningPath.modules.map((m) => ({ id: m.id, title: m.title, description: m.description }))}
                    studentId={selectedStudentId}
                    studentName={assignedStudents.find((s) => s.id === selectedStudentId)?.name}
                  />
                )}
              </div>
            )}

            {activeTab === "content" && selectedModule && (
              <div className="space-y-5">
                <Panel className="relative overflow-hidden p-5">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: theme.gradient }} />
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">
                    Module {selectedIndex + 1} of {sortedModules.length}
                  </p>
                  <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-white">{selectedModule.title}</h2>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-lp-soft">{selectedModule.description}</p>
                </Panel>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-[14px] font-medium text-white">
                    <BookOpen className="h-4 w-4 text-lp-sky" /> Lessons
                  </h3>
                  <div className="space-y-3">
                    {selectedModule.resources.map((resource, index) => (
                      <ResourceViewer
                        key={`${selectedModule.id}-resource-${index}`}
                        resourceTitle={resource}
                        subject={learningPath.subject}
                        moduleTitle={selectedModule.title}
                        moduleDescription={selectedModule.description}
                        difficulty={learningPath.difficulty}
                        pathId={learningPath.id}
                        moduleId={selectedModule.id}
                      />
                    ))}
                    {selectedModule.resources.length === 0 && <p className="text-[13px] text-lp-mute">No lessons in this module.</p>}
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-[14px] font-medium text-white">
                    <ListChecks className="h-4 w-4 text-lp-sky" /> Quizzes
                  </h3>
                  <div className="space-y-3">
                    {selectedModule.quizzes.map((quiz, index) => (
                      <QuizPlayer
                        key={`${selectedModule.id}-quiz-${index}`}
                        quizTitle={quiz}
                        subject={learningPath.subject}
                        moduleTitle={selectedModule.title}
                        moduleDescription={selectedModule.description}
                        difficulty={learningPath.difficulty}
                        pathId={learningPath.id}
                        moduleId={selectedModule.id}
                      />
                    ))}
                    {selectedModule.quizzes.length === 0 && <p className="text-[13px] text-lp-mute">No quizzes in this module.</p>}
                  </div>
                </section>

                {user && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lp-line bg-lp-surface/70 p-4">
                    <button
                      type="button"
                      onClick={handleCompleteModule}
                      disabled={isSaving || completedModules.includes(selectedModule.id)}
                      className={cn(completedModules.includes(selectedModule.id) ? ghostBtn : primaryBtn)}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {completedModules.includes(selectedModule.id) ? "Module completed" : "Mark module complete"}
                    </button>
                    {selectedIndex < sortedModules.length - 1 && (
                      <button type="button" onClick={() => openModule(sortedModules[selectedIndex + 1])} className={ghostBtn}>
                        Next module: {sortedModules[selectedIndex + 1].title}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "assessment" && selectedModule && (
              <div className="space-y-4">
                <h2 className="text-[17px] font-semibold text-white">Assessments · {selectedModule.title}</h2>
                {selectedModule.quizzes.map((quiz, index) => (
                  <QuizPlayer
                    key={`${selectedModule.id}-assessment-${index}`}
                    quizTitle={quiz}
                    subject={learningPath.subject}
                    moduleTitle={selectedModule.title}
                    moduleDescription={selectedModule.description}
                    difficulty={learningPath.difficulty}
                    pathId={learningPath.id}
                    moduleId={selectedModule.id}
                  />
                ))}
                {selectedModule.quizzes.length === 0 && <p className="rounded-2xl border border-dashed border-lp-line p-8 text-center text-[13.5px] text-lp-mute">No assessments for this module. Pick another module from your route.</p>}
              </div>
            )}

            {activeTab === "capstone" &&
              (user ? (
                <CapstoneSubmission pathId={learningPath.id} pathTitle={learningPath.title} />
              ) : (
                <p className="rounded-2xl border border-lp-line p-8 text-center text-lp-mute">Please log in to submit a capstone project.</p>
              ))}

            {activeTab === "capstone-review" && showTeacher && (
              <CapstoneTeacherReview pathId={learningPath.id} pathTitle={learningPath.title} studentIds={assignedStudents.map((s) => s.id)} />
            )}
          </div>
        </div>
      </div>
    </StudyShell>
  );
};

export default LearningPathDetail;
