
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardSidebar from "@/components/DashboardSidebar";
import { 
  BookOpen, 
  GraduationCap, 
  Star, 
  Book, 
  ArrowRight, 
  School,
  LightbulbOff,
  Compass,
  Lightbulb
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  const [learningPaths, setLearningPaths] = useState([
    { 
      id: "math-101", 
      title: "Algebra Fundamentals", 
      progress: 65, 
      subject: "Mathematics",
      topics: ["Linear Equations", "Quadratic Equations", "Functions"],
      nextSession: "Matrices and Determinants",
      completed: 13,
      total: 20
    },
    { 
      id: "science-101", 
      title: "Physics Mechanics", 
      progress: 40, 
      subject: "Science",
      topics: ["Newton's Laws", "Kinematics", "Energy"],
      nextSession: "Rotational Motion",
      completed: 8,
      total: 20
    },
    { 
      id: "english-101", 
      title: "Essay Writing", 
      progress: 80, 
      subject: "English",
      topics: ["Structure", "Argumentation", "Citations"],
      nextSession: "Advanced Rhetorical Techniques",
      completed: 16,
      total: 20
    }
  ]);
  
  const [recentSessions, setRecentSessions] = useState([
    {
      id: "session-1",
      title: "Quadratic Equations",
      date: "Yesterday",
      subject: "Mathematics",
      duration: "45 minutes",
      concepts: ["Factorization", "Completing the Square", "Quadratic Formula"]
    },
    {
      id: "session-2",
      title: "Newton's Second Law",
      date: "2 days ago",
      subject: "Physics",
      duration: "30 minutes",
      concepts: ["Force", "Mass", "Acceleration"]
    },
    {
      id: "session-3",
      title: "Essay Outline",
      date: "3 days ago",
      subject: "English",
      duration: "60 minutes",
      concepts: ["Introduction", "Body Paragraphs", "Conclusion"]
    }
  ]);
  
  const [recommendations, setRecommendations] = useState([
    {
      id: "rec-1",
      title: "Advanced Algebra",
      description: "Based on your progress in Algebra Fundamentals",
      difficulty: "Intermediate",
      subject: "Mathematics",
      icon: <BookOpen className="h-5 w-5 text-blue-500" />
    },
    {
      id: "rec-2",
      title: "Forces and Motion",
      description: "Recommended to strengthen your Physics concepts",
      difficulty: "Beginner",
      subject: "Physics",
      icon: <GraduationCap className="h-5 w-5 text-green-500" />
    },
    {
      id: "rec-3",
      title: "Persuasive Writing",
      description: "Next step in your writing journey",
      difficulty: "Advanced",
      subject: "English",
      icon: <Book className="h-5 w-5 text-purple-500" />
    }
  ]);

  const handleStartSession = (pathId: string) => {
    // In a real app, we'd load the specific learning content
    navigate("/student");
    toast({
      title: "Session Started",
      description: "Your AI learning session has been initialized.",
    });
  };
  
  const handleContinueLearning = (pathId: string) => {
    const path = learningPaths.find(p => p.id === pathId);
    if (path) {
      navigate("/student");
      toast({
        title: `Continuing ${path.title}`,
        description: `Loading your next session: ${path.nextSession}`,
      });
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-slate-200 p-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Your Learning Dashboard</h1>
              <p className="text-slate-500">Track your progress and continue learning</p>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => navigate("/student")}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Start New AI Session
            </Button>
          </div>
        </header>
        
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Learning Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">72%</div>
                  <Progress value={72} className="h-2 mt-2" />
                  <p className="text-sm text-slate-500 mt-2">Overall completion across all courses</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Weekly AI Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">12</div>
                  <div className="bg-green-100 text-green-700 text-xs inline-block px-2.5 py-0.5 rounded-full mt-2">
                    +3 from last week
                  </div>
                  <p className="text-sm text-slate-500 mt-2">AI-assisted learning sessions</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Upcoming Assessments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">2</div>
                  <p className="text-sm text-slate-500 mt-2">Due in the next 7 days</p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="outline" size="sm" className="w-full">
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="learning-paths">Learning Paths</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="history">Session History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Continue Learning</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {learningPaths.map((path) => (
                      <Card key={path.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle>{path.title}</CardTitle>
                            <div className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                              {path.subject}
                            </div>
                          </div>
                          <CardDescription>
                            Progress: {path.completed} of {path.total} sessions completed
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Progress value={path.progress} className="h-2" />
                          <div className="mt-4">
                            <p className="text-sm font-medium">Next: {path.nextSession}</p>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            className="w-full"
                            onClick={() => handleContinueLearning(path.id)}
                          >
                            Continue Learning
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold mb-4">Recent AI Sessions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentSessions.map((session) => (
                      <Card key={session.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle>{session.title}</CardTitle>
                            <div className="text-sm text-slate-500">{session.date}</div>
                          </div>
                          <CardDescription>{session.subject} - {session.duration}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2 flex-wrap">
                            {session.concepts.map((concept, i) => (
                              <div key={i} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">
                                {concept}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter>
                          <div className="flex justify-between w-full">
                            <Button variant="outline" size="sm">
                              Review Session
                            </Button>
                            <Button size="sm">
                              Continue
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="learning-paths" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Learning Paths</CardTitle>
                    <CardDescription>Personalized learning journeys based on your goals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {learningPaths.map((path) => (
                        <div key={path.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="text-lg font-medium">{path.title}</h3>
                              <p className="text-sm text-slate-500">{path.subject}</p>
                            </div>
                            <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                              {path.progress}% Complete
                            </div>
                          </div>
                          
                          <Progress value={path.progress} className="h-2 mb-4" />
                          
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Topics Covered:</h4>
                            <div className="flex flex-wrap gap-2">
                              {path.topics.map((topic, i) => (
                                <div key={i} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">
                                  {topic}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="mt-4 flex justify-end">
                            <Button onClick={() => handleContinueLearning(path.id)}>
                              Continue Path
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      <School className="h-4 w-4 mr-2" />
                      Browse More Learning Paths
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="recommendations" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recommended for You</CardTitle>
                    <CardDescription>Based on your learning history and goals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {recommendations.map((rec) => (
                        <Card key={rec.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                              {rec.icon}
                              <CardTitle>{rec.title}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-slate-600 mb-2">{rec.description}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500">{rec.subject}</span>
                              <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                                {rec.difficulty}
                              </span>
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button className="w-full" onClick={() => handleStartSession(rec.id)}>
                              Start Learning
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Session History</CardTitle>
                    <CardDescription>Your past learning activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[...recentSessions, ...recentSessions].slice(0, 6).map((session, index) => (
                        <div key={`hist-${index}`} className="flex justify-between items-center p-3 border-b last:border-0">
                          <div>
                            <h4 className="font-medium">{session.title}</h4>
                            <div className="flex gap-2 items-center text-sm text-slate-500">
                              <span>{session.subject}</span>
                              <span>•</span>
                              <span>{session.duration}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-slate-500">{session.date}</div>
                            <Button variant="ghost" size="sm" className="text-blue-600">
                              Review
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      View Complete History
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
