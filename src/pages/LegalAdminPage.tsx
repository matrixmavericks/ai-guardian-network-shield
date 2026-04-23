import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Save, RotateCcw, ExternalLink, ShieldCheck } from "lucide-react";
import {
  LEGAL_DOC_META,
  DEFAULT_LEGAL_DOCS,
  loadLegalDoc,
  saveLegalDoc,
  type LegalDocKey,
  type LegalDoc,
} from "@/lib/legalDocs";

const MASTER_ADMIN_EMAIL = "info.aiconditioner@gmail.com";
const KEYS: LegalDocKey[] = ["terms", "privacy", "data_protection"];

const LegalAdminPage = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Record<LegalDocKey, LegalDoc>>(DEFAULT_LEGAL_DOCS);
  const [saving, setSaving] = useState<LegalDocKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(KEYS.map(async (k) => [k, await loadLegalDoc(k)] as const));
      const next = { ...DEFAULT_LEGAL_DOCS };
      for (const [k, d] of entries) next[k] = d;
      setDocs(next);
      setLoading(false);
    })();
  }, []);

  if (!user || user.email !== MASTER_ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  const update = (k: LegalDocKey, patch: Partial<LegalDoc>) =>
    setDocs((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));

  const handleSave = async (k: LegalDocKey) => {
    setSaving(k);
    try {
      const doc = docs[k];
      if (!doc.title.trim() || doc.title.length > 200) {
        toast.error("Title is required and must be under 200 characters.");
        return;
      }
      if (!doc.body.trim() || doc.body.length > 100000) {
        toast.error("Body is required and must be under 100,000 characters.");
        return;
      }
      await saveLegalDoc(k, doc, user.id);
      toast.success(`${LEGAL_DOC_META[k].title} updated.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to save.");
    } finally {
      setSaving(null);
    }
  };

  const handleReset = (k: LegalDocKey) => {
    if (!confirm(`Reset ${LEGAL_DOC_META[k].title} to the built-in default? You will still need to click Save.`)) return;
    setDocs((prev) => ({ ...prev, [k]: DEFAULT_LEGAL_DOCS[k] }));
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Legal & Policy Editor</h1>
              <Badge variant="secondary">Master Admin</Badge>
            </div>
            <p className="text-muted-foreground">
              Edit Terms, Privacy, and Data Protection policies. Changes are live immediately on the public pages and the Security & Data dashboard.
            </p>
          </div>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Write access is restricted</AlertTitle>
            <AlertDescription>
              Only accounts with the <code>admin</code> role can write to <code>platform_settings</code>. All edits are stamped with your user ID and timestamp.
            </AlertDescription>
          </Alert>

          {loading ? (
            <div className="text-muted-foreground">Loading documents…</div>
          ) : (
            <Tabs defaultValue="terms">
              <TabsList>
                {KEYS.map((k) => (
                  <TabsTrigger key={k} value={k}>{LEGAL_DOC_META[k].title}</TabsTrigger>
                ))}
              </TabsList>
              {KEYS.map((k) => (
                <TabsContent key={k} value={k}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle>{LEGAL_DOC_META[k].title}</CardTitle>
                          <CardDescription>{LEGAL_DOC_META[k].description}</CardDescription>
                        </div>
                        <a
                          href={LEGAL_DOC_META[k].route}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 shrink-0"
                        >
                          View public page <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input
                          value={docs[k].title}
                          maxLength={200}
                          onChange={(e) => update(k, { title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Body (plain text / markdown)</label>
                        <Textarea
                          value={docs[k].body}
                          onChange={(e) => update(k, { body: e.target.value })}
                          rows={24}
                          className="font-mono text-xs"
                          maxLength={100000}
                        />
                        <p className="text-xs text-muted-foreground">
                          {docs[k].body.length.toLocaleString()} / 100,000 characters
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleSave(k)} disabled={saving === k}>
                          <Save className="h-4 w-4 mr-2" />
                          {saving === k ? "Saving…" : "Save"}
                        </Button>
                        <Button variant="outline" onClick={() => handleReset(k)}>
                          <RotateCcw className="h-4 w-4 mr-2" /> Reset to default
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
};

export default LegalAdminPage;
