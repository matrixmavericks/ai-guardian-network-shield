import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Book, CheckCircle, Clock, Users, Star, Bookmark, BookmarkCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toggleBookmark as toggleBookmarkService } from "@/services/learningPathProgressService";
import type { LearningPath } from "@/services/learningPathService";
import { useToast } from "@/hooks/use-toast";

interface LearningPathCardProps {
  learningPath: LearningPath;
  progress?: number;
  onViewDetails: (pathId: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark: () => Promise<void> | void;
}

const LearningPathCard = ({ learningPath, progress = 0, onViewDetails, isBookmarked = false, onToggleBookmark }: LearningPathCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const getDifficultyVariant = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "secondary" as const;
      case "intermediate":
        return "outline" as const;
      case "advanced":
        return "default" as const;
      default:
        return "secondary" as const;
    }
  };

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to bookmark learning paths.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newBookmarkState = await toggleBookmarkService(user.id, learningPath.id);
      toast({
        title: newBookmarkState ? "Bookmarked" : "Removed bookmark",
        description: newBookmarkState
          ? "Learning path added to your bookmarks."
          : "Learning path removed from your bookmarks.",
      });
      await onToggleBookmark();
    } catch (error: any) {
      toast({
        title: "Bookmark failed",
        description: error?.message || "Could not update bookmark right now.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="h-full transition-shadow hover:shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant={getDifficultyVariant(learningPath.difficulty)}>
                {learningPath.difficulty}
              </Badge>
              {learningPath.featured && (
                <Badge variant="outline">
                  <Star className="mr-1 h-3 w-3" />
                  Featured
                </Badge>
              )}
            </div>
            <CardTitle className="flex items-center text-lg">
              <Book className="mr-2 h-5 w-5 text-primary" />
              {learningPath.title}
            </CardTitle>
            <CardDescription className="mt-1">{learningPath.subject}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleBookmarkClick} className="shrink-0">
            {isBookmarked ? (
              <BookmarkCheck className="h-5 w-5 fill-primary text-primary" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{learningPath.description}</p>

        <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center">
            <Clock className="mr-1 h-3 w-3" />
            {learningPath.estimatedHours}h
          </div>
          <div className="flex items-center">
            <Users className="mr-1 h-3 w-3" />
            {learningPath.enrolledCount}
          </div>
          <div className="flex items-center">
            <Star className="mr-1 h-3 w-3" />
            {learningPath.rating.toFixed(1)}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1">
          {learningPath.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {progress > 0 && (
          <div className="mb-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Your Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">{learningPath.modules.length} Modules:</p>
          <ul className="space-y-2">
            {learningPath.modules.slice(0, 2).map((module) => (
              <li key={module.id} className="flex items-center text-sm">
                <CheckCircle className="mr-2 h-4 w-4 shrink-0 text-primary" />
                <span className="line-clamp-1">{module.title}</span>
              </li>
            ))}
            {learningPath.modules.length > 2 && (
              <li className="text-sm text-muted-foreground">
                +{learningPath.modules.length - 2} more modules
              </li>
            )}
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => onViewDetails(learningPath.id)}>
          {progress > 0 && progress < 100 ? "Continue Learning" : progress === 100 ? "Review Path" : "Start Learning"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LearningPathCard;
