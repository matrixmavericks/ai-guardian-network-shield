
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PlusCircle, X, ChevronUp, ChevronDown, Save, Trash2, FileText, Video, Link as LinkIcon, BookOpen } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import DashboardNav from '@/components/DashboardNav';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { saveLearningPath, LearningModule, generateId } from '@/services/localStorageService';

const ResourceForm = ({ 
  value, 
  onChange, 
  onRemove 
}: { 
  value: string;
  onChange: (newValue: string) => void;
  onRemove: () => void;
}) => {
  return (
    <div className="flex items-center gap-2">
      <Input 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder="Resource URL or title" 
        className="flex-1" 
      />
      <Button variant="ghost" size="icon" onClick={onRemove} className="shrink-0">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const ModuleForm = ({
  module,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  module: LearningModule;
  onUpdate: (updatedModule: LearningModule) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const addResource = () => {
    onUpdate({
      ...module,
      resources: [...module.resources, '']
    });
  };

  const updateResource = (index: number, value: string) => {
    const newResources = [...module.resources];
    newResources[index] = value;
    onUpdate({
      ...module,
      resources: newResources
    });
  };

  const removeResource = (index: number) => {
    onUpdate({
      ...module,
      resources: module.resources.filter((_, i) => i !== index)
    });
  };

  const addQuiz = () => {
    onUpdate({
      ...module,
      quizzes: [...module.quizzes, '']
    });
  };

  const updateQuiz = (index: number, value: string) => {
    const newQuizzes = [...module.quizzes];
    newQuizzes[index] = value;
    onUpdate({
      ...module,
      quizzes: newQuizzes
    });
  };

  const removeQuiz = (index: number) => {
    onUpdate({
      ...module,
      quizzes: module.quizzes.filter((_, i) => i !== index)
    });
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-xl">Module {module.order}</CardTitle>
            <CardDescription>Learning module configuration</CardDescription>
          </div>
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onMoveUp}
              disabled={isFirst}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onMoveDown}
              disabled={isLast}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onRemove} className="text-red-500">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`module-${module.id}-title`}>Module Title</Label>
          <Input 
            id={`module-${module.id}-title`}
            value={module.title} 
            onChange={(e) => onUpdate({ ...module, title: e.target.value })} 
            placeholder="Module Title"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor={`module-${module.id}-description`}>Module Description</Label>
          <Textarea 
            id={`module-${module.id}-description`}
            value={module.description} 
            onChange={(e) => onUpdate({ ...module, description: e.target.value })} 
            placeholder="Describe what students will learn in this module"
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Learning Resources</Label>
            <Button variant="outline" size="sm" onClick={addResource} className="h-8">
              <PlusCircle className="h-3.5 w-3.5 mr-1" />
              Add Resource
            </Button>
          </div>
          <div className="space-y-2">
            {module.resources.length > 0 ? (
              module.resources.map((resource, index) => (
                <ResourceForm 
                  key={index}
                  value={resource}
                  onChange={(value) => updateResource(index, value)}
                  onRemove={() => removeResource(index)}
                />
              ))
            ) : (
              <div className="text-center py-4 text-slate-500 border border-dashed rounded-md">
                No resources yet. Add some learning materials.
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Assessment Quizzes</Label>
            <Button variant="outline" size="sm" onClick={addQuiz} className="h-8">
              <PlusCircle className="h-3.5 w-3.5 mr-1" />
              Add Quiz
            </Button>
          </div>
          <div className="space-y-2">
            {module.quizzes.length > 0 ? (
              module.quizzes.map((quiz, index) => (
                <ResourceForm 
                  key={index}
                  value={quiz}
                  onChange={(value) => updateQuiz(index, value)}
                  onRemove={() => removeQuiz(index)}
                />
              ))
            ) : (
              <div className="text-center py-4 text-slate-500 border border-dashed rounded-md">
                No quizzes yet. Add some assessments.
              </div>
            )}
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
  const [isPublic, setIsPublic] = useState(true);
  const [modules, setModules] = useState<LearningModule[]>([]);
  
  // Add a new module
  const addModule = () => {
    const newModule: LearningModule = {
      id: generateId(),
      title: '',
      description: '',
      resources: [],
      quizzes: [],
      order: modules.length + 1
    };
    
    setModules([...modules, newModule]);
  };
  
  // Update a module
  const updateModule = (moduleId: string, updatedModule: LearningModule) => {
    setModules(modules.map(module => 
      module.id === moduleId ? updatedModule : module
    ));
  };
  
  // Remove a module
  const removeModule = (moduleId: string) => {
    const filteredModules = modules.filter(module => module.id !== moduleId);
    
    // Update order of remaining modules
    const reorderedModules = filteredModules.map((module, index) => ({
      ...module,
      order: index + 1
    }));
    
    setModules(reorderedModules);
  };
  
  // Move module up
  const moveModuleUp = (moduleId: string) => {
    const index = modules.findIndex(module => module.id === moduleId);
    if (index <= 0) return;
    
    const newModules = [...modules];
    
    // Swap with previous module
    [newModules[index - 1], newModules[index]] = [newModules[index], newModules[index - 1]];
    
    // Update order
    const reorderedModules = newModules.map((module, idx) => ({
      ...module,
      order: idx + 1
    }));
    
    setModules(reorderedModules);
  };
  
  // Move module down
  const moveModuleDown = (moduleId: string) => {
    const index = modules.findIndex(module => module.id === moduleId);
    if (index >= modules.length - 1) return;
    
    const newModules = [...modules];
    
    // Swap with next module
    [newModules[index], newModules[index + 1]] = [newModules[index + 1], newModules[index]];
    
    // Update order
    const reorderedModules = newModules.map((module, idx) => ({
      ...module,
      order: idx + 1
    }));
    
    setModules(reorderedModules);
  };
  
  // Save learning path
  const handleSave = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a learning path.",
        variant: "destructive"
      });
      return;
    }
    
    if (!title.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a title for your learning path.",
        variant: "destructive"
      });
      return;
    }
    
    if (modules.length === 0) {
      toast({
        title: "No modules",
        description: "Please add at least one learning module.",
        variant: "destructive"
      });
      return;
    }
    
    // Check for incomplete modules
    const incompleteModule = modules.find(module => !module.title.trim());
    if (incompleteModule) {
      toast({
        title: "Incomplete module",
        description: `Module ${incompleteModule.order} needs a title.`,
        variant: "destructive"
      });
      return;
    }
    
    const learningPath = {
      id: generateId(),
      title,
      description,
      subject,
      modules,
      createdBy: user.id,
      createdAt: new Date().toISOString()
    };
    
    saveLearningPath(learningPath);
    
    toast({
      title: "Learning path created",
      description: "Your learning path has been created successfully."
    });
    
    navigate('/learning-paths');
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-800">Create Learning Path</h1>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Learning Path
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Path Information</CardTitle>
                <CardDescription>
                  Enter the basic details about this learning path
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Learning Path Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Introduction to Physics"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what students will learn in this path"
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select 
                      value={subject} 
                      onValueChange={setSubject}
                    >
                      <SelectTrigger id="subject">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mathematics">Mathematics</SelectItem>
                        <SelectItem value="science">Science</SelectItem>
                        <SelectItem value="physics">Physics</SelectItem>
                        <SelectItem value="chemistry">Chemistry</SelectItem>
                        <SelectItem value="biology">Biology</SelectItem>
                        <SelectItem value="computer-science">Computer Science</SelectItem>
                        <SelectItem value="history">History</SelectItem>
                        <SelectItem value="literature">Literature</SelectItem>
                        <SelectItem value="language">Language</SelectItem>
                        <SelectItem value="arts">Arts</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2 pt-8">
                    <Label htmlFor="public-path" className="cursor-pointer">Public Learning Path</Label>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="public-path" 
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                      />
                      <span className="text-sm text-slate-500">
                        {isPublic ? 'Available to all students' : 'Private'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Learning Modules</h2>
                <Button variant="outline" onClick={addModule}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Module
                </Button>
              </div>
              
              {modules.length > 0 ? (
                <div>
                  {modules.map((module, index) => (
                    <ModuleForm 
                      key={module.id}
                      module={module}
                      onUpdate={(updatedModule) => updateModule(module.id, updatedModule)}
                      onRemove={() => removeModule(module.id)}
                      onMoveUp={() => moveModuleUp(module.id)}
                      onMoveDown={() => moveModuleDown(module.id)}
                      isFirst={index === 0}
                      isLast={index === modules.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <Card className="bg-slate-50 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    <BookOpen className="h-12 w-12 text-slate-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Modules Yet</h3>
                    <p className="text-slate-500 mb-4">Create modules to build your learning path</p>
                    <Button onClick={addModule}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add First Module
                    </Button>
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
