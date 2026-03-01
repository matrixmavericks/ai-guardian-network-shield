import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FALLBACK_REPLY = "I'm sorry, the AI is temporarily unavailable. Please try again in a moment.";

const BLOCKED_KEYWORDS = [
  'write my essay', 'do my homework', 'give me the answer',
  'solve this for me', 'cheat', 'plagiarize', 'copy paste',
  'give me the exact answer'
];

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth ---
  const authHeader = req.headers.get('Authorization');
  let userId: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace('Bearer ', '');
      const { data, error } = await supabase.auth.getClaims(token);
      if (!error && data?.claims?.sub) {
        userId = data.claims.sub;
      }
    } catch (e) {
      console.error('Auth check failed:', e);
    }
  }

  // --- Parse body ---
  let prompt: string;
  let subject: string;
  let gradeLevel: string;
  let processTeaching: boolean;
  let sessionId: string | null;

  try {
    const body = await req.json();
    prompt = (body.prompt || '').trim();
    subject = body.subject || 'general';
    gradeLevel = body.gradeLevel || 'high-school';
    processTeaching = body.processTeaching !== false;
    sessionId = body.sessionId || null;
  } catch {
    return json({ success: false, reply: FALLBACK_REPLY, error: 'Invalid request body', meta: null }, 400);
  }

  if (!prompt) {
    return json({ success: false, reply: 'Please enter a question.', error: 'Empty prompt', meta: null }, 400);
  }

  // --- Moderation ---
  const lowerPrompt = prompt.toLowerCase();
  const flaggedKeywords = BLOCKED_KEYWORDS.filter(kw => lowerPrompt.includes(kw));
  let moderationStatus: 'approved' | 'rewritten' | 'flagged' = 'approved';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let effectivePrompt = prompt;

  if (flaggedKeywords.length > 0) {
    moderationStatus = 'rewritten';
    severity = flaggedKeywords.length >= 3 ? 'high' : 'medium';
    // Rewrite into process-learning prompt instead of blocking
    effectivePrompt = `The student asked: "${prompt}". Instead of giving them the direct answer, guide them through the thinking process step by step. Ask them guiding questions to help them discover the answer themselves. Focus on teaching the underlying concepts.`;
  }

  // --- Build system prompt ---
  let systemMessage = `You are an educational AI assistant. Subject: ${subject}. Grade level: ${gradeLevel}.
Use markdown formatting. Use **bold** for key terms. Use bullet points and numbered lists. Keep explanations clear and age-appropriate.`;

  if (processTeaching || moderationStatus === 'rewritten') {
    systemMessage += `
IMPORTANT: You are in Process Teaching Mode.
1. NEVER give direct answers
2. Break problems into step-by-step learning opportunities
3. Ask guiding questions
4. Explain underlying concepts
5. Encourage the student to discover the answer themselves`;
  } else {
    systemMessage += `\nProvide helpful, educational responses with clear explanations.`;
  }

  // Subject-specific instructions
  const subjectInstructions: Record<string, string> = {
    math: '\nFor math: Show steps clearly, explain reasoning, use proper notation.',
    writing: '\nFor writing: Focus on structure, thesis development, original thought.',
    languages: '\nFor languages: Help with grammar rules, translation concepts, cultural context.',
    science: '\nFor science: Explain with evidence-based reasoning, encourage hypothesis formation.',
  };
  if (subjectInstructions[subject]) {
    systemMessage += subjectInstructions[subject];
  }

  // --- Call AI with timeout ---
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    return json({ success: false, reply: FALLBACK_REPLY, error: 'AI service not configured', meta: null }, 500);
  }

  let responseText = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: effectivePrompt },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', status, errorText);

      if (status === 429) {
        return json({ success: false, reply: 'Rate limit exceeded. Please wait a moment and try again.', error: 'rate_limited', meta: null }, 429);
      }
      if (status === 402) {
        return json({ success: false, reply: 'AI service requires credits. Please contact your administrator.', error: 'payment_required', meta: null }, 402);
      }
      throw new Error(`AI gateway returned ${status}`);
    }

    const aiData = await aiResponse.json();
    responseText = aiData?.choices?.[0]?.message?.content || '';
  } catch (err) {
    console.error('AI call failed:', err);
  }

  // GUARANTEED non-empty reply
  if (!responseText || responseText.trim().length === 0) {
    responseText = FALLBACK_REPLY;
  }

  // --- Log to prompt_logs (best-effort, don't fail the response) ---
  if (userId) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminClient = createClient(supabaseUrl, serviceKey);

      await adminClient.from('prompt_logs').insert({
        user_id: userId,
        original_prompt: prompt,
        modified_prompt: moderationStatus === 'rewritten' ? effectivePrompt : null,
        response: responseText.substring(0, 500),
        status: moderationStatus === 'rewritten' ? 'rewritten' : moderationStatus === 'flagged' ? 'flagged' : 'approved',
        severity,
        subject,
        grade_level: gradeLevel,
        process_mode_enabled: processTeaching,
        flagged_keywords: flaggedKeywords.length > 0 ? flaggedKeywords : null,
        ai_engine: 'google',
      });
    } catch (logErr) {
      console.error('Prompt logging failed (non-fatal):', logErr);
    }
  }

  return json({
    success: true,
    reply: responseText,
    error: null,
    meta: {
      moderationStatus,
      severity,
      flaggedKeywords: flaggedKeywords.length > 0 ? flaggedKeywords : undefined,
    },
  });
});
