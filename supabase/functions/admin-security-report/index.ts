import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// SENSITIVE: this inventory is intentionally kept OFF the client bundle.
// It is only returned to a caller whose JWT resolves to an admin role in user_roles.
const REPORT = {
  dataStores: [
    {
      name: "AI Prompt & Chat History",
      tables: ["ai_chat_sessions", "ai_chat_messages", "prompt_logs"],
      location: "Lovable Cloud (managed Postgres, EU/US region, encrypted at rest with AES-256)",
      contains:
        "Every student/teacher prompt sent to AI, AI responses, moderation status (approved/blocked/rewritten/flagged), severity level, flagged keywords, subject, grade level, session metadata.",
      access:
        "Owner only (auth.uid() = user_id). Teachers can read chats only for students enrolled in classes they personally teach. School admins can read chats for members of their own school. Master admin has global read access for moderation oversight.",
      retention:
        "Indefinite by default. Master admin can purge per-user records via SQL on request (GDPR right-to-erasure).",
      protection:
        "Row-Level Security enforced on every read/write. Inserts restricted to the row's own user. Updates and deletes blocked on ai_chat_messages and prompt_logs (immutable audit log).",
      code: [
        "supabase/functions/ai-chat/index.ts",
        "supabase/functions/moderate-prompt/index.ts",
        "src/components/StudentInterface.tsx",
        "src/components/RecentPrompts.tsx",
      ],
    },
    {
      name: "AI Token Usage & Cost",
      tables: ["ai_usage_logs", "ai_usage_quotas"],
      location: "Lovable Cloud managed Postgres.",
      contains:
        "Per-call token counts, model name, estimated USD cost, session linkage. Per-student monthly USD quota set by teachers.",
      access:
        "Users see their own. Teachers see students in their classes. Admins see all. Inserts only by service role (edge functions).",
      retention: "Indefinite for billing reconciliation.",
      protection:
        "No updates or deletes allowed. Inserts only via authenticated service-role calls inside edge functions.",
      code: [
        "supabase/functions/_shared/aiUsage.ts",
        "src/components/AIUsageDashboard.tsx",
        "src/pages/AIUsagePage.tsx",
      ],
    },
    {
      name: "User Identity & Profile",
      tables: ["auth.users (managed)", "profiles", "user_roles", "parent_child_links"],
      location: "Lovable Cloud auth schema (managed) + public.profiles.",
      contains:
        "Email, hashed password (bcrypt), full name, avatar URL, grade level, department, role assignments, parent↔child relations.",
      access:
        "Passwords NEVER readable from app code — only the auth service verifies them. Profiles readable by authenticated users (display purposes). Role assignment is admin-only; users may only self-assign student/parent — admin/teacher self-assignment is blocked at the policy level.",
      retention: "Until account deletion request.",
      protection:
        "Passwords hashed with bcrypt. JWT sessions (RS256) with short access tokens + refresh rotation. Role escalation prevented by RLS. Optional Leaked-Password (HIBP) check available.",
      code: [
        "src/contexts/AuthContext.tsx",
        "src/hooks/useUserRole.tsx",
        "src/pages/Login.tsx",
        "src/pages/Signup.tsx",
      ],
    },
    {
      name: "Payment & Registration Data",
      tables: ["registration_requests", "payment_transactions"],
      location:
        "Lovable Cloud managed Postgres. Stripe holds card data (PCI-DSS Level 1) — we never see card numbers.",
      contains:
        "Email, name, requested role, payment plan, INR amount, Stripe session/customer/subscription IDs, discount codes, seat config. NO card numbers or CVVs ever stored.",
      access:
        "Owner (matched on auth email) and admins. Anonymous status checks go through a security-definer RPC that returns ONLY status fields — never IDs or PII.",
      retention: "Indefinite (financial record).",
      protection:
        "Stripe webhooks verified with HMAC signature. Sensitive lookup restricted to RPC with explicit column allow-list.",
      code: [
        "supabase/functions/create-checkout/index.ts",
        "supabase/functions/payments-webhook/index.ts",
        "src/pages/RegistrationRequestsPage.tsx",
        "src/pages/PayPage.tsx",
      ],
    },
    {
      name: "Classroom Content",
      tables: [
        "classes",
        "class_members",
        "class_courses",
        "class_resources",
        "class_resource_folders",
        "class_assignments",
        "assignment_submissions",
        "assignment_groups",
      ],
      location: "Lovable Cloud managed Postgres + Storage buckets (submission-files, class-resources).",
      contains:
        "Class roster, join codes, subject, uploaded files, assignments, student submissions, grades, feedback.",
      access:
        "Class members + class teacher only. Teachers can grade. Students can update only ungraded submissions.",
      retention: "Until class is deleted by owning teacher.",
      protection:
        "RLS via security-definer helpers is_class_member and is_class_teacher (avoid recursive policy issues).",
      code: [
        "src/pages/ClassesPage.tsx",
        "src/pages/ClassDetailPage.tsx",
        "src/components/ClassResourceManager.tsx",
        "src/pages/AssignmentsPage.tsx",
      ],
    },
    {
      name: "Learning Paths & Capstones",
      tables: [
        "learning_paths",
        "learning_path_progress",
        "learning_path_activities",
        "capstone_submissions",
      ],
      location: "Lovable Cloud managed Postgres + capstone-files storage bucket.",
      contains:
        "AI-generated curriculum modules, per-user progress %, completed module IDs, capstone files, AI-evaluated scores, teacher grades.",
      access:
        "Owner + assigned teacher. Public learning paths readable by all authenticated users.",
      retention: "Indefinite — student-owned portfolio artifact.",
      protection: "RLS on user_id. Teacher access scoped to their class roster.",
      code: [
        "supabase/functions/generate-learning-path/index.ts",
        "supabase/functions/evaluate-capstone/index.ts",
        "src/services/learningPathService.ts",
        "src/pages/LearningPathDetail.tsx",
      ],
    },
    {
      name: "Portfolios (Student Work)",
      tables: [
        "portfolio_projects",
        "portfolio_collaborators",
        "portfolio_comments",
        "portfolio_updates",
      ],
      location:
        "Lovable Cloud managed Postgres + portfolio-media storage (public bucket for shareable projects).",
      contains:
        "Student-published work, media, external links, share tokens, collaborator invites.",
      access:
        "Owner + invited collaborators always. Publicly published projects readable via opaque share token only.",
      retention: "Indefinite (student property).",
      protection:
        "Share tokens are 32-byte URL-safe random. Unpublished projects fully private.",
      code: [
        "src/pages/PortfolioPage.tsx",
        "src/pages/PortfolioProjectPage.tsx",
        "src/pages/SharedPortfolioPage.tsx",
        "src/lib/publicUrl.ts",
      ],
    },
    {
      name: "School & Multi-Tenant Data",
      tables: [
        "schools",
        "school_members",
        "school_ai_settings",
        "school_seat_limits",
        "school_announcements",
        "school_events",
      ],
      location: "Lovable Cloud managed Postgres.",
      contains:
        "School metadata, member roster with role (admin/owner/teacher/student), per-school AI policies, seat usage.",
      access:
        "Members of the school only. Cross-school data is fully isolated by RLS using is_school_member helper.",
      retention: "Until school is deleted by owner or master admin.",
      protection:
        "Tenant isolation enforced at every policy. School admin cannot access another school's data even with valid JWT.",
      code: [
        "src/contexts/SchoolContext.tsx",
        "src/pages/SchoolPortalPage.tsx",
        "src/pages/SchoolManagementPage.tsx",
        "supabase/functions/create-school-user/index.ts",
      ],
    },
    {
      name: "Live Quiz Sessions",
      tables: [
        "live_quiz_sessions",
        "live_quiz_questions",
        "live_quiz_players",
        "live_quiz_answers",
      ],
      location: "Lovable Cloud managed Postgres + Realtime channels.",
      contains: "Quiz content, join codes, per-player score/streak, individual answers.",
      access: "Teacher (owner) + class members during the session.",
      retention: "Indefinite for analytics.",
      protection: "Players insert only their own answers. Teacher controls session state.",
      code: [
        "src/components/livequiz/LiveQuizPlayer.tsx",
        "src/components/livequiz/CreateLiveQuiz.tsx",
        "supabase/functions/generate-live-quiz/index.ts",
      ],
    },
    {
      name: "Security & Audit",
      tables: ["bypass_attempts", "ethical_badges", "prompt_logs"],
      location: "Lovable Cloud managed Postgres.",
      contains:
        "Detected jailbreak / bypass attempts with IP address, severity, attempt type, full payload. Earned ethical-use badges.",
      access:
        "Admin read-only. Inserts restricted to service_role (edge functions) or authenticated owner.",
      retention: "Indefinite (forensic record).",
      protection:
        "Append-only — no updates or deletes permitted at the policy level.",
      code: [
        "src/pages/AdminMonitoring.tsx",
        "supabase/functions/moderate-prompt/index.ts",
      ],
    },
    {
      name: "AI Configuration & Training",
      tables: [
        "ai_configurations",
        "school_ai_settings",
        "model_training_data",
        "curriculum_links",
      ],
      location: "Lovable Cloud managed Postgres.",
      contains:
        "Blocked keyword lists, process-mode toggle, allowed models, custom system prompts, fine-tune training pairs.",
      access:
        "Admins (global) and school admins (their school only). Teachers may view global config; students never.",
      retention: "Indefinite — governance baseline.",
      protection:
        "Admin role required for writes. Training data pairs require admin approval flag before use.",
      code: [
        "src/pages/AIConfigurationPage.tsx",
        "src/pages/ModelTrainingPage.tsx",
        "src/components/AITrainingWizard.tsx",
      ],
    },
    {
      name: "Platform Settings (Feature Toggles)",
      tables: ["platform_settings"],
      location: "Lovable Cloud managed Postgres.",
      contains:
        "Master switches like payments_enabled, registration mode, legal documents (terms/privacy/data-protection JSON).",
      access:
        "Master admin write. All authenticated users may read (needed for client-side gating).",
      retention: "Indefinite.",
      protection: "Write restricted to has_role(admin).",
      code: [
        "src/hooks/usePlatformSettings.tsx",
        "src/lib/legalDocs.ts",
        "src/pages/LegalAdminPage.tsx",
      ],
    },
  ],
  secrets: [
    {
      name: "STRIPE_SANDBOX_API_KEY",
      purpose: "Server-side Stripe API calls",
      location: "Lovable Cloud Secrets (encrypted vault)",
      exposure: "Never sent to browser. Used only inside edge functions.",
    },
    {
      name: "PAYMENTS_SANDBOX_WEBHOOK_SECRET",
      purpose: "Verify Stripe webhook HMAC signatures",
      location: "Lovable Cloud Secrets",
      exposure: "Server-only.",
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      purpose: "Privileged DB access for edge functions",
      location: "Lovable Cloud Secrets",
      exposure:
        "NEVER in client. Bypasses RLS — must only be used in trusted server code.",
    },
    {
      name: "SUPABASE_DB_URL",
      purpose: "Direct Postgres connection for migrations",
      location: "Lovable Cloud Secrets",
      exposure: "Server-only.",
    },
    {
      name: "LOVABLE_API_KEY",
      purpose: "Lovable AI Gateway access",
      location: "Lovable Cloud managed secret",
      exposure: "Server-only. Rotatable via dedicated rotate tool.",
    },
    {
      name: "Public client keys (URL / anon / publishable)",
      purpose: "Public client-side backend config",
      location: ".env (auto-generated)",
      exposure:
        "Safe to ship — RLS enforces all access; anon key alone grants nothing.",
    },
  ],
  edgeFunctions: [
    { name: "ai-chat", auth: "Open (moderation gate handles session)", risk: "Low — moderation gate" },
    { name: "moderate-prompt", auth: "JWT REQUIRED (verified via getClaims)", risk: "Hardened" },
    { name: "evaluate-capstone", auth: "JWT REQUIRED + ownership check", risk: "Hardened" },
    { name: "generate-training-response", auth: "JWT REQUIRED + admin/teacher role check", risk: "Hardened" },
    { name: "generate-learning-path", auth: "Open (read-only generation)", risk: "Rate-limited via AI quota" },
    { name: "generate-module-content", auth: "Open", risk: "Rate-limited" },
    { name: "generate-teaching-plan", auth: "Open", risk: "Rate-limited" },
    { name: "analyze-syllabus", auth: "Open", risk: "Rate-limited" },
    { name: "generate-course-study-content", auth: "Open", risk: "Rate-limited" },
    { name: "generate-live-quiz", auth: "Open", risk: "Rate-limited" },
    { name: "analyze-class-risks", auth: "Open", risk: "Aggregate data only" },
    { name: "analyze-learning-profile", auth: "Open", risk: "Aggregate data only" },
    { name: "generate-path-insights", auth: "Open", risk: "Aggregate data only" },
    { name: "docs-assistant", auth: "Open", risk: "Public docs" },
    { name: "create-checkout", auth: "Server-validated", risk: "Stripe-signed" },
    { name: "create-portal-session", auth: "Server-validated", risk: "Stripe-signed" },
    { name: "payments-webhook", auth: "HMAC verified (Stripe signature)", risk: "Hardened" },
    { name: "get-stripe-price", auth: "Open (read-only price lookup)", risk: "Public catalog" },
    { name: "create-school-user", auth: "Admin-role required", risk: "Hardened" },
    { name: "admin-comp-account", auth: "Master admin only", risk: "Hardened" },
    { name: "admin-security-report", auth: "Admin-role required", risk: "Hardened" },
    { name: "admin-source-export", auth: "Admin-role required", risk: "Hardened" },
  ],
  storageBuckets: [
    { name: "student-documents", public: false, contains: "Private student uploads", access: "Owner-scoped path: /{user_id}/..." },
    { name: "submission-files", public: false, contains: "Assignment submissions", access: "Signed URLs only" },
    { name: "class-resources", public: true, contains: "Teacher-uploaded class materials", access: "Intended public-readable for class members" },
    { name: "capstone-files", public: false, contains: "Capstone deliverables", access: "Signed URLs only" },
    { name: "portfolio-media", public: true, contains: "Student portfolio media", access: "Designed for public sharing" },
  ],
  knownOpenItems: [
    "classes table currently allows any authenticated user to read class metadata (including join codes). Tightening planned — does not expose student data.",
    "Realtime channel authorization uses default rules — relies on table-level RLS for payload safety. Channel subscription scoping under review.",
    "Several public storage buckets allow listing — files use unguessable IDs, but enumeration is theoretically possible.",
    "Leaked-password (HIBP) check available; verify it remains enabled after any auth-settings change.",
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: server-side admin check via user_roles. Never trust client-supplied email/role.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin, error: roleError } = await adminClient.rpc("has_role", {
      _user_id: claimsData.claims.sub,
      _role: "admin",
    });

    if (roleError || isAdmin !== true) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ report: REPORT, generatedAt: new Date().toISOString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-security-report error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
