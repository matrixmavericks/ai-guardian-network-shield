import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Award,
  CheckCircle,
  ExternalLink,
  FileUp,
  Loader2,
  Send,
  Sparkles,
  Star,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";

interface CapstoneSubmissionProps {
  pathId: string;
  pathTitle: string;
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

interface Submission {
  id: string;
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

const CapstoneSubmission: React.FC<CapstoneSubmissionProps> = ({ pathId, pathTitle }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [textContent, setTextContent] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("capstone_submissions")
        .select("*")
        .eq("path_id", pathId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setSubmission({
          ...data,
          ai_feedback: data.ai_feedback as unknown as AIFeedback | null,
        } as Submission);
      }
      setIsLoading(false);
    };
    load();
  }, [user, pathId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 20MB.", variant: "destructive" });
      return;
    }
    setFile(f || null);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!textContent.trim() && !externalLink.trim() && !file) {
      toast({ title: "Nothing to submit", description: "Add text, a link, or upload a file.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (file) {
        fileName = file.name;
        const filePath = `${user.id}/${pathId}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("capstone-files")
          .upload(filePath, file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("capstone-files").getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from("capstone_submissions")
        .insert({
          path_id: pathId,
          user_id: user.id,
          text_content: textContent.trim(),
          external_link: externalLink.trim(),
          file_url: fileUrl,
          file_name: fileName,
          status: "submitted",
        })
        .select("*")
        .single();

      if (error) throw error;

      setSubmission({
        ...data,
        ai_feedback: null,
      } as Submission);
      toast({ title: "Capstone submitted!", description: "You can now request AI evaluation." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIEvaluate = async () => {
    if (!submission) return;
    setIsEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-capstone", {
        body: { submissionId: submission.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Evaluation failed");

      setSubmission((prev) =>
        prev ? { ...prev, ai_feedback: data.feedback, ai_score: data.feedback.overallScore, status: "ai_reviewed" } : prev
      );
      toast({ title: "AI evaluation complete!", description: `Score: ${data.feedback.overallScore}/100` });
    } catch (err: any) {
      toast({ title: "Evaluation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isLoading) {
    return <div className="py-4 text-center text-muted-foreground">Loading capstone...</div>;
  }

  // If already submitted, show results
  if (submission) {
    const fb = submission.ai_feedback;
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5 text-primary" />
              Your Capstone Submission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={submission.status === "ai_reviewed" || submission.status === "teacher_reviewed" ? "default" : "secondary"}>
                {submission.status.replace("_", " ")}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Submitted {new Date(submission.created_at).toLocaleDateString()}
              </span>
            </div>

            {submission.text_content && (
              <div>
                <p className="text-sm font-medium mb-1">Your Response</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{submission.text_content}</p>
              </div>
            )}
            {submission.external_link && (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                <a href={submission.external_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                  {submission.external_link}
                </a>
              </div>
            )}
            {submission.file_name && submission.file_url && (
              <div className="flex items-center gap-2">
                <FileUp className="h-4 w-4 text-muted-foreground" />
                <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                  {submission.file_name}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {!fb && submission.status === "submitted" && (
              <Button onClick={handleAIEvaluate} disabled={isEvaluating} className="w-full">
                {isEvaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isEvaluating ? "AI is evaluating..." : "Get AI Evaluation"}
              </Button>
            )}
          </CardContent>
        </Card>

        {fb && (
          <Card className="border-primary/20 bg-accent/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Evaluation Report
                </span>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {fb.overallScore}/100
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">{fb.summary}</p>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Rubric Breakdown</h4>
                {fb.criteria?.map((c, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{c.name}</span>
                      <span className="font-medium">{c.score}/100</span>
                    </div>
                    <Progress value={c.score} className="h-2" />
                    <p className="text-xs text-muted-foreground">{c.feedback}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="flex items-center gap-1 font-medium text-sm mb-2">
                    <Star className="h-4 w-4 text-yellow-500" /> Strengths
                  </h4>
                  <ul className="space-y-1">
                    {fb.strengths?.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="flex items-center gap-1 font-medium text-sm mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" /> Areas to Improve
                  </h4>
                  <ul className="space-y-1">
                    {fb.improvements?.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <TrendingUp className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {submission.teacher_feedback && (
          <Card className="border-green-500/20">
            <CardHeader>
              <CardTitle className="text-lg">Teacher Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {submission.teacher_score !== null && (
                <Badge variant="outline" className="text-lg px-3 py-1">{submission.teacher_score}/100</Badge>
              )}
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{submission.teacher_feedback}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Submission form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="h-5 w-5 text-primary" />
          Submit Capstone Project
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Demonstrate your mastery of <strong>{pathTitle}</strong> by submitting a capstone project. You can write a response, upload files (code, PDFs, presentations), or share a link.
        </p>

        <div>
          <label className="text-sm font-medium">Your Response / Reflection</label>
          <Textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Describe your project, explain your approach, or write your response..."
            className="mt-1 min-h-[120px]"
            maxLength={10000}
          />
        </div>

        <div>
          <label className="text-sm font-medium">External Link (optional)</label>
          <Input
            value={externalLink}
            onChange={(e) => setExternalLink(e.target.value)}
            placeholder="https://github.com/... or deployed app URL"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Upload File (optional)</label>
          <div className="mt-1 flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-accent transition-colors w-full">
              <Upload className="h-4 w-4" />
              {file ? file.name : "Choose file (PDF, code, PPT, images — max 20MB)"}
              <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.ppt,.pptx,.py,.js,.ts,.tsx,.jsx,.html,.css,.zip,.png,.jpg,.jpeg,.csv,.json,.md,.txt" />
            </label>
            {file && (
              <Button size="icon" variant="ghost" onClick={() => setFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full" size="lg">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          {isSubmitting ? "Submitting..." : "Submit Capstone"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CapstoneSubmission;
