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

    const body = await req.json();
    const { pathId, pathTitle, pathSubject, pathDifficulty, modules, studentId } = body;
    if (!pathId || !pathTitle) throw new Error("Missing path info");

    let targetUserId = user.id;
    if (studentId && studentId !== user.id) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "teacher")
        .maybeSingle();
      if (!roleData) throw new Error("Only teachers can view student insights");
      targetUserId = studentId;
    }

    const [chatRes, submissionsRes, progressRes] = await Promise.all([
      supabase
        .from("ai_chat_messages")
        .select("role, content, created_at")
        .eq("user_id", targetUserId)
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("assignment_submissions")
        .select("assignment_id, grade, max_grade, feedback, status")
        .eq("student_id", targetUserId),
      supabase
        .from("learning_path_progress")
        .select("path_id, progress, completed_modules")
        .eq("user_id", targetUserId),
    ]);

    const chatHistory = (chatRes.data || []).map((m: any) => m.content).join("\n---\n");

    const gradedSubmissions = (submissionsRes.data || []).filter((s: any) => s.grade !== null);
    let assignmentDetails: any[] = [];
    if (gradedSubmissions.length > 0) {
      const ids = gradedSubmissions.map((s: any) => s.assignment_id);
      const { data } = await supabase.from("class_assignments").select("id, title, subject").in("id", ids);
      assignmentDetails = data || [];
    }

    const gradesSummary = gradedSubmissions.map((s: any) => {
      const a = assignmentDetails.find((x: any) => x.id === s.assignment_id);
      return {
        title: a?.title || "Unknown",
        subject: a?.subject || "Unknown",
        score: `${s.grade}/${s.max_grade} (${Math.round((s.grade / s.max_grade) * 100)}%)`,
        feedback: s.feedback,
      };
    });

    const progressSummary = (progressRes.data || []).map((p: any) => ({
      pathId: p.path_id,
      progress: p.progress,
      completedModules: p.completed_modules?.length || 0,
    }));

    const modulesList = (modules || []).map((m: any, i: number) => `${i + 1}. ${m.title}: ${m.description}`).join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const isTeacherView = studentId && studentId !== user.id;
    const systemPrompt = isTeacherView
      ? `You are an expert educational coach helping a TEACHER understand a specific student's readiness for a learning path. Analyze the student's past performance data and provide insights the teacher can use to support this student.

CRITICAL MATH FORMATTING: NEVER use LaTeX/dollar-sign notation. Use Unicode symbols: × ÷ ² ³ √ π ∑ ≤ ≥ ≠. Write fractions as a/b.

You MUST respond with a tool call using the "path_insights" function. Be specific, reference actual topics, and provide actionable teaching strategies.`
      : `You are an expert educational coach. A student is about to study a learning path. Analyze their past performance data and provide personalized, actionable insights to help them succeed in this specific path.

CRITICAL MATH FORMATTING: NEVER use LaTeX/dollar-sign notation. Use Unicode symbols: × ÷ ² ³ √ π ∑ ≤ ≥ ≠. Write fractions as a/b.

You MUST respond with a tool call using the "path_insights" function. Be specific, reference actual topics, and be encouraging.`;

    const userPrompt = `## Learning Path to Study:
Title: ${pathTitle}
Subject: ${pathSubject}
Difficulty: ${pathDifficulty}
Modules:
${modulesList}

## Student's Past Chat Questions (topics they asked about):
${chatHistory || "No chat history yet."}

## Student's Past Assignment Grades:
${gradesSummary.length > 0 ? JSON.stringify(gradesSummary, null, 2) : "No graded assignments yet."}

## Other Learning Path Progress:
${JSON.stringify(progressSummary, null, 2)}

Based on the student's history, generate targeted insights for THIS specific learning path.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "path_insights",
              description: "Return personalized insights for the student about this learning path.",
              parameters: {
                type: "object",
                properties: {
                  watch_out_for: {
                    type: "array",
                    description: "3-5 specific areas where this student is likely to struggle based on past mistakes",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string" },
                        why: { type: "string", description: "Why this will be challenging based on their history" },
                        tip: { type: "string", description: "A concrete tip to avoid this mistake" },
                        severity: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["topic", "why", "tip", "severity"],
                    },
                  },
                  strengths_to_leverage: {
                    type: "array",
                    description: "2-3 existing strengths that will help in this path",
                    items: {
                      type: "object",
                      properties: {
                        strength: { type: "string" },
                        how_it_helps: { type: "string" },
                      },
                      required: ["strength", "how_it_helps"],
                    },
                  },
                  recommended_focus_order: {
                    type: "array",
                    description: "Suggest which modules to pay extra attention to and why",
                    items: {
                      type: "object",
                      properties: {
                        module_name: { type: "string" },
                        attention_level: { type: "string", enum: ["normal", "extra", "critical"] },
                        reason: { type: "string" },
                      },
                      required: ["module_name", "attention_level", "reason"],
                    },
                  },
                  pre_study_exercises: {
                    type: "array",
                    description: "2-4 quick warm-up exercises to do before starting this path",
                    items: {
                      type: "object",
                      properties: {
                        exercise: { type: "string" },
                        purpose: { type: "string" },
                        duration_minutes: { type: "number" },
                      },
                      required: ["exercise", "purpose", "duration_minutes"],
                    },
                  },
                  encouragement: { type: "string", description: "A personalized encouraging message" },
                },
                required: ["watch_out_for", "strengths_to_leverage", "recommended_focus_order", "pre_study_exercises", "encouragement"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "path_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No insights returned");

    await logAiUsage({
      userId: user.id,
      model: MODEL,
      aiData,
      promptSource: `${systemPrompt}\n\n${userPrompt}`,
      completionSource: toolCall.function.arguments,
    });

    const insights = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-path-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});