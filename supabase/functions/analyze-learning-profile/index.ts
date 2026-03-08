import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const userId = user.id;

    // Fetch chat history (last 100 messages)
    const { data: chatMessages } = await supabase
      .from("ai_chat_messages")
      .select("role, content, created_at, metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    // Fetch learning path progress
    const { data: progressData } = await supabase
      .from("learning_path_progress")
      .select("path_id, progress, completed_modules, bookmarked, started_at, last_accessed_at")
      .eq("user_id", userId);

    // Fetch learning paths the user has
    const { data: userPaths } = await supabase
      .from("learning_paths")
      .select("id, title, subject, difficulty, modules, tags")
      .eq("created_by", userId);

    // Build context for AI analysis
    const chatSummary = (chatMessages || [])
      .filter((m: any) => m.role === "user")
      .slice(0, 50)
      .map((m: any) => m.content)
      .join("\n---\n");

    const pathsSummary = (userPaths || []).map((p: any) => {
      const prog = (progressData || []).find((pr: any) => pr.path_id === p.id);
      return {
        title: p.title,
        subject: p.subject,
        difficulty: p.difficulty,
        totalModules: Array.isArray(p.modules) ? p.modules.length : 0,
        completedModules: prog ? prog.completed_modules?.length || 0 : 0,
        progress: prog ? prog.progress : 0,
        modules: p.modules,
      };
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert educational psychologist and adaptive learning specialist. Analyze a student's learning data and produce a comprehensive learning profile.

You MUST respond with a tool call using the "learning_profile" function. Analyze carefully:
1. LEARNING STYLE: Determine from their questions whether they are visual, auditory, reading/writing, or kinesthetic learners. Look at how they phrase questions and what they struggle with.
2. CONCEPTUAL GAPS: Identify fundamental misunderstandings or knowledge gaps from their questions and learning path progress.
3. STRENGTH AREAS: What subjects/topics they excel at.
4. PREVENTIVE RECOMMENDATIONS: Predict future mistakes based on current patterns and suggest preemptive lessons.
5. OPTIMIZED PLAN: Create a personalized micro-learning plan (5-7 focused activities) tailored to their learning style.

Be specific, actionable, and encouraging. Reference actual topics from their data.`;

    const userPrompt = `## Student Chat History (recent questions asked to AI tutor):
${chatSummary || "No chat history available yet."}

## Learning Paths & Progress:
${JSON.stringify(pathsSummary, null, 2)}

Analyze this student's learning profile comprehensively.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "learning_profile",
              description: "Return the student's complete adaptive learning profile analysis.",
              parameters: {
                type: "object",
                properties: {
                  learning_style: {
                    type: "object",
                    properties: {
                      primary: { type: "string", description: "Primary learning style: visual, auditory, reading_writing, or kinesthetic" },
                      secondary: { type: "string", description: "Secondary learning style" },
                      description: { type: "string", description: "2-3 sentence explanation of how this student learns best" },
                      tips: { type: "array", items: { type: "string" }, description: "3-4 specific study tips for this style" },
                    },
                    required: ["primary", "description", "tips"],
                  },
                  conceptual_gaps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string" },
                        severity: { type: "string", enum: ["minor", "moderate", "critical"] },
                        description: { type: "string" },
                        remediation: { type: "string", description: "Specific action to fix this gap" },
                      },
                      required: ["topic", "severity", "description", "remediation"],
                    },
                    description: "Identified conceptual gaps or misunderstandings",
                  },
                  strengths: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        area: { type: "string" },
                        evidence: { type: "string" },
                      },
                      required: ["area", "evidence"],
                    },
                  },
                  preventive_insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        prediction: { type: "string", description: "What mistake or struggle is likely coming" },
                        prevention: { type: "string", description: "What to study now to prevent it" },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["prediction", "prevention", "priority"],
                    },
                  },
                  optimized_plan: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        order: { type: "number" },
                        activity: { type: "string" },
                        why: { type: "string", description: "Why this activity suits this student's style" },
                        duration_minutes: { type: "number" },
                        type: { type: "string", enum: ["lesson", "practice", "quiz", "reflection", "project"] },
                      },
                      required: ["order", "activity", "why", "duration_minutes", "type"],
                    },
                  },
                  overall_summary: { type: "string", description: "An encouraging 2-3 sentence summary of the student's profile" },
                },
                required: ["learning_style", "conceptual_gaps", "strengths", "preventive_insights", "optimized_plan", "overall_summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "learning_profile" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned");

    const profile = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-learning-profile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
