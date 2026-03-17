import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Save, Copy, RefreshCw, Sparkles, BookOpen, Trash2, Book, Users, Send, Plus, Trophy } from "lucide-react";
import { TeacherPlan, saveTeacherPlan, getTeacherPlans, deleteTeacherPlan, generateId } from "@/services/localStorageService";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "@/components/DashboardSidebar";
import ReactMarkdown from 'react-markdown';
import { toast as sonnerToast } from 'sonner';

const templatePrompts = [
  {
    title: "Weekly Lesson Plan",
    icon: "📅",
    text: "Create a detailed week-long lesson plan with daily objectives, activities, materials needed, and assessment criteria.",
    subject: "Mathematics",
    gradeLevel: "High School (9-12)",
    duration: "1 week",
  },
  {
    title: "Project-Based Learning",
    icon: "🔬",
    text: "Design a hands-on project that students complete over 2 weeks, with milestones, rubrics, and presentation guidelines.",
    subject: "Science",
    gradeLevel: "Middle School (6-8)",
    duration: "2 weeks",
  },
  {
    title: "Differentiated Instruction",
    icon: "🎯",
    text: "Create a lesson plan with differentiated activities for struggling, on-level, and advanced students on the same topic.",
    subject: "English",
    gradeLevel: "Elementary (K-5)",
    duration: "1 week",
  },
  {
    title: "Assessment & Review",
    icon: "📝",
    text: "Design a comprehensive review session with practice problems, study guides, and a formative assessment quiz.",
    subject: "Mathematics",
    gradeLevel: "High School (9-12)",
    duration: "3 days",
  },
  {
    title: "Interactive Workshop",
    icon: "🤝",
    text: "Plan an interactive workshop with group activities, discussion prompts, peer review, and collaborative exercises.",
    subject: "History",
    gradeLevel: "High School (9-12)",
    duration: "1 day",
  },
  {
    title: "Lab Activity Plan",
    icon: "🧪",
    text: "Create a detailed lab activity with safety guidelines, step-by-step procedures, data collection sheets, and analysis questions.",
    subject: "Science",
    gradeLevel: "High School (9-12)",
    duration: "1 day",
  },
];

