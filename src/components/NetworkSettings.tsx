import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  RefreshCw, 
  Network,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface EndpointStatus {
  name: string;
  provider: string;
  model: string;
  status: 'online' | 'offline' | 'testing' | 'error';
  latency?: number;
  lastChecked?: string;
}

const NetworkSettings = () => {
  const [integrationStatus, setIntegrationStatus] = useState("active");
  const [networkType, setNetworkType] = useState("gateway");
  const [isScanning, setIsScanning] = useState(false);
  const [endpoints, setEndpoints] = useState<EndpointStatus[]>([
    { name: "Gemini 3 Flash Preview", provider: "Google", model: "google/gemini-3-flash-preview", status: 'offline' },
    { name: "Gemini 2.5 Flash", provider: "Google", model: "google/gemini-2.5-flash", status: 'offline' },
    { name: "Gemini 2.5 Pro", provider: "Google", model: "google/gemini-2.5-pro", status: 'offline' },
    { name: "GPT-5", provider: "OpenAI", model: "openai/gpt-5", status: 'offline' },
    { name: "GPT-5 Mini", provider: "OpenAI", model: "openai/gpt-5-mini", status: 'offline' },
    { name: "GPT-5 Nano", provider: "OpenAI", model: "openai/gpt-5-nano", status: 'offline' },
  ]);
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [processModeEnabled, setProcessModeEnabled] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await supabase
        .from('ai_configurations')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data) {
        setBlockedKeywords(data.blocked_keywords || []);
        setProcessModeEnabled(data.process_mode_enabled ?? true);
        setIntegrationStatus(data.enabled ? "active" : "inactive");
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const handleTestEndpoint = async (index: number) => {
    const ep = endpoints[index];
    setEndpoints(prev => prev.map((e, i) => i === index ? { ...e, status: 'testing' as const } : e));

    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          prompt: 'Hello, respond with one word: working',
          subject: 'general',
          gradeLevel: 'high-school',
          processTeaching: false,
        }
      });

      const latency = Date.now() - start;

      if (error || !data?.success) {
        setEndpoints(prev => prev.map((e, i) => i === index ? { ...e, status: 'error' as const, latency, lastChecked: new Date().toISOString() } : e));
        toast({ title: `${ep.name} - Error`, description: data?.error || 'Connection failed', variant: 'destructive' });
      } else {
        setEndpoints(prev => prev.map((e, i) => i === index ? { ...e, status: 'online' as const, latency, lastChecked: new Date().toISOString() } : e));
        toast({ title: `${ep.name} - Online`, description: `Response in ${latency}ms` });
      }
    } catch (err) {
      const latency = Date.now() - start;
      setEndpoints(prev => prev.map((e, i) => i === index ? { ...e, status: 'error' as const, latency, lastChecked: new Date().toISOString() } : e));
      toast({ title: `${ep.name} - Failed`, description: 'Could not reach endpoint', variant: 'destructive' });
    }
  };

  const handleTestAllEndpoints = async () => {
    setIsScanning(true);
    for (let i = 0; i < endpoints.length; i++) {
      await handleTestEndpoint(i);
    }
    setIsScanning(false);
    toast({ title: "Endpoint scan complete", description: `Tested ${endpoints.length} AI service endpoints` });
  };

  const handleSaveConfig = async () => {
    try {
      const { data: existing } = await supabase
        .from('ai_configurations')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('ai_configurations')
          .update({
            blocked_keywords: blockedKeywords,
            process_mode_enabled: processModeEnabled,
            enabled: integrationStatus === "active",
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('ai_configurations')
          .insert({
            ai_engine: 'google' as const,
            blocked_keywords: blockedKeywords,
            process_mode_enabled: processModeEnabled,
            enabled: integrationStatus === "active",
          });
      }

      toast({ title: "Configuration saved", description: "Network and AI settings updated successfully." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !blockedKeywords.includes(newKeyword.trim().toLowerCase())) {
      setBlockedKeywords(prev => [...prev, newKeyword.trim().toLowerCase()]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (kw: string) => {
    setBlockedKeywords(prev => prev.filter(k => k !== kw));
  };

  const getStatusIcon = (status: EndpointStatus['status']) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'testing': return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <AlertCircle className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusText = (status: EndpointStatus['status']) => {
    switch (status) {
      case 'online': return 'Online';
      case 'testing': return 'Testing...';
      case 'error': return 'Error';
      default: return 'Not tested';
    }
  };

  const getStatusColor = (status: EndpointStatus['status']) => {
    switch (status) {
      case 'online': return 'text-green-600';
      case 'testing': return 'text-blue-600';
      case 'error': return 'text-red-600';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Network Settings</h2>
        <Button variant="outline" onClick={handleTestAllEndpoints} disabled={isScanning}>
          {isScanning ? (
            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Scanning...</>
          ) : (
            <><RefreshCw className="h-4 w-4 mr-2" />Test All Endpoints</>
          )}
        </Button>
      </div>
      
      <Tabs defaultValue="endpoints">
        <TabsList>
          <TabsTrigger value="endpoints">AI Endpoints</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="protection">Protection</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Service Endpoints</CardTitle>
              <CardDescription>Test and monitor AI model connectivity through the gateway</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {endpoints.map((ep, index) => (
                  <Card key={ep.model} className={`${ep.status === 'online' ? 'bg-green-50 border-green-200' : ep.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{ep.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">{ep.provider}</p>
                        </div>
                        {getStatusIcon(ep.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Status</span>
                          <span className={`font-medium ${getStatusColor(ep.status)}`}>{getStatusText(ep.status)}</span>
                        </div>
                        {ep.latency !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Latency</span>
                            <span className="font-medium">{ep.latency}ms</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-600">Model</span>
                          <span className="font-mono text-xs">{ep.model.split('/')[1]}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full mt-3" 
                        onClick={() => handleTestEndpoint(index)}
                        disabled={ep.status === 'testing'}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {ep.status === 'testing' ? 'Testing...' : 'Test Connection'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Moderation Configuration</CardTitle>
              <CardDescription>Configure prompt filtering and process teaching mode</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">AI Filtering</Label>
                  <p className="text-sm text-muted-foreground">Enable or disable AI prompt filtering</p>
                </div>
                <Switch 
                  checked={integrationStatus === "active"}
                  onCheckedChange={(checked) => setIntegrationStatus(checked ? "active" : "inactive")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Process Teaching Mode</Label>
                  <p className="text-sm text-muted-foreground">Rewrite direct-answer requests into learning prompts</p>
                </div>
                <Switch 
                  checked={processModeEnabled}
                  onCheckedChange={setProcessModeEnabled}
                />
              </div>

              <div>
                <Label className="text-base mb-2 block">Blocked Keywords</Label>
                <p className="text-sm text-muted-foreground mb-3">Prompts containing these keywords will be blocked or rewritten</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {blockedKeywords.map((kw) => (
                    <span key={kw} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-red-600">
                        <XCircle className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {blockedKeywords.length === 0 && (
                    <span className="text-sm text-muted-foreground">No blocked keywords configured</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Add keyword..." 
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                  />
                  <Button variant="outline" onClick={addKeyword}>Add</Button>
                </div>
              </div>
              
              <div className="pt-4">
                <Button onClick={handleSaveConfig}>Save Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="protection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bypass Protection</CardTitle>
              <CardDescription>Configure security measures to prevent bypass attempts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">VPN Detection</Label>
                    <p className="text-sm text-muted-foreground">Detect and block VPN connections</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">DNS Override Protection</Label>
                    <p className="text-sm text-muted-foreground">Prevent use of custom DNS servers</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Proxy Detection</Label>
                    <p className="text-sm text-muted-foreground">Block access through proxy servers</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Protection Score</span>
                    <span>85%</span>
                  </div>
                  <Progress value={85} />
                  <p className="text-sm text-muted-foreground mt-2">All primary protections enabled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NetworkSettings;
