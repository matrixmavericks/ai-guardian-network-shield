import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import DashboardSidebar from '@/components/DashboardSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Shield, Database, Lock, Key, Eye, Server, FileText, Users, Brain,
  AlertTriangle, CheckCircle2, Cloud, KeyRound, Network, Activity,
  Download, Globe, FileLock, UserCheck, ScrollText, Layers
} from 'lucide-react';

const MASTER_ADMIN_EMAIL = 'info.aiconditioner@gmail.com';

const SecurityOverviewPage = () => {
  const { user } = useAuth();
  const [printing, setPrinting] = useState(false);

  if (!user || user.email !== MASTER_ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 100);
  };

  const dataStores = [
    {
      name: 'AI Prompt & Chat History',
      tables: ['ai_chat_sessions', 'ai_chat_messages', 'prompt_logs'],
      location: 'Lovable Cloud (Supabase Postgres, EU/US region, encrypted at rest with AES-256)',
      contains: 'Every student/teacher prompt sent to AI, AI responses, moderation status (approved/blocked/rewritten/flagged), severity level, flagged keywords, subject, grade level, session metadata.',
      access: 'Owner only (auth.uid() = user_id). Teachers can read chats only for students enrolled in classes they personally teach. School admins can read chats for members of their own school. Master admin has global read access for moderation oversight.',
      retention: 'Indefinite by default. Master admin can purge per-user records via SQL on request (GDPR right-to-erasure).',
      protection: 'Row-Level Security (RLS) enforced on every read/write. INSERT restricted to auth.uid()=user_id. UPDATE/DELETE blocked on ai_chat_messages and prompt_logs (immutable audit log).',
    },
    {
      name: 'AI Token Usage & Cost',
      tables: ['ai_usage_logs', 'ai_usage_quotas'],
      location: 'Lovable Cloud Postgres.',
      contains: 'Per-call token counts, model name, estimated USD cost, session linkage. Per-student monthly USD quota set by teachers.',
      access: 'Users see their own. Teachers see students in their classes. Admins see all. INSERT only by service role (edge functions).',
      retention: 'Indefinite for billing reconciliation.',
      protection: 'No UPDATE/DELETE allowed. Inserts only via authenticated service-role calls inside edge functions.',
    },
    {
      name: 'User Identity & Profile',
      tables: ['auth.users (managed)', 'profiles', 'user_roles', 'parent_child_links'],
      location: 'Lovable Cloud auth schema (managed by Supabase Auth) + public.profiles.',
      contains: 'Email, hashed password (bcrypt), full name, avatar URL, grade level, department, role assignments, parent↔child relations.',
      access: 'Passwords NEVER readable from app code — only Supabase Auth verifies them. Profiles readable by authenticated users (display purposes). Role assignment is admin-only; users may only self-assign student/parent — admin/teacher self-assignment is blocked at the policy level.',
      retention: 'Until account deletion request.',
      protection: 'Passwords hashed with bcrypt by Supabase Auth. JWT sessions (RS256) with short access tokens + refresh rotation. Role escalation prevented by RLS. Optional Leaked-Password (HIBP) check available.',
    },
    {
      name: 'Payment & Registration Data',
      tables: ['registration_requests', 'payment_transactions'],
      location: 'Lovable Cloud Postgres. Stripe holds card data (PCI-DSS Level 1) — we never see card numbers.',
      contains: 'Email, name, requested role, payment plan, INR amount, Stripe session/customer/subscription IDs, discount codes, seat config. NO card numbers or CVVs ever stored.',
      access: 'Owner (matched on auth email) and admins. Anonymous status checks go through SECURITY DEFINER RPC `get_registration_status_by_email` which returns ONLY status fields — never IDs or PII.',
      retention: 'Indefinite (financial record).',
      protection: 'Stripe webhooks verified with HMAC signature. Sensitive lookup restricted to RPC with explicit column allow-list.',
    },
    {
      name: 'Classroom Content',
      tables: ['classes', 'class_members', 'class_courses', 'class_resources', 'class_resource_folders', 'class_assignments', 'assignment_submissions', 'assignment_groups'],
      location: 'Lovable Cloud Postgres + Storage buckets (submission-files, class-resources).',
      contains: 'Class roster, join codes, subject, uploaded files, assignments, student submissions, grades, feedback.',
      access: 'Class members + class teacher only. Teachers can grade. Students can update only ungraded submissions.',
      retention: 'Until class is deleted by owning teacher.',
      protection: 'RLS via SECURITY DEFINER helpers `is_class_member` and `is_class_teacher` (avoid recursive policy issues).',
    },
    {
      name: 'Learning Paths & Capstones',
      tables: ['learning_paths', 'learning_path_progress', 'learning_path_activities', 'capstone_submissions'],
      location: 'Lovable Cloud Postgres + capstone-files storage bucket.',
      contains: 'AI-generated curriculum modules, per-user progress %, completed module IDs, capstone files, AI-evaluated scores, teacher grades.',
      access: 'Owner + assigned teacher. Public learning paths readable by all authenticated users.',
      retention: 'Indefinite — student-owned portfolio artifact.',
      protection: 'RLS on user_id. Teacher access scoped to their class roster.',
    },
    {
      name: 'Portfolios (Student Work)',
      tables: ['portfolio_projects', 'portfolio_collaborators', 'portfolio_comments', 'portfolio_updates'],
      location: 'Lovable Cloud Postgres + portfolio-media storage (public bucket for shareable projects).',
      contains: 'Student-published work, media, external links, share tokens, collaborator invites.',
      access: 'Owner + invited collaborators always. Publicly published projects readable via opaque share token only.',
      retention: 'Indefinite (student property).',
      protection: 'Share tokens are 32-byte URL-safe random. Unpublished projects fully private.',
    },
    {
      name: 'School & Multi-Tenant Data',
      tables: ['schools', 'school_members', 'school_ai_settings', 'school_seat_limits', 'school_announcements', 'school_events'],
      location: 'Lovable Cloud Postgres.',
      contains: 'School metadata, member roster with role (admin/owner/teacher/student), per-school AI policies, seat usage.',
      access: 'Members of the school only. Cross-school data is fully isolated by RLS using `is_school_member` helper.',
      retention: 'Until school is deleted by owner or master admin.',
      protection: 'Tenant isolation enforced at every policy. School admin cannot access another school\'s data even with valid JWT.',
    },
    {
      name: 'Live Quiz Sessions',
      tables: ['live_quiz_sessions', 'live_quiz_questions', 'live_quiz_players', 'live_quiz_answers'],
      location: 'Lovable Cloud Postgres + Realtime channels.',
      contains: 'Quiz content, join codes, per-player score/streak, individual answers.',
      access: 'Teacher (owner) + class members during the session.',
      retention: 'Indefinite for analytics.',
      protection: 'Players insert only their own answers. Teacher controls session state.',
    },
    {
      name: 'Security & Audit',
      tables: ['bypass_attempts', 'ethical_badges', 'prompt_logs'],
      location: 'Lovable Cloud Postgres.',
      contains: 'Detected jailbreak / bypass attempts with IP address, severity, attempt type, full payload. Earned ethical-use badges.',
      access: 'Admin SELECT only. INSERT restricted to service_role (edge functions) or authenticated owner.',
      retention: 'Indefinite (forensic record).',
      protection: 'Append-only — no UPDATE or DELETE permitted at the policy level.',
    },
    {
      name: 'AI Configuration & Training',
      tables: ['ai_configurations', 'school_ai_settings', 'model_training_data', 'curriculum_links'],
      location: 'Lovable Cloud Postgres.',
      contains: 'Blocked keyword lists, process-mode toggle, allowed models, custom system prompts, fine-tune training pairs.',
      access: 'Admins (global) and school admins (their school only). Teachers may view global config; students never.',
      retention: 'Indefinite — governance baseline.',
      protection: 'Admin role required for write. Training data pairs require admin approval flag before use.',
    },
    {
      name: 'Platform Settings (Feature Toggles)',
      tables: ['platform_settings'],
      location: 'Lovable Cloud Postgres.',
      contains: 'Master switches like payments_enabled, registration mode.',
      access: 'Master admin write. All authenticated users may read (needed for client-side gating).',
      retention: 'Indefinite.',
      protection: 'Write restricted to has_role(admin).',
    },
  ];

  const secrets = [
    { name: 'STRIPE_SANDBOX_API_KEY', purpose: 'Server-side Stripe API calls', location: 'Lovable Cloud Secrets (encrypted vault)', exposure: 'Never sent to browser. Used only inside edge functions.' },
    { name: 'PAYMENTS_SANDBOX_WEBHOOK_SECRET', purpose: 'Verify Stripe webhook HMAC signatures', location: 'Lovable Cloud Secrets', exposure: 'Server-only.' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', purpose: 'Privileged DB access for edge functions', location: 'Lovable Cloud Secrets', exposure: 'NEVER in client. Bypasses RLS — must only be used in trusted server code.' },
    { name: 'SUPABASE_DB_URL', purpose: 'Direct Postgres connection for migrations', location: 'Lovable Cloud Secrets', exposure: 'Server-only.' },
    { name: 'LOVABLE_API_KEY', purpose: 'Lovable AI Gateway access', location: 'Lovable Cloud managed secret', exposure: 'Server-only. Rotatable via dedicated rotate tool.' },
    { name: 'SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_PUBLISHABLE_KEY', purpose: 'Public client-side Supabase config', location: '.env (auto-generated)', exposure: 'Safe to ship — RLS enforces all access; anon key alone grants nothing.' },
  ];

  const edgeFunctions = [
    { name: 'ai-chat', auth: 'Open (chat moderation handles auth via session)', risk: 'Low — moderation gate' },
    { name: 'moderate-prompt', auth: 'JWT REQUIRED (verified via getClaims)', risk: 'Hardened' },
    { name: 'evaluate-capstone', auth: 'JWT REQUIRED + ownership check', risk: 'Hardened' },
    { name: 'generate-training-response', auth: 'JWT REQUIRED + admin/teacher role check', risk: 'Hardened' },
    { name: 'generate-learning-path', auth: 'Open (read-only generation)', risk: 'Rate-limited via AI quota' },
    { name: 'generate-module-content', auth: 'Open', risk: 'Rate-limited' },
    { name: 'generate-teaching-plan', auth: 'Open', risk: 'Rate-limited' },
    { name: 'analyze-syllabus', auth: 'Open', risk: 'Rate-limited' },
    { name: 'generate-course-study-content', auth: 'Open', risk: 'Rate-limited' },
    { name: 'generate-live-quiz', auth: 'Open', risk: 'Rate-limited' },
    { name: 'analyze-class-risks', auth: 'Open', risk: 'Aggregate data only' },
    { name: 'analyze-learning-profile', auth: 'Open', risk: 'Aggregate data only' },
    { name: 'generate-path-insights', auth: 'Open', risk: 'Aggregate data only' },
    { name: 'docs-assistant', auth: 'Open', risk: 'Public docs' },
    { name: 'create-checkout', auth: 'Server-validated', risk: 'Stripe-signed' },
    { name: 'create-portal-session', auth: 'Server-validated', risk: 'Stripe-signed' },
    { name: 'payments-webhook', auth: 'HMAC verified (Stripe signature)', risk: 'Hardened' },
    { name: 'get-stripe-price', auth: 'Open (read-only price lookup)', risk: 'Public catalog' },
    { name: 'create-school-user', auth: 'Admin-role required', risk: 'Hardened' },
    { name: 'admin-comp-account', auth: 'Master admin only', risk: 'Hardened' },
  ];

  const storageBuckets = [
    { name: 'student-documents', public: false, contains: 'Private student uploads', access: 'Owner-scoped path: /{user_id}/...' },
    { name: 'submission-files', public: true, contains: 'Assignment submissions', access: 'URLs are unguessable; share intentionally' },
    { name: 'class-resources', public: true, contains: 'Teacher-uploaded class materials', access: 'Intended public-readable for class members' },
    { name: 'capstone-files', public: true, contains: 'Capstone deliverables', access: 'Linked from portfolio share tokens' },
    { name: 'portfolio-media', public: true, contains: 'Student portfolio media', access: 'Designed for public sharing' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-4 print:block">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-9 w-9 text-primary" />
                <h1 className="text-3xl font-bold">Security & Data Governance</h1>
                <Badge variant="destructive">Master Admin Only</Badge>
              </div>
              <p className="text-muted-foreground max-w-3xl">
                Comprehensive disclosure of every data store, access control, secret, and infrastructure
                boundary in the Refyn Technologies platform. Designed for stakeholder review,
                compliance audits, and pilot disclosures.
              </p>
            </div>
            <Button onClick={handlePrint} variant="outline" className="print:hidden">
              <Download className="h-4 w-4 mr-2" /> Export / Print
            </Button>
          </div>

          {/* Posture summary */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Lock className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">RLS</div>
                    <div className="text-xs text-muted-foreground">Enforced on 100% of tables</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Key className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">AES-256</div>
                    <div className="text-xs text-muted-foreground">Encryption at rest</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Network className="h-8 w-8 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">TLS 1.3</div>
                    <div className="text-xs text-muted-foreground">All traffic encrypted</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-8 w-8 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">JWT</div>
                    <div className="text-xs text-muted-foreground">RS256, refresh rotation</div>
                  </div>
                </div>
              </CardContent>
            </Card>
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

            {/* DATA STORES */}
            <TabsContent value="data" className="space-y-4">
              <Alert>
                <Database className="h-4 w-4" />
                <AlertTitle>Where every byte lives</AlertTitle>
                <AlertDescription>
                  All application data is stored in Lovable Cloud (managed Postgres + Storage). No data
                  is sent to any third party except (a) Stripe for payment processing and (b) the Lovable
                  AI Gateway for LLM inference (Google Gemini / OpenAI GPT models — content is processed,
                  not used for training).
                </AlertDescription>
              </Alert>

              <Accordion type="multiple" className="space-y-2">
                {dataStores.map((store, i) => (
                  <AccordionItem key={i} value={`store-${i}`} className="border rounded-lg px-4 bg-card">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <Layers className="h-5 w-5 text-primary shrink-0" />
                        <div>
                          <div className="font-semibold">{store.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {store.tables.join(', ')}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2">
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Physical Location</div>
                          <p>{store.location}</p>
                        </div>
                        <div>
                          <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Retention</div>
                          <p>{store.retention}</p>
                        </div>
                        <div className="md:col-span-2">
                          <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">What It Contains</div>
                          <p>{store.contains}</p>
                        </div>
                        <div className="md:col-span-2">
                          <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Who Can Access</div>
                          <p>{store.access}</p>
                        </div>
                        <div className="md:col-span-2">
                          <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Protection Mechanisms</div>
                          <p>{store.protection}</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            {/* SECRETS */}
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
                {secrets.map((s, i) => (
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

            {/* EDGE FUNCTIONS */}
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
                    {edgeFunctions.map((fn, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{fn.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline">{fn.auth}</Badge>
                          <Badge variant={fn.risk.includes('Hardened') ? 'default' : 'secondary'}>{fn.risk}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* STORAGE */}
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
                {storageBuckets.map((b, i) => (
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

            {/* AUTH */}
            <TabsContent value="auth" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" /> Authentication</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p><strong>Provider:</strong> Lovable Cloud Auth (Supabase Auth under the hood) — email/password and Google OAuth.</p>
                  <p><strong>Password storage:</strong> bcrypt hashing with per-user salt. Plaintext passwords are never seen by application code or stored anywhere.</p>
                  <p><strong>Sessions:</strong> Short-lived JWT access tokens (RS256-signed) + rotating refresh tokens. Tokens stored in browser localStorage by Supabase client; XSS protection via React's auto-escaping.</p>
                  <p><strong>Admin verification:</strong> Master admin (info.aiconditioner@gmail.com) auto-assigned admin role via DB trigger `auto_assign_admin_role`.</p>
                  <p><strong>Optional hardening available:</strong> HIBP leaked-password check (toggleable), MFA (Supabase native), SSO/SAML for enterprise schools.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Roles & Privilege Model</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p><strong>app_role enum:</strong> admin, teacher, student, parent.</p>
                  <p><strong>Storage:</strong> Separate `user_roles` table (never on profile) — prevents privilege escalation attacks.</p>
                  <p><strong>Self-assignment:</strong> Users may only self-assign `student` or `parent` roles at signup. `admin` and `teacher` require master-admin provisioning.</p>
                  <p><strong>Check function:</strong> SECURITY DEFINER `has_role(user, role)` used by all RLS policies — avoids recursive policy lookups.</p>
                  <p><strong>School roles:</strong> Independent layer in `school_members.school_role` (owner/admin/teacher/student) for tenant isolation.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* COMPLIANCE */}
            <TabsContent value="compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" /> Compliance Posture</CardTitle>
                  <CardDescription>Standards alignment and data subject rights</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div><Badge className="mr-2">GDPR</Badge>Right to access, rectification, erasure, and portability supported via master-admin SQL workflows. Data minimization enforced — no field collected without functional purpose.</div>
                  <div><Badge className="mr-2">FERPA</Badge>Student educational records (grades, assignments, AI chats) accessible only to the student, their teachers, and the school. Parents see their linked child only.</div>
                  <div><Badge className="mr-2">COPPA</Badge>No targeted advertising, no third-party trackers in the app. Parental consent flow available via parent_child_links.</div>
                  <div><Badge className="mr-2">PCI-DSS</Badge>Card data fully outsourced to Stripe (Level 1 PCI). Platform never sees PAN/CVV.</div>
                  <div><Badge className="mr-2">SOC 2</Badge>Underlying infrastructure (Supabase / AWS) is SOC 2 Type II certified.</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" /> AI Data Handling</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p><strong>Prompts in transit:</strong> Sent via TLS 1.3 to Lovable AI Gateway → Google/OpenAI inference endpoints.</p>
                  <p><strong>Training:</strong> Lovable AI Gateway providers contractually do NOT train on customer prompt data.</p>
                  <p><strong>Local copy:</strong> Every prompt + response stored in `ai_chat_messages` and `prompt_logs` for moderation, audit, and parent/teacher visibility (RLS-scoped).</p>
                  <p><strong>Moderation gate:</strong> Process-Teaching-Mode rewrites direct-answer prompts. Blocked keywords are configurable per-school.</p>
                  <p><strong>Bypass detection:</strong> Jailbreak / prompt-injection attempts logged immutably in `bypass_attempts` with IP, severity, and payload.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Known Open Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>• `classes` table currently allows any authenticated user to read all class metadata (including join codes). Tightening planned — does not expose student data.</p>
                  <p>• Realtime channel authorization uses default Supabase rules — relies on table-level RLS for payload safety. Channel subscription scoping under review.</p>
                  <p>• Several public storage buckets allow listing — files use unguessable IDs, but enumeration is theoretically possible.</p>
                  <p>• Leaked-password (HIBP) check available but not yet enabled.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Incident Response</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Detection:</strong> bypass_attempts log + ai_usage_logs anomaly review by master admin.</p>
                  <p><strong>Containment:</strong> Master admin can revoke user roles, disable payments globally via platform_settings, or rotate LOVABLE_API_KEY in &lt;60 seconds.</p>
                  <p><strong>Notification:</strong> Affected users contacted via primary email on file within 72 hours of confirmed breach (GDPR Art. 33).</p>
                  <p><strong>Recovery:</strong> Lovable Cloud provides point-in-time DB recovery (7 days standard, longer on enterprise).</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" /> Legal & Policy Documents
              </CardTitle>
              <CardDescription>
                Live policies served from <code>platform_settings</code>. Edit them in the Legal & Policies editor — changes are immediate.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3">
              <a href="/legal/terms" target="_blank" rel="noreferrer" className="border rounded-md p-4 hover:bg-muted/50 transition">
                <div className="font-semibold mb-1">Terms & Conditions</div>
                <div className="text-xs text-muted-foreground">Platform usage rules, acceptable use, AI safety obligations.</div>
              </a>
              <a href="/legal/privacy" target="_blank" rel="noreferrer" className="border rounded-md p-4 hover:bg-muted/50 transition">
                <div className="font-semibold mb-1">Privacy Policy</div>
                <div className="text-xs text-muted-foreground">Data collected, lawful basis, retention, rights, sub-processors.</div>
              </a>
              <a href="/legal/data-protection" target="_blank" rel="noreferrer" className="border rounded-md p-4 hover:bg-muted/50 transition">
                <div className="font-semibold mb-1">Data Protection Policy</div>
                <div className="text-xs text-muted-foreground">Technical & organizational measures (GDPR / FERPA / COPPA).</div>
              </a>
              <div className="md:col-span-3 print:hidden">
                <Button asChild variant="outline" size="sm">
                  <a href="/legal-admin">Open editor →</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30 print:hidden">
            <CardContent className="pt-6 text-xs text-muted-foreground">
              <p className="flex items-start gap-2">
                <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  This page is restricted to the master administrator account. It is intentionally
                  designed to be exportable and shareable with concerned stakeholders, regulators, and
                  parents during pilot reviews. Last reviewed automatically on every code deployment.
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SecurityOverviewPage;
