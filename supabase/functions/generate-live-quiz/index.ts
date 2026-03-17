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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "Unauthorized" }, 401);

    const { topic, subject, difficulty, questionCount, includeRedemption } = await req.json();

    if (!topic?.trim()) return json({ success: false, error: "Topic is required." }, 400);

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) return json({ success: false, error: "AI gateway not configured." }, 500);

    const count = Math.min(Math.max(questionCount || 10, 3), 25);
    const redemptionNote = includeRedemption
      ? `\nAlso include 2-3 "redemption" questions at the end (mark them with "type": "redemption"). These should be easier versions of commonly missed concepts.`
      : "";

    const systemPrompt = `You are an expert educational quiz creator for live classroom games (like Kahoot). Return valid JSON only.

CRITICAL MATH FORMATTING: NEVER use LaTeX notation. Use Unicode: × ÷ ² ³ √ π ∑ ≤ ≥ ≠. Fractions as a/b. Exponents as x².

Schema:
{
  "questions": [
    {
      "question_text": "string",
      "question_type": "multiple_choice" | "true_false" | "redemption",
      "options": [{"text": "string", "isCorrect": boolean}],
      "correct_index": number,
      "explanation": "string (detailed explanation of WHY the answer is correct)"
    }
  ]
}

Rules:
- Create exactly ${count} questions${redemptionNote}
- Each multiple_choice has exactly 4 options, true_false has 2
- Questions should be engaging, clear, and fun for a live game
- Explanations should be educational and thorough
- Match difficulty: ${difficulty || "beginner"}
- Make questions progressively harder`;

    const userPrompt = `Create a live quiz game.
Topic: ${topic}
Subject: ${subject || "General"}
Difficulty: ${difficulty || "beginner"}
Number of questions: ${count}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

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
      console.error("generate-live-quiz gateway error", response.status, errorText);
      if (response.status === 429) return json({ success: false, error: "Rate limit reached. Try again shortly." }, 429);
      if (response.status === 402) return json({ success: false, error: "Payment required. Please add credits." }, 402);
      return json({ success: false, error: "AI generation failed." }, 500);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return json({ success: false, error: "AI returned empty content." }, 500);

    const parsed = JSON.parse(content);
    return json({ success: true, data: parsed });
  } catch (error) {
    console.error("generate-live-quiz error", error);
    return json({
      success: false,
      error: error instanceof Error && error.name === "AbortError"
        ? "Generation timed out."
        : error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
