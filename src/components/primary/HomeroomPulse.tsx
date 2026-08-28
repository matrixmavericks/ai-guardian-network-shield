import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Activity, Loader2, Sparkles, Trash2, FileText, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Observation = {
  id: string;
  student_name: string;
  grade_band: string | null;
  raw_note: string;
  refined_evidence: string | null;
  learner_profile: string[] | null;
  next_step: string | null;
  created_at: string;
};

interface Props {
  userId: string;
  gradeBand: string;
  themeLabel?: string;
}

const HomeroomPulse: React.FC<Props> = ({ userId, gradeBand, themeLabel }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("primary_observations")
      .select("*")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const byStudent = useMemo(() => {
    const map = new Map<string, Observation[]>();
    items.forEach((o) => {
      const key = o.student_name.trim();
      map.set(key, [...(map.get(key) || []), o]);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [items]);

  const profileTally = useMemo(() => {
    const tally: Record<string, number> = {};
    items.forEach((o) => (o.learner_profile || []).forEach((p) => { tally[p] = (tally[p] || 0) + 1; }));
    return Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [items]);

  const capture = async () => {
    if (!student.trim() || !note.trim()) {
      toast({ title: "Add a child's name and a quick note", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const parsed = await runPrimaryJson({
        prompt: `You are turning a scrappy classroom observation into professional, evidence-based IB PYP documentation for a ${gradeBand} child${themeLabel ? ` during the unit "${themeLabel}"` : ""}. Observation: "${note.trim()}". Return JSON: { "evidence": "2-3 sentence objective, strengths-based observation in professional report language, no jargon, no invented facts", "learnerProfile": ["1-3 IB Learner Profile attributes evidenced"], "nextStep": "one concrete, small next teaching step for this child" }`,
        gradeBand,
        theme: themeLabel,
        validate: normalizeObservation,
      });

      const { error: insErr } = await supabase.from("primary_observations").insert({
        teacher_id: userId,
        student_name: student.trim(),
        grade_band: gradeBand,
        raw_note: note.trim(),
        refined_evidence: parsed.evidence,
        learner_profile: parsed.learnerProfile,
        next_step: parsed.nextStep || null,
      });
      if (insErr) throw insErr;

      setNote("");
      toast({ title: "Captured ✨", description: `Evidence logged for ${student.trim()}.` });
      load();
    } catch (err: any) {
      toast({ title: "Couldn't capture that", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };


  const remove = async (id: string) => {
    await supabase.from("primary_observations").delete().eq("id", id);
    setItems((s) => s.filter((i) => i.id !== id));
  };

  const buildReport = async (name: string) => {
    setReportFor(name);
    setReportText("");
    setCopied(false);
    setReportLoading(true);
    try {
      const notes = items.filter((i) => i.student_name.trim() === name);
      const digest = notes
        .map((n) => `- ${new Date(n.created_at).toLocaleDateString()}: ${n.refined_evidence || n.raw_note} [${(n.learner_profile || []).join(", ")}]`)
        .join("\n");
      const reply = await runPrimaryText({
        prompt: `You are writing an IB PYP report-card narrative for ${name}, a ${gradeBand} student, using ONLY the observation evidence below. Do not invent achievements. Write: (1) a warm 120-160 word narrative in professional report language weaving in Learner Profile attributes, (2) a short "Growing edge" line with one next step, (3) a one-sentence, jargon-free version a parent can read at home. Plain text only, no markdown headers.\n\nEvidence:\n${digest}`,
        gradeBand,
        theme: themeLabel,
      });
      setReportText(reply);

    } catch (err: any) {
      toast({ title: "Report failed", description: err.message, variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <Card className="border-2 bg-white/70 dark:bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-rose-500" /> Homeroom Pulse
          </CardTitle>
          <CardDescription>
            Jot a 5-second note about a child. It becomes professional Learner Profile evidence — so report season writes itself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <Input placeholder="Child's name" value={student} onChange={(e) => setStudent(e.target.value)} />
            <Textarea
              rows={2}
              className="resize-none"
              placeholder="e.g. shared her strategy with the whole table without being asked, still muddles teen numbers"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button onClick={capture} disabled={saving} className="w-full md:w-auto">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Refining…</> : <><Sparkles className="h-4 w-4 mr-2" /> Capture evidence</>}
          </Button>

          {profileTally.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Class profile signal</p>
              <div className="flex flex-wrap gap-2">
                {profileTally.map(([p, n]) => (
                  <Badge key={p} variant="secondary" className="text-xs">{p} · {n}</Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Children logged ({byStudent.length})
            </p>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : byStudent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No observations yet — capture your first one above.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {byStudent.map(([name, notes]) => (
                  <Button key={name} size="sm" variant="outline" onClick={() => buildReport(name)}>
                    {name} <Badge variant="secondary" className="ml-2 text-[10px]">{notes.length}</Badge>
                    <FileText className="h-3.5 w-3.5 ml-2 opacity-60" />
                  </Button>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <ScrollArea className="max-h-72 border rounded-xl p-3 bg-muted/20">
              <div className="space-y-3">
                {items.map((o) => (
                  <div key={o.id} className="rounded-lg border bg-background/70 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{o.student_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(o.created_at).toLocaleString()} · {o.grade_band}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(o.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm mt-2">{o.refined_evidence || o.raw_note}</p>
                    {(o.learner_profile || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(o.learner_profile || []).map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                        ))}
                      </div>
                    )}
                    {o.next_step && <p className="text-xs italic text-muted-foreground mt-2">→ {o.next_step}</p>}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reportFor} onOpenChange={(open) => !open && setReportFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report narrative · {reportFor}</DialogTitle>
            <DialogDescription>Built only from your logged observations — no invented achievements.</DialogDescription>
          </DialogHeader>
          {reportLoading ? (
            <div className="py-10 text-center">
              <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Weaving the evidence together…</p>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[55vh] border rounded-lg p-4 bg-muted/30">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{reportText}</div>
              </ScrollArea>
              <Button variant="outline" onClick={copyReport}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied" : "Copy narrative"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HomeroomPulse;
