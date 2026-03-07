import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, BookOpen, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Section {
  heading: string;
  content: string;
  keyPoints: string[];
}

interface ResourceContent {
  sections: Section[];
  summary: string;
  practiceExercises: string[];
}

interface ResourceViewerProps {
  resourceTitle: string;
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
  difficulty: string;
}

const ResourceViewer = ({ resourceTitle, subject, moduleTitle, moduleDescription, difficulty }: ResourceViewerProps) => {
  const [content, setContent] = useState<ResourceContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  const loadContent = async () => {
    if (content) return; // Already loaded
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-module-content", {
        body: { type: "resource", topic: resourceTitle, subject, moduleTitle, moduleDescription, difficulty },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || "Failed to generate content.");
      setContent(data.data);
      setExpandedSections(new Set([0]));
    } catch (err: any) {
      setError(err?.message || "Could not load content.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (!content && !isLoading) {
    return (
      <Button variant="outline" className="w-full justify-start gap-2" onClick={loadContent}>
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="font-medium">{resourceTitle}</span>
        <span className="ml-auto text-xs text-muted-foreground">Click to study</span>
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="flex items-center justify-center gap-3 py-8">
          <Loader className="h-5 w-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Generating learning content for "{resourceTitle}"...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => { setContent(null); setError(null); }}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          {resourceTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {content!.sections.map((section, index) => (
          <div key={index} className="rounded-lg border bg-muted/30">
            <button
              type="button"
              className="flex w-full items-center justify-between p-4 text-left"
              onClick={() => toggleSection(index)}
            >
              <h3 className="font-semibold">{section.heading}</h3>
              {expandedSections.has(index) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandedSections.has(index) && (
              <div className="border-t px-4 pb-4 pt-3">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{section.content}</ReactMarkdown>
                </div>
                {section.keyPoints.length > 0 && (
                  <div className="mt-4 rounded-md bg-primary/5 p-3">
                    <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold text-primary">
                      <Lightbulb className="h-4 w-4" /> Key Points
                    </h4>
                    <ul className="space-y-1">
                      {section.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {content!.summary && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h4 className="mb-2 font-semibold">Summary</h4>
            <p className="text-sm text-muted-foreground">{content!.summary}</p>
          </div>
        )}

        {content!.practiceExercises?.length > 0 && (
          <div className="rounded-lg border p-4">
            <h4 className="mb-3 font-semibold">Practice Exercises</h4>
            <ol className="list-inside list-decimal space-y-2">
              {content!.practiceExercises.map((exercise, i) => (
                <li key={i} className="text-sm">{exercise}</li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResourceViewer;
