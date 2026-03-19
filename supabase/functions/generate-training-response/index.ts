import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserIdFromAuthHeader, logAiUsage } from "../_shared/aiUsage.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL = "google/gemini-2.5-flash";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requesterUserId = await getUserIdFromAuthHeader(req.headers.get("Authorization"));
    const { inputPrompt, subject, action } = await req.json();
    console.log('AI Training request:', { inputPrompt, subject, action });

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    createClient(supabaseUrl, supabaseKey);

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'generate-response') {
      systemPrompt = `You are an AI trained to create process-oriented, educational responses. Your goal is to transform direct-answer requests into learning opportunities.

CRITICAL MATH FORMATTING: NEVER use LaTeX/dollar-sign notation ($x^2$, \\frac{}, etc). Use Unicode symbols: × ÷ ² ³ √ π ∑ ≤ ≥ ≠. Write fractions as a/b. Write exponents as x², x³. Use plain text for all math.

Your responses should:
1. NEVER give the direct answer immediately
2. Break down the problem into understandable steps
3. Guide the student through the reasoning process
4. Ask reflective questions to encourage critical thinking
5. Explain the underlying concepts and principles
6. End with a verification question to ensure understanding

Subject area: ${subject || 'General'}`;

      userPrompt = `A student asked: "${inputPrompt}"

Generate an ideal process-teaching response that guides the student through discovering the answer themselves rather than just giving it to them. Make it educational, encouraging, and age-appropriate.`;
    } else if (action === 'analyze-prompt') {
      systemPrompt = `You are an educational AI ethics analyzer. Your job is to analyze student prompts and identify potential issues with academic integrity or requests that bypass learning.

Analyze prompts for:
1. Direct answer seeking (e.g., "What is X+Y?")
2. Homework/essay completion requests
3. Cheating or plagiarism attempts
4. Requests that bypass the learning process

Provide your analysis as JSON with this format:
{
  "isProblematic": boolean,
  "issues": ["issue1", "issue2"],
  "severity": "low" | "medium" | "high",
  "suggestedRewrite": "optional rewritten version that encourages learning",
  "explanation": "why this prompt is or isn't problematic"
}`;

      userPrompt = `Analyze this student prompt for potential academic integrity issues: "${inputPrompt}"

Return ONLY valid JSON.`;
    }

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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires payment.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content || '';
    let result: unknown = rawContent;

    if (action === 'analyze-prompt') {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const candidate = jsonMatch ? jsonMatch[1].trim() : rawContent;
      try {
        result = JSON.parse(candidate);
      } catch {
        console.error('Failed to parse analysis:', rawContent);
      }
    }

    await logAiUsage({
      userId: requesterUserId,
      model: MODEL,
      aiData: data,
      promptSource: `${systemPrompt}\n\n${userPrompt}`,
      completionSource: typeof result === 'string' ? result : JSON.stringify(result),
    });

    console.log('AI training response generated');

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-training-response:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});