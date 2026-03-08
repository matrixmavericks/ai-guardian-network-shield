import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft, Copy, Users, Brain, MessageSquare, Book, Send, UserCircle, Shield,
  Plus, FileText, Calendar, Sparkles, RefreshCw, Trash2, CheckCircle2, ClipboardList,
  BarChart3, Upload, Clock, AlertTriangle
} from 'lucide-react';
import TeacherGradingView from '@/components/TeacherGradingView';
import { Progress } from '@/components/ui/progress';

interface Student {
  student_id: string;
  joined_at: string;
  profile?: { full_name: string; grade_level: string | null };
}

interface ClassInfo {
  id: string;
  name: string;
  subject: string;
  description: string;
  join_code: string;
  teacher_id: string;
}

interface ClassAssignment {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  subject: string;
  created_at: string;
}

const ClassDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [adaptiveProfile, setAdaptiveProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [assignPathOpen, setAssignPathOpen] = useState(false);
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [selectedPathId, setSelectedPathId] = useState('');
  // Class-level tab
  const [classTab, setClassTab] = useState('students');
  // Assignments
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', due_date: '', subject: '' });
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  // Learning path generation
  const [genPathTopic, setGenPathTopic] = useState('');
  const [genPathDifficulty, setGenPathDifficulty] = useState('beginner');
  const [genPathGrade, setGenPathGrade] = useState('High School');
  const [generatingPath, setGeneratingPath] = useState(false);
  // Grading
  const [gradingAssignment, setGradingAssignment] = useState<ClassAssignment | null>(null);
  // Analytics
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  // Student submission
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedSubmitAssignment, setSelectedSubmitAssignment] = useState<ClassAssignment | null>(null);
  const [submitText, setSubmitText] = useState('');
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([]);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    fetchClassData();
  }, [id, user]);

  const fetchClassData = async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const { data: cls, error: clsErr } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (clsErr) throw clsErr;
      if (!cls) { navigate('/classes'); return; }
      setClassInfo(cls);

      if (isTeacher) {
        // Fetch members, paths, and assignments in parallel
        const [membersRes, pathsRes, assignmentsRes] = await Promise.all([
          supabase.from('class_members').select('student_id, joined_at').eq('class_id', id),
          supabase.from('learning_paths').select('id, title, subject').eq('created_by', user.id),
          supabase.from('class_assignments').select('*').eq('class_id', id).order('created_at', { ascending: false }),
        ]);

        if (membersRes.error) throw membersRes.error;
        setLearningPaths(pathsRes.data || []);
        setAssignments((assignmentsRes.data as ClassAssignment[]) || []);

        const enriched = await Promise.all(
          (membersRes.data || []).map(async (m) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, grade_level')
              .eq('user_id', m.student_id)
              .maybeSingle();
            return { ...m, profile: profile || { full_name: 'Unknown', grade_level: null } };
          })
        );
        setStudents(enriched);
      } else {
        // Student: fetch assignments and own submissions for this class
        const [assignmentsRes, submissionsRes] = await Promise.all([
          supabase.from('class_assignments').select('*').eq('class_id', id).order('created_at', { ascending: false }),
          supabase.from('assignment_submissions').select('*').eq('student_id', user.id),
        ]);
        setAssignments((assignmentsRes.data as ClassAssignment[]) || []);
        setStudentSubmissions(submissionsRes.data || []);
      }

      // For teachers: fetch analytics (all submissions for this class's assignments)
      if (isTeacher) {
        const { data: classAssignments } = await supabase
          .from('class_assignments')
          .select('id, title, subject')
          .eq('class_id', id);
        
        if (classAssignments?.length) {
          const assignmentIds = classAssignments.map(a => a.id);
          const { data: allSubs } = await supabase
            .from('assignment_submissions')
            .select('*')
            .in('assignment_id', assignmentIds);
          
          const analytics = classAssignments.map(a => {
            const subs = (allSubs || []).filter((s: any) => s.assignment_id === a.id);
            const graded = subs.filter((s: any) => s.grade !== null);
            const avgGrade = graded.length > 0
              ? Math.round(graded.reduce((sum: number, s: any) => sum + (s.grade / s.max_grade) * 100, 0) / graded.length)
              : null;
            return {
              id: a.id,
              title: a.title,
              subject: a.subject,
              totalSubmissions: subs.length,
              gradedCount: graded.length,
              avgGrade,
              highestGrade: graded.length > 0 ? Math.max(...graded.map((s: any) => Math.round((s.grade / s.max_grade) * 100))) : null,
              lowestGrade: graded.length > 0 ? Math.min(...graded.map((s: any) => Math.round((s.grade / s.max_grade) * 100))) : null,
            };
          });
          setAnalyticsData(analytics);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load class data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdaptiveProfile = async (studentId: string) => {
    setProfileLoading(true);
    setAdaptiveProfile(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await supabase.functions.invoke('analyze-learning-profile', {
        body: { userId: studentId },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.error) throw res.error;
      setAdaptiveProfile(res.data?.profile || res.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load adaptive profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageContent.trim() || !selectedStudent) return;
    setSendingMessage(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: user!.id,
        receiver_id: selectedStudent.student_id,
        content: messageContent.trim(),
      });
      if (error) throw error;
      toast.success('Message sent!');
      setMessageContent('');
    } catch (err: any) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const assignLearningPath = async () => {
    if (!selectedPathId || !selectedStudent) return;
    try {
      const { error } = await supabase.from('learning_path_progress').insert({
        user_id: selectedStudent.student_id,
        path_id: selectedPathId,
        progress: 0,
      });
      if (error) {
        if (error.code === '23505') {
          toast.info('Student already has this learning path assigned');
        } else throw error;
      } else {
        toast.success('Learning path assigned!');
        setAssignPathOpen(false);
        setSelectedPathId('');
      }
    } catch (err: any) {
      toast.error('Failed to assign learning path');
    }
  };

  const assignPathToAllStudents = async (pathId: string) => {
    if (!students.length) {
      toast.info('No students in this class yet');
      return;
    }
    let assigned = 0;
    for (const s of students) {
      const { error } = await supabase.from('learning_path_progress').insert({
        user_id: s.student_id,
        path_id: pathId,
        progress: 0,
      });
      if (!error) assigned++;
    }
    toast.success(`Learning path assigned to ${assigned} student(s)`);
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.title.trim() || !classInfo) {
      toast.error('Please enter an assignment title');
      return;
    }
    setCreatingAssignment(true);
    try {
      const { error } = await supabase.from('class_assignments').insert({
        class_id: classInfo.id,
        teacher_id: user!.id,
        title: newAssignment.title.trim(),
        description: newAssignment.description.trim(),
        due_date: newAssignment.due_date || null,
        subject: newAssignment.subject || classInfo.subject,
      });
      if (error) throw error;
      toast.success('Assignment created!');
      setCreateAssignmentOpen(false);
      setNewAssignment({ title: '', description: '', due_date: '', subject: '' });
      fetchClassData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to create assignment');
    } finally {
      setCreatingAssignment(false);
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm('Delete this assignment?')) return;
    try {
      const { error } = await supabase.from('class_assignments').delete().eq('id', assignmentId);
      if (error) throw error;
      toast.success('Assignment deleted');
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch {
      toast.error('Failed to delete assignment');
    }
  };

  const generateAndAssignPath = async () => {
    if (!genPathTopic.trim() || !classInfo) {
      toast.error('Please enter a topic');
      return;
    }
    setGeneratingPath(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await supabase.functions.invoke('generate-learning-path', {
        body: {
          title: genPathTopic,
          subject: classInfo.subject,
          difficulty: genPathDifficulty,
          gradeLevel: genPathGrade,
          estimatedHours: 10,
          description: `AI-generated learning path for ${genPathTopic}`,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.error) throw res.error;
      const pathData = res.data;
      if (!pathData?.success) throw new Error(pathData?.error || 'AI generation failed');

      const pathTitle = `${genPathTopic} - ${classInfo.name}`;
      // Save to learning_paths
      const { data: savedPath, error: saveErr } = await supabase.from('learning_paths').insert({
        title: pathTitle,
        description: `AI-generated path for ${genPathTopic}`,
        subject: classInfo.subject,
        difficulty: genPathDifficulty,
        estimated_hours: 10,
        modules: pathData.modules || [],
        tags: pathData.suggestedTags || [genPathTopic],
        created_by: user!.id,
        is_public: false,
      }).select('id').single();

      if (saveErr) throw saveErr;

      // Refresh paths list
      const { data: updatedPaths } = await supabase
        .from('learning_paths')
        .select('id, title, subject')
        .eq('created_by', user!.id);
      setLearningPaths(updatedPaths || []);

      toast.success(`Learning path "${pathTitle}" created! You can now assign it to students.`);
      setGenPathTopic('');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate learning path');
    } finally {
      setGeneratingPath(false);
    }
  };

  const handleStudentSubmit = async () => {
    if (!selectedSubmitAssignment || !user) return;
    if (!submitText.trim() && !submitFile) {
      toast.error('Please provide an answer or upload a file');
      return;
    }
    setSubmitting(true);
    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (submitFile) {
        const filePath = `${user.id}/${selectedSubmitAssignment.id}/${submitFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('submission-files')
          .upload(filePath, submitFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('submission-files')
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
        fileName = submitFile.name;
      }

      const existing = studentSubmissions.find((s: any) => s.assignment_id === selectedSubmitAssignment.id);
      if (existing) {
        const { error } = await supabase
          .from('assignment_submissions')
          .update({
            content: submitText.trim(),
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
            assignment_id: selectedSubmitAssignment.id,
            student_id: user.id,
            content: submitText.trim(),
            file_url: fileUrl,
            file_name: fileName,
            status: 'submitted',
          });
        if (error) throw error;
      }

      toast.success('Assignment submitted!');
      setSubmitDialogOpen(false);
      setSubmitText('');
      setSubmitFile(null);
      setSelectedSubmitAssignment(null);
      fetchClassData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const openStudentSubmitDialog = (assignment: ClassAssignment) => {
    const existing = studentSubmissions.find((s: any) => s.assignment_id === assignment.id);
    setSelectedSubmitAssignment(assignment);
    setSubmitText(existing?.content || '');
    setSubmitFile(null);
    setSubmitDialogOpen(true);
  };

  const getStudentSubmission = (assignmentId: string) =>
    studentSubmissions.find((s: any) => s.assignment_id === assignmentId);

  const copyCode = () => {
    if (classInfo) {
      navigator.clipboard.writeText(classInfo.join_code);
      toast.success('Join code copied!');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!classInfo) return null;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="container py-8 max-w-6xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/classes')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{classInfo.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{classInfo.subject}</Badge>
                {isTeacher && <Badge variant="outline">{students.length} students</Badge>}
                {classInfo.description && (
                  <span className="text-sm text-muted-foreground">{classInfo.description}</span>
                )}
              </div>
            </div>
            {isTeacher && (
              <Button variant="outline" onClick={copyCode}>
                <Copy className="h-4 w-4 mr-2" />
                Code: {classInfo.join_code}
              </Button>
            )}
          </div>

          {isTeacher ? (
            <Tabs value={classTab} onValueChange={setClassTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="students">
                  <Users className="mr-2 h-4 w-4" /> Students
                </TabsTrigger>
                <TabsTrigger value="assignments">
                  <FileText className="mr-2 h-4 w-4" /> Assignments
                </TabsTrigger>
                <TabsTrigger value="learning-paths">
                  <Book className="mr-2 h-4 w-4" /> Learning Paths
                </TabsTrigger>
              </TabsList>

              {/* ===== STUDENTS TAB ===== */}
              <TabsContent value="students">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5" />
                        Students ({students.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {students.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No students yet. Share the join code.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {students.map(s => (
                            <button
                              key={s.student_id}
                              onClick={() => { setSelectedStudent(s); setAdaptiveProfile(null); }}
                              className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                                selectedStudent?.student_id === s.student_id
                                  ? 'bg-primary/10 border border-primary/20'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                                {s.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{s.profile?.full_name || 'Unknown'}</div>
                                {s.profile?.grade_level && (
                                  <div className="text-xs text-muted-foreground">{s.profile.grade_level}</div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="lg:col-span-2">
                    {selectedStudent ? (
                      <Tabs defaultValue="profile">
                        <TabsList className="mb-4">
                          <TabsTrigger value="profile"><UserCircle className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
                          <TabsTrigger value="adaptive"><Shield className="mr-2 h-4 w-4" /> Adaptive Profile</TabsTrigger>
                          <TabsTrigger value="paths"><Book className="mr-2 h-4 w-4" /> Assign Path</TabsTrigger>
                          <TabsTrigger value="message"><MessageSquare className="mr-2 h-4 w-4" /> Message</TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile">
                          <Card>
                            <CardHeader>
                              <CardTitle>{selectedStudent.profile?.full_name}</CardTitle>
                              <CardDescription>
                                Joined {new Date(selectedStudent.joined_at).toLocaleDateString()}
                                {selectedStudent.profile?.grade_level && ` • ${selectedStudent.profile.grade_level}`}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p className="text-muted-foreground">
                                Use the tabs above to view this student's adaptive profile, assign learning paths, or send messages.
                              </p>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="adaptive">
                          <Card>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle>Adaptive Learning Profile</CardTitle>
                                  <CardDescription>AI analysis of {selectedStudent.profile?.full_name}'s patterns</CardDescription>
                                </div>
                                <Button onClick={() => fetchAdaptiveProfile(selectedStudent.student_id)} disabled={profileLoading}>
                                  <Brain className="mr-2 h-4 w-4" />
                                  {profileLoading ? 'Analyzing...' : adaptiveProfile ? 'Re-Analyze' : 'Analyze'}
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {profileLoading ? (
                                <div className="text-center py-12 text-muted-foreground">
                                  <Brain className="h-10 w-10 mx-auto mb-3 animate-pulse" />
                                  <p>Analyzing learning patterns...</p>
                                </div>
                              ) : adaptiveProfile ? (
                                <div className="space-y-6">
                                  {adaptiveProfile.learning_style && (
                                    <div>
                                      <h4 className="font-semibold mb-2">Learning Style</h4>
                                      <Badge className="text-sm">{adaptiveProfile.learning_style.type}</Badge>
                                      <p className="text-sm text-muted-foreground mt-2">{adaptiveProfile.learning_style.description}</p>
                                      {adaptiveProfile.learning_style.tips?.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                          {adaptiveProfile.learning_style.tips.map((tip: string, i: number) => (
                                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                              <span className="text-primary">•</span> {tip}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  )}
                                  {adaptiveProfile.conceptual_gaps?.length > 0 && (
                                    <div>
                                      <h4 className="font-semibold mb-2">Conceptual Gaps</h4>
                                      <div className="space-y-3">
                                        {adaptiveProfile.conceptual_gaps.map((gap: any, i: number) => (
                                          <div key={i} className="border rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="font-medium text-sm">{gap.topic}</span>
                                              <Badge variant={gap.severity === 'critical' ? 'destructive' : gap.severity === 'moderate' ? 'default' : 'secondary'}>
                                                {gap.severity}
                                              </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{gap.description}</p>
                                            {gap.remediation && <p className="text-sm text-primary mt-1">→ {gap.remediation}</p>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {adaptiveProfile.preventive_insights?.length > 0 && (
                                    <div>
                                      <h4 className="font-semibold mb-2">Preventive Insights</h4>
                                      <div className="space-y-2">
                                        {adaptiveProfile.preventive_insights.map((insight: any, i: number) => (
                                          <div key={i} className="bg-muted rounded-lg p-3">
                                            <p className="text-sm font-medium">{insight.prediction}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{insight.suggestion}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {adaptiveProfile.optimized_plan?.length > 0 && (
                                    <div>
                                      <h4 className="font-semibold mb-2">Optimized Plan</h4>
                                      <ol className="space-y-2">
                                        {adaptiveProfile.optimized_plan.map((step: any, i: number) => (
                                          <li key={i} className="flex items-start gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                            <div>
                                              <p className="text-sm font-medium">{step.activity}</p>
                                              <p className="text-xs text-muted-foreground">{step.reason}</p>
                                            </div>
                                          </li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                  <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                  <p>Click "Analyze" to generate this student's adaptive learning profile.</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="paths">
                          <Card>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle>Assign Learning Path</CardTitle>
                                  <CardDescription>Assign an existing path to {selectedStudent.profile?.full_name}</CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {learningPaths.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  You don't have any learning paths yet. Go to the "Learning Paths" tab to generate one first.
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {learningPaths.map(p => (
                                    <div key={p.id} className="flex items-center justify-between border rounded-lg p-3">
                                      <div>
                                        <p className="font-medium text-sm">{p.title}</p>
                                        <p className="text-xs text-muted-foreground">{p.subject}</p>
                                      </div>
                                      <Button size="sm" onClick={() => {
                                        setSelectedPathId(p.id);
                                        assignLearningPath();
                                      }}>
                                        Assign
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="message">
                          <Card>
                            <CardHeader>
                              <CardTitle>Send Message</CardTitle>
                              <CardDescription>Send a direct message to {selectedStudent.profile?.full_name}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <Textarea placeholder="Type your message..." value={messageContent} onChange={e => setMessageContent(e.target.value)} rows={4} />
                                <Button onClick={sendMessage} disabled={sendingMessage || !messageContent.trim()}>
                                  <Send className="mr-2 h-4 w-4" />
                                  {sendingMessage ? 'Sending...' : 'Send Message'}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16">
                          <UserCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
                          <p className="text-muted-foreground">Select a student to view their profile and tools</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* ===== ASSIGNMENTS TAB ===== */}
              <TabsContent value="assignments">
                {gradingAssignment ? (
                  <TeacherGradingView
                    assignmentId={gradingAssignment.id}
                    assignmentTitle={gradingAssignment.title}
                    onClose={() => setGradingAssignment(null)}
                  />
                ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Class Assignments</h2>
                    <Dialog open={createAssignmentOpen} onOpenChange={setCreateAssignmentOpen}>
                      <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Create Assignment</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Assignment</DialogTitle>
                          <DialogDescription>Create an assignment for all students in this class.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label>Title</Label>
                            <Input placeholder="e.g. Chapter 5 Worksheet" value={newAssignment.title}
                              onChange={e => setNewAssignment(p => ({ ...p, title: e.target.value }))} />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea placeholder="Assignment instructions..." value={newAssignment.description}
                              onChange={e => setNewAssignment(p => ({ ...p, description: e.target.value }))} rows={3} />
                          </div>
                          <div>
                            <Label>Due Date (optional)</Label>
                            <Input type="datetime-local" value={newAssignment.due_date}
                              onChange={e => setNewAssignment(p => ({ ...p, due_date: e.target.value }))} />
                          </div>
                          <div>
                            <Label>Subject</Label>
                            <Input placeholder={classInfo?.subject || 'Subject'} value={newAssignment.subject}
                              onChange={e => setNewAssignment(p => ({ ...p, subject: e.target.value }))} />
                          </div>
                          <Button onClick={handleCreateAssignment} disabled={creatingAssignment} className="w-full">
                            {creatingAssignment ? 'Creating...' : 'Create Assignment'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {assignments.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
                        <p className="text-muted-foreground">No assignments yet. Create your first one!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {assignments.map(a => (
                        <Card key={a.id}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-base">{a.title}</CardTitle>
                                <CardDescription>
                                  {a.subject} • Created {new Date(a.created_at).toLocaleDateString()}
                                  {a.due_date && ` • Due ${new Date(a.due_date).toLocaleDateString()}`}
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setGradingAssignment(a)}>
                                  <ClipboardList className="mr-2 h-4 w-4" /> Submissions
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteAssignment(a.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          {a.description && (
                            <CardContent className="pt-0">
                              <p className="text-sm text-muted-foreground">{a.description}</p>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                )}
              </TabsContent>

              {/* ===== LEARNING PATHS TAB ===== */}
              <TabsContent value="learning-paths">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Generate new path */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Generate Learning Path with AI
                      </CardTitle>
                      <CardDescription>
                        Create a complete learning path for your class using AI
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Topic</Label>
                        <Input placeholder="e.g. Quadratic Equations, Cell Biology, Shakespeare"
                          value={genPathTopic} onChange={e => setGenPathTopic(e.target.value)} />
                      </div>
                      <div>
                        <Label>Difficulty</Label>
                        <Select value={genPathDifficulty} onValueChange={setGenPathDifficulty}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Grade Level</Label>
                        <Select value={genPathGrade} onValueChange={setGenPathGrade}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Elementary">Elementary</SelectItem>
                            <SelectItem value="Middle School">Middle School</SelectItem>
                            <SelectItem value="High School">High School</SelectItem>
                            <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                            <SelectItem value="Professional">Professional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button onClick={generateAndAssignPath} disabled={generatingPath || !genPathTopic.trim()} className="w-full">
                        {generatingPath ? (
                          <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="mr-2 h-4 w-4" /> Generate Path</>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Existing paths */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Learning Paths</CardTitle>
                      <CardDescription>Assign existing paths to the entire class</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {learningPaths.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Book className="h-10 w-10 mx-auto mb-3 opacity-30" />
                          <p>No learning paths yet. Generate one using the form.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {learningPaths.map(p => (
                            <div key={p.id} className="flex items-center justify-between border rounded-lg p-3">
                              <div>
                                <p className="font-medium text-sm">{p.title}</p>
                                <p className="text-xs text-muted-foreground">{p.subject}</p>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => assignPathToAllStudents(p.id)}>
                                <Users className="mr-1 h-3 w-3" /> Assign to All
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* ===== STUDENT VIEW ===== */
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Class Information</CardTitle>
                  <CardDescription>You are enrolled in this class</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Subject:</strong> {classInfo.subject}</p>
                    {classInfo.description && <p><strong>Description:</strong> {classInfo.description}</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Student sees assignments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assignments yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {assignments.map(a => (
                        <div key={a.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{a.title}</h4>
                              {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                            </div>
                            {a.due_date && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(a.due_date).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassDetailPage;
