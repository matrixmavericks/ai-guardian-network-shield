import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalendarDays, Loader2, Sparkles, Save, Trash2, Copy, Check, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Day = {
  day: string;
  provocation: string;
  focus: string;
  game?: string;
  gentle?: string;
  onLevel?: string;
  stretch?: string;
  materials?: string;
};

type WeekPlan = {
  title: string;
  centralIdea?: string;
  days: Day[];
  parentNote?: string;
  assessment?: string;
};

type SavedPlan = {
  id: string;
  title: string;
  grade_band: string | null;
  unit_theme: string | null;
  plan: any;
  created_at: string;
};

interface Props {
  userId: string;
  gradeBand: string;
  themeLabel?: string;
}

const WeekPlanner: React.FC<Props> = ({ userId, gradeBand, themeLabel }) => {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [saved, setSaved] = useState<SavedPlan[]>([]);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadSaved = async () => {
    const { data } = await supabase
      .from("primary_week_plans")
      .select("*")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);
    setSaved((data as any) || []);
  };

  useEffect(() => {
    if (userId) loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const generate = async () => {
    if (!topic.trim()) {
      toast({ title: "What's the week about?", variant: "destructive" });
      return;
    }
    setLoading(true);
    setPlan(null);
    try {
      const parsed = await runPrimaryJson({
        prompt: `Build a complete 5-day IB PYP week plan for ${gradeBand}${themeLabel ? ` under the transdisciplinary theme "${themeLabel}"` : ""} on "${topic.trim()}". Return JSON: { "title": "short week title", "centralIdea": "one crisp central idea statement", "days": [exactly 5 objects, Monday to Friday: { "day": "Monday", "provocation": "a hook that opens the day", "focus": "the learning focus in one line", "game": "a quick classroom game or activity", "gentle": "scaffolded version of the main task", "onLevel": "the main task", "stretch": "extension with student agency", "materials": "everyday materials needed" }], "assessment": "one formative check across the week", "parentNote": "a warm 3-sentence jargon-free note to families about the week" }`,
        gradeBand,
        theme: themeLabel,
        validate: normalizeWeekPlan,
      });
      setPlan(parsed as WeekPlan);
      setOpen(true);
    } catch (err: any) {
      toast({ title: "Couldn't build the week", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  const savePlan = async () => {
    if (!plan) return;
    const { error } = await supabase.from("primary_week_plans").insert({
      teacher_id: userId,
      title: plan.title || topic,
      grade_band: gradeBand,
      unit_theme: themeLabel || null,
      plan: plan as any,
    });
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Week saved 📅" });
    loadSaved();
  };

  const removePlan = async (id: string) => {
    await supabase.from("primary_week_plans").delete().eq("id", id);
    setSaved((s) => s.filter((p) => p.id !== id));
  };

  const asText = (p: WeekPlan) =>
    [
      p.title,
      p.centralIdea ? `Central idea: ${p.centralIdea}` : "",
      ...(p.days || []).map(
        (d) =>
          `\n${d.day}\n  Provocation: ${d.provocation}\n  Focus: ${d.focus}\n  Game: ${d.game || "-"}\n  Gentle: ${d.gentle || "-"}\n  On level: ${d.onLevel || "-"}\n  Stretch: ${d.stretch || "-"}\n  Materials: ${d.materials || "-"}`
      ),
      p.assessment ? `\nAssessment: ${p.assessment}` : "",
      p.parentNote ? `\nNote home: ${p.parentNote}` : "",
    ].join("\n");

  const copyPlan = async () => {
    if (!plan) return;
    await navigator.clipboard.writeText(asText(plan));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <Card className="border-2 bg-white/70 dark:bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-sky-500" /> One-Tap Week Planner
          </CardTitle>
          <CardDescription>
            One topic in — five days out: provocations, games, three ability tiers, materials and a note home.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="e.g. water in our community, forces & motion, marketplaces"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
            <Button onClick={generate} disabled={loading} className="md:w-auto">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Planning…</> : <><Sparkles className="h-4 w-4 mr-2" /> Build my week</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tuned for <strong>{gradeBand}</strong>{themeLabel ? <> · <strong>{themeLabel}</strong></> : null}
          </p>

          {saved.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Saved weeks</p>
              <div className="flex flex-wrap gap-2">
                {saved.map((p) => (
                  <div key={p.id} className="flex items-center gap-1 rounded-full border pl-3 pr-1 py-1 bg-background/70">
                    <button
                      className="text-sm font-medium hover:text-primary"
                      onClick={() => { setPlan(p.plan); setOpen(true); }}
                    >
                      {p.title}
                    </button>
                    <Badge variant="secondary" className="text-[10px]">{p.grade_band}</Badge>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removePlan(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">{plan?.title || "Your week"}</DialogTitle>
            <DialogDescription>
              {plan?.centralIdea || `${gradeBand}${themeLabel ? ` · ${themeLabel}` : ""}`}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[62vh] pr-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(plan?.days || []).map((d, i) => (
                <Card key={i} className="border-2">
                  <CardContent className="p-4 space-y-2">
                    <Badge className="mb-1">{d.day}</Badge>
                    <p className="text-sm font-semibold">{d.focus}</p>
                    <p className="text-xs text-muted-foreground italic">✨ {d.provocation}</p>
                    {d.game && <p className="text-xs">🎲 {d.game}</p>}
                    <div className="space-y-1.5 pt-1">
                      {d.gentle && <TierRow label="Gentle" tone="bg-emerald-100 dark:bg-emerald-950/40" text={d.gentle} />}
                      {d.onLevel && <TierRow label="On level" tone="bg-sky-100 dark:bg-sky-950/40" text={d.onLevel} />}
                      {d.stretch && <TierRow label="Stretch" tone="bg-violet-100 dark:bg-violet-950/40" text={d.stretch} />}
                    </div>
                    {d.materials && <p className="text-[11px] text-muted-foreground pt-1">🧰 {d.materials}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>

            {(plan?.assessment || plan?.parentNote) && (
              <div className="grid gap-3 md:grid-cols-2 mt-3">
                {plan?.assessment && (
                  <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Formative check</p>
                      <p className="text-sm">{plan.assessment}</p>
                    </CardContent>
                  </Card>
                )}
                {plan?.parentNote && (
                  <Card className="bg-pink-50 dark:bg-pink-950/30 border-pink-200">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Note home</p>
                      <p className="text-sm">{plan.parentNote}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={savePlan}><Save className="h-4 w-4 mr-2" /> Save week</Button>
            <Button variant="outline" onClick={copyPlan}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />} Copy
            </Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const TierRow: React.FC<{ label: string; tone: string; text: string }> = ({ label, tone, text }) => (
  <div className={`rounded-lg px-2.5 py-1.5 ${tone}`}>
    <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{label}</p>
    <p className="text-xs leading-snug">{text}</p>
  </div>
);

export default WeekPlanner;
