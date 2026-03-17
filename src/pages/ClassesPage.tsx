import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Copy, Users, BookOpen, Trash2 } from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
  subject: string;
  description: string;
  join_code: string;
  teacher_id: string;
  created_at: string;
  memberCount?: number;
}

const ClassesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', subject: 'Mathematics', description: '' });
  const [creating, setCreating] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const fetchClasses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (isTeacher) {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;

        // Get member counts
        const classesWithCounts = await Promise.all(
          (data || []).map(async (cls) => {
            const { count } = await supabase
              .from('class_members')
              .select('*', { count: 'exact', head: true })
              .eq('class_id', cls.id);
            return { ...cls, memberCount: count || 0 };
          })
        );
        setClasses(classesWithCounts);
      } else {
        // Student: get classes they've joined
        const { data: memberships, error: memError } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('student_id', user.id);
        if (memError) throw memError;

        if (memberships && memberships.length > 0) {
          const classIds = memberships.map(m => m.class_id);
          const { data, error } = await supabase
            .from('classes')
            .select('*')
            .in('id', classIds);
          if (error) throw error;
          setClasses(data || []);
        } else {
          setClasses([]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching classes:', err);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newClass.name.trim()) {
      toast.error('Please enter a class name');
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('classes').insert({
        name: newClass.name.trim(),
        subject: newClass.subject,
        description: newClass.description.trim(),
        teacher_id: user!.id,
      });
      if (error) throw error;
      toast.success('Class created!');
      setCreateOpen(false);
      setNewClass({ name: '', subject: 'Mathematics', description: '' });
      fetchClasses();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to create class');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a class code');
      return;
    }
    setJoining(true);
    try {
      const { data: cls, error: clsError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('join_code', joinCode.trim().toLowerCase())
        .maybeSingle();
      if (clsError) throw clsError;
      if (!cls) {
        toast.error('Invalid class code. Please check and try again.');
        return;
      }

      const { error: joinError } = await supabase.from('class_members').insert({
        class_id: cls.id,
        student_id: user!.id,
      });
      if (joinError) {
        if (joinError.code === '23505') {
          toast.info('You are already in this class');
        } else {
          throw joinError;
        }
      } else {
        toast.success(`Joined "${cls.name}" successfully!`);
        setJoinCode('');
        fetchClasses();
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to join class');
    } finally {
      setJoining(false);
    }
  };

  const handleDelete = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      if (error) throw error;
      toast.success('Class deleted');
      fetchClasses();
    } catch (err: any) {
      toast.error('Failed to delete class');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Join code copied!');
  };

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="container py-8 max-w-5xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Classes</h1>
              <p className="text-muted-foreground">
                {isTeacher ? 'Create and manage your classes' : 'Join and view your classes'}
              </p>
            </div>
            {isTeacher ? (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Create Class</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a New Class</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Class Name</Label>
                      <Input
                        placeholder="e.g. Algebra I - Period 3"
                        value={newClass.name}
                        onChange={e => setNewClass(p => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Subject</Label>
                      <Select value={newClass.subject} onValueChange={v => setNewClass(p => ({ ...p, subject: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Mathematics', 'Science', 'English', 'History', 'Computer Science', 'Art', 'Music', 'Physical Education', 'Other'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Description (optional)</Label>
                      <Textarea
                        placeholder="Brief class description..."
                        value={newClass.description}
                        onChange={e => setNewClass(p => ({ ...p, description: e.target.value }))}
                      />
                    </div>
                    <Button onClick={handleCreate} disabled={creating} className="w-full">
                      {creating ? 'Creating...' : 'Create Class'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="flex gap-2 items-end">
                <div>
                  <Label className="text-xs text-muted-foreground">Enter class code</Label>
                  <Input
                    placeholder="e.g. a3f29b"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button onClick={handleJoin} disabled={joining}>
                  {joining ? 'Joining...' : 'Join Class'}
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading classes...</div>
          ) : classes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground text-lg">
                  {isTeacher ? 'No classes yet. Create your first class!' : 'You haven\'t joined any classes yet. Enter a class code to get started.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map(cls => (
                <Card key={cls.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/class/${cls.id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{cls.name}</CardTitle>
                        <CardDescription>{cls.subject}</CardDescription>
                      </div>
                      {isTeacher && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => { e.stopPropagation(); handleDelete(cls.id); }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {cls.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{cls.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      {isTeacher && (
                        <>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{cls.memberCount} students</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => { e.stopPropagation(); copyCode(cls.join_code); }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            {cls.join_code}
                          </Button>
                        </>
                      )}
                      {!isTeacher && (
                        <Badge variant="secondary">{cls.subject}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassesPage;
