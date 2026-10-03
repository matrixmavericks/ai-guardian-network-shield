import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { differenceInCalendarDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { StudyShell, primaryBtn } from '@/components/subjects/kit';
import { Panel, PanelHead, chip, ghostBtn } from '@/components/student/ui';
import { Field, Modal, inputCls } from '@/components/student/Modal';
import { monogram, themeFor } from '@/components/student/themes';
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
  BarChart3, Upload, Clock, AlertTriangle, GraduationCap, Settings, Trophy,
  ClipboardCheck,
  Table2,
  ArrowRight,
  PenLine,
} from 'lucide-react';
import TeacherGradingView from '@/components/TeacherGradingView';
import { Progress } from '@/components/ui/progress';
import AdaptiveLearningProfile from '@/components/AdaptiveLearningProfile';
import {
  fetchGradingSystems,
  convertPercentageToGrade,
  getGradeColor,
  type GradingSystem,
} from '@/services/gradingService';
import ClassResourceManager from '@/components/ClassResourceManager';
import GroupManager from '@/components/GroupManager';
import LiveQuizList from '@/components/livequiz/LiveQuizList';
import CreateLiveQuiz from '@/components/livequiz/CreateLiveQuiz';
import LiveQuizPlayer from '@/components/livequiz/LiveQuizPlayer';
import QuizResults from '@/components/livequiz/QuizResults';
import ClassCoursesManager from '@/components/ClassCoursesManager';
import { ClassMypCard } from '@/components/subjects/ClassMypCard';
import { useCourseLinks } from '@/components/subjects/classCourses';
import { getSubject } from '@/content/myp';
import { tone } from "@/lib/portalAppearance";

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
  curriculum_type?: string;
}

interface ClassAssignment {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  subject: string;
  created_at: string;
  is_group_assignment: boolean;
  group_formation: string;
  min_group_size: number;
  max_group_size: number;
  grading_type: string;
}

const ClassDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [assignPathOpen, setAssignPathOpen] = useState(false);
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [selectedPathId, setSelectedPathId] = useState('');
  const [assignedPathIds, setAssignedPathIds] = useState<string[]>([]);
  const [loadingAssignedPaths, setLoadingAssignedPaths] = useState(false);
  // Class-level tab
  const [classTab, setClassTab] = useState('students');
  // Assignments
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', due_date: '', subject: '', is_group: false, formation: 'student_choice', min_size: '2', max_size: '4', grading_type: 'group' });
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
  const [gradingSystems, setGradingSystems] = useState<GradingSystem[]>([]);
  const [classGradingSystem, setClassGradingSystem] = useState<GradingSystem | null>(null);
  const [savingGradingSystem, setSavingGradingSystem] = useState(false);
  // Live Quiz state
  const [quizView, setQuizView] = useState<'list' | 'create' | 'play' | 'results'>('list');
  const [activeQuizSessionId, setActiveQuizSessionId] = useState<string | null>(null);
  const [studentFilter, setStudentFilter] = useState<'all' | 'todo' | 'submitted' | 'graded'>('all');

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const mypCourses = useCourseLinks();
  const mypLinks = mypCourses.links.filter(l => l.classId === id);

  // Handle generateQuiz query param from teaching plans
  useEffect(() => {
    if (searchParams.get('generateQuiz') === 'true') {
      setClassTab('live-quiz');
      setQuizView('create');
    }
    // A live quiz made in the AI chat: open it ready to host
    const live = searchParams.get('liveQuiz');
    if (live) {
      setClassTab('live-quiz');
      setActiveQuizSessionId(live);
      setQuizView('play');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchClassData();
    fetchGradingSystems().then(systems => {
      setGradingSystems(systems);
    }).catch(console.error);
  }, [id, user]);

  useEffect(() => {
    const loadAssignedPaths = async () => {
      if (!selectedStudent) {
        setAssignedPathIds([]);
        return;
      }

      setLoadingAssignedPaths(true);
      try {
        const { data, error } = await supabase
          .from('learning_path_progress')
          .select('path_id')
          .eq('user_id', selectedStudent.student_id);

        if (error) throw error;
        setAssignedPathIds((data || []).map((item: { path_id: string }) => item.path_id));
      } catch (err) {
        console.error('Failed to load assigned paths', err);
        setAssignedPathIds([]);
      } finally {
        setLoadingAssignedPaths(false);
      }
    };

    loadAssignedPaths();
  }, [selectedStudent?.student_id]);

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

      // Load grading system for this class
      if (cls.grading_system_id) {
        const { data: gs } = await supabase
          .from('grading_systems')
          .select('*')
          .eq('id', cls.grading_system_id)
          .maybeSingle();
        if (gs) setClassGradingSystem(gs as unknown as GradingSystem);
      } else {
        const { data: defaultGs } = await supabase
          .from('grading_systems')
          .select('*')
          .eq('is_default', true)
          .maybeSingle();
        if (defaultGs) setClassGradingSystem(defaultGs as unknown as GradingSystem);
      }

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

  const assignLearningPath = async (pathId?: string) => {
    const pid = pathId || selectedPathId;
    if (!pid || !selectedStudent) return;

    if (assignedPathIds.includes(pid)) {
      toast.info('Student already has this learning path assigned');
      return;
    }

    try {
      const { error } = await supabase.from('learning_path_progress').insert({
        user_id: selectedStudent.student_id,
        path_id: pid,
        progress: 0,
      });

      if (error) {
        if (error.code === '23505') {
          toast.info('Student already has this learning path assigned');
          setAssignedPathIds((prev) => (prev.includes(pid) ? prev : [...prev, pid]));
        } else {
          throw error;
        }
      } else {
        setAssignedPathIds((prev) => (prev.includes(pid) ? prev : [...prev, pid]));
        toast.success('Learning path assigned!');
        setAssignPathOpen(false);
        setSelectedPathId('');
      }
    } catch (err: any) {
      console.error('Failed to assign learning path', err);
      toast.error(err?.message || 'Failed to assign learning path');
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
        is_group_assignment: newAssignment.is_group,
        group_formation: newAssignment.formation,
        min_group_size: parseInt(newAssignment.min_size) || 2,
        max_group_size: parseInt(newAssignment.max_size) || 4,
        grading_type: newAssignment.grading_type,
      });
      if (error) throw error;
      toast.success('Assignment created!');
      setCreateAssignmentOpen(false);
      setNewAssignment({ title: '', description: '', due_date: '', subject: '', is_group: false, formation: 'student_choice', min_size: '2', max_size: '4', grading_type: 'group' });
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
      <StudyShell wide>
        <div className="lp-skeleton h-[220px] rounded-3xl" />
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="lp-skeleton h-[320px] rounded-3xl" />
          <div className="lp-skeleton h-[320px] rounded-3xl" />
        </div>
      </StudyShell>
    );
  }

  if (!classInfo) return null;

  const theme = themeFor(classInfo.subject || classInfo.name);
  return (
    <StudyShell wide>
          <Link to="/classes" className="inline-flex items-center gap-1.5 text-[13px] text-lp-mute transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All classes
          </Link>
          <section className="lp-keep lp-fade relative mt-4 overflow-hidden rounded-3xl border border-white/10" style={{ background: theme.gradient, animationFillMode: 'both' }}>
            <div
              aria-hidden
              className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '16px 16px', maskImage: 'linear-gradient(110deg, transparent 35%, black)', WebkitMaskImage: 'linear-gradient(110deg, transparent 35%, black)' }}
            />
            <span aria-hidden className="absolute -bottom-10 right-4 select-none text-[150px] font-semibold leading-none tracking-[-0.06em] text-white/15">
              {monogram(classInfo.name)}
            </span>
            <div className="relative flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8">
              <div className="min-w-0 max-w-[680px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">
                  {[classInfo.curriculum_type && classInfo.curriculum_type !== 'general' ? classInfo.curriculum_type.toUpperCase().replace('_', ' ') : null, classInfo.subject].filter(Boolean).join(' · ')}
                </p>
                <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">{classInfo.name}</h1>
                {classInfo.description && <p className="mt-2 text-[14.5px] leading-relaxed text-white/80">{classInfo.description}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {isTeacher ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-[12.5px] text-white backdrop-blur-sm">
                        <Users className="h-3.5 w-3.5" /> {students.length} students
                      </span>
                      <Link to={`/marking?class=${classInfo.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[12.5px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30">
                        <ClipboardCheck className="h-3.5 w-3.5" /> Mark work
                      </Link>
                      <Link to={`/grades?class=${classInfo.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[12.5px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30">
                        <Table2 className="h-3.5 w-3.5" /> Gradebook
                      </Link>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-[12.5px] text-white backdrop-blur-sm">
                        <FileText className="h-3.5 w-3.5" /> {assignments.length} assignments
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-[12.5px] text-white backdrop-blur-sm">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {assignments.filter(a => getStudentSubmission(a.id)).length} handed in
                      </span>
                    </>
                  )}
                  {mypLinks.map(l => (
                    <Link
                      key={l.id}
                      to={isTeacher ? `/subjects/${l.subject}?tab=classes&class=${l.classId}` : `/subjects/${l.subject}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[12.5px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                    >
                      <GraduationCap className="h-3.5 w-3.5" /> MYP {getSubject(l.subject)?.name}
                    </Link>
                  ))}
                  {isTeacher && !mypLinks.length && mypCourses.available && !mypCourses.loading && (
                    <button
                      type="button"
                      onClick={() => setClassTab('courses')}
                      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/40 px-3 py-1 text-[12.5px] font-medium text-white transition-colors hover:bg-white/15"
                    >
                      <Plus className="h-3.5 w-3.5" /> Align to an MYP course
                    </button>
                  )}
                  {classGradingSystem && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-[12.5px] text-white backdrop-blur-sm">
                      <GraduationCap className="h-3.5 w-3.5" /> {classGradingSystem.name}
                    </span>
                  )}
                </div>
              </div>
              {isTeacher && (
                <button type="button" onClick={copyCode} className="group rounded-2xl border border-white/20 bg-white/15 px-5 py-3 text-left text-white backdrop-blur-md transition-colors hover:bg-white/25">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                    <Copy className="h-3 w-3" /> Join code
                  </span>
                  <span className="mt-0.5 block font-mono text-[26px] font-semibold uppercase tracking-[0.12em]">{classInfo.join_code}</span>
                </button>
              )}
            </div>
          </section>

          <div className="mt-6">
          {isTeacher ? (
            <Tabs value={classTab} onValueChange={setClassTab}>
              <TabsList data-tour="class-tabs" className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-lp-line bg-lp-surface/60 p-1.5">
                <TabsTrigger value="students" className="rounded-xl px-3.5 py-2 text-[13.5px] font-medium text-lp-soft hover:text-white data-[state=active]:bg-lp-blue data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_-10px_rgba(59,130,246,0.8)]">
                  <Users className="mr-2 h-4 w-4" /> Students
                </TabsTrigger>
                <TabsTrigger value="assignments" className="rounded-xl px-3.5 py-2 text-[13.5px] font-medium text-lp-soft hover:text-white data-[state=active]:bg-lp-blue data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_-10px_rgba(59,130,246,0.8)]">
                  <FileText className="mr-2 h-4 w-4" /> Assignments
                </TabsTrigger>
                <TabsTrigger value="analytics" className="rounded-xl px-3.5 py-2 text-[13.5px] font-medium text-lp-soft hover:text-white data-[state=active]:bg-lp-blue data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_-10px_rgba(59,130,246,0.8)]">
                  <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                </TabsTrigger>
                <TabsTrigger value="resources" className="rounded-xl px-3.5 py-2 text-[13.5px] font-medium text-lp-soft hover:text-white data-[state=active]:bg-lp-blue data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_-10px_rgba(59,130,246,0.8)]">
                  <Upload className="mr-2 h-4 w-4" /> Resources
                </TabsTrigger>
                <TabsTrigger value="learning-paths" className="rounded-xl px-3.5 py-2 text-[13.5px] font-medium text-lp-soft hover:text-white data-[state=active]:bg-lp-blue data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_-10px_rgba(59,130,246,0.8)]">
                  <Book className="mr-2 h-4 w-4" /> Learning Paths
                </TabsTrigger>
                <TabsTrigger value="courses" className="rounded-xl px-3.5 py-2 text-[13.5px] font-medium text-lp-soft hover:text-white data-[state=active]:bg-lp-blue data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_-10px_rgba(59,130,246,0.8)]">
                  <GraduationCap className="mr-2 h-4 w-4" /> Courses
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-xl px-3.5 py-2 text-[13.5px] font-medium text-lp-soft hover:text-white data-[state=active]:bg-lp-blue data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_-10px_rgba(59,130,246,0.8)]">
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </TabsTrigger>
                <TabsTrigger value="live-quiz" className="rounded-xl px-3.5 py-2 text-[13.5px] font-medium text-lp-soft hover:text-white data-[state=active]:bg-lp-blue data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_-10px_rgba(59,130,246,0.8)]">
                  <Trophy className="mr-2 h-4 w-4" /> Live Quiz
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
                              onClick={() => { setSelectedStudent(s); }}
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
                          <AdaptiveLearningProfile
                            targetUserId={selectedStudent.student_id}
                            targetUserName={selectedStudent.profile?.full_name || 'Student'}
                          />
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
                                  {learningPaths.map(p => {
                                    const isAssigned = assignedPathIds.includes(p.id);

                                    return (
                                      <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium">{p.title}</p>
                                            {isAssigned && <Badge variant="secondary">Assigned</Badge>}
                                          </div>
                                          <p className="text-xs text-muted-foreground">{p.subject}</p>
                                        </div>
                                        <Button
                                          size="sm"
                                          disabled={isAssigned || loadingAssignedPaths}
                                          onClick={() => assignLearningPath(p.id)}
                                        >
                                          {isAssigned ? 'Assigned' : 'Assign'}
                                        </Button>
                                      </div>
                                    );
                                  })}
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
                    <Button onClick={() => navigate(`/task/new?class=${classInfo!.id}`)}><Plus className="mr-2 h-4 w-4" /> Set a task</Button>
                    <Dialog open={createAssignmentOpen} onOpenChange={setCreateAssignmentOpen}>
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

                          {/* Group Assignment Toggle */}
                          <div className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id="is-group"
                                checked={newAssignment.is_group}
                                onChange={e => setNewAssignment(p => ({ ...p, is_group: e.target.checked }))}
                                className="rounded"
                              />
                              <Label htmlFor="is-group" className="cursor-pointer font-medium">Group Assignment</Label>
                            </div>
                            {newAssignment.is_group && (
                              <div className="space-y-3 pl-6 border-l-2">
                                <div>
                                  <Label>Group Formation</Label>
                                  <Select value={newAssignment.formation} onValueChange={v => setNewAssignment(p => ({ ...p, formation: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="student_choice">Students choose their groups</SelectItem>
                                      <SelectItem value="teacher_assigned">Teacher assigns groups</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label>Min Size</Label>
                                    <Input type="number" min={2} max={10} value={newAssignment.min_size}
                                      onChange={e => setNewAssignment(p => ({ ...p, min_size: e.target.value }))} />
                                  </div>
                                  <div>
                                    <Label>Max Size</Label>
                                    <Input type="number" min={2} max={10} value={newAssignment.max_size}
                                      onChange={e => setNewAssignment(p => ({ ...p, max_size: e.target.value }))} />
                                  </div>
                                </div>
                                <div>
                                  <Label>Grading</Label>
                                  <Select value={newAssignment.grading_type} onValueChange={v => setNewAssignment(p => ({ ...p, grading_type: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="group">Group grade (same for all)</SelectItem>
                                      <SelectItem value="individual">Individual grades</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
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
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Link to={`/task/${a.id}`} className="hover:underline">{a.title}</Link>
                                  {a.is_group_assignment && (
                                    <Badge variant="outline" className="text-xs">
                                      <Users className="mr-1 h-3 w-3" />
                                      Group ({a.min_group_size}-{a.max_group_size})
                                    </Badge>
                                  )}
                                </CardTitle>
                                <CardDescription>
                                  {a.subject} • Created {new Date(a.created_at).toLocaleDateString()}
                                  {a.due_date && ` • Due ${new Date(a.due_date).toLocaleDateString()}`}
                                  {a.is_group_assignment && ` • ${a.group_formation === 'student_choice' ? 'Students choose groups' : 'Teacher assigns groups'}`}
                                  {a.is_group_assignment && ` • ${a.grading_type === 'group' ? 'Group grade' : 'Individual grades'}`}
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => navigate(`/task/${a.id}/edit`)}>
                                  <PenLine className="mr-2 h-4 w-4" /> Edit
                                </Button>
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
                              <p className="line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
                            </CardContent>
                          )}
                          {a.is_group_assignment && (
                            <CardContent className="pt-0">
                              <GroupManager
                                assignmentId={a.id}
                                classId={classInfo!.id}
                                minSize={a.min_group_size}
                                maxSize={a.max_group_size}
                                formation={a.group_formation}
                                isTeacher={true}
                                students={students.map(s => ({ id: s.student_id, name: s.profile?.full_name || 'Unknown' }))}
                              />
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                )}
              </TabsContent>

              {/* ===== ANALYTICS TAB ===== */}
              <TabsContent value="analytics">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{analyticsData.length}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {analyticsData.reduce((sum, a) => sum + a.totalSubmissions, 0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Class Average</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const graded = analyticsData.filter(a => a.avgGrade !== null);
                          const avg = graded.length > 0
                            ? Math.round(graded.reduce((sum, a) => sum + a.avgGrade, 0) / graded.length)
                            : null;
                          return avg !== null ? (
                            <div className={`text-3xl font-bold ${avg >= 70 ? 'text-green-600' : 'text-destructive'}`}>
                              {avg}%
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No grades yet</p>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Assignment Performance</CardTitle>
                      <CardDescription>Average grades and submission stats per assignment</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analyticsData.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No assignments yet</p>
                      ) : (
                        <div className="space-y-4">
                          {analyticsData.map(a => (
                            <div key={a.id} className="border rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-medium">{a.title}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {a.subject} • {a.totalSubmissions} submission{a.totalSubmissions !== 1 ? 's' : ''} • {a.gradedCount} graded
                                  </p>
                                </div>
                                {a.avgGrade !== null && (
                                  <div className={`text-xl font-bold ${getGradeColor(a.avgGrade)}`}>
                                    {classGradingSystem
                                      ? convertPercentageToGrade(a.avgGrade, classGradingSystem)
                                      : `${a.avgGrade}%`}
                                  </div>
                                )}
                              </div>
                              {a.avgGrade !== null && (
                                <div>
                                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>Low: {classGradingSystem ? convertPercentageToGrade(a.lowestGrade, classGradingSystem) : `${a.lowestGrade}%`}</span>
                                    <span>Avg: {classGradingSystem ? convertPercentageToGrade(a.avgGrade, classGradingSystem) : `${a.avgGrade}%`}</span>
                                    <span>High: {classGradingSystem ? convertPercentageToGrade(a.highestGrade, classGradingSystem) : `${a.highestGrade}%`}</span>
                                  </div>
                                  <Progress value={a.avgGrade} />
                                </div>
                              )}
                              {a.avgGrade === null && a.totalSubmissions > 0 && (
                                <p className="text-sm text-muted-foreground italic">Submissions pending grading</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Student rankings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Students ({students.length})</CardTitle>
                      <CardDescription>Enrolled students in this class</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {students.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No students enrolled yet</p>
                      ) : (
                        <div className="space-y-2">
                          {students.map(s => (
                            <div key={s.student_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                                {s.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <span className="text-sm font-medium">{s.profile?.full_name || 'Unknown'}</span>
                              {s.profile?.grade_level && (
                                <Badge variant="secondary" className="text-xs">{s.profile.grade_level}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ===== RESOURCES TAB ===== */}
              <TabsContent value="resources">
                <ClassResourceManager
                  classId={classInfo.id}
                  className={classInfo.name}
                  isTeacher={true}
                />
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

              {/* ===== COURSES TAB ===== */}
              <TabsContent value="courses">
                <div className="space-y-6">
                  <ClassMypCard classId={id!} classSubject={classInfo.subject} isTeacher={isTeacher} courses={mypCourses} />
                  <ClassCoursesManager classId={id!} isTeacher={isTeacher} />
                </div>
              </TabsContent>

              {/* ===== SETTINGS TAB ===== */}
              <TabsContent value="settings">
                <div className="max-w-2xl space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        Grading System
                      </CardTitle>
                      <CardDescription>
                        Choose how grades are displayed for this class. Students will see their grades converted to this scale.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Select
                        value={classGradingSystem?.id || ""}
                        onValueChange={async (val) => {
                          const system = gradingSystems.find(s => s.id === val);
                          if (!system || !classInfo) return;
                          setSavingGradingSystem(true);
                          try {
                            const { error } = await supabase
                              .from('classes')
                              .update({ grading_system_id: val } as any)
                              .eq('id', classInfo.id);
                            if (error) throw error;
                            setClassGradingSystem(system);
                            toast.success(`Grading system set to ${system.name}`);
                          } catch (err) {
                            toast.error('Failed to update grading system');
                          } finally {
                            setSavingGradingSystem(false);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full" disabled={savingGradingSystem}>
                          <SelectValue placeholder="Select grading system" />
                        </SelectTrigger>
                        <SelectContent>
                          {gradingSystems.map(sys => (
                            <SelectItem key={sys.id} value={sys.id}>
                              <div className="flex flex-col">
                                <span>{sys.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {classGradingSystem && (
                        <div className="rounded-lg border p-4">
                          <p className="text-sm font-medium">{classGradingSystem.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{classGradingSystem.description}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {classGradingSystem.scale_config?.boundaries?.slice(0, 8).map((b: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {b.label || b.grade}: ≥{b.min ?? b.min_pct}%
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ===== LIVE QUIZ TAB ===== */}
              <TabsContent value="live-quiz">
                {quizView === 'play' && activeQuizSessionId ? (
                  <LiveQuizPlayer sessionId={activeQuizSessionId} onExit={() => { setQuizView('list'); setActiveQuizSessionId(null); }} />
                ) : quizView === 'create' ? (
                  <CreateLiveQuiz
                    classId={classInfo.id}
                    classSubject={classInfo.subject}
                    onCreated={(id) => { setQuizView('play'); setActiveQuizSessionId(id); }}
                    onCancel={() => setQuizView('list')}
                    initialTopic={searchParams.get('topic') || undefined}
                  />
                ) : quizView === 'results' && activeQuizSessionId ? (
                  <QuizResults sessionId={activeQuizSessionId} onBack={() => { setQuizView('list'); setActiveQuizSessionId(null); }} />
                ) : (
                  <LiveQuizList
                    classId={classInfo.id}
                    isTeacher={isTeacher}
                    onCreateNew={() => setQuizView('create')}
                    onJoinSession={(id) => { setQuizView('play'); setActiveQuizSessionId(id); }}
                    onViewResults={(id) => { setQuizView('results'); setActiveQuizSessionId(id); }}
                  />
                )}
              </TabsContent>
            </Tabs>
          ) : (
            /* ===== STUDENT VIEW ===== */
            (() => {
              const rows = assignments.map(a => {
                const sub = getStudentSubmission(a.id);
                const graded = !!sub && sub.grade !== null && sub.grade !== undefined;
                const submitted = !!sub;
                const overdue = !!a.due_date && new Date(a.due_date) < new Date();
                const status: 'graded' | 'submitted' | 'overdue' | 'todo' = graded ? 'graded' : submitted ? 'submitted' : overdue ? 'overdue' : 'todo';
                return { a, sub, status };
              });
              const count = (s: string) => rows.filter(r => r.status === s).length;
              const STATUS = {
                todo: { label: 'To do', color: '#7CB4FF' },
                overdue: { label: 'Overdue', color: '#F2706A' },
                submitted: { label: 'Submitted', color: '#A78BFA' },
                graded: { label: 'Graded', color: '#34D399' },
              } as const;
              const shown = rows.filter(r =>
                studentFilter === 'all' ? true : studentFilter === 'todo' ? r.status === 'todo' || r.status === 'overdue' : r.status === studentFilter,
              );
              return (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                  <div className="min-w-0 space-y-4">
                    <Panel className="p-5">
                      <PanelHead title="Assignments" icon={FileText} meta={<span>{assignments.length} total</span>} />
                      {rows.length > 0 && (
                        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-lp-line">
                          {(['graded', 'submitted', 'todo', 'overdue'] as const).map(s => (
                            <span key={s} className="lp-bar-in h-full" style={{ width: `${(count(s) / rows.length) * 100}%`, background: STATUS[s].color }} />
                          ))}
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {([
                          ['all', 'All', rows.length],
                          ['todo', 'To do', count('todo') + count('overdue')],
                          ['submitted', 'Submitted', count('submitted')],
                          ['graded', 'Graded', count('graded')],
                        ] as const).map(([id, label, n]) => (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={studentFilter === id}
                            onClick={() => setStudentFilter(id)}
                            className={cn(
                              'flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium',
                              studentFilter === id ? 'border-lp-sky/50 bg-lp-blue/15 text-white' : 'border-lp-line text-lp-mute hover:text-white',
                            )}
                          >
                            {id !== 'all' && <span className="h-2 w-2 rounded-full" style={{ background: STATUS[id === 'todo' ? 'todo' : id].color }} />}
                            {label} <span className="tabular-nums text-lp-mute">{n}</span>
                          </button>
                        ))}
                      </div>
                    </Panel>

                    {shown.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-lp-line px-6 py-10 text-center text-[13.5px] text-lp-mute">
                        {assignments.length === 0 ? 'No assignments yet. They will appear here when your teacher sets them.' : 'Nothing here right now.'}
                      </div>
                    ) : (
                      shown.map(({ a, sub, status }, i) => {
                        const st = STATUS[status];
                        const pct = sub && sub.max_grade ? (sub.grade / sub.max_grade) * 100 : 0;
                        const days = a.due_date ? differenceInCalendarDays(new Date(a.due_date), new Date()) : null;
                        return (
                          <article
                            key={a.id}
                            className="lp-fade relative overflow-hidden rounded-2xl border border-lp-line bg-lp-surface/70 p-4 pl-5"
                            style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                          >
                            <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: st.color }} />
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link to={`/task/${a.id}`} className="text-[15px] font-medium text-white hover:text-lp-sky hover:underline">{a.title}</Link>
                                  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: tone(st.color), background: `${st.color}1F` }}>
                                    {st.label}
                                  </span>
                                  {a.is_group_assignment && (
                                    <span className={chip}>
                                      <Users className="h-3 w-3" /> Group
                                    </span>
                                  )}
                                </div>
                                {a.description && <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-lp-soft">{a.description}</p>}
                                {a.is_group_assignment && (
                                  <div className="mt-3" onClick={e => e.stopPropagation()}>
                                    <GroupManager
                                      assignmentId={a.id}
                                      classId={classInfo!.id}
                                      minSize={a.min_group_size}
                                      maxSize={a.max_group_size}
                                      formation={a.group_formation}
                                      isTeacher={false}
                                    />
                                  </div>
                                )}
                                {sub?.feedback && (
                                  <blockquote className="mt-3 rounded-xl border border-lp-line bg-lp-deep/50 px-3 py-2.5 text-[13px] leading-relaxed text-lp-soft">
                                    <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-lp-mute">Teacher feedback</span>
                                    {sub.feedback}
                                  </blockquote>
                                )}
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2">
                                {status === 'graded' ? (
                                  <div className="text-right">
                                    <p className="text-[24px] font-semibold leading-none tabular-nums text-white">
                                      {classGradingSystem ? convertPercentageToGrade(pct, classGradingSystem) : `${sub.grade}/${sub.max_grade}`}
                                    </p>
                                    <p className="mt-1 text-[11.5px] tabular-nums text-lp-mute">
                                      {sub.grade}/{sub.max_grade} · {Math.round(pct)}%
                                    </p>
                                  </div>
                                ) : a.due_date ? (
                                  <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]', status === 'overdue' ? 'border-lp-red/40 text-lp-red' : 'border-lp-line text-lp-soft')}>
                                    <Calendar className="h-3.5 w-3.5" />
                                    {status === 'overdue'
                                      ? `Overdue ${Math.abs(days ?? 0)}d`
                                      : days === 0
                                        ? 'Due today'
                                        : days === 1
                                          ? 'Due tomorrow'
                                          : `Due ${format(new Date(a.due_date), 'd MMM')}`}
                                  </span>
                                ) : null}
                                <Link to={`/task/${a.id}`} className={cn(status === 'graded' || status === 'submitted' ? ghostBtn : primaryBtn, 'h-9')}>
                                  {status === 'graded' ? 'See feedback' : status === 'submitted' ? 'Open task' : 'Open task'} <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>

                  <div className="min-w-0 space-y-4">
                    <ClassMypCard classId={classInfo.id} classSubject={classInfo.subject} isTeacher={false} courses={mypCourses} delay={40} />
                    <Panel className="p-5" delay={80}>
                      <PanelHead title="Class resources" icon={Upload} />
                      <p className="mt-1 text-[12px] text-lp-mute">Files, notes and links from your teacher.</p>
                      <div className="mt-3">
                        <ClassResourceManager classId={classInfo.id} className={classInfo.name} isTeacher={false} />
                      </div>
                    </Panel>

                    {quizView === 'play' && activeQuizSessionId ? (
                      <LiveQuizPlayer sessionId={activeQuizSessionId} onExit={() => { setQuizView('list'); setActiveQuizSessionId(null); }} />
                    ) : quizView === 'results' && activeQuizSessionId ? (
                      <QuizResults sessionId={activeQuizSessionId} onBack={() => { setQuizView('list'); setActiveQuizSessionId(null); }} />
                    ) : (
                      <Panel className="p-5" delay={140}>
                        <PanelHead title="Live quizzes" icon={Trophy} />
                        <p className="mt-1 text-[12px] text-lp-mute">Join a live quiz when your teacher starts one.</p>
                        <div className="mt-3">
                          <LiveQuizList
                            classId={classInfo.id}
                            isTeacher={false}
                            onCreateNew={() => {}}
                            onJoinSession={(id) => { setQuizView('play'); setActiveQuizSessionId(id); }}
                            onViewResults={(id) => { setQuizView('results'); setActiveQuizSessionId(id); }}
                          />
                        </div>
                      </Panel>
                    )}
                  </div>
                </div>
              );
            })()
          )}
          </div>

          {/* Student Submit Dialog */}
          <Modal
            open={submitDialogOpen}
            onClose={() => setSubmitDialogOpen(false)}
            title={`Submit: ${selectedSubmitAssignment?.title ?? ''}`}
            description={selectedSubmitAssignment?.description || 'Write your answer or attach a file.'}
            footer={
              <>
                <button type="button" onClick={() => setSubmitDialogOpen(false)} className={ghostBtn}>Cancel</button>
                <button type="button" onClick={handleStudentSubmit} disabled={submitting} className={primaryBtn}>
                  {submitting ? 'Submitting…' : 'Submit assignment'} <Send className="h-4 w-4" />
                </button>
              </>
            }
          >
            <div className="space-y-4">
              <Field label="Your answer">
                <textarea className={cn(inputCls, 'min-h-[160px]')} placeholder="Type your answer here..." value={submitText} onChange={e => setSubmitText(e.target.value)} />
              </Field>
              <Field label="Attach a file (optional)">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-lp-line bg-lp-deep/50 px-4 py-3 text-[13px] text-lp-soft hover:border-lp-sky/50">
                  <Upload className="h-4 w-4 text-lp-sky" />
                  <span className="min-w-0 flex-1 truncate">{submitFile ? submitFile.name : 'Choose a file'}</span>
                  <input type="file" className="sr-only" onChange={e => setSubmitFile(e.target.files?.[0] || null)} />
                </label>
              </Field>
            </div>
          </Modal>
    </StudyShell>
  );
};

export default ClassDetailPage;
