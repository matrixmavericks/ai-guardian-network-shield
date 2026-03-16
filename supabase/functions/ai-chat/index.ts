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

// Approximate cost per 1M tokens for Gemini 3 Flash Preview (USD)
const COST_PER_1M_INPUT = 0.10;
const COST_PER_1M_OUTPUT = 0.40;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, serviceKey);
}

async function checkQuota(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const adminClient = getAdminClient();
  
  // Get the most restrictive quota for this student
  const { data: quotas } = await adminClient
    .from('ai_usage_quotas')
    .select('monthly_limit_usd')
    .eq('student_id', userId);

  if (!quotas || quotas.length === 0) return { allowed: true };

  const lowestLimit = Math.min(...quotas.map((q: any) => Number(q.monthly_limit_usd)));

  // Get current month's usage
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const { data: usage } = await adminClient
    .from('ai_usage_logs')
    .select('estimated_cost_usd')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth);

  const totalUsed = (usage || []).reduce((sum: number, r: any) => sum + Number(r.estimated_cost_usd), 0);

  if (totalUsed >= lowestLimit) {
    return { allowed: false, reason: `You've reached your monthly AI usage limit ($${lowestLimit.toFixed(2)}). Please contact your teacher.` };
  }
  return { allowed: true };
}

async function getSchoolSettings(userId: string): Promise<any | null> {
  const adminClient = getAdminClient();
  
  // Find user's school via school_members
  const { data: membership } = await adminClient
    .from('school_members')
    .select('school_id')
    .eq('user_id', userId)
    .limit(1);
  
  if (!membership || membership.length === 0) return null;
  
  const { data: settings } = await adminClient
    .from('school_ai_settings')
    .select('*')
    .eq('school_id', membership[0].school_id)
    .maybeSingle();
  
  return settings;
}

