import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { resolvePlanForSchoolMembership, shouldUpgradePlan, type SchoolMembershipRole } from "../_shared/schoolPlanMapping.ts";

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

    const body = await req.json().catch(() => ({}));
    const schoolId = body.schoolId as string | undefined;
    const userId = body.userId as string | undefined;

    if (!schoolId) throw new Error("schoolId is required");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = roles?.some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) throw new Error("Only admins can sync plans");

    const { data: schoolAdminMembership } = await userClient
      .from("school_members")
      .select("id")
      .eq("school_id", schoolId)
      .eq("user_id", caller.id)
      .eq("school_role", "admin")
      .maybeSingle();

    if (!schoolAdminMembership && caller.email !== "info.aiconditioner@gmail.com") {
      throw new Error("Only school admins can sync member plans for this school");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: schoolPlan } = await adminClient
      .from("school_seat_limits")
      .select("plan_id, billing_cycle")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!schoolPlan) throw new Error("School plan not found");

    let membersQuery = adminClient
      .from("school_members")
      .select("user_id, school_role")
      .eq("school_id", schoolId);

    if (userId) {
      membersQuery = membersQuery.eq("user_id", userId);
    }

    const { data: members, error: membersError } = await membersQuery;
    if (membersError) throw membersError;

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    for (const member of members || []) {
      const schoolRole = member.school_role as SchoolMembershipRole;
      const targetPlan = resolvePlanForSchoolMembership(schoolPlan.plan_id, schoolRole);
      if (!targetPlan) {
        unchanged += 1;
        continue;
      }

      const { data: existingPlans, error: existingPlanError } = await adminClient
        .from("user_plans")
        .select("id, plan_id")
        .eq("user_id", member.user_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingPlanError) throw existingPlanError;

      const activePlan = existingPlans?.[0];

      if (!activePlan) {
        const { error: insertError } = await adminClient.from("user_plans").insert({
          user_id: member.user_id,
          plan_id: targetPlan.planId,
          billing_cycle: schoolPlan.billing_cycle || "monthly",
          monthly_token_limit: targetPlan.monthlyTokenLimit,
          tokens_used_this_month: 0,
          status: "active",
          assigned_by: caller.id,
        });

        if (insertError) throw insertError;
        inserted += 1;
        continue;
      }

      if (shouldUpgradePlan(activePlan.plan_id, targetPlan.planId, schoolRole)) {
        const { error: updateError } = await adminClient
          .from("user_plans")
          .update({
            plan_id: targetPlan.planId,
            billing_cycle: schoolPlan.billing_cycle || "monthly",
            monthly_token_limit: targetPlan.monthlyTokenLimit,
            assigned_by: caller.id,
          })
          .eq("id", activePlan.id);

        if (updateError) throw updateError;
        updated += 1;
      } else {
        unchanged += 1;
      }
    }

    return new Response(JSON.stringify({ success: true, inserted, updated, unchanged }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
