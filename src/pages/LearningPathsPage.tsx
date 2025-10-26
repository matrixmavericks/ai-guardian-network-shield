
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Book, BookOpen, GraduationCap, Search, Filter, Star, Clock, Users, TrendingUp, Bookmark } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getLearningPaths, LearningPath } from "@/services/localStorageService";
import LearningPathCard from "@/components/LearningPathCard";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getUserProgress, getBookmarkedPaths } from "@/services/learningPathProgressService";

type SortOption = 'recommended' | 'rating' | 'newest' | 'popular' | 'duration';
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';
type ProgressFilter = 'all' | 'not-started' | 'in-progress' | 'completed' | 'bookmarked';

const LearningPathsPage = () => {
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubject, setActiveSubject] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');
  const [refreshKey, setRefreshKey] = useState(0);
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

  const userProgress = user ? getUserProgress(user.id) : [];
  const bookmarkedPathIds = user ? getBookmarkedPaths(user.id) : [];

  const getPathProgress = (pathId: string): number => {
    const progress = userProgress.find(p => p.pathId === pathId);
    return progress?.progress || 0;
  };

  const filteredAndSortedPaths = React.useMemo(() => {
    let filtered = learningPaths.filter((path) => {
      const matchesSearch = path.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          path.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          path.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSubject = activeSubject === "all" || path.subject === activeSubject;
      const matchesDifficulty = difficultyFilter === "all" || path.difficulty === difficultyFilter;
      
      const progress = getPathProgress(path.id);
      let matchesProgress = true;
      if (progressFilter === 'not-started') matchesProgress = progress === 0;
      else if (progressFilter === 'in-progress') matchesProgress = progress > 0 && progress < 100;
      else if (progressFilter === 'completed') matchesProgress = progress === 100;
      else if (progressFilter === 'bookmarked') matchesProgress = bookmarkedPathIds.includes(path.id);
      
      return matchesSearch && matchesSubject && matchesDifficulty && matchesProgress;
    });

    // Sort paths
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'popular':
          return b.enrolledCount - a.enrolledCount;
        case 'duration':
          return a.estimatedHours - b.estimatedHours;
        case 'recommended':
        default:
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating;
      }
    });

    return filtered;
  }, [learningPaths, searchTerm, activeSubject, difficultyFilter, progressFilter, sortBy, userProgress, bookmarkedPathIds]);

  const handleViewDetails = (pathId: string) => {
    navigate(`/learning-path/${pathId}`);
    toast({
      title: "Learning Path Selected",
      description: "Loading your learning path details...",
    });
  };

  const featuredPaths = learningPaths.filter(path => path.featured);

  const stats = {
    totalPaths: learningPaths.length,
    inProgress: userProgress.filter(p => p.progress > 0 && p.progress < 100).length,
    completed: userProgress.filter(p => p.progress === 100).length,
    bookmarked: bookmarkedPathIds.length,
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Learning Paths</h1>
          <p className="text-muted-foreground mt-1">
            Discover structured learning journeys designed to help you master subjects
          </p>
        </div>
        <Button onClick={() => navigate('/create-learning-path')} size="lg">
          <GraduationCap className="mr-2 h-5 w-5" />
          Create Custom Path
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Book className="h-4 w-4 mr-2" />
              Total Paths
            </CardDescription>
            <CardTitle className="text-3xl">{stats.totalPaths}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              In Progress
            </CardDescription>
            <CardTitle className="text-3xl">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Star className="h-4 w-4 mr-2" />
              Completed
            </CardDescription>
            <CardTitle className="text-3xl">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Bookmark className="h-4 w-4 mr-2" />
              Bookmarked
            </CardDescription>
            <CardTitle className="text-3xl">{stats.bookmarked}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Featured Paths */}
      {featuredPaths.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Star className="h-6 w-6 mr-2 text-yellow-500 fill-yellow-500" />
            Featured Learning Paths
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredPaths.map((path) => (
              <LearningPathCard
                key={path.id}
                learningPath={path}
                progress={getPathProgress(path.id)}
                onViewDetails={handleViewDetails}
                isBookmarked={bookmarkedPathIds.includes(path.id)}
                onToggleBookmark={() => setRefreshKey(k => k + 1)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search learning paths, tags..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="duration">Shortest First</SelectItem>
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={(value) => setDifficultyFilter(value as DifficultyFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={progressFilter} onValueChange={(value) => setProgressFilter(value as ProgressFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Progress" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Paths</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="bookmarked">Bookmarked</SelectItem>
              </SelectContent>
            </Select>
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

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredAndSortedPaths.length} of {learningPaths.length} learning paths
          </p>
        </div>

        {filteredAndSortedPaths.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedPaths.map((path) => (
              <LearningPathCard
                key={path.id}
                learningPath={path}
                progress={getPathProgress(path.id)}
                onViewDetails={handleViewDetails}
                isBookmarked={bookmarkedPathIds.includes(path.id)}
                onToggleBookmark={() => setRefreshKey(k => k + 1)}
              />
            ))}
          </div>
        ) : (
          <Alert>
            <AlertDescription className="flex flex-col items-center py-8">
              <Book className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No learning paths found</p>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Try adjusting your search or filters" 
                  : "There are no learning paths matching your filters"}
              </p>
            </AlertDescription>
          </Alert>
        )}
      </div>

    </div>
  );
};

export default LearningPathsPage;
