import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader, ListChecks, CheckCircle, XCircle, ArrowRight, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizPlayerProps {
  quizTitle: string;
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
  difficulty: string;
}

const QuizPlayer = ({ quizTitle, subject, moduleTitle, moduleDescription, difficulty }: QuizPlayerProps) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const loadQuiz = async () => {
    if (questions.length > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-module-content", {
        body: { type: "quiz", topic: quizTitle, subject, moduleTitle, moduleDescription, difficulty },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || "Failed to generate quiz.");
      setQuestions(data.data.questions || []);
      setCurrentIndex(0);
      setScore(0);
      setIsComplete(false);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } catch (err: any) {
      setError(err?.message || "Could not load quiz.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (isAnswered) return;
    setSelectedAnswer(optionIndex);
    setIsAnswered(true);
    if (optionIndex === questions[currentIndex].correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsComplete(true);
    }
  };

  const handleRetry = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setIsComplete(false);
    setSelectedAnswer(null);
    setIsAnswered(false);
    loadQuiz();
  };

  // Initial state - not loaded yet
  if (questions.length === 0 && !isLoading && !error) {
    return (
      <Button variant="outline" className="w-full justify-start gap-2" onClick={loadQuiz}>
        <ListChecks className="h-4 w-4 text-primary" />
        <span className="font-medium">{quizTitle}</span>
        <span className="ml-auto text-xs text-muted-foreground">Click to take quiz</span>
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="flex items-center justify-center gap-3 py-8">
          <Loader className="h-5 w-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Generating quiz for "{quizTitle}"...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => { setError(null); }}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Quiz complete
  if (isComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Quiz Complete: {quizTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="text-5xl font-bold text-primary">{percentage}%</div>
          <p className="text-muted-foreground">
            You got {score} out of {questions.length} questions correct.
          </p>
          <Progress value={percentage} className="h-3" />
          <p className="text-sm">
            {percentage >= 80 ? "🎉 Excellent work!" : percentage >= 60 ? "👍 Good job, keep practicing!" : "📚 Review the material and try again."}
          </p>
          <Button variant="outline" onClick={handleRetry}>
            <RotateCcw className="mr-2 h-4 w-4" /> Retake Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Active quiz
  const q = questions[currentIndex];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{quizTitle}</CardTitle>
          <span className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <Progress value={((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100} className="mt-2 h-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base font-medium">{q.question}</p>

        <div className="space-y-2">
          {q.options.map((option, i) => {
            const isCorrect = i === q.correctIndex;
            const isSelected = i === selectedAnswer;

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleAnswer(i)}
                disabled={isAnswered}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                  !isAnswered && "hover:border-primary hover:bg-accent cursor-pointer",
                  isAnswered && isCorrect && "border-green-500 bg-green-50 dark:bg-green-950/30",
                  isAnswered && isSelected && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-950/30",
                  isAnswered && !isSelected && !isCorrect && "opacity-50",
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{option}</span>
                {isAnswered && isCorrect && <CheckCircle className="h-5 w-5 text-green-600" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-600" />}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm font-medium">
              {selectedAnswer === q.correctIndex ? "✅ Correct!" : "❌ Incorrect"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{q.explanation}</p>
          </div>
        )}

        {isAnswered && (
          <div className="flex justify-end">
            <Button onClick={handleNext}>
              {currentIndex < questions.length - 1 ? (
                <>Next Question <ArrowRight className="ml-2 h-4 w-4" /></>
              ) : (
                "See Results"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuizPlayer;
