
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Book, CheckCircle } from "lucide-react";
import { LearningPath } from "@/services/localStorageService";

interface LearningPathCardProps {
  learningPath: LearningPath;
  progress?: number;
  onViewDetails: (pathId: string) => void;
}

const LearningPathCard = ({ learningPath, progress = 0, onViewDetails }: LearningPathCardProps) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <Book className="h-5 w-5 mr-2 text-blue-600" />
          {learningPath.title}
        </CardTitle>
        <CardDescription>{learningPath.subject}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 mb-4">
          {learningPath.description}
        </p>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Modules:</p>
          <ul className="space-y-2">
            {learningPath.modules.slice(0, 3).map((module) => (
              <li key={module.id} className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                {module.title}
              </li>
            ))}
            {learningPath.modules.length > 3 && (
              <li className="text-sm text-slate-500">
                +{learningPath.modules.length - 3} more modules
              </li>
            )}
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          variant="outline"
          onClick={() => onViewDetails(learningPath.id)}
        >
          View Path Details
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LearningPathCard;
