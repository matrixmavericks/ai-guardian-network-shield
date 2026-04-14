import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserIdFromAuthHeader, logAiUsage } from "../_shared/aiUsage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-2.5-flash";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CURRICULUM_CONTEXT: Record<string, string> = {
  ib: "IB (International Baccalaureate) curriculum. Use IB command terms (State, Explain, Evaluate, Discuss, Analyse). Follow IB assessment criteria and markband descriptors. Reference IB syllabus objectives. Include TOK connections where relevant.",
  ap: "AP (Advanced Placement / College Board) curriculum. Format questions like AP free-response and multiple choice. Reference the AP exam format. Include AP-style scoring rubrics.",
  igcse: "Cambridge IGCSE curriculum. Use IGCSE assessment objectives (AO1: Knowledge, AO2: Understanding, AO3: Analysis). Include past-paper style questions. Follow Cambridge mark scheme format.",
  a_levels: "GCE A-Level curriculum. Structure content around A-Level specification points. Include synoptic connections. Use exam-board style mark schemes.",
  cbse: "CBSE curriculum. Align with NCERT guidelines. Include HOTS questions. Follow CBSE marking scheme format.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "Unauthorized" }, 401);

    const requesterUserId = await getUserIdFromAuthHeader(authHeader);
    const { type, courseTitle, curriculumType, subject, level, topicTitle, topicDescription, topicCode } = await req.json();

    if (!topicTitle?.trim()) return json({ success: false, error: "Topic is required." }, 400);

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) return json({ success: false, error: "AI gateway not configured." }, 500);

    const currCtx = CURRICULUM_CONTEXT[curriculumType] || `${curriculumType} curriculum standards.`;
    const courseCtx = `Course: ${courseTitle}\nCurriculum: ${curriculumType?.toUpperCase() || 'General'} ${level || ''}\nSubject: ${subject}\nTopic: ${topicCode ? topicCode + ' - ' : ''}${topicTitle}\nDescription: ${topicDescription || ''}`;

    let systemPrompt: string;
    let responseFormat = { type: "json_object" as const };

    if (type === "cheatsheet") {
      systemPrompt = `You are an expert ${curriculumType?.toUpperCase() || ''} ${subject} teacher creating a comprehensive study cheatsheet. Follow the ${currCtx}

Create a detailed, beautifully formatted markdown cheatsheet for the given topic. Include:
- Key definitions and concepts with precise ${curriculumType?.toUpperCase() || ''} terminology
- Important formulas, equations, or rules (use Unicode: × ÷ ² ³ √ π ∑ ≤ ≥ ≠, NOT LaTeX)
- Worked examples with step-by-step solutions
- Common exam mistakes to avoid
- Quick-reference tables where applicable
- Exam tips specific to ${curriculumType?.toUpperCase() || 'this'} papers
- Connections to other topics in the syllabus

Return valid JSON: { "content": "markdown string" }`;
    } else if (type === "flashcards") {
      systemPrompt = `You are an expert ${curriculumType?.toUpperCase() || ''} ${subject} teacher creating flashcards for spaced repetition study. Follow the ${currCtx}

CRITICAL: Use Unicode for math (× ÷ ² ³ √ π), NOT LaTeX.

Create 15-20 flashcards covering all key concepts, definitions, formulas, and exam-relevant facts for the topic. Mix difficulty levels.

Return valid JSON:
{
  "flashcards": [
    { "front": "question or prompt", "back": "answer or explanation" }
  ]
}`;
    } else if (type === "mock_exam") {
      systemPrompt = `You are an expert ${curriculumType?.toUpperCase() || ''} ${subject} examiner creating assessment questions. Follow the ${currCtx}

CRITICAL: Use Unicode for math (× ÷ ² ³ √ π), NOT LaTeX.

Create 8-10 exam-style multiple choice questions that mirror REAL ${curriculumType?.toUpperCase() || ''} past paper questions. Include:
- A mix of difficulty (easy to challenging)
- Questions that test different assessment objectives
- Detailed explanations referencing the mark scheme
- ${curriculumType === 'ib' ? 'IB command terms in the questions' : curriculumType === 'ap' ? 'AP-style question formats' : curriculumType === 'igcse' ? 'Cambridge past-paper style questions' : 'Standard exam-style questions'}

Return valid JSON:
{
  "questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "string with mark scheme reference",
      "difficulty": "easy|medium|hard",
      "marks": number
    }
  ]
}`;
    } else {
      return json({ success: false, error: "Invalid type. Use cheatsheet, flashcards, or mock_exam." }, 400);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: courseCtx },
        ],
        response_format: responseFormat,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("generate-course-study-content gateway error", response.status, errorText);
      if (response.status === 429) return json({ success: false, error: "Rate limit reached. Try again shortly." }, 429);
      if (response.status === 402) return json({ success: false, error: "AI credits required." }, 402);
      return json({ success: false, error: "AI generation failed." }, 500);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return json({ success: false, error: "AI returned empty content." }, 500);

    await logAiUsage({
      userId: requesterUserId,
      model: MODEL,
      aiData: data,
      promptSource: `${systemPrompt}\n\n${courseCtx}`,
      completionSource: content,
    });

    const parsed = JSON.parse(content);
    return json({ success: true, ...parsed });
  } catch (error) {
    console.error("generate-course-study-content error", error);
    return json({
      success: false,
      error: error instanceof Error && error.name === "AbortError"
        ? "Generation timed out."
        : error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
