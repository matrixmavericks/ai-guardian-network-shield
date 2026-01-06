import React, { useState } from "react";
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
  ThumbsUp,
  ThumbsDown,
  Loader,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCurrentUser } from "@/services/localStorageService";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AIResponse {
  id: number;
  prompt: string;
  response: string;
  isProcessTaught: boolean;
  wasRewritten?: boolean;
  originalPrompt?: string;
}

const StudentInterface = () => {
  const [prompt, setPrompt] = useState("");
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [isProcessTeaching, setIsProcessTeaching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubject, setActiveSubject] = useState("general");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const subjects = [
    { id: "general", name: "General", icon: <BookOpen className="h-4 w-4" /> },
    { id: "math", name: "Mathematics", icon: <Calculator className="h-4 w-4" /> },
    { id: "writing", name: "Writing", icon: <PenTool className="h-4 w-4" /> },
    { id: "languages", name: "Languages", icon: <Languages className="h-4 w-4" /> }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setBlockedMessage(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          prompt, 
          subject: activeSubject, 
          gradeLevel: 'high-school',
          userId: user?.id || 'anonymous',
          processTeaching: isProcessTeaching
        }
      });

      if (error) {
        console.error("AI API error:", error);
        toast({
          title: "Error",
          description: "Failed to get a response. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if prompt was blocked
      if (data.blocked) {
        setBlockedMessage(data.reason);
        toast({
          title: "Prompt Blocked",
          description: data.reason,
          variant: "destructive",
        });
        return;
      }

      // Check for rate limiting errors
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      // Add the response
      const newResponse: AIResponse = {
        id: Date.now(),
        prompt: data.wasRewritten ? data.modifiedPrompt : prompt,
        response: data.response,
        isProcessTaught: isProcessTeaching,
        wasRewritten: data.wasRewritten,
        originalPrompt: data.wasRewritten ? prompt : undefined
      };
      
      setResponses([newResponse, ...responses]);
      setPrompt("");

      if (data.wasRewritten) {
        toast({
          title: "Prompt Rewritten",
          description: "Your question was transformed into a learning-focused prompt.",
        });
      } else {
        toast({
          title: isProcessTeaching ? "Process-Focused Response" : "Direct Response",
          description: isProcessTeaching 
            ? "You received a process-teaching response to help you learn." 
            : "You received a direct response to your question.",
        });
      }
    } catch (error) {
      console.error("AI API error:", error);
      toast({
        title: "Error",
        description: "Failed to get a response from the AI service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  const currentUser = getCurrentUser();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-primary mr-2" />
              <h1 className="text-2xl font-bold text-foreground">AI Learning Assistant</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="process-mode"
                checked={isProcessTeaching}
                onCheckedChange={setIsProcessTeaching}
              />
              <Label htmlFor="process-mode">Process Teaching Mode</Label>
            </div>
          </div>
          <p className="text-muted-foreground mt-2">
            Ask questions and receive guidance that helps you understand the process.
            {currentUser && <span className="ml-1">Welcome, {currentUser.name}!</span>}
          </p>
        </header>
        
        <div className="mb-6">
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle>How to Use This Assistant</CardTitle>
              <CardDescription>Powered by AI with ethical prompt detection</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li><span className="font-medium text-foreground">Process Teaching Mode</span>: When enabled, you'll receive step-by-step explanations instead of just answers.</li>
                <li><span className="font-medium text-foreground">Ethical AI</span>: Prompts requesting direct answers or cheating are automatically detected and blocked.</li>
                <li><span className="font-medium text-foreground">Prompt Rewriting</span>: Direct-answer questions are transformed into learning-focused prompts.</li>
                <li><span className="font-medium text-foreground">Ask "How" Questions</span>: Questions like "How do I solve this?" give better learning outcomes.</li>
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
                <Card className="border-primary/10 bg-primary/5">
                  <CardContent className="pt-4">
                    {subject.id === "general" && (
                      <p className="text-sm text-foreground">Ask any question and I'll help guide your learning process.</p>
                    )}
                    {subject.id === "math" && (
                      <p className="text-sm text-foreground">Get step-by-step guidance for solving equations, problems, and understanding concepts.</p>
                    )}
                    {subject.id === "writing" && (
                      <p className="text-sm text-foreground">Learn to plan, structure, and refine your essays and written assignments.</p>
                    )}
                    {subject.id === "languages" && (
                      <p className="text-sm text-foreground">Practice translation, grammar, and language comprehension with guided learning.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {blockedMessage && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{blockedMessage}</AlertDescription>
          </Alert>
        )}
        
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>
              <Textarea 
                placeholder="Ask a question... (e.g., 'How do I solve quadratic equations?')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px] mb-4"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {isProcessTeaching 
                    ? "Process Teaching Mode is ON - You'll receive step-by-step guidance" 
                    : "Direct answers mode - Switch to Process Teaching for better learning"}
                </p>
                <Button type="submit" disabled={isLoading || !prompt.trim()}>
                  {isLoading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Ask Question
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Conversation History</h2>
          
          {responses.length === 0 ? (
            <Card className="bg-muted/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No conversations yet. Ask your first question above!</p>
              </CardContent>
            </Card>
          ) : (
            responses.map((response) => (
              <Card key={response.id} className={response.isProcessTaught ? "border-l-4 border-l-primary" : "border-l-4 border-l-orange-400"}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {response.wasRewritten && (
                        <span className="inline-flex items-center text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded mr-2">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Rewritten
                        </span>
                      )}
                      {response.isProcessTaught ? "📚 Process Teaching" : "💡 Direct Response"}
                    </CardTitle>
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleFeedback(response.id, true)}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleFeedback(response.id, false)}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {response.wasRewritten && response.originalPrompt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Original: <span className="italic">"{response.originalPrompt}"</span>
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-3 rounded-md mb-3">
                    <p className="text-sm font-medium text-foreground">Your question:</p>
                    <p className="text-sm text-muted-foreground">{response.prompt}</p>
                  </div>
                  <div className="p-3 bg-primary/5 rounded-md">
                    <p className="text-sm font-medium text-foreground mb-2">AI Response:</p>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{response.response}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentInterface;
