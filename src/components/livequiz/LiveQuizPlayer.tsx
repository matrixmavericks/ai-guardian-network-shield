import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { quizThemes, POWERUP_DEFS, type PowerupId } from '@/lib/quizThemes';
import { fromTable } from '@/lib/supabaseHelper';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Trophy, Clock, Zap, Users, Crown, ArrowRight, Loader } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playCorrectSound, playWrongSound, playTimerWarningSound, playStreakSound } from '@/lib/quizSounds';

interface LiveQuizPlayerProps {
  sessionId: string;
  onExit: () => void;
}

interface SessionData {
  id: string; title: string; mode: string; theme: string; status: string;
  current_question_index: number; question_time_seconds: number;
  points_per_question: number; streak_bonus: boolean;
  show_leaderboard_after_each: boolean; enabled_powerups: string[];
  teacher_id: string; class_id: string; shuffle_answers: boolean;
}

interface QuestionData {
  id: string; question_text: string; question_type: string;
  options: { text: string; isCorrect: boolean }[];
  correct_index: number; explanation: string; question_order: number;
}

interface PlayerData {
  id: string; user_id: string; nickname: string; score: number;
  streak: number; powerups_available: Record<string, number>;
  powerups_used: any[];
}

const LiveQuizPlayer: React.FC<LiveQuizPlayerProps> = ({ sessionId, onExit }) => {
  const { user } = useAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [myPlayer, setMyPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; points: number; explanation: string } | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [activePowerup, setActivePowerup] = useState<string | null>(null);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);

  const isTeacher = user?.id === session?.teacher_id;
  const theme = session ? quizThemes[session.theme] || quizThemes.arcade : quizThemes.arcade;
  const currentQuestion = session && session.current_question_index >= 0 ? questions[session.current_question_index] : null;

  // Load session data
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const [{ data: sess }, { data: qs }] = await Promise.all([
          fromTable('live_quiz_sessions').select('*').eq('id', sessionId).single(),
          fromTable('live_quiz_questions').select('*').eq('session_id', sessionId).order('question_order'),
        ]);
        if (!sess) { toast.error('Session not found'); onExit(); return; }
        setSession(sess as any);
        setQuestions((qs || []) as any);

        // Load players
        const { data: ps } = await fromTable('live_quiz_players').select('*').eq('session_id', sessionId);
        setPlayers((ps || []) as any);

        // Join as player if student
        if (sess.teacher_id !== user.id) {
          const existing = (ps || []).find((p: any) => p.user_id === user.id);
          if (existing) {
            setMyPlayer(existing as any);
          } else {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
            const powerupsAvail: Record<string, number> = {};
            ((sess as any).enabled_powerups || []).forEach((p: string) => { powerupsAvail[p] = 1; });
            const { data: newPlayer, error } = await fromTable('live_quiz_players').insert({
              session_id: sessionId,
              user_id: user.id,
              nickname: profile?.full_name || 'Player',
              powerups_available: powerupsAvail,
            }).select().single();
            if (!error && newPlayer) setMyPlayer(newPlayer as any);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId, user]);

  // Realtime subscriptions
  useEffect(() => {
    if (!sessionId) return;
    const sessionChannel = supabase.channel(`quiz-session-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_quiz_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
        const updated = payload.new as any;
        setSession(prev => {
          if (prev && updated.current_question_index !== prev.current_question_index) {
            // New question - reset state
            setSelectedAnswer(null);
            setIsAnswered(false);
            setAnswerResult(null);
            setShowLeaderboard(false);
            setActivePowerup(null);
            setHiddenOptions([]);
            setSecondChanceUsed(false);
            setQuestionStartTime(Date.now());
            setTimeLeft(updated.question_time_seconds || prev.question_time_seconds);
          }
          return { ...prev, ...updated };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_quiz_players', filter: `session_id=eq.${sessionId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPlayers(prev => [...prev.filter(p => (p as any).id !== (payload.new as any).id), payload.new as any]);
        } else if (payload.eventType === 'UPDATE') {
          setPlayers(prev => prev.map(p => p.id === (payload.new as any).id ? payload.new as any : p));
          if (user && (payload.new as any).user_id === user.id) setMyPlayer(payload.new as any);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(sessionChannel); };
  }, [sessionId, user]);

  // Timer countdown
  useEffect(() => {
    if (!session || session.status !== 'active' || session.current_question_index < 0 || isAnswered) return;
    if (timeLeft <= 0) {
      if (!isAnswered) handleTimeout();
      return;
    }
    // Play warning beep at 5 seconds
    if (timeLeft === 5) playTimerWarningSound();
    const interval = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, session?.status, session?.current_question_index, isAnswered]);

  // Set timer when question changes
  useEffect(() => {
    if (session && session.status === 'active' && session.current_question_index >= 0) {
      setTimeLeft(session.question_time_seconds);
      setQuestionStartTime(Date.now());
    }
  }, [session?.current_question_index, session?.status]);

  const handleTimeout = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    setAnswerResult({ correct: false, points: 0, explanation: currentQuestion?.explanation || '' });
    // Reset streak
    if (myPlayer) {
      fromTable('live_quiz_players').update({ streak: 0 }).eq('id', myPlayer.id).then();
    }
  };

  const handleAnswer = async (optionIndex: number) => {
    if (isAnswered || !currentQuestion || !myPlayer || !session) return;

    const timeTaken = Date.now() - questionStartTime;
    const isCorrect = optionIndex === currentQuestion.correct_index;

    // Second chance logic
    if (!isCorrect && activePowerup === 'second_chance' && !secondChanceUsed) {
      setSecondChanceUsed(true);
      setHiddenOptions(prev => [...prev, optionIndex]);
      toast.info('🔄 Second chance! Try again.');
      return;
    }

    setSelectedAnswer(optionIndex);
    setIsAnswered(true);

    let points = 0;
    if (isCorrect) {
      // Time bonus: faster = more points, max = points_per_question
      const maxTime = session.question_time_seconds * 1000;
      const timeBonus = Math.max(0, 1 - (timeTaken / maxTime));
      points = Math.round(session.points_per_question * (0.5 + 0.5 * timeBonus));

      // Double points powerup
      if (activePowerup === 'double_points') points *= 2;

      // Streak bonus
      const newStreak = (myPlayer.streak || 0) + 1;
      if (session.streak_bonus && newStreak > 1) {
        points += Math.min(newStreak * 50, 500);
      }

      await fromTable('live_quiz_players').update({
        score: (myPlayer.score || 0) + points,
        streak: newStreak,
      }).eq('id', myPlayer.id);
    } else {
      // Check streak freeze
      const newStreak = activePowerup === 'streak_freeze' ? myPlayer.streak : 0;
      await fromTable('live_quiz_players').update({ streak: newStreak }).eq('id', myPlayer.id);
    }

    // Record answer
    await fromTable('live_quiz_answers').insert({
      session_id: sessionId,
      question_id: currentQuestion.id,
      player_id: myPlayer.id,
      user_id: user!.id,
      selected_index: optionIndex,
      is_correct: isCorrect,
      points_earned: points,
      time_taken_ms: timeTaken,
      powerup_used: activePowerup,
    });

    setAnswerResult({ correct: isCorrect, points, explanation: currentQuestion.explanation });
    setActivePowerup(null);

    // Sound + confetti effects
    if (isCorrect) {
      playCorrectSound();
      const newStreak = (myPlayer.streak || 0) + 1;
      if (newStreak > 2) playStreakSound();
      confetti({
        particleCount: points > 500 ? 150 : 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
      });
    } else {
      playWrongSound();
    }
  };

  const usePowerup = (id: string) => {
    if (!myPlayer || isAnswered) return;
    const available = (myPlayer.powerups_available as Record<string, number>)?.[id] || 0;
    if (available <= 0) { toast.error('No uses left!'); return; }

    if (id === 'fifty_fifty' && currentQuestion) {
      // Hide 2 wrong answers
      const wrongIndices = currentQuestion.options
        .map((_, i) => i)
        .filter(i => i !== currentQuestion.correct_index && !hiddenOptions.includes(i));
      const toHide = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
      setHiddenOptions(toHide);
    } else if (id === 'extra_time') {
      setTimeLeft(t => t + 10);
    } else if (id === 'hint_reveal') {
      toast.info(`💡 Hint: ${currentQuestion?.explanation?.slice(0, 80)}...`);
    }

    setActivePowerup(id);
    // Deduct powerup
    const updated = { ...myPlayer.powerups_available, [id]: available - 1 };
    fromTable('live_quiz_players').update({ powerups_available: updated }).eq('id', myPlayer.id).then();
    setMyPlayer(prev => prev ? { ...prev, powerups_available: updated } : null);
  };

  // Teacher controls
  const startGame = async () => {
    await fromTable('live_quiz_sessions').update({ status: 'lobby' }).eq('id', sessionId);
  };

  const openLobby = async () => {
    await fromTable('live_quiz_sessions').update({ status: 'lobby' }).eq('id', sessionId);
  };

  const nextQuestion = async () => {
    if (!session) return;
    const nextIdx = session.current_question_index + 1;
    if (nextIdx >= questions.length) {
      await fromTable('live_quiz_sessions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', sessionId);
    } else {
      setShowLeaderboard(false);
      await fromTable('live_quiz_sessions').update({ status: 'active', current_question_index: nextIdx }).eq('id', sessionId);
    }
  };

  const showLeaderboardNow = () => setShowLeaderboard(true);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.bg}`}>
        <Loader className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!session) return null;

  // LOBBY VIEW
  if (session.status === 'draft' || session.status === 'lobby') {
    return (
      <div className={`min-h-screen ${theme.bg} p-6`}>
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className={`${theme.card} border-2`}>
            <CardContent className="pt-6 text-center space-y-6">
              <div className="text-4xl">{quizThemes[session.theme]?.emoji || '🎮'}</div>
              <h1 className={`text-3xl font-black ${theme.accent}`}>{session.title}</h1>
              <div className={`text-6xl font-mono font-black tracking-[0.3em] ${theme.text} bg-black/20 rounded-xl p-4`}>
                {(session as any).join_code}
              </div>
              <p className={`${theme.text} opacity-70`}>Share this code with students to join!</p>

              <div className="flex items-center justify-center gap-2">
                <Users className={`h-5 w-5 ${theme.accent}`} />
                <span className={`text-lg font-bold ${theme.text}`}>{players.length} players joined</span>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {sortedPlayers.map((p, i) => (
                  <Badge key={p.id} variant="secondary" className="text-sm px-3 py-1 animate-in slide-in-from-bottom">
                    {p.nickname}
                  </Badge>
                ))}
              </div>

              {isTeacher && (
                <div className="space-y-3">
                  {session.status === 'draft' && (
                    <Button onClick={openLobby} size="lg" className={`w-full text-lg ${theme.leaderboard} text-white border-0`}>
                      Open Lobby
                    </Button>
                  )}
                  {(session.status === 'lobby' || session.status === 'draft') && (
                    <Button onClick={nextQuestion} size="lg" className={`w-full text-lg ${theme.leaderboard} text-white border-0`} disabled={players.length === 0}>
                      🚀 Start Game!
                    </Button>
                  )}
                </div>
              )}

              {!isTeacher && (
                <p className={`${theme.text} animate-pulse`}>⏳ Waiting for teacher to start...</p>
              )}
            </CardContent>
          </Card>
          <Button variant="ghost" onClick={onExit} className={theme.text}>← Leave</Button>
        </div>
      </div>
    );
  }

  // COMPLETED VIEW
  if (session.status === 'completed') {
    return (
      <div className={`min-h-screen ${theme.bg} p-6`}>
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className={`${theme.card} border-2`}>
            <CardContent className="pt-6 text-center space-y-6">
              <div className="text-6xl">🏆</div>
              <h1 className={`text-3xl font-black ${theme.accent}`}>Game Over!</h1>

              <div className="space-y-3">
                {sortedPlayers.slice(0, 3).map((p, i) => (
                  <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl ${i === 0 ? theme.leaderboard + ' text-white' : 'bg-black/10'}`}>
                    <div className="text-3xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-lg">{p.nickname}</div>
                      <div className="text-sm opacity-80">{p.streak} best streak</div>
                    </div>
                    <div className="text-2xl font-black">{p.score.toLocaleString()}</div>
                  </div>
                ))}
                {sortedPlayers.slice(3).map((p, i) => (
                  <div key={p.id} className={`flex items-center gap-4 p-3 rounded-lg bg-black/5 ${theme.text}`}>
                    <span className="text-lg font-bold opacity-50">#{i + 4}</span>
                    <span className="flex-1 font-medium">{p.nickname}</span>
                    <span className="font-bold">{p.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {myPlayer && !isTeacher && (
                <div className={`p-4 rounded-xl bg-black/10 ${theme.text}`}>
                  <p className="text-sm opacity-70">Your Score</p>
                  <p className="text-4xl font-black">{myPlayer.score.toLocaleString()}</p>
                  <p className="text-sm opacity-70">Rank #{sortedPlayers.findIndex(p => p.user_id === user?.id) + 1} of {sortedPlayers.length}</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Button onClick={onExit} className={`w-full ${theme.leaderboard} text-white border-0`}>
            Back to Class
          </Button>
        </div>
      </div>
    );
  }

  // ACTIVE GAME - Leaderboard overlay
  if (showLeaderboard && isTeacher) {
    return (
      <div className={`min-h-screen ${theme.bg} p-6`}>
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className={`${theme.card} border-2`}>
            <CardContent className="pt-6 text-center space-y-4">
              <h2 className={`text-2xl font-black ${theme.accent}`}>📊 Leaderboard</h2>
              <div className="space-y-2">
                {sortedPlayers.map((p, i) => (
                  <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg ${i < 3 ? 'bg-black/10' : ''} ${theme.text}`}>
                    <span className="text-xl font-bold w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                    <span className="flex-1 text-left font-medium">{p.nickname}</span>
                    <span className="font-bold">{p.score.toLocaleString()}</span>
                    {p.streak > 1 && <Badge className="bg-orange-500 text-white">🔥{p.streak}</Badge>}
                  </div>
                ))}
              </div>
              <Button onClick={nextQuestion} size="lg" className={`w-full ${theme.leaderboard} text-white border-0`}>
                {session.current_question_index < questions.length - 1 ? 'Next Question →' : '🏁 Finish Game'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ACTIVE GAME - Question view
  if (!currentQuestion) return null;

  return (
    <div className={`min-h-screen ${theme.bg} p-4`}>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${theme.text}`}>
            <span className="text-sm font-medium opacity-70">Q{session.current_question_index + 1}/{questions.length}</span>
            <Progress value={((session.current_question_index + 1) / questions.length) * 100} className="w-32 h-2" />
          </div>
          {!isTeacher && myPlayer && (
            <div className="flex items-center gap-3">
              {myPlayer.streak > 1 && <Badge className="bg-orange-500 text-white animate-pulse">🔥 {myPlayer.streak}</Badge>}
              <div className={`font-bold ${theme.accent}`}>{myPlayer.score.toLocaleString()} pts</div>
            </div>
          )}
          {isTeacher && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={theme.text}>{players.length} playing</Badge>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="flex justify-center">
          <div className={`text-5xl font-black rounded-full h-20 w-20 flex items-center justify-center ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : theme.accent} bg-black/20`}>
            {timeLeft}
          </div>
        </div>

        {/* Question */}
        <Card className={`${theme.card} border-2`}>
          <CardContent className="pt-6 pb-4">
            <h2 className={`text-xl md:text-2xl font-bold text-center ${theme.text}`}>
              {currentQuestion.question_text}
            </h2>
          </CardContent>
        </Card>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentQuestion.options.map((opt, i) => {
            if (hiddenOptions.includes(i)) return <div key={i} className="h-16 rounded-xl border-2 border-dashed border-gray-700/30" />;
            const isSelected = selectedAnswer === i;
            const isCorrect = i === currentQuestion.correct_index;
            const showResult = isAnswered;
            const colorClass = theme.optionColors[i % theme.optionColors.length];

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={isAnswered && !(!isAnswered)}
                className={`p-4 rounded-xl border-2 text-left font-semibold text-white transition-all transform active:scale-95 ${
                  showResult
                    ? isCorrect
                      ? theme.correct + ' scale-105'
                      : isSelected
                        ? theme.incorrect
                        : 'opacity-40'
                    : colorClass + ' hover:scale-[1.02]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black opacity-60">{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{opt.text}</span>
                  {showResult && isCorrect && <span className="text-2xl">✅</span>}
                  {showResult && isSelected && !isCorrect && <span className="text-2xl">❌</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Answer Result */}
        {answerResult && (
          <Card className={`${answerResult.correct ? theme.correct : theme.incorrect} border-2`}>
            <CardContent className="pt-4 pb-4">
              <div className={`text-center ${theme.text}`}>
                <div className="text-2xl font-bold mb-1">
                  {answerResult.correct ? `✅ +${answerResult.points.toLocaleString()} points!` : '❌ Wrong!'}
                </div>
                <p className="text-sm opacity-80">{answerResult.explanation}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Power-ups (student only, before answering) */}
        {!isTeacher && myPlayer && !isAnswered && (
          <div className="flex gap-2 justify-center flex-wrap">
            {(session.enabled_powerups || []).map((pId: string) => {
              const def = POWERUP_DEFS[pId as PowerupId];
              if (!def) return null;
              const count = (myPlayer.powerups_available as Record<string, number>)?.[pId] || 0;
              return (
                <Button
                  key={pId}
                  variant="outline"
                  size="sm"
                  disabled={count <= 0 || activePowerup !== null}
                  onClick={() => usePowerup(pId)}
                  className={`${theme.text} border-white/20 ${activePowerup === pId ? 'ring-2 ring-yellow-400' : ''}`}
                >
                  {def.emoji} {def.name} {count > 0 && `(${count})`}
                </Button>
              );
            })}
          </div>
        )}

        {/* Teacher Controls */}
        {isTeacher && (
          <div className="flex gap-3 justify-center">
            {session.show_leaderboard_after_each && (
              <Button onClick={showLeaderboardNow} variant="outline" className={`${theme.text} border-white/20`}>
                📊 Leaderboard
              </Button>
            )}
            <Button onClick={nextQuestion} className={`${theme.leaderboard} text-white border-0`}>
              {session.current_question_index < questions.length - 1 ? 'Next Question →' : '🏁 Finish'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveQuizPlayer;
