// Pilot test-account provisioning for Mahindra International School Pune.
// Creates a Test Student + Test Parent, links them, enrolls student in a demo class.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SETUP_TOKEN = "mahindra-pilot-2026";
const SCHOOL_SUBDOMAIN = "mahindra-pune";

const STUDENT = { email: "test.student@mahindra-pilot.refyntech.us", full_name: "Test Student" };
const PARENT = { email: "test.parent@mahindra-pilot.refyntech.us", full_name: "Test Parent" };
const PHYSICS_TEACHER_EMAIL = "vinod.chacko@misp.org";

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

function genJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function provisionUser(
  admin: ReturnType<typeof createClient>,
  createdBy: string,
  email: string,
  fullName: string,
  role: "student" | "parent",
): Promise<{ userId: string; password: string; alreadyExisted: boolean }> {
  const password = genPassword();
  const lower = email.toLowerCase();

  // Pre-approve so the assign_role_on_signup trigger picks the right role.
  const { data: existingReq } = await admin
    .from("registration_requests").select("id").ilike("email", lower).limit(1);
  if (existingReq && existingReq.length > 0) {
    await admin.from("registration_requests").update({
      full_name: fullName, requested_role: role, status: "approved",
      reviewed_by: createdBy, reviewed_at: new Date().toISOString(),
    }).eq("id", existingReq[0].id);
  } else {
    await admin.from("registration_requests").insert({
      email: lower, full_name: fullName, requested_role: role, status: "approved",
      reviewed_by: createdBy, reviewed_at: new Date().toISOString(),
    });
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: lower, password, email_confirm: true,
    user_metadata: { full_name: fullName, requested_role: role },
  });

  let alreadyExisted = false;
  let userId = created?.user?.id;
  if (createErr && String(createErr.message).toLowerCase().includes("already")) {
    alreadyExisted = true;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    userId = list.users.find((u) => u.email?.toLowerCase() === lower)?.id;
    if (userId) await admin.auth.admin.updateUserById(userId, { password });
  } else if (createErr) {
    throw createErr;
  }
  if (!userId) throw new Error(`Could not resolve user id for ${email}`);

  await admin.from("profiles").upsert({
    user_id: userId, email: lower, full_name: fullName,
  }, { onConflict: "user_id" });

  // Deterministic single-role enforcement.
  await admin.from("user_roles").delete().eq("user_id", userId).neq("role", role);
  await admin.from("user_roles").upsert(
    { user_id: userId, role },
    { onConflict: "user_id,role" },
  );

  return { userId, password, alreadyExisted };
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

    // Resolve master admin as createdBy
    const { data: masterRows } = await admin
      .from("profiles").select("user_id").eq("email", "info.aiconditioner@gmail.com").limit(1);
    const createdBy = masterRows?.[0]?.user_id;
    if (!createdBy) throw new Error("master admin profile missing");

    // Resolve school
    const { data: school } = await admin
      .from("schools").select("id").eq("subdomain", SCHOOL_SUBDOMAIN).maybeSingle();
    if (!school) throw new Error(`school ${SCHOOL_SUBDOMAIN} not found`);
    const schoolId = school.id;

    // 1) STUDENT
    const student = await provisionUser(admin, createdBy, STUDENT.email, STUDENT.full_name, "student");

    await admin.from("school_members").upsert({
      school_id: schoolId, user_id: student.userId, school_role: "student",
    }, { onConflict: "school_id,user_id" });

    // Active plan
    await admin.from("user_plans").update({ status: "inactive" })
      .eq("user_id", student.userId).eq("status", "active");
    await admin.from("user_plans").insert({
      user_id: student.userId,
      plan_id: "standard",
      billing_cycle: "monthly",
      monthly_token_limit: 2000,
      tokens_used_this_month: 0,
      status: "active",
      assigned_by: createdBy,
    });

    // Class enrollment
    let { data: classes } = await admin
      .from("classes").select("id, name").eq("school_id", schoolId).limit(1);
    let classId = classes?.[0]?.id;
    let className = classes?.[0]?.name;
    if (!classId) {
      const { data: vinodProfile } = await admin
        .from("profiles").select("user_id").eq("email", PHYSICS_TEACHER_EMAIL).maybeSingle();
      const teacherId = vinodProfile?.user_id;
      if (!teacherId) throw new Error(`teacher ${PHYSICS_TEACHER_EMAIL} not found`);
      const { data: newClass, error: classErr } = await admin.from("classes").insert({
        name: "Demo Class — Physics",
        subject: "Physics",
        description: "Demo class for pilot testing",
        join_code: genJoinCode(),
        teacher_id: teacherId,
        school_id: schoolId,
        curriculum_type: "ib_dp",
      }).select("id, name").single();
      if (classErr) throw classErr;
      classId = newClass.id;
      className = newClass.name;
    }

    await admin.from("class_members").upsert({
      class_id: classId, student_id: student.userId,
    }, { onConflict: "class_id,student_id" });

    // 2) PARENT
    const parent = await provisionUser(admin, createdBy, PARENT.email, PARENT.full_name, "parent");

    // Link parent -> child (columns: parent_id, child_id)
    const { data: existingLink } = await admin
      .from("parent_child_links").select("id")
      .eq("parent_id", parent.userId).eq("child_id", student.userId).maybeSingle();
    if (!existingLink) {
      await admin.from("parent_child_links").insert({
        parent_id: parent.userId, child_id: student.userId,
      });
    }

    // ---- Verification ----
    const verify = async (userId: string) => {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
      return roles?.map((r: any) => r.role) ?? [];
    };
    const studentRoles = await verify(student.userId);
    const parentRoles = await verify(parent.userId);

    const { data: studentSchool } = await admin.from("school_members")
      .select("id").eq("user_id", student.userId).eq("school_id", schoolId).maybeSingle();
    const { data: studentClass } = await admin.from("class_members")
      .select("id").eq("student_id", student.userId).eq("class_id", classId).maybeSingle();
    const { data: studentPlan } = await admin.from("user_plans")
      .select("plan_id, status").eq("user_id", student.userId).eq("status", "active").maybeSingle();
    const { data: linkRow } = await admin.from("parent_child_links")
      .select("id").eq("parent_id", parent.userId).eq("child_id", student.userId).maybeSingle();

    return new Response(JSON.stringify({
      success: true,
      accounts: {
        student: { email: STUDENT.email, password: student.password, userId: student.userId, already_existed: student.alreadyExisted },
        parent:  { email: PARENT.email,  password: parent.password,  userId: parent.userId,  already_existed: parent.alreadyExisted },
      },
      class: { id: classId, name: className },
      verification: {
        student: {
          roles: studentRoles,
          single_student_role: studentRoles.length === 1 && studentRoles[0] === "student",
          is_school_member: !!studentSchool,
          is_class_member: !!studentClass,
          active_plan: studentPlan ?? null,
        },
        parent: {
          roles: parentRoles,
          single_parent_role: parentRoles.length === 1 && parentRoles[0] === "parent",
          parent_child_link: !!linkRow,
        },
      },
      routes: {
        student_allowed: ["/student-dashboard", "/ai-learning-assistant"],
        parent_allowed:  ["/parent-dashboard"],
      },
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
