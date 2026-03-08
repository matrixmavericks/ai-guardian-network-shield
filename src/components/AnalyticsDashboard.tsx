import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  Download,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart as ReLineChart,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState("weekly");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, blocked: 0, rewritten: 0, approved: 0 });
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [subjectData, setSubjectData] = useState<any[]>([]);
  const [severityData, setSeverityData] = useState<any[]>([]);
  const [recentFlaggedKeywords, setRecentFlaggedKeywords] = useState<{ keyword: string; count: number }[]>([]);

  const fetchAnalytics = async () => {
    setIsRefreshing(true);
    try {
      const days = timeRange === 'weekly' ? 7 : 30;
      const since = subDays(new Date(), days).toISOString();

      const { data: logs, error } = await supabase
        .from('prompt_logs')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const allLogs = logs || [];

      // Stats
      const blocked = allLogs.filter(l => l.status === 'blocked').length;
      const rewritten = allLogs.filter(l => l.status === 'rewritten').length;
      const approved = allLogs.filter(l => l.status === 'approved').length;
      const flagged = allLogs.filter(l => l.status === 'flagged').length;
      setStats({ total: allLogs.length, blocked, rewritten, approved });

      // Status distribution
      setStatusDistribution([
        { name: 'Approved', value: approved },
        { name: 'Rewritten', value: rewritten },
        { name: 'Blocked', value: blocked },
        { name: 'Flagged', value: flagged },
      ].filter(d => d.value > 0));

      // Time series - group by day
      const dayMap: Record<string, { blocked: number; approved: number; rewritten: number }> = {};
      for (let i = 0; i < days; i++) {
        const day = format(subDays(new Date(), days - 1 - i), 'MMM dd');
        dayMap[day] = { blocked: 0, approved: 0, rewritten: 0 };
      }
      allLogs.forEach(log => {
        const day = format(new Date(log.created_at!), 'MMM dd');
        if (dayMap[day]) {
          if (log.status === 'blocked' || log.status === 'flagged') dayMap[day].blocked++;
          else if (log.status === 'rewritten') dayMap[day].rewritten++;
          else dayMap[day].approved++;
        }
      });
      setTimeSeriesData(Object.entries(dayMap).map(([name, vals]) => ({ name, ...vals })));

      // Subject distribution
      const subjectMap: Record<string, number> = {};
      allLogs.forEach(log => {
        const subj = log.subject || 'general';
        subjectMap[subj] = (subjectMap[subj] || 0) + 1;
      });
      setSubjectData(Object.entries(subjectMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));

      // Severity distribution
      const sevMap: Record<string, number> = {};
      allLogs.forEach(log => {
        const sev = log.severity || 'low';
        sevMap[sev] = (sevMap[sev] || 0) + 1;
      });
      setSeverityData([
        { name: 'Low', value: sevMap['low'] || 0 },
        { name: 'Medium', value: sevMap['medium'] || 0 },
        { name: 'High', value: sevMap['high'] || 0 },
        { name: 'Critical', value: sevMap['critical'] || 0 },
      ].filter(d => d.value > 0));

      // Flagged keywords
      const kwMap: Record<string, number> = {};
      allLogs.forEach(log => {
        if (log.flagged_keywords) {
          (log.flagged_keywords as string[]).forEach(kw => {
            kwMap[kw] = (kwMap[kw] || 0) + 1;
          });
        }
      });
      setRecentFlaggedKeywords(
        Object.entries(kwMap).map(([keyword, count]) => ({ keyword, count })).sort((a, b) => b.count - a.count).slice(0, 10)
      );

      // Fetch bypass attempts count
      const { count: bypassCount } = await supabase
        .from('bypass_attempts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since);

    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold">Analytics & Reporting</h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {timeRange === "weekly" ? "Last 7 Days" : "Last 30 Days"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTimeRange("weekly")}>Last 7 Days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange("monthly")}>Last 30 Days</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Prompts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.approved.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Rewritten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.rewritten.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.blocked.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="prompts">Prompt Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="h-5 w-5 mr-2" />
                Prompt Volume Over Time
              </CardTitle>
              <CardDescription>Daily breakdown of prompt moderation outcomes</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-80">
                {timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ReLineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="blocked" stroke="#f43f5e" strokeWidth={2} />
                      <Line type="monotone" dataKey="rewritten" stroke="#f59e0b" strokeWidth={2} />
                      <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} />
                    </ReLineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No data for selected period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {statusDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusDistribution.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">No data</div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Usage by Subject
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64">
                  {subjectData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">No data</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="prompts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Pattern Analysis</CardTitle>
              <CardDescription>Real insights from prompt moderation data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Severity Distribution</h4>
                  <div className="space-y-3">
                    {severityData.length > 0 ? severityData.map(item => {
                      const total = severityData.reduce((s, d) => s + d.value, 0);
                      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                      return (
                        <div key={item.name}>
                          <div className="flex justify-between mb-1">
                            <span>{item.name}</span>
                            <span className="text-sm">{pct}% ({item.value})</span>
                          </div>
                          <Progress value={pct} />
                        </div>
                      );
                    }) : (
                      <p className="text-sm text-muted-foreground">No severity data available</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Top Flagged Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {recentFlaggedKeywords.length > 0 ? recentFlaggedKeywords.map(({ keyword, count }) => (
                      <div key={keyword} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                        {keyword} ({count})
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">No flagged keywords detected in this period</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