async function getSchoolTrainingExamples(trainingDataIds: string[]): Promise<string> {
  if (!trainingDataIds || trainingDataIds.length === 0) return '';
  const adminClient = getAdminClient();
  
  const { data } = await adminClient
    .from('model_training_data')
    .select('input_prompt, ideal_response, subject, grade_level')
    .in('id', trainingDataIds)
    .eq('approved', true);
  
  if (!data || data.length === 0) return '';
  
  return '\n\nSCHOOL TRAINING EXAMPLES (use these as reference for tone and style):\n' +
    data.map((d: any) => `- Student asks: "${d.input_prompt}"\n  Ideal response: "${d.ideal_response}"`).join('\n');
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
  let resourceContext: string | null;

  try {
    const body = await req.json();
    prompt = (body.prompt || '').trim();
    subject = body.subject || 'general';
    gradeLevel = body.gradeLevel || 'high-school';
    processTeaching = body.processTeaching !== false;
    sessionId = body.sessionId || null;
    resourceContext = body.resourceContext || null;
  } catch {
    return json({ success: false, reply: FALLBACK_REPLY, error: 'Invalid request body', meta: null }, 400);
  }

  if (!prompt) {
    return json({ success: false, reply: 'Please enter a question.', error: 'Empty prompt', meta: null }, 400);
  }

  // --- Quota check ---
  if (userId) {
    try {
      const quotaResult = await checkQuota(userId);
      if (!quotaResult.allowed) {
        return json({ success: false, reply: quotaResult.reason!, error: 'quota_exceeded', meta: null }, 429);
      }
    } catch (e) {
      console.error('Quota check failed (non-fatal):', e);
    }
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
    effectivePrompt = `The student asked: "${prompt}". Instead of giving them the direct answer, guide them through the thinking process step by step. Ask them guiding questions to help them discover the answer themselves. Focus on teaching the underlying concepts.`;
  }

  // --- School settings enforcement ---
  let schoolSettings: any = null;
  let schoolTrainingContext = '';
  
  if (userId) {
    try {
      schoolSettings = await getSchoolSettings(userId);
      if (schoolSettings) {
        // Check if student chat is allowed
        if (schoolSettings.allow_student_chat === false) {
          return json({ success: false, reply: 'AI chat is not enabled for your school. Please contact your administrator.', error: 'school_chat_disabled', meta: null }, 403);
        }
        
        // Check subject restrictions
        if (schoolSettings.subject_restrictions && schoolSettings.subject_restrictions.length > 0) {
          if (!schoolSettings.subject_restrictions.includes(subject)) {
            return json({ success: false, reply: `AI chat is only available for the following subjects at your school: ${schoolSettings.subject_restrictions.join(', ')}. You selected "${subject}".`, error: 'subject_restricted', meta: null }, 403);
          }
        }
        
        // Check school-level blocked keywords
        if (schoolSettings.blocked_keywords && schoolSettings.blocked_keywords.length > 0) {
          const schoolFlagged = schoolSettings.blocked_keywords.filter((kw: string) => lowerPrompt.includes(kw.toLowerCase()));
          if (schoolFlagged.length > 0) {
            moderationStatus = 'rewritten';
            severity = 'high';
            effectivePrompt = `The student asked: "${prompt}". This prompt contains restricted content per school policy. Instead of giving them the direct answer, guide them through the thinking process step by step.`;
          }
        }
        
        // Load school training examples
        if (schoolSettings.custom_model_training_data_ids && schoolSettings.custom_model_training_data_ids.length > 0) {
          schoolTrainingContext = await getSchoolTrainingExamples(schoolSettings.custom_model_training_data_ids);
        }
      }
    } catch (e) {
      console.error('School settings check failed (non-fatal):', e);
    }
  }

  // --- Moderation (keyword-based, after school check) ---

  // --- Build system prompt ---
  let systemMessage = schoolSettings?.custom_system_prompt 
    ? `${schoolSettings.custom_system_prompt}\n\nSubject: ${subject}. Grade level: ${gradeLevel}.`
    : `You are an educational AI assistant. Subject: ${subject}. Grade level: ${gradeLevel}.`;
  
  systemMessage += `
Use markdown formatting. Use **bold** for key terms. Use bullet points and numbered lists. Keep explanations clear and age-appropriate.

CRITICAL MATH FORMATTING RULES:
- NEVER use LaTeX notation like $x^2$, \\frac{}, \\sqrt{}, or any dollar-sign math syntax.
- Use Unicode symbols instead: × (multiply), ÷ (divide), ² ³ (superscripts), √ (square root), π, ∑, ∫, ≤, ≥, ≠, ∞, θ, α, β, Δ.
- Write fractions as a/b or use "numerator over denominator" phrasing.
- Write exponents inline: x², x³, or "x to the power of n".
- For equations, write them on their own line in plain text, e.g.: "Area = π × r²"
- For complex formulas, use code blocks with plain text formatting.`;

  const forceProcessMode = schoolSettings?.process_mode_enabled === true;
  if (processTeaching || forceProcessMode || moderationStatus === 'rewritten') {
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

  const subjectInstructions: Record<string, string> = {
    math: '\nFor math: Show steps clearly, explain reasoning, use proper notation.',
    writing: '\nFor writing: Focus on structure, thesis development, original thought.',
    languages: '\nFor languages: Help with grammar rules, translation concepts, cultural context.',
    science: '\nFor science: Explain with evidence-based reasoning, encourage hypothesis formation.',
  };
  if (subjectInstructions[subject]) {
    systemMessage += subjectInstructions[subject];
  }

  // Add resource context if provided
  if (resourceContext) {
    systemMessage += `\n\nThe student is referencing the following class resource:\n${resourceContext}\nUse this context to provide more relevant and targeted assistance.`;
  }

  // Add school training examples
  if (schoolTrainingContext) {
    systemMessage += schoolTrainingContext;
  }

  // --- Call AI with timeout ---
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    return json({ success: false, reply: FALLBACK_REPLY, error: 'AI service not configured', meta: null }, 500);
  }

  let responseText = '';
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: (schoolSettings?.allowed_ai_models?.length > 0 ? schoolSettings.allowed_ai_models[0] : 'google/gemini-3-flash-preview'),
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
    
    // Extract token usage if available
    if (aiData?.usage) {
      promptTokens = aiData.usage.prompt_tokens || 0;
      completionTokens = aiData.usage.completion_tokens || 0;
    } else {
      // Estimate tokens (~4 chars per token)
      promptTokens = Math.ceil((systemMessage.length + effectivePrompt.length) / 4);
      completionTokens = Math.ceil((responseText.length) / 4);
    }
  } catch (err) {
    console.error('AI call failed:', err);
  }

  if (!responseText || responseText.trim().length === 0) {
    responseText = FALLBACK_REPLY;
  }

  // --- Log to prompt_logs + ai_usage_logs (best-effort) ---
  if (userId) {
    try {
      const adminClient = getAdminClient();
      const totalTokens = promptTokens + completionTokens;
      const estimatedCost = (promptTokens / 1_000_000) * COST_PER_1M_INPUT + (completionTokens / 1_000_000) * COST_PER_1M_OUTPUT;

      // Log usage
      await adminClient.from('ai_usage_logs').insert({
        user_id: userId,
        session_id: sessionId || null,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCost,
        model: (schoolSettings?.allowed_ai_models?.length > 0 ? schoolSettings.allowed_ai_models[0] : 'google/gemini-3-flash-preview'),
      });

      // Log prompt
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
      console.error('Logging failed (non-fatal):', logErr);
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
