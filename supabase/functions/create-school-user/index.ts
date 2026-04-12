import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map school plan tiers to individual plan IDs
const SCHOOL_TO_INDIVIDUAL_PLAN: Record<string, { student: string; teacher: string }> = {
  school_starter: { student: "starter", teacher: "teacher_individual" },
  school_growth: { student: "standard", teacher: "teacher_pro" },
  school_enterprise: { student: "premium", teacher: "teacher_pro" },
};

const TOKEN_LIMITS: Record<string, number> = {
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

    // Verify the caller is an admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Only admins can create accounts");

    const { email, password, fullName, role, schoolId } = await req.json();
    if (!email || !password || !fullName || !role) throw new Error("Missing required fields");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // If school provided, check seat limits before creating
    let schoolSeats: any = null;
    if (schoolId) {
      const { data: seats } = await adminClient
        .from("school_seat_limits")
        .select("*")
        .eq("school_id", schoolId)
        .maybeSingle();

      schoolSeats = seats;

      if (seats) {
        const isTeacher = role === "teacher";
        if (isTeacher && seats.teachers_used >= seats.teacher_seats) {
          throw new Error(`Teacher seat limit reached (${seats.teacher_seats}). Upgrade your plan for more seats.`);
        }
        if (!isTeacher && seats.students_used >= seats.student_seats) {
          throw new Error(`Student seat limit reached (${seats.student_seats}). Upgrade your plan for more seats.`);
        }
      }
    }

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

    // If school provided, add as school member and inherit plan
    if (schoolId) {
      const schoolRole = role === "teacher" ? "teacher" : "member";
      await adminClient.from("school_members").insert({
        school_id: schoolId,
        user_id: userId,
        school_role: schoolRole,
      });

      // Update seat usage
      if (schoolSeats) {
        const isTeacher = role === "teacher";
        await adminClient.from("school_seat_limits").update(
          isTeacher
            ? { teachers_used: (schoolSeats.teachers_used || 0) + 1 }
            : { students_used: (schoolSeats.students_used || 0) + 1 }
        ).eq("school_id", schoolId);

        // Inherit plan from school
        const schoolPlanId = schoolSeats.plan_id || "school_starter";
        const billingCycle = schoolSeats.billing_cycle || "monthly";
        const mapping = SCHOOL_TO_INDIVIDUAL_PLAN[schoolPlanId] || SCHOOL_TO_INDIVIDUAL_PLAN["school_starter"];
        const individualPlanId = isTeacher ? mapping.teacher : mapping.student;
        const tokenLimit = TOKEN_LIMITS[individualPlanId] || 500;

        await adminClient.from("user_plans").insert({
          user_id: userId,
          plan_id: individualPlanId,
          billing_cycle: billingCycle,
          monthly_token_limit: tokenLimit,
          tokens_used_this_month: 0,
          status: "active",
          assigned_by: caller.id,
        });
      }
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
