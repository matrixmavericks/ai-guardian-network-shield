// One-off pilot provisioning for Mahindra International School Pune.
// Creates school, AI settings, seat limits, 6 teacher auth users, profiles,
// roles, school memberships, and loaded user_plans.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SETUP_TOKEN = "mahindra-pilot-2026"; // one-shot guard

const SCHOOL = {
  name: "Mahindra International School Pune",
  subdomain: "mahindra-pune",
  description: "Pilot deployment – Mahindra International School, Pune (IB MYP + IB DP + Primary)",
  contact_email: "pilot@mahindrainternationalschool.org",
  address: "Survey No. 1, Donje Phata, Pune, Maharashtra, India",
  theme_config: { primaryColor: "#0a3d62", accentColor: "#e58e26" },
};

const TEACHERS = [
  { email: "vinod.chacko@misp.org",  full_name: "Vinod Chacko",  subject: "Physics — IB MYP + IB DP" },
  { email: "vineet.sharma@misp.org", full_name: "Vineet Sharma", subject: "Mathematics — IB MYP + IB DP" },
  { email: "rohit.phalke@misp.org",  full_name: "Rohit Phalke",  subject: "Integrated Humanities (I&S) — IB MYP + IB DP" },
  { email: "primary5.homeroom@mahindra-pilot.refyntech.us", full_name: "Primary 5 Homeroom Teacher", subject: "Primary 5 Homeroom" },
  { email: "primary2.homeroom@mahindra-pilot.refyntech.us", full_name: "Primary 2 Homeroom Teacher", subject: "Primary 2 Homeroom" },
  { email: "primary.homeroom3@mahindra-pilot.refyntech.us", full_name: "Primary Homeroom Teacher 3", subject: "Primary Homeroom" },
];

const TEACHER_TOKEN_LIMIT = 250_000; // super-loaded

function genPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + digits + symbols;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = 0; i < 14; i++) out += all[bytes[i] % all.length];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token } = await req.json().catch(() => ({}));
    if (token !== SETUP_TOKEN) {
      return new Response(JSON.stringify({ error: "invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Need a created_by user — use master admin if exists.
    const { data: masterRows } = await admin
      .from("profiles").select("user_id").eq("email", "info.aiconditioner@gmail.com").limit(1);
    const createdBy = masterRows?.[0]?.user_id;
    if (!createdBy) {
      return new Response(JSON.stringify({ error: "master admin profile missing" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Upsert school
    let schoolId: string;
    const { data: existing } = await admin
      .from("schools").select("id").eq("subdomain", SCHOOL.subdomain).maybeSingle();
    if (existing) {
      schoolId = existing.id;
      await admin.from("schools").update({
        name: SCHOOL.name, description: SCHOOL.description,
        contact_email: SCHOOL.contact_email, address: SCHOOL.address,
        theme_config: SCHOOL.theme_config,
      }).eq("id", schoolId);
    } else {
      const { data: inserted, error } = await admin.from("schools").insert({
        ...SCHOOL, created_by: createdBy,
      }).select("id").single();
      if (error) throw error;
      schoolId = inserted.id;
    }

    // 2) Seat limits (loaded for pilot)
    await admin.from("school_seat_limits").upsert({
      school_id: schoolId,
      plan_id: "school_pilot",
      billing_cycle: "yearly",
      teacher_seats: 25,
      student_seats: 1000,
      teachers_used: TEACHERS.length,
      students_used: 0,
    }, { onConflict: "school_id" });

    // 3) AI settings: enable everything
    await admin.from("school_ai_settings").upsert({
      school_id: schoolId,
      allowed_ai_models: ["google/gemini-2.5-flash", "google/gemini-3-flash"],
      max_daily_prompts_per_student: 200,
      max_monthly_cost_usd: 500,
      blocked_keywords: [],
      process_mode_enabled: true,
      allow_student_chat: true,
      allow_capstone_ai_grading: true,
      allow_learning_path_generation: true,
      custom_system_prompt: "You are Refyn, the AI tutor for Mahindra International School Pune. Follow Process Teaching Mode and respect IB MYP/DP and Primary curriculum standards.",
    }, { onConflict: "school_id" });

    const results: any[] = [];

    for (const t of TEACHERS) {
      const email = t.email.toLowerCase();
      const password = genPassword();

      // Pre-approve registration so the signup trigger assigns 'teacher' (not default 'student').
      // Try upsert-by-email; if a request already exists, update it to approved+teacher.
      const { data: existingReq } = await admin
        .from("registration_requests").select("id").ilike("email", email).limit(1);
      if (existingReq && existingReq.length > 0) {
        await admin.from("registration_requests").update({
          full_name: t.full_name, requested_role: "teacher", status: "approved",
          reviewed_by: createdBy, reviewed_at: new Date().toISOString(),
        }).eq("id", existingReq[0].id);
      } else {
        await admin.from("registration_requests").insert({
          email, full_name: t.full_name, requested_role: "teacher", status: "approved",
          reviewed_by: createdBy, reviewed_at: new Date().toISOString(),
        });
      }

      // Create or fetch auth user
      let userId: string | undefined;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: t.full_name, requested_role: "teacher", school: SCHOOL.name, subject: t.subject },
      });
      let alreadyExisted = false;
      if (createErr && String(createErr.message).toLowerCase().includes("already")) {
        alreadyExisted = true;
      } else if (createErr) {
        results.push({ teacher: email, error: createErr.message });
        continue;
      }
      userId = created?.user?.id;
      if (!userId) {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        userId = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
      }
      if (!userId) {
        results.push({ teacher: email, error: "could not resolve user id" });
        continue;
      }

      // If user already existed, reset the password so we can hand back a fresh one.
      if (alreadyExisted) {
        await admin.auth.admin.updateUserById(userId, { password });
      }

      await admin.from("profiles").upsert({
        user_id: userId, email, full_name: t.full_name,
      }, { onConflict: "user_id" });

      // Deterministic role: exactly one row = 'teacher'.
      await admin.from("user_roles").delete().eq("user_id", userId).neq("role", "teacher");
      await admin.from("user_roles").upsert(
        { user_id: userId, role: "teacher" },
        { onConflict: "user_id,role" },
      );

      await admin.from("school_members").upsert({
        school_id: schoolId, user_id: userId, school_role: "teacher",
      }, { onConflict: "school_id,user_id" });

      // Deactivate any existing active plan, then insert loaded plan
      await admin.from("user_plans").update({ status: "inactive" })
        .eq("user_id", userId).eq("status", "active");

      await admin.from("user_plans").insert({
        user_id: userId,
        plan_id: "teacher_pilot",
        billing_cycle: "yearly",
        monthly_token_limit: TEACHER_TOKEN_LIMIT,
        tokens_used_this_month: 0,
        status: "active",
        assigned_by: createdBy,
      });

      results.push({ email, password, userId, ok: true, already_existed: alreadyExisted });
    }

    return new Response(JSON.stringify({
      success: true,
      school: { id: schoolId, name: SCHOOL.name, subdomain: SCHOOL.subdomain,
                portal: `https://refyntech.us/s/${SCHOOL.subdomain}` },
      teachers: results,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
