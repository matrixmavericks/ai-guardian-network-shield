import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    if (!authHeader) return json({ success: false, error: "Unauthorized" }, 401);

    const { type, topic, subject, moduleTitle, moduleDescription, difficulty } = await req.json();

    if (!topic?.trim()) {
      return json({ success: false, error: "Topic is required." }, 400);
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return json({ success: false, error: "AI gateway is not configured." }, 500);
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (type === "quiz") {
      systemPrompt = `You are an expert educational assessment creator. Return valid JSON only.

CRITICAL MATH FORMATTING: NEVER use LaTeX/dollar-sign notation ($x^2$, \\frac{}, etc). Use Unicode symbols: × ÷ ² ³ √ π ∑ ≤ ≥ ≠. Write fractions as a/b. Write exponents as x², x³. Use plain text for all math.

Schema:
{
  "questions": [
    {
      "id": number,
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctIndex": number,
      "explanation": "string"
    }
  ]
}

Rules:
- Create 5 multiple-choice questions.
- Each question has exactly 4 options.
- correctIndex is 0-based.
- explanation should explain WHY the correct answer is right.
- Questions should test understanding, not just memorization.
- Match the difficulty level provided.`;

      userPrompt = `Create a quiz assessment.
Topic: ${topic}
Subject: ${subject || "General"}
Module: ${moduleTitle || ""}
Context: ${moduleDescription || ""}
Difficulty: ${difficulty || "beginner"}`;
    } else {
      systemPrompt = `You are an expert educational content creator. Return valid JSON only.

CRITICAL MATH FORMATTING: NEVER use LaTeX/dollar-sign notation ($x^2$, \\frac{}, etc). Use Unicode symbols: × ÷ ² ³ √ π ∑ ≤ ≥ ≠. Write fractions as a/b. Write exponents as x², x³. Use plain text for all math.

Schema:
{
  "sections": [
    {
      "heading": "string",
      "content": "string (markdown formatted)",
      "keyPoints": ["string"]
    }
  ],
  "summary": "string",
  "practiceExercises": ["string"]
}

Rules:
- Create 3 to 5 well-structured sections.
- Content should be detailed, educational, and engaging (use markdown: bold, lists, code blocks if relevant).
- Each section should have 2-4 key points.
- Include 2-3 practice exercises at the end.
- Match the difficulty level provided.
- Content should be comprehensive enough for self-study (at least 200 words per section).`;

      userPrompt = `Create detailed learning content.
Resource topic: ${topic}
Subject: ${subject || "General"}
Module: ${moduleTitle || ""}
Context: ${moduleDescription || ""}
Difficulty: ${difficulty || "beginner"}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
      console.error("generate-module-content gateway error", response.status, errorText);
      if (response.status === 429) return json({ success: false, error: "Rate limit reached. Try again shortly." }, 429);
      return json({ success: false, error: "AI generation failed." }, 500);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return json({ success: false, error: "AI returned empty content." }, 500);
    }

    const parsed = JSON.parse(content);
    return json({ success: true, type, data: parsed });
  } catch (error) {
    console.error("generate-module-content error", error);
    return json({
      success: false,
      error: error instanceof Error && error.name === "AbortError"
        ? "Generation timed out. Please try again."
        : error instanceof Error
          ? error.message
          : "Unknown error",
    }, 500);
  }
});
