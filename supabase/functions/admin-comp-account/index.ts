import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TOKEN_LIMITS: Record<string, number> = {
  starter: 500,
  standard: 2000,
  premium: 5000,
  teacher_individual: 99999,
  teacher_pro: 99999,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");
    if (caller.email !== "info.aiconditioner@gmail.com") {
      throw new Error("Only the master admin can create comp accounts.");
    }

    const {
      email,
      password,
      fullName,
      role,
      planId,
      billingCycle = "monthly",
      monthlyTokenLimit,
      notes,
    } = await req.json();

    if (!email || !password || !fullName || !role || !planId) {
      throw new Error("Missing required fields (email, password, fullName, role, planId)");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, requested_role: role, comp_notes: notes ?? null },
    });

    if (createError) throw createError;
    if (!newUser.user) throw new Error("Failed to create user");

    const userId = newUser.user.id;

    await adminClient.from("profiles").insert({
      user_id: userId,
      full_name: fullName,
      email: email.toLowerCase(),
    });

    await adminClient.from("user_roles").insert({
      user_id: userId,
      role,
    });

    const tokenLimit = monthlyTokenLimit ?? DEFAULT_TOKEN_LIMITS[planId] ?? 1000;

    await adminClient.from("user_plans").insert({
      user_id: userId,
      plan_id: planId,
      billing_cycle: billingCycle,
      monthly_token_limit: tokenLimit,
      tokens_used_this_month: 0,
      status: "active",
      assigned_by: caller.id,
    });

    // Mark a registration_request as 'comped' for audit trail
    await adminClient.from("registration_requests").insert({
      email: email.toLowerCase(),
      full_name: fullName,
      requested_role: role,
      status: "approved",
      payment_plan: `${planId}_${billingCycle}`,
      payment_status: "comped",
      reviewed_by: caller.id,
      reviewed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
