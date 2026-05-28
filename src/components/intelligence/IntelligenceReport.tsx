import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Props {
  feature: string;
  params?: Record<string, any>;
  title: string;
  description: string;
  icon?: React.ReactNode;
  ctaLabel?: string;
  autoRun?: boolean;
  children?: React.ReactNode; // for param inputs above the CTA
}

const IntelligenceReport: React.FC<Props> = ({
  feature, params = {}, title, description, icon, ctaLabel = "Generate report", autoRun, children,
}) => {
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [hasRun, setHasRun] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("refyn-intelligence", {
        body: { feature, params },
      });
      if (fnErr) throw fnErr;
      if (!data?.success) throw new Error(data?.error || "Analysis failed");
      setReply(data.reply);
      setHasRun(true);
    } catch (e: any) {
      const msg = e?.message || "Something went wrong";
      setError(msg);
      toast({ title: "Analysis failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (autoRun && !hasRun) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {icon || <Sparkles className="h-6 w-6 text-primary" />}
            <h1 className="text-3xl font-bold">{title}</h1>
          </div>
          <p className="text-muted-foreground max-w-3xl">{description}</p>
        </div>
      </div>

      {children && <Card className="p-4">{children}</Card>}

      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={loading} size="lg">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : hasRun ? <RefreshCw className="h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {loading ? "Analyzing..." : hasRun ? "Regenerate" : ctaLabel}
        </Button>
        {hasRun && !loading && <span className="text-sm text-muted-foreground">Refreshes with the latest data each run.</span>}
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</Card>
      )}

      {reply && (
        <Card className="p-8 prose prose-slate dark:prose-invert max-w-none">
          <ReactMarkdown>{reply}</ReactMarkdown>
        </Card>
      )}

      {!reply && !loading && !error && (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Click <strong>{ctaLabel}</strong> to run live AI analysis on your data.</p>
        </Card>
      )}
    </div>
  );
};

export default IntelligenceReport;
