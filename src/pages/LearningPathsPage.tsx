
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Book, BookOpen, GraduationCap, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getLearningPaths, LearningPath } from "@/services/localStorageService";
import LearningPathCard from "@/components/LearningPathCard";
import { useAuth } from "@/contexts/AuthContext";

const LearningPathsPage = () => {
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubject, setActiveSubject] = useState<string>("all");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get unique subjects from learning paths
  const subjects = [...new Set(learningPaths.map(path => path.subject))];

  useEffect(() => {
    const fetchLearningPaths = () => {
      const paths = getLearningPaths();
      setLearningPaths(paths);
    };

    fetchLearningPaths();
  }, []);

  const filteredPaths = learningPaths.filter((path) => {
    const matchesSearch = path.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        path.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = activeSubject === "all" || path.subject === activeSubject;
    return matchesSearch && matchesSubject;
  });

  const handleViewDetails = (pathId: string) => {
    navigate(`/learning-path/${pathId}`);
    toast({
      title: "Learning Path Selected",
      description: "Loading your learning path details...",
    });
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Learning Paths</h1>
          <p className="text-slate-600 mt-1">
            Discover structured learning journeys designed to help you master subjects
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search learning paths..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="all" value={activeSubject} onValueChange={setActiveSubject} className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Subjects</TabsTrigger>
            {subjects.map((subject) => (
              <TabsTrigger key={subject} value={subject}>{subject}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {filteredPaths.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPaths.map((path) => (
              <LearningPathCard
                key={path.id}
                learningPath={path}
                progress={Math.floor(Math.random() * 100)} // Sample random progress - in real app this would come from user data
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : (
          <Alert>
            <AlertDescription className="flex flex-col items-center py-8">
              <Book className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium">No learning paths found</p>
              <p className="text-slate-600">
                {searchTerm 
                  ? "Try adjusting your search or filters" 
                  : "There are no learning paths available for this subject yet"}
              </p>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="mt-12 bg-blue-50 rounded-lg p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <GraduationCap className="h-8 w-8 text-blue-600" />
          </div>
          <div className="flex-grow">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Want a personalized learning experience?
            </h2>
            <p className="text-slate-600">
              Our AI can analyze your strengths and create a customized learning path just for you.
            </p>
          </div>
          <Button className="min-w-[200px]">Create Custom Path</Button>
        </div>
      </div>
    </div>
  );
};

export default LearningPathsPage;
