
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Brain, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const StudentInterface = () => {
  const [prompt, setPrompt] = useState("");
  const [responses, setResponses] = useState<{
    id: number;
    prompt: string;
    response: string;
    isProcessTaught: boolean;
  }[]>([]);
  const [isProcessTeaching, setIsProcessTeaching] = useState(true);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    // Simulate AI processing and response
    let response = "";
    let isProcessTaught = false;
    
    if (prompt.match(/\d+\s*[+\-*/]\s*\d+/) || prompt.includes("=")) {
      // Math problem detected
      if (isProcessTeaching) {
        response = generateMathProcessResponse(prompt);
        isProcessTaught = true;
      } else {
        response = "I can solve this for you, but I'm configured to teach the process. Switch to Process Teaching Mode to learn how to solve this yourself.";
      }
    } else if (prompt.toLowerCase().includes("write") && (
      prompt.toLowerCase().includes("essay") || 
      prompt.toLowerCase().includes("paper") || 
      prompt.toLowerCase().includes("report"))) {
      // Essay writing detected
      response = "Instead of writing the essay for you, let me help you plan it. First, brainstorm your main points. Then create an outline with an introduction, body paragraphs, and conclusion. Would you like help with any specific part of this process?";
      isProcessTaught = true;
    } else {
      // General response
      response = "I'm here to help you learn! What specific part of this topic would you like me to explain?";
    }
    
    const newResponse = {
      id: Date.now(),
      prompt,
      response,
      isProcessTaught
    };
    
    setResponses([newResponse, ...responses]);
    setPrompt("");
    
    toast({
      title: isProcessTaught ? "Process-Focused Response" : "Response Provided",
      description: isProcessTaught 
        ? "You received a process-teaching response to help you learn." 
        : "You received a direct response to your question.",
      variant: isProcessTaught ? "default" : "destructive",
    });
  };
  
  const generateMathProcessResponse = (mathPrompt: string): string => {
    if (mathPrompt.includes("7x + 39x")) {
      return `Let me guide you through solving 7x + 39x:
      
1. Identify like terms: Both 7x and 39x are like terms with variable x
2. Apply distributive property: (7+39)x
3. Add the coefficients: 46x

This approach teaches algebraic simplification by combining like terms. Try applying this method to similar problems!`;
    }
    
    return `Let me walk you through solving this step by step:

1. First, identify the type of problem we're solving.
2. Break it down into manageable parts.
3. Apply the relevant mathematical rules.
4. Check your answer.

Would you like me to explain any specific step in more detail?`;
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
            <div className="flex items-center space-x-2">
              <Switch
                id="process-mode"
                checked={isProcessTeaching}
                onCheckedChange={setIsProcessTeaching}
              />
              <Label htmlFor="process-mode">Process Teaching Mode</Label>
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
              />
              <Button 
                type="submit"
                size="icon"
                className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-slate-500 flex items-center">
              <Brain className="h-4 w-4 mr-1 text-blue-500" />
              {isProcessTeaching 
                ? "Process Teaching Mode is ON - You'll learn how to find answers yourself" 
                : "Process Teaching Mode is OFF - Consider turning it on for better learning"
              }
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
                <Card key={item.id}>
                  <CardHeader className="pb-2 bg-slate-50">
                    <CardTitle className="text-base">Your Question:</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-slate-800">{item.prompt}</p>
                  </CardContent>
                  <CardHeader className={`pb-2 ${item.isProcessTaught ? 'bg-blue-50' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Response:</CardTitle>
                      {item.isProcessTaught && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                          Process-Focused
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 whitespace-pre-line">
                    <p className={item.isProcessTaught ? 'text-blue-800' : 'text-slate-800'}>
                      {item.response}
                    </p>
                  </CardContent>
                  <CardFooter className="text-xs text-slate-500 justify-end border-t">
                    <Button variant="ghost" size="sm">Flag as Inappropriate</Button>
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
