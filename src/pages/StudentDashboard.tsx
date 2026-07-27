import React, { useState, useEffect, useRef } from 'react';
import PilotFeedbackPrompt from '@/components/PilotFeedbackPrompt';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useSchoolCheck } from '@/hooks/useSchoolCheck';
import {
  Book, Brain, Calendar, Clock, FileText, GraduationCap, TrendingUp,
  CheckCircle2, AlertTriangle, Shield, MessageSquare, Send, Search, Loader, Trophy, Sparkles,
} from 'lucide-react';
import AdaptiveLearningProfile from '@/components/AdaptiveLearningProfile';
import StudentPlanCard from '@/components/StudentPlanCard';
import StudentAssignmentView from '@/components/StudentAssignmentView';
import FeatureGate from '@/components/FeatureGate';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import QuizLibrary from '@/components/livequiz/QuizLibrary';
import LiveQuizPlayer from '@/components/livequiz/LiveQuizPlayer';

// ─── Types ────────────────────────────────────────────────────────────────
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
  grade: number | null;
  max_grade: number;
  feedback: string | null;
  status: string;
  submitted_at: string;
  graded_at: string | null;
}

interface LearningPathProgress {
  id: string;
  path_id: string;
  progress: number;
  completed_modules: string[];
  last_accessed_at: string;
  path?: { title: string; subject: string; modules: any };
}

interface Contact {
  user_id: string;
  full_name: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const isInSchool = useSchoolCheck();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.email?.split('@')[0] || 'Student';
  const [practiceSessionId, setPracticeSessionId] = useState<string | null>(null);

  // ─── Data state ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pathProgress, setPathProgress] = useState<LearningPathProgress[]>([]);
  const [aiSessionCount, setAiSessionCount] = useState(0);
  const [aiMessageCount, setAiMessageCount] = useState(0);

  // ─── Messaging state ────────────────────────────────────────────────
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Load all data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        // Get classes
        const { data: memberships } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('student_id', user.id);
        const classIds = (memberships || []).map(m => m.class_id);

        // Assignments, submissions, learning path progress, AI stats in parallel
        const [assignRes, subRes, pathRes, sessRes, msgCountRes] = await Promise.all([
          classIds.length > 0
            ? supabase.from('class_assignments').select('*').in('class_id', classIds).order('due_date', { ascending: true })
            : Promise.resolve({ data: [] }),
          supabase.from('assignment_submissions').select('*').eq('student_id', user.id),
          supabase.from('learning_path_progress').select('id, path_id, progress, completed_modules, last_accessed_at').eq('user_id', user.id),
          supabase.from('ai_chat_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('ai_chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('role', 'user'),
        ]);

        setAssignments((assignRes.data as ClassAssignment[]) || []);
        setSubmissions((subRes.data as Submission[]) || []);
        setAiSessionCount((sessRes as any).count || 0);
        setAiMessageCount((msgCountRes as any).count || 0);

        // Enrich path progress with path data
        const progressData = (pathRes.data || []) as any[];
        if (progressData.length > 0) {
          const pathIds = progressData.map(p => p.path_id);
          const { data: paths } = await supabase.from('learning_paths').select('id, title, subject, modules').in('id', pathIds);
          const pathMap = new Map((paths || []).map(p => [p.id, p]));
          setPathProgress(progressData.map(p => ({ ...p, path: pathMap.get(p.path_id) || undefined })));
        } else {
          setPathProgress([]);
        }

        // Contacts for messaging — use security definer function for cross-role visibility
        const { data: contactData } = await supabase.rpc('get_user_contacts', { _user_id: user.id });
        setContacts((contactData || []).map((c: any) => ({ user_id: c.user_id, full_name: c.full_name })));

        // Unread counts
        if (contactData?.length) {
          const { data: unreadMessages } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('receiver_id', user.id)
            .eq('read', false);
          const counts: Record<string, number> = {};
          (unreadMessages || []).forEach(m => {
            counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
          });
          setUnreadCounts(counts);
        }
      } catch (err) {
        console.error('StudentDashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // ─── Messaging: load & subscribe ────────────────────────────────────
  useEffect(() => {
    if (!user || !activeContact) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeContact.user_id}),and(sender_id.eq.${activeContact.user_id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      setMessages(data || []);

      // Mark as read
      const unreadIds = (data || [])
        .filter(m => m.sender_id === activeContact.user_id && !m.read)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ read: true }).in('id', unreadIds);
        setUnreadCounts(prev => ({ ...prev, [activeContact.user_id]: 0 }));
      }
    };
    fetchMessages();

