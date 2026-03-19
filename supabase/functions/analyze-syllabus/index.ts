import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserIdFromAuthHeader, logAiUsage } from "../_shared/aiUsage.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MODEL = "google/gemini-2.5-flash";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requesterUserId = await getUserIdFromAuthHeader(req.headers.get("Authorization"));
    const { syllabusText, subject, gradeLevel } = await req.json();

    if (!syllabusText?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Syllabus text is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert educational curriculum analyzer. Given a syllabus or curriculum document, extract and recommend specific learning path topics that a student should study.

CRITICAL MATH FORMATTING: NEVER use LaTeX/dollar-sign notation. Use Unicode symbols: × ÷ ² ³ √ π ∑ ≤ ≥ ≠. Write fractions as a/b. Write exponents as x², x³.

Return valid JSON only with this schema:
{
  "recommendations": [
    {
      "title": "string - a specific learning path title",
      "subject": "string - the subject area",
      "description": "string - 1-2 sentence description of what to learn",
      "difficulty": "beginner | intermediate | advanced",
      "estimatedHours": number,
      "priority": "high | medium | low",
      "reason": "string - why this topic is recommended based on the syllabus"
    }
  ],
  "syllabusAnalysis": {
    "mainSubjects": ["string"],
    "keyTopics": ["string"],
    "suggestedOrder": "string - brief recommendation on study order"
  }
}

Rules:
- Extract 5-10 concrete, actionable learning path topics from the syllabus
- Each recommendation should be specific enough to generate a full learning path
- Prioritize foundational topics first, then advanced ones
- Consider prerequisites and logical ordering
- Match difficulty to the grade level provided`;

    const userPrompt = `Analyze this syllabus and recommend learning path topics:

${subject ? `Subject: ${subject}` : ''}
${gradeLevel ? `Grade Level: ${gradeLevel}` : ''}

Syllabus Content:
${syllabusText.substring(0, 8000)}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit reached. Try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits are required for syllabus analysis.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI returned empty analysis.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await logAiUsage({
      userId: requesterUserId,
      model: MODEL,
      aiData: data,
      promptSource: `${systemPrompt}\n\n${userPrompt}`,
      completionSource: content,
    });

    const parsed = JSON.parse(content);

    return new Response(
      JSON.stringify({ success: true, ...parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('analyze-syllabus error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});