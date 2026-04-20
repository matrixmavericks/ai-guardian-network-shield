import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Users, BookOpen, GraduationCap, UserCheck, X } from 'lucide-react';

interface Props {
  schoolId: string;
}

interface StudentRow { user_id: string; full_name: string; email: string }
interface ClassRow { id: string; name: string; subject: string }
interface CourseRow { id: string; title: string; subject: string; curriculum_type: string; icon_emoji: string }

const SchoolEnrollmentManager: React.FC<Props> = ({ schoolId }) => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [classMembers, setClassMembers] = useState<Map<string, Set<string>>>(new Map());
  const [studentCourses, setStudentCourses] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  // selections
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [tab, setTab] = useState<'classes' | 'courses'>('classes');
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());

  useEffect(() => { fetchAll(); }, [schoolId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // school members (students)
      const { data: members } = await supabase
        .from('school_members').select('user_id, school_role').eq('school_id', schoolId);
      const studentIds = (members || []).filter((m: any) => m.school_role === 'member').map((m: any) => m.user_id);

      const [{ data: profiles }, { data: cls }, { data: schoolCourses }, { data: cm }, { data: sc }] = await Promise.all([
        studentIds.length > 0
          ? supabase.from('profiles').select('user_id, full_name, email').in('user_id', studentIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from('classes').select('id, name, subject').eq('school_id', schoolId),
        supabase.from('courses').select('id, title, subject, curriculum_type, icon_emoji')
          .or(`visibility.eq.public,school_id.eq.${schoolId}`),
        supabase.from('class_members').select('class_id, student_id'),
        studentIds.length > 0
          ? supabase.from('student_courses').select('user_id, course_id').in('user_id', studentIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      setStudents((profiles || []) as StudentRow[]);
      setClasses((cls || []) as ClassRow[]);
      setCourses((schoolCourses || []) as CourseRow[]);

      const cmMap = new Map<string, Set<string>>();
      (cm || []).forEach((row: any) => {
        if (!cmMap.has(row.class_id)) cmMap.set(row.class_id, new Set());
        cmMap.get(row.class_id)!.add(row.student_id);
      });
      setClassMembers(cmMap);

      const scMap = new Map<string, Set<string>>();
      (sc || []).forEach((row: any) => {
        if (!scMap.has(row.user_id)) scMap.set(row.user_id, new Set());
        scMap.get(row.user_id)!.add(row.course_id);
      });
      setStudentCourses(scMap);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() =>
    students.filter(s => !studentSearch ||
      s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email?.toLowerCase().includes(studentSearch.toLowerCase())
    ), [students, studentSearch]);

  const filteredTargets = useMemo(() => {
    if (tab === 'classes') {
      return classes.filter(c => !targetSearch ||
        c.name.toLowerCase().includes(targetSearch.toLowerCase()) ||
        c.subject.toLowerCase().includes(targetSearch.toLowerCase())
      );
    }
    return courses.filter(c => !targetSearch ||
      c.title.toLowerCase().includes(targetSearch.toLowerCase()) ||
      c.subject.toLowerCase().includes(targetSearch.toLowerCase())
    );
  }, [tab, classes, courses, targetSearch]);

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleTarget = (id: string) => {
    setSelectedTargets(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAllStudents = () => {
    if (selectedStudents.size === filteredStudents.length) setSelectedStudents(new Set());
    else setSelectedStudents(new Set(filteredStudents.map(s => s.user_id)));
  };

  const enroll = async () => {
    if (selectedStudents.size === 0 || selectedTargets.size === 0) {
      toast.error('Pick at least one student and one target');
      return;
    }
    setWorking(true);
    try {
      const studentIds = Array.from(selectedStudents);
      const targetIds = Array.from(selectedTargets);
      let inserted = 0, skipped = 0;

      if (tab === 'classes') {
        const rows: any[] = [];
        for (const cId of targetIds) {
          const existing = classMembers.get(cId) || new Set();
          for (const sId of studentIds) {
            if (existing.has(sId)) { skipped++; continue; }
            rows.push({ class_id: cId, student_id: sId });
          }
        }
        if (rows.length > 0) {
          const { error } = await supabase.from('class_members').insert(rows);
          if (error) throw error;
          inserted = rows.length;
        }
      } else {
        const rows: any[] = [];
        for (const sId of studentIds) {
          const existing = studentCourses.get(sId) || new Set();
          for (const cId of targetIds) {
            if (existing.has(cId)) { skipped++; continue; }
            rows.push({ user_id: sId, course_id: cId });
          }
        }
        if (rows.length > 0) {
          const { error } = await supabase.from('student_courses').insert(rows);
          if (error) throw error;
          inserted = rows.length;
        }
      }
      toast.success(`Enrolled ${inserted} · skipped ${skipped} (already enrolled)`);
      setSelectedTargets(new Set());
      setSelectedStudents(new Set());
      fetchAll();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to enroll');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading enrollment data…</div>;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" /> Bulk Enroll Students
        </CardTitle>
        <CardDescription>
          Pick any school students and assign them to one or many classes or courses at once.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Students column */}
          <div className="border rounded-lg overflow-hidden flex flex-col">
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" /> Students
                <Badge variant="secondary">{selectedStudents.size} selected</Badge>
              </div>
              <Button size="sm" variant="ghost" onClick={selectAllStudents}>
                {selectedStudents.size === filteredStudents.length ? 'Clear' : 'Select all'}
              </Button>
            </div>
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-7 h-8 text-sm" placeholder="Search students…" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">No students in this school yet.</p>
              ) : filteredStudents.map(s => (
                <label key={s.user_id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-0">
                  <Checkbox checked={selectedStudents.has(s.user_id)} onCheckedChange={() => toggleStudent(s.user_id)} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.full_name || '—'}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Targets column */}
          <div className="border rounded-lg overflow-hidden flex flex-col">
            <Tabs value={tab} onValueChange={(v: any) => { setTab(v); setSelectedTargets(new Set()); }}>
              <div className="p-3 border-b bg-muted/30 flex items-center justify-between gap-2">
                <TabsList className="h-8">
                  <TabsTrigger value="classes" className="h-6 text-xs"><BookOpen className="h-3 w-3 mr-1" />Classes</TabsTrigger>
                  <TabsTrigger value="courses" className="h-6 text-xs"><GraduationCap className="h-3 w-3 mr-1" />Courses</TabsTrigger>
                </TabsList>
                <Badge variant="secondary">{selectedTargets.size} selected</Badge>
              </div>
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-7 h-8 text-sm" placeholder={`Search ${tab}…`} value={targetSearch} onChange={e => setTargetSearch(e.target.value)} />
                </div>
              </div>
              <TabsContent value="classes" className="m-0">
                <div className="max-h-80 overflow-y-auto">
                  {filteredTargets.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3">No classes assigned to this school.</p>
                  ) : (filteredTargets as ClassRow[]).map(c => (
                    <label key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-0">
                      <Checkbox checked={selectedTargets.has(c.id)} onCheckedChange={() => toggleTarget(c.id)} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{c.subject}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="courses" className="m-0">
                <div className="max-h-80 overflow-y-auto">
                  {filteredTargets.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3">No accessible courses.</p>
                  ) : (filteredTargets as CourseRow[]).map(c => (
                    <label key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-0">
                      <Checkbox checked={selectedTargets.has(c.id)} onCheckedChange={() => toggleTarget(c.id)} />
                      <span className="text-lg">{c.icon_emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{c.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.subject} · <span className="uppercase">{c.curriculum_type}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs text-muted-foreground">
            {selectedStudents.size > 0 && selectedTargets.size > 0 && (
              <>Will create up to <strong>{selectedStudents.size * selectedTargets.size}</strong> enrollments (existing skipped).</>
            )}
          </div>
          <div className="flex gap-2">
            {(selectedStudents.size > 0 || selectedTargets.size > 0) && (
              <Button variant="ghost" size="sm" onClick={() => { setSelectedStudents(new Set()); setSelectedTargets(new Set()); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
            <Button onClick={enroll} disabled={working || selectedStudents.size === 0 || selectedTargets.size === 0}>
              {working ? 'Enrolling…' : `Enroll into ${tab}`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolEnrollmentManager;
