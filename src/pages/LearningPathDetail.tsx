import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  ListChecks,
  Play,
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
      } catch (error: any) {
        toast({
          title: "Load failed",
          description: error?.message || "Could not load this learning path.",
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
    } catch (error: any) {
      toast({ title: "Unable to start", description: error?.message || "Please try again.", variant: "destructive" });
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
    } catch (error: any) {
      toast({ title: "Save failed", description: error?.message || "Could not save module progress.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="container py-12 text-center text-muted-foreground">Loading learning path...</div>;
  }

  if (!learningPath) return null;

  return (
    <div className="container py-8">
      <Button variant="ghost" className="mb-6 pl-0" onClick={() => navigate("/learning-paths")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Learning Paths
      </Button>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="lg:w-1/4">
          <div className="sticky top-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Modules</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {sortedModules.map((module, index) => {
                    const completed = completedModules.includes(module.id);
                    return (
                      <button
                        type="button"
                        key={module.id}
                        onClick={() => setSelectedModule(module)}
                        className={`flex w-full items-center rounded-md border p-2 text-left ${selectedModule?.id === module.id ? "border-primary bg-accent" : "border-border"}`}
                      >
                        <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                          {completed ? <CheckCircle className="h-4 w-4 text-primary" /> : index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{module.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {module.resources.length} resources • {module.quizzes.length} quizzes
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 border-t pt-6">
                  <div className="mb-1 flex justify-between text-sm">
                    <span>Your Progress</span>
                    <span className="font-medium">{progressValue}%</span>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:w-3/4">
          <div className="mb-6">
            <h1 className="mb-2 text-3xl font-bold">{learningPath.title}</h1>
            <div className="mb-4 flex items-center gap-2">
              <Badge>{learningPath.subject}</Badge>
              <Badge variant="outline">{learningPath.difficulty}</Badge>
              <span className="text-sm text-muted-foreground">{learningPath.modules.length} modules</span>
            </div>
            <p className="text-muted-foreground">{learningPath.description}</p>
          </div>

          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex-wrap">
              <TabsTrigger value="overview"><BookOpen className="mr-2 h-4 w-4" />Overview</TabsTrigger>
              <TabsTrigger value="insights"><Sparkles className="mr-2 h-4 w-4" />My Insights</TabsTrigger>
              {isTeacher && assignedStudents.length > 0 && (
                <>
                  <TabsTrigger value="class-risks"><Shield className="mr-2 h-4 w-4" />Class Risks</TabsTrigger>
                  <TabsTrigger value="student-insights"><Users className="mr-2 h-4 w-4" />Student Insights</TabsTrigger>
                </>
              )}
              <TabsTrigger value="content"><BookOpen className="mr-2 h-4 w-4" />Module Content</TabsTrigger>
              <TabsTrigger value="assessment"><ListChecks className="mr-2 h-4 w-4" />Assessments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Path Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="mb-2 text-lg font-medium">What You'll Learn</h3>
                    <ul className="space-y-2">
                      {sortedModules.map((module) => (
                        <li key={module.id} className="flex items-start">
                          <CheckCircle className="mr-2 mt-0.5 h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{module.title}</p>
                            <p className="text-sm text-muted-foreground">{module.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 text-lg font-medium">Timeline</h3>
                    <div className="mb-4 flex items-center text-muted-foreground">
                      <Calendar className="mr-2 h-5 w-5" />
                      <span>Estimated completion: {learningPath.estimatedHours} hours</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {user && (
                <div className="mt-6 flex justify-center">
                  <Button size="lg" className="px-8" onClick={handleStartLearning} disabled={isSaving}>
                    <Play className="mr-2 h-4 w-4" />
                    {progressValue > 0 ? "Continue Learning" : "Start Learning"}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights">
              {user && (
                <LearningPathInsights
                  pathId={learningPath.id}
                  pathTitle={learningPath.title}
                  pathSubject={learningPath.subject}
                  pathDifficulty={learningPath.difficulty}
                  modules={learningPath.modules.map(m => ({ id: m.id, title: m.title, description: m.description }))}
                />
              )}
              {!user && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Please log in to see personalized insights.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {isTeacher && assignedStudents.length > 0 && (
              <TabsContent value="class-risks">
                <ClassRiskSummary
                  pathId={learningPath.id}
                  pathTitle={learningPath.title}
                  pathSubject={learningPath.subject}
                  pathDifficulty={learningPath.difficulty}
                  modules={learningPath.modules.map(m => ({ id: m.id, title: m.title, description: m.description }))}
                  studentIds={assignedStudents.map(s => s.id)}
                />
              </TabsContent>
            )}

            {isTeacher && assignedStudents.length > 0 && (
              <TabsContent value="student-insights">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5 text-primary" />
                        View Student Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4 text-sm text-muted-foreground">
                        Select a student to view AI-generated insights about where they might struggle in this learning path.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {assignedStudents.map((student) => (
                          <Button
                            key={student.id}
                            variant={selectedStudentId === student.id ? "default" : "outline"}
                            className="justify-start"
                            onClick={() => setSelectedStudentId(student.id)}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            {student.name}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {selectedStudentId && (
                    <LearningPathInsights
                      key={selectedStudentId}
                      pathId={learningPath.id}
                      pathTitle={learningPath.title}
                      pathSubject={learningPath.subject}
                      pathDifficulty={learningPath.difficulty}
                      modules={learningPath.modules.map(m => ({ id: m.id, title: m.title, description: m.description }))}
                      studentId={selectedStudentId}
                      studentName={assignedStudents.find(s => s.id === selectedStudentId)?.name}
                    />
                  )}
                </div>
              </TabsContent>
            )}


            <TabsContent value="content">
              {selectedModule && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Module {selectedModule.order}: {selectedModule.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-muted-foreground">{selectedModule.description}</p>
                    </CardContent>
                  </Card>

                  <div>
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-medium">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Learning Resources
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
                        />
                      ))}
                      {selectedModule.resources.length === 0 && (
                        <p className="text-sm text-muted-foreground">No resources for this module.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-medium">
                      <ListChecks className="h-5 w-5 text-primary" />
                      Quizzes &amp; Assessments
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
                        />
                      ))}
                      {selectedModule.quizzes.length === 0 && (
                        <p className="text-sm text-muted-foreground">No quizzes for this module.</p>
                      )}
                    </div>
                  </div>

                  {user && (
                    <div className="flex justify-center pt-4">
                      <Button size="lg" className="px-8" onClick={handleCompleteModule} disabled={isSaving || completedModules.includes(selectedModule.id)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {completedModules.includes(selectedModule.id) ? "Module Completed ✓" : "Mark Module Complete"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="assessment">
              {selectedModule && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">All Assessments for: {selectedModule.title}</h2>
                  {selectedModule.quizzes.map((quiz, index) => (
                    <QuizPlayer
                      key={`${selectedModule.id}-assessment-${index}`}
                      quizTitle={quiz}
                      subject={learningPath.subject}
                      moduleTitle={selectedModule.title}
                      moduleDescription={selectedModule.description}
                      difficulty={learningPath.difficulty}
                    />
                  ))}
                  {selectedModule.quizzes.length === 0 && (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No assessments available for this module.
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default LearningPathDetail;
