// Daily per-school metrics snapshot for pilot analytics.
// Primary caller: pg_cron via net.http_post (service role).
// Optional body: { school_subdomain?: string } to snapshot one school.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// ---- Tunable teacher_hours_saved factors (editable assumptions) ----
const HOURS_PER_LEARNING_PATH = 2.0;   // hours saved per AI-generated learning path (drafting + scaffolding)
const HOURS_PER_CAPSTONE       = 0.5;  // hours saved per capstone AI-assessed (rubric feedback pre-draft)
const HOURS_PER_50_PROMPTS     = 1.0;  // hours saved per ~50 AI-tutor prompts (equivalent 1:1 explanations)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = createClient(url, serviceKey);

    // Auth: allow service-role invocations (cron). If a user JWT is present, require admin.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    const isServiceRole = token && token === serviceKey;
    if (!isServiceRole) {
      if (!token) return json({ error: "Unauthorized" }, 401);
      const anon = createClient(url, anonKey);
      const { data: userRes } = await anon.auth.getUser(token);
      const user = userRes?.user;
      if (!user) return json({ error: "Unauthorized" }, 401);
      const { data: roles } = await service.from("user_roles").select("role").eq("user_id", user.id);
      if (!roles?.some((r: any) => r.role === "admin")) return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const subdomain: string | undefined = body?.school_subdomain;

    const schoolsQuery = service.from("schools").select("id, name, subdomain");
    const { data: schools, error: sErr } = subdomain
      ? await schoolsQuery.eq("subdomain", subdomain)
      : await schoolsQuery;
    if (sErr) throw sErr;
    if (!schools || schools.length === 0) return json({ error: "No schools" }, 404);

    const today = new Date().toISOString().slice(0, 10);
    const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const oneDayAgo = new Date(Date.now() - 86400_000).toISOString();

    const results: any[] = [];

    for (const school of schools) {
      const { data: members } = await service.from("school_members")
        .select("user_id, school_role").eq("school_id", school.id);
      const teacherIds = (members ?? []).filter(m => m.school_role === "teacher").map(m => m.user_id);
      const { data: classes } = await service.from("classes")
        .select("id, teacher_id").eq("school_id", school.id);
      const classIds = (classes ?? []).map(c => c.id);
      const { data: classMembers } = classIds.length
        ? await service.from("class_members").select("student_id, class_id").in("class_id", classIds)
        : { data: [] as any[] };
      const studentIds = [...new Set((classMembers ?? []).map(m => m.student_id))];
      const allUserIds = [...new Set([...teacherIds, ...studentIds])];
      const safeIds = allUserIds.length ? allUserIds : ["00000000-0000-0000-0000-000000000000"];

      const [logs7, logsAll, chats7, chatsAll, pathsRes, capsRes, bypass7] = await Promise.all([
        service.from("ai_usage_logs").select("user_id, total_tokens, estimated_cost_usd, created_at")
          .in("user_id", safeIds).gte("created_at", sevenAgo),
        service.from("ai_usage_logs").select("user_id, created_at").in("user_id", safeIds),
        service.from("ai_chat_messages").select("user_id, role, moderation_status, severity, created_at")
          .in("user_id", safeIds).gte("created_at", sevenAgo),
        service.from("ai_chat_messages").select("id, role").in("user_id", safeIds),
        teacherIds.length
          ? service.from("learning_paths").select("id, created_by").in("created_by", teacherIds)
          : Promise.resolve({ data: [] as any[] }),
        classIds.length
          ? (service.from("capstone_submissions") as any).select("id, teacher_score, ai_score")
          : Promise.resolve({ data: [] as any[] }),
        service.from("bypass_attempts").select("id, created_at").in("user_id", safeIds).gte("created_at", sevenAgo),
      ]);

      const pathIds = ((pathsRes.data ?? []) as any[]).map(p => p.id);
      const { data: progress } = pathIds.length
        ? await service.from("learning_path_progress").select("path_id, progress").in("path_id", pathIds)
        : { data: [] as any[] };

      const userChats7 = (chats7.data ?? []).filter((m: any) => m.role === "user");
      const dauUsers = new Set(
        (logs7.data ?? []).filter((l: any) => l.created_at >= oneDayAgo).map((l: any) => l.user_id)
      );
      const wauUsers = new Set((logs7.data ?? []).map((l: any) => l.user_id));

      const prompts_total = (chatsAll.data ?? []).filter((m: any) => m.role === "user").length;
      const prompts_7d = userChats7.length;
      const flagged_7d = (chats7.data ?? []).filter((m: any) =>
        m.moderation_status === "flagged" ||
        (m.severity && m.severity !== "low" && m.severity !== "none")
      ).length;
      const bypass_7d = (bypass7.data ?? []).length;
      const learning_paths_total = (pathsRes.data ?? []).length;
      const learning_path_completion_pct = (progress ?? []).length
        ? Number(((progress ?? []).reduce((s: number, p: any) => s + (p.progress ?? 0), 0) / (progress ?? []).length).toFixed(2))
        : 0;
      const capstones_total = (capsRes.data ?? []).length;
      const scored = (capsRes.data ?? []).map((c: any) => c.teacher_score ?? c.ai_score).filter((v: any) => v != null);
      const capstones_avg_score = scored.length
        ? Number((scored.reduce((s: number, v: number) => s + Number(v), 0) / scored.length).toFixed(2))
        : 0;
      const tokens_7d = (logs7.data ?? []).reduce((s: number, l: any) => s + (l.total_tokens ?? 0), 0);
      const cost_7d_usd = Number(
        (logs7.data ?? []).reduce((s: number, l: any) => s + Number(l.estimated_cost_usd ?? 0), 0).toFixed(4)
      );

      // Editable assumption: hours reclaimed by AI assist across path drafting, capstone rubric, tutoring
      const teacher_hours_saved = Number((
        learning_paths_total * HOURS_PER_LEARNING_PATH +
        capstones_total * HOURS_PER_CAPSTONE +
        (prompts_total / 50) * HOURS_PER_50_PROMPTS
      ).toFixed(2));

      const row = {
        school_id: school.id,
        snapshot_date: today,
        teachers: teacherIds.length,
        students: studentIds.length,
        classes: (classes ?? []).length,
        wau: wauUsers.size,
        dau: dauUsers.size,
        prompts_7d,
        prompts_total,
        flagged_7d,
        bypass_7d,
        learning_paths_total,
        learning_path_completion_pct,
        capstones_total,
        capstones_avg_score,
        tokens_7d,
        cost_7d_usd,
        teacher_hours_saved,
      };

      const { data: upserted, error: upErr } = await service
        .from("pilot_metrics")
        .upsert(row, { onConflict: "school_id,snapshot_date" })
        .select()
        .single();
      if (upErr) throw upErr;
      results.push({ school: school.subdomain ?? school.name, row: upserted });
    }

    return json({ success: true, count: results.length, results });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
