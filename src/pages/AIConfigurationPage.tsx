import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Shield, Brain, Filter, Plus, Trash2 } from 'lucide-react';

export default function AIConfigurationPage() {
  const { toast } = useToast();
  const [configurations, setConfigurations] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setConfigurations(data || []);
      if (data && data.length > 0) {
        setSelectedConfig(data[0]);
        setBlockedKeywords(data[0].blocked_keywords || []);
      }
    } catch (error) {
      console.error('Error fetching configurations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI configurations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedConfig) return;

    try {
      const { error } = await supabase
        .from('ai_configurations')
        .update({
          enabled: selectedConfig.enabled,
          process_mode_enabled: selectedConfig.process_mode_enabled,
          blocked_keywords: blockedKeywords,
          subject_filters: selectedConfig.subject_filters,
          grade_level_rules: selectedConfig.grade_level_rules,
        })
        .eq('id', selectedConfig.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'AI configuration saved successfully',
      });

      fetchConfigurations();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword && !blockedKeywords.includes(newKeyword)) {
      setBlockedKeywords([...blockedKeywords, newKeyword]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setBlockedKeywords(blockedKeywords.filter(k => k !== keyword));
  };

  const handleCreateConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_configurations')
        .insert({
          ai_engine: 'openai',
          enabled: true,
          process_mode_enabled: true,
          blocked_keywords: [],
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'New AI configuration created',
      });

      fetchConfigurations();
    } catch (error) {
      console.error('Error creating configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to create configuration',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading configurations...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">AI Configuration</h1>
          <p className="text-muted-foreground">Configure AI moderation engines and policies</p>
        </div>
        <Button onClick={handleCreateConfig}>
          <Plus className="h-4 w-4 mr-2" />
          New Configuration
        </Button>
      </div>

      {configurations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No configurations yet</h3>
            <p className="text-muted-foreground mb-4">Create your first AI configuration to start</p>
            <Button onClick={handleCreateConfig}>
              <Plus className="h-4 w-4 mr-2" />
              Create Configuration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="keywords">Blocked Keywords</TabsTrigger>
            <TabsTrigger value="filters">Subject Filters</TabsTrigger>
            <TabsTrigger value="process">Process Mode</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Engine Configuration</CardTitle>
                <CardDescription>Configure AI engine settings and endpoints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>AI Engine</Label>
                  <Select
                    value={selectedConfig?.ai_engine}
                    onValueChange={(value) => setSelectedConfig({ ...selectedConfig, ai_engine: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select engine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable AI Moderation</Label>
                    <p className="text-sm text-muted-foreground">
                      Turn AI moderation on or off for this engine
                    </p>
                  </div>
                  <Switch
                    checked={selectedConfig?.enabled}
                    onCheckedChange={(checked) => 
                      setSelectedConfig({ ...selectedConfig, enabled: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Organization ID (optional)</Label>
                  <Input
                    placeholder="org_123456"
                    value={selectedConfig?.organization_id || ''}
                    onChange={(e) => 
                      setSelectedConfig({ ...selectedConfig, organization_id: e.target.value })
                    }
                  />
                </div>

                <Button onClick={handleSaveConfig} className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Blocked Keywords</CardTitle>
                <CardDescription>
                  Keywords that will trigger prompt blocking or modification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter keyword to block"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                  />
                  <Button onClick={handleAddKeyword}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {blockedKeywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-2">
                      {keyword}
                      <Trash2
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => handleRemoveKeyword(keyword)}
                      />
                    </Badge>
                  ))}
                </div>

                <Button onClick={handleSaveConfig} className="w-full">
                  <Shield className="h-4 w-4 mr-2" />
                  Save Keywords
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="filters" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subject-Specific Filters</CardTitle>
                <CardDescription>Configure filters for different subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Subject-specific filtering coming soon. Configure rules for Math, Science, Writing, etc.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="process" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Process Enforcement Mode</CardTitle>
                <CardDescription>
                  Automatically rewrite direct-answer requests into learning prompts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Process Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Detect and rewrite prompts that ask for direct answers
                    </p>
                  </div>
                  <Switch
                    checked={selectedConfig?.process_mode_enabled}
                    onCheckedChange={(checked) => 
                      setSelectedConfig({ ...selectedConfig, process_mode_enabled: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Example Transformations</Label>
                  <div className="space-y-2">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Before:</p>
                      <p className="text-sm text-muted-foreground">"What is 7x + 39x?"</p>
                      <p className="text-sm font-medium mt-2">After:</p>
                      <p className="text-sm text-success">
                        "Let's solve this step-by-step. First, identify the like terms, then combine them..."
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveConfig} className="w-full">
                  <Brain className="h-4 w-4 mr-2" />
                  Save Process Mode Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}