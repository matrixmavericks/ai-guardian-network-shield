import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Plus, Trash2, Globe, School as SchoolIcon, Lock } from 'lucide-react';

interface SyllabusTopic {
  title: string;
  description: string;
  topic_code: string;
}

const CURRICULA = [
  { value: 'general', label: 'General' },
  { value: 'ib', label: 'IB' },
  { value: 'ap', label: 'AP' },
  { value: 'igcse', label: 'IGCSE' },
  { value: 'a_levels', label: 'A-Levels' },
  { value: 'cbse', label: 'CBSE' },
  { value: 'custom', label: 'Custom' },
];

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'English', 'History', 'Geography', 'Economics', 'Psychology',
  'Business', 'Art', 'Music', 'Other',
];

const LEVELS = ['standard', 'higher', 'foundation', 'advanced'];

const CreateCoursePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [adminSchools, setAdminSchools] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    title: '',
    subject: 'Mathematics',
    curriculum_type: 'custom',
    level: 'standard',
    description: '',
    icon_emoji: '📚',
    estimated_hours: 60,
    visibility: 'public' as 'public' | 'school' | 'class',
    school_id: '' as string,
    syllabus_content: '',
  });
  const [topics, setTopics] = useState<SyllabusTopic[]>([
    { title: '', description: '', topic_code: '1' },
  ]);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    const loadSchools = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('school_members')
        .select('school_id, school_role, schools:school_id(id, name)')
        .eq('user_id', user.id)
        .in('school_role', ['admin', 'owner', 'teacher']);
      const list = (data || [])
        .map((m: any) => m.schools)
        .filter(Boolean) as { id: string; name: string }[];
      setAdminSchools(list);
      if (list.length > 0) setForm(p => ({ ...p, school_id: list[0].id }));
    };
    loadSchools();
  }, [user]);

  const visibilityOptions = useMemo(() => {
    const opts = [
      { value: 'public', label: 'Public', desc: 'Anyone on the platform can find and enroll', icon: Globe },
      { value: 'class', label: 'Class-only', desc: 'Only students in classes that link this course', icon: Lock },
    ];
    if (adminSchools.length > 0) {
      opts.splice(1, 0, { value: 'school', label: 'School-wide', desc: 'Only members of the selected school', icon: SchoolIcon });
    }
    return opts;
  }, [adminSchools]);

  const updateTopic = (i: number, patch: Partial<SyllabusTopic>) => {
    setTopics(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  };
  const addTopic = () => setTopics(prev => [...prev, { title: '', description: '', topic_code: String(prev.length + 1) }]);
  const removeTopic = (i: number) => setTopics(prev => prev.filter((_, idx) => idx !== i));

  const handleCreate = async () => {
    if (!user) return;
    if (!form.title.trim()) { toast.error('Course title is required'); return; }
    if (form.visibility === 'school' && !form.school_id) { toast.error('Pick a school'); return; }

    setSaving(true);
    try {
      const insertPayload: any = {
        title: form.title.trim(),
        subject: form.subject,
        curriculum_type: form.curriculum_type,
        level: form.level,
        description: form.description.trim(),
        icon_emoji: form.icon_emoji || '📚',
        estimated_hours: Number(form.estimated_hours) || 60,
        syllabus_content: form.syllabus_content.trim() || null,
        is_official: false,
        created_by: user.id,
        visibility: form.visibility,
        school_id: form.visibility === 'school' ? form.school_id : null,
      };
      const { data: course, error } = await supabase
        .from('courses').insert(insertPayload).select().single();
      if (error) throw error;

      const validTopics = topics.filter(t => t.title.trim());
      if (validTopics.length > 0) {
        const topicRows = validTopics.map((t, idx) => ({
          course_id: course.id,
          title: t.title.trim(),
          description: t.description.trim(),
          topic_code: t.topic_code.trim() || String(idx + 1),
          topic_order: idx,
        }));
        await supabase.from('course_topics').insert(topicRows as any);
      }

      toast.success('Course created!');
      navigate(`/course/${course.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create course');
    } finally {
      setSaving(false);
    }
  };

  if (!isTeacherOrAdmin) {
    return (
      <div className="flex h-screen bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Only teachers and admins can create custom courses.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/my-courses')}>Back</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="container py-8 max-w-4xl">
          <Button variant="ghost" size="sm" onClick={() => navigate('/my-courses')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to My Courses
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" /> Create Custom Course
            </h1>
            <p className="text-muted-foreground mt-1">
              Build a course aligned with any curriculum and choose who can access it.
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Course details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-4">
                <div>
                  <Label>Icon</Label>
                  <Input value={form.icon_emoji} onChange={e => setForm(p => ({ ...p, icon_emoji: e.target.value }))} className="text-2xl text-center" maxLength={2} />
                </div>
                <div>
                  <Label>Course Title *</Label>
                  <Input placeholder="e.g. IB Math AA HL — School Edition" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Subject</Label>
                  <Select value={form.subject} onValueChange={v => setForm(p => ({ ...p, subject: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Curriculum</Label>
                  <Select value={form.curriculum_type} onValueChange={v => setForm(p => ({ ...p, curriculum_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRICULA.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Level</Label>
                  <Select value={form.level} onValueChange={v => setForm(p => ({ ...p, level: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map(l => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What does this course cover?" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Estimated hours</Label>
                  <Input type="number" value={form.estimated_hours} onChange={e => setForm(p => ({ ...p, estimated_hours: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div>
                <Label>Syllabus content (optional)</Label>
                <Textarea rows={4} value={form.syllabus_content} onChange={e => setForm(p => ({ ...p, syllabus_content: e.target.value }))} placeholder="Paste syllabus text, learning objectives, command terms… AI tools will use this for cheatsheets, FRQs, and quizzes." />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Visibility</CardTitle>
              <CardDescription>Who can find and enroll in this course?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {visibilityOptions.map(opt => {
                  const Icon = opt.icon;
                  const active = form.visibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, visibility: opt.value as any }))}
                      className={`text-left rounded-lg border p-3 transition-colors ${active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                    >
                      <Icon className={`h-5 w-5 mb-2 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
              {form.visibility === 'school' && (
                <div>
                  <Label>School</Label>
                  <Select value={form.school_id} onValueChange={v => setForm(p => ({ ...p, school_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Pick school" /></SelectTrigger>
                    <SelectContent>
                      {adminSchools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.visibility === 'class' && (
                <p className="text-xs text-muted-foreground">
                  After creating, link this course to a class from the class page so its students can access it.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Syllabus topics</CardTitle>
                <CardDescription>Topics power FRQs, cheatsheets, flashcards, and progress tracking.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addTopic}><Plus className="h-3.5 w-3.5 mr-1" /> Add topic</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {topics.map((t, i) => (
                <div key={i} className="grid grid-cols-[60px_1fr_1fr_40px] gap-2 items-start">
                  <Input value={t.topic_code} onChange={e => updateTopic(i, { topic_code: e.target.value })} placeholder="1.1" />
                  <Input value={t.title} onChange={e => updateTopic(i, { title: e.target.value })} placeholder="Topic title" />
                  <Input value={t.description} onChange={e => updateTopic(i, { description: e.target.value })} placeholder="Brief description (optional)" />
                  <Button variant="ghost" size="icon" onClick={() => removeTopic(i)} disabled={topics.length === 1}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {topics.filter(t => t.title.trim()).length === 0 && (
                <Badge variant="outline" className="text-muted-foreground">No topics yet — add at least one for richer study tools.</Badge>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/my-courses')}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.title.trim()}>
              {saving ? 'Creating…' : 'Create course'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCoursePage;
