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
    const { title, description, subject, difficulty, estimatedHours } = await req.json();
    console.log('Generating learning path:', { title, subject, difficulty });

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert instructional designer specializing in creating structured learning paths. Your task is to generate comprehensive learning modules for educational courses.

For each module you create, include:
1. A clear, descriptive title
2. A detailed description of what the learner will accomplish
3. 3-5 learning resources (suggest types like videos, articles, interactive exercises)
4. 1-2 assessment quizzes or activities to test understanding

Structure your response as a JSON array of modules with this exact format:
{
  "modules": [
    {
      "title": "Module Title",
      "description": "Detailed description of the module content and learning outcomes",
      "resources": ["Resource 1: Description", "Resource 2: Description", "Resource 3: Description"],
      "quizzes": ["Quiz 1: Topic assessment", "Quiz 2: Practice exercise"]
    }
  ],
  "suggestedTags": ["tag1", "tag2", "tag3"]
}

Create 4-6 modules that progressively build knowledge from fundamentals to advanced concepts.`;

    const userPrompt = `Create a structured learning path with the following details:

Title: ${title}
Subject: ${subject}
Difficulty Level: ${difficulty}
Estimated Duration: ${estimatedHours} hours
${description ? `Description: ${description}` : ''}

Generate a comprehensive learning path with progressive modules that take learners from basics to mastery. Return ONLY valid JSON.`;

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
    let content = data.choices[0].message.content;
    
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      content = jsonMatch[1].trim();
    }
    
    // Parse and validate the response
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid response format from AI');
    }

    console.log('Learning path generated successfully');

    return new Response(
      JSON.stringify(parsedContent),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating learning path:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
