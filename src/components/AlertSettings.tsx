import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Bell, 
  Mail, 
  AlertCircle, 
  RefreshCw,
  XCircle,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface BypassAttempt {
  id: string;
  attempt_type: string;
  severity: string | null;
  blocked: boolean | null;
  details: any;
  created_at: string;
}

interface PromptAlert {
  id: string;
  original_prompt: string;
  status: string;
  severity: string | null;
  subject: string | null;
  created_at: string;
  flagged_keywords: string[] | null;
}

const AlertSettings = () => {
  const { toast } = useToast();
  const [bypassAttempts, setBypassAttempts] = useState<BypassAttempt[]>([]);
  const [flaggedPrompts, setFlaggedPrompts] = useState<PromptAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [emailAlerts, setEmailAlerts] = useState({
    securityThreats: true,
    bypassAttempts: true,
    aiPolicyViolations: true,
    systemUpdates: false,
  });
  const [emailRecipients, setEmailRecipients] = useState("");

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      // Fetch bypass attempts
      const { data: bypasses } = await supabase
        .from('bypass_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setBypassAttempts(bypasses || []);

      // Fetch flagged/blocked prompts
      const { data: prompts } = await supabase
        .from('prompt_logs')
        .select('*')
        .in('status', ['blocked', 'flagged', 'rewritten'])
        .order('created_at', { ascending: false })
        .limit(50);

      setFlaggedPrompts(prompts || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const getSeverityIcon = (severity: string | null) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBg = (severity: string | null) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'high': return 'bg-red-50 border-red-100';
      case 'medium': return 'bg-amber-50 border-amber-100';
      default: return 'bg-blue-50 border-blue-100';
    }
  };

  const handleSaveAlertSettings = () => {
    toast({
      title: "Alert settings saved",
      description: "Your notification preferences have been updated.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alerts & Security Events</h2>
          <p className="text-slate-500">Live bypass attempts, flagged prompts, and notification settings</p>
        </div>
        <Button variant="outline" onClick={fetchAlerts} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live" className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Live Alerts ({bypassAttempts.length + flaggedPrompts.length})
          </TabsTrigger>
          <TabsTrigger value="bypass" className="flex items-center">
            <XCircle className="h-4 w-4 mr-2" />
            Bypass Attempts ({bypassAttempts.length})
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Flagged Prompts ({flaggedPrompts.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="live" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Combined feed of bypass attempts and flagged prompts</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading alerts...</p>
              ) : bypassAttempts.length === 0 && flaggedPrompts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <p className="text-muted-foreground">No security events detected. System running normally.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {/* Merge and sort all events by time */}
                  {[
                    ...bypassAttempts.map(b => ({
                      id: b.id,
                      type: 'bypass' as const,
                      title: b.attempt_type,
                      description: b.details?.description || `Bypass attempt ${b.blocked ? 'blocked' : 'detected'}`,
                      severity: b.severity,
                      blocked: b.blocked,
                      created_at: b.created_at,
                    })),
                    ...flaggedPrompts.map(p => ({
                      id: p.id,
                      type: 'prompt' as const,
                      title: `${p.status === 'blocked' ? 'Blocked' : p.status === 'rewritten' ? 'Rewritten' : 'Flagged'} prompt`,
                      description: p.original_prompt.substring(0, 120),
                      severity: p.severity,
                      blocked: p.status === 'blocked',
                      created_at: p.created_at || new Date().toISOString(),
                    })),
                  ]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 30)
                    .map(event => (
                      <div key={event.id} className={`p-3 rounded-md border ${getSeverityBg(event.severity)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(event.severity)}
                            <div>
                              <p className="font-medium text-sm">
                                {event.title}
                                {event.blocked && <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Blocked</span>}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bypass" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bypass Attempts</CardTitle>
              <CardDescription>Detected attempts to circumvent AI protection</CardDescription>
            </CardHeader>
            <CardContent>
              {bypassAttempts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No bypass attempts recorded</p>
              ) : (
                <div className="space-y-3">
                  {bypassAttempts.map(attempt => (
                    <div key={attempt.id} className={`p-3 rounded-md border ${getSeverityBg(attempt.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          {getSeverityIcon(attempt.severity)}
                          <div>
                            <p className="font-medium text-sm">{attempt.attempt_type}</p>
                            <p className="text-xs text-muted-foreground">
                              Severity: {attempt.severity || 'unknown'} • {attempt.blocked ? 'Blocked' : 'Detected'}
                            </p>
                            {attempt.details && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {typeof attempt.details === 'object' ? JSON.stringify(attempt.details) : String(attempt.details)}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flagged & Blocked Prompts</CardTitle>
              <CardDescription>Prompts that triggered moderation rules</CardDescription>
            </CardHeader>
            <CardContent>
              {flaggedPrompts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No flagged prompts</p>
              ) : (
                <div className="space-y-3">
                  {flaggedPrompts.map(prompt => (
                    <div key={prompt.id} className={`p-3 rounded-md border ${getSeverityBg(prompt.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(prompt.severity)}
                            <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                              prompt.status === 'blocked' ? 'bg-red-100 text-red-700' :
                              prompt.status === 'rewritten' ? 'bg-amber-100 text-amber-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>{prompt.status}</span>
                            {prompt.subject && <span className="text-xs text-muted-foreground">{prompt.subject}</span>}
                          </div>
                          <p className="text-sm mt-1">{prompt.original_prompt}</p>
                          {prompt.flagged_keywords && prompt.flagged_keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {prompt.flagged_keywords.map((kw, i) => (
                                <span key={i} className="bg-red-50 text-red-600 text-xs px-1.5 py-0.5 rounded">{kw}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(prompt.created_at!), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure which events trigger notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Security Threats</Label>
                    <p className="text-sm text-muted-foreground">VPN and bypass attempts</p>
                  </div>
                  <Switch 
                    checked={emailAlerts.securityThreats} 
                    onCheckedChange={(checked) => setEmailAlerts({...emailAlerts, securityThreats: checked})}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Bypass Attempts</Label>
                    <p className="text-sm text-muted-foreground">When students try to circumvent the system</p>
                  </div>
                  <Switch 
                    checked={emailAlerts.bypassAttempts} 
                    onCheckedChange={(checked) => setEmailAlerts({...emailAlerts, bypassAttempts: checked})}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">AI Policy Violations</Label>
                    <p className="text-sm text-muted-foreground">Blocked or flagged prompts</p>
                  </div>
                  <Switch 
                    checked={emailAlerts.aiPolicyViolations} 
                    onCheckedChange={(checked) => setEmailAlerts({...emailAlerts, aiPolicyViolations: checked})}
                  />
                </div>
              </div>
              
              <div className="space-y-2 pt-4">
                <Label htmlFor="emailRecipients">Email Recipients</Label>
                <Input 
                  id="emailRecipients" 
                  placeholder="Enter email addresses (comma separated)" 
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                />
              </div>
              
              <Button onClick={handleSaveAlertSettings}>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlertSettings;
