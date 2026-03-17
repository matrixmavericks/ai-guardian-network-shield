import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { quizThemes, POWERUP_DEFS, type PowerupId } from '@/lib/quizThemes';
import { fromTable } from '@/lib/supabaseHelper';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader, Plus, Trash2, Sparkles, Wand2, ArrowRight, CheckCircle } from 'lucide-react';

interface QuestionDraft {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'redemption';
  options: { text: string; isCorrect: boolean }[];
  correct_index: number;
  explanation: string;
}

interface CreateLiveQuizProps {
  classId: string;
  classSubject: string;
  onCreated: (sessionId: string) => void;
  onCancel: () => void;
  initialTopic?: string;
}

const CreateLiveQuiz: React.FC<CreateLiveQuizProps> = ({ classId, classSubject, onCreated, onCancel, initialTopic }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'config' | 'questions' | 'review'>('config');
  const [title, setTitle] = useState(initialTopic ? `${initialTopic} Quiz` : '');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'teacher_paced' | 'self_paced'>('teacher_paced');
  const [theme, setTheme] = useState('arcade');
  const [timePerQuestion, setTimePerQuestion] = useState(20);
  const [pointsPerQuestion, setPointsPerQuestion] = useState(1000);
  const [streakBonus, setStreakBonus] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(false);
  const [redemptionEnabled, setRedemptionEnabled] = useState(true);
  const [enabledPowerups, setEnabledPowerups] = useState<PowerupId[]>(Object.keys(POWERUP_DEFS) as PowerupId[]);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [generating, setGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState(initialTopic || '');
  const [aiDifficulty, setAiDifficulty] = useState('beginner');
  const [aiCount, setAiCount] = useState(10);
  const [saving, setSaving] = useState(false);

  const togglePowerup = (id: PowerupId) => {
    setEnabledPowerups(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const generateQuestions = async () => {
    if (!aiTopic.trim()) { toast.error('Enter a topic'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-live-quiz', {
        body: { topic: aiTopic, subject: classSubject, difficulty: aiDifficulty, questionCount: aiCount, includeRedemption: redemptionEnabled },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Generation failed');
      const generated = (data.data.questions || []).map((q: any) => ({
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        options: q.options || [],
        correct_index: q.correct_index || 0,
        explanation: q.explanation || '',
      }));
      setQuestions(prev => [...prev, ...generated]);
      toast.success(`${generated.length} questions generated!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate questions');
    } finally {
      setGenerating(false);
    }
  };

  const addManualQuestion = () => {
    setQuestions(prev => [...prev, {
      question_text: '',
      question_type: 'multiple_choice',
      options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }],
      correct_index: 0,
      explanation: '',
    }]);
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, text: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const options = q.options.map((o, j) => j === oIdx ? { ...o, text } : o);
      return { ...q, options };
    }));
  };

  const setCorrectOption = (qIdx: number, oIdx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const options = q.options.map((o, j) => ({ ...o, isCorrect: j === oIdx }));
      return { ...q, options, correct_index: oIdx };
    }));
  };

  const removeQuestion = (idx: number) => setQuestions(prev => prev.filter((_, i) => i !== idx));

  const saveQuiz = async () => {
    if (!title.trim()) { toast.error('Please enter a quiz title in the Settings tab'); setStep('config'); return; }
    if (questions.length === 0) { toast.error('Add at least 1 question'); setStep('questions'); return; }
    if (!user) { toast.error('You must be logged in'); return; }
    setSaving(true);
    try {
      const insertPayload: Record<string, any> = {
        class_id: classId,
        teacher_id: user.id,
        title: title.trim(),
        description: description.trim(),
        mode,
        theme,
        question_time_seconds: timePerQuestion,
        points_per_question: pointsPerQuestion,
        streak_bonus: streakBonus,
        show_leaderboard_after_each: showLeaderboard,
        shuffle_questions: shuffleQuestions,
        shuffle_answers: shuffleAnswers,
        redemption_round_enabled: redemptionEnabled,
        enabled_powerups: enabledPowerups,
      };
      
      const { data: session, error: sessionErr } = await fromTable('live_quiz_sessions')
        .insert(insertPayload)
        .select('id')
        .single();
      
      if (sessionErr) {
        console.error('Session create error:', sessionErr);
        throw sessionErr;
      }

      const questionRows = questions.map((q, i) => ({
        session_id: session.id,
        question_order: i,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        ai_generated: true,
      }));

      const { error: qErr } = await fromTable('live_quiz_questions').insert(questionRows);
      
      if (qErr) {
        console.error('Questions insert error:', qErr);
        throw qErr;
      }

      toast.success('Quiz created!');
      onCreated(session.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const selectedTheme = quizThemes[theme];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Create Live Quiz</h2>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      <Tabs value={step} onValueChange={(v) => setStep(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">⚙️ Settings</TabsTrigger>
          <TabsTrigger value="questions">📝 Questions ({questions.length})</TabsTrigger>
          <TabsTrigger value="review">✅ Review</TabsTrigger>
        </TabsList>

        {/* CONFIG TAB */}
        <TabsContent value="config" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 5 Review" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." rows={2} />
                </div>
                <div>
                  <Label>Game Mode</Label>
                  <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher_paced">🎯 Teacher-Paced (Kahoot)</SelectItem>
                      <SelectItem value="self_paced">⚡ Self-Paced (Quizizz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Game Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Time per Q (sec)</Label>
                    <Input type="number" value={timePerQuestion} onChange={e => setTimePerQuestion(Number(e.target.value))} min={5} max={120} />
                  </div>
                  <div>
                    <Label>Points per Q</Label>
                    <Input type="number" value={pointsPerQuestion} onChange={e => setPointsPerQuestion(Number(e.target.value))} min={100} max={5000} step={100} />
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Streak Bonus', value: streakBonus, setter: setStreakBonus },
                    { label: 'Leaderboard After Each', value: showLeaderboard, setter: setShowLeaderboard },
                    { label: 'Shuffle Questions', value: shuffleQuestions, setter: setShuffleQuestions },
                    { label: 'Shuffle Answers', value: shuffleAnswers, setter: setShuffleAnswers },
                    { label: 'Redemption Round', value: redemptionEnabled, setter: setRedemptionEnabled },
                  ].map(({ label, value, setter }) => (
                    <div key={label} className="flex items-center justify-between">
                      <Label className="text-sm">{label}</Label>
                      <Switch checked={value} onCheckedChange={setter} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Theme Picker */}
          <Card>
            <CardHeader><CardTitle className="text-base">🎨 Theme</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.values(quizThemes).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${theme === t.id ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-muted hover:border-muted-foreground/30'}`}
                  >
                    <div className="text-2xl mb-1">{t.emoji}</div>
                    <div className="text-xs font-medium">{t.name}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Power-ups */}
          <Card>
            <CardHeader><CardTitle className="text-base">🔥 Power-ups</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.values(POWERUP_DEFS).map(p => (
                  <button
                    key={p.id}
                    onClick={() => togglePowerup(p.id as PowerupId)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${enabledPowerups.includes(p.id as PowerupId) ? 'border-primary bg-primary/5' : 'border-muted opacity-50'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{p.emoji}</span>
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => setStep('questions')} className="w-full">
            Next: Add Questions <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </TabsContent>

        {/* QUESTIONS TAB */}
        <TabsContent value="questions" className="space-y-6 mt-4">
          {/* AI Generator */}
          <Card className="border-primary/20">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Question Generator</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <Input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Topic (e.g. Photosynthesis)" />
                </div>
                <Select value={aiDifficulty} onValueChange={setAiDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Easy</SelectItem>
                    <SelectItem value="intermediate">Medium</SelectItem>
                    <SelectItem value="advanced">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={String(aiCount)} onValueChange={v => setAiCount(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20].map(n => <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generateQuestions} disabled={generating} className="w-full">
                {generating ? <><Loader className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Wand2 className="mr-2 h-4 w-4" /> Generate Questions</>}
              </Button>
            </CardContent>
          </Card>

          {/* Question List */}
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <Card key={qi}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1 shrink-0">Q{qi + 1}</Badge>
                    <div className="flex-1 space-y-3">
                      <Input
                        value={q.question_text}
                        onChange={e => updateQuestion(qi, 'question_text', e.target.value)}
                        placeholder="Question text..."
                        className="font-medium"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((o, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <button
                              onClick={() => setCorrectOption(qi, oi)}
                              className={`shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${o.isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground/30'}`}
                            >
                              {o.isCorrect && <CheckCircle className="h-4 w-4" />}
                            </button>
                            <Input
                              value={o.text}
                              onChange={e => updateOption(qi, oi, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Explanation</Label>
                        <Textarea value={q.explanation} onChange={e => updateQuestion(qi, 'explanation', e.target.value)} rows={2} className="text-sm" />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeQuestion(qi)} className="shrink-0 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={addManualQuestion} className="flex-1">
              <Plus className="mr-2 h-4 w-4" /> Add Manual Question
            </Button>
            <Button onClick={() => setStep('review')} disabled={questions.length === 0} className="flex-1">
              Review & Create <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* REVIEW TAB */}
        <TabsContent value="review" className="space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle>Review Your Quiz</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{questions.length}</div>
                  <div className="text-xs text-muted-foreground">Questions</div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{selectedTheme.emoji}</div>
                  <div className="text-xs text-muted-foreground">{selectedTheme.name}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{mode === 'teacher_paced' ? '🎯' : '⚡'}</div>
                  <div className="text-xs text-muted-foreground">{mode === 'teacher_paced' ? 'Teacher-Paced' : 'Self-Paced'}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{enabledPowerups.length}</div>
                  <div className="text-xs text-muted-foreground">Power-ups</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">{title || 'Untitled Quiz'}</h3>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {enabledPowerups.map(p => (
                  <Badge key={p} variant="secondary">{POWERUP_DEFS[p].emoji} {POWERUP_DEFS[p].name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={saveQuiz} disabled={saving || questions.length === 0} className="w-full" size="lg">
            {saving ? <><Loader className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : '🚀 Create Quiz'}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreateLiveQuiz;
