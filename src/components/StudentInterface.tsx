
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Brain, 
  Send, 
  BookOpen, 
  Calculator, 
  PenTool, 
  Languages, 
  Settings, 
  Info,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

const StudentInterface = () => {
  const [prompt, setPrompt] = useState("");
  const [responses, setResponses] = useState<{
    id: number;
    prompt: string;
    response: string;
    isProcessTaught: boolean;
    service: string;
  }[]>([]);
  const [isProcessTeaching, setIsProcessTeaching] = useState(true);
  const [activeService, setActiveService] = useState("default");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubject, setActiveSubject] = useState("general");
  const { toast } = useToast();

  const subjects = [
    { id: "general", name: "General", icon: <BookOpen className="h-4 w-4" /> },
    { id: "math", name: "Mathematics", icon: <Calculator className="h-4 w-4" /> },
    { id: "writing", name: "Writing", icon: <PenTool className="h-4 w-4" /> },
    { id: "languages", name: "Languages", icon: <Languages className="h-4 w-4" /> }
  ];

  const services = [
    { id: "default", name: "OpenAI (ChatGPT)" },
    { id: "gemini", name: "Google (Gemini)" },
    { id: "claude", name: "Anthropic (Claude)" },
    { id: "perplexity", name: "Perplexity AI" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      processPrompt(prompt);
      setIsLoading(false);
    }, 1000);
  };

  const processPrompt = (userPrompt: string) => {
    let response = "";
    let isProcessTaught = false;
    
    // Process based on subject and content
    if (activeSubject === "math" || userPrompt.match(/\d+\s*[+\-*/]\s*\d+/) || userPrompt.includes("=")) {
      // Math problem detected
      if (isProcessTeaching) {
        response = generateMathProcessResponse(userPrompt);
        isProcessTaught = true;
      } else {
        response = "I can solve this for you, but I'm configured to teach the process. Switch to Process Teaching Mode to learn how to solve this yourself.";
      }
    } else if (activeSubject === "writing" || userPrompt.toLowerCase().includes("write") && (
      userPrompt.toLowerCase().includes("essay") || 
      userPrompt.toLowerCase().includes("paper") || 
      userPrompt.toLowerCase().includes("report"))) {
      // Essay writing detected
      response = generateWritingResponse(userPrompt);
      isProcessTaught = true;
    } else if (activeSubject === "languages" || userPrompt.toLowerCase().includes("translate") || 
               userPrompt.toLowerCase().includes("conjugate")) {
      // Language learning detected
      response = generateLanguageResponse(userPrompt);
      isProcessTaught = true;
    } else {
      // General response
      response = generateGeneralResponse(userPrompt);
      isProcessTaught = isProcessTeaching;
    }
    
    const newResponse = {
      id: Date.now(),
      prompt: userPrompt,
      response,
      isProcessTaught,
      service: activeService
    };
    
    setResponses([newResponse, ...responses]);
    setPrompt("");
    
    toast({
      title: isProcessTaught ? "Process-Focused Response" : "Direct Response",
      description: isProcessTaught 
        ? "You received a process-teaching response to help you learn." 
        : "You received a direct response to your question.",
      variant: isProcessTaught ? "default" : "destructive",
    });
  };
  
  const generateMathProcessResponse = (mathPrompt: string): string => {
    const examples = {
      "7x + 39x": `Let me guide you through solving 7x + 39x:
      
1. Identify like terms: Both 7x and 39x are like terms with variable x
2. Apply distributive property: (7+39)x
3. Add the coefficients: 46x

This approach teaches algebraic simplification by combining like terms. Try applying this method to similar problems!`,
      "5 + 3": `Let's solve 5 + 3 step-by-step:

1. We have two integers: 5 and 3
2. Addition means we combine these values
3. 5 + 3 = 8

Learning this process helps with mental math. Can you try a different addition problem?`,
      "12 - 7": `Let me show you how to solve 12 - 7:

1. Start with 12
2. Subtraction means removing 7 from this value
3. 12 - 7 = 5

This process works for any subtraction problem. Try applying it to a different example!`,
      "6 * 8": `I'll walk you through multiplying 6 * 8:

1. Multiplication is repeated addition: 6 added 8 times (or vice versa)
2. You can break this down: 6 * 8 = 6 * 4 * 2 = 24 * 2 = 48
3. The answer is 48

Understanding multiplication as repeated addition helps build your mathematical intuition.`
    };

    // Check if we have a direct match in our examples
    for (const [key, value] of Object.entries(examples)) {
      if (mathPrompt.includes(key)) {
        return value;
      }
    }
    
    // Default math response
    return `Let me walk you through solving this step by step:

1. First, identify the type of problem we're solving (algebra, arithmetic, calculus, etc.)
2. Break it down into manageable parts using appropriate mathematical rules
3. Apply the rules systematically, showing work at each step
4. Verify your answer by checking if it satisfies the original problem

Would you like me to explain any specific step of this process in more detail?`;
  };

  const generateWritingResponse = (prompt: string): string => {
    return `Instead of writing the content for you, let me help you develop your writing skills:

1. Start with brainstorming: What are the main points you want to cover?
2. Organize your thoughts into an outline with:
   - Introduction (thesis statement)
   - Body paragraphs (evidence and analysis)
   - Conclusion (restate thesis and provide closure)
3. For each section, write a topic sentence followed by supporting details
4. After writing, review for clarity, coherence, and grammar

Which part of this writing process would you like me to help you with specifically?`;
  };

  const generateLanguageResponse = (prompt: string): string => {
    if (prompt.toLowerCase().includes("translate")) {
      return `I can help you learn how to translate effectively:

1. First, understand the context of what you're translating
2. Identify key vocabulary and grammar structures
3. Work on a direct translation, then refine for natural expression
4. Consider cultural nuances that might affect the meaning

Would you like to practice with some vocabulary or specific phrases?`;
    } else {
      return `Here's how to approach language learning systematically:

1. Start with core vocabulary and basic grammar rules
2. Practice with simple sentences using patterns
3. Gradually increase complexity as you get comfortable
4. Use spaced repetition for vocabulary retention

What specific aspect of language learning are you working on?`;
    }
  };

  const generateGeneralResponse = (prompt: string): string => {
    if (isProcessTeaching) {
      return `I'll help you understand this topic by breaking it down:

1. Let's start with the fundamental concepts
2. Then explore how these concepts relate to each other
3. Apply critical thinking to analyze different perspectives
4. Connect these ideas to practical applications

What specific aspect would you like me to elaborate on first?`;
    } else {
      return `Here's a direct answer to your question:

${prompt.includes("?") ? "Based on your question, " : ""}I'd recommend researching this topic further by examining credible sources and considering multiple perspectives. The key concepts to understand are the underlying principles, practical applications, and broader implications.

Would you like me to suggest specific resources for this topic?`;
    }
  };

  const getServiceIcon = (serviceId: string) => {
    switch (serviceId) {
      case "default":
        return <Brain className="h-4 w-4 text-emerald-500" />;
      case "gemini":
        return <Brain className="h-4 w-4 text-blue-500" />;
      case "claude":
        return <Brain className="h-4 w-4 text-purple-500" />;
      case "perplexity":
        return <Brain className="h-4 w-4 text-amber-500" />;
      default:
        return <Brain className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleFeedback = (responseId: number, isPositive: boolean) => {
    toast({
      title: isPositive ? "Feedback Recorded" : "We'll Improve",
      description: isPositive 
        ? "Thank you for your positive feedback!" 
        : "Thanks for helping us improve our responses.",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-slate-800">AI Learning Assistant</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="process-mode"
                  checked={isProcessTeaching}
                  onCheckedChange={setIsProcessTeaching}
                />
                <Label htmlFor="process-mode">Process Teaching Mode</Label>
              </div>
              <Select value={activeService} onValueChange={setActiveService}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select AI Service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center">
                        {getServiceIcon(service.id)}
                        <span className="ml-2">{service.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-slate-600 mt-2">
            Ask questions and receive guidance that helps you understand the process.
          </p>
        </header>
        
        <div className="mb-6">
          <Card className="border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle>How to Use This Assistant</CardTitle>
              <CardDescription>Get the most out of your learning experience</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                <li><span className="font-medium">Process Teaching Mode</span>: When enabled, you'll receive step-by-step explanations instead of just answers.</li>
                <li><span className="font-medium">Ask "How" Questions</span>: Questions like "How do I solve this equation?" will give you better learning outcomes than "What's the answer?"</li>
                <li><span className="font-medium">Request Explanations</span>: Ask for the reasoning behind concepts to deepen your understanding.</li>
                <li><span className="font-medium">Follow Up</span>: If you don't understand something, ask for clarification or a different explanation approach.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
        
        <div className="mb-6">
          <Tabs value={activeSubject} onValueChange={setActiveSubject}>
            <TabsList className="mb-4">
              {subjects.map(subject => (
                <TabsTrigger key={subject.id} value={subject.id} className="flex items-center gap-2">
                  {subject.icon}
                  {subject.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {subjects.map(subject => (
              <TabsContent key={subject.id} value={subject.id}>
                <Card className="border-blue-100 bg-blue-50/50">
                  <CardContent className="pt-4">
                    {subject.id === "general" && (
                      <p className="text-sm text-slate-700">Ask any question and I'll help guide your learning process.</p>
                    )}
                    {subject.id === "math" && (
                      <p className="text-sm text-slate-700">Get step-by-step guidance for solving equations, problems, and understanding concepts.</p>
                    )}
                    {subject.id === "writing" && (
                      <p className="text-sm text-slate-700">Learn to plan, structure, and refine your essays and written assignments.</p>
                    )}
                    {subject.id === "languages" && (
                      <p className="text-sm text-slate-700">Practice vocabulary, grammar, and translation with guided assistance.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Textarea
                placeholder={isProcessTeaching 
                  ? "Ask about a concept or how to solve a problem..." 
                  : "Ask a question..."
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] pr-12 resize-none"
                disabled={isLoading}
              />
              <Button 
                type="submit"
                size="icon"
                className={`absolute bottom-3 right-3 ${isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <div className="flex items-center">
                {getServiceIcon(activeService)}
                <span className="ml-1">
                  Using {services.find(s => s.id === activeService)?.name || "Default AI"} - 
                  {isProcessTeaching 
                    ? " Process Teaching Mode is ON" 
                    : " Process Teaching Mode is OFF"
                  }
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Configure
              </Button>
            </div>
          </form>
        </div>
        
        <div>
          <h2 className="text-lg font-medium text-slate-800 mb-4">Conversation History</h2>
          {responses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <Brain className="h-12 w-12 mx-auto text-slate-300 mb-2" />
              <h3 className="text-lg font-medium text-slate-700">No conversations yet</h3>
              <p className="text-slate-500">Ask a question to get started!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {responses.map((item) => (
                <Card key={item.id} className="transition-all hover:shadow-md">
                  <CardHeader className="pb-2 bg-slate-50">
                    <CardTitle className="text-base">Your Question:</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-slate-800">{item.prompt}</p>
                  </CardContent>
                  <CardHeader className={`pb-2 ${item.isProcessTaught ? 'bg-blue-50' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Response:</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center">
                          {getServiceIcon(item.service)}
                          <span className="ml-1">{services.find(s => s.id === item.service)?.name || "AI"}</span>
                        </span>
                        {item.isProcessTaught && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                            Process-Focused
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 whitespace-pre-line">
                    <p className={item.isProcessTaught ? 'text-blue-800' : 'text-slate-800'}>
                      {item.response}
                    </p>
                  </CardContent>
                  <CardFooter className="text-xs text-slate-500 justify-between border-t">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleFeedback(item.id, true)}
                        className="h-8 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        Helpful
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleFeedback(item.id, false)}
                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        Not Helpful
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-xs">Flag as Inappropriate</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentInterface;
