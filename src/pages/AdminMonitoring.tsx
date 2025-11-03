import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Activity, AlertTriangle, Shield, TrendingUp, Users, Eye, Lock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminMonitoring() {
  const [promptLogs, setPromptLogs] = useState<any[]>([]);
  const [bypassAttempts, setBypassAttempts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch prompt logs
        const { data: logs } = await supabase
          .from('prompt_logs')
          .select('*, profiles(*)')
          .order('created_at', { ascending: false })
          .limit(100);

        setPromptLogs(logs || []);

        // Fetch bypass attempts
        const { data: attempts } = await supabase
          .from('bypass_attempts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        setBypassAttempts(attempts || []);

        // Fetch user count
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*');

        setUsers(profiles || []);
      } catch (error) {
        console.error('Error fetching monitoring data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscription
    const channel = supabase
      .channel('admin-monitoring')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prompt_logs' }, 
        () => fetchData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bypass_attempts' }, 
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading monitoring data...</div>;
  }

  const totalPrompts = promptLogs.length;
  const blockedPrompts = promptLogs.filter(log => log.status === 'blocked').length;
  const rewrittenPrompts = promptLogs.filter(log => log.status === 'rewritten').length;
  const flaggedPrompts = promptLogs.filter(log => log.status === 'flagged').length;
  const criticalAttempts = bypassAttempts.filter(a => a.severity === 'critical').length;

  // Prepare chart data
  const activityData = promptLogs.reduce((acc: any[], log) => {
    const date = new Date(log.created_at).toLocaleDateString();
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.count += 1;
      if (log.status === 'blocked') existing.blocked += 1;
      if (log.status === 'rewritten') existing.rewritten += 1;
    } else {
      acc.push({
        date,
        count: 1,
        blocked: log.status === 'blocked' ? 1 : 0,
        rewritten: log.status === 'rewritten' ? 1 : 0,
      });
    }
    return acc;
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Real-Time Monitoring</h1>
          <p className="text-muted-foreground">System-wide AI governance and security oversight</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Critical Alerts */}
      {criticalAttempts > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {criticalAttempts} critical bypass attempts detected! Immediate review required.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPrompts}</div>
            <p className="text-xs text-muted-foreground">AI interactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" />
              Blocked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{blockedPrompts}</div>
            <p className="text-xs text-muted-foreground">{((blockedPrompts / totalPrompts) * 100).toFixed(1)}% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-warning" />
              Rewritten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{rewrittenPrompts}</div>
            <p className="text-xs text-muted-foreground">{((rewrittenPrompts / totalPrompts) * 100).toFixed(1)}% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-secondary" />
              Flagged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flaggedPrompts}</div>
            <p className="text-xs text-muted-foreground">Needs review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Total registered</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
          <TabsTrigger value="flagged">Flagged Prompts</TabsTrigger>
          <TabsTrigger value="bypass">Bypass Attempts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent AI Interactions</CardTitle>
              <CardDescription>Live stream of all AI usage across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {promptLogs.map((log) => (
                  <div key={log.id} className="border-b pb-3 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.profiles?.full_name}</Badge>
                        <Badge className={
                          log.status === 'blocked' ? 'bg-destructive' :
                          log.status === 'rewritten' ? 'bg-warning' :
                          log.status === 'flagged' ? 'bg-secondary' :
                          'bg-success'
                        }>
                          {log.status}
                        </Badge>
                        {log.subject && <Badge variant="outline">{log.subject}</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{log.original_prompt}</p>
                    {log.modified_prompt && (
                      <p className="text-sm text-success mt-1">→ {log.modified_prompt}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flagged" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flagged & Blocked Prompts</CardTitle>
              <CardDescription>Requires immediate review and action</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {promptLogs.filter(log => log.status === 'blocked' || log.status === 'flagged').map((log) => (
                  <div key={log.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.profiles?.full_name}</Badge>
                        <Badge variant="destructive">{log.severity}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">Original Prompt:</p>
                    <p className="text-sm text-muted-foreground">{log.original_prompt}</p>
                    {log.flagged_keywords && log.flagged_keywords.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-destructive mb-1">Flagged Keywords:</p>
                        <div className="flex gap-2">
                          {log.flagged_keywords.map((keyword: string, i: number) => (
                            <Badge key={i} variant="destructive">{keyword}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bypass" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bypass Attempts</CardTitle>
              <CardDescription>Detected attempts to circumvent AI moderation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bypassAttempts.length === 0 ? (
                  <p className="text-muted-foreground">No bypass attempts detected.</p>
                ) : (
                  bypassAttempts.map((attempt) => (
                    <div key={attempt.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-destructive" />
                          <Badge variant={attempt.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {attempt.severity}
                          </Badge>
                          <Badge variant="outline">{attempt.attempt_type}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(attempt.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">IP: {attempt.ip_address}</p>
                        {attempt.blocked && (
                          <Badge variant="outline" className="bg-success text-success-foreground">Blocked Successfully</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Trends</CardTitle>
              <CardDescription>AI usage patterns over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" name="Total" />
                  <Line type="monotone" dataKey="blocked" stroke="hsl(var(--destructive))" name="Blocked" />
                  <Line type="monotone" dataKey="rewritten" stroke="hsl(var(--warning))" name="Rewritten" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
              <CardDescription>Breakdown of prompt statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { status: 'Approved', count: totalPrompts - blockedPrompts - rewrittenPrompts - flaggedPrompts },
                  { status: 'Rewritten', count: rewrittenPrompts },
                  { status: 'Flagged', count: flaggedPrompts },
                  { status: 'Blocked', count: blockedPrompts },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}