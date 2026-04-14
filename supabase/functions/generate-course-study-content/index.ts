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
  ib: "IB (International Baccalaureate) curriculum. Use IB command terms (State, Explain, Evaluate, Discuss, Analyse, Compare, Contrast, Outline, Describe, Justify, Suggest, To what extent). Follow IB assessment criteria and markband descriptors. Reference IB syllabus objectives. Include TOK connections where relevant.",
  ap: "AP (Advanced Placement / College Board) curriculum. Format questions like AP free-response and multiple choice. Reference the AP exam format. Include AP-style scoring rubrics. Use the AP scoring guidelines (1-5 scale).",
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

    if (type === "cheatsheet") {
      systemPrompt = `You are an expert ${curriculumType?.toUpperCase() || ''} ${subject} teacher creating a comprehensive study cheatsheet. Follow the ${currCtx}

Create a detailed, beautifully formatted markdown cheatsheet for the given topic. The cheatsheet must be COMPREHENSIVE and DETAILED (at least 1500 words). Include ALL of these sections:

## 📋 Key Definitions
- Every important term with precise ${curriculumType?.toUpperCase() || ''} terminology

## 📐 Important Formulas & Rules  
- All relevant formulas using Unicode (× ÷ ² ³ √ π ∑ ≤ ≥ ≠), NOT LaTeX
- Clearly labeled with when to use each

## 🔍 Worked Examples
- At least 3 detailed step-by-step worked examples with solutions
- Show every step clearly

## ⚠️ Common Mistakes to Avoid
- List of frequent exam errors students make
- How to avoid each one

## 📊 Quick Reference Tables
- Summary tables for quick revision

## 💡 Exam Tips
- Specific tips for ${curriculumType?.toUpperCase() || 'this'} exams
- ${curriculumType === 'ib' ? 'IB command term guidance: what each command term expects' : curriculumType === 'ap' ? 'AP FRQ strategies and common scoring rubric points' : 'Key mark scheme language to use in answers'}
- Time management advice

## 🔗 Connections to Other Topics
- How this topic links to other areas of the syllabus

Return valid JSON: { "content": "markdown string" }`;
    } else if (type === "flashcards") {
      systemPrompt = `You are an expert ${curriculumType?.toUpperCase() || ''} ${subject} teacher creating flashcards for spaced repetition study. Follow the ${currCtx}

CRITICAL: Use Unicode for math (× ÷ ² ³ √ π), NOT LaTeX.

Create 20 flashcards covering ALL key concepts, definitions, formulas, and exam-relevant facts for the topic. Mix difficulty levels. Include:
- Definition cards
- Formula cards  
- Application/example cards
- ${curriculumType === 'ib' ? 'IB command term cards (e.g. "What does Evaluate mean in IB?")' : 'Exam technique cards'}

Return valid JSON:
{
  "flashcards": [
    { "front": "question or prompt", "back": "answer or explanation" }
  ]
}`;
    } else if (type === "mock_exam") {
      systemPrompt = `You are an expert ${curriculumType?.toUpperCase() || ''} ${subject} examiner creating assessment questions. Follow the ${currCtx}

CRITICAL: Use Unicode for math (× ÷ ² ³ √ π), NOT LaTeX.

Create 10 exam-style multiple choice questions that mirror REAL ${curriculumType?.toUpperCase() || ''} past paper questions. Include:
- A mix of difficulty (3 easy, 4 medium, 3 hard)
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
    } else if (type === "frq") {
      systemPrompt = `You are an expert ${curriculumType?.toUpperCase() || ''} ${subject} examiner creating free-response / structured exam questions. Follow the ${currCtx}

CRITICAL: Use Unicode for math (× ÷ ² ³ √ π), NOT LaTeX.

Create 5 free-response questions that mirror REAL ${curriculumType?.toUpperCase() || ''} past paper questions. These should be structured questions with multiple parts (a, b, c, etc.).

${curriculumType === 'ib' ? 'Use IB command terms appropriately (State [1 mark], Explain [2-3 marks], Evaluate [4-5 marks], Discuss [5-6 marks], Analyse [4-5 marks]). Include mark allocations matching IB paper format.' : ''}
${curriculumType === 'ap' ? 'Format like AP Free Response Questions with clear part labels. Include scoring guidelines matching the AP rubric format.' : ''}
${curriculumType === 'igcse' ? 'Format like Cambridge structured questions with mark allocations. Use Cambridge assessment objectives (AO1, AO2, AO3).' : ''}
${curriculumType === 'a_levels' ? 'Format like A-Level structured/essay questions with mark allocations and assessment objective references.' : ''}
${curriculumType === 'cbse' ? 'Format like CBSE board exam questions including HOTS (Higher Order Thinking Skills) questions. Include mark allocations.' : ''}

Include:
- Mix of short-answer and extended-response parts
- Mark allocations for each part
- Total marks per question (ranging from 6-15 marks)
- Detailed model answers / marking scheme for each part
- Examiner tips

Return valid JSON:
{
  "questions": [
    {
      "question": "Main question stem",
      "totalMarks": number,
      "parts": [
        {
          "label": "a",
          "text": "Part question text with command term",
          "marks": number,
          "commandTerm": "State|Explain|Evaluate|Discuss|etc",
          "modelAnswer": "Detailed model answer",
          "examinerTip": "What examiners look for"
        }
      ],
      "difficulty": "easy|medium|hard",
      "topic": "specific sub-topic tested"
    }
  ]
}`;
    } else if (type === "notes") {
      systemPrompt = `You are an expert ${curriculumType?.toUpperCase() || ''} ${subject} teacher creating comprehensive study notes. Follow the ${currCtx}

CRITICAL: Use Unicode for math (× ÷ ² ³ √ π), NOT LaTeX.

Create DETAILED, comprehensive study notes for the given topic (at least 2000 words). These notes should be like a complete textbook chapter covering everything a student needs to know. Include:

## 📖 Introduction
- Context and importance of this topic

## 📝 Detailed Content
- Every key concept explained clearly with examples
- Step-by-step explanations
- Diagrams described in text where relevant

## 🧮 Worked Examples  
- At least 4 fully worked examples showing different question types

## 📌 Key Vocabulary
- All important terms defined

## 🎯 Learning Objectives Covered
- Which ${curriculumType?.toUpperCase() || ''} syllabus objectives this covers

## ✅ Self-Check Questions
- 5 questions students can use to test their understanding (with answers)

Return valid JSON: { "content": "markdown string" }`;
    } else {
      return json({ success: false, error: "Invalid type. Use cheatsheet, flashcards, mock_exam, frq, or notes." }, 400);
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
        response_format: { type: "json_object" as const },
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

    // Robust JSON parsing: the AI sometimes returns raw control chars inside JSON string values
    function safeJsonParse(raw: string): any {
      // First attempt: direct parse
      try { return JSON.parse(raw); } catch {}
      // Second attempt: fix control chars inside string values only
      // Replace unescaped control chars (except already-escaped sequences)
      const fixed = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      try { return JSON.parse(fixed); } catch {}
      // Third attempt: newlines/tabs inside strings — escape them
      const escaped = fixed.replace(
        /"(?:[^"\\]|\\.)*"/g,
        (match) => match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
      );
      try { return JSON.parse(escaped); } catch {}
      // Fourth attempt: extract from code fences
      const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) return safeJsonParse(fenceMatch[1]);
      throw new Error("AI returned invalid JSON");
    }
    const parsed = safeJsonParse(content);
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
