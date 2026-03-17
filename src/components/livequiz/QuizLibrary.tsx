import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { fromTable } from '@/lib/supabaseHelper';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { quizThemes } from '@/lib/quizThemes';
import { Loader, Search, Play, BookOpen, Trophy, Clock, Eye } from 'lucide-react';
import QuizResults from './QuizResults';

interface QuizSession {
  id: string; title: string; description: string; mode: string; theme: string;
  status: string; created_at: string; question_time_seconds: number;
  points_per_question: number; class_id: string;
}

interface QuizLibraryProps {
  onStartPractice: (sessionId: string) => void;
}

const QuizLibrary: React.FC<QuizLibraryProps> = ({ onStartPractice }) => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewingResults, setViewingResults] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        // Get student's class IDs
        const { data: memberships } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('student_id', user.id);
        const classIds = (memberships || []).map(m => m.class_id);
        if (classIds.length === 0) { setLoading(false); return; }

        // Get completed quizzes from those classes
        const { data } = await fromTable('live_quiz_sessions')
          .select('*')
          .in('class_id', classIds)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });
        setQuizzes((data || []) as any);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (viewingResults) {
    return (
      <div>
        <Button variant="ghost" onClick={() => setViewingResults(null)} className="mb-4">
          ← Back to Library
        </Button>
        <QuizResults sessionId={viewingResults} onBack={() => setViewingResults(null)} />
      </div>
    );
  }

  const filtered = quizzes.filter(q =>
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    (q.description || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" /> Quiz Library
        </h3>
        <span className="text-sm text-muted-foreground">{quizzes.length} quizzes available</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search quizzes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{quizzes.length === 0 ? 'No quizzes available yet. Complete quizzes in your classes to see them here!' : 'No quizzes match your search.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(q => {
            const th = quizThemes[q.theme] || quizThemes.arcade;
            return (
              <Card key={q.id} className="transition-all hover:shadow-md hover:scale-[1.01]">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{th.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{q.title}</h4>
                      {q.description && <p className="text-xs text-muted-foreground truncate">{q.description}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{q.question_time_seconds}s/q</span>
                    <Badge variant="secondary" className="text-xs">
                      {q.mode === 'teacher_paced' ? '🎯 Teacher-Paced' : '⚡ Self-Paced'}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => setViewingResults(q.id)} variant="outline" className="flex-1" size="sm">
                      <Eye className="mr-1 h-3 w-3" /> Study
                    </Button>
                    <Button onClick={() => onStartPractice(q.id)} className="flex-1" size="sm">
                      <Play className="mr-1 h-3 w-3" /> Practice
                    </Button>
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

export default QuizLibrary;
