import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAiUsage } from "../_shared/aiUsage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-2.5-flash";

const FEATURE_PROMPTS: Record<string, { system: string; targetRole?: string }> = {
  thinking_replay: {
    system: `You are an educational metacognition coach. Given a student's raw AI chat history, distill it into a "Cognitive Footprint" - a visual thought map of how the student thinks.

Output sections in clean markdown with H2 headers:
## Journey Summary (2-3 sentences)
## Key Questions Asked (bullet list, grouped by topic)
## Dead-Ends Hit (where the student got stuck and rephrased)
## Breakthrough Moments (when understanding clicked)
## Thinking Pattern (what cognitive style does this reveal?)
## Recommendations for next study session

CRITICAL: NEVER use LaTeX. Use Unicode (× ÷ ² √ π). Be specific, reference actual content.`,
  },
  future_self: {
    system: `You are an AI career architect. Given a student's target career and academic data, generate a personalized 3-YEAR roadmap that ties current coursework → skills → projects → portfolio artifacts.

Output in markdown:
## Your Future Self: [Career Title]
## Year 1: Foundation (with quarterly milestones, specific courses, 2 mini-projects)
## Year 2: Specialization (skills to deepen, 1 internship target, 2 portfolio projects)
## Year 3: Distinction (capstone-level work, networking moves, application strategy)
## Skill Gap Analysis (what current grades suggest you need to strengthen)
## This Month's Action Items (3-5 concrete steps)

Be encouraging but specific. Reference real industry skills. NEVER use LaTeX.`,
  },
  peer_compare: {
    system: `You are an anonymous peer-comparison analyst. Given a student's grades and anonymized class aggregate data, produce healthy percentile insights WITHOUT naming peers or creating a leaderboard vibe.

Output in markdown:
## Where You Stand
- Top/middle/bottom % per subject or topic (use friendly phrasing)
## Your Superpowers (2-3 areas you outperform on)
## Your Growth Edges (2-3 areas to push on)
## Smart Next Move (one concrete suggestion)

Tone: encouraging, never shaming. NEVER use LaTeX.`,
  },
  auto_iep: {
    system: `You are a differentiation specialist for a teacher. Given a class roster with performance data, generate per-student lesson differentiation strategies.

Output in markdown:
## Differentiation Plan: [Topic]
For each student, a subsection:
### [Student Name]
- **Reading level adjustment:** ...
- **Recommended example/analogy:** ...
- **Scaffolding strategy:** ...
- **Stretch question (if advanced):** ...
- **Watch-out signal:** ...

Be concrete, teacher-actionable, kind. NEVER use LaTeX.`,
    targetRole: "teacher",
  },
  curriculum_conflict: {
    system: `You are a school curriculum coordinator AI. Given upcoming assignments across teachers/classes, detect overlaps, gaps, and workload imbalances.

Output in markdown:
## Calendar Conflict Report
## High-Workload Weeks (dates + which classes pile on)
## Topic Overlaps (same concept taught in multiple classes)
## Coverage Gaps (standards not addressed this term)
## Recommended Reschedules (3-5 specific moves)

Be tactful. NEVER use LaTeX.`,
    targetRole: "teacher",
  },
  parent_brief: {
    system: `You are a teacher's writing assistant. Draft a WEEKLY parent email per student that is warm, specific, and 4-6 sentences max.

Output one section per student:
### [Student Name]
[Friendly greeting]
[Win this week - specific]
[One area of growth - framed positively]
[Concrete way parent can help at home]
[Sign-off]

Tone: professional warmth. NEVER use LaTeX.`,
    targetRole: "teacher",
  },
  at_risk_radar: {
    system: `You are a predictive academic-risk analyst for a school admin. Given AI usage patterns + grades + engagement signals, flag students at risk of failing/disengaging in the next 6 weeks.

Output in markdown:
## Risk Radar Summary
- High risk: count
- Medium risk: count
- Watchlist: count
## High-Risk Students
For each: name, key signals (3 bullets), suggested intervention
## Trend Alerts (cohort-level patterns)
## Recommended This Week

Be evidence-based, not alarmist. NEVER use LaTeX.`,
    targetRole: "admin",
  },
  policy_sandbox: {
    system: `You are a policy-impact simulator. Given a proposed AI policy change and last 30 days of usage data, simulate the projected impact.

Output in markdown:
## Policy Simulation: [Change Description]
## Affected Workflows (which features/users get hit)
## Estimated Volume Impact (prompts/sessions impacted)
## Teacher & Student Friction (likely complaints)
## Pedagogical Upside (why it might be worth it)
## Recommended Rollout (phased plan)
## Verdict: GREEN / YELLOW / RED with one-line reason

NEVER use LaTeX.`,
    targetRole: "admin",
  },
  budget_optimizer: {
    system: `You are an AI cost optimization analyst. Given a school's AI usage logs by model, suggest model-routing changes to cut spend 30-60% without quality loss.

Output in markdown:
## Current Spend Snapshot
## Top 3 Routing Opportunities
For each: current model, suggested model, why quality holds, est. monthly savings $
## Risk-Adjusted Quick Wins (safe changes to ship today)
## Watch-Out Cases (where you should NOT downgrade)
## Projected Monthly Savings: $X – $Y

NEVER use LaTeX.`,
    targetRole: "admin",
  },
  refyn_graph: {
    system: `You are the Refyn Knowledge Graph narrator. Given a school's recent activity (students, classes, resources, chats, outcomes), describe the knowledge graph and the strongest connections.

Output in markdown:
## Refyn Graph: This Week
## Top Nodes (most connected students, teachers, resources)
## Strongest Edges (which resources drove the most learning)
## Knowledge Clusters (topic communities forming)
## Untapped Connections (suggestions to bridge silos)
## Graph Health Score: X/100

NEVER use LaTeX.`,
    targetRole: "admin",
  },
};

