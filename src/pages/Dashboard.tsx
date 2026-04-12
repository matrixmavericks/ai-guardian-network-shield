import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  Settings, 
  AlertTriangle, 
  RefreshCw
} from "lucide-react";
import DashboardNav from "@/components/DashboardNav";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSchoolCheck } from '@/hooks/useSchoolCheck';
import NetworkStatus from "@/components/NetworkStatus";
import RecentPrompts from "@/components/RecentPrompts";
import NetworkSettings from "@/components/NetworkSettings";
import UserManagement from "@/components/UserManagement";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import AlertSettings from "@/components/AlertSettings";
import HelpSupport from "@/components/HelpSupport";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const Dashboard = () => {
  const isInSchool = useSchoolCheck();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ totalPrompts: 0, bypassBlocked: 0 });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch prompt counts
      const { count: promptCount } = await supabase
        .from('prompt_logs')
        .select('*', { count: 'exact', head: true });

      // Fetch bypass attempt counts
      const { count: bypassCount } = await supabase
        .from('bypass_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('blocked', true);

      setStats({
        totalPrompts: promptCount || 0,
        bypassBlocked: bypassCount || 0,
      });

      // Fetch recent bypass attempts for alerts
      const { data: alerts } = await supabase
        .from('bypass_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentAlerts(alerts || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return { bg: 'bg-red-50', border: 'border-red-100', title: 'text-red-800', text: 'text-red-600' };
      case 'high': return { bg: 'bg-red-50', border: 'border-red-100', title: 'text-red-800', text: 'text-red-600' };
      case 'medium': return { bg: 'bg-amber-50', border: 'border-amber-100', title: 'text-amber-800', text: 'text-amber-600' };
      default: return { bg: 'bg-blue-50', border: 'border-blue-100', title: 'text-blue-800', text: 'text-blue-600' };
    }
  };

  const content = (
    <>
      {!isInSchool && <DashboardNav />}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
              <Button onClick={fetchDashboardData} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Total Prompts Filtered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{stats.totalPrompts.toLocaleString()}</div>
                    <div className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      Live
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Bypass Attempts Blocked</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{stats.bypassBlocked.toLocaleString()}</div>
                    <div className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      Live
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Network Protection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-lg font-medium">Active</div>
                    <div className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      Protected
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">All entry points secured</div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
                <TabsTrigger value="help">Help & Support</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <NetworkStatus />
                  
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                        Alert Activity
                      </CardTitle>
                      <CardDescription>Recent bypass attempts and security alerts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recentAlerts.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No recent alerts. System running smoothly.</p>
                        ) : (
                          recentAlerts.slice(0, 3).map((alert) => {
                            const colors = getSeverityColor(alert.severity || 'low');
                            return (
                              <div key={alert.id} className={`${colors.bg} p-3 rounded-md border ${colors.border}`}>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className={`font-medium ${colors.title}`}>{alert.attempt_type}</p>
                                    <p className={`text-sm ${colors.text}`}>
                                      {(alert.details as any)?.description || `Severity: ${alert.severity}`}
                                      {alert.blocked ? ' — Blocked' : ' — Not blocked'}
                                    </p>
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <RecentPrompts />
              </TabsContent>

              <TabsContent value="network" className="space-y-6">
                <NetworkSettings />
              </TabsContent>

              <TabsContent value="users" className="space-y-6">
                <UserManagement />
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-6">
                <AnalyticsDashboard />
              </TabsContent>
              
              <TabsContent value="alerts" className="space-y-6">
                <AlertSettings />
              </TabsContent>
              
              <TabsContent value="help" className="space-y-6">
                <HelpSupport />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