const TeacherPlanGenerator = () => {
  const [subject, setSubject] = useState("");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [targetClass, setTargetClass] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [duration, setDuration] = useState("1 week");
  const [generatedPlan, setGeneratedPlan] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("input");
  const [savedPlans, setSavedPlans] = useState<TeacherPlan[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Learning path generation from plan
  const [createPathDialogOpen, setCreatePathDialogOpen] = useState(false);
  const [pathPlanSource, setPathPlanSource] = useState<TeacherPlan | null>(null);
  const [pathTopics, setPathTopics] = useState<string[]>(['']);
  const [pathDifficulty, setPathDifficulty] = useState('beginner');
  const [pathGradeLevel, setPathGradeLevel] = useState('High School');
  const [generatingPaths, setGeneratingPaths] = useState(false);
  const [createdPathIds, setCreatedPathIds] = useState<string[]>([]);
  // Assign to class
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (user) {
      const plans = getTeacherPlans?.() || [];
      setSavedPlans(plans.filter(p => p.createdBy === user.id));
    }
  }, [user]);

  // Load teacher's classes
  useEffect(() => {
    const loadClasses = async () => {
      if (!user) return;
      const { data } = await supabase.from('classes').select('id, name, subject').eq('teacher_id', user.id);
      setClasses(data || []);
    };
    loadClasses();
  }, [user]);

  const handleSelectTemplate = (template: typeof templatePrompts[0]) => {
    setPrompt(template.text);
    setSubject(template.subject);
    setGradeLevel(template.gradeLevel);
    setDuration(template.duration);
    setTitle(`${template.subject} - ${template.title}`);
  };

  const handleGeneratePlan = async () => {
    if (!subject || !prompt) {
      toast({ title: "Missing information", description: "Please provide both a subject and prompt.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const enhancedPrompt = `${prompt}\n\nAdditional context:\n- Subject: ${subject}\n- Grade Level: ${gradeLevel || 'Not specified'}\n- Duration: ${duration}\n- Target Class: ${targetClass || 'General'}\n\nPlease provide a comprehensive, well-structured teaching plan with clear sections, objectives, activities, materials, assessments, and timing. Use markdown formatting for headers and lists.`;

      const { data, error } = await supabase.functions.invoke('generate-teaching-plan', {
        body: { subject, prompt: enhancedPrompt, targetClass, title, gradeLevel, duration }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setGeneratedPlan(data.plan);
      if (!title) setTitle(`${subject} Teaching Plan - ${duration}`);
      setActiveTab("result");
      toast({ title: "Plan generated!", description: "Your AI-powered teaching plan is ready to review and save." });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({ title: "Generation failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePlan = () => {
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      toast({ title: "Unauthorized", variant: "destructive" });
      return;
    }
    if (!title || !subject || !generatedPlan) {
      toast({ title: "Missing information", variant: "destructive" });
      return;
    }

    const newPlan: TeacherPlan = {
      id: generateId(),
      title,
      subject,
      description: prompt.substring(0, 200),
      content: generatedPlan,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      targetClass: targetClass || undefined,
    };

    saveTeacherPlan(newPlan);
    setSavedPlans(prev => [newPlan, ...prev]);
    toast({ title: "Plan saved!", description: "Your teaching plan has been saved." });
  };

  const handleDeletePlan = (planId: string) => {
    if (!confirm('Delete this teaching plan?')) return;
    deleteTeacherPlan(planId);
    setSavedPlans(prev => prev.filter(p => p.id !== planId));
    toast({ title: "Plan deleted" });
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedPlan);
    toast({ title: "Copied to clipboard" });
  };

  const openCreatePathsDialog = (plan: TeacherPlan) => {
    setPathPlanSource(plan);
    setPathTopics(['']);
    setCreatedPathIds([]);
    setCreatePathDialogOpen(true);
  };

  const openCreatePathsFromCurrent = () => {
    if (!generatedPlan || !title || !subject) return;
    const tempPlan: TeacherPlan = {
      id: 'temp',
      title,
      subject,
      description: prompt.substring(0, 200),
      content: generatedPlan,
      createdBy: user?.id || '',
      createdAt: new Date().toISOString(),
    };
    openCreatePathsDialog(tempPlan);
  };

  const addTopicField = () => setPathTopics(prev => [...prev, '']);
  const updateTopic = (index: number, value: string) => {
    setPathTopics(prev => prev.map((t, i) => i === index ? value : t));
  };
  const removeTopic = (index: number) => {
    if (pathTopics.length <= 1) return;
    setPathTopics(prev => prev.filter((_, i) => i !== index));
  };

  const generateLearningPaths = async () => {
    if (!pathPlanSource || !user) return;
    const topics = pathTopics.filter(t => t.trim());
    if (topics.length === 0) {
      sonnerToast.error('Please enter at least one topic');
      return;
    }

    setGeneratingPaths(true);
    const newPathIds: string[] = [];

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      for (const topic of topics) {
        const res = await supabase.functions.invoke('generate-learning-path', {
          body: {
            title: topic,
            subject: pathPlanSource.subject,
            difficulty: pathDifficulty,
            gradeLevel: pathGradeLevel,
            estimatedHours: 10,
            description: `Learning path based on teaching plan "${pathPlanSource.title}": ${topic}`,
          },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.error) throw res.error;
        const pathData = res.data;
        if (!pathData?.success) throw new Error(pathData?.error || 'AI generation failed');

        const { data: savedPath, error: saveErr } = await supabase.from('learning_paths').insert({
          title: `${topic} (from ${pathPlanSource.title})`,
          description: `AI-generated learning path for "${topic}" based on teaching plan.`,
          subject: pathPlanSource.subject,
          difficulty: pathDifficulty,
          estimated_hours: 10,
          modules: pathData.modules || [],
          tags: pathData.suggestedTags || [topic],
          created_by: user.id,
          is_public: false,
        }).select('id').single();

        if (saveErr) throw saveErr;
        if (savedPath) newPathIds.push(savedPath.id);
      }

      setCreatedPathIds(newPathIds);
      sonnerToast.success(`${newPathIds.length} learning path(s) created!`);
    } catch (err: any) {
      console.error(err);
      sonnerToast.error(err.message || 'Failed to generate learning paths');
    } finally {
      setGeneratingPaths(false);
    }
  };

  const openAssignDialog = () => {
    if (createdPathIds.length === 0) return;
    setSelectedClassId('');
    setAssignDialogOpen(true);
  };

  const assignPathsToClass = async () => {
    if (!selectedClassId || createdPathIds.length === 0) return;
    setAssigning(true);
    try {
      // Get class students
      const { data: members, error: membersErr } = await supabase
        .from('class_members')
        .select('student_id')
        .eq('class_id', selectedClassId);
      if (membersErr) throw membersErr;
      if (!members?.length) {
        sonnerToast.error('No students in this class');
        setAssigning(false);
        return;
      }

      let assigned = 0;
      for (const pathId of createdPathIds) {
        for (const member of members) {
          const { error } = await supabase.from('learning_path_progress').insert({
            user_id: member.student_id,
            path_id: pathId,
            progress: 0,
          });
          if (!error) assigned++;
        }
      }

      sonnerToast.success(`Assigned ${createdPathIds.length} path(s) to ${members.length} student(s)`);
      setAssignDialogOpen(false);
      setCreatePathDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      sonnerToast.error(err.message || 'Failed to assign');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="container py-8 max-w-5xl">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">AI Teaching Plan Generator</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Create comprehensive, AI-powered teaching plans in seconds
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="input"><Brain className="mr-2 h-4 w-4" /> Create Plan</TabsTrigger>
              <TabsTrigger value="result" disabled={!generatedPlan}><Save className="mr-2 h-4 w-4" /> Generated Plan</TabsTrigger>
              <TabsTrigger value="saved"><BookOpen className="mr-2 h-4 w-4" /> Saved Plans ({savedPlans.length})</TabsTrigger>
            </TabsList>

            {/* ===== INPUT TAB ===== */}
            <TabsContent value="input">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Plan Parameters</CardTitle>
                    <CardDescription>Configure your teaching plan</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Plan Title (Optional)</Label>
                        <Input placeholder="E.g., Weekly Physics Plan" value={title} onChange={e => setTitle(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Subject *</Label>
                        <Select value={subject} onValueChange={setSubject}>
                          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                          <SelectContent>
                            {['Mathematics', 'Science', 'English', 'History', 'Art', 'Computer Science', 'Physical Education', 'Music', 'Geography'].map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Grade Level</Label>
                        <Select value={gradeLevel} onValueChange={setGradeLevel}>
                          <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                          <SelectContent>
                            {['Elementary (K-5)', 'Middle School (6-8)', 'High School (9-12)', 'College/University'].map(g => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Duration</Label>
                        <Select value={duration} onValueChange={setDuration}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['1 day', '3 days', '1 week', '2 weeks', '1 month', 'Full semester'].map(d => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Target Class</Label>
                        <Input placeholder="E.g., Grade 11A" value={targetClass} onChange={e => setTargetClass(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Describe your teaching plan needs *</Label>
                      <Textarea
                        placeholder="What do you want to teach? Include learning objectives, specific topics, any requirements..."
                        className="min-h-32"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => { setPrompt(""); setTitle(""); }}>Clear</Button>
                    <Button onClick={handleGeneratePlan} disabled={isGenerating || !subject || !prompt}>
                      {isGenerating ? (
                        <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Brain className="mr-2 h-4 w-4" /> Generate Plan</>
                      )}
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Quick Templates</CardTitle>
                    <CardDescription>Click a template to auto-fill & generate</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {templatePrompts.map((template, index) => (
                      <button
                        key={index}
                        className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{template.icon}</span>
                          <div>
                            <p className="font-medium text-sm">{template.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{template.text}</p>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="outline" className="text-[10px] px-1 py-0">{template.subject}</Badge>
                              <Badge variant="outline" className="text-[10px] px-1 py-0">{template.duration}</Badge>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ===== RESULT TAB ===== */}
            <TabsContent value="result">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{title || "Generated Teaching Plan"}</CardTitle>
                    <CardDescription>
                      {subject} {targetClass ? `for ${targetClass}` : ""} {gradeLevel ? `• ${gradeLevel}` : ""} • {duration}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                      <Copy className="mr-2 h-4 w-4" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={openCreatePathsFromCurrent}>
                      <Book className="mr-2 h-4 w-4" /> Create Learning Paths
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md p-6 bg-card min-h-[400px] prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{generatedPlan}</ReactMarkdown>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => { setActiveTab("input"); setGeneratedPlan(""); }}>
                    Edit Parameters
                  </Button>
                  <Button onClick={handleSavePlan}><Save className="mr-2 h-4 w-4" /> Save Plan</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* ===== SAVED PLANS TAB ===== */}
            <TabsContent value="saved">
              {savedPlans.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    <p className="text-muted-foreground">No saved plans yet. Generate and save your first plan!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {savedPlans.map(plan => (
                    <Card key={plan.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{plan.title}</CardTitle>
                            <CardDescription>
                              {plan.subject} {plan.targetClass ? `• ${plan.targetClass}` : ''} • {new Date(plan.createdAt).toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => openCreatePathsDialog(plan)}>
                              <Book className="mr-1 h-3 w-3" /> Create Paths
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => {
                              navigate(`/classes?generateQuiz=true&topic=${encodeURIComponent(plan.title)}&subject=${encodeURIComponent(plan.subject)}`);
                            }}>
                              <Trophy className="mr-1 h-3 w-3" /> Generate Quiz
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => {
                              setGeneratedPlan(plan.content);
                              setTitle(plan.title);
                              setSubject(plan.subject);
                              setActiveTab("result");
                            }}>
                              View Plan
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeletePlan(plan.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {plan.description && (
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground line-clamp-2">{plan.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Learning Paths Dialog */}
      <Dialog open={createPathDialogOpen} onOpenChange={setCreatePathDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Learning Paths</DialogTitle>
            <DialogDescription>
              Generate learning paths from "{pathPlanSource?.title}". Add multiple topics to create separate paths.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Topics (one learning path per topic)</Label>
              {pathTopics.map((topic, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`e.g. Topic ${i + 1} from the plan`}
                    value={topic}
                    onChange={e => updateTopic(i, e.target.value)}
                  />
                  {pathTopics.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeTopic(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addTopicField}>
                <Plus className="mr-1 h-3 w-3" /> Add Topic
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Difficulty</Label>
                <Select value={pathDifficulty} onValueChange={setPathDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade Level</Label>
                <Select value={pathGradeLevel} onValueChange={setPathGradeLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Elementary">Elementary</SelectItem>
                    <SelectItem value="Middle School">Middle School</SelectItem>
                    <SelectItem value="High School">High School</SelectItem>
                    <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {createdPathIds.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    ✅ {createdPathIds.length} learning path(s) created!
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Now assign them to a class so students can access them.
                  </p>
                </div>
                <Button onClick={openAssignDialog} className="w-full">
                  <Send className="mr-2 h-4 w-4" /> Assign to Class
                </Button>
              </div>
            ) : (
              <Button
                onClick={generateLearningPaths}
                disabled={generatingPaths || pathTopics.every(t => !t.trim())}
                className="w-full"
              >
                {generatingPaths ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate {pathTopics.filter(t => t.trim()).length} Learning Path(s)</>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign to Class Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Class</DialogTitle>
            <DialogDescription>
              Send {createdPathIds.length} learning path(s) to all students in a class.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">You don't have any classes yet. Create one first in the Classes page.</p>
            ) : (
              <>
                <div>
                  <Label>Select Class</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} ({c.subject})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={assignPathsToClass} disabled={assigning || !selectedClassId} className="w-full">
                  {assigning ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Assigning...</>
                  ) : (
                    <><Users className="mr-2 h-4 w-4" /> Assign to All Students</>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherPlanGenerator;
