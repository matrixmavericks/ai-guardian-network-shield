import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    const { title, description, subject, difficulty, estimatedHours, gradeLevel } = await req.json();
    if (!title?.trim() || !subject?.trim()) {
      return json({ success: false, error: "Title and subject are required." }, 400);
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return json({ success: false, error: "AI gateway is not configured." }, 500);
    }

    const systemPrompt = `You are an expert instructional designer. Return valid JSON only.

Schema:
{
  "modules": [
    {
      "title": "string",
      "description": "string",
      "resources": ["string"],
      "quizzes": ["string"]
    }
  ],
  "suggestedTags": ["string"]
}

Rules:
- Create 4 to 6 modules in a strong teaching sequence.
- Keep each module practical and age-appropriate for the grade level.
- Resources must be concise learning activities, readings, or exercises (3-5 per module). Each resource string should be a clear topic title that can be expanded into a full lesson.
- Quizzes must be short assessment topic titles (1-2 per module) that test understanding of the module content.
- suggestedTags should contain 3 to 6 short tags.
- Tailor language complexity and content depth to the specified grade level and difficulty.`;

    const userPrompt = `Build a learning path.
Title: ${title}
Subject: ${subject}
Difficulty: ${difficulty || "beginner"}
Grade Level: ${gradeLevel || "self-learner"}
Estimated hours: ${estimatedHours || 10}
Description: ${description || ""}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("generate-learning-path gateway error", response.status, errorText);
      if (response.status === 429) return json({ success: false, error: "AI rate limit reached. Try again in a minute." }, 429);
      if (response.status === 402) return json({ success: false, error: "AI credits are required before generating more learning paths." }, 402);
      return json({ success: false, error: "AI generation failed." }, 500);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return json({ success: false, error: "AI returned an empty learning path." }, 500);
    }

    const parsed = JSON.parse(content);
    const modules = Array.isArray(parsed?.modules) ? parsed.modules : [];
    const suggestedTags = Array.isArray(parsed?.suggestedTags) ? parsed.suggestedTags : [];

    if (modules.length === 0) {
      return json({ success: false, error: "AI could not build modules for this request." }, 500);
    }

    return json({ success: true, modules, suggestedTags });
  } catch (error) {
    console.error("generate-learning-path error", error);
    return json({
      success: false,
      error: error instanceof Error && error.name === "AbortError"
        ? "AI generation timed out. Please try again."
        : error instanceof Error
          ? error.message
          : "Unknown error",
    }, 500);
  }
});
