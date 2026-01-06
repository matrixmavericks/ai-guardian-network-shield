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
    const { prompt, subject, gradeLevel, userId, processTeaching } = await req.json();
    console.log('AI Chat request:', { prompt, subject, gradeLevel, userId, processTeaching });

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, moderate the prompt
    const moderateResponse = await fetch(`${supabaseUrl}/functions/v1/moderate-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ prompt, subject, gradeLevel, userId }),
    });

    const moderationResult = await moderateResponse.json();
    console.log('Moderation result:', moderationResult);

    // If blocked, return the moderation result
    if (moderationResult.blocked) {
      return new Response(
        JSON.stringify({ 
          blocked: true, 
          reason: moderationResult.reason,
          flaggedKeywords: moderationResult.flaggedKeywords 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the (potentially rewritten) prompt
    const finalPrompt = moderationResult.modifiedPrompt || prompt;

    // Build system message based on subject and teaching mode
    let systemMessage = `You are an educational AI assistant helping students learn. Current subject: ${subject || 'general'}. Grade level: ${gradeLevel || 'not specified'}.`;
    
    if (processTeaching) {
      systemMessage += `
      
IMPORTANT: You are in Process Teaching Mode. Follow these rules:
1. NEVER give direct answers to questions
2. Break down problems into step-by-step learning opportunities
3. Ask guiding questions to help the student think through the problem
4. Explain the underlying concepts and principles
5. Encourage the student to discover the answer themselves
6. If they ask for a direct answer, redirect them to think about the process`;
    } else {
      systemMessage += `
      
Provide helpful, educational responses. While you can give direct answers, still try to explain concepts and help the student understand the reasoning.`;
    }

    // Add subject-specific instructions
    switch (subject) {
      case 'math':
        systemMessage += '\n\nFor math problems: Show steps clearly, explain mathematical reasoning, and help students understand the "why" behind each step.';
        break;
      case 'writing':
        systemMessage += '\n\nFor writing: Focus on essay structure, thesis development, and original thought. Never write content for them - guide their writing process.';
        break;
      case 'languages':
        systemMessage += '\n\nFor languages: Help with translation concepts, grammar rules, and cultural context. Encourage practice and repetition.';
        break;
    }

    console.log('Calling Lovable AI with system message');

    // Call Lovable AI for the response
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: finalPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires payment. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiResponseText = aiData.choices[0].message.content;

    console.log('AI response received, updating prompt log');

    // Update the prompt log with the response
    if (userId) {
      await supabase
        .from('prompt_logs')
        .update({ response: aiResponseText })
        .eq('user_id', userId)
        .eq('original_prompt', prompt)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponseText,
        wasRewritten: moderationResult.wasRewritten,
        originalPrompt: moderationResult.wasRewritten ? prompt : undefined,
        modifiedPrompt: moderationResult.wasRewritten ? finalPrompt : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-chat:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
