// Bulk student provisioning for the Mahindra International School Pune pilot.
// Master-admin only. Creates auth users (generated unique usernames + passwords),
// profiles, roles, school membership and student plans.
// Classes are NOT assigned here — students are mapped to courses by grade later.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_ADMIN = "info.aiconditioner@gmail.com";
const SUBDOMAIN = "mahindra-pune";
const STUDENT_TOKEN_LIMIT = 50_000;
const STUDENT_DOMAIN = "mahindra-pilot.refyntech.us";

const GRADES = ["MYP 1", "MYP 2", "MYP 3", "MYP 4", "MYP 5", "DP 1", "DP 2"];

const letters = (s: string, n: number) =>
  s.toLowerCase().replace(/[^a-z]/g, "").slice(0, n);
const gradeToken = (g: string) => g.toLowerCase().replace(/[^a-z0-9]/g, "");
const buildUsername = (first: string, last: string, grade: string) =>
  `${letters(first, 2)}.${letters(last, 2)}.${gradeToken(grade)}`;

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

    // Usernames already taken in this batch (server-side safety net).
    const batchUsed = new Set<string>();

    /** Find a username not used in this batch and not already in profiles. */
    async function resolveUsername(base: string): Promise<string> {
      let candidate = base;
      let n = 1;
      // limit attempts to avoid runaway loops
      while (n < 100) {
        const email = `${candidate}@${STUDENT_DOMAIN}`;
        if (!batchUsed.has(candidate)) {
          const { data: taken } = await admin
            .from("profiles").select("user_id").eq("email", email).maybeSingle();
          if (!taken) {
            batchUsed.add(candidate);
            return candidate;
          }
        }
        n++;
        candidate = `${base}${n}`;
      }
      throw new Error(`Could not generate a unique login for ${base}`);
    }

    const results: any[] = [];
    let newStudents = 0;

    for (const raw of rows) {
      const firstName = String(raw.first_name ?? "").trim();
      const lastName = String(raw.last_name ?? "").trim();
      const grade = String(raw.grade_level ?? raw.grade ?? "").trim();
      const fullName = `${firstName} ${lastName}`.trim();

      if (letters(firstName, 2).length < 2 || letters(lastName, 2).length < 2 || !GRADES.includes(grade)) {
        results.push({ email: "", full_name: fullName, grade_level: grade, status: "skipped", error: "Invalid row" });
        continue;
      }

      let email = "";
      let username = "";
      try {
        username = await resolveUsername(buildUsername(firstName, lastName, grade));
        email = `${username}@${STUDENT_DOMAIN}`;

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
          user_metadata: { full_name: fullName, requested_role: "student", grade_level: grade, school: school.name },
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

        if (!alreadyExisted) newStudents++;

        results.push({
          email,
          username,
          full_name: fullName,
          grade_level: grade,
          password: alreadyExisted ? undefined : password,
          status: alreadyExisted ? "already existed" : "created",
        });
      } catch (e: any) {
        results.push({
          email, username, full_name: fullName, grade_level: grade,
          status: "failed", error: String(e?.message ?? e),
        });
      }
    }

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
