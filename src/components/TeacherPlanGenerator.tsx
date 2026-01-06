import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Save, Download, Copy, RefreshCw, Sparkles } from "lucide-react";
import { TeacherPlan, saveTeacherPlan, generateId } from "@/services/localStorageService";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const TeacherPlanGenerator = () => {
  const [subject, setSubject] = useState("");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [targetClass, setTargetClass] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("input");
  const { toast } = useToast();
  const { user } = useAuth();

  const templatePrompts = [
    {
      title: "Weekly Lesson Plan",
      text: "Generate a week-long lesson plan for teaching [subject] to [grade level] students, covering [topic]."
    },
    {
      title: "Assessment Plan",
      text: "Create an assessment strategy for evaluating student understanding of [subject] with a focus on [specific concepts]."
    },
    {
      title: "Project-Based Learning",
      text: "Design a project-based learning assignment for [subject] that incorporates [learning objectives]."
    }
  ];

  const handleSelectTemplate = (templateText: string) => {
    setPrompt(templateText);
  };

  const handleGeneratePlan = async () => {
    if (!subject || !prompt) {
      toast({
        title: "Missing information",
        description: "Please provide both a subject and prompt to generate a plan.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-teaching-plan', {
        body: { subject, prompt, targetClass, title }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedPlan(data.plan);
      
      if (!title) {
        setTitle(`${subject} Teaching Plan`);
      }
      
      setActiveTab("result");
      toast({
        title: "Plan generated successfully",
        description: "Your AI-powered teaching plan is ready. You can now edit and save it.",
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "There was an error generating your plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePlan = () => {
    if (!user || user.role !== 'teacher') {
      toast({
        title: "Unauthorized",
        description: "You must be logged in as a teacher to save plans.",
        variant: "destructive",
      });
      return;
    }

    if (!title || !subject || !generatedPlan) {
      toast({
        title: "Missing information",
        description: "Please provide a title, subject, and content for your plan.",
        variant: "destructive",
      });
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

    toast({
      title: "Plan saved successfully",
      description: "Your teaching plan has been saved and is now available in your dashboard.",
    });
  };


  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedPlan);
    toast({ 
      title: "Copied to clipboard",
      description: "Plan content has been copied to your clipboard."
    });
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">AI Teaching Plan Generator</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Create comprehensive teaching plans powered by Lovable AI
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="input">
            <Brain className="mr-2 h-4 w-4" />
            Create Plan
          </TabsTrigger>
          <TabsTrigger value="result" disabled={!generatedPlan}>
            <Save className="mr-2 h-4 w-4" />
            Generated Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Plan Parameters</CardTitle>
                <CardDescription>Define what you want to create</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Plan Title (Optional)</Label>
                  <Input 
                    id="title" 
                    placeholder="E.g., Weekly Physics Plan for Grade 11" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="Art">Art</SelectItem>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Physical Education">Physical Education</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetClass">Target Class (Optional)</Label>
                  <Input 
                    id="targetClass" 
                    placeholder="E.g., Grade 11A" 
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">Describe your teaching plan needs</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe what you want to teach, your learning objectives, and any specific requirements..."
                    className="min-h-32"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setPrompt("")}>Clear</Button>
                <Button 
                  onClick={handleGeneratePlan}
                  disabled={isGenerating || !subject || !prompt}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Generate Plan
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Template Library</CardTitle>
                <CardDescription>Choose a template to get started quickly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {templatePrompts.map((template, index) => (
                  <Card 
                    key={index} 
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => handleSelectTemplate(template.text)}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-base">{template.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {template.text}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="result">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{title || "Generated Teaching Plan"}</CardTitle>
                  <CardDescription>
                    {subject} {targetClass ? `for ${targetClass}` : ""}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-6 bg-white min-h-[400px] whitespace-pre-line">
                  {generatedPlan}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setActiveTab("input");
                    setGeneratedPlan("");
                  }}
                >
                  Edit Parameters
                </Button>
                <Button onClick={handleSavePlan}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Plan
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherPlanGenerator;
