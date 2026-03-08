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

async function fetchFileContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";

    // For text-based files, return content directly
    if (
      contentType.includes("text/") ||
      contentType.includes("json") ||
      contentType.includes("xml") ||
      contentType.includes("csv") ||
      contentType.includes("markdown")
    ) {
      const text = await response.text();
      // Limit to ~8000 chars to stay within token limits
      return text.slice(0, 8000);
    }

    // For PDFs and other binary docs, we can't extract text directly in Deno easily
    // Return null so the AI uses the metadata instead
    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      title,
      description,
      subject,
      difficulty,
      estimatedHours,
      gradeLevel,
      resourceContent,
      resourceUrl,
      resourceTitle,
    } = await req.json();

    if (!title?.trim() || !subject?.trim()) {
      return json({ success: false, error: "Title and subject are required." }, 400);
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return json({ success: false, error: "AI gateway is not configured." }, 500);
    }

    // Try to fetch file content if a URL is provided and no content was passed
    let fileContent = resourceContent || null;
    if (!fileContent && resourceUrl) {
      fileContent = await fetchFileContent(resourceUrl);
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
- Create 4 to 8 modules in a strong teaching sequence.
- Keep each module practical and age-appropriate for the grade level.
- Resources must be concise learning activities, readings, or exercises (3-5 per module). Each resource string should be a clear topic title that can be expanded into a full lesson.
- Quizzes must be short assessment topic titles (1-2 per module) that test understanding of the module content.
- suggestedTags should contain 3 to 6 short tags.
- Tailor language complexity and content depth to the specified grade level and difficulty.
${fileContent ? "- IMPORTANT: The user has provided actual document/file content below. Base the learning path heavily on the specific topics, concepts, and material found in this content. Cover the material thoroughly and in a logical teaching order." : ""}`;

    let userPrompt = `Build a learning path.
Title: ${title}
Subject: ${subject}
Difficulty: ${difficulty || "beginner"}
Grade Level: ${gradeLevel || "self-learner"}
Estimated hours: ${estimatedHours || 10}
Description: ${description || ""}`;

    if (resourceTitle) {
      userPrompt += `\nSource Resource: ${resourceTitle}`;
    }

    if (fileContent) {
      userPrompt += `\n\n--- DOCUMENT CONTENT (base the learning path on this material) ---\n${fileContent}\n--- END DOCUMENT CONTENT ---`;
    } else if (resourceUrl) {
      userPrompt += `\nResource URL: ${resourceUrl} (could not extract content, use the title and description to infer topics)`;
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
