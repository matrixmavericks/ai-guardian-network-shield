import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Brain, Eye, Ear, BookOpen, Hand, Sparkles, AlertTriangle, CheckCircle2,
  Shield, Lightbulb, Clock, Loader, RefreshCw, Target, TrendingUp, Zap,
  Upload, FileText, Trash2, Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface LearningStyle {
  primary: string;
  secondary?: string;
  description: string;
  tips: string[];
}

interface ConceptualGap {
  topic: string;
  severity: "minor" | "moderate" | "critical";
  description: string;
  remediation: string;
}

interface Strength {
  area: string;
  evidence: string;
}

interface PreventiveInsight {
  prediction: string;
  prevention: string;
  priority: "low" | "medium" | "high";
}

interface PlanActivity {
  order: number;
  activity: string;
  why: string;
  duration_minutes: number;
  type: "lesson" | "practice" | "quiz" | "reflection" | "project";
}

interface LearningProfile {
  learning_style: LearningStyle;
  conceptual_gaps: ConceptualGap[];
  strengths: Strength[];
  preventive_insights: PreventiveInsight[];
  optimized_plan: PlanActivity[];
  overall_summary: string;
}

interface DocumentDiagnostics {
  totalDocuments: number;
  analyzedDocuments: number;
  extractedCharacters: number;
  documents: Array<{
    fileName: string;
    type: string;
    status: string;
    extractedChars: number;
  }>;
}

interface StudentDocument {
  id: string;
  file_name: string;
  file_url: string;
  document_type: string;
  description: string;
  created_at: string;
}

const styleIcons: Record<string, React.ReactNode> = {
  visual: <Eye className="h-5 w-5" />,
  auditory: <Ear className="h-5 w-5" />,
  reading_writing: <BookOpen className="h-5 w-5" />,
  kinesthetic: <Hand className="h-5 w-5" />,
};

const activityIcons: Record<string, React.ReactNode> = {
  lesson: <BookOpen className="h-4 w-4" />,
  practice: <Target className="h-4 w-4" />,
  quiz: <Zap className="h-4 w-4" />,
  reflection: <Lightbulb className="h-4 w-4" />,
  project: <Sparkles className="h-4 w-4" />,
};

