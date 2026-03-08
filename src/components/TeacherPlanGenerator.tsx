import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Save, Download, Copy, RefreshCw, Sparkles, BookOpen, Trash2, Clock } from "lucide-react";
import { TeacherPlan, saveTeacherPlan, getTeacherPlans, generateId } from "@/services/localStorageService";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "@/components/DashboardSidebar";
import ReactMarkdown from 'react-markdown';

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

  useEffect(() => {
    if (user) {
      const plans = getTeacherPlans?.() || [];
      setSavedPlans(plans.filter(p => p.createdBy === user.id));
    }
  }, [user]);

  const templatePrompts = [
    {
      title: "Weekly Lesson Plan",
      icon: "📅",
      text: "Create a detailed week-long lesson plan with daily objectives, activities, materials needed, and assessment criteria.",
      subject: "Mathematics",
    },
    {
      title: "Project-Based Learning",
      icon: "🔬",
      text: "Design a hands-on project that students complete over 2 weeks, with milestones, rubrics, and presentation guidelines.",
      subject: "Science",
    },
    {
      title: "Differentiated Instruction",
      icon: "🎯",
      text: "Create a lesson plan with differentiated activities for struggling, on-level, and advanced students on the same topic.",
      subject: "English",
    },
    {
      title: "Assessment & Review",
      icon: "📝",
      text: "Design a comprehensive review session with practice problems, study guides, and a formative assessment quiz.",
      subject: "Mathematics",
    },
    {
      title: "Interactive Workshop",
      icon: "🤝",
      text: "Plan an interactive workshop with group activities, discussion prompts, peer review, and collaborative exercises.",
      subject: "History",
    },
    {
      title: "Lab Activity Plan",
      icon: "🧪",
      text: "Create a detailed lab activity with safety guidelines, step-by-step procedures, data collection sheets, and analysis questions.",
      subject: "Science",
    },
  ];

  const handleSelectTemplate = (template: typeof templatePrompts[0]) => {
    setPrompt(template.text);
    if (!subject) setSubject(template.subject);
  };

  const handleGeneratePlan = async () => {
    if (!subject || !prompt) {
      toast({
        title: "Missing information",
        description: "Please provide both a subject and prompt.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const enhancedPrompt = `${prompt}

Additional context:
- Subject: ${subject}
- Grade Level: ${gradeLevel || 'Not specified'}
- Duration: ${duration}
- Target Class: ${targetClass || 'General'}

Please provide a comprehensive, well-structured teaching plan with clear sections, objectives, activities, materials, assessments, and timing. Use markdown formatting for headers and lists.`;

      const { data, error } = await supabase.functions.invoke('generate-teaching-plan', {
        body: { subject, prompt: enhancedPrompt, targetClass, title, gradeLevel, duration }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setGeneratedPlan(data.plan);
      if (!title) setTitle(`${subject} Teaching Plan - ${duration}`);
      setActiveTab("result");
      toast({
        title: "Plan generated!",
        description: "Your AI-powered teaching plan is ready to review and save.",
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
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

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedPlan);
    toast({ title: "Copied to clipboard" });
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
              <TabsTrigger value="input">
                <Brain className="mr-2 h-4 w-4" /> Create Plan
              </TabsTrigger>
              <TabsTrigger value="result" disabled={!generatedPlan}>
                <Save className="mr-2 h-4 w-4" /> Generated Plan
              </TabsTrigger>
              <TabsTrigger value="saved">
                <BookOpen className="mr-2 h-4 w-4" /> Saved Plans ({savedPlans.length})
              </TabsTrigger>
            </TabsList>

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
                        <Input placeholder="E.g., Weekly Physics Plan" value={title}
                          onChange={e => setTitle(e.target.value)} />
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
                        <Input placeholder="E.g., Grade 11A" value={targetClass}
                          onChange={e => setTargetClass(e.target.value)} />
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
                    <CardDescription>Click a template to get started</CardDescription>
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
                          </div>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

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
                  <Button onClick={handleSavePlan}>
                    <Save className="mr-2 h-4 w-4" /> Save Plan
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

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
                          <Button variant="outline" size="sm" onClick={() => {
                            setGeneratedPlan(plan.content);
                            setTitle(plan.title);
                            setSubject(plan.subject);
                            setActiveTab("result");
                          }}>
                            View Plan
                          </Button>
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
    </div>
  );
};

export default TeacherPlanGenerator;
