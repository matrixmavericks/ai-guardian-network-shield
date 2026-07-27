import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { X, MessageSquareHeart } from "lucide-react";

type Context = "student" | "teacher";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function PilotFeedbackPrompt({ context }: { context: Context }) {
  const { user } = useAuth();
  const storageKey = useMemo(() => (user?.id ? `pilot_feedback_dismissed_${user.id}` : null), [user?.id]);
  const [hidden, setHidden] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) { setHidden(false); return; }
    const ts = Number(raw);
    if (!Number.isFinite(ts) || Date.now() - ts > SEVEN_DAYS_MS) setHidden(false);
  }, [storageKey]);

  const snooze = () => {
    if (storageKey) localStorage.setItem(storageKey, String(Date.now()));
    setHidden(true);
  };

  const submit = async () => {
    if (!user?.id || score === null) return;
    setSubmitting(true);
    try {
      const { data: sm } = await supabase
        .from("school_members")
        .select("school_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      const { error } = await supabase.from("pilot_feedback").insert({
        school_id: sm?.school_id ?? null,
        user_id: user.id,
        role: (user as any)?.role ?? context,
        nps_score: score,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      toast.success("Thanks for the feedback!");
      snooze();
    } catch (e: any) {
      toast.error(e?.message || "Could not submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (hidden || !user?.id) return null;

  const copy = context === "teacher"
    ? "How likely are you to recommend Refyn to a fellow teacher?"
    : "How likely are you to recommend Refyn to a friend?";

  return (
    <div className="mt-8">
      <Card className="border-dashed relative bg-card/60 backdrop-blur">
        <button
          onClick={snooze}
          aria-label="Dismiss"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquareHeart className="h-4 w-4 text-primary" />
            {copy}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 11 }, (_, i) => i).map((n) => (
              <button
                key={n}
                onClick={() => setScore(n)}
                className={`h-9 w-9 rounded-md border text-sm font-mono transition ${
                  score === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Not likely</span><span>Extremely likely</span>
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything you'd like to share? (optional)"
            rows={2}
            maxLength={1000}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={snooze}>Maybe later</Button>
            <Button size="sm" onClick={submit} disabled={score === null || submitting}>
              {submitting ? "Sending…" : "Submit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
