
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Book, 
  BarChart3, 
  Calendar, 
  FileText
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { format } from "date-fns";
import { 
  getGradesByStudent, 
  getAssignmentById, 
  Assignment,
  Grade, 
  getCurrentUser
} from "@/services/localStorageService";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

const GradesPage = () => {
  const [grades, setGrades] = useState<(Grade & { assignment: Assignment })[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const currentUser = getCurrentUser();
  const subjects = [...new Set(grades.map(g => g.assignment.subject))];

  useEffect(() => {
    if (currentUser) {
      loadGrades();
    }
  }, [currentUser]);

  const loadGrades = () => {
    if (!currentUser) return;

    const studentGrades = getGradesByStudent(currentUser.id);
    
    // Enrich grades with assignment data
    const enrichedGrades = studentGrades.map(grade => {
      const assignment = getAssignmentById(grade.assignmentId);
      return {
        ...grade,
        assignment: assignment!
      };
    });

    setGrades(enrichedGrades);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-blue-600";
    if (percentage >= 70) return "text-yellow-600";
    if (percentage >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getGradeLabel = (percentage: number) => {
    if (percentage >= 90) return "A";
    if (percentage >= 80) return "B";
    if (percentage >= 70) return "C";
    if (percentage >= 60) return "D";
    return "F";
  };

  const filteredGrades = subjectFilter
    ? grades.filter(g => g.assignment.subject === subjectFilter)
    : grades;

  // Calculate overall average
  const overallAverage = grades.length > 0
    ? grades.reduce((sum, g) => sum + (g.score / g.assignment.points) * 100, 0) / grades.length
    : 0;

  // Calculate subject averages for chart
  const subjectAverages = subjects.map(subject => {
    const subjectGrades = grades.filter(g => g.assignment.subject === subject);
    const average = subjectGrades.length > 0
      ? subjectGrades.reduce((sum, g) => sum + (g.score / g.assignment.points) * 100, 0) / subjectGrades.length
      : 0;
    
    return {
      subject,
      average: Math.round(average * 100) / 100
    };
  });

  // Prepare data for timeline chart
  const gradesToChart = [...grades]
    .sort((a, b) => new Date(a.gradedAt).getTime() - new Date(b.gradedAt).getTime())
    .map(g => ({
      date: format(new Date(g.gradedAt), "MM/dd"),
      name: g.assignment.title,
      score: Math.round((g.score / g.assignment.points) * 100)
    }));

  return (
    <div className="flex h-screen bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Grades & Progress</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Grade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">
                    <span className={getGradeColor(overallAverage)}>
                      {Math.round(overallAverage)}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold bg-slate-100 px-3 py-1 rounded">
                    <span className={getGradeColor(overallAverage)}>
                      {getGradeLabel(overallAverage)}
                    </span>
                  </div>
                </div>
                <Progress value={overallAverage} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Assignments Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {grades.length}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {subjects.length} subjects
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Best Performing Subject</CardTitle>
              </CardHeader>
              <CardContent>
                {subjects.length > 0 ? (
                  <>
                    <div className="text-2xl font-bold">
                      {subjectAverages.sort((a, b) => b.average - a.average)[0]?.subject}
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      {Math.round(subjectAverages.sort((a, b) => b.average - a.average)[0]?.average)}% average score
                    </p>
                  </>
                ) : (
                  <p className="text-slate-500">No data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Grade Timeline</CardTitle>
                <CardDescription>Your performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                {gradesToChart.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={gradesToChart}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#4F46E5"
                          activeDot={{ r: 8 }}
                          name="Grade %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <BarChart3 className="h-12 w-12 mb-2 text-slate-300" />
                    <p>No grades data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Subject Performance</CardTitle>
                <CardDescription>Average grade by subject</CardDescription>
              </CardHeader>
              <CardContent>
                {subjectAverages.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={subjectAverages}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="subject" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="average" fill="#4F46E5" name="Average %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <Book className="h-12 w-12 mb-2 text-slate-300" />
                    <p>No subject data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Grades</CardTitle>
                  <CardDescription>
                    View your grades and assignment feedback
                  </CardDescription>
                </div>
                {subjects.length > 0 && (
                  <Select onValueChange={(value) => setSubjectFilter(value || null)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Subjects</SelectItem>
                      {subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="byDate">
                <TabsList className="mb-4">
                  <TabsTrigger value="byDate">
                    <Calendar className="h-4 w-4 mr-2" />
                    By Date
                  </TabsTrigger>
                  <TabsTrigger value="bySubject">
                    <Book className="h-4 w-4 mr-2" />
                    By Subject
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="byDate">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Assignment</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Feedback</TableHead>
                          <TableHead>Date Graded</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredGrades.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                              No grades found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredGrades
                            .sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime())
                            .map((grade) => (
                              <TableRow key={grade.id}>
                                <TableCell className="font-medium">
                                  {grade.assignment.title}
                                </TableCell>
                                <TableCell>
                                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                    {grade.assignment.subject}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold">
                                      {grade.score}/{grade.assignment.points}
                                    </span>
                                    <span className={`${getGradeColor((grade.score / grade.assignment.points) * 100)}`}>
                                      ({Math.round((grade.score / grade.assignment.points) * 100)}%)
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {grade.feedback || "No feedback provided"}
                                </TableCell>
                                <TableCell>{formatDate(grade.gradedAt)}</TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="bySubject">
                  {subjects.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p>No grades available yet</p>
                    </div>
                  ) : (
                    subjects
                      .filter(subject => !subjectFilter || subject === subjectFilter)
                      .map(subject => {
                        const subjectGrades = grades.filter(g => g.assignment.subject === subject);
                        const subjectAverage = subjectGrades.reduce((sum, g) => sum + (g.score / g.assignment.points) * 100, 0) / subjectGrades.length;
                        
                        return (
                          <Card key={subject} className="mb-6 border-t-0 rounded-tl-none rounded-tr-none">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{subject}</CardTitle>
                                <div className="text-xl font-bold">
                                  <span className={getGradeColor(subjectAverage)}>
                                    {Math.round(subjectAverage)}%
                                  </span>
                                  <span className="ml-2 text-sm bg-slate-100 px-2 py-1 rounded">
                                    {getGradeLabel(subjectAverage)}
                                  </span>
                                </div>
                              </div>
                              <Progress value={subjectAverage} className="mt-2" />
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Assignment</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Date</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {subjectGrades.map(grade => (
                                    <TableRow key={grade.id}>
                                      <TableCell className="font-medium">
                                        {grade.assignment.title}
                                      </TableCell>
                                      <TableCell>
                                        <span className={`font-bold ${getGradeColor((grade.score / grade.assignment.points) * 100)}`}>
                                          {grade.score}/{grade.assignment.points} ({Math.round((grade.score / grade.assignment.points) * 100)}%)
                                        </span>
                                      </TableCell>
                                      <TableCell>{formatDate(grade.gradedAt)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        );
                      })
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GradesPage;
