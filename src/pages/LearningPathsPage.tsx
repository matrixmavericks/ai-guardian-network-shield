import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Book, GraduationCap, Search, Star, TrendingUp, Bookmark } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import LearningPathCard from "@/components/LearningPathCard";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getLearningPaths,
  getUserProgress,
  type LearningPath,
  type PathProgress,
} from "@/services/learningPathService";

type SortOption = "recommended" | "rating" | "newest" | "popular" | "duration";
type DifficultyFilter = "all" | "beginner" | "intermediate" | "advanced";
type ProgressFilter = "all" | "not-started" | "in-progress" | "completed" | "bookmarked";

const LearningPathsPage = () => {
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [progressItems, setProgressItems] = useState<PathProgress[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubject, setActiveSubject] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const progressMap = useMemo(
    () => new Map(progressItems.map((item) => [item.pathId, item])),
    [progressItems],
  );
  const bookmarkedPathIds = useMemo(
    () => progressItems.filter((item) => item.bookmarked).map((item) => item.pathId),
    [progressItems],
  );

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [paths, progress] = await Promise.all([
          getLearningPaths(),
          user ? getUserProgress(user.id) : Promise.resolve([]),
        ]);
        setLearningPaths(paths);
        setProgressItems(progress);
      } catch (err: any) {
        setError(err?.message || "Failed to load learning paths.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user?.id, refreshKey]);

  const subjects = useMemo(
    () => [...new Set(learningPaths.map((path) => path.subject))],
    [learningPaths],
  );

  const getPathProgressValue = (pathId: string) => progressMap.get(pathId)?.progress ?? 0;

  const filteredAndSortedPaths = useMemo(() => {
    const filtered = learningPaths.filter((path) => {
      const matchesSearch =
        path.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        path.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        path.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSubject = activeSubject === "all" || path.subject === activeSubject;
      const matchesDifficulty = difficultyFilter === "all" || path.difficulty === difficultyFilter;

      const progress = getPathProgressValue(path.id);
      let matchesProgress = true;
      if (progressFilter === "not-started") matchesProgress = progress === 0;
      else if (progressFilter === "in-progress") matchesProgress = progress > 0 && progress < 100;
      else if (progressFilter === "completed") matchesProgress = progress === 100;
      else if (progressFilter === "bookmarked") matchesProgress = bookmarkedPathIds.includes(path.id);

      return matchesSearch && matchesSubject && matchesDifficulty && matchesProgress;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.rating - a.rating;
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "popular":
          return b.enrolledCount - a.enrolledCount;
        case "duration":
          return a.estimatedHours - b.estimatedHours;
        case "recommended":
        default:
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating;
      }
    });

    return filtered;
  }, [learningPaths, searchTerm, activeSubject, difficultyFilter, progressFilter, sortBy, bookmarkedPathIds, progressMap]);

  const featuredPaths = learningPaths.filter((path) => path.featured);

  const stats = {
    totalPaths: learningPaths.length,
    inProgress: progressItems.filter((item) => item.progress > 0 && item.progress < 100).length,
    completed: progressItems.filter((item) => item.progress === 100).length,
    bookmarked: bookmarkedPathIds.length,
  };

  const handleViewDetails = (pathId: string) => {
    navigate(`/learning-path/${pathId}`);
  };

  const canCreatePath = user?.role === "teacher" || user?.role === "admin";

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Learning Paths</h1>
          <p className="mt-1 text-muted-foreground">
            Discover AI-assisted learning journeys and track real progress.
          </p>
        </div>
        {canCreatePath && (
          <Button onClick={() => navigate("/create-learning-path")} size="lg">
            <GraduationCap className="mr-2 h-5 w-5" />
            Create Custom Path
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Book className="mr-2 h-4 w-4" />
              Total Paths
            </CardDescription>
            <CardTitle className="text-3xl">{stats.totalPaths}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              In Progress
            </CardDescription>
            <CardTitle className="text-3xl">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Star className="mr-2 h-4 w-4" />
              Completed
            </CardDescription>
            <CardTitle className="text-3xl">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Bookmark className="mr-2 h-4 w-4" />
              Bookmarked
            </CardDescription>
            <CardTitle className="text-3xl">{stats.bookmarked}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {featuredPaths.length > 0 && !isLoading && (
        <div className="mb-8">
          <h2 className="mb-4 flex items-center text-2xl font-bold">
            <Star className="mr-2 h-6 w-6 text-primary" />
            Featured Learning Paths
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {featuredPaths.map((path) => (
              <LearningPathCard
                key={path.id}
                learningPath={path}
                progress={getPathProgressValue(path.id)}
                onViewDetails={handleViewDetails}
                isBookmarked={bookmarkedPathIds.includes(path.id)}
                onToggleBookmark={async () => setRefreshKey((key) => key + 1)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search learning paths, tags..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
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
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="all">All Subjects</TabsTrigger>
            {subjects.map((subject) => (
              <TabsTrigger key={subject} value={subject}>{subject}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredAndSortedPaths.length} of {learningPaths.length} learning paths
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading learning paths...</div>
        ) : filteredAndSortedPaths.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedPaths.map((path) => (
              <LearningPathCard
                key={path.id}
                learningPath={path}
                progress={getPathProgressValue(path.id)}
                onViewDetails={handleViewDetails}
                isBookmarked={bookmarkedPathIds.includes(path.id)}
                onToggleBookmark={async () => setRefreshKey((key) => key + 1)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <h3 className="text-lg font-semibold">No learning paths yet</h3>
            <p className="mt-2 text-muted-foreground">
              {canCreatePath
                ? "Generate your first AI learning path to get started."
                : "Your teacher has not published any learning paths yet."}
            </p>
            {canCreatePath && (
              <Button className="mt-4" onClick={() => navigate("/create-learning-path")}>Create First Path</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningPathsPage;
