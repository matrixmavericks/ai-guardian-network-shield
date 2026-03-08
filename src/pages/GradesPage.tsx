import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Book, BarChart3, Calendar, FileText, GraduationCap } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchGradingSystems,
  convertPercentageToGrade,
  calculateGPA,
  getGradeColor,
  getGradeBoundaries,
  type GradingSystem,
} from "@/services/gradingService";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";

interface SubmissionGrade {
  id: string;
  grade: number;
  max_grade: number;
  feedback: string | null;
  graded_at: string;
  assignment_title: string;
  subject: string;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const GradesPage = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState<SubmissionGrade[]>([]);
  const [gradingSystems, setGradingSystems] = useState<GradingSystem[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<GradingSystem | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [systems, submissionsRes] = await Promise.all([
        fetchGradingSystems(),
        supabase
          .from("assignment_submissions")
          .select("id, grade, max_grade, feedback, graded_at, assignment_id, status")
          .eq("student_id", user!.id)
          .eq("status", "graded")
          .not("grade", "is", null)
          .order("graded_at", { ascending: false }),
      ]);

      setGradingSystems(systems);
      setSelectedSystem(systems.find(s => s.is_default) || systems[0] || null);

      const subs = submissionsRes.data || [];
      if (subs.length > 0) {
        const assignmentIds = [...new Set(subs.map((s: any) => s.assignment_id))];
        const { data: assignments } = await supabase
          .from("class_assignments")
          .select("id, title, subject")
          .in("id", assignmentIds);
        const aMap = Object.fromEntries((assignments || []).map((a: any) => [a.id, a]));

        setGrades(
          subs.map((s: any) => ({
            id: s.id,
            grade: s.grade,
            max_grade: s.max_grade,
            feedback: s.feedback,
            graded_at: s.graded_at,
            assignment_title: aMap[s.assignment_id]?.title || "Unknown",
            subject: aMap[s.assignment_id]?.subject || "General",
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load grades:", err);
    } finally {
      setLoading(false);
    }
  };

  const subjects = useMemo(() => [...new Set(grades.map(g => g.subject))], [grades]);
  const filteredGrades = subjectFilter ? grades.filter(g => g.subject === subjectFilter) : grades;

  const percentages = useMemo(() => grades.map(g => (g.grade / g.max_grade) * 100), [grades]);
  const overallAvg = percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0;

  const subjectAverages = useMemo(() =>
    subjects.map(subject => {
      const sg = grades.filter(g => g.subject === subject);
      const avg = sg.reduce((sum, g) => sum + (g.grade / g.max_grade) * 100, 0) / sg.length;
      return { subject, average: Math.round(avg * 100) / 100 };
    }).sort((a, b) => b.average - a.average),
    [grades, subjects]
  );

  const gradesToChart = useMemo(() =>
    [...grades]
      .sort((a, b) => new Date(a.graded_at).getTime() - new Date(b.graded_at).getTime())
      .map(g => ({
        date: format(new Date(g.graded_at), "MM/dd"),
        name: g.assignment_title,
        score: Math.round((g.grade / g.max_grade) * 100),
      })),
    [grades]
  );

  // Grade distribution
  const gradeDistribution = useMemo(() => {
    if (!selectedSystem) return [];
    const boundaries = getGradeBoundaries(selectedSystem);
    return boundaries.map((b, i) => {
      const upper = i === 0 ? 101 : boundaries[i - 1].min;
      const count = percentages.filter(p => p >= b.min && p < upper).length;
      return { label: b.label, count };
    }).filter(d => d.count > 0);
  }, [percentages, selectedSystem]);

  const gpa = selectedSystem ? calculateGPA(percentages, selectedSystem) : null;

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading grades...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold">Grades & Progress</h1>
            {gradingSystems.length > 0 && (
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={selectedSystem?.id || ""}
                  onValueChange={(val) => setSelectedSystem(gradingSystems.find(s => s.id === val) || null)}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Grading System" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradingSystems.map(sys => (
                      <SelectItem key={sys.id} value={sys.id}>{sys.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Summary cards */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Grade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className={`text-3xl font-bold ${getGradeColor(overallAvg)}`}>
                    {Math.round(overallAvg)}%
                  </span>
                  {selectedSystem && (
                    <Badge variant="outline" className="text-lg">
                      {convertPercentageToGrade(overallAvg, selectedSystem)}
                    </Badge>
                  )}
                </div>
                <Progress value={overallAvg} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Assignments Graded</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{grades.length}</div>
                <p className="mt-1 text-sm text-muted-foreground">{subjects.length} subjects</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Best Subject</CardTitle>
              </CardHeader>
              <CardContent>
                {subjectAverages.length > 0 ? (
                  <>
                    <div className="text-xl font-bold">{subjectAverages[0].subject}</div>
                    <p className="mt-1 text-sm text-emerald-600">
                      {selectedSystem
                        ? convertPercentageToGrade(subjectAverages[0].average, selectedSystem)
                        : `${Math.round(subjectAverages[0].average)}%`}
                      {" "}({Math.round(subjectAverages[0].average)}%)
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No data</p>
                )}
              </CardContent>
            </Card>

            {gpa !== null ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">GPA</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{gpa.toFixed(2)}</div>
                  <p className="mt-1 text-sm text-muted-foreground">/ 4.0 scale</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {selectedSystem?.code === "ib" ? "IB Grade" : "Final Grade"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedSystem ? (
                    <>
                      <div className="text-3xl font-bold">
                        {convertPercentageToGrade(overallAvg, selectedSystem)}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedSystem.code === "ib" ? "/ 7" : selectedSystem.name}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Select a system</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Charts row */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Grade Timeline</CardTitle>
                <CardDescription>Performance trend over time</CardDescription>
              </CardHeader>
              <CardContent>
                {gradesToChart.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={gradesToChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" activeDot={{ r: 6 }} name="Grade %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                    <BarChart3 className="mb-2 h-12 w-12 opacity-30" />
                    <p>No grades yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
                <CardDescription>{selectedSystem?.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {gradeDistribution.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={gradeDistribution} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={({ label, count }) => `${label} (${count})`}>
                          {gradeDistribution.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                    <BarChart3 className="mb-2 h-12 w-12 opacity-30" />
                    <p>No data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Subject performance */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Subject Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {subjectAverages.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectAverages}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(val: number) =>
                        selectedSystem
                          ? [`${val}% (${convertPercentageToGrade(val, selectedSystem)})`, "Average"]
                          : [`${val}%`, "Average"]
                      } />
                      <Bar dataKey="average" fill="hsl(var(--primary))" name="Average %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                  <Book className="mb-2 h-12 w-12 opacity-30" />
                  <p>No subject data</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed grades table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>All Grades</CardTitle>
                  <CardDescription>Detailed view of all graded assignments</CardDescription>
                </div>
                {subjects.length > 0 && (
                  <Select onValueChange={(value) => setSubjectFilter(value === "all" ? null : value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Raw Score</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="hidden md:table-cell">Feedback</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No graded assignments yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGrades.map(g => {
                      const pct = (g.grade / g.max_grade) * 100;
                      return (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.assignment_title}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{g.subject}</Badge>
                          </TableCell>
                          <TableCell>{g.grade}/{g.max_grade}</TableCell>
                          <TableCell>
                            <span className={`font-bold ${getGradeColor(pct)}`}>
                              {selectedSystem ? convertPercentageToGrade(pct, selectedSystem) : `${Math.round(pct)}%`}
                            </span>
                          </TableCell>
                          <TableCell className="hidden max-w-[200px] truncate text-sm text-muted-foreground md:table-cell">
                            {g.feedback || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {g.graded_at ? format(new Date(g.graded_at), "MMM d, yyyy") : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GradesPage;
