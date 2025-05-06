
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  ArrowLeft, 
  CheckCircle, 
  FileText, 
  Play, 
  ListChecks,
  GraduationCap,
  Calendar
} from "lucide-react";
import { getLearningPathById, LearningPath, LearningModule } from "@/services/localStorageService";
import { useToast } from "@/components/ui/use-toast";

const LearningPathDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const path = getLearningPathById(id);
      if (path) {
        setLearningPath(path);
        if (path.modules.length > 0) {
          setSelectedModule(path.modules[0]);
        }
      } else {
        toast({
          title: "Learning Path Not Found",
          description: "The requested learning path could not be found.",
          variant: "destructive",
        });
        navigate("/learning-paths");
      }
    }
  }, [id, navigate, toast]);

  if (!learningPath) {
    return (
      <div className="container py-12 text-center">
        <p className="text-xl text-slate-600">Loading learning path...</p>
      </div>
    );
  }

  const sortedModules = [...learningPath.modules].sort((a, b) => a.order - b.order);

  return (
    <div className="container py-8">
      <Button 
        variant="ghost" 
        className="mb-6 pl-0" 
        onClick={() => navigate("/learning-paths")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Learning Paths
      </Button>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/4">
          <div className="sticky top-6">
            <Card>
              <CardHeader className="bg-slate-50 pb-2">
                <CardTitle className="text-lg">Modules</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {sortedModules.map((module, index) => (
                    <div 
                      key={module.id}
                      onClick={() => setSelectedModule(module)}
                      className={`flex items-center p-2 rounded-md cursor-pointer ${
                        selectedModule?.id === module.id 
                          ? "bg-blue-50 border border-blue-200" 
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="bg-slate-200 text-slate-700 h-6 w-6 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{module.title}</p>
                        <p className="text-xs text-slate-500">
                          {module.resources.length} resources • {module.quizzes.length} quizzes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Your Progress</span>
                      <span className="font-medium">25%</span>
                    </div>
                    <Progress value={25} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:w-3/4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{learningPath.title}</h1>
            <div className="flex items-center mb-4">
              <Badge className="mr-2">{learningPath.subject}</Badge>
              <span className="text-slate-500 text-sm">
                {learningPath.modules.length} modules
              </span>
            </div>
            <p className="text-slate-600">{learningPath.description}</p>
          </div>

          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">
                <BookOpen className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="content">
                <FileText className="h-4 w-4 mr-2" />
                Module Content
              </TabsTrigger>
              <TabsTrigger value="assessment">
                <ListChecks className="h-4 w-4 mr-2" />
                Assessments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Path Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">About this Learning Path</h3>
                      <p className="text-slate-600">{learningPath.description}</p>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-2">What You'll Learn</h3>
                      <ul className="space-y-2">
                        {sortedModules.map(module => (
                          <li key={module.id} className="flex items-start">
                            <CheckCircle className="h-5 w-5 mr-2 text-green-500 mt-0.5" />
                            <div>
                              <p className="font-medium">{module.title}</p>
                              <p className="text-sm text-slate-600">{module.description}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-2">Timeline</h3>
                      <div className="flex items-center text-slate-600 mb-4">
                        <Calendar className="h-5 w-5 mr-2" />
                        <span>Estimated completion: 4 weeks</span>
                      </div>
                      <div className="space-y-3">
                        {sortedModules.map((module, index) => (
                          <div key={module.id} className="flex items-center">
                            <div className="bg-blue-100 text-blue-800 h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                              {index + 1}
                            </div>
                            <div className="flex-grow">
                              <p className="font-medium">{module.title}</p>
                              <div className="h-1 bg-slate-100 rounded mt-2">
                                <div 
                                  className="h-full bg-blue-500 rounded" 
                                  style={{ width: index === 0 ? "75%" : "0%" }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-sm text-slate-500 ml-4">
                              {index === 0 ? "75% complete" : "Not started"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 flex justify-center">
                <Button size="lg" className="px-8">
                  <Play className="mr-2 h-4 w-4" />
                  Start Learning
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="content">
              {selectedModule && (
                <Card>
                  <CardHeader className="bg-slate-50">
                    <CardTitle>
                      Module {selectedModule.order}: {selectedModule.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div>
                      <p className="mb-6">{selectedModule.description}</p>
                      
                      <h3 className="text-lg font-medium mb-4">Learning Resources</h3>
                      <div className="grid gap-4">
                        {selectedModule.resources.map((resource, index) => (
                          <div key={index} className="p-4 border rounded-md hover:bg-slate-50">
                            <div className="flex items-center">
                              <FileText className="h-5 w-5 mr-2 text-blue-600" />
                              <h4 className="font-medium">{resource}</h4>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-8 flex justify-center">
                        <Button className="px-8">
                          <Play className="mr-2 h-4 w-4" />
                          Start Module
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="assessment">
              {selectedModule && (
                <Card>
                  <CardHeader>
                    <CardTitle>Assessments for {selectedModule.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {selectedModule.quizzes.map((quiz, index) => (
                        <div key={index} className="border rounded-lg p-4 hover:bg-slate-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <ListChecks className="h-5 w-5 mr-3 text-blue-600" />
                              <div>
                                <h4 className="font-medium">{quiz}</h4>
                                <p className="text-sm text-slate-500">
                                  10 questions • 15 minutes
                                </p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              Take Quiz
                            </Button>
                          </div>
                        </div>
                      ))}

                      {selectedModule.quizzes.length === 0 && (
                        <div className="text-center py-8">
                          <GraduationCap className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                          <p className="text-lg font-medium text-slate-700">No assessments yet</p>
                          <p className="text-slate-500">
                            Assessments for this module will be available soon.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default LearningPathDetail;
