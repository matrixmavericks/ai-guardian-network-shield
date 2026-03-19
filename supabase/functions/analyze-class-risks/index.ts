import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAiUsage } from "../_shared/aiUsage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-2.5-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "teacher")
      .maybeSingle();
    if (!roleData) throw new Error("Only teachers can view class risk summary");

    const body = await req.json();
    const { pathId, pathTitle, pathSubject, pathDifficulty, modules, studentIds } = body;
    if (!pathId || !pathTitle || !studentIds?.length) throw new Error("Missing required fields");

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", studentIds);
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.full_name]));

    const [submissionsRes, progressRes, chatRes] = await Promise.all([
      supabase
        .from("assignment_submissions")
        .select("student_id, assignment_id, grade, max_grade, status")
        .in("student_id", studentIds)
        .not("grade", "is", null),
      supabase
        .from("learning_path_progress")
        .select("user_id, path_id, progress, completed_modules")
        .in("user_id", studentIds),
      supabase
        .from("ai_chat_messages")
        .select("user_id, content")
        .in("user_id", studentIds)
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const allSubmissions = submissionsRes.data || [];
    let assignmentDetails: any[] = [];
    if (allSubmissions.length > 0) {
      const ids = [...new Set(allSubmissions.map((s: any) => s.assignment_id))];
      const { data } = await supabase.from("class_assignments").select("id, title, subject").in("id", ids);
      assignmentDetails = data || [];
    }

    const studentSummaries = studentIds.map((sid: string) => {
      const submissions = allSubmissions.filter((s: any) => s.student_id === sid);
      const avgScore = submissions.length > 0
        ? Math.round(submissions.reduce((acc: number, s: any) => acc + (s.grade / s.max_grade) * 100, 0) / submissions.length)
        : null;
      const progress = (progressRes.data || []).filter((p: any) => p.user_id === sid);
      const chatCount = (chatRes.data || []).filter((c: any) => c.user_id === sid).length;

      return {
        student_id: sid,
        name: profileMap[sid] || "Unknown",
        avg_score: avgScore,
        total_submissions: submissions.length,
        learning_paths_in_progress: progress.length,
        ai_chat_questions: chatCount,
      };
    });

    const modulesList = (modules || []).map((m: any, i: number) => `${i + 1}. ${m.title}: ${m.description}`).join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert educational analyst. A teacher wants a quick risk overview of ALL their students for a specific learning path. Analyze each student's academic data and classify their readiness.

You MUST respond with a tool call using the "class_risk_summary" function. Be specific and actionable.`;

    const userPrompt = `## Learning Path
Title: ${pathTitle}
Subject: ${pathSubject}
Difficulty: ${pathDifficulty}
Modules:
${modulesList}

## Students Data
${JSON.stringify(studentSummaries, null, 2)}

For each student, assess their risk level for THIS specific learning path based on their grades, activity, and the path difficulty. Also provide a brief recommendation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "class_risk_summary",
              description: "Return risk assessment for all students",
              parameters: {
                type: "object",
                properties: {
                  students: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        student_id: { type: "string" },
                        risk_level: { type: "string", enum: ["low", "medium", "high"] },
                        readiness_score: { type: "number", description: "0-100 readiness score" },
                        key_concern: { type: "string", description: "One-line main concern" },
                        recommendation: { type: "string", description: "Brief actionable recommendation for the teacher" },
                      },
                      required: ["student_id", "risk_level", "readiness_score", "key_concern", "recommendation"],
                    },
                  },
                  overall_summary: { type: "string", description: "2-3 sentence summary for the teacher about overall class readiness" },
                },
                required: ["students", "overall_summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "class_risk_summary" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI analysis failed");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned");

    await logAiUsage({
      userId: user.id,
      model: MODEL,
      aiData,
      promptSource: `${systemPrompt}\n\n${userPrompt}`,
      completionSource: toolCall.function.arguments,
    });

    const result = JSON.parse(toolCall.function.arguments);
    result.students = result.students.map((s: any) => ({
      ...s,
      name: profileMap[s.student_id] || "Unknown",
    }));

    return new Response(JSON.stringify({ summary: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-class-risks error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});