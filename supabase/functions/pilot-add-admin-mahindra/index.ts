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
  password: "MahindraAdmin2026!",
  full_name: "Mahindra Pilot Administrator",
};

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

    let userId: string | undefined;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: ADMIN.email, password: ADMIN.password, email_confirm: true,
      user_metadata: { full_name: ADMIN.full_name, requested_role: "admin", school: SUBDOMAIN },
    });
    if (createErr && !String(createErr.message).toLowerCase().includes("already")) {
      throw createErr;
    }
    userId = created?.user?.id;
    if (!userId) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list.users.find((u) => u.email?.toLowerCase() === ADMIN.email.toLowerCase())?.id;
    }
    if (!userId) throw new Error("could not resolve user id");

    await admin.from("profiles").upsert({
      user_id: userId, email: ADMIN.email, full_name: ADMIN.full_name,
    }, { onConflict: "user_id" });

    await admin.from("user_roles").upsert({
      user_id: userId, role: "admin",
    }, { onConflict: "user_id,role" });

    await admin.from("school_members").upsert({
      school_id: schoolId, user_id: userId, school_role: "admin",
    }, { onConflict: "school_id,user_id" });

    return new Response(JSON.stringify({
      success: true, userId, email: ADMIN.email, password: ADMIN.password,
      pilot_console: "/pilot/mahindra",
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
