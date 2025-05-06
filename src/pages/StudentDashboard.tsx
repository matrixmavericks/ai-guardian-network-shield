
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import DashboardSidebar from '@/components/DashboardSidebar';
import { 
  Book, 
  Brain, 
  Calendar, 
  Clock, 
  FileText, 
  GraduationCap, 
  TrendingUp,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow, format, isAfter, subDays } from 'date-fns';
import { 
  getCurrentUser, 
  getAssignments,
  getGradesByStudent,
  getAssignmentById
} from '@/services/localStorageService';

const StudentDashboard = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [assignments, setAssignments] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (currentUser) {
      const allAssignments = getAssignments();
      const studentGrades = getGradesByStudent(currentUser.id);
      
      // Enrich grades with assignment data
      const enrichedGrades = studentGrades.map(grade => {
        const assignment = getAssignmentById(grade.assignmentId);
        return {
          ...grade,
          assignment
        };
      });
      
      setAssignments(allAssignments);
      setGrades(enrichedGrades);
    }
  }, [currentUser]);

  // Calculate stats
  const pendingAssignments = assignments.filter(
    assignment => !grades.some(grade => grade.assignmentId === assignment.id)
  );
  
  const upcomingAssignments = pendingAssignments
    .filter(assignment => isAfter(new Date(assignment.dueDate), new Date()))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  
  const overdueAssignments = pendingAssignments
    .filter(assignment => !isAfter(new Date(assignment.dueDate), new Date()))
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  
  const recentGrades = [...grades]
    .sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime())
    .slice(0, 5);

  // Calculate subject averages
  const subjects = [...new Set(assignments.map(a => a.subject))];
  
  const subjectStats = subjects.map(subject => {
    const subjectAssignments = assignments.filter(a => a.subject === subject);
    const subjectGrades = grades.filter(g => 
      g.assignment && g.assignment.subject === subject
    );
    
    const totalAssignments = subjectAssignments.length;
    const completedAssignments = subjectGrades.length;
    const pendingAssignments = totalAssignments - completedAssignments;
    
    let averageGrade = 0;
    if (subjectGrades.length > 0) {
      averageGrade = subjectGrades.reduce((sum, g) => 
        sum + (g.score / g.assignment.points) * 100, 0
      ) / subjectGrades.length;
    }
    
    return {
      subject,
      totalAssignments,
      completedAssignments,
      pendingAssignments,
      averageGrade,
      progressPercent: totalAssignments > 0 
        ? Math.round((completedAssignments / totalAssignments) * 100) 
        : 0
    };
  });

  // Calculate overall average
  const overallAverage = grades.length > 0
    ? grades.reduce((sum, g) => sum + (g.score / g.assignment.points) * 100, 0) / grades.length
    : 0;

  // Prepare data for charts
  const subjectPerformanceData = subjectStats.map(s => ({
    name: s.subject,
    average: Math.round(s.averageGrade),
    completed: s.completedAssignments,
    pending: s.pendingAssignments
  }));
  
  const timelineData = grades
    .sort((a, b) => new Date(a.gradedAt).getTime() - new Date(b.gradedAt).getTime())
    .map(g => ({
      date: format(new Date(g.gradedAt), "MM/dd"),
      score: Math.round((g.score / g.assignment.points) * 100)
    }));

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

  // Pie chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const subjectDistributionData = subjectStats.map((s, i) => ({
    name: s.subject,
    value: s.totalAssignments,
    color: COLORS[i % COLORS.length]
  }));

  return (
    <div className="flex h-screen bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Student Dashboard</h1>
              <p className="text-slate-600">
                Welcome back, {currentUser?.name || 'Student'}!
              </p>
            </div>
          </div>

          <Tabs defaultValue={activeTab}>
            <TabsList className="mb-8">
              <TabsTrigger value="overview">
                <TrendingUp className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="assignments">
                <FileText className="mr-2 h-4 w-4" />
                Assignments
              </TabsTrigger>
              <TabsTrigger value="progress">
                <GraduationCap className="mr-2 h-4 w-4" />
                Progress
              </TabsTrigger>
              <TabsTrigger value="learning">
                <Brain className="mr-2 h-4 w-4" />
                AI Learning
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                    <CardTitle className="text-sm font-medium">Upcoming Due Dates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {upcomingAssignments.length}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {overdueAssignments.length > 0 && (
                        <span className="text-red-500">{overdueAssignments.length} overdue</span>
                      )}
                      {overdueAssignments.length > 0 && upcomingAssignments.length > 0 && " • "}
                      {upcomingAssignments.length > 0 && (
                        <span>Next due: {formatDistanceToNow(new Date(upcomingAssignments[0].dueDate), { addSuffix: true })}</span>
                      )}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Learning Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {assignments.length > 0 ? (
                      <>
                        <div className="text-3xl font-bold">
                          {Math.round((grades.length / assignments.length) * 100)}%
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {grades.length} of {assignments.length} assignments completed
                        </p>
                        <Progress 
                          value={(grades.length / assignments.length) * 100} 
                          className="mt-2" 
                        />
                      </>
                    ) : (
                      <p className="text-slate-500">No assignments yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle>Performance Over Time</CardTitle>
                    <CardDescription>Your grade trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {timelineData.length > 0 ? (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={timelineData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Area 
                              type="monotone" 
                              dataKey="score" 
                              stroke="#8884d8" 
                              fill="#8884d8" 
                              fillOpacity={0.2}
                              name="Grade %"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-80 text-slate-500">
                        <TrendingUp className="h-12 w-12 mb-2 text-slate-300" />
                        <p>No grades data available yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Subject Distribution</CardTitle>
                    <CardDescription>Assignments by subject</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {subjectDistributionData.length > 0 ? (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={subjectDistributionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              fill="#8884d8"
                              paddingAngle={5}
                              dataKey="value"
                              label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {subjectDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-80 text-slate-500">
                        <Book className="h-12 w-12 mb-2 text-slate-300" />
                        <p>No assignments data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Assignments</CardTitle>
                    <CardDescription>Assignments due soon</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {upcomingAssignments.length > 0 ? (
                      <div className="space-y-4">
                        {upcomingAssignments.slice(0, 5).map(assignment => (
                          <div key={assignment.id} className="flex items-start">
                            <div className="bg-blue-100 text-blue-700 p-3 rounded-full mr-3">
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-medium">{assignment.title}</h4>
                              <div className="text-sm text-slate-500 flex items-center mt-1">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>
                                  Due {formatDistanceToNow(new Date(assignment.dueDate), { addSuffix: true })}
                                </span>
                              </div>
                              <div className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded mt-1 inline-block">
                                {assignment.subject}
                              </div>
                            </div>
                          </div>
                        ))}
                        {upcomingAssignments.length > 5 && (
                          <Button variant="link" className="pl-0">
                            View all {upcomingAssignments.length} upcoming assignments
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                        <CheckCircle2 className="h-12 w-12 mb-2 text-green-200" />
                        <p>No upcoming assignments due!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Grades</CardTitle>
                    <CardDescription>Your most recent graded assignments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentGrades.length > 0 ? (
                      <div className="space-y-4">
                        {recentGrades.map(grade => (
                          <div key={grade.id} className="flex items-start">
                            <div className="bg-slate-100 text-slate-700 p-3 rounded-full mr-3">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <h4 className="font-medium">{grade.assignment.title}</h4>
                                <span className={`font-bold ${getGradeColor((grade.score / grade.assignment.points) * 100)}`}>
                                  {Math.round((grade.score / grade.assignment.points) * 100)}%
                                </span>
                              </div>
                              <div className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded mt-1 inline-block">
                                {grade.assignment.subject}
                              </div>
                            </div>
                          </div>
                        ))}
                        {grades.length > 5 && (
                          <Button variant="link" className="pl-0">
                            View all grades
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                        <FileText className="h-12 w-12 mb-2 text-slate-300" />
                        <p>No grades available yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="assignments">
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Assignments</CardTitle>
                    <CardDescription>Assignments due soon</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {upcomingAssignments.length > 0 ? (
                      <div className="space-y-4">
                        {upcomingAssignments.map(assignment => (
                          <div key={assignment.id} className="border-b pb-4 last:border-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-lg">{assignment.title}</h4>
                                <p className="text-sm text-slate-500 mt-1">{assignment.description}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  Due {format(new Date(assignment.dueDate), "MMM d, yyyy")}
                                </div>
                                <div className="text-xs mt-1">
                                  {assignment.points} points
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center">
                              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded mr-2">
                                {assignment.subject}
                              </span>
                              <span className="text-xs text-slate-500">
                                Added {formatDistanceToNow(new Date(assignment.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                        <CheckCircle2 className="h-12 w-12 mb-2 text-green-200" />
                        <p>No upcoming assignments due!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {overdueAssignments.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader className="border-b-red-200">
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                        <CardTitle>Overdue Assignments</CardTitle>
                      </div>
                      <CardDescription>
                        These assignments are past their due date
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {overdueAssignments.map(assignment => (
                          <div key={assignment.id} className="border-b pb-4 last:border-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-lg">{assignment.title}</h4>
                                <p className="text-sm text-slate-500 mt-1">{assignment.description}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                  Due {format(new Date(assignment.dueDate), "MMM d, yyyy")}
                                </div>
                                <div className="text-xs mt-1">
                                  {assignment.points} points
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center">
                              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded mr-2">
                                {assignment.subject}
                              </span>
                              <span className="text-xs text-red-500">
                                {formatDistanceToNow(new Date(assignment.dueDate))} overdue
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {grades.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Completed Assignments</CardTitle>
                      <CardDescription>Assignments you've submitted and received grades for</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {grades.map(grade => (
                          <div key={grade.id} className="border-b pb-4 last:border-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-lg">{grade.assignment.title}</h4>
                                {grade.feedback && (
                                  <p className="text-sm text-slate-500 mt-1">{grade.feedback}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className={`text-lg font-bold ${getGradeColor((grade.score / grade.assignment.points) * 100)}`}>
                                  {grade.score}/{grade.assignment.points} ({Math.round((grade.score / grade.assignment.points) * 100)}%)
                                </div>
                                <div className="text-xs mt-1">
                                  Graded {formatDistanceToNow(new Date(grade.gradedAt), { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center">
                              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded mr-2">
                                {grade.assignment.subject}
                              </span>
                              <span className="text-xs text-slate-500">
                                Submitted {formatDistanceToNow(new Date(grade.submittedAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="progress">
              <div className="grid grid-cols-1 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Subject Performance</CardTitle>
                    <CardDescription>Your grades across different subjects</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {subjectPerformanceData.length > 0 ? (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={subjectPerformanceData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="average" name="Average Grade %" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-80 text-slate-500">
                        <TrendingUp className="h-12 w-12 mb-2 text-slate-300" />
                        <p>No grade data available yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {subjectStats.map((stat) => (
                  <Card key={stat.subject}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>{stat.subject}</CardTitle>
                        <div className="text-xl font-bold">
                          <span className={getGradeColor(stat.averageGrade)}>
                            {Math.round(stat.averageGrade)}%
                          </span>
                          <span className="ml-2 text-sm bg-slate-100 px-2 py-1 rounded">
                            {getGradeLabel(stat.averageGrade)}
                          </span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <div className="flex justify-between text-sm text-slate-500 mb-1">
                          <span>Progress</span>
                          <span>{stat.progressPercent}%</span>
                        </div>
                        <Progress value={stat.progressPercent} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded">
                          <div className="text-sm text-slate-500">Completed</div>
                          <div className="text-2xl font-bold">{stat.completedAssignments}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded">
                          <div className="text-sm text-slate-500">Pending</div>
                          <div className="text-2xl font-bold">{stat.pendingAssignments}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="learning">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Learning Assistant</CardTitle>
                    <CardDescription>
                      Get help with your studies using our AI learning assistant
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">
                      The AI Learning Assistant can help you with:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                        <span>Answering questions about your assignments</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                        <span>Explaining difficult concepts</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                        <span>Providing study tips and summaries</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                        <span>Creating practice questions</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">
                      <Brain className="mr-2 h-4 w-4" />
                      Open AI Learning Assistant
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Your Learning Activity</CardTitle>
                    <CardDescription>
                      Progress report on your learning activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Study Sessions</h4>
                          <p className="text-sm text-slate-500">
                            Track your focus time
                          </p>
                        </div>
                        <div className="text-2xl font-bold">12</div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Questions Asked</h4>
                          <p className="text-sm text-slate-500">
                            To the AI assistant
                          </p>
                        </div>
                        <div className="text-2xl font-bold">48</div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Practice Problems</h4>
                          <p className="text-sm text-slate-500">
                            Completed exercises
                          </p>
                        </div>
                        <div className="text-2xl font-bold">24</div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline">View Activity</Button>
                    <Button variant="outline">Set Goals</Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
