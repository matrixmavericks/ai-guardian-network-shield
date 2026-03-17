import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { quizThemes } from '@/lib/quizThemes';
import { Loader, Trophy, BarChart3, BookOpen, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface QuizResultsProps {
  sessionId: string;
  onBack: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ sessionId, onBack }) => {
  const { user } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studyMode, setStudyMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [sessRes, qRes, pRes, aRes] = await Promise.all([
          supabase.from('live_quiz_sessions').select('*').eq('id', sessionId).single(),
          supabase.from('live_quiz_questions').select('*').eq('session_id', sessionId).order('question_order'),
          supabase.from('live_quiz_players').select('*').eq('session_id', sessionId),
          supabase.from('live_quiz_answers').select('*').eq('session_id', sessionId),
        ]);
        setSession(sessRes.data);
        setQuestions(qRes.data || []);
        setPlayers((pRes.data || []).sort((a: any, b: any) => b.score - a.score));
        setAnswers(aRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!session) return <p>Session not found</p>;

  const theme = quizThemes[session.theme] || quizThemes.arcade;
  const isTeacher = user?.id === session.teacher_id;
  const myPlayer = players.find((p: any) => p.user_id === user?.id);

  // Per-question analytics
  const questionStats = questions.map(q => {
    const qAnswers = answers.filter((a: any) => a.question_id === q.id);
    const correct = qAnswers.filter((a: any) => a.is_correct).length;
    const total = qAnswers.length;
    const avgTime = total > 0 ? Math.round(qAnswers.reduce((s: number, a: any) => s + (a.time_taken_ms || 0), 0) / total / 1000) : 0;
    return { ...q, correctCount: correct, totalAnswers: total, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0, avgTime };
  });

  // Study mode - show all questions with explanations
  if (studyMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setStudyMode(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Results
          </Button>
          <h2 className="text-xl font-bold">📚 Study Mode - {session.title}</h2>
        </div>

        {questionStats.map((q, i) => {
          const myAnswer = answers.find((a: any) => a.question_id === q.id && a.user_id === user?.id);
          return (
            <Card key={q.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="shrink-0 mt-1">Q{i + 1}</Badge>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{q.question_text}</p>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {(q.options as any[]).map((opt: any, oi: number) => (
                        <div
                          key={oi}
                          className={`p-3 rounded-lg border-2 text-sm ${
                            oi === q.correct_index
                              ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                              : myAnswer?.selected_index === oi
                                ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                                : 'border-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs opacity-50">{String.fromCharCode(65 + oi)}</span>
                            <span className="flex-1">{opt.text}</span>
                            {oi === q.correct_index && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {myAnswer?.selected_index === oi && oi !== q.correct_index && <XCircle className="h-4 w-4 text-red-500" />}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-3 rounded-lg bg-muted text-sm">
                      <p className="font-medium">💡 Explanation:</p>
                      <p className="text-muted-foreground">{q.explanation}</p>
                    </div>
                    {isTeacher && (
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        <span>✅ {q.accuracy}% correct</span>
                        <span>⏱️ Avg {q.avgTime}s</span>
                        <span>{q.totalAnswers} answers</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div>
          <h2 className="text-xl font-bold">{session.title} - Results</h2>
          <p className="text-sm text-muted-foreground">{questions.length} questions · {players.length} players</p>
        </div>
      </div>

      <Tabs defaultValue="leaderboard">
        <TabsList>
          <TabsTrigger value="leaderboard"><Trophy className="mr-1 h-4 w-4" /> Leaderboard</TabsTrigger>
          <TabsTrigger value="questions"><BarChart3 className="mr-1 h-4 w-4" /> Questions</TabsTrigger>
          <TabsTrigger value="study"><BookOpen className="mr-1 h-4 w-4" /> Study</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4 mt-4">
          {/* Top 3 podium */}
          <div className="flex items-end justify-center gap-4 py-6">
            {[1, 0, 2].map(rank => {
              const p = players[rank];
              if (!p) return <div key={rank} className="w-24" />;
              const heights = ['h-32', 'h-24', 'h-20'];
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={rank} className="text-center">
                  <div className="text-3xl mb-1">{medals[rank]}</div>
                  <p className="font-bold text-sm truncate max-w-[100px]">{p.nickname}</p>
                  <p className="text-lg font-black text-primary">{p.score.toLocaleString()}</p>
                  <div className={`${heights[rank]} w-24 rounded-t-lg ${rank === 0 ? 'bg-yellow-400/30' : rank === 1 ? 'bg-gray-300/30' : 'bg-amber-600/20'}`} />
                </div>
              );
            })}
          </div>

          {/* Full list */}
          <div className="space-y-2">
            {players.map((p: any, i: number) => (
              <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg ${p.user_id === user?.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-muted/50'}`}>
                <span className="text-lg font-bold w-8 text-center text-muted-foreground">#{i + 1}</span>
                <span className="flex-1 font-medium">{p.nickname} {p.user_id === user?.id && '(You)'}</span>
                <span className="font-bold text-primary">{p.score.toLocaleString()}</span>
                {p.streak > 0 && <Badge variant="secondary">🔥{p.streak}</Badge>}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4 mt-4">
          {questionStats.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="outline">Q{i + 1}</Badge>
                  <p className="flex-1 font-medium text-sm">{q.question_text}</p>
                  <span className={`text-sm font-bold ${q.accuracy >= 70 ? 'text-green-500' : q.accuracy >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {q.accuracy}%
                  </span>
                </div>
                <Progress value={q.accuracy} className="h-2" />
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>✅ {q.correctCount}/{q.totalAnswers} correct</span>
                  <span>⏱️ Avg {q.avgTime}s</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="study" className="mt-4">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <BookOpen className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-lg font-bold">Study Mode</h3>
              <p className="text-muted-foreground">Review all questions with explanations, see correct answers, and learn from mistakes.</p>
              <Button onClick={() => setStudyMode(true)} size="lg">
                📚 Enter Study Mode
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuizResults;
