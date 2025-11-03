import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, BookOpen, Award } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [promptLogs, setPromptLogs] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch linked children
        const { data: childLinks } = await supabase
          .from('parent_child_links')
          .select('child_id')
          .eq('parent_id', user.id);

        const childIds = childLinks?.map(link => link.child_id) || [];
        
        // Fetch profiles for children
        const { data: childProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', childIds);

        const childrenData = childProfiles || [];
        setChildren(childrenData);
        if (childIds.length > 0) {
          const { data: logs } = await supabase
            .from('prompt_logs')
            .select('*, profiles(*)')
            .in('user_id', childIds)
            .order('created_at', { ascending: false })
            .limit(50);

          setPromptLogs(logs || []);

          // Fetch children's badges
          const { data: badgeData } = await supabase
            .from('ethical_badges')
            .select('*')
            .in('user_id', childIds);

          setBadges(badgeData || []);
        }
      } catch (error) {
        console.error('Error fetching parent dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('parent-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prompt_logs' }, 
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success text-success-foreground';
      case 'rewritten': return 'bg-warning text-warning-foreground';
      case 'blocked': return 'bg-destructive text-destructive-foreground';
      case 'flagged': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'medium': return <Clock className="h-4 w-4 text-muted-foreground" />;
      default: return <CheckCircle2 className="h-4 w-4 text-success" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const flaggedLogs = promptLogs.filter(log => log.status === 'blocked' || log.status === 'flagged');
  const rewrittenLogs = promptLogs.filter(log => log.status === 'rewritten');
  const totalUsageTime = promptLogs.length; // Simplified metric

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Parent Dashboard</h1>
        <p className="text-muted-foreground">Monitor your children's AI usage and ethical learning</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Children Monitored</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{children.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total AI Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promptLogs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Flagged Prompts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{flaggedLogs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ethical Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{badges.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {flaggedLogs.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {flaggedLogs.length} prompts have been flagged or blocked this week. Review them in the Activity Log below.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="children" className="space-y-4">
        <TabsList>
          <TabsTrigger value="children">Children</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="badges">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="children" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Children</CardTitle>
              <CardDescription>Overview of your children's AI usage</CardDescription>
            </CardHeader>
            <CardContent>
              {children.length === 0 ? (
                <p className="text-muted-foreground">No children linked to your account yet.</p>
              ) : (
                <div className="space-y-4">
                  {children.map((child) => {
                    const childLogs = promptLogs.filter(log => log.user_id === child.user_id);
                    const childFlagged = childLogs.filter(log => log.status === 'blocked' || log.status === 'flagged').length;
                    const childBadges = badges.filter(b => b.user_id === child.user_id).length;

                    return (
                      <Card key={child.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{child.full_name}</CardTitle>
                          <CardDescription>Grade: {child.grade_level || 'Not specified'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Total Prompts</div>
                              <div className="text-xl font-bold">{childLogs.length}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Flagged</div>
                              <div className="text-xl font-bold text-destructive">{childFlagged}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Badges Earned</div>
                              <div className="text-xl font-bold text-success">{childBadges}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity Log</CardTitle>
              <CardDescription>All AI interactions from your children</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {promptLogs.length === 0 ? (
                  <p className="text-muted-foreground">No activity yet.</p>
                ) : (
                  promptLogs.map((log) => (
                    <div key={log.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{log.profiles?.full_name}</span>
                            {getSeverityIcon(log.severity)}
                            <Badge className={getStatusColor(log.status)} variant="secondary">
                              {log.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium">Original Prompt:</span>
                          <p className="text-sm text-muted-foreground mt-1">{log.original_prompt}</p>
                        </div>
                        {log.modified_prompt && (
                          <div>
                            <span className="text-sm font-medium">Modified to:</span>
                            <p className="text-sm text-success mt-1">{log.modified_prompt}</p>
                          </div>
                        )}
                        {log.flagged_keywords && log.flagged_keywords.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-destructive">Flagged Keywords:</span>
                            <div className="flex gap-2 mt-1">
                              {log.flagged_keywords.map((keyword: string, i: number) => (
                                <Badge key={i} variant="destructive">{keyword}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ethical Learning Badges</CardTitle>
              <CardDescription>Achievements earned for responsible AI usage</CardDescription>
            </CardHeader>
            <CardContent>
              {badges.length === 0 ? (
                <p className="text-muted-foreground">No badges earned yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {badges.map((badge) => {
                    const child = children.find(c => c.user_id === badge.user_id);
                    return (
                      <Card key={badge.id}>
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">{badge.badge_name}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">{badge.badge_description}</p>
                          <p className="text-xs text-muted-foreground">
                            Earned by {child?.full_name} on {new Date(badge.earned_at).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}