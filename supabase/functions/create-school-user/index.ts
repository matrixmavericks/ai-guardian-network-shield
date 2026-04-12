import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    // Check if caller has admin role
    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Only admins can create accounts");

    const { email, password, fullName, role, schoolId, planId, billingCycle } = await req.json();
    if (!email || !password || !fullName || !role) throw new Error("Missing required fields");

    // Use service role to create auth user
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, requested_role: role },
    });

    if (createError) throw createError;
    if (!newUser.user) throw new Error("Failed to create user");

    const userId = newUser.user.id;

    // Create profile
    await adminClient.from("profiles").insert({
      user_id: userId,
      full_name: fullName,
      email: email.toLowerCase(),
    });

    // Assign role
    await adminClient.from("user_roles").insert({
      user_id: userId,
      role: role,
    });

    // If school provided, add as school member
    if (schoolId) {
      const schoolRole = role === "teacher" ? "teacher" : "member";
      await adminClient.from("school_members").insert({
        school_id: schoolId,
        user_id: userId,
        school_role: schoolRole,
      });

      // Update seat usage
      const { data: seats } = await adminClient
        .from("school_seat_limits")
        .select("*")
        .eq("school_id", schoolId)
        .maybeSingle();

      if (seats) {
        const isTeacher = role === "teacher";
        await adminClient.from("school_seat_limits").update(
          isTeacher
            ? { teachers_used: (seats.teachers_used || 0) + 1 }
            : { students_used: (seats.students_used || 0) + 1 }
        ).eq("school_id", schoolId);
      }
    }

    // Create user plan - auto-fetch from school's seat limits if not provided
    let effectivePlanId = planId;
    let effectiveBillingCycle = billingCycle || "monthly";

    if (!effectivePlanId && schoolId) {
      const { data: seatData } = await adminClient
        .from("school_seat_limits")
        .select("plan_id, billing_cycle")
        .eq("school_id", schoolId)
        .maybeSingle();

      if (seatData) {
        effectivePlanId = seatData.plan_id;
        effectiveBillingCycle = seatData.billing_cycle || "monthly";
      }
    }

    if (effectivePlanId) {
      await adminClient.from("user_plans").insert({
        user_id: userId,
        plan_id: effectivePlanId,
        billing_cycle: effectiveBillingCycle,
        monthly_token_limit: 99999,
        tokens_used_this_month: 0,
        status: "active",
      });
    }

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
