// Pilot Mahindra Intelligence — generates AI executive briefings and teacher spotlights
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUBDOMAIN = "mahindra-pune";
const MASTER_ADMIN_EMAIL = "info.aiconditioner@gmail.com";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const aiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const service = createClient(url, serviceKey);

    // Authn
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const anon = createClient(url, anonKey);
    const { data: userRes } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userRes?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Authz: master admin OR mahindra school admin
    const { data: school } = await service.from("schools").select("id, name").eq("subdomain", SUBDOMAIN).maybeSingle();
    if (!school) return json({ error: "Pilot school not found" }, 404);
    let allowed = user.email?.toLowerCase() === MASTER_ADMIN_EMAIL;
    if (!allowed) {
      const { data: m } = await service.from("school_members").select("school_role").eq("school_id", school.id).eq("user_id", user.id).maybeSingle();
      allowed = m?.school_role === "admin";
    }
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "briefing";

    // Common data gather
    const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: members } = await service.from("school_members").select("user_id, school_role").eq("school_id", school.id);
    const teacherIds = (members ?? []).filter(m => m.school_role === "teacher").map(m => m.user_id);
    const { data: profiles } = await service.from("profiles").select("user_id, full_name, email, department").in("user_id", teacherIds.length ? teacherIds : ["00000000-0000-0000-0000-000000000000"]);
    const { data: classes } = await service.from("classes").select("id, name, subject, teacher_id").eq("school_id", school.id);
    const classIds = (classes ?? []).map(c => c.id);
    const { data: classMembers } = classIds.length
      ? await service.from("class_members").select("student_id, class_id").in("class_id", classIds)
      : { data: [] as any[] };
    const studentIds = [...new Set((classMembers ?? []).map(m => m.student_id))];
    const allUserIds = [...new Set([...teacherIds, ...studentIds])];

    const { data: logs } = allUserIds.length
      ? await service.from("ai_usage_logs").select("user_id, total_tokens, estimated_cost_usd, model, created_at").in("user_id", allUserIds).gte("created_at", sevenAgo)
      : { data: [] as any[] };
    const { data: chatMessages } = allUserIds.length
      ? await service.from("ai_chat_messages").select("user_id, role, moderation_status, severity, created_at").in("user_id", allUserIds).gte("created_at", sevenAgo)
      : { data: [] as any[] };
    const { data: paths } = teacherIds.length
      ? await service.from("learning_paths").select("id, title, subject, created_by, created_at").in("created_by", teacherIds)
      : { data: [] as any[] };
    const { data: caps } = classIds.length
      ? await (service.from("capstone_submissions") as any).select("id, class_id, status, created_at").in("class_id", classIds)
      : { data: [] as any[] };
    const { data: bypass } = allUserIds.length
      ? await service.from("bypass_attempts").select("user_id, attempt_type, severity, created_at").in("user_id", allUserIds).gte("created_at", sevenAgo)
      : { data: [] as any[] };

    const perTeacher = (profiles ?? []).map(p => {
      const tClasses = (classes ?? []).filter(c => c.teacher_id === p.user_id);
      const tClassIds = tClasses.map(c => c.id);
      const tStudents = new Set((classMembers ?? []).filter(m => tClassIds.includes(m.class_id)).map(m => m.student_id));
      const tStudentIds = [...tStudents];
      const tLogs = (logs ?? []).filter(l => l.user_id === p.user_id || tStudentIds.includes(l.user_id));
      const tChats = (chatMessages ?? []).filter(m => m.user_id === p.user_id || tStudentIds.includes(m.user_id));
      const flagged = tChats.filter(m => m.moderation_status === "flagged" || (m.severity && m.severity !== "low" && m.severity !== "none")).length;
      const tPaths = (paths ?? []).filter(pp => pp.created_by === p.user_id);
      return {
        name: p.full_name ?? p.email,
        email: p.email,
        department: p.department,
        classes: tClasses.map(c => `${c.name} (${c.subject ?? "—"})`),
        students: tStudents.size,
        prompts_7d: tChats.filter(m => m.role === "user").length,
        flagged_7d: flagged,
        tokens_7d: tLogs.reduce((s, l) => s + (l.total_tokens ?? 0), 0),
        learning_paths: tPaths.map(p => p.title),
      };
    });

    const totals = {
      teachers: teacherIds.length,
      students: studentIds.length,
      classes: (classes ?? []).length,
      prompts_7d: (chatMessages ?? []).filter(m => m.role === "user").length,
      flagged_7d: (chatMessages ?? []).filter(m => m.moderation_status === "flagged").length,
      tokens_7d: (logs ?? []).reduce((s, l) => s + (l.total_tokens ?? 0), 0),
      cost_7d_usd: (logs ?? []).reduce((s, l) => s + Number(l.estimated_cost_usd ?? 0), 0),
      paths: (paths ?? []).length,
      capstones: (caps ?? []).length,
      bypass_7d: (bypass ?? []).length,
    };

    let system = "";
    let prompt = "";
    if (action === "briefing") {
      system = `You are the Chief of Staff for Refyn Technologies, writing a crisp weekly executive briefing for the leadership of Mahindra International School Pune about their AI governance pilot. Tone: confident, specific, evidence-based, no fluff, no emojis. Use plain text and Unicode (× ÷ — →). Never use LaTeX.`;
      prompt = `Write a one-page weekly executive briefing for the Mahindra pilot. Structure with these exact headed sections:

HEADLINE — one sentence capturing the most important truth of the week.
ADOPTION — teacher and student engagement; cite numbers.
PEDAGOGY — what teachers are building (learning paths, capstones) and what it implies.
GOVERNANCE — flagged prompts, bypass attempts, risk posture; recommend action if any.
TOKEN ECONOMY — utilisation and cost; flag any teacher trending hot.
RECOMMENDED NEXT MOVES — 3 bullets, concrete, owner-tagged where possible.

Pilot data (last 7 days):
${JSON.stringify({ totals, perTeacher }, null, 2)}`;
    } else if (action === "spotlights") {
      system = `You are an instructional coach producing weekly "spotlight" cards for each teacher in the Mahindra pilot. Each card celebrates one real, specific win grounded in the data, and offers one targeted suggestion. No fluff. No emojis. Plain text only.`;
      prompt = `For each teacher below, output a JSON array of objects:
{ "teacher": "<full name>", "headline": "<8-12 word win>", "evidence": "<one sentence with numbers>", "suggestion": "<one concrete next step>" }

Return ONLY the JSON array, nothing else.

Teachers:
${JSON.stringify(perTeacher, null, 2)}`;
    } else if (action === "health") {
      system = `You compute a pilot Health Score for an AI governance deployment. Return strict JSON only.`;
      prompt = `Given the data, compute a Health Score 0-100 plus 4 subscores (adoption, pedagogy, governance, efficiency), each 0-100. Provide a one-line rationale per subscore and a one-line top risk. Return JSON: { "score": number, "grade": "A|B|C|D", "subscores": { "adoption": {value, note}, "pedagogy": {value, note}, "governance": {value, note}, "efficiency": {value, note} }, "top_risk": string, "top_win": string }.

Data:
${JSON.stringify({ totals, perTeacher }, null, 2)}`;
    } else {
      return json({ error: "Unknown action" }, 400);
    }

    const aiRes = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
        ...(action !== "briefing" ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: "AI gateway error", detail: t }, aiRes.status);
    }
    const aiData = await aiRes.json();
    const content = aiData?.choices?.[0]?.message?.content ?? "";
    let parsed: any = content;
    if (action !== "briefing") {
      try { parsed = JSON.parse(content); } catch { /* leave raw */ }
    }

    return json({ success: true, action, result: parsed, totals, generatedAt: new Date().toISOString() });
  } catch (e) {
    console.error("pilot-mahindra-intelligence error", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