    const channel = supabase
      .channel(`msgs-${user.id}-${activeContact.user_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new as Message;
        if (
          (msg.sender_id === user.id && msg.receiver_id === activeContact.user_id) ||
          (msg.sender_id === activeContact.user_id && msg.receiver_id === user.id)
        ) {
          setMessages(prev => [...prev, msg]);
          if (msg.sender_id === activeContact.user_id) {
            supabase.from('messages').update({ read: true }).eq('id', msg.id).then();
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!user || !activeContact || !messageText.trim()) return;
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeContact.user_id,
      content: messageText.trim(),
      read: false,
    });
    if (!error) setMessageText('');
  };

  // ─── Derived data ──────────────────────────────────────────────────
  const getSubmission = (aId: string) => submissions.find(s => s.assignment_id === aId);

  const gradedSubmissions = submissions.filter(s => s.grade !== null);
  const overallAverage = gradedSubmissions.length > 0
    ? gradedSubmissions.reduce((sum, s) => sum + ((s.grade! / s.max_grade) * 100), 0) / gradedSubmissions.length
    : 0;

  const pendingAssignments = assignments.filter(a => {
    const sub = getSubmission(a.id);
    return !sub || sub.grade === null;
  });
  const upcomingAssignments = pendingAssignments
    .filter(a => a.due_date && new Date(a.due_date) > new Date())
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  const overdueAssignments = pendingAssignments
    .filter(a => a.due_date && new Date(a.due_date) <= new Date());

  // Subject stats
  const subjects = [...new Set(assignments.map(a => a.subject).filter(Boolean))] as string[];
  const subjectStats = subjects.map(subj => {
    const subAssignments = assignments.filter(a => a.subject === subj);
    const subGraded = subAssignments.filter(a => {
      const sub = getSubmission(a.id);
      return sub && sub.grade !== null;
    });
    const avg = subGraded.length > 0
      ? subGraded.reduce((sum, a) => {
          const sub = getSubmission(a.id)!;
          return sum + (sub.grade! / sub.max_grade) * 100;
        }, 0) / subGraded.length
      : 0;
    return {
      subject: subj,
      total: subAssignments.length,
      completed: subGraded.length,
      pending: subAssignments.length - subGraded.length,
      average: Math.round(avg),
      progressPct: subAssignments.length > 0 ? Math.round((subGraded.length / subAssignments.length) * 100) : 0,
    };
  });

  // Timeline data
  const timelineData = gradedSubmissions
    .filter(s => s.graded_at)
    .sort((a, b) => new Date(a.graded_at!).getTime() - new Date(b.graded_at!).getTime())
    .map(s => ({
      date: format(new Date(s.graded_at!), 'MM/dd'),
      score: Math.round((s.grade! / s.max_grade) * 100),
    }));

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const getGradeColor = (pct: number) => {
    if (pct >= 90) return 'text-green-600';
    if (pct >= 80) return 'text-blue-600';
    if (pct >= 70) return 'text-yellow-600';
    if (pct >= 60) return 'text-orange-600';
    return 'text-red-600';
  };
  const getGradeLabel = (pct: number) => {
    if (pct >= 90) return 'A';
    if (pct >= 80) return 'B';
    if (pct >= 70) return 'C';
    if (pct >= 60) return 'D';
    return 'F';
  };

  const filteredContacts = contacts.filter(c =>
    c.full_name.toLowerCase().includes(contactSearch.toLowerCase())
  );
  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const totalUnread = Object.values(unreadCounts).reduce((s, c) => s + c, 0);

  // ─── Render ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={isInSchool ? "flex-1 flex items-center justify-center" : "flex h-screen bg-background"}>
        {!isInSchool && <DashboardSidebar />}
        <div className="flex-1 flex items-center justify-center">
          <Loader className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const dashboardContent = (
    <div className="flex-1 overflow-y-auto">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {displayName}!</p>
        </div>

          <Tabs defaultValue={activeTab}>
            <TabsList className="mb-8 flex-wrap">
              <TabsTrigger value="overview"><TrendingUp className="mr-2 h-4 w-4" />Overview</TabsTrigger>
              <TabsTrigger value="myplan"><Sparkles className="mr-2 h-4 w-4" />My Plan</TabsTrigger>
              <TabsTrigger value="assignments"><FileText className="mr-2 h-4 w-4" />Assignments</TabsTrigger>
              <TabsTrigger value="progress"><GraduationCap className="mr-2 h-4 w-4" />Progress</TabsTrigger>
              <TabsTrigger value="learning"><Brain className="mr-2 h-4 w-4" />AI Learning</TabsTrigger>
              <TabsTrigger value="messages" className="relative">
                <MessageSquare className="mr-2 h-4 w-4" />Messages
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {totalUnread}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="adaptive"><Shield className="mr-2 h-4 w-4" />Adaptive Profile</TabsTrigger>
              <TabsTrigger value="quizzes"><Trophy className="mr-2 h-4 w-4" />Quiz Library</TabsTrigger>
            </TabsList>

            {/* ═══════════ MY PLAN ═══════════ */}
            <TabsContent value="myplan">
              <div className="max-w-2xl mx-auto">
                <StudentPlanCard />
              </div>
            </TabsContent>

            {/* ═══════════ OVERVIEW ═══════════ */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Overall Grade</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className={`text-3xl font-bold ${getGradeColor(overallAverage)}`}>
                        {gradedSubmissions.length > 0 ? `${Math.round(overallAverage)}%` : '—'}
                      </span>
                      {gradedSubmissions.length > 0 && (
                        <Badge variant="outline" className={`text-lg ${getGradeColor(overallAverage)}`}>
                          {getGradeLabel(overallAverage)}
                        </Badge>
                      )}
                    </div>
                    {gradedSubmissions.length > 0 && <Progress value={overallAverage} className="mt-2" />}
                    <p className="text-xs text-muted-foreground mt-1">{gradedSubmissions.length} graded assignment{gradedSubmissions.length !== 1 ? 's' : ''}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Upcoming Due</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{upcomingAssignments.length}</div>
                    {overdueAssignments.length > 0 && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" />{overdueAssignments.length} overdue
                      </p>
                    )}
                    {upcomingAssignments.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Next: {formatDistanceToNow(new Date(upcomingAssignments[0].due_date!), { addSuffix: true })}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Learning Paths</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{pathProgress.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pathProgress.filter(p => p.progress >= 100).length} completed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">AI Sessions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{aiSessionCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">{aiMessageCount} questions asked</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Performance Over Time</CardTitle>
                    <CardDescription>Your grade trend based on graded assignments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {timelineData.length > 0 ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} name="Grade %" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mb-2 opacity-30" />
                        <p>No graded assignments yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Subject Distribution</CardTitle>
                    <CardDescription>Assignments by subject</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {subjectStats.length > 0 ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={subjectStats.map((s, i) => ({ name: s.subject, value: s.total, fill: COLORS[i % COLORS.length] }))}
                              cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                              {subjectStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
                        <Book className="h-12 w-12 mb-2 opacity-30" />
                        <p>No subjects yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Assignments</CardTitle>
                    <CardDescription>Due soon</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {upcomingAssignments.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingAssignments.slice(0, 5).map(a => (
                          <div key={a.id} className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{a.title}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Due {formatDistanceToNow(new Date(a.due_date!), { addSuffix: true })}
                              </p>
                              {a.subject && <Badge variant="secondary" className="text-xs mt-1">{a.subject}</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-10 w-10 mb-2 opacity-30" />
                        <p>All caught up!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Grades</CardTitle>
                    <CardDescription>Latest graded assignments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {gradedSubmissions.length > 0 ? (
                      <div className="space-y-3">
                        {gradedSubmissions
                          .sort((a, b) => new Date(b.graded_at!).getTime() - new Date(a.graded_at!).getTime())
                          .slice(0, 5)
                          .map(sub => {
                            const assignment = assignments.find(a => a.id === sub.assignment_id);
                            const pct = Math.round((sub.grade! / sub.max_grade) * 100);
                            return (
                              <div key={sub.id} className="flex items-start gap-3">
                                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center">
                                    <p className="font-medium text-sm truncate">{assignment?.title || 'Assignment'}</p>
                                    <span className={`font-bold text-sm ${getGradeColor(pct)}`}>{pct}%</span>
                                  </div>
                                  {assignment?.subject && <Badge variant="secondary" className="text-xs mt-1">{assignment.subject}</Badge>}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <FileText className="h-10 w-10 mb-2 opacity-30" />
                        <p>No grades yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ═══════════ ASSIGNMENTS ═══════════ */}
            <TabsContent value="assignments">
              <StudentAssignmentView />
            </TabsContent>

            {/* ═══════════ PROGRESS ═══════════ */}
            <TabsContent value="progress">
              <div className="space-y-6">
                {/* Subject performance chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Subject Performance</CardTitle>
                    <CardDescription>Average grades across subjects</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {subjectStats.length > 0 ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={subjectStats.map(s => ({ name: s.subject, average: s.average, completed: s.completed, pending: s.pending }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="average" name="Average Grade %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mb-2 opacity-30" />
                        <p>No grade data yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Subject cards */}
                {subjectStats.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subjectStats.map(stat => (
                      <Card key={stat.subject}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">{stat.subject}</CardTitle>
                            <span className={`text-xl font-bold ${getGradeColor(stat.average)}`}>
                              {stat.average > 0 ? `${stat.average}%` : '—'}
                            </span>
                          </div>
                          <div className="pt-1">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Progress</span>
                              <span>{stat.progressPct}%</span>
                            </div>
                            <Progress value={stat.progressPct} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-muted rounded-lg p-3">
                              <p className="text-xs text-muted-foreground">Completed</p>
                              <p className="text-xl font-bold">{stat.completed}</p>
                            </div>
                            <div className="bg-muted rounded-lg p-3">
                              <p className="text-xs text-muted-foreground">Pending</p>
                              <p className="text-xl font-bold">{stat.pending}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Learning paths progress */}
                <Card>
                  <CardHeader>
                    <CardTitle>Learning Paths</CardTitle>
                    <CardDescription>Your enrolled learning paths and progress</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pathProgress.length > 0 ? (
                      <div className="space-y-4">
                        {pathProgress.map(pp => {
                          const totalModules = Array.isArray(pp.path?.modules) ? pp.path!.modules.length : 0;
                          return (
                            <div key={pp.id} className="flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => navigate(`/learning-path/${pp.path_id}`)}>
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Book className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{pp.path?.title || 'Learning Path'}</p>
                                <p className="text-xs text-muted-foreground">{pp.path?.subject} • {pp.completed_modules?.length || 0}/{totalModules} modules</p>
                                <Progress value={pp.progress} className="mt-1 h-1.5" />
                              </div>
                              <Badge variant={pp.progress >= 100 ? 'default' : 'secondary'}>
                                {pp.progress >= 100 ? 'Complete' : `${pp.progress}%`}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <Book className="h-10 w-10 mb-2 opacity-30" />
                        <p>No learning paths started yet</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/learning-paths')}>
                          Browse Learning Paths
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ═══════════ AI LEARNING ═══════════ */}
            <TabsContent value="learning">
              <FeatureGate feature="aiAssistant">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Learning Assistant</CardTitle>
                      <CardDescription>Get help with your studies</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 mb-4">
                        {['Answering questions about assignments', 'Explaining difficult concepts', 'Providing study tips', 'Creating practice questions'].map(item => (
                          <li key={item} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />{item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" onClick={() => navigate('/ai-learning-assistant')}>
                        <Brain className="mr-2 h-4 w-4" />Open AI Assistant
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Your AI Activity</CardTitle>
                      <CardDescription>Real usage stats</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div><h4 className="font-medium text-sm">Chat Sessions</h4><p className="text-xs text-muted-foreground">Total conversations</p></div>
                          <div className="text-2xl font-bold">{aiSessionCount}</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div><h4 className="font-medium text-sm">Questions Asked</h4><p className="text-xs text-muted-foreground">To the AI assistant</p></div>
                          <div className="text-2xl font-bold">{aiMessageCount}</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div><h4 className="font-medium text-sm">Learning Paths</h4><p className="text-xs text-muted-foreground">Active paths</p></div>
                          <div className="text-2xl font-bold">{pathProgress.length}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </FeatureGate>
            </TabsContent>

            {/* ═══════════ MESSAGES ═══════════ */}
            <TabsContent value="messages">
              <Card className="h-[calc(80vh-4rem)]">
                <div className="grid md:grid-cols-3 h-full">
                  {/* Contact list */}
                  <div className="border-r border-border flex flex-col">
                    <div className="p-3 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search contacts..." className="pl-9" value={contactSearch}
                          onChange={e => setContactSearch(e.target.value)} />
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {filteredContacts.length > 0 ? filteredContacts.map(c => (
                        <div key={c.user_id}
                          className={`flex items-center px-4 py-3 cursor-pointer hover:bg-accent transition-colors ${activeContact?.user_id === c.user_id ? 'bg-accent' : ''}`}
                          onClick={() => setActiveContact(c)}>
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm mr-3 shrink-0">
                            {getInitials(c.full_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{c.full_name}</p>
                          </div>
                          {(unreadCounts[c.user_id] || 0) > 0 && (
                            <span className="bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center shrink-0">
                              {unreadCounts[c.user_id]}
                            </span>
                          )}
                        </div>
                      )) : (
                        <p className="text-center text-muted-foreground py-8 text-sm">No contacts found</p>
                      )}
                    </div>
                  </div>

                  {/* Chat area */}
                  <div className="md:col-span-2 flex flex-col">
                    {activeContact ? (
                      <>
                        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                            {getInitials(activeContact.full_name)}
                          </div>
                          <p className="font-semibold">{activeContact.full_name}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {messages.length > 0 ? messages.map(m => {
                            const isMe = m.sender_id === user?.id;
                            return (
                              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                                  <p className="text-sm">{m.content}</p>
                                  <p className={`text-xs mt-1 text-right ${isMe ? 'opacity-70' : 'text-muted-foreground'}`}>
                                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            );
                          }) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                              No messages yet. Start a conversation!
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                        <div className="p-3 border-t border-border">
                          <div className="flex gap-2">
                            <Input placeholder="Type a message..." value={messageText}
                              onChange={e => setMessageText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                            <Button onClick={sendMessage} disabled={!messageText.trim()} size="icon">
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mr-2 opacity-30" />
                        Select a contact to start messaging
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* ═══════════ ADAPTIVE PROFILE ═══════════ */}
            <TabsContent value="adaptive">
              <FeatureGate feature="adaptiveProfile">
                <AdaptiveLearningProfile />
              </FeatureGate>
            </TabsContent>

            {/* ═══════════ QUIZ LIBRARY ═══════════ */}
            <TabsContent value="quizzes">
              <FeatureGate feature="quizPractice">
                {practiceSessionId ? (
                  <LiveQuizPlayer sessionId={practiceSessionId} onExit={() => setPracticeSessionId(null)} />
                ) : (
                  <QuizLibrary onStartPractice={(id) => setPracticeSessionId(id)} />
                )}
              </FeatureGate>
            </TabsContent>
          </Tabs>
          <PilotFeedbackPrompt context="student" />
      </div>
    </div>
  );

  if (isInSchool) return dashboardContent;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      {dashboardContent}
    </div>
  );
};

export default StudentDashboard;
