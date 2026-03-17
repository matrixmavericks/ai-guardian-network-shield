import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fromTable } from '@/lib/supabaseHelper';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { quizThemes } from '@/lib/quizThemes';
import { Loader, Plus, Play, Eye, Trash2, Users, Clock, Trophy } from 'lucide-react';

interface QuizSession {
  id: string; title: string; description: string; mode: string; theme: string;
  status: string; join_code: string; created_at: string;
  question_time_seconds: number; points_per_question: number;
}

interface LiveQuizListProps {
  classId: string;
  isTeacher: boolean;
  onCreateNew: () => void;
  onJoinSession: (sessionId: string) => void;
  onViewResults: (sessionId: string) => void;
}

const LiveQuizList: React.FC<LiveQuizListProps> = ({ classId, isTeacher, onCreateNew, onJoinSession, onViewResults }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    loadSessions();
  }, [classId]);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('live_quiz_sessions')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSessions((data || []) as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Delete this quiz?')) return;
    await supabase.from('live_quiz_sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success('Quiz deleted');
  };

  const joinByCode = async () => {
    if (!joinCode.trim()) return;
    const { data } = await supabase
      .from('live_quiz_sessions')
      .select('id')
      .eq('join_code', joinCode.trim().toLowerCase())
      .eq('class_id', classId)
      .maybeSingle();
    if (data) {
      onJoinSession(data.id);
    } else {
      toast.error('Invalid join code');
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    lobby: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    active: 'bg-green-500/20 text-green-700 dark:text-green-400 animate-pulse',
    completed: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" /> Live Quizzes
        </h3>
        {isTeacher && (
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" /> Create Quiz
          </Button>
        )}
      </div>

      {/* Join by Code (students) */}
      {!isTeacher && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter join code..."
                className="flex-1 px-3 py-2 rounded-lg border bg-background text-foreground text-center text-lg font-mono tracking-widest"
                maxLength={6}
              />
              <Button onClick={joinByCode} disabled={!joinCode.trim()}>Join Game</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No quizzes yet. {isTeacher ? 'Create one to get started!' : 'Ask your teacher to create one!'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map(s => {
            const th = quizThemes[s.theme] || quizThemes.arcade;
            const isActive = s.status === 'active' || s.status === 'lobby';
            return (
              <Card key={s.id} className={`transition-all hover:shadow-md ${isActive ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{th.emoji}</span>
                        <h4 className="font-semibold">{s.title}</h4>
                      </div>
                      {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                    </div>
                    <Badge className={statusColors[s.status] || ''}>
                      {s.status === 'active' ? '🟢 Live' : s.status === 'lobby' ? '🟡 Lobby' : s.status === 'completed' ? '✅ Done' : '📝 Draft'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.question_time_seconds}s</span>
                    <span>{s.mode === 'teacher_paced' ? '🎯 Teacher-Paced' : '⚡ Self-Paced'}</span>
                  </div>

                  <div className="flex gap-2">
                    {isActive && (
                      <Button onClick={() => onJoinSession(s.id)} className="flex-1" size="sm">
                        <Play className="mr-1 h-3 w-3" /> {isTeacher ? 'Manage' : 'Join'}
                      </Button>
                    )}
                    {s.status === 'draft' && isTeacher && (
                      <Button onClick={() => onJoinSession(s.id)} variant="outline" className="flex-1" size="sm">
                        <Play className="mr-1 h-3 w-3" /> Start
                      </Button>
                    )}
                    {s.status === 'completed' && (
                      <Button onClick={() => onViewResults(s.id)} variant="outline" className="flex-1" size="sm">
                        <Eye className="mr-1 h-3 w-3" /> Results
                      </Button>
                    )}
                    {isTeacher && (
                      <Button onClick={() => deleteSession(s.id)} variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LiveQuizList;
