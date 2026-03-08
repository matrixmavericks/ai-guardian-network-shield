import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { FileText, CheckCircle2, Clock, Star, Download, User } from 'lucide-react';

interface SubmissionWithProfile {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  file_url: string | null;
  file_name: string | null;
  grade: number | null;
  max_grade: number;
  feedback: string | null;
  status: string;
  submitted_at: string;
  graded_at: string | null;
  student_name?: string;
}

interface Props {
  assignmentId: string;
  assignmentTitle: string;
  onClose: () => void;
}

const TeacherGradingView: React.FC<Props> = ({ assignmentId, assignmentTitle, onClose }) => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<SubmissionWithProfile | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Enrich with student names
      const enriched = await Promise.all(
        (data || []).map(async (sub: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', sub.student_id)
            .maybeSingle();
          return {
            ...sub,
            student_name: profile?.full_name || 'Unknown Student',
          } as SubmissionWithProfile;
        })
      );

      setSubmissions(enriched);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const openGrading = (sub: SubmissionWithProfile) => {
    setSelectedSub(sub);
    setGradeValue(sub.grade?.toString() || '');
    setFeedbackValue(sub.feedback || '');
  };

  const handleGrade = async () => {
    if (!selectedSub || !user) return;
    const grade = parseInt(gradeValue);
    if (isNaN(grade) || grade < 0 || grade > selectedSub.max_grade) {
      toast.error(`Grade must be between 0 and ${selectedSub.max_grade}`);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          grade,
          feedback: feedbackValue.trim() || null,
          graded_at: new Date().toISOString(),
          graded_by: user.id,
          status: 'graded',
        })
        .eq('id', selectedSub.id);

      if (error) throw error;
      toast.success(`Graded ${selectedSub.student_name}'s submission`);
      setSelectedSub(null);
      fetchSubmissions();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  const ungraded = submissions.filter(s => s.grade === null);
  const graded = submissions.filter(s => s.grade !== null);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading submissions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{assignmentTitle}</h3>
          <p className="text-sm text-muted-foreground">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} • 
            {ungraded.length} ungraded
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>Back</Button>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No submissions yet</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="ungraded">
          <TabsList>
            <TabsTrigger value="ungraded">
              <Clock className="mr-2 h-4 w-4" /> Ungraded ({ungraded.length})
            </TabsTrigger>
            <TabsTrigger value="graded">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Graded ({graded.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ungraded">
            <div className="space-y-3">
              {ungraded.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    All submissions graded!
                  </CardContent>
                </Card>
              ) : (
                ungraded.map(sub => (
                  <Card key={sub.id} className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => openGrading(sub)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                            {sub.student_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-sm">{sub.student_name}</CardTitle>
                            <CardDescription>
                              Submitted {formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true })}
                            </CardDescription>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">Grade</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {sub.content || 'File submission only'}
                      </p>
                      {sub.file_name && (
                        <Badge variant="outline" className="mt-2">
                          <FileText className="mr-1 h-3 w-3" /> {sub.file_name}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="graded">
            <div className="space-y-3">
              {graded.map(sub => {
                const pct = Math.round((sub.grade! / sub.max_grade) * 100);
                return (
                  <Card key={sub.id} className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => openGrading(sub)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                            {sub.student_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-sm">{sub.student_name}</CardTitle>
                            <CardDescription>
                              Graded {sub.graded_at && formatDistanceToNow(new Date(sub.graded_at), { addSuffix: true })}
                            </CardDescription>
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${
                          pct >= 90 ? 'text-green-600' : pct >= 70 ? 'text-yellow-600' : 'text-destructive'
                        }`}>
                          {sub.grade}/{sub.max_grade}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Grading Dialog */}
      <Dialog open={!!selectedSub} onOpenChange={open => !open && setSelectedSub(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Grade: {selectedSub?.student_name}</DialogTitle>
            <DialogDescription>{assignmentTitle}</DialogDescription>
          </DialogHeader>
          {selectedSub && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Student's Answer</Label>
                <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedSub.content || 'No text submitted'}
                </div>
              </div>
              {selectedSub.file_name && (
                <div>
                  <Label className="text-muted-foreground">Attached File</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline">
                      <FileText className="mr-1 h-3 w-3" /> {selectedSub.file_name}
                    </Badge>
                    {selectedSub.file_url && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={selectedSub.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Grade (out of {selectedSub.max_grade})</Label>
                    <Input
                      type="number"
                      min={0}
                      max={selectedSub.max_grade}
                      value={gradeValue}
                      onChange={e => setGradeValue(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end">
                    {gradeValue && !isNaN(parseInt(gradeValue)) && (
                      <p className="text-lg font-bold">
                        {Math.round((parseInt(gradeValue) / selectedSub.max_grade) * 100)}%
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <Label>Feedback (optional)</Label>
                  <Textarea
                    placeholder="Great work! Here's what you can improve..."
                    value={feedbackValue}
                    onChange={e => setFeedbackValue(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={handleGrade} disabled={saving || !gradeValue} className="w-full mt-4">
                  {saving ? 'Saving...' : selectedSub.grade !== null ? 'Update Grade' : 'Save Grade'}
                  <Star className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherGradingView;
