import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Loader2, Send, Copy, Check, Users, BookOpen, Zap, ArrowRight } from "lucide-react";
import { getStudioConfig, type StudioTool, type StudioConfig } from "@/lib/mispStudioConfigs";
import { useToast } from "@/hooks/use-toast";

const TeacherStudio: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const config = useMemo<StudioConfig | null>(() => getStudioConfig(user?.email), [user?.email]);

  const [activeBand, setActiveBand] = useState<string>("");
  const [activeTool, setActiveTool] = useState<StudioTool | null>(null);
  const [toolInput, setToolInput] = useState("");
  const [toolLoading, setToolLoading] = useState(false);
  const [toolReply, setToolReply] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const [stats, setStats] = useState({ classes: 0, students: 0, prompts7d: 0 });

  useEffect(() => {
    if (config && !activeBand) setActiveBand(config.gradeBands[0].id);
  }, [config, activeBand]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: classes } = await supabase
        .from("classes")
        .select("id")
        .eq("teacher_id", user.id);
      const classIds = (classes || []).map((c: any) => c.id);

      let students = 0;
      if (classIds.length) {
        const { count } = await supabase
          .from("class_members")
          .select("id", { count: "exact", head: true })
          .in("class_id", classIds);
        students = count || 0;
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: promptCount } = await supabase
        .from("ai_usage_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo);

      setStats({
        classes: classIds.length,
        students,
        prompts7d: promptCount || 0,
      });
    })();
  }, [user]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading studio…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!config) {
    // Not one of the spotlight teachers — bounce to normal dashboard
    return <Navigate to="/dashboard" replace />;
  }

  const runTool = async (tool: StudioTool) => {
    if (!toolInput.trim() && tool.needsInput) {
      toast({ title: "Add some input first", variant: "destructive" });
      return;
    }
    setToolLoading(true);
    setToolReply("");
    try {
      const prompt = tool.buildPrompt(toolInput.trim(), activeBand);
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          prompt: `${config.systemContext}\n\nTask: ${prompt}`,
          subject: config.subjectLabel,
          gradeLevel: activeBand,
          processTeaching: false,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "AI unavailable");
      setToolReply(data.reply || "No response.");
    } catch (err: any) {
      toast({ title: "AI request failed", description: err.message || "Try again.", variant: "destructive" });
    } finally {
      setToolLoading(false);
    }
  };

  const openTool = (tool: StudioTool) => {
    setActiveTool(tool);
    setToolInput("");
    setToolReply("");
    setCopied(false);
  };

  const copyReply = async () => {
    await navigator.clipboard.writeText(toolReply);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const HeroIcon = config.HeroIcon;

  return (
    <div className="min-h-screen flex w-full bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
          {/* Hero */}
          <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${config.accent} p-8 mb-8`}>
            <div className="absolute inset-0 opacity-30 pointer-events-none [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_50%),radial-gradient(circle_at_80%_80%,white_0,transparent_50%)]" />
            <div className="relative flex items-start gap-6">
              <div className={`p-4 rounded-2xl border ${config.iconBg}`}>
                <HeroIcon className={`h-10 w-10 ${config.iconColor}`} />
              </div>
              <div className="flex-1">
                <Badge variant="outline" className="mb-3 border-white/20 text-white/80">Refyn Studio · Mahindra Pilot</Badge>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Welcome back, {config.displayName.split(" ").slice(1).join(" ")}</h1>
                <p className="text-lg text-muted-foreground mt-2">{config.title} · {config.subjectLabel}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard icon={Users} label="Your students" value={stats.students} />
            <StatCard icon={BookOpen} label="Active classes" value={stats.classes} />
            <StatCard icon={Zap} label="AI prompts · last 7d" value={stats.prompts7d} />
          </div>

          {/* Grade band selector */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Pick a grade band</CardTitle>
              <CardDescription>Every AI tool below auto-tailors its output to the band you select.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeBand} onValueChange={setActiveBand}>
                <TabsList className="flex flex-wrap h-auto bg-muted/40 p-1">
                  {config.gradeBands.map((b) => (
                    <TabsTrigger key={b.id} value={b.id} className="data-[state=active]:bg-background">
                      {b.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {activeBand && (
                <p className="text-sm text-muted-foreground mt-3">
                  {config.gradeBands.find((b) => b.id === activeBand)?.description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tools */}
          <h2 className="text-xl font-semibold mb-4">AI Tools, tuned for {activeBand || "your subjects"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {config.tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card
                  key={tool.id}
                  className="group cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all"
                  onClick={() => openTool(tool)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl border ${config.iconBg}`}>
                        <Icon className={`h-5 w-5 ${config.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base group-hover:text-primary transition-colors">{tool.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick links */}
          <h2 className="text-xl font-semibold mb-4">Jump back into your workflow</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {config.quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.label} to={link.to}>
                  <Card className="hover:border-primary/40 transition-all">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{link.label}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </main>
      </div>

      {/* Tool dialog */}
      <Dialog open={!!activeTool} onOpenChange={(open) => !open && setActiveTool(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          {activeTool && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <activeTool.icon className={`h-5 w-5 ${config.iconColor}`} />
                  {activeTool.title}
                </DialogTitle>
                <DialogDescription>
                  {activeTool.description} <span className="font-medium text-foreground">· Tuned for {activeBand}</span>
                </DialogDescription>
              </DialogHeader>

              {activeTool.needsInput && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{activeTool.inputLabel}</label>
                  <Textarea
                    value={toolInput}
                    onChange={(e) => setToolInput(e.target.value)}
                    placeholder={activeTool.inputPlaceholder}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              )}

              <Button
                onClick={() => activeTool && runTool(activeTool)}
                disabled={toolLoading}
                className="w-full"
              >
                {toolLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Generate</>
                )}
              </Button>

              {toolLoading && (
                <div className="space-y-2 mt-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              )}

              {toolReply && !toolLoading && (
                <div className="flex flex-col flex-1 min-h-0 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Output</span>
                    <Button size="sm" variant="ghost" onClick={copyReply}>
                      {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 max-h-[50vh] border rounded-lg p-4 bg-muted/30">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{toolReply}</div>
                  </ScrollArea>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard: React.FC<{ icon: any; label: string; value: number }> = ({ icon: Icon, label, value }) => (
  <Card>
    <CardContent className="p-5 flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </div>
      <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </CardContent>
  </Card>
);

export default TeacherStudio;
