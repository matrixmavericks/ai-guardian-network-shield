import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardNav from '@/components/DashboardNav';
import {
  Activity, Users, School, ShieldCheck, TrendingUp, Database,
  BarChart3, PieChart, RefreshCw, Download, AlertTriangle, Clock,
  CheckCircle, XCircle, BookOpen, Brain, Briefcase, Settings2,
  ChevronRight, Globe, Zap, Target, ArrowUpRight, ArrowDownRight,
  FileText, Lock
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--destructive))',
  'hsl(210, 70%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(45, 90%, 50%)',
  'hsl(280, 60%, 55%)',
];

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0, students: 0, teachers: 0, parents: 0, admins: 0,
    totalClasses: 0, totalPrompts: 0, totalLearningPaths: 0,
    totalPortfolios: 0, totalCapstones: 0, totalMessages: 0,
    blockedPrompts: 0, rewrittenPrompts: 0, flaggedPrompts: 0, approvedPrompts: 0,
    bypassAttempts: 0, criticalBypasses: 0,
    totalChatSessions: 0, totalUsageLogs: 0, estimatedCostUsd: 0,
  });
  const [userList, setUserList] = useState<any[]>([]);
  const [roleData, setRoleData] = useState<any[]>([]);
  const [promptTrends, setPromptTrends] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [recentBypasses, setRecentBypasses] = useState<any[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        { data: profiles },
        { data: roles },
        { data: classes },
        { data: prompts },
        { data: paths },
        { data: portfolios },
        { data: capstones },
        { data: messages },
        { data: bypasses },
        { data: chatSessions },
        { data: usageLogs },
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('user_roles').select('*'),
        supabase.from('classes').select('*, class_members(id)'),
        supabase.from('prompt_logs').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('learning_paths').select('id'),
        supabase.from('portfolio_projects').select('id'),
        supabase.from('capstone_submissions').select('id, status'),
        supabase.from('messages').select('id'),
        supabase.from('bypass_attempts').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('ai_chat_sessions').select('id'),
        supabase.from('ai_usage_logs').select('*'),
      ]);

      const allRoles = roles || [];
      const studentCount = allRoles.filter(r => r.role === 'student').length;
      const teacherCount = allRoles.filter(r => r.role === 'teacher').length;
      const parentCount = allRoles.filter(r => r.role === 'parent').length;
      const adminCount = allRoles.filter(r => r.role === 'admin').length;

      const allPrompts = prompts || [];
      const blocked = allPrompts.filter(p => p.status === 'blocked').length;
      const rewritten = allPrompts.filter(p => p.status === 'rewritten').length;
      const flagged = allPrompts.filter(p => p.status === 'flagged').length;
      const approved = allPrompts.filter(p => p.status === 'approved').length;

      const allBypasses = bypasses || [];
      const critical = allBypasses.filter(b => b.severity === 'critical').length;

      const totalCost = (usageLogs || []).reduce((sum: number, l: any) => sum + Number(l.estimated_cost_usd || 0), 0);

      setStats({
        totalUsers: (profiles || []).length,
        students: studentCount, teachers: teacherCount, parents: parentCount, admins: adminCount,
        totalClasses: (classes || []).length,
        totalPrompts: allPrompts.length,
        totalLearningPaths: (paths || []).length,
        totalPortfolios: (portfolios || []).length,
        totalCapstones: (capstones || []).length,
        totalMessages: (messages || []).length,
        blockedPrompts: blocked, rewrittenPrompts: rewritten, flaggedPrompts: flagged, approvedPrompts: approved,
        bypassAttempts: allBypasses.length, criticalBypasses: critical,
        totalChatSessions: (chatSessions || []).length,
        totalUsageLogs: (usageLogs || []).length,
        estimatedCostUsd: totalCost,
      });

      // Build user list with roles
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const userRoleMap = new Map<string, string[]>();
      allRoles.forEach(r => {
        const arr = userRoleMap.get(r.user_id) || [];
        arr.push(r.role);
        userRoleMap.set(r.user_id, arr);
      });
      const combined = Array.from(profileMap.entries()).map(([uid, profile]) => ({
        ...profile,
        roles: userRoleMap.get(uid) || [],
      }));
      setUserList(combined);

      // Role distribution for pie chart
      setRoleData([
        { name: 'Students', value: studentCount },
        { name: 'Teachers', value: teacherCount },
        { name: 'Parents', value: parentCount },
        { name: 'Admins', value: adminCount },
      ]);

      // Prompt trends by day
      const trendMap: Record<string, { date: string; total: number; blocked: number; rewritten: number; approved: number }> = {};
      allPrompts.forEach(p => {
        const d = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!trendMap[d]) trendMap[d] = { date: d, total: 0, blocked: 0, rewritten: 0, approved: 0 };
        trendMap[d].total++;
        if (p.status === 'blocked') trendMap[d].blocked++;
        if (p.status === 'rewritten') trendMap[d].rewritten++;
        if (p.status === 'approved') trendMap[d].approved++;
      });
      setPromptTrends(Object.values(trendMap).reverse().slice(-14));

      // User growth by creation date
      const growthMap: Record<string, number> = {};
      (profiles || []).forEach(p => {
        const d = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        growthMap[d] = (growthMap[d] || 0) + 1;
      });
      let cumulative = 0;
      const growthArr = Object.entries(growthMap).map(([date, count]) => {
        cumulative += count;
        return { date, newUsers: count, total: cumulative };
      });
      setUserGrowth(growthArr.slice(-14));

      setClassesList((classes || []).map((c: any) => ({
        ...c,
        memberCount: c.class_members?.length || 0,
      })));

      setRecentBypasses(allBypasses.slice(0, 10));

    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const moderationRate = stats.totalPrompts > 0 ? ((stats.blockedPrompts + stats.rewrittenPrompts) / stats.totalPrompts * 100) : 0;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="h-8 w-8 text-blue-600" />
                  Admin Command Center
                </h1>
                <p className="text-muted-foreground mt-1">Pilot testing metrics, ecosystem management & data intelligence</p>
              </div>
              <Button onClick={fetchAllData} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>

            {/* Top-level KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <KPICard icon={<Users className="h-5 w-5" />} label="Total Users" value={stats.totalUsers} accent="text-blue-600" />
              <KPICard icon={<School className="h-5 w-5" />} label="Classes" value={stats.totalClasses} accent="text-indigo-600" />
              <KPICard icon={<Activity className="h-5 w-5" />} label="AI Prompts" value={stats.totalPrompts} accent="text-emerald-600" />
              <KPICard icon={<Briefcase className="h-5 w-5" />} label="Portfolios" value={stats.totalPortfolios} accent="text-purple-600" />
              <KPICard icon={<Brain className="h-5 w-5" />} label="Chat Sessions" value={stats.totalChatSessions} accent="text-orange-600" />
              <KPICard icon={<Target className="h-5 w-5" />} label="Capstones" value={stats.totalCapstones} accent="text-rose-600" />
            </div>

            <Tabs defaultValue="pilot" className="space-y-4">
              <TabsList className="grid grid-cols-5 w-full max-w-2xl">
                <TabsTrigger value="pilot">Pilot Metrics</TabsTrigger>
                <TabsTrigger value="ecosystem">Ecosystem</TabsTrigger>
                <TabsTrigger value="data">Data Stats</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              {/* ====== PILOT TESTING METRICS ====== */}
              <TabsContent value="pilot" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Moderation Effectiveness</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{moderationRate.toFixed(1)}%</div>
                      <p className="text-xs text-muted-foreground">of prompts were moderated (blocked or rewritten)</p>
                      <Progress value={moderationRate} className="mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">AI Cost (USD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">${stats.estimatedCostUsd.toFixed(4)}</div>
                      <p className="text-xs text-muted-foreground">{stats.totalUsageLogs} API calls logged</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Engagement Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {stats.totalUsers > 0
                          ? ((stats.totalPrompts + stats.totalMessages + stats.totalPortfolios) / stats.totalUsers).toFixed(1)
                          : '0'}
                      </div>
                      <p className="text-xs text-muted-foreground">avg actions per user</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Prompt Moderation Trends</CardTitle>
                      <CardDescription>Daily breakdown of AI prompt processing</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={promptTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area type="monotone" dataKey="approved" stackId="1" stroke="hsl(150, 60%, 45%)" fill="hsl(150, 60%, 45%)" fillOpacity={0.4} name="Approved" />
                          <Area type="monotone" dataKey="rewritten" stackId="1" stroke="hsl(45, 90%, 50%)" fill="hsl(45, 90%, 50%)" fillOpacity={0.4} name="Rewritten" />
                          <Area type="monotone" dataKey="blocked" stackId="1" stroke="hsl(0, 70%, 55%)" fill="hsl(0, 70%, 55%)" fillOpacity={0.4} name="Blocked" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">User Growth</CardTitle>
                      <CardDescription>Registration trend over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={userGrowth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} name="Cumulative Users" />
                          <Bar dataKey="newUsers" fill="hsl(210, 70%, 55%)" name="New Users" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pilot Testing Summary</CardTitle>
                    <CardDescription>Key results for stakeholder reporting</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <MetricBox label="Total Registered Users" value={stats.totalUsers} icon={<Users className="h-4 w-4" />} />
                      <MetricBox label="Total AI Interactions" value={stats.totalPrompts + stats.totalChatSessions} icon={<Activity className="h-4 w-4" />} />
                      <MetricBox label="Learning Paths Created" value={stats.totalLearningPaths} icon={<BookOpen className="h-4 w-4" />} />
                      <MetricBox label="Portfolios Published" value={stats.totalPortfolios} icon={<Briefcase className="h-4 w-4" />} />
                      <MetricBox label="Capstone Submissions" value={stats.totalCapstones} icon={<FileText className="h-4 w-4" />} />
                      <MetricBox label="Messages Exchanged" value={stats.totalMessages} icon={<Globe className="h-4 w-4" />} />
                      <MetricBox label="Bypass Attempts Blocked" value={stats.bypassAttempts} icon={<Lock className="h-4 w-4" />} />
                      <MetricBox label="Estimated AI Cost" value={`$${stats.estimatedCostUsd.toFixed(2)}`} icon={<Zap className="h-4 w-4" />} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ====== ECOSYSTEM MANAGEMENT ====== */}
              <TabsContent value="ecosystem" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <School className="h-5 w-5" /> Classes / School Ecosystems
                      </CardTitle>
                      <CardDescription>All classes across the platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {classesList.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No classes created yet.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Class Name</TableHead>
                              <TableHead>Subject</TableHead>
                              <TableHead>Students</TableHead>
                              <TableHead>Join Code</TableHead>
                              <TableHead>Created</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classesList.map((cls: any) => (
                              <TableRow key={cls.id}>
                                <TableCell className="font-medium">{cls.name}</TableCell>
                                <TableCell><Badge variant="outline">{cls.subject}</Badge></TableCell>
                                <TableCell>{cls.memberCount}</TableCell>
                                <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{cls.join_code}</code></TableCell>
                                <TableCell className="text-xs text-muted-foreground">{new Date(cls.created_at).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Role Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={240}>
                        <RePieChart>
                          <Pie data={roleData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                            {roleData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-4">
                        {roleData.map((r, i) => (
                          <div key={r.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                              {r.name}
                            </div>
                            <span className="font-medium">{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ====== DATA COLLECTION STATS ====== */}
              <TabsContent value="data" className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Prompt Logs" value={stats.totalPrompts} sub={`${stats.approvedPrompts} approved`} color="bg-emerald-500" />
                  <StatCard label="Blocked" value={stats.blockedPrompts} sub={`${stats.totalPrompts > 0 ? (stats.blockedPrompts / stats.totalPrompts * 100).toFixed(1) : 0}% rate`} color="bg-red-500" />
                  <StatCard label="Rewritten" value={stats.rewrittenPrompts} sub="auto-corrected" color="bg-amber-500" />
                  <StatCard label="Flagged" value={stats.flaggedPrompts} sub="needs review" color="bg-orange-500" />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Detailed Prompt Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={[
                        { status: 'Approved', count: stats.approvedPrompts },
                        { status: 'Rewritten', count: stats.rewrittenPrompts },
                        { status: 'Flagged', count: stats.flaggedPrompts },
                        { status: 'Blocked', count: stats.blockedPrompts },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                          <Cell fill="hsl(150, 60%, 45%)" />
                          <Cell fill="hsl(45, 90%, 50%)" />
                          <Cell fill="hsl(30, 90%, 55%)" />
                          <Cell fill="hsl(0, 70%, 55%)" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Platform Data Summary</CardTitle>
                    <CardDescription>Total data collected across all modules</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data Category</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { cat: 'User Profiles', count: stats.totalUsers, ok: true },
                          { cat: 'AI Prompt Logs', count: stats.totalPrompts, ok: true },
                          { cat: 'AI Chat Sessions', count: stats.totalChatSessions, ok: true },
                          { cat: 'AI Usage Logs', count: stats.totalUsageLogs, ok: true },
                          { cat: 'Learning Paths', count: stats.totalLearningPaths, ok: true },
                          { cat: 'Portfolio Projects', count: stats.totalPortfolios, ok: true },
                          { cat: 'Capstone Submissions', count: stats.totalCapstones, ok: true },
                          { cat: 'Messages', count: stats.totalMessages, ok: true },
                          { cat: 'Classes', count: stats.totalClasses, ok: true },
                          { cat: 'Bypass Attempts', count: stats.bypassAttempts, ok: stats.criticalBypasses === 0 },
                        ].map(row => (
                          <TableRow key={row.cat}>
                            <TableCell className="font-medium">{row.cat}</TableCell>
                            <TableCell className="text-right font-mono">{row.count.toLocaleString()}</TableCell>
                            <TableCell>
                              {row.ok
                                ? <Badge className="bg-emerald-100 text-emerald-700">Healthy</Badge>
                                : <Badge variant="destructive">Attention</Badge>
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ====== PERMISSION CONTROLS ====== */}
              <TabsContent value="permissions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings2 className="h-5 w-5" /> User Roles & Permissions
                    </CardTitle>
                    <CardDescription>View and manage user roles across the platform ({userList.length} users)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[500px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Roles</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userList.map((u) => (
                            <TableRow key={u.user_id}>
                              <TableCell className="font-medium">{u.full_name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{u.email || '—'}</TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {u.roles.map((r: string) => (
                                    <Badge
                                      key={r}
                                      variant={r === 'admin' ? 'default' : 'outline'}
                                      className={
                                        r === 'admin' ? 'bg-blue-600' :
                                        r === 'teacher' ? 'border-indigo-300 text-indigo-700' :
                                        r === 'student' ? 'border-emerald-300 text-emerald-700' :
                                        'border-amber-300 text-amber-700'
                                      }
                                    >
                                      {r}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                              </TableCell>
                              <TableCell>
                                <RoleManager userId={u.user_id} currentRoles={u.roles} onUpdate={fetchAllData} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ====== SECURITY ====== */}
              <TabsContent value="security" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Bypass Attempts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stats.bypassAttempts}</div>
                      <p className="text-xs text-muted-foreground">{stats.criticalBypasses} critical</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Security Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        {stats.criticalBypasses === 0
                          ? <><CheckCircle className="h-5 w-5 text-emerald-600" /><span className="font-semibold text-emerald-700">All Clear</span></>
                          : <><AlertTriangle className="h-5 w-5 text-red-600" /><span className="font-semibold text-red-700">Attention Required</span></>
                        }
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Block Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {stats.bypassAttempts > 0
                          ? ((recentBypasses.filter(b => b.blocked).length / Math.min(recentBypasses.length, stats.bypassAttempts)) * 100).toFixed(0)
                          : '100'}%
                      </div>
                      <p className="text-xs text-muted-foreground">of attempts blocked</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Bypass Attempts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentBypasses.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No bypass attempts recorded.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Blocked</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentBypasses.map(b => (
                            <TableRow key={b.id}>
                              <TableCell className="font-medium">{b.attempt_type}</TableCell>
                              <TableCell>
                                <Badge variant={b.severity === 'critical' ? 'destructive' : 'outline'}>{b.severity}</Badge>
                              </TableCell>
                              <TableCell>
                                {b.blocked ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

// === Sub-components ===

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className={`flex items-center gap-2 mb-1 ${accent}`}>{icon}<span className="text-xs font-medium">{label}</span></div>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

function MetricBox({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
      <div className="text-xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`h-2 w-2 rounded-full ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function RoleManager({ userId, currentRoles, onUpdate }: { userId: string; currentRoles: string[]; onUpdate: () => void }) {
  const [adding, setAdding] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const allRoles = ['admin', 'teacher', 'student', 'parent'];
  const available = allRoles.filter(r => !currentRoles.includes(r));

  const addRole = async () => {
    if (!selectedRole) return;
    setAdding(true);
    await supabase.from('user_roles').insert({ user_id: userId, role: selectedRole as any });
    setAdding(false);
    setSelectedRole('');
    onUpdate();
  };

  const removeRole = async (role: string) => {
    await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role as any);
    onUpdate();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Manage</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Roles</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Current Roles</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {currentRoles.map(r => (
                <Badge key={r} variant="outline" className="gap-1">
                  {r}
                  <button onClick={() => removeRole(r)} className="ml-1 text-red-500 hover:text-red-700">&times;</button>
                </Badge>
              ))}
            </div>
          </div>
          {available.length > 0 && (
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Add role..." /></SelectTrigger>
                <SelectContent>
                  {available.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={addRole} disabled={!selectedRole || adding} size="sm">Add</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
