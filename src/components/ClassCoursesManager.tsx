import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BookOpen, Plus, Trash2, Search, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  classId: string;
  isTeacher: boolean;
}

interface CourseRow {
  id: string;
  title: string;
  subject: string;
  curriculum_type: string;
  icon_emoji: string;
  level: string;
}

interface LinkRow {
  id: string;
  course_id: string;
  auto_enroll: boolean;
  course?: CourseRow;
}

const ClassCoursesManager: React.FC<Props> = ({ classId, isTeacher }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [linked, setLinked] = useState<LinkRow[]>([]);
  const [allCourses, setAllCourses] = useState<CourseRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [classId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: links }, { data: courses }] = await Promise.all([
        supabase.from('class_courses').select('*').eq('class_id', classId),
        supabase.from('courses').select('id, title, subject, curriculum_type, icon_emoji, level').order('title'),
      ]);
      const courseMap = new Map((courses || []).map((c: any) => [c.id, c]));
      const linkedRows: LinkRow[] = (links || []).map((l: any) => ({
        id: l.id, course_id: l.course_id, auto_enroll: l.auto_enroll,
        course: courseMap.get(l.course_id),
      }));
      setLinked(linkedRows);
      setAllCourses((courses || []) as CourseRow[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const linkedIds = new Set(linked.map(l => l.course_id));

  const filteredAvailable = allCourses
    .filter(c => !linkedIds.has(c.id))
    .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 30);

  const linkCourse = async (courseId: string) => {
    if (!user) return;
    const { error } = await supabase.from('class_courses').insert({
      class_id: classId, course_id: courseId, added_by: user.id, auto_enroll: true,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Course linked to class');
    await autoEnrollClass(courseId);
    fetchData();
  };

  const autoEnrollClass = async (courseId: string) => {
    setEnrolling(courseId);
    try {
      const { data: members } = await supabase
        .from('class_members').select('student_id').eq('class_id', classId);
      if (!members || members.length === 0) return;
      const { data: existing } = await supabase
        .from('student_courses').select('user_id').eq('course_id', courseId)
        .in('user_id', members.map(m => m.student_id));
      const existingIds = new Set((existing || []).map((e: any) => e.user_id));
      const toEnroll = members
        .filter(m => !existingIds.has(m.student_id))
        .map(m => ({ user_id: m.student_id, course_id: courseId }));
      if (toEnroll.length > 0) {
        const { error } = await supabase.from('student_courses').insert(toEnroll as any);
        if (error) {
          console.warn('Auto-enroll partial:', error);
        } else {
          toast.success(`Auto-enrolled ${toEnroll.length} student${toEnroll.length === 1 ? '' : 's'}`);
        }
      }
    } finally {
      setEnrolling(null);
    }
  };

  const toggleAutoEnroll = async (linkId: string, value: boolean) => {
    await supabase.from('class_courses').update({ auto_enroll: value } as any).eq('id', linkId);
    fetchData();
  };

  const unlink = async (linkId: string) => {
    if (!confirm('Unlink this course from the class? Students will keep their enrollments.')) return;
    await supabase.from('class_courses').delete().eq('id', linkId);
    toast.success('Unlinked');
    fetchData();
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Linked Courses ({linked.length})
          </CardTitle>
          <CardDescription>
            Align this class with one or more courses. Class students get auto-enrolled in linked courses (toggle off to opt out).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses linked yet.</p>
          ) : (
            <div className="space-y-2">
              {linked.map(l => (
                <div key={l.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{l.course?.icon_emoji || '📚'}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{l.course?.title || 'Unknown course'}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.course?.subject} · <span className="uppercase">{l.course?.curriculum_type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isTeacher && (
                      <>
                        <div className="flex items-center gap-2">
                          <Switch checked={l.auto_enroll} onCheckedChange={v => toggleAutoEnroll(l.id, v)} />
                          <Label className="text-xs">Auto-enroll</Label>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => autoEnrollClass(l.course_id)} disabled={enrolling === l.course_id}>
                          <Users className="h-3.5 w-3.5 mr-1" />
                          {enrolling === l.course_id ? 'Enrolling…' : 'Sync students'}
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/course/${l.course_id}`)}>Open</Button>
                    {isTeacher && (
                      <Button variant="ghost" size="icon" onClick={() => unlink(l.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-5 w-5" /> Add a course
            </CardTitle>
            <CardDescription>Search the catalog or create your own custom course.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" onClick={() => navigate('/course/create')}>
                <Sparkles className="h-4 w-4 mr-1" /> Create custom
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {filteredAvailable.map(c => (
                <div key={c.id} className="flex items-center justify-between border rounded p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl">{c.icon_emoji}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{c.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.subject} · <Badge variant="outline" className="text-[10px] px-1 ml-1 uppercase">{c.curriculum_type}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => linkCourse(c.id)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {filteredAvailable.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                  No matching courses. Try another search or create a custom one.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassCoursesManager;
