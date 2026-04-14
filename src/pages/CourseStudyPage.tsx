import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, BookOpen, Brain, FileText, Sparkles, Timer, ChevronRight,
  ChevronDown, CheckCircle2, Circle, Loader, RotateCcw, Zap, GraduationCap,
  Layers, ArrowRight, Clock, PenLine, StickyNote
} from 'lucide-react';

interface CourseInfo {
  id: string; title: string; curriculum_type: string; subject: string;
  level: string; description: string; icon_emoji: string; estimated_hours: number;
}

interface Topic {
  id: string; course_id: string; parent_topic_id: string | null;
  title: string; description: string; topic_order: number; topic_code: string | null;
  children?: Topic[];
}

interface TopicMastery {
  topic_id: string; mastery_level: number; questions_attempted: number; questions_correct: number;
}

interface Flashcard {
  id: string; front: string; back: string; difficulty: number;
  next_review_at: string; review_count: number; ease_factor: number; interval_days: number;
}

interface FRQPart {
  label: string; text: string; marks: number; commandTerm?: string; modelAnswer: string; examinerTip?: string;
}

interface FRQuestion {
  question: string; totalMarks: number; parts: FRQPart[]; difficulty: string; topic?: string;
}

const CourseStudyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [mastery, setMastery] = useState<Record<string, TopicMastery>>({});
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState('syllabus');
  const [loading, setLoading] = useState(true);

  // Study tools state
  const [cheatsheet, setCheatsheet] = useState<string | null>(null);
  const [generatingCheatsheet, setGeneratingCheatsheet] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [mockQuestions, setMockQuestions] = useState<any[]>([]);
  const [generatingMock, setGeneratingMock] = useState(false);
  const [mockAnswers, setMockAnswers] = useState<Record<number, number>>({});
  const [mockSubmitted, setMockSubmitted] = useState(false);
  const [mockTimeLeft, setMockTimeLeft] = useState(0);
  const [mockTimerActive, setMockTimerActive] = useState(false);
  const [frqQuestions, setFrqQuestions] = useState<FRQuestion[]>([]);
  const [generatingFrq, setGeneratingFrq] = useState(false);
  const [frqShowAnswers, setFrqShowAnswers] = useState<Record<string, boolean>>({});

  useEffect(() => { if (id) fetchCourseData(); }, [id, user]);

  const fetchCourseData = async () => {
    if (!user || !id) return;
    setLoading(true);
    try {
      const [{ data: courseData }, { data: topicsData }, { data: masteryData }] = await Promise.all([
        supabase.from('courses').select('*').eq('id', id).single() as any,
        supabase.from('course_topics').select('*').eq('course_id', id).order('topic_order') as any,
        supabase.from('student_topic_mastery').select('*').eq('user_id', user.id).eq('course_id', id) as any,
      ]);
      setCourse(courseData);
      const topicMap = new Map<string, Topic>();
      const rootTopics: Topic[] = [];
      (topicsData || []).forEach((t: Topic) => { topicMap.set(t.id, { ...t, children: [] }); });
      topicMap.forEach(t => {
        if (t.parent_topic_id && topicMap.has(t.parent_topic_id)) {
          topicMap.get(t.parent_topic_id)!.children!.push(t);
        } else {
          rootTopics.push(t);
        }
      });
      setTopics(rootTopics);
      const m: Record<string, TopicMastery> = {};
      (masteryData || []).forEach((d: any) => { m[d.topic_id] = d; });
      setMastery(m);
      if (rootTopics.length > 0) setExpandedTopics(new Set([rootTopics[0].id]));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      next.has(topicId) ? next.delete(topicId) : next.add(topicId);
      return next;
    });
  };

  const getMasteryColor = (level: number) => {
    if (level >= 80) return 'text-green-600';
    if (level >= 50) return 'text-amber-600';
    if (level > 0) return 'text-orange-500';
    return 'text-muted-foreground';
  };

  const getMasteryIcon = (level: number) => {
    if (level >= 80) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (level > 0) return <Circle className="h-4 w-4 text-amber-500 fill-amber-200" />;
    return <Circle className="h-4 w-4 text-muted-foreground/40" />;
  };

  const callStudyContent = async (type: string, topic: Topic) => {
    if (!course) throw new Error('No course');
    const { data, error } = await supabase.functions.invoke('generate-course-study-content', {
      body: { type, courseTitle: course.title, curriculumType: course.curriculum_type, subject: course.subject, level: course.level, topicTitle: topic.title, topicDescription: topic.description, topicCode: topic.topic_code },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Failed');
    return data;
  };

  const generateCheatsheet = async (topic: Topic) => {
    setGeneratingCheatsheet(true);
    setCheatsheet(null);
    try {
      const data = await callStudyContent('cheatsheet', topic);
      setCheatsheet(data.content);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate cheatsheet');
    } finally {
      setGeneratingCheatsheet(false);
    }
  };

  const generateNotes = async (topic: Topic) => {
    setGeneratingNotes(true);
    setNotes(null);
    try {
      const data = await callStudyContent('notes', topic);
      setNotes(data.content);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate notes');
    } finally {
      setGeneratingNotes(false);
    }
  };

  const generateFlashcards = async (topic: Topic) => {
    if (!user) return;
    setGeneratingFlashcards(true);
    try {
      const data = await callStudyContent('flashcards', topic);
      const cards = (data.flashcards || []).map((f: any) => ({
        course_id: course!.id, topic_id: topic.id, user_id: user.id, front: f.front, back: f.back,
      }));
      if (cards.length > 0) {
        await supabase.from('course_flashcards').insert(cards as any);
      }
      setFlashcards(data.flashcards.map((f: any, i: number) => ({
        id: `temp-${i}`, front: f.front, back: f.back, difficulty: 1,
        next_review_at: new Date().toISOString(), review_count: 0, ease_factor: 2.5, interval_days: 1,
      })));
      setCurrentFlashcardIndex(0);
      setFlashcardFlipped(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate flashcards');
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const generateMockExam = async (topic: Topic) => {
    setGeneratingMock(true);
    setMockQuestions([]);
    setMockAnswers({});
    setMockSubmitted(false);
    try {
      const data = await callStudyContent('mock_exam', topic);
      setMockQuestions(data.questions || []);
      const time = (data.questions?.length || 5) * 120;
      setMockTimeLeft(time);
      setMockTimerActive(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate mock exam');
    } finally {
      setGeneratingMock(false);
    }
  };

  const generateFRQ = async (topic: Topic) => {
    setGeneratingFrq(true);
    setFrqQuestions([]);
    setFrqShowAnswers({});
    try {
      const data = await callStudyContent('frq', topic);
      setFrqQuestions(data.questions || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate questions');
    } finally {
      setGeneratingFrq(false);
    }
  };

  useEffect(() => {
    if (!mockTimerActive || mockTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setMockTimeLeft(prev => {
        if (prev <= 1) { setMockTimerActive(false); setMockSubmitted(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mockTimerActive, mockTimeLeft]);

  const submitMock = async () => {
    setMockSubmitted(true);
    setMockTimerActive(false);
    if (selectedTopic && user && course) {
      const correct = mockQuestions.filter((q, i) => mockAnswers[i] === q.correctIndex).length;
      const score = Math.round((correct / mockQuestions.length) * 100);
      const existing = mastery[selectedTopic.id];
      const newAttempted = (existing?.questions_attempted || 0) + mockQuestions.length;
      const newCorrect = (existing?.questions_correct || 0) + correct;
      const newMastery = Math.round((newCorrect / newAttempted) * 100);
      await supabase.from('student_topic_mastery').upsert({
        user_id: user.id, course_id: course.id, topic_id: selectedTopic.id,
        mastery_level: newMastery, questions_attempted: newAttempted,
        questions_correct: newCorrect, last_studied_at: new Date().toISOString(),
      } as any, { onConflict: 'user_id,topic_id' });
      setMastery(prev => ({
        ...prev,
        [selectedTopic.id]: { topic_id: selectedTopic.id, mastery_level: newMastery, questions_attempted: newAttempted, questions_correct: newCorrect },
      }));
      toast.success(`Score: ${correct}/${mockQuestions.length} (${score}%)`);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const overallMastery = Object.values(mastery).length > 0
    ? Math.round(Object.values(mastery).reduce((s, m) => s + m.mastery_level, 0) / Object.values(mastery).length)
    : 0;

  // Reset study content when topic changes
  useEffect(() => {
    setCheatsheet(null);
    setNotes(null);
    setFlashcards([]);
    setMockQuestions([]);
    setFrqQuestions([]);
    setMockSubmitted(false);
    setMockTimerActive(false);
  }, [selectedTopic?.id]);

  if (loading) return <div className="flex h-screen bg-background"><DashboardSidebar /><div className="flex-1 flex items-center justify-center text-muted-foreground">Loading course...</div></div>;
  if (!course) return <div className="flex h-screen bg-background"><DashboardSidebar /><div className="flex-1 flex items-center justify-center">Course not found</div></div>;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Top Bar */}
        <div className="border-b px-6 py-4 flex items-center gap-4 bg-card">
          <Button variant="ghost" size="icon" onClick={() => navigate('/my-courses')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-2xl">{course.icon_emoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{course.title}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{course.curriculum_type.toUpperCase()}</Badge>
              <span className="text-xs text-muted-foreground">{course.subject} · {course.level}</span>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium">{overallMastery}% mastery</p>
            <Progress value={overallMastery} className="h-1.5 w-24" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Syllabus Tree */}
          <ScrollArea className="w-80 border-r bg-card/50 hidden lg:block">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">SYLLABUS</h3>
              {topics.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No topics found for this course.</p>
              ) : topics.map(topic => (
                <div key={topic.id} className="mb-1">
                  <button
                    onClick={() => {
                      toggleExpand(topic.id);
                      if (!topic.children?.length) { setSelectedTopic(topic); setTab('study'); }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-accent transition-colors ${selectedTopic?.id === topic.id ? 'bg-accent font-medium' : ''}`}
                  >
                    {topic.children && topic.children.length > 0 ? (
                      expandedTopics.has(topic.id) ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    ) : getMasteryIcon(mastery[topic.id]?.mastery_level || 0)}
                    <span className="flex-1 truncate">{topic.topic_code ? `${topic.topic_code}: ` : ''}{topic.title}</span>
                    {mastery[topic.id] && (
                      <span className={`text-xs font-mono ${getMasteryColor(mastery[topic.id].mastery_level)}`}>
                        {mastery[topic.id].mastery_level}%
                      </span>
                    )}
                  </button>
                  {expandedTopics.has(topic.id) && topic.children?.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => { setSelectedTopic(sub); setTab('study'); }}
                      className={`w-full text-left pl-8 pr-3 py-1.5 rounded-lg text-xs flex items-center gap-2 hover:bg-accent transition-colors ${selectedTopic?.id === sub.id ? 'bg-accent font-medium' : ''}`}
                    >
                      {getMasteryIcon(mastery[sub.id]?.mastery_level || 0)}
                      <span className="flex-1 truncate">{sub.topic_code ? `${sub.topic_code}: ` : ''}{sub.title}</span>
                      {mastery[sub.id] && (
                        <span className={`text-xs font-mono ${getMasteryColor(mastery[sub.id].mastery_level)}`}>
                          {mastery[sub.id].mastery_level}%
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Right: Content Area */}
          <div className="flex-1 overflow-y-auto">
            {!selectedTopic ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <GraduationCap className="h-16 w-16 mb-4 opacity-30" />
                <h3 className="text-lg font-semibold mb-1">Select a topic</h3>
                <p className="text-sm">Choose a topic from the syllabus to start studying</p>
                <div className="lg:hidden w-full max-w-md mt-6 space-y-2 px-4">
                  {topics.map(t => (
                    <Button key={t.id} variant="outline" className="w-full justify-start gap-2" onClick={() => { setSelectedTopic(t); setTab('study'); }}>
                      {t.topic_code && <Badge variant="secondary" className="text-xs">{t.topic_code}</Badge>}
                      {t.title}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 max-w-4xl mx-auto">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    {selectedTopic.topic_code && <Badge variant="outline">{selectedTopic.topic_code}</Badge>}
                    <h2 className="text-xl font-bold">{selectedTopic.title}</h2>
                  </div>
                  {selectedTopic.description && <p className="text-sm text-muted-foreground">{selectedTopic.description}</p>}
                </div>

                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="mb-6 flex-wrap h-auto gap-1">
                    <TabsTrigger value="study" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Cheatsheet</TabsTrigger>
                    <TabsTrigger value="notes" className="gap-1.5"><StickyNote className="h-3.5 w-3.5" /> Notes</TabsTrigger>
                    <TabsTrigger value="flashcards" className="gap-1.5"><Layers className="h-3.5 w-3.5" /> Flashcards</TabsTrigger>
                    <TabsTrigger value="mock" className="gap-1.5"><Timer className="h-3.5 w-3.5" /> MCQ Exam</TabsTrigger>
                    <TabsTrigger value="frq" className="gap-1.5"><PenLine className="h-3.5 w-3.5" /> FRQ / Past Papers</TabsTrigger>
                    <TabsTrigger value="ai-tutor" className="gap-1.5"><Brain className="h-3.5 w-3.5" /> AI Tutor</TabsTrigger>
                  </TabsList>

                  {/* Cheatsheet */}
                  <TabsContent value="study">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Cheatsheet
                          </CardTitle>
                          <Button size="sm" onClick={() => generateCheatsheet(selectedTopic)} disabled={generatingCheatsheet}>
                            {generatingCheatsheet ? <><Loader className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating...</>
                              : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> {cheatsheet ? 'Regenerate' : 'Generate Cheatsheet'}</>}
                          </Button>
                        </div>
                        <CardDescription>AI-generated comprehensive cheatsheet for {course.curriculum_type.toUpperCase()} {course.level}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {cheatsheet ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>{cheatsheet}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="mb-2">Generate a comprehensive cheatsheet with:</p>
                            <div className="text-xs space-y-1">
                              <p>📋 Key definitions · 📐 Formulas · 🔍 Worked examples</p>
                              <p>⚠️ Common mistakes · 💡 Exam tips · 🔗 Topic connections</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Notes */}
                  <TabsContent value="notes">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <StickyNote className="h-4 w-4" /> Study Notes
                          </CardTitle>
                          <Button size="sm" onClick={() => generateNotes(selectedTopic)} disabled={generatingNotes}>
                            {generatingNotes ? <><Loader className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating...</>
                              : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> {notes ? 'Regenerate' : 'Generate Notes'}</>}
                          </Button>
                        </div>
                        <CardDescription>Comprehensive study notes like a textbook chapter</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {notes ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>{notes}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="mb-2">Generate detailed study notes with:</p>
                            <div className="text-xs space-y-1">
                              <p>📖 Complete topic coverage · 🧮 Worked examples</p>
                              <p>📌 Key vocabulary · 🎯 Learning objectives · ✅ Self-check questions</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Flashcards */}
                  <TabsContent value="flashcards">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Layers className="h-4 w-4" /> Flashcards
                          </CardTitle>
                          <Button size="sm" onClick={() => generateFlashcards(selectedTopic)} disabled={generatingFlashcards}>
                            {generatingFlashcards ? <><Loader className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating...</>
                              : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate Flashcards</>}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {flashcards.length > 0 ? (
                          <div className="space-y-4">
                            <div className="text-center text-xs text-muted-foreground">
                              Card {currentFlashcardIndex + 1} of {flashcards.length}
                            </div>
                            <div
                              onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                              className="cursor-pointer min-h-[200px] rounded-xl border-2 border-primary/20 bg-gradient-to-br from-card to-accent/20 flex items-center justify-center p-8 transition-all hover:shadow-lg hover:border-primary/40"
                            >
                              <div className="text-center">
                                <Badge variant="secondary" className="mb-3">{flashcardFlipped ? 'Answer' : 'Question'}</Badge>
                                <p className="text-lg font-medium">
                                  {flashcardFlipped ? flashcards[currentFlashcardIndex].back : flashcards[currentFlashcardIndex].front}
                                </p>
                                {!flashcardFlipped && <p className="text-xs text-muted-foreground mt-3">Click to flip</p>}
                              </div>
                            </div>
                            <div className="flex justify-center gap-3">
                              <Button variant="outline" size="sm" disabled={currentFlashcardIndex === 0} onClick={() => { setCurrentFlashcardIndex(prev => prev - 1); setFlashcardFlipped(false); }}>
                                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Prev
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => { setFlashcardFlipped(false); setCurrentFlashcardIndex(0); }}>
                                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                              </Button>
                              <Button variant="outline" size="sm" disabled={currentFlashcardIndex >= flashcards.length - 1} onClick={() => { setCurrentFlashcardIndex(prev => prev + 1); setFlashcardFlipped(false); }}>
                                Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Generate AI flashcards for spaced-repetition study</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* MCQ Mock Exam */}
                  <TabsContent value="mock">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Timer className="h-4 w-4" /> Multiple Choice Exam
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            {mockTimerActive && (
                              <Badge variant={mockTimeLeft < 60 ? 'destructive' : 'secondary'} className="font-mono">
                                <Clock className="h-3 w-3 mr-1" /> {formatTime(mockTimeLeft)}
                              </Badge>
                            )}
                            <Button size="sm" onClick={() => generateMockExam(selectedTopic)} disabled={generatingMock}>
                              {generatingMock ? <><Loader className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating...</>
                                : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> {mockQuestions.length > 0 ? 'New Exam' : 'Start Mock Exam'}</>}
                            </Button>
                          </div>
                        </div>
                        <CardDescription>Timed {course.curriculum_type.toUpperCase()}-style MCQ assessment</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {mockQuestions.length > 0 ? (
                          <div className="space-y-6">
                            {mockQuestions.map((q, qi) => (
                              <div key={qi} className="space-y-3">
                                <div className="flex items-start gap-2">
                                  <Badge variant="outline" className="shrink-0 mt-0.5">{qi + 1}</Badge>
                                  <div>
                                    <p className="text-sm font-medium">{q.question}</p>
                                    {q.marks && <span className="text-xs text-muted-foreground">[{q.marks} marks]</span>}
                                  </div>
                                </div>
                                <div className="space-y-2 pl-8">
                                  {q.options.map((opt: string, oi: number) => {
                                    const selected = mockAnswers[qi] === oi;
                                    const isCorrect = oi === q.correctIndex;
                                    let cls = 'border rounded-lg px-3 py-2 text-sm cursor-pointer transition-all ';
                                    if (mockSubmitted) {
                                      if (isCorrect) cls += 'border-green-500 bg-green-50 dark:bg-green-950/30';
                                      else if (selected && !isCorrect) cls += 'border-red-500 bg-red-50 dark:bg-red-950/30';
                                      else cls += 'border-border opacity-60';
                                    } else {
                                      cls += selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50';
                                    }
                                    return (
                                      <button key={oi} className={`w-full text-left ${cls}`}
                                        onClick={() => !mockSubmitted && setMockAnswers(prev => ({ ...prev, [qi]: oi }))}
                                        disabled={mockSubmitted}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                                {mockSubmitted && q.explanation && (
                                  <div className="pl-8 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                                    <strong>Explanation:</strong> {q.explanation}
                                  </div>
                                )}
                              </div>
                            ))}
                            {!mockSubmitted && (
                              <Button className="w-full" onClick={submitMock}>Submit Answers</Button>
                            )}
                            {mockSubmitted && (
                              <Card className="bg-muted/50">
                                <CardContent className="pt-4 text-center">
                                  <p className="text-2xl font-bold mb-1">
                                    {mockQuestions.filter((q, i) => mockAnswers[i] === q.correctIndex).length}/{mockQuestions.length}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {Math.round((mockQuestions.filter((q, i) => mockAnswers[i] === q.correctIndex).length / mockQuestions.length) * 100)}% correct
                                  </p>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <Timer className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Generate a timed {course.curriculum_type.toUpperCase()} mock exam with real exam-style MCQs</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* FRQ / Past Papers */}
                  <TabsContent value="frq">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <PenLine className="h-4 w-4" /> Free Response & Past Paper Questions
                          </CardTitle>
                          <Button size="sm" onClick={() => generateFRQ(selectedTopic)} disabled={generatingFrq}>
                            {generatingFrq ? <><Loader className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating...</>
                              : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> {frqQuestions.length > 0 ? 'New Questions' : 'Generate FRQs'}</>}
                          </Button>
                        </div>
                        <CardDescription>
                          {course.curriculum_type === 'ib' ? 'IB command-term based structured questions with mark schemes' :
                           course.curriculum_type === 'ap' ? 'AP-style free response questions with scoring guidelines' :
                           course.curriculum_type === 'igcse' ? 'Cambridge past-paper style structured questions' :
                           'Structured exam questions with model answers'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {frqQuestions.length > 0 ? (
                          <div className="space-y-8">
                            {frqQuestions.map((q, qi) => (
                              <div key={qi} className="border rounded-xl p-5 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2">
                                    <Badge className="shrink-0 mt-0.5">{qi + 1}</Badge>
                                    <p className="text-sm font-semibold">{q.question}</p>
                                  </div>
                                  <Badge variant="secondary" className="shrink-0">{q.totalMarks} marks</Badge>
                                </div>
                                
                                <div className="space-y-3 pl-6">
                                  {q.parts.map((part, pi) => (
                                    <div key={pi} className="space-y-2">
                                      <div className="flex items-start gap-2">
                                        <span className="text-sm font-medium text-primary">({part.label})</span>
                                        <div className="flex-1">
                                          <p className="text-sm">{part.text}</p>
                                          <div className="flex gap-2 mt-1">
                                            <Badge variant="outline" className="text-xs">{part.marks} marks</Badge>
                                            {part.commandTerm && (
                                              <Badge variant="secondary" className="text-xs">{part.commandTerm}</Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFrqShowAnswers(prev => ({ ...prev, [qi]: !prev[qi] }))}
                                  >
                                    {frqShowAnswers[qi] ? 'Hide' : 'Show'} Model Answers
                                  </Button>

                                  {frqShowAnswers[qi] && (
                                    <div className="mt-3 space-y-3">
                                      {q.parts.map((part, pi) => (
                                        <div key={pi} className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3">
                                          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">({part.label}) Model Answer [{part.marks} marks]</p>
                                          <p className="text-sm">{part.modelAnswer}</p>
                                          {part.examinerTip && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 italic">
                                              💡 Examiner tip: {part.examinerTip}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <PenLine className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="mb-2">Generate past-paper style free response questions</p>
                            <div className="text-xs space-y-1">
                              {course.curriculum_type === 'ib' && <p>📝 IB command terms · Mark allocations · Model answers</p>}
                              {course.curriculum_type === 'ap' && <p>📝 AP FRQ format · Scoring guidelines · Model responses</p>}
                              {course.curriculum_type === 'igcse' && <p>📝 Cambridge structured Qs · Mark schemes · Examiner tips</p>}
                              <p>Multi-part questions with detailed marking criteria</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* AI Tutor */}
                  <TabsContent value="ai-tutor">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Brain className="h-4 w-4" /> AI Tutor Buddy
                        </CardTitle>
                        <CardDescription>
                          Ask questions about {selectedTopic.title} — your AI tutor knows the {course.curriculum_type.toUpperCase()} {course.subject} syllabus
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <Brain className="h-12 w-12 mx-auto mb-3 text-primary/40" />
                          <p className="text-sm text-muted-foreground mb-4">
                            Start a conversation about this topic with your AI tutor
                          </p>
                          <Button onClick={() => {
                            const chatContext = `I'm studying ${course.title} (${course.curriculum_type.toUpperCase()} ${course.level}), specifically the topic: ${selectedTopic.topic_code ? selectedTopic.topic_code + ' - ' : ''}${selectedTopic.title}. ${selectedTopic.description}`;
                            navigate(`/ai-learning-assistant?context=${encodeURIComponent(chatContext)}`);
                          }}>
                            <Brain className="mr-2 h-4 w-4" /> Open AI Tutor
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseStudyPage;
