// Bulk student provisioning for the Mahindra International School Pune pilot.
// Master-admin only. Creates auth users, profiles, roles, school membership,
// student plans, and enrols each student into the requested classes
// (creating the class under the right teacher if it does not exist yet).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_ADMIN = "info.aiconditioner@gmail.com";
const SUBDOMAIN = "mahindra-pune";
const STUDENT_TOKEN_LIMIT = 50_000;

type ClassDef = {
  key: string;
  teacherEmail: string;
  subject: string;
  label: string;
  stage: "MYP" | "DP";
  perSection: boolean;
};

const CLASSES: ClassDef[] = [
  { key: "rohit-is", teacherEmail: "rohit.phalke@misp.org", subject: "Individuals and Societies", label: "Individuals and Societies", stage: "MYP", perSection: true },
  { key: "vinod-science", teacherEmail: "vinod.chacko@misp.org", subject: "Integrated Science", label: "Integrated Science", stage: "MYP", perSection: true },
  { key: "vinod-physics-sl", teacherEmail: "vinod.chacko@misp.org", subject: "Physics SL", label: "Physics SL", stage: "DP", perSection: false },
  { key: "vinod-physics-hl", teacherEmail: "vinod.chacko@misp.org", subject: "Physics HL", label: "Physics HL", stage: "DP", perSection: false },
  { key: "vineet-math", teacherEmail: "vineet.sharma@misp.org", subject: "Mathematics", label: "Mathematics", stage: "MYP", perSection: true },
  { key: "vineet-ai-sl", teacherEmail: "vineet.sharma@misp.org", subject: "Mathematics AI SL", label: "Math AI SL", stage: "DP", perSection: false },
  { key: "vineet-ai-hl", teacherEmail: "vineet.sharma@misp.org", subject: "Mathematics AI HL", label: "Math AI HL", stage: "DP", perSection: false },
];

const GRADES = ["MYP 1", "MYP 2", "MYP 3", "MYP 4", "MYP 5", "DP 1", "DP 2"];
const isDp = (g: string) => g.trim().toUpperCase().startsWith("DP");

function shape(def: ClassDef, grade: string): ClassDef {
  if (def.key === "rohit-is" && isDp(grade)) return { ...def, perSection: false, stage: "DP" };
  return def;
}
function className(def: ClassDef, grade: string, section: string) {
  return def.perSection ? `${def.label} — ${grade}${section.toUpperCase()}` : `${def.label} — ${grade}`;
}

function genPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = pick(upper) + pick(lower) + pick(digits);
  for (let i = 0; i < 9; i++) out += all[bytes[i] % all.length];
  return out;
}

function genJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);
    if ((caller.email ?? "").toLowerCase() !== MASTER_ADMIN)
      return json({ error: "Only the master admin can run bulk student import." }, 403);

    const body = await req.json().catch(() => ({}));
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (!rows.length) return json({ error: "No rows supplied" }, 400);
    if (rows.length > 500) return json({ error: "Please upload at most 500 students at a time." }, 400);

    const admin = createClient(url, serviceKey);

    const { data: school } = await admin
      .from("schools").select("id, name").eq("subdomain", SUBDOMAIN).maybeSingle();
    if (!school) return json({ error: "Pilot school not found. Run pilot setup first." }, 400);

    // Teacher lookup (email -> user_id)
    const teacherEmails = [...new Set(CLASSES.map((c) => c.teacherEmail))];
    const { data: teacherProfiles } = await admin
      .from("profiles").select("user_id, email").in("email", teacherEmails);
    const teacherIds = new Map<string, string>();
    (teacherProfiles ?? []).forEach((p: any) => teacherIds.set((p.email ?? "").toLowerCase(), p.user_id));

    // Cache of class name -> class id
    const classCache = new Map<string, string>();

    async function ensureClass(def: ClassDef, grade: string, section: string): Promise<string> {
      const name = className(def, grade, section);
      const cached = classCache.get(name);
      if (cached) return cached;

      const teacherId = teacherIds.get(def.teacherEmail);
      if (!teacherId) throw new Error(`Teacher account missing for ${def.teacherEmail}`);

      const { data: existing } = await admin
        .from("classes").select("id")
        .eq("school_id", school.id).eq("teacher_id", teacherId).eq("name", name)
        .maybeSingle();
      if (existing) {
        classCache.set(name, existing.id);
        return existing.id;
      }

      const { data: created, error } = await admin.from("classes").insert({
        name,
        subject: def.subject,
        description: `${def.subject} · ${grade}${def.perSection ? ` section ${section.toUpperCase()}` : ""} — Mahindra pilot`,
        join_code: genJoinCode(),
        teacher_id: teacherId,
        school_id: school.id,
        curriculum_type: isDp(grade) ? "IB DP" : "IB MYP",
      }).select("id").single();
      if (error) throw error;
      classCache.set(name, created.id);
      return created.id;
    }

    const results: any[] = [];
    let newStudents = 0;

    for (const raw of rows) {
      const email = String(raw.email ?? "").trim().toLowerCase();
      const fullName = String(raw.full_name ?? "").trim();
      const grade = String(raw.grade_level ?? "").trim();
      const section = String(raw.section ?? "").trim().toUpperCase();
      const keys: string[] = Array.isArray(raw.classes) ? raw.classes : [];

      if (!email || !fullName || !GRADES.includes(grade)) {
        results.push({ email, full_name: fullName, status: "skipped", error: "Invalid row" });
        continue;
      }

      try {
        // Pre-approve so the signup trigger assigns 'student' deterministically.
        const { data: existingReq } = await admin
          .from("registration_requests").select("id").ilike("email", email).limit(1);
        const reqPayload = {
          email, full_name: fullName, requested_role: "student", status: "approved",
          reviewed_by: caller.id, reviewed_at: new Date().toISOString(),
        };
        if (existingReq && existingReq.length)
          await admin.from("registration_requests").update(reqPayload).eq("id", existingReq[0].id);
        else await admin.from("registration_requests").insert(reqPayload);

        const password = genPassword();
        let userId: string | undefined;
        let alreadyExisted = false;

        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, requested_role: "student", grade_level: grade, section, school: school.name },
        });
        if (createErr) {
          if (String(createErr.message).toLowerCase().includes("already")) alreadyExisted = true;
          else throw createErr;
        }
        userId = created?.user?.id;
        if (!userId) {
          const { data: prof } = await admin
            .from("profiles").select("user_id").eq("email", email).maybeSingle();
          userId = prof?.user_id;
        }
        if (!userId) {
          let page = 1;
          while (!userId && page <= 10) {
            const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
            userId = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
            if (!list.users.length) break;
            page++;
          }
        }
        if (!userId) throw new Error("Could not resolve the account id");

        await admin.from("profiles").upsert(
          { user_id: userId, email, full_name: fullName, grade_level: grade },
          { onConflict: "user_id" },
        );

        await admin.from("user_roles").delete().eq("user_id", userId).neq("role", "student");
        await admin.from("user_roles").upsert(
          { user_id: userId, role: "student" },
          { onConflict: "user_id,role" },
        );

        await admin.from("school_members").upsert(
          { school_id: school.id, user_id: userId, school_role: "member" },
          { onConflict: "school_id,user_id" },
        );

        const { data: plan } = await admin
          .from("user_plans").select("id").eq("user_id", userId).eq("status", "active").maybeSingle();
        if (!plan) {
          await admin.from("user_plans").insert({
            user_id: userId,
            plan_id: "student_pilot",
            billing_cycle: "yearly",
            monthly_token_limit: STUDENT_TOKEN_LIMIT,
            tokens_used_this_month: 0,
            status: "active",
            assigned_by: caller.id,
          });
        }

        const enrolled: string[] = [];
        for (const key of keys) {
          const base = CLASSES.find((c) => c.key === key.trim().toLowerCase());
          if (!base) continue;
          const def = shape(base, grade);
          const classId = await ensureClass(def, grade, section);
          const { data: member } = await admin
            .from("class_members").select("id").eq("class_id", classId).eq("student_id", userId).maybeSingle();
          if (!member) await admin.from("class_members").insert({ class_id: classId, student_id: userId });
          enrolled.push(className(def, grade, section));
        }

        if (!alreadyExisted) newStudents++;

        results.push({
          email,
          full_name: fullName,
          grade_level: grade,
          section,
          classes: enrolled,
          password: alreadyExisted ? undefined : password,
          status: alreadyExisted ? "already existed" : "created",
        });
      } catch (e: any) {
        results.push({ email, full_name: fullName, status: "failed", error: String(e?.message ?? e) });
      }
    }

    // Keep seat usage roughly accurate
    if (newStudents > 0) {
      const { data: seats } = await admin
        .from("school_seat_limits").select("students_used").eq("school_id", school.id).maybeSingle();
      if (seats) {
        await admin.from("school_seat_limits")
          .update({ students_used: (seats.students_used || 0) + newStudents })
          .eq("school_id", school.id);
      }
    }

    return json({ success: true, created: newStudents, total: rows.length, results });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
