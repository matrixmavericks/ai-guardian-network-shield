import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, subject, gradeLevel, userId } = await req.json();
    console.log('Moderating prompt:', { prompt, subject, gradeLevel, userId });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get AI configuration
    const { data: config } = await supabase
      .from('ai_configurations')
      .select('*')
      .eq('ai_engine', 'openai')
      .eq('enabled', true)
      .single();

    // Check for blocked keywords
    const blockedKeywords = config?.blocked_keywords || [
      'write my essay',
      'do my homework',
      'give me the answer',
      'solve this for me',
      'cheat',
      'plagiarize'
    ];

    const flaggedKeywords = blockedKeywords.filter(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );

    let status: 'approved' | 'blocked' | 'rewritten' | 'flagged' = 'approved';
    let modifiedPrompt = prompt;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check if prompt should be blocked
    if (flaggedKeywords.length > 0) {
      status = 'blocked';
      severity = 'high';
      
      await supabase.from('prompt_logs').insert({
        user_id: userId,
        original_prompt: prompt,
        modified_prompt: null,
        response: null,
        status,
        severity,
        flagged_keywords: flaggedKeywords,
        subject,
        grade_level: gradeLevel,
        process_mode_enabled: false
      });

      return new Response(
        JSON.stringify({ 
          blocked: true, 
          reason: 'This prompt appears to be requesting direct answers. Please rephrase to focus on learning the concept.',
          flaggedKeywords 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process mode: Detect direct answer requests and rewrite
    const processMode = config?.process_mode_enabled !== false;
    const directAnswerPatterns = [
      /what is \d+[\+\-\*\/]\d+/i,
      /solve:?\s*\d+/i,
      /answer to:?/i,
      /result of:?/i,
    ];

    const needsProcessMode = directAnswerPatterns.some(pattern => pattern.test(prompt));

    if (processMode && needsProcessMode) {
      // Use Lovable AI to rewrite the prompt
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
      
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            {
              role: 'system',
              content: `You are an educational AI assistant. When students ask direct-answer questions, rewrite them into learning-focused prompts that encourage step-by-step thinking. Keep it concise and educational.`
            },
            {
              role: 'user',
              content: `Rewrite this student prompt to encourage learning: "${prompt}"`
            }
          ],
        }),
      });

      const aiData = await aiResponse.json();
      modifiedPrompt = aiData.choices[0].message.content;
      status = 'rewritten';
      severity = 'medium';
    }

    // Log the prompt
    await supabase.from('prompt_logs').insert({
      user_id: userId,
      original_prompt: prompt,
      modified_prompt: status === 'rewritten' ? modifiedPrompt : null,
      response: null,
      status,
      severity,
      flagged_keywords: [],
      subject,
      grade_level: gradeLevel,
      process_mode_enabled: processMode
    });

    return new Response(
      JSON.stringify({ 
        approved: true,
        modifiedPrompt: status === 'rewritten' ? modifiedPrompt : prompt,
        wasRewritten: status === 'rewritten',
        status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in moderate-prompt:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});