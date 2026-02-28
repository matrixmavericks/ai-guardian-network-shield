import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, subject, gradeLevel, processTeaching } = await req.json();
    console.log('AI Chat request:', { prompt, subject, gradeLevel, processTeaching });

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Blocked keywords check (inline, no external call needed for basic check)
    const blockedKeywords = [
      'write my essay', 'do my homework', 'give me the answer',
      'solve this for me', 'cheat', 'plagiarize', 'copy paste'
    ];

    const lowerPrompt = prompt.toLowerCase();
    const flaggedKeywords = blockedKeywords.filter(kw => lowerPrompt.includes(kw));

    if (flaggedKeywords.length > 0) {
      return new Response(
        JSON.stringify({
          blocked: true,
          reason: 'This prompt appears to request direct answers or academic dishonesty. Please rephrase to focus on learning the concept.',
          flaggedKeywords,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system message based on subject and teaching mode
    let systemMessage = `You are an educational AI assistant helping students learn. Current subject: ${subject || 'general'}. Grade level: ${gradeLevel || 'not specified'}.

Important formatting rules:
- Use markdown formatting in your responses
- Use **bold** for key terms
- Use bullet points and numbered lists for steps
- Use code blocks for math expressions when appropriate
- Keep explanations clear and age-appropriate`;

    if (processTeaching) {
      systemMessage += `

IMPORTANT: You are in Process Teaching Mode. Follow these rules:
1. NEVER give direct answers to questions
2. Break down problems into step-by-step learning opportunities
3. Ask guiding questions to help the student think through the problem
4. Explain the underlying concepts and principles
5. Encourage the student to discover the answer themselves
6. Use the Socratic method - ask questions that lead to understanding`;
    } else {
      systemMessage += `

Provide helpful, educational responses. You can give direct answers but always explain the reasoning and concepts behind them.`;
    }

    // Add subject-specific instructions
    switch (subject) {
      case 'math':
        systemMessage += '\n\nFor math: Show steps clearly, explain mathematical reasoning, and use proper notation.';
        break;
      case 'writing':
        systemMessage += '\n\nFor writing: Focus on structure, thesis development, and original thought. Guide their writing process.';
        break;
      case 'languages':
        systemMessage += '\n\nFor languages: Help with translation concepts, grammar rules, and cultural context.';
        break;
      case 'science':
        systemMessage += '\n\nFor science: Explain phenomena with evidence-based reasoning, encourage hypothesis formation.';
        break;
    }

    console.log('Calling Lovable AI');

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
          { role: 'user', content: prompt }
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
    const responseText = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: responseText }),
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
