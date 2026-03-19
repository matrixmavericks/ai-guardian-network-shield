import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { logAiUsage } from "../_shared/aiUsage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function chunkedBtoa(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (const b of chunk) binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

async function ocrViaVision(fileBytes: Uint8Array, mimeType: string, apiKey: string): Promise<string> {
const MODEL = "google/gemini-3-flash-preview";

  const b64 = chunkedBtoa(fileBytes);
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract ALL text content from this document/image. Return the full text verbatim. If it's code, preserve formatting. If it's a presentation, list each slide's content." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } },
          ],
        },
      ],
    }),
  });
  if (!resp.ok) return "";
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const authUserId = await getUserIdFromAuthHeader(authHeader);
    const { submissionId } = await req.json();
    if (!submissionId) return json({ success: false, error: "submissionId required" }, 400);

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!lovableApiKey) return json({ success: false, error: "AI not configured" }, 500);

    const sb = createClient(supabaseUrl, serviceKey);

    // Fetch submission
    const { data: submission, error: fetchErr } = await sb
      .from("capstone_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();
    if (fetchErr || !submission) return json({ success: false, error: "Submission not found" }, 404);

    // Fetch learning path for context
    const { data: path } = await sb
      .from("learning_paths")
      .select("title, subject, difficulty, modules, description")
      .eq("id", submission.path_id)
      .single();

    // Extract file content if present
    let fileContent = "";
    if (submission.file_url) {
      try {
        const pathParts = submission.file_url.split("/storage/v1/object/public/");
        let storagePath = "";
        if (pathParts.length > 1) {
          const rest = decodeURIComponent(pathParts[1]);
          const slashIdx = rest.indexOf("/");
          const bucket = rest.slice(0, slashIdx);
          const filePath = rest.slice(slashIdx + 1);
          const { data: fileData } = await sb.storage.from(bucket).download(filePath);
          if (fileData) {
            const bytes = new Uint8Array(await fileData.arrayBuffer());
            const ext = (submission.file_name || "").split(".").pop()?.toLowerCase() || "";
            const mimeMap: Record<string, string> = {
              pdf: "application/pdf", png: "image/png", jpg: "image/jpeg",
              jpeg: "image/jpeg", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              py: "text/plain", js: "text/plain", ts: "text/plain", tsx: "text/plain",
              jsx: "text/plain", html: "text/plain", css: "text/plain", txt: "text/plain",
              csv: "text/plain", json: "text/plain", md: "text/plain",
            };
            const mime = mimeMap[ext] || "application/octet-stream";
            if (mime.startsWith("text/")) {
              fileContent = new TextDecoder().decode(bytes).slice(0, 15000);
            } else {
              fileContent = await ocrViaVision(bytes, mime, lovableApiKey);
            }
          }
        }
      } catch (e) {
        console.error("File extraction error:", e);
      }
    }

    // Build evaluation prompt
    const moduleNames = Array.isArray(path?.modules)
      ? (path.modules as any[]).map((m: any) => m.title).join(", ")
      : "N/A";

    const systemPrompt = `You are an expert academic evaluator. Evaluate the student's capstone project submission for the learning path described below.

Learning Path: ${path?.title || "Unknown"}
Subject: ${path?.subject || "General"}
Difficulty: ${path?.difficulty || "beginner"}
Modules covered: ${moduleNames}

Evaluate across these rubric criteria and return a JSON object:
{
  "overallScore": <0-100>,
  "criteria": [
    { "name": "Understanding & Mastery", "score": <0-100>, "feedback": "..." },
    { "name": "Technical Accuracy", "score": <0-100>, "feedback": "..." },
    { "name": "Creativity & Originality", "score": <0-100>, "feedback": "..." },
    { "name": "Completeness", "score": <0-100>, "feedback": "..." },
    { "name": "Presentation Quality", "score": <0-100>, "feedback": "..." }
  ],
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "summary": "A 2-3 sentence overall assessment."
}

Be thorough but encouraging. Identify specific strengths and actionable improvements.`;

    let userPrompt = "Student's capstone submission:\n\n";
    if (submission.text_content) userPrompt += `--- TEXT CONTENT ---\n${submission.text_content}\n\n`;
    if (submission.external_link) userPrompt += `--- EXTERNAL LINK ---\n${submission.external_link}\n\n`;
    if (fileContent) userPrompt += `--- FILE CONTENT (${submission.file_name}) ---\n${fileContent.slice(0, 20000)}\n\n`;
    if (!submission.text_content && !submission.external_link && !fileContent) {
      userPrompt += "(No content was provided or could be extracted)";
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      if (aiResp.status === 429) return json({ success: false, error: "Rate limited, try again shortly." }, 429);
      if (aiResp.status === 402) return json({ success: false, error: "AI credits required." }, 402);
      return json({ success: false, error: "AI evaluation failed." }, 500);
    }

    const aiData = await aiResp.json();
    const content = aiData?.choices?.[0]?.message?.content;
    const feedback = JSON.parse(content);

    // Update submission with AI feedback
    await sb
      .from("capstone_submissions")
      .update({
        ai_feedback: feedback,
        ai_score: feedback.overallScore ?? null,
        status: "ai_reviewed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    return json({ success: true, feedback });
  } catch (error) {
    console.error("evaluate-capstone error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
