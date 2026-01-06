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
import { Brain, Plus, Trash2, Save, Sparkles, Loader, Wand2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TrainingExample {
  id: string;
  inputPrompt: string;
  idealResponse: string;
  isGenerating?: boolean;
}

const AITrainingWizard = () => {
  const [modelName, setModelName] = useState("");
  const [modelDescription, setModelDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [examples, setExamples] = useState<TrainingExample[]>([
    {
      id: "1",
      inputPrompt: "What is 7x + 39x?",
      idealResponse: ""
    },
    {
      id: "2",
      inputPrompt: "Solve x^2 - 9 = 0",
      idealResponse: ""
    }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

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

  const handleGenerateResponse = async (exampleId: string) => {
    const example = examples.find(e => e.id === exampleId);
    if (!example || !example.inputPrompt.trim()) {
      toast({
        title: "Input required",
        description: "Please enter a student input prompt first.",
        variant: "destructive"
      });
      return;
    }

    // Set generating state for this example
    setExamples(examples.map(e => 
      e.id === exampleId ? { ...e, isGenerating: true } : e
    ));

    try {
      const { data, error } = await supabase.functions.invoke('generate-training-response', {
        body: { 
          inputPrompt: example.inputPrompt, 
          subject: subject || 'general',
          action: 'generate-response'
        }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setExamples(examples.map(e => 
        e.id === exampleId ? { ...e, idealResponse: data.result, isGenerating: false } : e
      ));

      toast({
        title: "Response generated",
        description: "AI has created an ideal process-teaching response.",
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate response. Please try again.",
        variant: "destructive"
      });
      setExamples(examples.map(e => 
        e.id === exampleId ? { ...e, isGenerating: false } : e
      ));
    }
  };

  const handleSaveModel = async () => {
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

    setIsSaving(true);

    try {
      // Save each training example to the database
      for (const example of examples) {
        const { error } = await supabase.from('model_training_data').insert({
          subject: subject || 'general',
          input_prompt: example.inputPrompt,
          ideal_response: example.idealResponse,
          created_by: user?.id || 'anonymous',
          approved: false
        });

        if (error) throw error;
      }

      toast({
        title: "Training Data Saved",
        description: `Your "${modelName}" model data has been saved with ${examples.length} training examples.`,
      });

      // Reset form
      setModelName("");
      setModelDescription("");
      setSubject("");
      setExamples([{ id: Date.now().toString(), inputPrompt: "", idealResponse: "" }]);
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save training data.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Sparkles className="h-8 w-8 text-primary mr-2" />
        <h1 className="text-2xl font-bold text-foreground">AI Model Training Wizard</h1>
      </div>
      
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-8">
        <h2 className="font-medium text-foreground mb-2">How the AI Model Training Works</h2>
        <p className="text-muted-foreground text-sm">
          This wizard uses Lovable AI to generate ideal process-teaching responses. Enter student prompts and click 
          "Generate" to create educational responses that encourage learning rather than just giving answers. 
          You can then review, edit, and save these examples to train the AI moderation system.
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
            <CardDescription>Add examples and use AI to generate ideal process-oriented responses</CardDescription>
          </div>
          <Button variant="outline" onClick={handleAddExample}>
            <Plus className="h-4 w-4 mr-2" />
            Add Example
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {examples.map((example, index) => (
            <div key={example.id} className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">Example {index + 1}</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
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
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`response-${example.id}`}>
                      Ideal Process-Teaching Response
                    </Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleGenerateResponse(example.id)}
                      disabled={example.isGenerating || !example.inputPrompt.trim()}
                    >
                      {example.isGenerating ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea 
                    id={`response-${example.id}`}
                    value={example.idealResponse}
                    onChange={(e) => handleExampleChange(example.id, 'idealResponse', e.target.value)}
                    placeholder="Click 'Generate with AI' or write your own process-teaching response..."
                    className="bg-background min-h-[150px]"
                  />
                </div>
              </div>
            </div>
          ))}
          
          {examples.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No examples added yet. Click "Add Example" to get started.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSaveModel} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Training Data
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AITrainingWizard;
