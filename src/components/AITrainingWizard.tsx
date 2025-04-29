
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Brain, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface TrainingExample {
  id: string;
  inputPrompt: string;
  idealResponse: string;
}

const AITrainingWizard = () => {
  const [modelName, setModelName] = useState("");
  const [modelDescription, setModelDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [examples, setExamples] = useState<TrainingExample[]>([
    {
      id: "1",
      inputPrompt: "What is 7x + 39x?",
      idealResponse: "Let me guide you through solving this step by step:\n\n1. First, identify the like terms: 7x and 39x both have the variable x.\n2. Since they have the same variable, we can add their coefficients: 7 + 39 = 46\n3. Combine the like terms: 7x + 39x = 46x\n\nThe answer is 46x, but more importantly, do you understand how we combined like terms?"
    },
    {
      id: "2",
      inputPrompt: "Solve x^2 - 9 = 0",
      idealResponse: "I'll walk you through solving this quadratic equation:\n\n1. First, let's rearrange to standard form: x^2 - 9 = 0\n2. This is a difference of squares: x^2 - 9 = (x+3)(x-3) = 0\n3. Using the zero product property, either x+3=0 or x-3=0\n4. Solving these: x = -3 or x = 3\n\nThe solution set is {-3, 3}. Can you verify these answers by substituting them back into the original equation?"
    }
  ]);
  const { toast } = useToast();

  const handleAddExample = () => {
    setExamples([
      ...examples,
      {
        id: Date.now().toString(),
        inputPrompt: "",
        idealResponse: ""
      }
    ]);
  };

  const handleRemoveExample = (id: string) => {
    setExamples(examples.filter(example => example.id !== id));
  };

  const handleExampleChange = (id: string, field: keyof TrainingExample, value: string) => {
    setExamples(examples.map(example => 
      example.id === id ? { ...example, [field]: value } : example
    ));
  };

  const handleSaveModel = () => {
    if (!modelName.trim()) {
      toast({
        title: "Model name required",
        description: "Please provide a name for your AI model.",
        variant: "destructive"
      });
      return;
    }

    if (examples.some(ex => !ex.inputPrompt.trim() || !ex.idealResponse.trim())) {
      toast({
        title: "Incomplete examples",
        description: "Please fill out both input and response for all training examples.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "AI Model Saved",
      description: `Your "${modelName}" model has been saved with ${examples.length} training examples.`,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Brain className="h-8 w-8 text-blue-600 mr-2" />
        <h1 className="text-2xl font-bold text-slate-800">AI Model Training Wizard</h1>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <h2 className="font-medium text-blue-800 mb-2">How the AI Model Training Works</h2>
        <p className="text-blue-700 text-sm">
          This wizard allows you to create custom AI models that transform straightforward answer requests into 
          process-oriented learning experiences. Provide examples of unethical prompts and your preferred educational 
          responses to train the AI to encourage proper learning methods.
        </p>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Model Information</CardTitle>
          <CardDescription>Define the basic information about your AI training model</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name</Label>
              <Input 
                id="model-name" 
                placeholder="e.g., Math Process Teacher" 
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject-area">Subject Area</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="math">Mathematics</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="english">English & Language Arts</SelectItem>
                  <SelectItem value="history">History & Social Studies</SelectItem>
                  <SelectItem value="cs">Computer Science</SelectItem>
                  <SelectItem value="general">General Knowledge</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model-description">Model Description</Label>
            <Textarea 
              id="model-description" 
              placeholder="Describe the purpose of this model and how it transforms prompts..."
              value={modelDescription}
              onChange={(e) => setModelDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Training Examples</CardTitle>
            <CardDescription>Add examples of prompts and your desired process-oriented responses</CardDescription>
          </div>
          <Button variant="outline" onClick={handleAddExample}>
            <Plus className="h-4 w-4 mr-2" />
            Add Example
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {examples.map((example, index) => (
            <div key={example.id} className="border rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-slate-700">Example {index + 1}</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-slate-500"
                  onClick={() => handleRemoveExample(example.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`input-${example.id}`}>
                    Student Input (what they might ask)
                  </Label>
                  <Textarea 
                    id={`input-${example.id}`}
                    value={example.inputPrompt}
                    onChange={(e) => handleExampleChange(example.id, 'inputPrompt', e.target.value)}
                    placeholder="e.g., Solve x + 5 = 10"
                    className="bg-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`response-${example.id}`}>
                    Ideal Process-Teaching Response
                  </Label>
                  <Textarea 
                    id={`response-${example.id}`}
                    value={example.idealResponse}
                    onChange={(e) => handleExampleChange(example.id, 'idealResponse', e.target.value)}
                    placeholder="e.g., Let's solve this equation step by step..."
                    className="bg-white min-h-[150px]"
                  />
                </div>
              </div>
            </div>
          ))}
          
          {examples.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No examples added yet. Click "Add Example" to get started.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveModel}>
            <Save className="h-4 w-4 mr-2" />
            Save Model
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AITrainingWizard;
