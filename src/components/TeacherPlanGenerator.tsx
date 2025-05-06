
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Save, Download, Copy, RefreshCw } from "lucide-react";
import { TeacherPlan, saveTeacherPlan, generateId } from "@/services/localStorageService";
import { useAuth } from "@/contexts/AuthContext";

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
      // In a real implementation, this would call an AI service
      // For demo purposes, we'll simulate the response
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a sample plan based on the prompt
      const samplePlan = generateSamplePlan(subject, prompt);
      setGeneratedPlan(samplePlan);
      
      // Auto-generate a title if not provided
      if (!title) {
        setTitle(`${subject} Teaching Plan`);
      }
      
      setActiveTab("result");
      toast({
        title: "Plan generated successfully",
        description: "Your teaching plan has been generated. You can now edit and save it.",
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "There was an error generating your plan. Please try again.",
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

  const generateSamplePlan = (subject: string, promptText: string) => {
    // This is a mock implementation
    const subjectPlans: Record<string, string> = {
      "Mathematics": `# Mathematics Teaching Plan

## Week 1: Introduction to Algebra
- **Day 1**: Variables and expressions
- **Day 2**: Solving simple equations
- **Day 3**: Word problems and applications
- **Day 4**: Practice and worksheets
- **Day 5**: Quiz and review

## Week 2: Linear Equations
- **Day 1**: Graphing coordinates
- **Day 2**: Slope and intercepts
- **Day 3**: Writing equations in different forms
- **Day 4**: Applications of linear equations
- **Day 5**: Project: Real-world linear relationships

## Learning Objectives
1. Students will be able to recognize and evaluate algebraic expressions
2. Students will be able to solve linear equations
3. Students will be able to graph linear equations
4. Students will be able to apply algebraic concepts to real-world problems

## Assessment Strategy
- Daily warm-up problems (formative)
- Weekly quizzes (summative)
- End-of-unit project (performance-based)
- Student self-reflection logs

## Differentiation Strategies
- Advanced students: Extended problems with multiple variables
- Struggling students: Visual aids and manipulatives
- Group work with mixed-ability pairing`,

      "Science": `# Science Teaching Plan

## Unit: Ecosystems and Biodiversity

### Week 1: Introduction to Ecosystems
- **Day 1**: What is an ecosystem? Components and interactions
- **Day 2**: Energy flow in ecosystems
- **Day 3**: Food chains and food webs
- **Day 4**: Lab: Building a terrarium ecosystem
- **Day 5**: Ecosystem services and human impacts

### Week 2: Biodiversity
- **Day 1**: What is biodiversity? Levels and importance
- **Day 2**: Threats to biodiversity
- **Day 3**: Conservation strategies
- **Day 4**: Field trip: Local ecosystem exploration
- **Day 5**: Student presentations on endangered species

## Learning Objectives
1. Students will understand the components and interactions within ecosystems
2. Students will be able to trace energy flow through food webs
3. Students will recognize the importance of biodiversity
4. Students will identify threats to ecosystems and potential solutions

## Materials Needed
- Terrarium supplies (containers, soil, plants, etc.)
- Field guides for local flora and fauna
- Digital cameras or smartphones for documentation
- Poster board for presentations

## Assessment
- Terrarium design and maintenance (lab grade)
- Field trip observation journal (participation)
- Endangered species presentation (project grade)
- Unit test on ecosystem concepts (summative)`,

      "English": `# English Literature Teaching Plan

## Unit: Shakespeare's Macbeth

### Week 1: Introduction and Context
- **Day 1**: Historical context and Shakespeare's theater
- **Day 2**: Character introduction and plot overview
- **Day 3**: Begin reading Act I, analyze language and themes
- **Day 4**: Continue Act I, focus on prophecies and ambition
- **Day 5**: Complete Act I, discuss Lady Macbeth's character

### Week 2: Development and Analysis
- **Day 1**: Act II, focus on guilt and hallucinations
- **Day 2**: Complete Act II, discuss symbolism
- **Day 3**: Act III, power and corruption themes
- **Day 4**: In-class writing workshop: character analysis
- **Day 5**: Collaborative scene performances

## Writing Assignments
1. Character analysis essay (750-1000 words)
2. Creative writing: Alternative ending or additional scene
3. Comparative analysis: Macbeth vs. modern power figures

## Discussion Questions
- How does Shakespeare use supernatural elements to advance his themes?
- In what ways does power corrupt Macbeth and Lady Macbeth?
- How relevant are the play's themes to contemporary politics and society?

## Extension Activities
- Film analysis: Compare different film adaptations of key scenes
- Creative project: Design stage settings or costumes for a modern production
- Debate: Fate vs. free will in the play`,
    };

    return subjectPlans[subject] || 
      `# ${subject} Teaching Plan\n\n(This is a sample plan based on your prompt: "${promptText}")

## Week 1: Introduction
- **Day 1**: Overview and key concepts
- **Day 2**: Foundational skills development
- **Day 3**: Practical applications
- **Day 4**: Group activities and discussion
- **Day 5**: Assessment and review

## Week 2: Core Content
- **Day 1**: Advanced concepts
- **Day 2**: Problem-solving techniques
- **Day 3**: Case studies
- **Day 4**: Project work
- **Day 5**: Presentations

## Learning Objectives
1. Students will understand fundamental principles
2. Students will develop analytical skills
3. Students will apply concepts to real-world situations
4. Students will effectively communicate their understanding

## Assessment Strategy
- Daily participation
- Weekly quizzes
- Final project
- Peer evaluation

## Resources
- Textbook readings
- Online modules
- Handouts and worksheets
- Video tutorials`;
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
        <h1 className="text-3xl font-bold text-slate-900">AI Teaching Plan Generator</h1>
        <p className="text-slate-600 mt-1">
          Create comprehensive teaching plans powered by AI
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
