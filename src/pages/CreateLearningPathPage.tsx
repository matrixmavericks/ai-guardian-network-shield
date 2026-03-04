import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PlusCircle, X, Save, Trash2, BookOpen, Sparkles, Loader, Wand2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import DashboardNav from '@/components/DashboardNav';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { generateId, saveLearningPath, type LearningDifficulty, type LearningModule } from '@/services/learningPathService';

const ResourceForm = ({ value, onChange, onRemove }: { value: string; onChange: (newValue: string) => void; onRemove: () => void; }) => (
  <div className="flex items-center gap-2">
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Resource URL or title" className="flex-1" />
    <Button variant="ghost" size="icon" onClick={onRemove} className="shrink-0"><X className="h-4 w-4" /></Button>
  </div>
);

const ModuleForm = ({
  module,
  onUpdate,
  onRemove,
}: {
  module: LearningModule;
  onUpdate: (updatedModule: LearningModule) => void;
  onRemove: () => void;
}) => {
  const addResource = () => onUpdate({ ...module, resources: [...module.resources, ''] });
  const addQuiz = () => onUpdate({ ...module, quizzes: [...module.quizzes, ''] });

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">Module {module.order}</CardTitle>
            <CardDescription>Learning module configuration</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`module-${module.id}-title`}>Module Title</Label>
          <Input id={`module-${module.id}-title`} value={module.title} onChange={(e) => onUpdate({ ...module, title: e.target.value })} placeholder="Module Title" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`module-${module.id}-description`}>Module Description</Label>
          <Textarea id={`module-${module.id}-description`} value={module.description} onChange={(e) => onUpdate({ ...module, description: e.target.value })} placeholder="Describe what students will learn in this module" rows={3} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Learning Resources</Label>
            <Button variant="outline" size="sm" onClick={addResource}><PlusCircle className="mr-1 h-3.5 w-3.5" />Add Resource</Button>
          </div>
          <div className="space-y-2">
            {module.resources.map((resource, index) => (
              <ResourceForm
                key={`${module.id}-resource-${index}`}
                value={resource}
                onChange={(value) => {
                  const resources = [...module.resources];
                  resources[index] = value;
                  onUpdate({ ...module, resources });
                }}
                onRemove={() => onUpdate({ ...module, resources: module.resources.filter((_, i) => i !== index) })}
              />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Assessment Quizzes</Label>
            <Button variant="outline" size="sm" onClick={addQuiz}><PlusCircle className="mr-1 h-3.5 w-3.5" />Add Quiz</Button>
          </div>
          <div className="space-y-2">
            {module.quizzes.map((quiz, index) => (
              <ResourceForm
                key={`${module.id}-quiz-${index}`}
                value={quiz}
                onChange={(value) => {
                  const quizzes = [...module.quizzes];
                  quizzes[index] = value;
                  onUpdate({ ...module, quizzes });
                }}
                onRemove={() => onUpdate({ ...module, quizzes: module.quizzes.filter((_, i) => i !== index) })}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CreateLearningPathPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState<LearningDifficulty>('beginner');
  const [estimatedHours, setEstimatedHours] = useState(10);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addModule = () => {
    setModules((current) => [
      ...current,
      {
        id: generateId(),
        title: '',
        description: '',
        resources: [],
        quizzes: [],
        order: current.length + 1,
      },
    ]);
  };

  const updateModule = (moduleId: string, updatedModule: LearningModule) => {
    setModules((current) => current.map((module) => (module.id === moduleId ? updatedModule : module)));
  };

  const removeModule = (moduleId: string) => {
    setModules((current) =>
      current.filter((module) => module.id !== moduleId).map((module, index) => ({ ...module, order: index + 1 })),
    );
  };

  const handleGenerateWithAI = async () => {
    if (!title.trim() || !subject.trim()) {
      toast({ title: 'Missing info', description: 'Add a title and subject first.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-learning-path', {
        body: { title, description, subject, difficulty, estimatedHours },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'AI generation failed.');

      const generatedModules: LearningModule[] = (data.modules || []).map((mod: any, index: number) => ({
        id: generateId(),
        title: mod.title,
        description: mod.description,
        resources: Array.isArray(mod.resources) ? mod.resources : [],
        quizzes: Array.isArray(mod.quizzes) ? mod.quizzes : [],
        order: index + 1,
      }));

      setModules(generatedModules);
      if (Array.isArray(data.suggestedTags) && data.suggestedTags.length > 0) {
        setTags(data.suggestedTags.map(String));
      }

      toast({ title: 'Modules generated', description: `AI created ${generatedModules.length} modules.` });
    } catch (error: any) {
      toast({ title: 'Generation failed', description: error?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: 'Login required', description: 'Please sign in first.', variant: 'destructive' });
      return;
    }
    if (user.role !== 'teacher' && user.role !== 'admin') {
      toast({ title: 'Access denied', description: 'Only teachers and admins can create learning paths.', variant: 'destructive' });
      return;
    }
    if (!title.trim() || !subject.trim()) {
      toast({ title: 'Missing information', description: 'Add a title and subject.', variant: 'destructive' });
      return;
    }
    if (modules.length === 0) {
      toast({ title: 'No modules', description: 'Generate modules or add one manually.', variant: 'destructive' });
      return;
    }
    if (modules.some((module) => !module.title.trim())) {
      toast({ title: 'Incomplete module', description: 'Each module needs a title.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveLearningPath({
        title: title.trim(),
        description: description.trim(),
        subject,
        difficulty,
        estimatedHours,
        tags,
        modules,
        createdBy: user.id,
        featured: false,
        isPublic,
      });

      toast({ title: 'Learning path created', description: 'Your path is now live.' });
      navigate(`/learning-path/${saved.id}`);
    } catch (error: any) {
      toast({ title: 'Save failed', description: error?.message || 'Could not save the learning path.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Create Learning Path</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleGenerateWithAI} disabled={isGenerating || !title.trim() || !subject.trim()}>
                  {isGenerating ? <><Loader className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Wand2 className="mr-2 h-4 w-4" />Generate with AI</>}
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Learning Path'}
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Path Information</CardTitle>
                <CardDescription>Enter the core details and let AI build the teaching sequence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Learning Path Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Algebra Foundations" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what students should achieve." rows={4} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger id="subject"><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="Physics">Physics</SelectItem>
                        <SelectItem value="Chemistry">Chemistry</SelectItem>
                        <SelectItem value="Biology">Biology</SelectItem>
                        <SelectItem value="Computer Science">Computer Science</SelectItem>
                        <SelectItem value="History">History</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Language">Language</SelectItem>
                        <SelectItem value="Arts">Arts</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select value={difficulty} onValueChange={(value: LearningDifficulty) => setDifficulty(value)}>
                      <SelectTrigger id="difficulty"><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedHours">Estimated Hours</Label>
                    <Input id="estimatedHours" type="number" min="1" max="200" value={estimatedHours} onChange={(e) => setEstimatedHours(parseInt(e.target.value, 10) || 10)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add tag and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          e.preventDefault();
                          if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
                          setTagInput('');
                        }
                      }}
                    />
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-sm text-primary">
                            {tag}
                            <button type="button" onClick={() => setTags(tags.filter((item) => item !== tag))}><X className="h-3 w-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="public-path" className="cursor-pointer">Public Learning Path</Label>
                  <div className="flex items-center space-x-2">
                    <Switch id="public-path" checked={isPublic} onCheckedChange={setIsPublic} />
                    <span className="text-sm text-muted-foreground">{isPublic ? 'Available to students' : 'Private draft'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Learning Modules</h2>
                <Button variant="outline" onClick={addModule}><PlusCircle className="mr-2 h-4 w-4" />Add Module</Button>
              </div>
              {modules.length > 0 ? (
                modules.map((module) => (
                  <ModuleForm key={module.id} module={module} onUpdate={(updated) => updateModule(module.id, updated)} onRemove={() => removeModule(module.id)} />
                ))
              ) : (
                <Card className="border-dashed bg-slate-50">
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    <BookOpen className="mb-4 h-12 w-12 text-slate-400" />
                    <h3 className="mb-2 text-lg font-medium">No Modules Yet</h3>
                    <p className="mb-4 text-slate-500">Generate modules with AI or add one manually.</p>
                    <Button onClick={addModule}><PlusCircle className="mr-2 h-4 w-4" />Add First Module</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateLearningPathPage;
