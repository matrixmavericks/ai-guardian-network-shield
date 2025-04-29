
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  ThumbsDown,
  Compass
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
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [activeService, setActiveService] = useState("openai");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubject, setActiveSubject] = useState("general");
  const [apiKey, setApiKey] = useState("");
  const [showApiInput, setShowApiInput] = useState(false);
  const { toast } = useToast();

  const subjects = [
    { id: "general", name: "General", icon: <BookOpen className="h-4 w-4" /> },
    { id: "math", name: "Mathematics", icon: <Calculator className="h-4 w-4" /> },
    { id: "writing", name: "Writing", icon: <PenTool className="h-4 w-4" /> },
    { id: "languages", name: "Languages", icon: <Languages className="h-4 w-4" /> }
  ];

  const services = [
    { id: "openai", name: "OpenAI (ChatGPT)", apiBase: "https://api.openai.com/v1/chat/completions", model: "gpt-3.5-turbo" },
    { id: "gemini", name: "Google (Gemini)", apiBase: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent", model: "gemini-pro" },
    { id: "anthropic", name: "Anthropic (Claude)", apiBase: "https://api.anthropic.com/v1/messages", model: "claude-instant-1.2" },
    { id: "perplexity", name: "Perplexity AI", apiBase: "https://api.perplexity.ai/chat/completions", model: "llama-3.1-sonar-small-128k-online" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    if (!apiKey && !localStorage.getItem(`${activeService}_api_key`)) {
      setShowApiInput(true);
      toast({
        title: "API Key Required",
        description: `Please enter your ${services.find(s => s.id === activeService)?.name} API key to continue.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await callExternalAI(prompt, activeService, activeSubject);
      processResponse(prompt, response);
    } catch (error) {
      console.error("AI API error:", error);
      toast({
        title: "Error",
        description: "Failed to get a response from the AI service. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const callExternalAI = async (userPrompt: string, service: string, subject: string): Promise<string> => {
    const serviceInfo = services.find(s => s.id === service);
    if (!serviceInfo) throw new Error("Invalid service selected");
    
    const storedApiKey = localStorage.getItem(`${service}_api_key`) || apiKey;
    
    // Prepare the system message based on subject and teaching mode
    let systemMessage = "You are an educational AI assistant.";
    
    if (isProcessTeaching) {
      systemMessage += " Your goal is to teach the process rather than just giving answers. Break down solutions into steps and explain concepts thoroughly.";
    }
    
    switch (subject) {
      case "math":
        systemMessage += " Focus on mathematical problem-solving and showing steps clearly.";
        break;
      case "writing":
        systemMessage += " Help with essay structure, writing techniques, and encourage original thought.";
        break;
      case "languages":
        systemMessage += " Assist with language learning, translation, and grammatical understanding.";
        break;
      default:
        systemMessage += " Provide helpful educational guidance on general topics.";
    }
    
    try {
      // For demonstration, we'll use a simplified call just for OpenAI
      // In a real app, you would handle each API's specific requirements
      
      if (service === "openai") {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${storedApiKey}`
          },
          body: JSON.stringify({
            model: serviceInfo.model,
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("OpenAI API error:", errorData);
          throw new Error(errorData.error?.message || "Failed to get response");
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
      } 
      else if (service === "perplexity") {
        const response = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${storedApiKey}`
          },
          body: JSON.stringify({
            model: "llama-3.1-sonar-small-128k-online",
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 1000
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Perplexity API error:", errorData);
          throw new Error(errorData.error?.message || "Failed to get response");
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
      }
      else {
        // For other services, we'll use a fallback mechanism for demo
        // This would be replaced with actual API calls in production
        return generateFallbackResponse(userPrompt, subject);
      }
    } catch (error) {
      console.error("API call error:", error);
      throw error;
    }
  };

  const processResponse = (userPrompt: string, aiResponse: string) => {
    const newResponse = {
      id: Date.now(),
      prompt: userPrompt,
      response: aiResponse,
      isProcessTaught: isProcessTeaching,
      service: activeService
    };
    
    setResponses([newResponse, ...responses]);
    setPrompt("");
    
    toast({
      title: isProcessTeaching ? "Process-Focused Response" : "Direct Response",
      description: isProcessTeaching 
        ? "You received a process-teaching response to help you learn." 
        : "You received a direct response to your question.",
      variant: isProcessTeaching ? "default" : "destructive",
    });
  };
  
  const generateFallbackResponse = (promptText: string, subject: string): string => {
    // This is a fallback when external APIs fail or for demo purposes
    if (subject === "math" || promptText.match(/\d+\s*[+\-*/]\s*\d+/) || promptText.includes("=")) {
      // Math problem detected
      if (isProcessTeaching) {
        return `Let me walk you through solving this problem step by step:

1. First, I'll identify the type of mathematical problem we're working with
2. Next, I'll apply the relevant mathematical rules and principles
3. I'll solve each step carefully, explaining the process
4. Finally, I'll verify the answer by checking our work

Would you like me to go through any specific step in more detail?`;
      } else {
        return "I can solve this for you, but I'm configured to teach the process. Switch to Process Teaching Mode to learn how to solve this yourself.";
      }
    } else if (subject === "writing" || promptText.toLowerCase().includes("write") && (
      promptText.toLowerCase().includes("essay") || 
      promptText.toLowerCase().includes("paper") || 
      promptText.toLowerCase().includes("report"))) {
      // Essay writing detected
      return `Instead of writing the content for you, let me help you develop your writing skills:

1. Start with brainstorming: What are the main points you want to cover?
2. Organize your thoughts into an outline with:
   - Introduction (thesis statement)
   - Body paragraphs (evidence and analysis)
   - Conclusion (restate thesis and provide closure)
3. For each section, write a topic sentence followed by supporting details
4. After writing, review for clarity, coherence, and grammar

Which part of this writing process would you like me to help you with specifically?`;
    } else if (subject === "languages" || promptText.toLowerCase().includes("translate") || 
               promptText.toLowerCase().includes("conjugate")) {
      // Language learning detected
      return `I can help you learn how to translate effectively:

1. First, understand the context of what you're translating
2. Identify key vocabulary and grammar structures
3. Work on a direct translation, then refine for natural expression
4. Consider cultural nuances that might affect the meaning

Would you like to practice with some vocabulary or specific phrases?`;
    } else {
      // General response
      if (isProcessTeaching) {
        return `I'll help you understand this topic by breaking it down:

1. Let's start with the fundamental concepts
2. Then explore how these concepts relate to each other
3. Apply critical thinking to analyze different perspectives
4. Connect these ideas to practical applications

What specific aspect would you like me to elaborate on first?`;
      } else {
        return `Here's a direct answer to your question:

${promptText.includes("?") ? "Based on your question, " : ""}I'd recommend researching this topic further by examining credible sources and considering multiple perspectives. The key concepts to understand are the underlying principles, practical applications, and broader implications.

Would you like me to suggest specific resources for this topic?`;
      }
    }
  };

  const getServiceIcon = (serviceId: string) => {
    switch (serviceId) {
      case "openai":
        return <Brain className="h-4 w-4 text-emerald-500" />;
      case "gemini":
        return <Brain className="h-4 w-4 text-blue-500" />;
      case "anthropic":
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
  
  const handleApiKeySave = () => {
    if (apiKey) {
      localStorage.setItem(`${activeService}_api_key`, apiKey);
      setShowApiInput(false);
      toast({
        title: "API Key Saved",
        description: `Your ${services.find(s => s.id === activeService)?.name} API key has been saved for this session.`,
      });
    }
  };
  
  const handleServiceChange = (newService: string) => {
    setActiveService(newService);
    // Check if we already have an API key for this service
    const storedKey = localStorage.getItem(`${newService}_api_key`);
    if (!storedKey) {
      setShowApiInput(true);
    } else {
      setShowApiInput(false);
    }
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
              <Select value={activeService} onValueChange={handleServiceChange}>
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
        
        {showApiInput && (
          <div className="mb-6">
            <Alert className="bg-blue-50 border-blue-200">
              <div className="space-y-4 py-2">
                <AlertDescription>
                  To use {services.find(s => s.id === activeService)?.name}, you need to provide an API key.
                </AlertDescription>
                <div className="flex gap-2">
                  <Input 
                    type="password"
                    placeholder={`Enter your ${services.find(s => s.id === activeService)?.name} API key`}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleApiKeySave}>Save Key</Button>
                </div>
                <p className="text-xs text-slate-500">
                  Your API key is stored locally in your browser and never sent to our servers.
                </p>
              </div>
            </Alert>
          </div>
        )}
        
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
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs"
                onClick={() => setShowApiInput(true)}
              >
                <Settings className="h-3 w-3 mr-1" />
                Configure API
              </Button>
            </div>
          </form>
        </div>
        
        <div>
          <h2 className="text-lg font-medium text-slate-800 mb-4">Conversation History</h2>
          {responses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <Compass className="h-12 w-12 mx-auto text-slate-300 mb-2" />
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
