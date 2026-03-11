import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Award,
  CheckCircle,
  ExternalLink,
  FileUp,
  Loader2,
  Save,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";

interface CapstoneTeacherReviewProps {
  pathId: string;
  pathTitle: string;
  studentIds: string[];
}

interface CriteriaItem {
  name: string;
  score: number;
  feedback: string;
}

interface AIFeedback {
  overallScore: number;
  criteria: CriteriaItem[];
  strengths: string[];
  improvements: string[];
  summary: string;
}

interface SubmissionRow {
  id: string;
  user_id: string;
  text_content: string;
  external_link: string;
  file_url: string | null;
  file_name: string | null;
  status: string;
  ai_feedback: AIFeedback | null;
  ai_score: number | null;
  teacher_feedback: string | null;
  teacher_score: number | null;
  created_at: string;
}

const CapstoneTeacherReview: React.FC<CapstoneTeacherReviewProps> = ({ pathId, pathTitle, studentIds }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<(SubmissionRow & { studentName: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!studentIds.length) { setIsLoading(false); return; }
      const { data: subs } = await supabase
        .from("capstone_submissions")
        .select("*")
        .eq("path_id", pathId)
        .in("user_id", studentIds);

      if (!subs?.length) { setIsLoading(false); return; }

      const uids = [...new Set(subs.map((s) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", uids);

      const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));
      setSubmissions(
        subs.map((s) => ({
          ...s,
          ai_feedback: s.ai_feedback as unknown as AIFeedback | null,
          studentName: nameMap.get(s.user_id) || "Unknown",
        })) as any
      );
      setIsLoading(false);
    };
    load();
  }, [pathId, studentIds]);

  const selected = submissions.find((s) => s.id === selectedId);

  const handleSaveFeedback = async () => {
    if (!selected || !user) return;
    const scoreNum = parseInt(score);
    if (score && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100)) {
      toast({ title: "Invalid score", description: "Enter 0-100", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("capstone_submissions")
        .update({
          teacher_feedback: feedback,
          teacher_score: score ? scoreNum : null,
          teacher_id: user.id,
          status: "teacher_reviewed",
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id);
      if (error) throw error;
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selected.id
            ? { ...s, teacher_feedback: feedback, teacher_score: score ? scoreNum : null, status: "teacher_reviewed" }
            : s
        )
      );
      toast({ title: "Feedback saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="py-4 text-center text-muted-foreground">Loading submissions...</div>;
  if (!submissions.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No capstone submissions yet for this learning path.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Student Capstone Submissions ({submissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {submissions.map((s) => (
              <Button
                key={s.id}
                variant={selectedId === s.id ? "default" : "outline"}
                className="justify-start"
                onClick={() => {
                  setSelectedId(s.id);
                  setFeedback(s.teacher_feedback || "");
                  setScore(s.teacher_score?.toString() || "");
                }}
              >
                <Award className="mr-2 h-4 w-4" />
                <span className="truncate">{s.studentName}</span>
                <Badge variant={s.status.includes("reviewed") ? "default" : "secondary"} className="ml-auto text-xs">
                  {s.ai_score ?? "—"}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{selected.studentName}'s Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant={selected.status.includes("reviewed") ? "default" : "secondary"}>
                {selected.status.replace("_", " ")}
              </Badge>
              {selected.text_content && (
                <div>
                  <p className="text-sm font-medium mb-1">Response</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.text_content}</p>
                </div>
              )}
              {selected.external_link && (
                <a href={selected.external_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary underline">
                  <ExternalLink className="h-4 w-4" />{selected.external_link}
                </a>
              )}
              {selected.file_name && (
                <div className="flex items-center gap-2 text-sm">
                  <FileUp className="h-4 w-4" />{selected.file_name}
                  {selected.file_url && (
                    <a href={selected.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">View</a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {selected.ai_feedback && (
            <Card className="border-primary/20 bg-accent/30">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />AI Report</span>
                  <Badge variant="outline" className="text-lg px-3 py-1">{selected.ai_feedback.overallScore}/100</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{selected.ai_feedback.summary}</p>
                {selected.ai_feedback.criteria?.map((c, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm"><span>{c.name}</span><span className="font-medium">{c.score}/100</span></div>
                    <Progress value={c.score} className="h-2" />
                    <p className="text-xs text-muted-foreground">{c.feedback}</p>
                  </div>
                ))}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="flex items-center gap-1 font-medium text-sm mb-2"><Star className="h-4 w-4 text-yellow-500" />Strengths</h4>
                    <ul className="space-y-1">{selected.ai_feedback.strengths?.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />{s}</li>
                    ))}</ul>
                  </div>
                  <div>
                    <h4 className="flex items-center gap-1 font-medium text-sm mb-2"><TrendingUp className="h-4 w-4 text-blue-500" />Improvements</h4>
                    <ul className="space-y-1">{selected.ai_feedback.improvements?.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm"><TrendingUp className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />{s}</li>
                    ))}</ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Score (0-100)</label>
                <Input value={score} onChange={(e) => setScore(e.target.value)} type="number" min={0} max={100} placeholder="e.g., 85" className="mt-1 w-32" />
              </div>
              <div>
                <label className="text-sm font-medium">Written Feedback</label>
                <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Provide feedback to the student..." className="mt-1 min-h-[100px]" />
              </div>
              <Button onClick={handleSaveFeedback} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Feedback
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default CapstoneTeacherReview;