async function loadContext(supabase: any, feature: string, userId: string, params: any): Promise<string> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  switch (feature) {
    case "thinking_replay": {
      const targetSession = params?.sessionId;
      let query = supabase.from("ai_chat_messages").select("role, content, created_at").eq("user_id", userId).order("created_at", { ascending: true }).limit(200);
      if (targetSession) query = query.eq("session_id", targetSession);
      const { data } = await query;
      return `## Chat history (${data?.length || 0} messages)\n` +
        (data || []).map((m: any) => `[${m.role}] ${m.content}`).join("\n");
    }
    case "future_self": {
      const career = params?.career || "Software Engineer";
      const { data: grades } = await supabase.from("assignment_submissions").select("grade, max_grade, assignment_id").eq("student_id", userId).not("grade", "is", null).limit(40);
      const { data: profile } = await supabase.from("profiles").select("full_name, grade_level").eq("user_id", userId).maybeSingle();
      return `Target career: ${career}\nProfile: ${JSON.stringify(profile)}\nRecent grades: ${JSON.stringify(grades)}`;
    }
    case "peer_compare": {
      const { data: mine } = await supabase.from("assignment_submissions").select("assignment_id, grade, max_grade").eq("student_id", userId).not("grade", "is", null);
      const ids = (mine || []).map((s: any) => s.assignment_id);
      let aggregate: any[] = [];
      if (ids.length) {
        const { data: peers } = await supabase.from("assignment_submissions").select("assignment_id, grade, max_grade").in("assignment_id", ids).not("grade", "is", null);
        const byA: Record<string, number[]> = {};
        (peers || []).forEach((p: any) => {
          const pct = (p.grade / p.max_grade) * 100;
          (byA[p.assignment_id] ||= []).push(pct);
        });
        aggregate = Object.entries(byA).map(([id, arr]) => ({
          assignment_id: id, n: arr.length, mean: arr.reduce((a, b) => a + b, 0) / arr.length,
        }));
      }
      return `My grades: ${JSON.stringify(mine)}\nClass aggregates (anonymous): ${JSON.stringify(aggregate)}`;
    }
    case "auto_iep": {
      const classId = params?.classId;
      if (!classId) return "No class selected.";
      const { data: members } = await supabase.from("class_members").select("student_id, profiles:profiles!inner(full_name)").eq("class_id", classId).limit(40);
      const studentIds = (members || []).map((m: any) => m.student_id);
      const { data: subs } = await supabase.from("assignment_submissions").select("student_id, grade, max_grade").in("student_id", studentIds).not("grade", "is", null);
      const roster = (members || []).map((m: any) => {
        const theirGrades = (subs || []).filter((s: any) => s.student_id === m.student_id);
        const avg = theirGrades.length ? theirGrades.reduce((a: number, s: any) => a + (s.grade / s.max_grade) * 100, 0) / theirGrades.length : null;
        return { name: m.profiles?.full_name || m.student_id, avg_pct: avg, sample_size: theirGrades.length };
      });
      return `Topic: ${params?.topic || "current lesson"}\nClass roster with performance:\n${JSON.stringify(roster, null, 2)}`;
    }
    case "curriculum_conflict": {
      const { data: assignments } = await supabase.from("class_assignments").select("title, subject, due_date, class_id, teacher_id").gte("due_date", now.toISOString()).order("due_date").limit(100);
      return `Upcoming assignments across school:\n${JSON.stringify(assignments, null, 2)}`;
    }
    case "parent_brief": {
      const classId = params?.classId;
      if (!classId) return "No class selected.";
      const { data: members } = await supabase.from("class_members").select("student_id, profiles:profiles!inner(full_name)").eq("class_id", classId).limit(30);
      const studentIds = (members || []).map((m: any) => m.student_id);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: subs } = await supabase.from("assignment_submissions").select("student_id, grade, max_grade, feedback").in("student_id", studentIds).gte("submitted_at", weekAgo);
      const roster = (members || []).map((m: any) => ({
        name: m.profiles?.full_name || m.student_id,
        week_work: (subs || []).filter((s: any) => s.student_id === m.student_id),
      }));
      return `This week's data:\n${JSON.stringify(roster, null, 2)}`;
    }
    case "at_risk_radar": {
      const { data: usage } = await supabase.from("ai_usage_logs").select("user_id, total_tokens, created_at").gte("created_at", thirtyDaysAgo).limit(500);
      const { data: subs } = await supabase.from("assignment_submissions").select("student_id, grade, max_grade, submitted_at").gte("submitted_at", thirtyDaysAgo).limit(500);
      return `AI usage last 30d: ${JSON.stringify(usage?.slice(0, 100))}\nSubmissions last 30d: ${JSON.stringify(subs?.slice(0, 100))}`;
    }
    case "policy_sandbox": {
      const change = params?.change || "Disable image generation for grades 6-8";
      const { data: usage } = await supabase.from("ai_usage_logs").select("model, total_tokens, estimated_cost_usd, created_at").gte("created_at", thirtyDaysAgo).limit(500);
      return `Proposed change: ${change}\nLast 30 days usage:\n${JSON.stringify(usage?.slice(0, 80))}`;
    }
    case "budget_optimizer": {
      const { data: usage } = await supabase.from("ai_usage_logs").select("model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd").gte("created_at", thirtyDaysAgo).limit(1000);
      const byModel: Record<string, any> = {};
      (usage || []).forEach((u: any) => {
        const k = u.model;
        byModel[k] ||= { count: 0, tokens: 0, cost: 0 };
        byModel[k].count++;
        byModel[k].tokens += u.total_tokens || 0;
        byModel[k].cost += Number(u.estimated_cost_usd) || 0;
      });
      return `Last 30 days AI spend by model:\n${JSON.stringify(byModel, null, 2)}`;
    }
    case "refyn_graph": {
      const [{ data: classes }, { data: resources }, { data: sessions }] = await Promise.all([
        supabase.from("classes").select("id, name, subject, teacher_id").limit(30),
        supabase.from("class_resources").select("title, class_id, resource_type, tags").limit(50),
        supabase.from("ai_chat_sessions").select("subject, user_id").gte("created_at", thirtyDaysAgo).limit(100),
      ]);
      return `Classes: ${JSON.stringify(classes)}\nResources: ${JSON.stringify(resources)}\nRecent chat subjects: ${JSON.stringify(sessions)}`;
    }
    default:
      return "No context loader for this feature.";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { feature, params = {} } = body;
    const cfg = FEATURE_PROMPTS[feature];
    if (!cfg) throw new Error(`Unknown feature: ${feature}`);

    const context = await loadContext(supabase, feature, user.id, params);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = cfg.system;
    const userPrompt = `Context data:\n\n${context}\n\nNow produce the report.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limited. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI credits exhausted. Add credits in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await response.json();
    const reply = aiData.choices?.[0]?.message?.content || "No response.";

    await logAiUsage({
      userId: user.id,
      model: MODEL,
      aiData,
      promptSource: `${systemPrompt}\n\n${userPrompt}`,
      completionSource: reply,
    });

    return new Response(JSON.stringify({ success: true, reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refyn-intelligence error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
