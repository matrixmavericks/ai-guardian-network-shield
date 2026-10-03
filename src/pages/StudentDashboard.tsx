import React, { useState, useEffect, useRef } from 'react';
import PilotFeedbackPrompt from '@/components/PilotFeedbackPrompt';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart, Area, BarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import DashboardSidebar from '@/components/DashboardSidebar';
import ClaimGoogleAccountCard from '@/components/ClaimGoogleAccountCard';
import { useSchoolCheck } from '@/hooks/useSchoolCheck';
import {
  ArrowRight, ArrowUpRight, Book, Brain, Check, CheckCircle2, ChevronRight, Clock, FileText, GraduationCap,
  LayoutGrid, MessageSquare, Search, Send, Shield, Sparkles, Trophy, TrendingUp, AlertTriangle, Flame, Timer,
} from 'lucide-react';
import AdaptiveLearningProfile from '@/components/AdaptiveLearningProfile';
import StudentPlanCard from '@/components/StudentPlanCard';
import StudentAssignmentView from '@/components/StudentAssignmentView';
import FeatureGate from '@/components/FeatureGate';
import {
  formatDistanceToNow, format, startOfWeek, endOfWeek, isWithinInterval, isToday, isTomorrow,
} from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import QuizLibrary from '@/components/livequiz/QuizLibrary';
import LiveQuizPlayer from '@/components/livequiz/LiveQuizPlayer';
import { cn } from '@/lib/utils';
import { GlowButton } from '@/components/landing/primitives';
import {
  Bar, EmptyState, Panel, PanelHead, Ring, chip, ghostBtn, gradeLabel, gradeText, gradeTone, useCountUp,
} from '@/components/student/ui';
import { friendlyFirstName } from "@/lib/studentIds";
import SkyHero, { skyBtn, skyChip } from '@/components/portal/SkyHero';
import { skyMood } from '@/components/portal/sky';
import { streak, useStudy } from '@/components/subjects/store';
import { todayStats, useFocus } from '@/components/focus/store';
import MyWorld from '@/components/world/MyWorld';

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
  path?: { title: string; subject: string; modules: unknown };
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

// ─── Small presentational helpers ─────────────────────────────────────────
const TABS = [
  { value: 'overview', label: 'Overview', icon: LayoutGrid },
  { value: 'myplan', label: 'My Plan', icon: Sparkles },
  { value: 'assignments', label: 'Assignments', icon: FileText },
  { value: 'progress', label: 'Progress', icon: GraduationCap },
  { value: 'learning', label: 'AI Learning', icon: Brain },
  { value: 'messages', label: 'Messages', icon: MessageSquare },
  { value: 'adaptive', label: 'Adaptive Profile', icon: Shield },
  { value: 'quizzes', label: 'Quiz Library', icon: Trophy },
];

const AI_PROMPTS = [
  'Help me plan my essay',
  'Explain this topic simply',
  'Quiz me before my test',
  'Check my working on a problem',
];

const dueLabel = (iso: string) => {
  const d = new Date(iso);
  if (d <= new Date()) return `Overdue · ${formatDistanceToNow(d)} ago`;
  if (isToday(d)) return `Due today, ${format(d, 'p')}`;
  if (isTomorrow(d)) return `Due tomorrow, ${format(d, 'p')}`;
  return `Due ${format(d, 'EEE d MMM')}`;
};

const ChartTooltip: React.FC<{ active?: boolean; payload?: { value: number }[]; label?: string; suffix?: string }> = ({
  active,
  payload,
  label,
  suffix = '%',
}) =>
  active && payload?.length ? (
    <div className="rounded-xl border border-lp-line bg-lp-deep/95 px-3 py-2 text-[12px] shadow-xl backdrop-blur">
      <p className="text-lp-mute">{label}</p>
      <p className="mt-0.5 text-[14px] font-semibold text-white">
        {payload[0].value}
        {suffix}
      </p>
    </div>
  ) : null;

const StatTile: React.FC<{
  icon: React.ElementType;
  label: string;
  value: number;
  detail: React.ReactNode;
  detailTone?: 'mute' | 'red' | 'sky';
  onClick: () => void;
  delay: number;
}> = ({ icon: Icon, label, value, detail, detailTone = 'mute', onClick, delay }) => {
  const n = useCountUp(value);
  return (
    <Panel delay={delay} as="div" className="group">
      <button type="button" onClick={onClick} className="flex h-full w-full flex-col p-5 text-left focus-visible:outline-none">
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lp-raised text-lp-sky transition-colors group-hover:bg-lp-blue group-hover:text-white">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <ArrowUpRight className="h-4 w-4 text-lp-mute opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <p className="mt-5 text-[32px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-white">{n}</p>
        <p className="mt-2 text-[13.5px] text-lp-soft">{label}</p>
        <p
          className={cn(
            'mt-1 text-[12.5px]',
            detailTone === 'red' ? 'text-lp-red' : detailTone === 'sky' ? 'text-lp-sky' : 'text-lp-mute',
          )}
        >
          {detail}
        </p>
      </button>
    </Panel>
  );
};

