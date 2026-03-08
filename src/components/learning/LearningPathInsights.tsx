import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, CheckCircle2, Clock, Lightbulb, Loader,
  Shield, Sparkles, Target, TrendingUp, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WatchOutItem {
  topic: string;
  why: string;
  tip: string;
  severity: "low" | "medium" | "high";
}

interface StrengthItem {
  strength: string;
  how_it_helps: string;
}

interface FocusItem {
  module_name: string;
  attention_level: "normal" | "extra" | "critical";
  reason: string;
}

interface PreStudyExercise {
  exercise: string;
  purpose: string;
  duration_minutes: number;
}

interface PathInsights {
  watch_out_for: WatchOutItem[];
  strengths_to_leverage: StrengthItem[];
  recommended_focus_order: FocusItem[];
  pre_study_exercises: PreStudyExercise[];
  encouragement: string;
}

interface LearningPathInsightsProps {
  pathId: string;
  pathTitle: string;
  pathSubject: string;
  pathDifficulty: string;
  modules: { id: string; title: string; description: string }[];
}

const severityConfig = {
  low: { color: "bg-accent text-accent-foreground", icon: Lightbulb },
  medium: { color: "bg-warning/10 text-warning", icon: AlertTriangle },
  high: { color: "bg-destructive/10 text-destructive", icon: Shield },
};

const attentionConfig = {
  normal: { label: "Normal", color: "secondary" as const },
  extra: { label: "Extra Focus", color: "default" as const },
  critical: { label: "Critical", color: "destructive" as const },
};

const LearningPathInsights = ({ pathId, pathTitle, pathSubject, pathDifficulty, modules }: LearningPathInsightsProps) => {
  const [insights, setInsights] = useState<PathInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-path-insights", {
        body: { pathId, pathTitle, pathSubject, pathDifficulty, modules },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setInsights(data.insights);
    } catch (err: any) {
      setError(err?.message || "Could not generate insights.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!insights && !isLoading && !error) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="rounded-full bg-primary/10 p-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Personalized Insights</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Get AI-powered recommendations based on your past performance to help you succeed in this learning path.
            </p>
          </div>
          <Button onClick={loadInsights} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate My Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-12">
          <Loader className="h-5 w-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Analyzing your learning history...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadInsights}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-6">
      {/* Encouragement Banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm font-medium">{insights.encouragement}</p>
        </CardContent>
      </Card>

      {/* Watch Out For */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Watch Out For
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.watch_out_for.map((item, i) => {
            const config = severityConfig[item.severity];
            const Icon = config.icon;
            return (
              <div key={i} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="font-semibold">{item.topic}</span>
                  <Badge variant="outline" className={`ml-auto text-xs ${config.color}`}>
                    {item.severity}
                  </Badge>
                </div>
                <p className="mb-2 text-sm text-muted-foreground">{item.why}</p>
                <div className="flex items-start gap-2 rounded-md bg-accent/50 p-2">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm font-medium">{item.tip}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Strengths to Leverage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Your Strengths for This Path
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.strengths_to_leverage.map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">{item.strength}</p>
                <p className="text-sm text-muted-foreground">{item.how_it_helps}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Module Focus Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Module Attention Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {insights.recommended_focus_order.map((item, i) => {
              const config = attentionConfig[item.attention_level];
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                  <Badge variant={config.color} className="shrink-0">{config.label}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.module_name}</p>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pre-Study Exercises */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Warm-Up Exercises
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Complete these quick exercises before starting the path to refresh key concepts.
          </p>
          <div className="space-y-3">
            {insights.pre_study_exercises.map((item, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-medium">{item.exercise}</p>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {item.duration_minutes} min
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.purpose}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" onClick={loadInsights} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Refresh Insights
        </Button>
      </div>
    </div>
  );
};

export default LearningPathInsights;
