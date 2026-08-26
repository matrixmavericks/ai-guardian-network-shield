import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "@/components/DashboardSidebar";
import PilotFeedbackPrompt from "@/components/PilotFeedbackPrompt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Loader2, Send, Copy, Check, Users, BookOpen, Zap, ArrowRight, Wand2, Trophy, Star, Heart, Smile, Play, MonitorPlay } from "lucide-react";
import LiveClassMode, { buildBoardSlides } from "@/components/primary/LiveClassMode";
import HomeroomPulse from "@/components/primary/HomeroomPulse";
import WeekPlanner from "@/components/primary/WeekPlanner";
import {
  getPrimaryConfig, PRIMARY_GRADE_BANDS, PRIMARY_TOOLS, PRIMARY_GAMES, PYP_THEMES,
  type PrimaryTool, type PrimaryGame, type PrimaryConfig
} from "@/lib/mispPrimaryConfig";
import { useToast } from "@/hooks/use-toast";

const PrimaryPlayground: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const config = useMemo<PrimaryConfig | null>(() => getPrimaryConfig(user?.email), [user?.email]);

  const [activeBand, setActiveBand] = useState<string>(config?.homeroomGrade || "Primary 3");
  const [activeTheme, setActiveTheme] = useState<string>("");
  const [activeTool, setActiveTool] = useState<PrimaryTool | null>(null);
  const [toolInput, setToolInput] = useState("");
  const [toolLoading, setToolLoading] = useState(false);
  const [toolReply, setToolReply] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const [activeGame, setActiveGame] = useState<PrimaryGame | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameData, setGameData] = useState<any>(null);
  const [gameStep, setGameStep] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [revealedClues, setRevealedClues] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<string>("");

  const [stats, setStats] = useState({ classes: 0, students: 0, prompts7d: 0 });
  const [boardMode, setBoardMode] = useState(false);

  useEffect(() => {
    if (config?.homeroomGrade) setActiveBand(config.homeroomGrade);
  }, [config?.homeroomGrade]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: classes } = await supabase.from("classes").select("id").eq("teacher_id", user.id);
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
      setStats({ classes: classIds.length, students, prompts7d: promptCount || 0 });
    })();
  }, [user]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading playground…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!config) return <Navigate to="/dashboard" replace />;

  const themeLabel = PYP_THEMES.find((t) => t.id === activeTheme)?.label;
  const bandMeta = PRIMARY_GRADE_BANDS.find((b) => b.id === activeBand);

  const runTool = async (tool: PrimaryTool) => {
    if (tool.needsInput && !toolInput.trim()) {
      toast({ title: "Tell me a little about it first ✨", variant: "destructive" });
      return;
    }
    setToolLoading(true);
    setToolReply("");
    try {
      const prompt = tool.buildPrompt(toolInput.trim(), activeBand, themeLabel);
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          prompt: `You are a warm, expert IB PYP primary educator at Mahindra International School Pune. Be playful but precise. Use age-appropriate language. Plain-text math only — never LaTeX. Task: ${prompt}`,
          subject: "IB PYP Primary",
          gradeLevel: activeBand,
          processTeaching: false,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "AI unavailable");
      setToolReply(data.reply || "No response.");
    } catch (err: any) {
      toast({ title: "Oops!", description: err.message || "Try again.", variant: "destructive" });
    } finally {
      setToolLoading(false);
    }
  };

  const openTool = (tool: PrimaryTool) => {
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

  const startGame = async (game: PrimaryGame) => {
    setActiveGame(game);
    setGameData(null);
    setGameStep(0);
    setGameScore(0);
    setRevealedClues(1);
    setUserAnswer("");
    setFeedback("");
    setGameLoading(true);
    try {
      const prompt = game.generatePrompt(activeBand, themeLabel);
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          prompt: `Return ONLY valid JSON, no prose, no markdown fences. ${prompt}`,
          subject: "IB PYP Primary Game",
          gradeLevel: activeBand,
          processTeaching: false,
        },
      });
      if (error) throw error;
      const raw = data?.reply || "{}";
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : cleaned);
      setGameData(parsed);
    } catch (err: any) {
      toast({ title: "Couldn't load the game", description: err.message, variant: "destructive" });
      setActiveGame(null);
    } finally {
      setGameLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex w-full bg-gradient-to-br ${config.bgGradient}`}>
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
          {/* Playful hero */}
          <div className={`relative overflow-hidden rounded-[2rem] border-4 border-white/60 dark:border-white/10 bg-gradient-to-br ${config.accent} p-8 mb-8 shadow-xl`}>
            <div className="absolute -top-8 -right-8 text-[8rem] opacity-30 select-none">🎈</div>
            <div className="absolute -bottom-6 -left-4 text-[6rem] opacity-20 select-none">🦋</div>
            <div className="relative">
              <Badge className="mb-3 bg-white/80 text-foreground hover:bg-white border-0">🌈 Primary Playground · Mahindra Pilot</Badge>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
                Hello, {config.displayName} <span className="inline-block animate-bounce">👋</span>
              </h1>
              <p className="text-lg text-foreground/80 mt-2 font-medium">
                Your {config.homeroomGrade} command center — built for tiny humans, big ideas, IB PYP.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <FunStat icon={Users} label="My learners" value={stats.students} emoji="🧒" />
            <FunStat icon={BookOpen} label="My classes" value={stats.classes} emoji="📚" />
            <FunStat icon={Zap} label="AI helpers used (7d)" value={stats.prompts7d} emoji="✨" />
          </div>

          {/* Grade band + PYP theme */}
          <Card className="mb-6 border-2 border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" /> Tune the playground
              </CardTitle>
              <CardDescription>Pick the grade band and (optional) PYP transdisciplinary theme. Every tool & game retunes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold mb-2">Grade band</p>
                <div className="flex flex-wrap gap-2">
                  {PRIMARY_GRADE_BANDS.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setActiveBand(b.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                        activeBand === b.id
                          ? "bg-primary text-primary-foreground border-primary scale-105 shadow-md"
                          : "bg-background hover:border-primary/40"
                      }`}
                    >
                      <span className="mr-1.5">{b.emoji}</span>{b.label}
                    </button>
                  ))}
                </div>
                {bandMeta && (
                  <p className="text-xs text-muted-foreground mt-2">{bandMeta.ageRange} · {bandMeta.description}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">PYP transdisciplinary theme (optional)</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTheme("")}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      activeTheme === "" ? "bg-foreground text-background border-foreground" : "bg-background hover:border-foreground/40"
                    }`}
                  >
                    None
                  </button>
                  {PYP_THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTheme(t.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        activeTheme === t.id ? "bg-foreground text-background border-foreground" : "bg-background hover:border-foreground/40"
                      }`}
                    >
                      <span className="mr-1">{t.emoji}</span>{t.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Week planner + Homeroom Pulse */}
          <div className="grid gap-4 xl:grid-cols-2 mb-10">
            <WeekPlanner userId={user.id} gradeBand={activeBand} themeLabel={themeLabel} />
            <HomeroomPulse userId={user.id} gradeBand={activeBand} themeLabel={themeLabel} />
          </div>

          {/* Games */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6 text-amber-500" /> Classroom Games</h2>
            <Badge variant="outline" className="text-xs">Open a game, then “Cast to board” for the class</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {PRIMARY_GAMES.map((g) => (
              <Card
                key={g.id}
                onClick={() => startGame(g)}
                className="group cursor-pointer hover:scale-[1.02] hover:shadow-xl transition-all border-2 hover:border-primary/60 bg-white/70 dark:bg-card/80 backdrop-blur"
              >
                <CardContent className="p-5">
                  <div className="text-4xl mb-2">{g.emoji}</div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{g.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{g.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs capitalize">{g.category}</Badge>
                    <Button size="sm" variant="ghost" className="group-hover:bg-primary/10">
                      <Play className="h-3.5 w-3.5 mr-1" /> Play
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI Tools */}
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Wand2 className="h-6 w-6 text-violet-500" /> Magic Teacher Tools</h2>
          <p className="text-sm text-muted-foreground mb-4">Tuned for <strong>{activeBand}</strong>{themeLabel ? <> · theme <strong>{themeLabel}</strong></> : null}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {PRIMARY_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card
                  key={tool.id}
                  className="group cursor-pointer hover:scale-[1.02] hover:shadow-xl transition-all border-2 hover:border-primary/60 bg-white/70 dark:bg-card/80 backdrop-blur"
                  onClick={() => openTool(tool)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{tool.emoji}</div>
                      <div className="flex-1">
                        <CardTitle className="text-base group-hover:text-primary transition-colors">{tool.title}</CardTitle>
                      </div>
                      <Icon className="h-4 w-4 text-muted-foreground opacity-50" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick links */}
          <h2 className="text-xl font-bold mb-4">Jump back into your day</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: "My Classes", to: "/classes", icon: BookOpen },
              { label: "Messages", to: "/messages", icon: Smile },
              { label: "Create Learning Path", to: "/create-learning-path", icon: Sparkles },
              { label: "Live Quiz", to: "/classes", icon: Trophy },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.label} to={link.to}>
                  <Card className="hover:border-primary/40 hover:shadow-md transition-all bg-white/70 dark:bg-card/80">
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
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <span className="text-2xl">{activeTool.emoji}</span> {activeTool.title}
                </DialogTitle>
                <DialogDescription>
                  {activeTool.description} <span className="font-medium text-foreground">· {activeBand}{themeLabel ? ` · ${themeLabel}` : ""}</span>
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

              <Button onClick={() => runTool(activeTool)} disabled={toolLoading} className="w-full" size="lg">
                {toolLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cooking up something special…</> : <><Send className="h-4 w-4 mr-2" /> Generate ✨</>}
              </Button>

              {toolLoading && (
                <div className="space-y-2 mt-2">
                  <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" />
                </div>
              )}

              {toolReply && !toolLoading && (
                <div className="flex flex-col flex-1 min-h-0 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Result</span>
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

      {/* Game dialog */}
      <Dialog open={!!activeGame} onOpenChange={(open) => !open && setActiveGame(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {activeGame && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <span className="text-3xl">{activeGame.emoji}</span> {activeGame.title}
                </DialogTitle>
                <DialogDescription>{activeGame.description} · {activeBand}{themeLabel ? ` · ${themeLabel}` : ""}</DialogDescription>
              </DialogHeader>

              {gameLoading && (
                <div className="py-12 text-center">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">Mixing up a fresh round…</p>
                </div>
              )}

              {gameData && !gameLoading && (
                <div className="space-y-4">
                  {/* Word Wizard */}
                  {activeGame.id === "word-wizard" && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Letter pool — build as many words as you can!</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(gameData.letters || []).map((l: string, i: number) => (
                          <div key={i} className="w-12 h-12 rounded-xl bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center shadow-md">{l}</div>
                        ))}
                      </div>
                      <p className="text-sm font-semibold mb-2">Target words ({gameData.targetWords?.length || 0}):</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(gameData.targetWords || []).map((w: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-sm">{w}</Badge>
                        ))}
                      </div>
                      {gameData.bonusWord && (
                        <p className="text-sm">⭐ Bonus stretch word: <strong>{gameData.bonusWord}</strong></p>
                      )}
                      {gameData.theme && <p className="text-xs text-muted-foreground mt-2 italic">{gameData.theme}</p>}
                    </div>
                  )}

                  {/* Number Ninja */}
                  {activeGame.id === "number-ninja" && gameData.missions && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <Badge>Mission {gameStep + 1} / {gameData.missions.length}</Badge>
                        <Badge variant="secondary">⭐ {gameScore}</Badge>
                      </div>
                      {gameStep < gameData.missions.length ? (
                        <>
                          <Card>
                            <CardContent className="p-6">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{gameData.missions[gameStep].level}</p>
                              <p className="text-lg font-semibold mb-4">{gameData.missions[gameStep].question}</p>
                              <div className="flex gap-2">
                                <input
                                  className="flex-1 px-3 py-2 rounded-lg border-2 focus:border-primary outline-none"
                                  value={userAnswer}
                                  onChange={(e) => setUserAnswer(e.target.value)}
                                  placeholder="Your answer…"
                                />
                                <Button onClick={() => {
                                  const correct = userAnswer.trim().toLowerCase() === String(gameData.missions[gameStep].answer).trim().toLowerCase();
                                  if (correct) { setGameScore((s) => s + 1); setFeedback("✅ Correct!"); }
                                  else setFeedback(`❌ Almost — answer: ${gameData.missions[gameStep].answer}`);
                                }}>Check</Button>
                              </div>
                              {feedback && <p className="mt-3 text-sm">{feedback}</p>}
                              <p className="text-xs text-muted-foreground mt-3">💡 Hint: {gameData.missions[gameStep].hint}</p>
                              <Button
                                className="mt-4 w-full"
                                variant="outline"
                                onClick={() => { setGameStep((s) => s + 1); setUserAnswer(""); setFeedback(""); }}
                              >
                                Next mission <ArrowRight className="h-4 w-4 ml-1" />
                              </Button>
                            </CardContent>
                          </Card>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-6xl mb-2">🏆</div>
                          <p className="text-2xl font-bold">Final score: {gameScore} / {gameData.missions.length}</p>
                          <Button className="mt-4" onClick={() => startGame(activeGame)}>Play again</Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Would You Rather */}
                  {activeGame.id === "would-you-rather" && gameData.prompts && (
                    <div className="space-y-4">
                      {gameData.prompts.map((p: any, i: number) => (
                        <Card key={i}>
                          <CardContent className="p-5">
                            <p className="text-xs text-muted-foreground mb-2">Round {i + 1}</p>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="p-3 rounded-lg bg-sky-100 dark:bg-sky-950/40 border-2 border-sky-300/50 text-sm font-medium">🅰️ {p.a}</div>
                              <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-950/40 border-2 border-rose-300/50 text-sm font-medium">🅱️ {p.b}</div>
                            </div>
                            <p className="text-xs italic text-muted-foreground">💭 {p.discussion}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Mystery Box */}
                  {activeGame.id === "mystery-box" && gameData.clues && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">Reveal clues one at a time — first to guess wins!</p>
                      <div className="space-y-2 mb-4">
                        {gameData.clues.slice(0, revealedClues).map((c: string, i: number) => (
                          <Card key={i} className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                            <CardContent className="p-3 flex gap-3 items-center">
                              <Badge>{i + 1}</Badge>
                              <p className="text-sm">{c}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {revealedClues < gameData.clues.length ? (
                        <Button onClick={() => setRevealedClues((r) => r + 1)} className="w-full">Reveal next clue</Button>
                      ) : (
                        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300">
                          <CardContent className="p-4 text-center">
                            <p className="text-sm text-muted-foreground">Answer:</p>
                            <p className="text-2xl font-bold">{gameData.answer}</p>
                            {gameData.celebration && <p className="text-xs mt-2 italic">🎉 {gameData.celebration}</p>}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Kindness Quest */}
                  {activeGame.id === "kindness-quest" && gameData.missions && (
                    <div className="grid gap-3">
                      {gameData.missions.map((m: any, i: number) => (
                        <Card key={i} className="bg-pink-50 dark:bg-pink-950/30 border-pink-200">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Heart className="h-5 w-5 text-pink-500 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <p className="font-bold">{m.title}</p>
                                <p className="text-sm mt-1">{m.do}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">{m.learnerProfile}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 italic">{m.reflect}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Story Cubes */}
                  {activeGame.id === "story-cubes" && (
                    <div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        {[
                          { l: "Character", v: gameData.character, e: "🧝" },
                          { l: "Setting", v: gameData.setting, e: "🏞️" },
                          { l: "Object", v: gameData.object, e: "🔑" },
                          { l: "Problem", v: gameData.problem, e: "⚡" },
                          { l: "Twist", v: gameData.twist, e: "🌀" },
                          { l: "Feeling", v: gameData.feeling, e: "💗" },
                        ].map((c) => (
                          <Card key={c.l} className="bg-white dark:bg-card border-2">
                            <CardContent className="p-4 text-center">
                              <div className="text-3xl mb-1">{c.e}</div>
                              <p className="text-xs text-muted-foreground">{c.l}</p>
                              <p className="font-semibold mt-1">{c.v}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {gameData.challenge && (
                        <Card className="bg-violet-50 dark:bg-violet-950/30 border-violet-300">
                          <CardContent className="p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Challenge</p>
                            <p className="text-sm">{gameData.challenge}</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => startGame(activeGame)}>
                      🎲 New round
                    </Button>
                    <Button
                      onClick={() => {
                        if (!buildBoardSlides(activeGame.id, gameData).length) {
                          toast({ title: "This round isn't board-ready — try a new round." , variant: "destructive" });
                          return;
                        }
                        setBoardMode(true);
                      }}
                    >
                      <MonitorPlay className="h-4 w-4 mr-2" /> Cast to board
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <div className="max-w-3xl mx-auto px-6"><PilotFeedbackPrompt context="teacher" /></div>
    </div>
  );
};

const FunStat: React.FC<{ icon: any; label: string; value: number; emoji: string }> = ({ icon: Icon, label, value, emoji }) => (
  <Card className="bg-white/70 dark:bg-card/80 backdrop-blur border-2">
    <CardContent className="p-5 flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">{emoji} {label}</p>
        <p className="text-3xl font-extrabold mt-1">{value}</p>
      </div>
      <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </CardContent>
  </Card>
);

export default PrimaryPlayground;