const severityColors: Record<string, string> = {
  minor: "bg-yellow-100 text-yellow-800 border-yellow-200",
  moderate: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const priorityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

interface AdaptiveLearningProfileProps {
  targetUserId?: string; // For teacher viewing a student
  targetUserName?: string;
}

const AdaptiveLearningProfile = ({ targetUserId, targetUserName }: AdaptiveLearningProfileProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [documentDiagnostics, setDocumentDiagnostics] = useState<DocumentDiagnostics | null>(null);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("syllabus");
  const [docDescription, setDocDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const isViewingOwnProfile = !targetUserId || targetUserId === user?.id;
  const effectiveUserId = targetUserId || user?.id;
  const displayName = targetUserName || "Your";

  const fetchDocuments = async () => {
    if (!effectiveUserId) return;
    const { data, error } = await supabase
      .from("student_documents")
      .select("*")
      .eq("user_id", effectiveUserId)
      .order("created_at", { ascending: false });
    if (!error) setDocuments((data as StudentDocument[]) || []);
    setDocsLoaded(true);
  };

  const analyzeProfile = async () => {
    setLoading(true);
    if (!docsLoaded) await fetchDocuments();
    try {
      const { data, error } = await supabase.functions.invoke("analyze-learning-profile", {
        body: targetUserId ? { userId: targetUserId } : {},
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setProfile(data.profile);
      setDocumentDiagnostics(data.documentDiagnostics || null);
      toast({ title: "Analysis Complete", description: `${isViewingOwnProfile ? "Your" : displayName + "'s"} adaptive learning profile has been generated.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to analyze profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadFile || !user) return;
    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}_${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("student-documents")
        .upload(filePath, uploadFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("student-documents")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("student_documents").insert({
        user_id: user.id,
        file_url: urlData.publicUrl,
        file_name: uploadFile.name,
        document_type: docType,
        description: docDescription.trim(),
      });
      if (dbError) throw dbError;

      toast({ title: "Document Uploaded", description: `${uploadFile.name} has been added to your profile.` });
      setUploadDialogOpen(false);
      setUploadFile(null);
      setDocDescription("");
      fetchDocuments();
    } catch (e: any) {
      toast({ title: "Upload Failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (doc: StudentDocument) => {
    try {
      await supabase.from("student_documents").delete().eq("id", doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast({ title: "Document removed" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  // Load documents on mount
  React.useEffect(() => {
    if (effectiveUserId && !docsLoaded) fetchDocuments();
  }, [effectiveUserId]);

  if (!profile && !loading) {
    return (
      <div className="space-y-6">
        {/* Document Upload Section (only for own profile) */}
        {isViewingOwnProfile && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    My Documents
                  </CardTitle>
                  <CardDescription>Upload syllabi, report cards, transcripts to enhance your profile analysis</CardDescription>
                </div>
                <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents uploaded yet. Upload syllabi, report cards, or transcripts to get better analysis.
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            <Badge variant="secondary" className="mr-1 text-xs">{doc.document_type}</Badge>
                            {doc.description}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteDocument(doc)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Documents visible for teacher too (read only) */}
        {!isViewingOwnProfile && documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Student Documents ({documents.length})
              </CardTitle>
              <CardDescription>Documents uploaded by {displayName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 border rounded-lg p-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        <Badge variant="secondary" className="mr-1 text-xs">{doc.document_type}</Badge>
                        {doc.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="max-w-2xl mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Brain className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Ethical Adaptation Framework</h2>
            <p className="text-muted-foreground max-w-md mb-2">
              {isViewingOwnProfile
                ? "This AI-powered analysis examines your chat history, assignments, grades, and uploaded documents to build a personalized profile."
                : `Analyze ${displayName}'s learning patterns, grades, and documents to generate an adaptive profile.`}
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-6 text-left">
              <li className="flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Identifies unique learning style</li>
              <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Detects conceptual gaps before they grow</li>
              <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Preventive teaching to stop mistakes early</li>
              <li className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Optimized plan tailored to learning style</li>
              <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Uses uploaded syllabi & report cards</li>
            </ul>
            <Button onClick={analyzeProfile} size="lg" className="gap-2">
              <Sparkles className="h-5 w-5" /> {isViewingOwnProfile ? "Analyze My Learning Profile" : `Analyze ${displayName}'s Profile`}
            </Button>
          </CardContent>
        </Card>

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>Upload a syllabus, report card, transcript, or other academic document.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="syllabus">Syllabus</SelectItem>
                    <SelectItem value="report_card">Report Card</SelectItem>
                    <SelectItem value="transcript">Transcript</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="notes">Study Notes</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>File</Label>
                <Input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="mt-1" />
                {uploadFile && <p className="text-xs text-muted-foreground mt-1">{uploadFile.name}</p>}
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="e.g. Math syllabus for Spring 2026, Grade 10 report card..."
                  value={docDescription}
                  onChange={e => setDocDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <Button onClick={handleUploadDocument} disabled={uploading || !uploadFile} className="w-full">
                {uploading ? "Uploading..." : "Upload Document"}
                <Upload className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (loading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Loader className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Analyzing learning patterns...</p>
          <p className="text-sm text-muted-foreground mt-1">Reviewing chat history, grades, documents, and learning paths</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> {isViewingOwnProfile ? "Your" : `${displayName}'s`} Learning Profile
          </h2>
          <p className="text-muted-foreground text-sm mt-1">{profile!.overall_summary}</p>
        </div>
        <Button variant="outline" onClick={analyzeProfile} disabled={loading} size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Re-analyze
        </Button>
      </div>

      {documentDiagnostics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Document Analysis Impact
            </CardTitle>
            <CardDescription>
              {documentDiagnostics.analyzedDocuments}/{documentDiagnostics.totalDocuments} documents analyzed, {documentDiagnostics.extractedCharacters.toLocaleString()} characters extracted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {documentDiagnostics.documents.map((doc, idx) => (
              <div key={`${doc.fileName}-${idx}`} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                <span className="truncate pr-3">{doc.fileName}</span>
                <Badge variant={doc.status.startsWith("extracted") ? "secondary" : "outline"}>
                  {doc.status === "extracted_ocr" ? "OCR" : doc.status === "extracted_text" ? "text" : doc.status} · {doc.extractedChars} chars
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Style */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {styleIcons[profile!.learning_style.primary] || <Brain className="h-5 w-5" />}
              Learning Style
            </CardTitle>
            <CardDescription>How {isViewingOwnProfile ? "you learn" : "this student learns"} most effectively</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm capitalize px-3 py-1">
                {profile!.learning_style.primary.replace("_", " ")} Learner
              </Badge>
              {profile!.learning_style.secondary && (
                <Badge variant="outline" className="text-sm capitalize px-3 py-1">
                  + {profile!.learning_style.secondary.replace("_", " ")}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{profile!.learning_style.description}</p>
            <div>
              <h4 className="text-sm font-semibold mb-2">Study Tips:</h4>
              <ul className="space-y-2">
                {profile!.learning_style.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Strengths
            </CardTitle>
            <CardDescription>Areas of excellence</CardDescription>
          </CardHeader>
          <CardContent>
            {profile!.strengths.length > 0 ? (
              <div className="space-y-3">
                {profile!.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{s.area}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.evidence}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Keep learning to build the strength profile!</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conceptual Gaps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Conceptual Gaps Detected
          </CardTitle>
          <CardDescription>Areas that need attention</CardDescription>
        </CardHeader>
        <CardContent>
          {profile!.conceptual_gaps.length > 0 ? (
            <div className="space-y-3">
              {profile!.conceptual_gaps.map((gap, i) => (
                <div key={i} className={`p-4 rounded-lg border ${severityColors[gap.severity]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm">{gap.topic}</h4>
                    <Badge variant="outline" className={`capitalize text-xs ${severityColors[gap.severity]}`}>
                      {gap.severity}
                    </Badge>
                  </div>
                  <p className="text-sm mb-2">{gap.description}</p>
                  <div className="flex items-start gap-2 text-sm bg-white/60 rounded p-2">
                    <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                    <span><strong>Fix:</strong> {gap.remediation}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm">No significant conceptual gaps detected. Great work!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preventive Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Preventive Teaching Insights
          </CardTitle>
          <CardDescription>Predicted challenges and how to prevent them</CardDescription>
        </CardHeader>
        <CardContent>
          {profile!.preventive_insights.length > 0 ? (
            <div className="space-y-3">
              {profile!.preventive_insights.map((insight, i) => (
                <div key={i} className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-sm">Predicted: {insight.prediction}</span>
                    </div>
                    <Badge className={`text-xs ${priorityColors[insight.priority]}`}>
                      {insight.priority} priority
                    </Badge>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground ml-6">
                    <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span><strong>Prevention:</strong> {insight.prevention}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No preventive insights yet. Keep using the platform!</p>
          )}
        </CardContent>
      </Card>

      {/* Optimized Learning Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Optimized Learning Plan
          </CardTitle>
          <CardDescription>Activities tailored to the learning style and current needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {profile!.optimized_plan
              .sort((a, b) => a.order - b.order)
              .map((activity, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
                    {activity.order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {activityIcons[activity.type]}
                      <h4 className="font-medium text-sm">{activity.activity}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{activity.why}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {activity.duration_minutes} min
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">{activity.type}</Badge>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <div className="mt-4 p-3 bg-primary/5 rounded-lg text-sm text-muted-foreground flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>This plan is personalized based on the <strong>{profile!.learning_style.primary.replace("_", " ")}</strong> learning style and current progress. Re-analyze periodically for updated recommendations.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdaptiveLearningProfile;
