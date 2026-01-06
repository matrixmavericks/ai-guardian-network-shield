import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, prompt, targetClass, title } = await req.json();
    console.log('Generating teaching plan:', { subject, prompt, targetClass, title });

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert educational curriculum designer. Create detailed, practical teaching plans that educators can immediately use in their classrooms.

Your teaching plans should include:
1. Clear learning objectives aligned with educational standards
2. Weekly or daily lesson breakdowns with specific activities
3. Differentiated instruction strategies for diverse learners
4. Assessment strategies (formative and summative)
5. Required materials and resources
6. Extension activities for advanced students
7. Support strategies for struggling students

Format the plan in clear markdown with headers, bullet points, and organized sections.`;

    const userPrompt = `Create a comprehensive teaching plan for the following:

Subject: ${subject}
${targetClass ? `Target Class/Grade: ${targetClass}` : ''}
${title ? `Plan Title: ${title}` : ''}

Teacher's Request:
${prompt}

Please generate a detailed, actionable teaching plan that the teacher can implement immediately.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires payment. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedPlan = data.choices[0].message.content;

    console.log('Teaching plan generated successfully');

    return new Response(
      JSON.stringify({ plan: generatedPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating teaching plan:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
