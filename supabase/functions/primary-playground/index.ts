import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAiUsage } from "../_shared/aiUsage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3-flash-preview";
const MAX_CONTINUATIONS = 3;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Strip fences / prose and pull the outermost JSON object or array. */
function extractJson(raw: string): any {
  if (!raw) throw new Error("empty");
  let text = raw.trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();

  const tryParse = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };

  let parsed = tryParse(text);
  if (parsed !== undefined) return parsed;

  // Find first { or [ and balance braces (string-aware).
  const start = text.search(/[{[]/);
  if (start === -1) throw new Error("no json found");
  const openCh = text[start];
  const closeCh = openCh === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === openCh) depth++;
    else if (c === closeCh) {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end !== -1) {
    parsed = tryParse(text.slice(start, end + 1));
    if (parsed !== undefined) return parsed;
  }

  // Truncated output: close any dangling structures and retry.
  let candidate = text.slice(start);
  if (inStr) candidate += '"';
  const stack: string[] = [];
  inStr = false;
  esc = false;
  for (const c of candidate) {
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();
  }
  candidate = candidate.replace(/,\s*$/, "");
  const repaired = candidate + stack.reverse().join("");
  parsed = tryParse(repaired);
  if (parsed !== undefined) return parsed;

  throw new Error("unparseable json");
}

async function callGateway(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
): Promise<{ content: string; finish: string; data: any }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    // No AbortSignal / timeout on purpose: generation can legitimately run long.
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    const err: any = new Error(`AI gateway error ${res.status}: ${errorText}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return {
    content: data?.choices?.[0]?.message?.content ?? "",
    finish: data?.choices?.[0]?.finish_reason ?? "stop",
    data,
  };
}

/** Calls the model and auto-continues if the answer was cut off mid-way. */
async function completeFully(
  apiKey: string,
  system: string,
  user: string,
): Promise<{ text: string; data: any }> {
  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  let full = "";
  let lastData: any = null;

  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const { content, finish, data } = await callGateway(apiKey, messages);
    lastData = data;
    full += content;
    if (finish !== "length") break;
    messages.push({ role: "assistant", content: content });
    messages.push({
      role: "user",
      content:
        "Your previous message was cut off. Continue EXACTLY where you stopped. Do not repeat any text already written, do not restart, do not add commentary.",
    });
  }

  return { text: full, data: lastData };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  let userId: string | null = null;
  try {
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data, error } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (error || !data?.claims?.sub) return json({ success: false, error: "Unauthorized" }, 401);
    userId = data.claims.sub as string;
  } catch {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid request body" }, 400);
  }

  const prompt: string = (body?.prompt || "").toString().trim();
  const mode: "text" | "json" = body?.mode === "json" ? "json" : "text";
  const gradeBand: string = (body?.gradeBand || "Primary").toString();
  const theme: string | null = body?.theme ? body.theme.toString() : null;

  if (!prompt) return json({ success: false, error: "Empty prompt" }, 400);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ success: false, error: "AI service not configured" }, 500);

  const baseSystem = `You are a warm, highly experienced IB PYP primary educator and curriculum designer at an international school.
Audience: ${gradeBand} children${theme ? ` working within the transdisciplinary theme "${theme}"` : ""}.
Rules:
- Age-appropriate, joyful, concrete language. Never condescending.
- Anchor to IB PYP practice: inquiry, learner profile attributes, approaches to learning, agency.
- NEVER use LaTeX or dollar-sign math. Use plain text and Unicode (×, ÷, ², √, π).
- Always finish what you start. Never truncate a list, never end mid-sentence, never say "and so on".
- This is a TEACHER-FACING planning tool: give the complete, ready-to-use material directly. Do NOT withhold answers, do NOT use Socratic questioning on the teacher.`;

  const systemMessage =
    mode === "json"
      ? `${baseSystem}
OUTPUT FORMAT: return ONE valid JSON value and nothing else. No markdown fences, no commentary before or after. Every string must be plain text with no unescaped newlines. Every key requested must be present and fully populated.`
      : `${baseSystem}
OUTPUT FORMAT: clear, well-structured plain text / light markdown a teacher can copy straight into their planner. Complete every section you announce.`;

  try {
    const { text, data } = await completeFully(apiKey, systemMessage, prompt);

    if (!text.trim()) {
      return json({ success: false, error: "The AI returned an empty response. Please try again." }, 502);
    }

    let payload: any = null;
    if (mode === "json") {
      try {
        payload = extractJson(text);
      } catch {
        // One deterministic repair pass: ask the model to re-emit strict JSON.
        const repair = await completeFully(
          apiKey,
          "You convert messy model output into strict JSON. Return ONLY the JSON value, no fences, no commentary. Preserve all content; complete anything that was cut off.",
          `Convert the following into a single valid JSON value:\n\n${text}`,
        );
        try {
          payload = extractJson(repair.text);
        } catch {
          return json(
            { success: false, error: "The AI response could not be read. Please try again." },
            502,
          );
        }
      }
    }

    // Best-effort usage logging.
    logAiUsage({
      userId,
      model: MODEL,
      aiData: data,
      promptSource: `${systemMessage}\n\n${prompt}`,
      completionSource: text,
    }).catch((e) => console.error("usage log failed", e));

    return json({ success: true, reply: text, data: payload, error: null });
  } catch (err: any) {
    const status = err?.status;
    console.error("primary-playground failure:", err?.message || err);
    if (status === 429) {
      return json({ success: false, error: "Too many requests right now — try again in a few seconds." }, 429);
    }
    if (status === 402) {
      return json({ success: false, error: "AI credits are exhausted. Please contact your administrator." }, 402);
    }
    return json({ success: false, error: "The AI service is temporarily unavailable. Please try again." }, 502);
  }
});
