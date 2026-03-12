import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Upload, Send, CheckCircle2, Clock, AlertTriangle, Star, MessageSquare, Sparkles, ExternalLink } from 'lucide-react';

interface ClassAssignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  subject: string | null;
  class_id: string;
  created_at: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  content: string;
  file_url: string | null;
  file_name: string | null;
  grade: number | null;
  max_grade: number;
  feedback: string | null;
  status: string;
  submitted_at: string;
  graded_at: string | null;
}

interface CapstoneOption {
  id: string;
  path_id: string;
  path_title: string;
  text_content: string | null;
  file_url: string | null;
  file_name: string | null;
  external_link: string | null;
  ai_score: number | null;
  status: string;
  created_at: string;
}

const StudentAssignmentView = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ClassAssignment | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewSubmission, setViewSubmission] = useState<Submission | null>(null);

  // Capstone submission
  const [submitTab, setSubmitTab] = useState<string>('manual');
  const [capstones, setCapstones] = useState<CapstoneOption[]>([]);
  const [selectedCapstone, setSelectedCapstone] = useState<CapstoneOption | null>(null);
  const [capstonesLoading, setCapstonesLoading] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', user.id);

      if (!memberships?.length) {
        setAssignments([]);
        setSubmissions([]);
        setLoading(false);
        return;
      }

      const classIds = memberships.map(m => m.class_id);

      const [assignmentsRes, submissionsRes] = await Promise.all([
        supabase
          .from('class_assignments')
          .select('*')
          .in('class_id', classIds)
          .order('due_date', { ascending: true }),
        supabase
          .from('assignment_submissions')
          .select('*')
          .eq('student_id', user.id),
      ]);

      setAssignments((assignmentsRes.data as ClassAssignment[]) || []);
      setSubmissions((submissionsRes.data as Submission[]) || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const loadCapstones = async () => {
    if (!user) return;
    setCapstonesLoading(true);
    try {
      const { data: caps } = await supabase
        .from('capstone_submissions')
        .select('id, path_id, text_content, file_url, file_name, external_link, ai_score, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!caps?.length) {
        setCapstones([]);
        setCapstonesLoading(false);
        return;
      }

      const pathIds = [...new Set(caps.map(c => c.path_id))];
      const { data: paths } = await supabase
        .from('learning_paths')
        .select('id, title')
        .in('id', pathIds);

      setCapstones(caps.map(c => ({
        ...c,
        path_title: paths?.find(p => p.id === c.path_id)?.title || 'Learning Path',
      })) as CapstoneOption[]);
    } catch {
      toast.error('Failed to load capstones');
    } finally {
      setCapstonesLoading(false);
    }
  };

  const getSubmission = (assignmentId: string) =>
    submissions.find(s => s.assignment_id === assignmentId);

  const handleSubmit = async () => {
    if (!selectedAssignment || !user) return;

    // Capstone submission
    if (submitTab === 'capstone' && selectedCapstone) {
      setSubmitting(true);
      try {
        const content = `[Capstone Submission] ${selectedCapstone.path_title}\n\n${selectedCapstone.text_content || ''}${selectedCapstone.external_link ? `\n\nExternal link: ${selectedCapstone.external_link}` : ''}${selectedCapstone.ai_score !== null ? `\n\nAI Score: ${selectedCapstone.ai_score}/100` : ''}`;

        const existing = getSubmission(selectedAssignment.id);
        if (existing) {
          const { error } = await supabase
            .from('assignment_submissions')
            .update({
              content,
              file_url: selectedCapstone.file_url || existing.file_url,
              file_name: selectedCapstone.file_name || existing.file_name,
              submitted_at: new Date().toISOString(),
              status: 'resubmitted',
            })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('assignment_submissions')
            .insert({
              assignment_id: selectedAssignment.id,
              student_id: user.id,
              content,
              file_url: selectedCapstone.file_url,
              file_name: selectedCapstone.file_name,
              status: 'submitted',
            });
          if (error) throw error;
        }

        toast.success('Capstone submitted as assignment!');
        setSubmitDialogOpen(false);
        setAnswerText('');
        setFile(null);
        setSelectedCapstone(null);
        setSelectedAssignment(null);
        fetchData();
      } catch (err: any) {
        toast.error(err.message || 'Failed to submit');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Manual submission
    if (!answerText.trim() && !file) {
      toast.error('Please provide an answer or upload a file');
      return;
    }
    setSubmitting(true);
    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (file) {
        const filePath = `${user.id}/${selectedAssignment.id}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('submission-files')
          .upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('submission-files')
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
        fileName = file.name;
      }

      const existing = getSubmission(selectedAssignment.id);
      if (existing) {
        const { error } = await supabase
          .from('assignment_submissions')
          .update({
            content: answerText.trim(),
            file_url: fileUrl || existing.file_url,
            file_name: fileName || existing.file_name,
            submitted_at: new Date().toISOString(),
            status: 'resubmitted',
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assignment_submissions')
          .insert({
            assignment_id: selectedAssignment.id,
            student_id: user.id,
            content: answerText.trim(),
            file_url: fileUrl,
            file_name: fileName,
            status: 'submitted',
          });
        if (error) throw error;
      }

      toast.success('Submission sent!');
      setSubmitDialogOpen(false);
      setAnswerText('');
      setFile(null);
      setSelectedAssignment(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const openSubmitDialog = (assignment: ClassAssignment) => {
    const existing = getSubmission(assignment.id);
    setSelectedAssignment(assignment);
    setAnswerText(existing?.content || '');
    setFile(null);
    setSelectedCapstone(null);
    setSubmitTab('manual');
    setSubmitDialogOpen(true);
    loadCapstones();
  };

  const isOverdue = (dueDate: string | null) =>
    dueDate ? new Date(dueDate) < new Date() : false;

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">Loading assignments...</div>
    );
  }

  const pending = assignments.filter(a => {
    const sub = getSubmission(a.id);
    return !sub || (!sub.grade && sub.grade !== 0);
  });
  const graded = assignments.filter(a => {
    const sub = getSubmission(a.id);
    return sub && (sub.grade !== null && sub.grade !== undefined);
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pending.length}</div>
            <p className="text-sm text-muted-foreground">assignments to complete</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{submissions.filter(s => s.grade === null).length}</div>
            <p className="text-sm text-muted-foreground">awaiting grading</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
          </CardHeader>
          <CardContent>
            {graded.length > 0 ? (
              <>
                <div className="text-3xl font-bold">
                  {Math.round(
                    graded.reduce((sum, a) => {
                      const sub = getSubmission(a.id)!;
                      return sum + ((sub.grade! / sub.max_grade) * 100);
                    }, 0) / graded.length
                  )}%
                </div>
                <p className="text-sm text-muted-foreground">across {graded.length} graded</p>
              </>
            ) : (
              <p className="text-muted-foreground">No grades yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Assignments */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Pending Assignments</h3>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
              <p className="text-muted-foreground">All caught up! No pending assignments.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pending.map(a => {
              const sub = getSubmission(a.id);
              const overdue = isOverdue(a.due_date);
              return (
                <Card key={a.id} className={overdue && !sub ? 'border-destructive/50' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{a.title}</CardTitle>
                        <CardDescription>
                          {a.subject && <Badge variant="secondary" className="mr-2">{a.subject}</Badge>}
                          {a.due_date && (
                            <span className={overdue ? 'text-destructive' : ''}>
                              {overdue ? <AlertTriangle className="inline h-3 w-3 mr-1" /> : <Clock className="inline h-3 w-3 mr-1" />}
                              {overdue ? 'Overdue' : 'Due'} {formatDistanceToNow(new Date(a.due_date), { addSuffix: true })}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <Button size="sm" onClick={() => openSubmitDialog(a)}>
                        {sub ? 'Resubmit' : 'Submit'}
                        <Send className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  {a.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">{a.description}</p>
                    </CardContent>
                  )}
                  {sub && (
                    <CardFooter className="pt-0">
                      <Badge variant="outline">
                        <Clock className="mr-1 h-3 w-3" />
                        Submitted {formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true })}
                      </Badge>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Graded Assignments */}
      {graded.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Graded Assignments</h3>
          <div className="space-y-3">
            {graded.map(a => {
              const sub = getSubmission(a.id)!;
              const pct = Math.round((sub.grade! / sub.max_grade) * 100);
              return (
                <Card key={a.id} className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setViewSubmission(sub)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{a.title}</CardTitle>
                        <CardDescription>
                          {a.subject && <Badge variant="secondary" className="mr-2">{a.subject}</Badge>}
                          Graded {sub.graded_at && formatDistanceToNow(new Date(sub.graded_at), { addSuffix: true })}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${
                          pct >= 90 ? 'text-green-600' : pct >= 70 ? 'text-yellow-600' : 'text-destructive'
                        }`}>
                          {sub.grade}/{sub.max_grade}
                        </div>
                        <p className="text-xs text-muted-foreground">{pct}%</p>
                      </div>
                    </div>
                  </CardHeader>
                  {sub.feedback && (
                    <CardContent className="pt-0">
                      <div className="flex items-start gap-2 bg-muted rounded-lg p-3">
                        <MessageSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{sub.feedback}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit: {selectedAssignment?.title}</DialogTitle>
            <DialogDescription>{selectedAssignment?.description || 'Write your answer, upload a file, or submit an existing capstone.'}</DialogDescription>
          </DialogHeader>

          <Tabs value={submitTab} onValueChange={setSubmitTab}>
            <TabsList className="w-full">
              <TabsTrigger value="manual" className="flex-1">Write / Upload</TabsTrigger>
              <TabsTrigger value="capstone" className="flex-1">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Use Capstone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div>
                <Label>Your Answer</Label>
                <Textarea
                  placeholder="Type your answer here..."
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  rows={6}
                />
              </div>
              <div>
                <Label>Attach File (optional)</Label>
                <Input
                  type="file"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                {file && <p className="text-xs text-muted-foreground mt-1">{file.name}</p>}
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? 'Submitting...' : 'Submit Assignment'}
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </TabsContent>

            <TabsContent value="capstone" className="space-y-4 mt-4">
              {capstonesLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Loading capstones...</p>
              ) : capstones.length === 0 ? (
                <div className="text-center py-6">
                  <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No capstone submissions found.</p>
                  <p className="text-xs text-muted-foreground mt-1">Complete a learning path capstone first.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Select a capstone project to submit:</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {capstones.map(cap => (
                      <div
                        key={cap.id}
                        onClick={() => setSelectedCapstone(cap)}
                        className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                          selectedCapstone?.id === cap.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">{cap.path_title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(cap.created_at).toLocaleDateString()} · {cap.status}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {cap.ai_score !== null && (
                              <Badge variant="outline" className="text-xs">AI: {cap.ai_score}/100</Badge>
                            )}
                            {cap.file_name && <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                            {cap.external_link && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        </div>
                        {cap.text_content && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cap.text_content}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !selectedCapstone}
                    className="w-full"
                  >
                    {submitting ? 'Submitting...' : 'Submit Capstone'}
                    <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* View Graded Submission Dialog */}
      <Dialog open={!!viewSubmission} onOpenChange={open => !open && setViewSubmission(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          {viewSubmission && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Your Answer</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{viewSubmission.content || 'No text submitted'}</p>
              </div>
              {viewSubmission.file_name && (
                <div>
                  <Label className="text-muted-foreground">Attached File</Label>
                  <p className="text-sm mt-1">{viewSubmission.file_name}</p>
                </div>
              )}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-muted-foreground">Grade</Label>
                  <span className="text-lg font-bold">{viewSubmission.grade}/{viewSubmission.max_grade}</span>
                </div>
                {viewSubmission.feedback && (
                  <div>
                    <Label className="text-muted-foreground">Teacher Feedback</Label>
                    <p className="text-sm mt-1">{viewSubmission.feedback}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentAssignmentView;
