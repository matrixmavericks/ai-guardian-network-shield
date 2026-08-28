import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSidebar from '@/components/DashboardSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Library, Search, Globe, Lock, User as UserIcon, Plus, BookOpen, Route as RouteIcon,
} from 'lucide-react';

type Visibility = 'public' | 'private';

interface LibraryItem {
  id: string;
  kind: 'course' | 'path';
  title: string;
  description: string;
  subject: string;
  gradeLevel: string | null;
  curriculum: string | null;
  icon: string;
  authorId: string;
  visibility: Visibility;
  rawVisibility: string;
  createdAt: string;
}

const GRADE_LABELS: Record<string, string> = {
  elementary: 'Elementary (K-5)',
  'middle-school': 'Middle School (6-8)',
  'high-school': 'High School (9-12)',
  undergraduate: 'Undergraduate',
  graduate: 'Graduate',
  'self-learner': 'Any Age',
};

const gradeLabel = (g?: string | null) => (g ? GRADE_LABELS[g] || g : 'Unspecified');

const ContentLibraryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('all');
  const [grade, setGrade] = useState('all');
  const [scope, setScope] = useState<'all' | 'public' | 'private'>('all');
  const [tab, setTab] = useState<'all' | 'course' | 'path'>('all');

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: courses, error: cErr }, { data: paths, error: pErr }] = await Promise.all([
        supabase.from('courses').select('*').order('created_at', { ascending: false }),
        supabase.from('learning_paths').select('*').order('created_at', { ascending: false }),
      ]);
      if (cErr) console.warn(cErr);
      if (pErr) console.warn(pErr);

      const courseItems: LibraryItem[] = (courses || []).map((c: any) => ({
        id: c.id,
        kind: 'course',
        title: c.title,
        description: c.description || '',
        subject: c.subject,
        gradeLevel: c.grade_level ?? null,
        curriculum: c.curriculum_type,
        icon: c.icon_emoji || '📚',
        authorId: c.created_by,
        visibility: c.visibility === 'public' ? 'public' : 'private',
        rawVisibility: c.visibility,
        createdAt: c.created_at,
      }));

      const pathItems: LibraryItem[] = (paths || []).map((p: any) => ({
        id: p.id,
        kind: 'path',
        title: p.title,
        description: p.description || '',
        subject: p.subject,
        gradeLevel: p.grade_level ?? null,
        curriculum: null,
        icon: '🧭',
        authorId: p.created_by,
        visibility: p.is_public ? 'public' : 'private',
        rawVisibility: p.is_public ? 'public' : 'private',
        createdAt: p.created_at,
      }));

      const all = [...courseItems, ...pathItems];
      setItems(all);

      const ids = [...new Set(all.map(i => i.authorId).filter(Boolean))];
      if (ids.length) {
        const { data: authorRows } = await supabase.rpc('get_content_authors', { _ids: ids } as any);
        const map: Record<string, string> = {};
        (authorRows || []).forEach((a: any) => { map[a.user_id] = a.full_name; });
        setAuthors(map);
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (item: LibraryItem) => {
    const makePublic = item.visibility === 'private';
    if (item.kind === 'path') {
      const { error } = await supabase.from('learning_paths')
        .update({ is_public: makePublic } as any).eq('id', item.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('courses')
        .update({ visibility: makePublic ? 'public' : 'class' } as any).eq('id', item.id);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(makePublic ? 'Published to the public library' : 'Made private');
    load();
  };

  const subjects = useMemo(() => [...new Set(items.map(i => i.subject).filter(Boolean))].sort(), [items]);
  const grades = useMemo(() => [...new Set(items.map(i => i.gradeLevel).filter(Boolean) as string[])].sort(), [items]);

  const filtered = items.filter(i => {
    if (tab !== 'all' && i.kind !== tab) return false;
    if (subject !== 'all' && i.subject !== subject) return false;
    if (grade !== 'all' && (i.gradeLevel || 'unspecified') !== grade) return false;
    if (scope === 'public' && i.visibility !== 'public') return false;
    if (scope === 'private' && !(i.visibility === 'private' && i.authorId === user?.id)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q) && !i.subject.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, LibraryItem[]>();
    filtered.forEach(i => {
      const key = `${i.subject || 'General'} · ${gradeLabel(i.gradeLevel)}`;
      map.set(key, [...(map.get(key) || []), i]);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="container py-8 max-w-6xl space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Library className="h-8 w-8 text-primary" /> Content Library
              </h1>
              <p className="text-muted-foreground mt-1">
                Courses and learning paths organised by subject and grade level, with the author of each.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/course/create')}>
                <BookOpen className="h-4 w-4 mr-1" /> New course
              </Button>
              <Button onClick={() => navigate('/create-learning-path')}>
                <Plus className="h-4 w-4 mr-1" /> New learning path
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search library…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue placeholder="Grade level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All grade levels</SelectItem>
                  {grades.map(g => <SelectItem key={g} value={g}>{gradeLabel(g)}</SelectItem>)}
                  <SelectItem value="unspecified">Unspecified</SelectItem>
                </SelectContent>
              </Select>
              <Select value={scope} onValueChange={(v: any) => setScope(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everything I can see</SelectItem>
                  <SelectItem value="public">Public library</SelectItem>
                  <SelectItem value="private">My private content</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
            <TabsList>
              <TabsTrigger value="all">All ({items.length})</TabsTrigger>
              <TabsTrigger value="course">Courses</TabsTrigger>
              <TabsTrigger value="path">Learning paths</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4 space-y-6">
              {loading ? (
                <p className="text-muted-foreground text-center py-12">Loading library…</p>
              ) : grouped.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  Nothing matches these filters yet.
                </CardContent></Card>
              ) : grouped.map(([group, groupItems]) => (
                <div key={group} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">{group}</h2>
                    <div className="h-px flex-1 bg-border" />
                    <Badge variant="outline">{groupItems.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groupItems.map(item => (
                      <Card key={`${item.kind}-${item.id}`} className="hover:border-primary/40 transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="text-2xl">{item.icon}</span>
                              <div className="min-w-0">
                                <CardTitle className="text-base truncate">{item.title}</CardTitle>
                                <CardDescription className="line-clamp-2">{item.description || 'No description'}</CardDescription>
                              </div>
                            </div>
                            <Badge variant={item.visibility === 'public' ? 'default' : 'secondary'} className="shrink-0">
                              {item.visibility === 'public'
                                ? <><Globe className="h-3 w-3 mr-1" />Public</>
                                : <><Lock className="h-3 w-3 mr-1" />Private</>}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="outline" className="gap-1">
                              {item.kind === 'course' ? <BookOpen className="h-3 w-3" /> : <RouteIcon className="h-3 w-3" />}
                              {item.kind === 'course' ? 'Course' : 'Learning path'}
                            </Badge>
                            <Badge variant="outline">{item.subject}</Badge>
                            <Badge variant="outline">{gradeLabel(item.gradeLevel)}</Badge>
                            {item.curriculum && <Badge variant="outline" className="uppercase">{item.curriculum}</Badge>}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              {authors[item.authorId] || (item.authorId === user?.id ? 'You' : 'Refyn')}
                            </span>
                            <div className="flex gap-2">
                              {item.authorId === user?.id && (
                                <Button size="sm" variant="outline" onClick={() => togglePublish(item)}>
                                  {item.visibility === 'public' ? 'Make private' : 'Publish'}
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => navigate(item.kind === 'course' ? `/course/${item.id}` : `/learning-path/${item.id}`)}>
                                Open
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ContentLibraryPage;