const Skeleton: React.FC<{ className?: string }> = ({ className }) => <div className={cn('lp-skeleton rounded-3xl', className)} />;

// ─── Component ────────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const isInSchool = useSchoolCheck();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const setTab = (tab: string) => setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true });
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.email?.split('@')[0] || 'Student';
  const [practiceSessionId, setPracticeSessionId] = useState<string | null>(null);
  const { state: study } = useStudy();
  const focusState = useFocus();

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
        setAiSessionCount((sessRes as { count: number | null }).count || 0);
        setAiMessageCount((msgCountRes as { count: number | null }).count || 0);

        // Enrich path progress with path data
        const progressData = (pathRes.data || []) as Omit<LearningPathProgress, 'path'>[];
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
        setContacts(((contactData || []) as Contact[]).map((c) => ({ user_id: c.user_id, full_name: c.full_name })));

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

  const filteredContacts = contacts.filter(c =>
    c.full_name.toLowerCase().includes(contactSearch.toLowerCase())
  );
  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const totalUnread = Object.values(unreadCounts).reduce((s, c) => s + c, 0);

  // This week, and the short list of things that need attention
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekAssignments = assignments.filter(a => a.due_date && isWithinInterval(new Date(a.due_date), { start: weekStart, end: weekEnd }));
  const weekDone = weekAssignments.filter(a => !!getSubmission(a.id)).length;
  const weekPct = weekAssignments.length > 0 ? Math.round((weekDone / weekAssignments.length) * 100) : 0;
  const overdueOpen = overdueAssignments.filter(a => !getSubmission(a.id));
  const focusList = [
    ...overdueAssignments.map(a => ({ a, state: getSubmission(a.id) ? 'submitted' : 'overdue' })),
    ...upcomingAssignments.map(a => ({ a, state: getSubmission(a.id) ? 'submitted' : 'todo' })),
  ].slice(0, 5);
  const nextDeadline = upcomingAssignments.find(a => !getSubmission(a.id));

  const recentPaths = [...pathProgress]
    .sort((a, b) => new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime())
    .slice(0, 3);
  const recentGrades = [...gradedSubmissions]
    .sort((a, b) => new Date(b.graded_at || b.submitted_at).getTime() - new Date(a.graded_at || a.submitted_at).getTime())
    .slice(0, 5);

  // Pilot ID accounts (MIS-…) have no name, so the greeting drops it
  const firstName = friendlyFirstName(displayName, '');
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const studyStreak = streak(study);
  const focusToday = todayStats(focusState);
  const summary = overdueOpen.length > 0
    ? `You have ${overdueOpen.length} overdue assignment${overdueOpen.length > 1 ? 's' : ''}. Start there, then keep going.`
    : weekAssignments.length - weekDone > 0
      ? `${weekAssignments.length - weekDone} assignment${weekAssignments.length - weekDone > 1 ? 's' : ''} left to hand in this week.`
      : "You're all caught up. A good moment to pick up a learning path.";

  const gradePct = (s: Submission) => Math.round((s.grade! / s.max_grade) * 100);
  const gradePcts = gradedSubmissions.map(gradePct);
  const latestPct = recentGrades.length > 0 ? gradePct(recentGrades[0]) : 0;

  const avgRounded = Math.round(overallAverage);
  const avgShown = useCountUp(avgRounded);
  const tone = gradeTone(avgRounded);

  // ─── Layout wrapper ──────────────────────────────────────────────────
  const shell = (children: React.ReactNode) => {
    const content = (
      <div className="lp-app relative z-[1] min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-lp-bg font-ui antialiased selection:bg-lp-blue/40 selection:text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-[130px]"
          style={{ background: 'radial-gradient(closest-side, rgba(59,130,246,0.45), transparent)' }}
        />
        <div className="relative mx-auto max-w-[1280px] px-5 pb-28 pt-8 sm:px-8 lg:px-10 lg:pb-14 lg:pt-10">{children}</div>
      </div>
    );
    if (isInSchool) return content;
    return (
      <div className="lp-chrome flex h-screen bg-lp-bg">
        <DashboardSidebar />
        {content}
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────
  if (loading) {
    return shell(
      <div aria-busy="true" aria-label="Loading dashboard">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="mt-4 h-12 w-80 max-w-full rounded-2xl" />
        <Skeleton className="mt-8 h-12 w-full rounded-2xl" />
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Skeleton className="h-[360px] lg:col-span-7" />
          <Skeleton className="h-[360px] lg:col-span-5" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-[168px]" />)}
        </div>
      </div>,
    );
  }

  return shell(
    <>
      {/* ═══════════ HEADER ═══════════ */}
      <SkyHero
        eyebrow={`${format(now, 'EEEE, d MMMM')} · ${skyMood(hour + now.getMinutes() / 60)}`}
        title={
          <>
            {firstName ? `${greeting}, ` : greeting}
            {firstName && <span className="bg-gradient-to-r from-[#ffffff] via-[#dbeafe] to-[#a5f3fc] bg-clip-text text-transparent">{firstName}</span>}
          </>
        }
        summary={summary}
        chips={
          <>
            <span className={skyChip} title="Days in a row you've studied">
              <Flame className="h-3.5 w-3.5 text-[#fdba74]" />
              {studyStreak > 0 ? `${studyStreak}-day streak` : 'Start a streak today'}
            </span>
            {focusToday.minutes > 0 && (
              <span className={skyChip}>
                <Timer className="h-3.5 w-3.5 text-[#a5f3fc]" /> {focusToday.minutes} min focused today
              </span>
            )}
          </>
        }
        actions={
          <>
            <button type="button" className={cn(skyBtn, 'relative')} onClick={() => setTab('messages')}>
              <MessageSquare className="h-4 w-4" /> Messages
              {totalUnread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-lp-red px-1 text-[11px] font-semibold text-white">
                  {totalUnread}
                </span>
              )}
            </button>
            <Link to="/focus" className={skyBtn}>
              <Timer className="h-4 w-4" /> Focus
            </Link>
            <GlowButton to="/ai-learning-assistant">
              <Sparkles className="h-4 w-4" /> Ask Refyn
            </GlowButton>
          </>
        }
      />

      <div className="mt-6 empty:hidden">
        <ClaimGoogleAccountCard />
      </div>

      <Tabs value={activeTab} onValueChange={setTab} className="mt-8">
        <TabsList className="lp-fade h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-lp-line bg-lp-surface/60 p-1.5 [scrollbar-width:none]" style={{ animationDelay: '60ms', animationFillMode: 'both' }}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="relative shrink-0 gap-2 rounded-xl px-3.5 py-2 text-[13.5px] font-medium text-lp-soft transition-all hover:text-white data-[state=active]:bg-lp-blue data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_-8px_rgba(59,130,246,0.8)]"
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {t.value === 'messages' && totalUnread > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-lp-red px-1 text-[10px] font-semibold text-white">
                    {totalUnread}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ═══════════ OVERVIEW ═══════════ */}
        <TabsContent value="overview" className="mt-6 space-y-5 focus-visible:ring-0">
          <MyWorld />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* This week */}
            <Panel delay={80} className="p-6 sm:p-7 lg:col-span-7">
              <PanelHead
                title="This week"
                icon={Clock}
                meta={`${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM')}`}
              />
              <div className="mt-6 flex items-center justify-between gap-6">
                <div>
                  <p className="leading-none">
                    <span className="text-[56px] font-semibold tracking-[-0.05em] tabular-nums text-white">{weekDone}</span>
                    <span className="ml-2 text-[22px] font-medium text-lp-mute">of {weekAssignments.length}</span>
                  </p>
                  <p className="mt-2 text-[14px] text-lp-soft">
                    {weekAssignments.length > 0 ? 'assignments handed in this week' : 'nothing due this week'}
                  </p>
                </div>
                <Ring
                  value={weekAssignments.length > 0 ? weekPct : 100}
                  size={96}
                  stroke={8}
                  label={weekAssignments.length > 0 ? `${weekPct}%` : <Check className="h-6 w-6 text-lp-green" />}
                  tone={weekAssignments.length > 0 ? 'blue' : 'green'}
                />
              </div>

              {focusList.length > 0 ? (
                <ul className="mt-6 space-y-1 border-t border-lp-line pt-4">
                  {focusList.map(({ a, state }) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/task/${a.id}`)}
                        className={cn(
                          'group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]',
                          state === 'overdue' && 'bg-lp-red/[0.06]',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                            state === 'submitted' && 'border-lp-blue bg-lp-blue text-white',
                            state === 'overdue' && 'border-lp-red',
                            state === 'todo' && 'border-lp-line',
                          )}
                        >
                          {state === 'submitted' && <Check className="h-3.5 w-3.5" />}
                          {state === 'overdue' && <span className="h-2 w-2 rounded-full bg-lp-red" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block truncate text-[14.5px]',
                              state === 'submitted' ? 'text-lp-mute line-through decoration-lp-mute/60' : 'font-medium text-white',
                            )}
                          >
                            {a.title}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-2">
                            {a.subject && <span className={chip}>{a.subject}</span>}
                            <span
                              className={cn(
                                'text-[12.5px]',
                                state === 'submitted' ? 'text-lp-mute' : state === 'overdue' ? 'text-lp-red' : 'text-lp-sky',
                              )}
                            >
                              {state === 'submitted' ? 'Handed in · awaiting grade' : dueLabel(a.due_date!)}
                            </span>
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-lp-mute transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  title="All caught up"
                  body="Nothing is due right now. New assignments from your teachers will appear here."
                  className="mt-4 border-t border-lp-line"
                />
              )}

              {nextDeadline && (
                <p className="mt-4 rounded-xl bg-lp-bg/60 px-4 py-3 text-[13px] text-lp-soft">
                  <span className="text-lp-mute">Next deadline:</span>{' '}
                  <span className="font-medium text-white">{nextDeadline.title}</span>, {format(new Date(nextDeadline.due_date!), 'EEE d MMM, p')}
                </p>
              )}
            </Panel>

            {/* Overall grade */}
            <Panel delay={140} className="flex flex-col p-6 sm:p-7 lg:col-span-5">
              <PanelHead
                title="Overall grade"
                icon={GraduationCap}
                meta={`${gradedSubmissions.length} graded`}
              />
              {gradedSubmissions.length > 0 ? (
                <>
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="leading-none">
                        <span className={cn('text-[56px] font-semibold tracking-[-0.05em] tabular-nums', gradeText[tone])}>{avgShown}</span>
                        <span className="text-[26px] font-medium text-lp-mute">%</span>
                      </p>
                      <p className="mt-2 text-[14px] text-lp-soft">average across graded work</p>
                    </div>
                    <Ring value={avgRounded} size={96} stroke={8} tone={tone} label={<span className={cn('text-[26px]', gradeText[tone])}>{gradeLabel(avgRounded)}</span>} />
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {[
                      { label: 'Highest', value: `${Math.max(...gradePcts)}%` },
                      { label: 'Latest', value: `${latestPct}%` },
                      { label: 'Graded', value: `${gradedSubmissions.length}` },
                    ].map(s => (
                      <div key={s.label} className="rounded-2xl border border-lp-line bg-lp-bg/50 px-4 py-3">
                        <p className="text-[20px] font-semibold tabular-nums text-white">{s.value}</p>
                        <p className="text-[12px] text-lp-mute">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 min-h-[140px] flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradeFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis domain={[0, 100]} hide />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgb(var(--lp-line))' }} />
                        <Area type="monotone" dataKey="score" stroke="#7CB4FF" strokeWidth={2.5} fill="url(#gradeFill)" name="Grade" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="No grades yet"
                  body="Once a teacher grades your work, your average and trend will show up here."
                  className="flex-1"
                />
              )}
            </Panel>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            <StatTile
              delay={200}
              icon={Clock}
              label="Due soon"
              value={upcomingAssignments.length}
              detail={
                overdueAssignments.length > 0 ? (
                  <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{overdueAssignments.length} overdue</span>
                ) : upcomingAssignments.length > 0 ? (
                  `Next ${formatDistanceToNow(new Date(upcomingAssignments[0].due_date!), { addSuffix: true })}`
                ) : 'Nothing pending'
              }
              detailTone={overdueAssignments.length > 0 ? 'red' : 'mute'}
              onClick={() => setTab('assignments')}
            />
            <StatTile
              delay={240}
              icon={Book}
              label="Learning paths"
              value={pathProgress.length}
              detail={`${pathProgress.filter(p => p.progress >= 100).length} completed`}
              onClick={() => navigate('/learning-paths')}
            />
            <StatTile
              delay={280}
              icon={Brain}
              label="Questions asked"
              value={aiMessageCount}
              detail={`${aiSessionCount} AI session${aiSessionCount === 1 ? '' : 's'}`}
              onClick={() => navigate('/ai-learning-assistant')}
            />
            <StatTile
              delay={320}
              icon={MessageSquare}
              label="Unread messages"
              value={totalUnread}
              detail={`${contacts.length} contact${contacts.length === 1 ? '' : 's'}`}
              detailTone={totalUnread > 0 ? 'sky' : 'mute'}
              onClick={() => setTab('messages')}
            />
          </div>

          {/* Continue learning */}
          <section className="lp-fade pt-4" style={{ animationDelay: '360ms', animationFillMode: 'both' }}>
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="text-[22px] font-medium tracking-[-0.03em] text-white">Continue learning</h2>
              <Link to="/learning-paths" className="inline-flex items-center gap-1 text-[13.5px] font-medium text-lp-sky transition-colors hover:text-white">
                All paths <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {recentPaths.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {recentPaths.map((pp, i) => {
                  const totalModules = Array.isArray(pp.path?.modules) ? (pp.path!.modules as unknown[]).length : 0;
                  const done = pp.progress >= 100;
                  return (
                    <Panel key={pp.id} delay={380 + i * 60} as="div" className="group">
                      <button
                        type="button"
                        onClick={() => navigate(`/learning-path/${pp.path_id}`)}
                        className="flex h-full w-full flex-col p-5 text-left transition-transform duration-300 group-hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className={chip}>{pp.path?.subject || 'Learning path'}</span>
                          <Ring value={pp.progress} size={44} stroke={5} tone={done ? 'green' : 'blue'} label={<span className="text-[11px]">{pp.progress}%</span>} />
                        </div>
                        <p className="mt-4 line-clamp-2 text-[16px] font-medium leading-snug text-white">{pp.path?.title || 'Learning path'}</p>
                        <p className="mt-1 text-[12.5px] text-lp-mute">
                          {pp.completed_modules?.length || 0}/{totalModules} modules · opened {formatDistanceToNow(new Date(pp.last_accessed_at), { addSuffix: true })}
                        </p>
                        <Bar value={pp.progress} tone={done ? 'green' : 'blue'} className="mt-4" delay={400 + i * 60} />
                        <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-lp-sky transition-colors group-hover:text-white">
                          {done ? 'Review' : 'Continue'} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </button>
                    </Panel>
                  );
                })}
              </div>
            ) : (
              <Panel delay={380}>
                <EmptyState
                  icon={Book}
                  title="No learning paths yet"
                  body="Paths break a topic into short modules with quizzes, pitched at your level."
                  action={<Link to="/learning-paths" className={ghostBtn}>Browse learning paths <ArrowRight className="h-4 w-4" /></Link>}
                />
              </Panel>
            )}
          </section>

          {/* Performance + subjects */}
          <div className="grid grid-cols-1 gap-5 pt-4 lg:grid-cols-12">
            <Panel delay={440} className="flex flex-col p-6 sm:p-7 lg:col-span-7">
              <PanelHead title="Performance over time" icon={TrendingUp} meta="Grade %" />
              {timelineData.length > 0 ? (
                <div className="mt-6 min-h-[256px] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3FE9FF" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="perfStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#3FE9FF" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="rgb(var(--lp-line))" />
                      <XAxis dataKey="date" tick={{ fill: 'rgb(var(--lp-mute))', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'rgb(var(--lp-mute))', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#2A3A5E' }} />
                      <Area type="monotone" dataKey="score" stroke="url(#perfStroke)" strokeWidth={2.5} fill="url(#perfFill)" name="Grade %" activeDot={{ r: 5, fill: '#3FE9FF', stroke: 'rgb(var(--lp-bg))', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState icon={TrendingUp} title="No graded assignments yet" body="Your grade trend will draw itself here as work gets marked." />
              )}
            </Panel>

            <Panel delay={500} className="p-6 sm:p-7 lg:col-span-5">
              <PanelHead title="By subject" icon={Book} meta={`${subjectStats.length} subject${subjectStats.length === 1 ? '' : 's'}`} />
              {subjectStats.length > 0 ? (
                <ul className="mt-6 space-y-5">
                  {subjectStats.map((s, i) => {
                    const t = gradeTone(s.average);
                    return (
                      <li key={s.subject}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[14.5px] font-medium text-white">{s.subject}</span>
                          <span className={cn('text-[15px] font-semibold tabular-nums', s.average > 0 ? gradeText[t] : 'text-lp-mute')}>
                            {s.average > 0 ? `${s.average}%` : '—'}
                          </span>
                        </div>
                        <Bar value={s.average} tone={t} className="mt-2" delay={520 + i * 80} />
                        <p className="mt-1.5 text-[12px] text-lp-mute">{s.completed} of {s.total} graded · {s.pending} pending</p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={Book} title="No subjects yet" body="Subjects appear as your teachers set assignments." />
              )}
            </Panel>
          </div>

          {/* Recent grades + Ask Refyn */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <Panel delay={560} className="p-6 sm:p-7 lg:col-span-7">
              <PanelHead title="Recent grades" icon={FileText} meta={recentGrades.length > 0 ? 'Latest first' : undefined} />
              {recentGrades.length > 0 ? (
                <ul className="mt-5 divide-y divide-lp-line">
                  {recentGrades.map(sub => {
                    const assignment = assignments.find(a => a.id === sub.assignment_id);
                    const pct = Math.round((sub.grade! / sub.max_grade) * 100);
                    const t = gradeTone(pct);
                    return (
                      <li key={sub.id} className="flex items-center gap-4 py-3.5">
                        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-[16px] font-semibold', {
                          'border-lp-green/30 bg-lp-green/10 text-lp-green': t === 'green',
                          'border-lp-sky/30 bg-lp-sky/10 text-lp-sky': t === 'blue',
                          'border-[#FBBF24]/30 bg-[#FBBF24]/10 text-[#FBBF24]': t === 'amber',
                          'border-lp-red/30 bg-lp-red/10 text-lp-red': t === 'red',
                        })}>
                          {gradeLabel(pct)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14.5px] font-medium text-white">{assignment?.title || 'Assignment'}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-lp-mute">
                            {assignment?.subject && <span className={chip}>{assignment.subject}</span>}
                            {sub.graded_at && `Graded ${formatDistanceToNow(new Date(sub.graded_at), { addSuffix: true })}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={cn('text-[17px] font-semibold tabular-nums', gradeText[t])}>{pct}%</p>
                          <p className="text-[11.5px] tabular-nums text-lp-mute">{sub.grade}/{sub.max_grade}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={FileText} title="No grades yet" body="Marked work and feedback from your teachers will be listed here." />
              )}
            </Panel>

            <Panel delay={620} className="relative overflow-hidden p-6 sm:p-7 lg:col-span-5">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-50 blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(63,233,255,0.45), transparent 70%)' }}
              />
              <div className="relative">
                <PanelHead title="Ask Refyn" icon={Sparkles} />
                <p className="mt-4 text-[20px] leading-snug tracking-[-0.02em] text-white">
                  Stuck on homework? Refyn won't hand you the answer. It'll help you get there yourself.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {AI_PROMPTS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => navigate('/ai-learning-assistant')}
                      className="rounded-full border border-lp-line bg-lp-bg/50 px-3 py-1.5 text-[12.5px] text-lp-soft transition-all hover:border-lp-blue/50 hover:text-white"
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-lp-line bg-lp-bg/50 p-4">
                    <p className="text-[24px] font-semibold tabular-nums text-white">{aiSessionCount}</p>
                    <p className="text-[12px] text-lp-mute">conversations</p>
                  </div>
                  <div className="rounded-2xl border border-lp-line bg-lp-bg/50 p-4">
                    <p className="text-[24px] font-semibold tabular-nums text-white">{aiMessageCount}</p>
                    <p className="text-[12px] text-lp-mute">questions asked</p>
                  </div>
                </div>
                <GlowButton to="/ai-learning-assistant" className="mt-6">
                  Open the assistant <ArrowRight className="h-4 w-4" />
                </GlowButton>
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* ═══════════ MY PLAN ═══════════ */}
        <TabsContent value="myplan" className="mt-6">
          <div className="lp-fade mx-auto max-w-2xl">
            <StudentPlanCard />
          </div>
        </TabsContent>

        {/* ═══════════ ASSIGNMENTS ═══════════ */}
        <TabsContent value="assignments" className="mt-6">
          <div className="lp-fade">
            <StudentAssignmentView />
          </div>
        </TabsContent>

        {/* ═══════════ PROGRESS ═══════════ */}
        <TabsContent value="progress" className="mt-6 space-y-5">
          <Panel className="p-6 sm:p-7">
            <PanelHead title="Subject performance" icon={TrendingUp} meta="Average grade %" />
            {subjectStats.length > 0 ? (
              <div className="mt-6 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectStats.map(s => ({ name: s.subject, average: s.average }))} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3FE9FF" />
                        <stop offset="100%" stopColor="#3B82F6" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="rgb(var(--lp-line))" />
                    <XAxis dataKey="name" tick={{ fill: 'rgb(var(--lp-mute))', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'rgb(var(--lp-mute))', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(124,180,255,0.06)' }} />
                    <ReBar dataKey="average" name="Average Grade %" radius={[8, 8, 0, 0]} maxBarSize={56}>
                      {subjectStats.map(s => <Cell key={s.subject} fill="url(#barFill)" />)}
                    </ReBar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={TrendingUp} title="No grade data yet" body="Subject averages appear once assignments are graded." />
            )}
          </Panel>

          {subjectStats.length > 0 && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {subjectStats.map((stat, i) => {
                const t = gradeTone(stat.average);
                return (
                  <Panel key={stat.subject} delay={60 + i * 50} className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-[17px] font-medium text-white">{stat.subject}</p>
                        <p className="mt-1 text-[12.5px] text-lp-mute">{stat.progressPct}% of work graded</p>
                      </div>
                      <Ring
                        value={stat.average}
                        size={64}
                        stroke={6}
                        tone={t}
                        label={<span className={cn('text-[13px]', stat.average > 0 ? gradeText[t] : 'text-lp-mute')}>{stat.average > 0 ? `${stat.average}%` : '—'}</span>}
                      />
                    </div>
                    <Bar value={stat.progressPct} className="mt-5" />
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-lp-line bg-lp-bg/50 p-3.5">
                        <p className="text-[12px] text-lp-mute">Completed</p>
                        <p className="text-[22px] font-semibold tabular-nums text-white">{stat.completed}</p>
                      </div>
                      <div className="rounded-2xl border border-lp-line bg-lp-bg/50 p-3.5">
                        <p className="text-[12px] text-lp-mute">Pending</p>
                        <p className="text-[22px] font-semibold tabular-nums text-white">{stat.pending}</p>
                      </div>
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}

          <Panel className="p-6 sm:p-7">
            <PanelHead title="Learning paths" icon={Book} meta={`${pathProgress.length} enrolled`} />
            {pathProgress.length > 0 ? (
              <ul className="mt-5 space-y-2">
                {pathProgress.map(pp => {
                  const totalModules = Array.isArray(pp.path?.modules) ? (pp.path!.modules as unknown[]).length : 0;
                  const done = pp.progress >= 100;
                  return (
                    <li key={pp.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/learning-path/${pp.path_id}`)}
                        className="group flex w-full items-center gap-4 rounded-2xl border border-lp-line bg-lp-bg/40 p-4 text-left transition-all hover:border-lp-blue/40 hover:bg-lp-bg/70"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lp-raised text-lp-sky">
                          <Book className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14.5px] font-medium text-white">{pp.path?.title || 'Learning Path'}</p>
                          <p className="mt-0.5 text-[12.5px] text-lp-mute">{pp.path?.subject} · {pp.completed_modules?.length || 0}/{totalModules} modules</p>
                          <Bar value={pp.progress} tone={done ? 'green' : 'blue'} className="mt-2" />
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium', done ? 'bg-lp-green/15 text-lp-green' : 'bg-lp-blue/15 text-lp-sky')}>
                          {done ? 'Complete' : `${pp.progress}%`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={Book}
                title="No learning paths started yet"
                action={<Link to="/learning-paths" className={ghostBtn}>Browse learning paths <ArrowRight className="h-4 w-4" /></Link>}
              />
            )}
          </Panel>
        </TabsContent>

        {/* ═══════════ AI LEARNING ═══════════ */}
        <TabsContent value="learning" className="mt-6">
          <FeatureGate feature="aiAssistant">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Panel className="relative overflow-hidden p-7">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-50 blur-3xl"
                  style={{ background: 'radial-gradient(circle, rgba(63,233,255,0.4), transparent 70%)' }}
                />
                <div className="relative">
                  <PanelHead title="AI Learning Assistant" icon={Brain} />
                  <p className="mt-4 text-[20px] leading-snug tracking-[-0.02em] text-white">Get help with your studies, the guided way.</p>
                  <ul className="mt-5 space-y-2.5">
                    {['Answering questions about assignments', 'Explaining difficult concepts', 'Providing study tips', 'Creating practice questions'].map(item => (
                      <li key={item} className="flex items-center gap-2.5 text-[14px] text-lp-soft">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lp-green/15 text-lp-green">
                          <Check className="h-3 w-3" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <GlowButton to="/ai-learning-assistant" className="mt-7">
                    <Brain className="h-4 w-4" /> Open AI Assistant
                  </GlowButton>
                </div>
              </Panel>

              <Panel delay={60} className="p-7">
                <PanelHead title="Your AI activity" icon={TrendingUp} meta="Real usage" />
                <ul className="mt-6 space-y-3">
                  {[
                    { label: 'Chat sessions', desc: 'Total conversations', value: aiSessionCount },
                    { label: 'Questions asked', desc: 'To the AI assistant', value: aiMessageCount },
                    { label: 'Learning paths', desc: 'Active paths', value: pathProgress.length },
                  ].map(row => (
                    <li key={row.label} className="flex items-center justify-between rounded-2xl border border-lp-line bg-lp-bg/50 px-5 py-4">
                      <div>
                        <p className="text-[14.5px] font-medium text-white">{row.label}</p>
                        <p className="text-[12.5px] text-lp-mute">{row.desc}</p>
                      </div>
                      <p className="text-[28px] font-semibold tabular-nums text-white">{row.value}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </FeatureGate>
        </TabsContent>

        {/* ═══════════ MESSAGES ═══════════ */}
        <TabsContent value="messages" className="mt-6">
          <Panel className="h-[calc(100vh-18rem)] min-h-[480px] overflow-hidden">
            <div className="grid h-full md:grid-cols-3">
              {/* Contact list */}
              <div className={cn('flex min-h-0 flex-col border-lp-line md:border-r', activeContact && 'hidden md:flex')}>
                <div className="border-b border-lp-line p-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
                    <input
                      placeholder="Search contacts…"
                      value={contactSearch}
                      onChange={e => setContactSearch(e.target.value)}
                      className="h-10 w-full rounded-xl border border-lp-line bg-lp-bg/60 pl-10 pr-3 text-[14px] text-white placeholder:text-lp-mute outline-none transition focus:border-lp-blue/60"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {filteredContacts.length > 0 ? filteredContacts.map(c => (
                    <button
                      key={c.user_id}
                      type="button"
                      onClick={() => setActiveContact(c)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        activeContact?.user_id === c.user_id ? 'bg-lp-blue/15' : 'hover:bg-white/[0.04]',
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lp-blue to-[#1E3A8A] text-[12px] font-semibold text-white">
                        {getInitials(c.full_name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-white">{c.full_name}</span>
                      {(unreadCounts[c.user_id] || 0) > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-lp-red px-1 text-[11px] font-semibold text-white">
                          {unreadCounts[c.user_id]}
                        </span>
                      )}
                    </button>
                  )) : (
                    <p className="py-10 text-center text-[13.5px] text-lp-mute">No contacts found</p>
                  )}
                </div>
              </div>

              {/* Chat area */}
              <div className={cn('min-h-0 flex-col md:col-span-2', activeContact ? 'flex' : 'hidden md:flex')}>
                {activeContact ? (
                  <>
                    <div className="flex items-center gap-3 border-b border-lp-line px-5 py-3.5">
                      <button type="button" onClick={() => setActiveContact(null)} className="text-[13px] text-lp-sky md:hidden">
                        ← Back
                      </button>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-lp-blue to-[#1E3A8A] text-[12px] font-semibold text-white">
                        {getInitials(activeContact.full_name)}
                      </span>
                      <p className="font-medium text-white">{activeContact.full_name}</p>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto p-5">
                      {messages.length > 0 ? messages.map(m => {
                        const isMe = m.sender_id === user?.id;
                        return (
                          <div key={m.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                            <div
                              className={cn(
                                'max-w-[75%] rounded-2xl px-4 py-2.5',
                                isMe ? 'rounded-br-md bg-lp-blue text-white' : 'rounded-bl-md border border-lp-line bg-lp-raised text-lp-text',
                              )}
                            >
                              <p className="text-[14px] leading-relaxed">{m.content}</p>
                              <p className={cn('mt-1 text-right text-[11px]', isMe ? 'text-white/70' : 'text-lp-mute')}>
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="flex h-full items-center justify-center text-[14px] text-lp-mute">
                          No messages yet. Start a conversation!
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="border-t border-lp-line p-3">
                      <div className="flex gap-2">
                        <input
                          placeholder="Type a message…"
                          value={messageText}
                          onChange={e => setMessageText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                          className="h-11 flex-1 rounded-xl border border-lp-line bg-lp-bg/60 px-4 text-[14px] text-white placeholder:text-lp-mute outline-none transition focus:border-lp-blue/60"
                        />
                        <button
                          type="button"
                          onClick={sendMessage}
                          disabled={!messageText.trim()}
                          aria-label="Send message"
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-lp-blue text-white transition-all hover:bg-[#2F6FE0] disabled:opacity-40"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState icon={MessageSquare} title="Select a contact" body="Pick someone on the left to start messaging." className="h-full" />
                )}
              </div>
            </div>
          </Panel>
        </TabsContent>

        {/* ═══════════ ADAPTIVE PROFILE ═══════════ */}
        <TabsContent value="adaptive" className="mt-6">
          <div className="lp-fade">
            <FeatureGate feature="adaptiveProfile">
              <AdaptiveLearningProfile />
            </FeatureGate>
          </div>
        </TabsContent>

        {/* ═══════════ QUIZ LIBRARY ═══════════ */}
        <TabsContent value="quizzes" className="mt-6">
          <div className="lp-fade">
            <FeatureGate feature="quizPractice">
              {practiceSessionId ? (
                <LiveQuizPlayer sessionId={practiceSessionId} onExit={() => setPracticeSessionId(null)} />
              ) : (
                <QuizLibrary onStartPractice={(id) => setPracticeSessionId(id)} />
              )}
            </FeatureGate>
          </div>
        </TabsContent>
      </Tabs>
      <PilotFeedbackPrompt context="student" />
    </>,
  );
};

export default StudentDashboard;
