// Anonymous student accounts for the Mahindra International School pilot.
// Students sign in with an ID like "MIS-7K2QX9P4" and a random password; no
// names, emails or other personal details are stored. The ID is the only
// identifier; the school keeps the list that links IDs to real students.
//
// Actions (POST JSON):
//   { action: "create", ids?: string[], generate?: { count, length? }, grade?: string }
//   { action: "reset", ids: string[] }
//   { action: "list" }
// Allowed for the master admin and admins of the pilot school.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_ADMIN = "info.aiconditioner@gmail.com";
const SUBDOMAIN = "mahindra-pune";
const STUDENT_DOMAIN = "mahindra-pilot.refyntech.us";
const STUDENT_TOKEN_LIMIT = 50_000;
const ID_RE = /^MIS-[A-Z0-9]{3,24}$/;
const GRADES = ["MYP 1", "MYP 2", "MYP 3", "MYP 4", "MYP 5", "DP 1", "DP 2"];
const MAX_PER_CALL = 60;

const ID_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
const CONS = "bcdfghjkmnprstvz";
const VOWS = "aeiou";

const rand = (n: number) => {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] % n;
};
const syllable = () => CONS[rand(CONS.length)] + VOWS[rand(VOWS.length)];
/** Easy to read and type, hard to guess: e.g. "Bako-Mizu-47" */
const genPassword = () => {
  const word = () => {
    const w = syllable() + syllable();
    return w[0].toUpperCase() + w.slice(1);
  };
  return `${word()}-${word()}-${10 + rand(90)}`;
};
const genId = (length: number) => `MIS-${Array.from({ length }, () => ID_ALPHABET[rand(ID_ALPHABET.length)]).join("")}`;
const emailFor = (id: string) => `${id.toLowerCase()}@${STUDENT_DOMAIN}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: school } = await admin.from("schools").select("id, name").eq("subdomain", SUBDOMAIN).maybeSingle();
    if (!school) return json({ error: "Pilot school not found." }, 400);

    const isMaster = (caller.email ?? "").toLowerCase() === MASTER_ADMIN;
    if (!isMaster) {
      const { data: m } = await admin.from("school_members").select("school_role").eq("school_id", school.id).eq("user_id", caller.id).maybeSingle();
      if (!m || m.school_role !== "admin") return json({ error: "Only pilot administrators can manage student IDs." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    /* ---------- list ---------- */
    if (action === "list") {
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, full_name, grade_level, created_at")
        .like("email", `%@${STUDENT_DOMAIN}`)
        .like("full_name", "MIS-%")
        .order("created_at", { ascending: false })
        .limit(2000);
      const ids = (profiles ?? []).map((p) => p.user_id);
      const lastSeen = new Map<string, string | null>();
      for (let page = 1; page <= 10; page++) {
        const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (!list?.users?.length) break;
        for (const u of list.users) if (u.email?.endsWith(`@${STUDENT_DOMAIN}`)) lastSeen.set(u.id, u.last_sign_in_at ?? null);
        if (list.users.length < 1000) break;
      }
      const classCount = new Map<string, number>();
      for (let i = 0; i < ids.length; i += 500) {
        const { data: members } = await admin.from("class_members").select("student_id").in("student_id", ids.slice(i, i + 500));
        for (const m of members ?? []) classCount.set(m.student_id, (classCount.get(m.student_id) ?? 0) + 1);
      }
      return json({
        success: true,
        accounts: (profiles ?? []).map((p) => ({
          id: p.full_name,
          grade: p.grade_level,
          createdAt: p.created_at,
          lastSignIn: lastSeen.get(p.user_id) ?? null,
          classes: classCount.get(p.user_id) ?? 0,
        })),
      });
    }

    /* ---------- reset ---------- */
    if (action === "reset") {
      const list: string[] = Array.isArray(body?.ids) ? body.ids.map((x: unknown) => String(x).trim().toUpperCase()).filter((x: string) => ID_RE.test(x)) : [];
      if (!list.length) return json({ error: "No valid IDs to reset" }, 400);
      if (list.length > MAX_PER_CALL) return json({ error: `Reset at most ${MAX_PER_CALL} at a time.` }, 400);
      const results = [];
      for (const id of list) {
        const { data: prof } = await admin.from("profiles").select("user_id").eq("email", emailFor(id)).maybeSingle();
        if (!prof) {
          results.push({ id, status: "not found" });
          continue;
        }
        const password = genPassword();
        const { error } = await admin.auth.admin.updateUserById(prof.user_id, { password });
        results.push(error ? { id, status: "failed", error: error.message } : { id, password, status: "reset" });
      }
      return json({ success: true, results });
    }

    /* ---------- create ---------- */
    if (action !== "create") return json({ error: "Unknown action" }, 400);
    const grade = GRADES.includes(String(body?.grade ?? "")) ? String(body.grade) : null;
    let list: string[] = Array.isArray(body?.ids) ? body.ids.map((x: unknown) => String(x).trim().toUpperCase()) : [];
    if (body?.generate) {
      const count = Math.max(1, Math.min(MAX_PER_CALL, Number(body.generate.count) || 0));
      const length = Math.max(5, Math.min(12, Number(body.generate.length) || 8));
      const made = new Set<string>();
      while (made.size < count) made.add(genId(length));
      list = [...made];
    }
    list = [...new Set(list)];
    const invalid = list.filter((id) => !ID_RE.test(id));
    list = list.filter((id) => ID_RE.test(id));
    if (!list.length) return json({ error: "No valid IDs. They should look like MIS-7K2QX9P4.", invalid }, 400);
    if (list.length > MAX_PER_CALL) return json({ error: `Send at most ${MAX_PER_CALL} IDs per request.` }, 400);

    const results: Record<string, unknown>[] = invalid.map((id) => ({ id, status: "invalid" }));
    let created = 0;
    for (const id of list) {
      const email = emailFor(id);
      try {
        const { data: existing } = await admin.from("profiles").select("user_id").eq("email", email).maybeSingle();
        if (existing) {
          results.push({ id, status: "exists" });
          continue;
        }
        // Pre-approve so the signup trigger assigns the student role
        const reqPayload = { email, full_name: id, requested_role: "student", status: "approved", reviewed_by: caller.id, reviewed_at: new Date().toISOString() };
        const { data: existingReq } = await admin.from("registration_requests").select("id").ilike("email", email).limit(1);
        if (existingReq && existingReq.length) await admin.from("registration_requests").update(reqPayload).eq("id", existingReq[0].id);
        else await admin.from("registration_requests").insert(reqPayload);

        const password = genPassword();
        const { data: made, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: id, requested_role: "student", grade_level: grade, school: school.name, anonymous_pilot: true },
        });
        if (createErr) throw createErr;
        const userId = made.user?.id;
        if (!userId) throw new Error("No account id returned");

        await admin.from("profiles").upsert({ user_id: userId, email, full_name: id, grade_level: grade }, { onConflict: "user_id" });
        await admin.from("user_roles").delete().eq("user_id", userId).neq("role", "student");
        await admin.from("user_roles").upsert({ user_id: userId, role: "student" }, { onConflict: "user_id,role" });
        await admin.from("school_members").upsert({ school_id: school.id, user_id: userId, school_role: "member" }, { onConflict: "school_id,user_id" });
        const { data: plan } = await admin.from("user_plans").select("id").eq("user_id", userId).eq("status", "active").maybeSingle();
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
        created++;
        results.push({ id, password, status: "created" });
      } catch (e) {
        results.push({ id, status: "failed", error: String((e as Error)?.message ?? e) });
      }
    }

    if (created > 0) {
      const { data: seats } = await admin.from("school_seat_limits").select("students_used").eq("school_id", school.id).maybeSingle();
      if (seats) await admin.from("school_seat_limits").update({ students_used: (seats.students_used || 0) + created }).eq("school_id", school.id);
    }
    return json({ success: true, created, results });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
