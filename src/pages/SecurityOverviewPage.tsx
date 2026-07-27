import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardSidebar from '@/components/DashboardSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Shield, Database, Lock, Key, Server, FileText, Users, Brain,
  AlertTriangle, Cloud, KeyRound, Network, Activity,
  Download, Globe, FileLock, UserCheck, ScrollText, Layers, Loader2
} from 'lucide-react';

// SECURITY: All backend inventory (tables, secrets, functions, buckets, known
// open items) is served ONLY by the admin-security-report edge function after
// a server-side admin check. Nothing sensitive is bundled into the client.

interface DataStore {
  name: string;
  tables: string[];
  location: string;
  contains: string;
  access: string;
  retention: string;
  protection: string;
  code?: string[];
}
interface SecretEntry { name: string; purpose: string; location: string; exposure: string }
interface EdgeFn { name: string; auth: string; risk: string }
interface Bucket { name: string; public: boolean; contains: string; access: string }
interface Report {
  dataStores: DataStore[];
  secrets: SecretEntry[];
  edgeFunctions: EdgeFn[];
  storageBuckets: Bucket[];
  knownOpenItems: string[];
}

const repoPath = (p: string) => `/${p.replace(/^\/+/, '')}`;

const SecurityOverviewPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('admin-security-report', {
          body: {},
        });
        if (cancelled) return;
        if (fnError) {
          // FunctionsHttpError exposes the raw response via context
          const ctx = (fnError as any).context;
          if (ctx && typeof ctx.text === 'function') {
            const body = await ctx.text();
            if (ctx.status === 403 || /Forbidden/i.test(body)) {
              setForbidden(true);
            } else {
              setError(`Failed to load report (${ctx.status ?? '?'}): ${body}`);
            }
          } else {
            setError(fnError.message || 'Failed to load report');
          }
          return;
        }
        if (!data?.report) {
          setError('Report payload missing from server response.');
          return;
        }
        setReport(data.report as Report);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? 'Failed to load report');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, roleLoading]);

  // Client-side UX gate — real enforcement is the edge function's admin check.
  if (!authLoading && !roleLoading && (!user || !isAdmin)) {
    return <Navigate to="/dashboard" replace />;
  }

  const handlePrint = () => {
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4 print:block">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-9 w-9 text-primary" />
                <h1 className="text-3xl font-bold">Security & Data Governance</h1>
                <Badge variant="destructive">Admin Only</Badge>
              </div>
              <p className="text-muted-foreground max-w-3xl">
                Comprehensive disclosure of every data store, access control, secret, and infrastructure
                boundary in the Refyn Technologies platform. This inventory is fetched from a
                server-side admin-only endpoint and is not present in the browser bundle.
              </p>
            </div>
            <Button onClick={handlePrint} variant="outline" className="print:hidden" disabled={!report}>
              <Download className="h-4 w-4 mr-2" /> Export / Print
            </Button>
          </div>

          {loading && (
            <Card>
              <CardContent className="pt-6 flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading security report from server…
              </CardContent>
            </Card>
          )}

          {forbidden && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Access denied</AlertTitle>
              <AlertDescription>
                The server rejected this request. Only accounts with the admin role can view the
                security & data governance report.
              </AlertDescription>
            </Alert>
          )}

          {error && !forbidden && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Could not load report</AlertTitle>
              <AlertDescription className="break-words">{error}</AlertDescription>
            </Alert>
          )}

          {report && (
            <>
              {/* Posture summary */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Lock className="h-8 w-8 text-green-600" /><div><div className="text-2xl font-bold">RLS</div><div className="text-xs text-muted-foreground">Enforced on 100% of tables</div></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Key className="h-8 w-8 text-blue-600" /><div><div className="text-2xl font-bold">AES-256</div><div className="text-xs text-muted-foreground">Encryption at rest</div></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Network className="h-8 w-8 text-purple-600" /><div><div className="text-2xl font-bold">TLS 1.3</div><div className="text-xs text-muted-foreground">All traffic encrypted</div></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><UserCheck className="h-8 w-8 text-orange-600" /><div><div className="text-2xl font-bold">JWT</div><div className="text-xs text-muted-foreground">RS256, refresh rotation</div></div></div></CardContent></Card>
              </div>

              <Tabs defaultValue="data" className="w-full">
                <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
                  <TabsTrigger value="data">Data Stores</TabsTrigger>
                  <TabsTrigger value="secrets">Secrets</TabsTrigger>
                  <TabsTrigger value="edge">Edge Functions</TabsTrigger>
                  <TabsTrigger value="storage">File Storage</TabsTrigger>
                  <TabsTrigger value="auth">Auth & Roles</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                </TabsList>

                <TabsContent value="data" className="space-y-4">
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertTitle>Where every byte lives</AlertTitle>
                    <AlertDescription>
                      All application data is stored in Lovable Cloud (managed Postgres + Storage). No data
                      is sent to any third party except (a) Stripe for payment processing and (b) the Lovable
                      AI Gateway for LLM inference (content processed, not used for training).
                    </AlertDescription>
                  </Alert>

                  <Accordion type="multiple" className="space-y-2">
                    {report.dataStores.map((store, i) => (
                      <AccordionItem key={i} value={`store-${i}`} className="border rounded-lg px-4 bg-card">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <Layers className="h-5 w-5 text-primary shrink-0" />
                            <div>
                              <div className="font-semibold">{store.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{store.tables.join(', ')}</div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-2">
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div><div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Physical Location</div><p>{store.location}</p></div>
                            <div><div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Retention</div><p>{store.retention}</p></div>
                            <div className="md:col-span-2"><div className="font-semibold text-xs uppercase text-muted-foreground mb-1">What It Contains</div><p>{store.contains}</p></div>
                            <div className="md:col-span-2"><div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Who Can Access</div><p>{store.access}</p></div>
                            <div className="md:col-span-2"><div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Protection Mechanisms</div><p>{store.protection}</p></div>
                            {store.code && store.code.length > 0 && (
                              <div className="md:col-span-2">
                                <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">In-repo code</div>
                                <div className="flex flex-wrap gap-2 text-xs font-mono">
                                  {store.code.map((c) => (
                                    <span key={c} className="border rounded px-2 py-1 bg-muted/30">{repoPath(c)}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>

                <TabsContent value="secrets" className="space-y-4">
                  <Alert>
                    <KeyRound className="h-4 w-4" />
                    <AlertTitle>Secret management</AlertTitle>
                    <AlertDescription>
                      All private keys live in the Lovable Cloud encrypted secrets vault and are injected
                      as environment variables only into server-side edge functions. No private secret is
                      ever bundled into the browser application.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-3">
                    {report.secrets.map((s, i) => (
                      <Card key={i}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <Key className="h-5 w-5 text-primary mt-1" />
                            <div className="flex-1 space-y-1">
                              <div className="font-mono font-semibold">{s.name}</div>
                              <div className="text-sm"><span className="font-semibold">Purpose:</span> {s.purpose}</div>
                              <div className="text-sm"><span className="font-semibold">Stored in:</span> {s.location}</div>
                              <div className="text-sm text-muted-foreground"><span className="font-semibold">Exposure:</span> {s.exposure}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="edge" className="space-y-4">
                  <Alert>
                    <Server className="h-4 w-4" />
                    <AlertTitle>Server-side functions</AlertTitle>
                    <AlertDescription>
                      All AI generation, payment, and admin actions run inside isolated Deno edge functions
                      on Lovable Cloud. Each function declares its auth requirements explicitly.
                    </AlertDescription>
                  </Alert>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        {report.edgeFunctions.map((fn, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 py-2 border-b last:border-0 flex-wrap">
                            <div className="flex items-center gap-3 min-w-0">
                              <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-mono text-sm truncate">{fn.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <Badge variant="outline">{fn.auth}</Badge>
                              <Badge variant={fn.risk.includes('Hardened') ? 'default' : 'secondary'}>{fn.risk}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="storage" className="space-y-4">
                  <Alert>
                    <FileLock className="h-4 w-4" />
                    <AlertTitle>File storage buckets</AlertTitle>
                    <AlertDescription>
                      Files live in Lovable Cloud Storage (S3-compatible). Public buckets serve via
                      unguessable URLs; private buckets require signed URLs scoped to the owner.
                    </AlertDescription>
                  </Alert>
                  <div className="grid md:grid-cols-2 gap-4">
                    {report.storageBuckets.map((b, i) => (
                      <Card key={i}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Cloud className="h-4 w-4" />
                            {b.name}
                            <Badge variant={b.public ? 'secondary' : 'default'}>
                              {b.public ? 'Public' : 'Private'}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-1">
                          <p><span className="font-semibold">Contains:</span> {b.contains}</p>
                          <p><span className="font-semibold">Access:</span> {b.access}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="auth" className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" /> Authentication</CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p><strong>Provider:</strong> Lovable Cloud Auth — email/password and Google OAuth.</p>
                      <p><strong>Password storage:</strong> bcrypt hashing with per-user salt. Plaintext passwords are never seen by application code.</p>
                      <p><strong>Sessions:</strong> Short-lived JWT access tokens (RS256-signed) + rotating refresh tokens.</p>
                      <p><strong>Admin verification:</strong> Assigned server-side via database trigger reading approved registration requests. Client cannot self-assign elevated roles.</p>
                      <p><strong>Optional hardening available:</strong> HIBP leaked-password check, MFA, SSO/SAML for enterprise schools.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Roles & Privilege Model</CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p><strong>app_role enum:</strong> admin, teacher, student, parent.</p>
                      <p><strong>Storage:</strong> Separate user_roles table (never on profile) — prevents privilege escalation attacks.</p>
                      <p><strong>Self-assignment:</strong> Blocked entirely at the RLS layer. Roles are assigned server-side by an auth trigger.</p>
                      <p><strong>Check function:</strong> SECURITY DEFINER has_role(user, role) used by all RLS policies — avoids recursive lookups.</p>
                      <p><strong>School roles:</strong> Independent layer in school_members.school_role for tenant isolation.</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="compliance" className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" /> Compliance Posture</CardTitle><CardDescription>Standards alignment and data subject rights</CardDescription></CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div><Badge className="mr-2">GDPR</Badge>Right to access, rectification, erasure, and portability supported via master-admin SQL workflows.</div>
                      <div><Badge className="mr-2">FERPA</Badge>Student educational records accessible only to the student, their teachers, and the school. Parents see their linked child only.</div>
                      <div><Badge className="mr-2">COPPA</Badge>No targeted advertising, no third-party trackers. Parental consent flow via parent_child_links.</div>
                      <div><Badge className="mr-2">PCI-DSS</Badge>Card data fully outsourced to Stripe (Level 1 PCI). Platform never sees PAN/CVV.</div>
                      <div><Badge className="mr-2">SOC 2</Badge>Underlying infrastructure is SOC 2 Type II certified.</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" /> AI Data Handling</CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p><strong>Prompts in transit:</strong> Sent via TLS 1.3 to Lovable AI Gateway.</p>
                      <p><strong>Training:</strong> AI Gateway providers contractually do NOT train on customer prompt data.</p>
                      <p><strong>Local copy:</strong> Every prompt + response stored for moderation, audit, and parent/teacher visibility (RLS-scoped).</p>
                      <p><strong>Moderation gate:</strong> Process-Teaching-Mode rewrites direct-answer prompts. Blocked keywords configurable per-school.</p>
                      <p><strong>Bypass detection:</strong> Jailbreak / prompt-injection attempts logged immutably with IP, severity, and payload.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Known Open Items</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {report.knownOpenItems.map((item, i) => (
                        <p key={i}>• {item}</p>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Incident Response</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p><strong>Detection:</strong> bypass_attempts log + ai_usage_logs anomaly review by master admin.</p>
                      <p><strong>Containment:</strong> Master admin can revoke user roles, disable payments globally, or rotate the AI gateway key in seconds.</p>
                      <p><strong>Notification:</strong> Affected users contacted within 72 hours of confirmed breach (GDPR Art. 33).</p>
                      <p><strong>Recovery:</strong> Point-in-time DB recovery (7 days standard, longer on enterprise).</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <Card className="bg-muted/30 print:hidden">
                <CardContent className="pt-6 text-xs text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      This page is restricted to administrators. The underlying inventory is served by
                      the admin-security-report edge function only after a server-side admin check.
                    </span>
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SecurityOverviewPage;
