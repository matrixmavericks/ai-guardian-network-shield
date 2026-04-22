import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Refyn Technologies Platform Assistant — an in-product helper used inside the master-admin Platform Docs page.

You help with three things ONLY:
1. **Product / feature support** — explain how any part of the Refyn platform works for Admins, Teachers, Students, or Parents.
2. **Parent support** — answer questions a parent might ask about their child's AI usage, safety, billing, etc.
3. **Pilot analysis** — help interpret pilot data, signup trends, conversion, and AI usage patterns.

Refyn capabilities you should know about:
- Roles: Master Admin (info.aiconditioner@gmail.com), School Admin, Teacher, Student, Parent.
- Registration: users sign up via /register; admin can require Stripe payment OR use manual approval (toggle on Registration Requests page).
- Plans: Student (starter/standard/premium), Teacher (individual/pro), School (starter/growth/enterprise per-seat). Pricing in INR (₹).
- AI features: Process Teaching Mode (no direct answers), AI Chat tutor, Learning Path generation, Capstone AI grading, Live Quiz generation, Class Risk analysis, Adaptive Learning Profile.
- Governance: school-level AI settings, blocked keywords, monthly cost caps, daily prompt limits per student, severity-based moderation.
- Classes & Courses: join codes, group assignments, resource folders, multi-curriculum support (IB, IGCSE, US, etc.), grading systems.
- Portfolios: student capstone showcase with public share links on refyntech.online.
- Billing: Stripe checkout (sandbox + live), customer portal, discount codes.

Tone: concise, friendly, practical. Use markdown headings/bullets when useful. If you don't know something specific to this deployment, say so and suggest where the admin can check (which page or table).

Never invent features that don't exist. If asked about implementation details (code, edge functions, RLS), give a high-level explanation suitable for a non-developer admin.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modeNote =
      mode === "parent" ? "\n\nFocus this answer on what a PARENT needs to know — clear, reassuring, non-technical."
      : mode === "pilot" ? "\n\nFocus this answer on PILOT ANALYSIS — interpret data, suggest metrics, surface risks."
      : "";

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + modeNote },
          ...messages,
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("AI gateway error", resp.status, errText);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("docs-assistant error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
