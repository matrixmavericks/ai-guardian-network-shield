// One-off: create Mahindra school admin account.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SETUP_TOKEN = "mahindra-pilot-2026";
const SUBDOMAIN = "mahindra-pune";

const ADMIN = {
  email: "admin@mahindra-pilot.refyntech.us",
  full_name: "Mahindra Pilot Administrator",
};

function genPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
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

    const { data: school } = await admin
      .from("schools").select("id").eq("subdomain", SUBDOMAIN).maybeSingle();
    if (!school) {
      return new Response(JSON.stringify({ error: "school not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const schoolId = school.id as string;

    // Resolve a reviewer id (master admin) for audit fields.
    const { data: masterRows } = await admin
      .from("profiles").select("user_id").eq("email", "info.aiconditioner@gmail.com").limit(1);
    const reviewerId = masterRows?.[0]?.user_id ?? null;

    const email = ADMIN.email.toLowerCase();
    const password = genPassword();

    // Pre-approve registration so the signup trigger assigns 'admin'.
    const { data: existingReq } = await admin
      .from("registration_requests").select("id").ilike("email", email).limit(1);
    if (existingReq && existingReq.length > 0) {
      await admin.from("registration_requests").update({
        full_name: ADMIN.full_name, requested_role: "admin", status: "approved",
        reviewed_by: reviewerId, reviewed_at: new Date().toISOString(),
      }).eq("id", existingReq[0].id);
    } else {
      await admin.from("registration_requests").insert({
        email, full_name: ADMIN.full_name, requested_role: "admin", status: "approved",
        reviewed_by: reviewerId, reviewed_at: new Date().toISOString(),
      });
    }

    let userId: string | undefined;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: ADMIN.full_name, requested_role: "admin", school: SUBDOMAIN },
    });
    let alreadyExisted = false;
    if (createErr && String(createErr.message).toLowerCase().includes("already")) {
      alreadyExisted = true;
    } else if (createErr) {
      throw createErr;
    }
    userId = created?.user?.id;
    if (!userId) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
    }
    if (!userId) throw new Error("could not resolve user id");

    if (alreadyExisted) {
      await admin.auth.admin.updateUserById(userId, { password });
    }

    await admin.from("profiles").upsert({
      user_id: userId, email, full_name: ADMIN.full_name,
    }, { onConflict: "user_id" });

    // Deterministic role: exactly one row = 'admin'.
    await admin.from("user_roles").delete().eq("user_id", userId).neq("role", "admin");
    await admin.from("user_roles").upsert(
      { user_id: userId, role: "admin" },
      { onConflict: "user_id,role" },
    );

    await admin.from("school_members").upsert({
      school_id: schoolId, user_id: userId, school_role: "admin",
    }, { onConflict: "school_id,user_id" });

    return new Response(JSON.stringify({
      success: true, userId, email, password,
      already_existed: alreadyExisted,
      pilot_console: "/pilot/mahindra",
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
