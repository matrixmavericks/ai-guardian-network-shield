
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Book, CheckCircle, Clock, Users, Star, Bookmark, BookmarkCheck } from "lucide-react";
import { LearningPath } from "@/services/localStorageService";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toggleBookmark as toggleBookmarkService } from "@/services/learningPathProgressService";
import { useToast } from "@/hooks/use-toast";

interface LearningPathCardProps {
  learningPath: LearningPath;
  progress?: number;
  onViewDetails: (pathId: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark: () => void;
}

const LearningPathCard = ({ learningPath, progress = 0, onViewDetails, isBookmarked = false, onToggleBookmark }: LearningPathCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to bookmark learning paths",
        variant: "destructive",
      });
      return;
    }
    
    const newBookmarkState = toggleBookmarkService(user.id, learningPath.id);
    toast({
      title: newBookmarkState ? "Bookmarked" : "Removed bookmark",
      description: newBookmarkState 
        ? "Learning path added to your bookmarks" 
        : "Learning path removed from bookmarks",
    });
    onToggleBookmark();
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className={getDifficultyColor(learningPath.difficulty)}>
                {learningPath.difficulty}
              </Badge>
              {learningPath.featured && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  <Star className="h-3 w-3 mr-1 fill-yellow-500" />
                  Featured
                </Badge>
              )}
            </div>
            <CardTitle className="flex items-center text-lg">
              <Book className="h-5 w-5 mr-2 text-primary" />
              {learningPath.title}
            </CardTitle>
            <CardDescription className="mt-1">{learningPath.subject}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBookmarkClick}
            className="shrink-0"
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-5 w-5 text-primary fill-primary" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {learningPath.description}
        </p>

        {/* Meta information */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {learningPath.estimatedHours}h
          </div>
          <div className="flex items-center">
            <Users className="h-3 w-3 mr-1" />
            {learningPath.enrolledCount}
          </div>
          <div className="flex items-center">
            <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
            {learningPath.rating}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {learningPath.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Progress */}
        {progress > 0 && (
          <div className="space-y-1 mb-4">
            <div className="flex justify-between text-sm">
              <span>Your Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Modules preview */}
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">{learningPath.modules.length} Modules:</p>
          <ul className="space-y-2">
            {learningPath.modules.slice(0, 2).map((module) => (
              <li key={module.id} className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500 shrink-0" />
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
        <Button 
          className="w-full" 
          onClick={() => onViewDetails(learningPath.id)}
        >
          {progress > 0 && progress < 100 ? 'Continue Learning' : progress === 100 ? 'Review Path' : 'Start Learning'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LearningPathCard;
