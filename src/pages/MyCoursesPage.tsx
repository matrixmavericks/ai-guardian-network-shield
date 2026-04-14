import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Search, BookOpen, GraduationCap, Plus, Clock, BarChart3,
  Star, TrendingUp, ChevronRight, Sparkles, Filter
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  curriculum_type: string;
  subject: string;
  level: string;
  description: string;
  icon_emoji: string;
  estimated_hours: number;
  is_official: boolean;
  tags: string[];
}

interface EnrolledCourse extends Course {
  enrollment_id: string;
  progress: number;
  mastery_score: number;
  study_time_minutes: number;
  last_studied_at: string | null;
}

const CURRICULUM_COLORS: Record<string, string> = {
  ib: 'bg-blue-100 text-blue-700 border-blue-200',
  ap: 'bg-green-100 text-green-700 border-green-200',
  igcse: 'bg-purple-100 text-purple-700 border-purple-200',
  a_levels: 'bg-amber-100 text-amber-700 border-amber-200',
  cbse: 'bg-orange-100 text-orange-700 border-orange-200',
  general: 'bg-muted text-muted-foreground border-border',
};

const CURRICULUM_LABELS: Record<string, string> = {
  ib: 'IB', ap: 'AP', igcse: 'IGCSE', a_levels: 'A-Level', cbse: 'CBSE', general: 'General', custom: 'Custom',
};

const MyCoursesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [curriculumFilter, setCurriculumFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [tab, setTab] = useState('enrolled');

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch all courses
      const { data: allCourses } = await supabase
        .from('courses')
        .select('*')
        .order('curriculum_type')
        .order('title') as any;

      // Fetch enrolled courses
      const { data: enrollments } = await supabase
        .from('student_courses')
        .select('*')
        .eq('user_id', user.id) as any;

      setCourses(allCourses || []);

      // Merge enrollment data with course data
      const enrolled = (enrollments || []).map((e: any) => {
        const course = (allCourses || []).find((c: any) => c.id === e.course_id);
        return course ? { ...course, enrollment_id: e.id, progress: e.progress, mastery_score: e.mastery_score, study_time_minutes: e.study_time_minutes, last_studied_at: e.last_studied_at } : null;
      }).filter(Boolean) as EnrolledCourse[];

      setEnrolledCourses(enrolled);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('student_courses').insert({
        user_id: user.id, course_id: courseId,
      } as any);
      if (error) {
        if (error.code === '23505') { toast.info('Already enrolled!'); return; }
        throw error;
      }
      toast.success('Enrolled successfully!');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to enroll');
    }
  };

  const enrolledIds = new Set(enrolledCourses.map(c => c.id));

  const filteredCourses = courses.filter(c => {
    if (enrolledIds.has(c.id)) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.subject.toLowerCase().includes(search.toLowerCase())) return false;
    if (curriculumFilter !== 'all' && c.curriculum_type !== curriculumFilter) return false;
    if (subjectFilter !== 'all' && c.subject !== subjectFilter) return false;
    return true;
  });

  const subjects = [...new Set(courses.map(c => c.subject))].sort();
  const totalStudyHours = Math.round(enrolledCourses.reduce((sum, c) => sum + (c.study_time_minutes || 0), 0) / 60);
  const avgMastery = enrolledCourses.length > 0 ? Math.round(enrolledCourses.reduce((sum, c) => sum + (c.mastery_score || 0), 0) / enrolledCourses.length) : 0;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="container py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              My Courses
            </h1>
            <p className="text-muted-foreground mt-1">
              Study IB, AP, IGCSE, and A-Level courses with AI-powered tools
            </p>
          </div>

          {/* Stats Overview */}
          {enrolledCourses.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <BookOpen className="h-4 w-4" /> Courses
                  </div>
                  <p className="text-2xl font-bold">{enrolledCourses.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" /> Study Time
                  </div>
                  <p className="text-2xl font-bold">{totalStudyHours}h</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" /> Avg Mastery
                  </div>
                  <p className="text-2xl font-bold">{avgMastery}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Star className="h-4 w-4" /> Topics Mastered
                  </div>
                  <p className="text-2xl font-bold">—</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="enrolled" className="gap-1.5">
                <BookOpen className="h-4 w-4" /> My Courses ({enrolledCourses.length})
              </TabsTrigger>
              <TabsTrigger value="browse" className="gap-1.5">
                <Search className="h-4 w-4" /> Browse Catalog
              </TabsTrigger>
            </TabsList>

            {/* Enrolled Courses */}
            <TabsContent value="enrolled">
              {loading ? (
                <div className="text-center py-16 text-muted-foreground">Loading...</div>
              ) : enrolledCourses.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <GraduationCap className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                    <p className="text-muted-foreground mb-4">Browse the catalog to enroll in IB, AP, IGCSE, or A-Level courses</p>
                    <Button onClick={() => setTab('browse')}>
                      <Search className="mr-2 h-4 w-4" /> Browse Catalog
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enrolledCourses.map(course => (
                    <Card
                      key={course.id}
                      className="hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary/30"
                      onClick={() => navigate(`/course/${course.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <span className="text-3xl">{course.icon_emoji}</span>
                          <Badge variant="outline" className={CURRICULUM_COLORS[course.curriculum_type] || ''}>
                            {CURRICULUM_LABELS[course.curriculum_type] || course.curriculum_type}
                          </Badge>
                        </div>
                        <CardTitle className="text-base mt-2 group-hover:text-primary transition-colors line-clamp-2">
                          {course.title}
                        </CardTitle>
                        <CardDescription className="text-xs">{course.subject} · {course.level}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Mastery</span>
                            <span className="font-medium">{Math.round(course.mastery_score || 0)}%</span>
                          </div>
                          <Progress value={course.mastery_score || 0} className="h-2" />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{Math.round((course.study_time_minutes || 0) / 60)}h studied</span>
                          <span className="flex items-center gap-1 text-primary group-hover:translate-x-0.5 transition-transform">
                            Continue <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Browse Catalog */}
            <TabsContent value="browse">
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={curriculumFilter} onValueChange={setCurriculumFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Curriculum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Curricula</SelectItem>
                    <SelectItem value="ib">IB</SelectItem>
                    <SelectItem value="ap">AP</SelectItem>
                    <SelectItem value="igcse">IGCSE</SelectItem>
                    <SelectItem value="a_levels">A-Level</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => navigate('/course/create')}>
                  <Plus className="mr-2 h-4 w-4" /> Custom Course
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-16 text-muted-foreground">Loading catalog...</div>
              ) : filteredCourses.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  No courses match your filters. Try adjusting your search.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCourses.map(course => (
                    <Card key={course.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <span className="text-2xl">{course.icon_emoji}</span>
                          <Badge variant="outline" className={CURRICULUM_COLORS[course.curriculum_type] || ''}>
                            {CURRICULUM_LABELS[course.curriculum_type] || course.curriculum_type}
                          </Badge>
                        </div>
                        <CardTitle className="text-base mt-2 line-clamp-2">{course.title}</CardTitle>
                        <CardDescription className="text-xs">{course.subject} · {course.level}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{course.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> ~{course.estimated_hours}h
                          </span>
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); handleEnroll(course.id); }}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Enroll
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MyCoursesPage;
