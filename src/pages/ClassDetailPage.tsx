import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft, Copy, Users, Brain, MessageSquare, Book, Send, UserCircle, Shield
} from 'lucide-react';

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
        const { data: members, error: memErr } = await supabase
          .from('class_members')
          .select('student_id, joined_at')
          .eq('class_id', id);
        if (memErr) throw memErr;

        // Fetch profiles for each student
        const enriched = await Promise.all(
          (members || []).map(async (m) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, grade_level')
              .eq('user_id', m.student_id)
              .maybeSingle();
            return { ...m, profile: profile || { full_name: 'Unknown', grade_level: null } };
          })
        );
        setStudents(enriched);

        // Fetch teacher's learning paths for assignment
        const { data: paths } = await supabase
          .from('learning_paths')
          .select('id, title, subject')
          .eq('created_by', user.id);
        setLearningPaths(paths || []);
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
      // Create progress entry for student on this path
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Student list */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Students ({students.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {students.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No students yet. Share the join code with your students.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {students.map(s => (
                        <button
                          key={s.student_id}
                          onClick={() => setSelectedStudent(s)}
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

              {/* Student detail panel */}
              <div className="lg:col-span-2">
                {selectedStudent ? (
                  <Tabs defaultValue="profile">
                    <TabsList className="mb-4">
                      <TabsTrigger value="profile">
                        <UserCircle className="mr-2 h-4 w-4" /> Profile
                      </TabsTrigger>
                      <TabsTrigger value="adaptive">
                        <Shield className="mr-2 h-4 w-4" /> Adaptive Profile
                      </TabsTrigger>
                      <TabsTrigger value="paths">
                        <Book className="mr-2 h-4 w-4" /> Learning Paths
                      </TabsTrigger>
                      <TabsTrigger value="message">
                        <MessageSquare className="mr-2 h-4 w-4" /> Message
                      </TabsTrigger>
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
                            Select the Adaptive Profile tab to view AI-powered learning insights for this student.
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
                              <CardDescription>
                                AI analysis of {selectedStudent.profile?.full_name}'s learning patterns
                              </CardDescription>
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
                              {/* Learning Style */}
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

                              {/* Conceptual Gaps */}
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
                                        {gap.remediation && (
                                          <p className="text-sm text-primary mt-1">→ {gap.remediation}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Preventive Insights */}
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

                              {/* Optimized Plan */}
                              {adaptiveProfile.optimized_plan?.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2">Optimized Plan</h4>
                                  <ol className="space-y-2">
                                    {adaptiveProfile.optimized_plan.map((step: any, i: number) => (
                                      <li key={i} className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                          {i + 1}
                                        </span>
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
                              <CardTitle>Learning Paths</CardTitle>
                              <CardDescription>Assign learning paths to this student</CardDescription>
                            </div>
                            <Dialog open={assignPathOpen} onOpenChange={setAssignPathOpen}>
                              <DialogTrigger asChild>
                                <Button size="sm"><Book className="mr-2 h-4 w-4" /> Assign Path</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Assign Learning Path</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                  <div>
                                    <Label>Select a Learning Path</Label>
                                    <Select value={selectedPathId} onValueChange={setSelectedPathId}>
                                      <SelectTrigger><SelectValue placeholder="Choose a path..." /></SelectTrigger>
                                      <SelectContent>
                                        {learningPaths.map(p => (
                                          <SelectItem key={p.id} value={p.id}>{p.title} ({p.subject})</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button onClick={assignLearningPath} disabled={!selectedPathId} className="w-full">
                                    Assign Path
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Use the "Assign Path" button to assign one of your learning paths to {selectedStudent.profile?.full_name}.
                            The path will appear in their Learning Paths section.
                          </p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="message">
                      <Card>
                        <CardHeader>
                          <CardTitle>Send Message</CardTitle>
                          <CardDescription>
                            Send a direct message to {selectedStudent.profile?.full_name}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <Textarea
                              placeholder="Type your message..."
                              value={messageContent}
                              onChange={e => setMessageContent(e.target.value)}
                              rows={4}
                            />
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
          ) : (
            /* Student view of class */
            <Card>
              <CardHeader>
                <CardTitle>Class Information</CardTitle>
                <CardDescription>You are enrolled in this class</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Subject:</strong> {classInfo.subject}</p>
                  {classInfo.description && <p><strong>Description:</strong> {classInfo.description}</p>}
                  <p className="text-sm text-muted-foreground">
                    Check your Learning Paths and Messages for any assignments from your teacher.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassDetailPage;
