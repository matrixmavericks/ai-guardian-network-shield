// Shared plumbing for the grading functions (personal project coach,
// assessment coach, marking copilot): auth, the gateway call with model
// fallback and usage logging, and safe parsing of model JSON.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DEFAULT_MODEL, FALLBACK_MODELS, findModel } from "./aiModels.ts";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
/** Deep-reasoning models for grading, best first */
export const GRADERS = ["google/gemini-3.1-pro-preview", "openai/gpt-5.4", "google/gemini-2.5-pro", DEFAULT_MODEL];
export const FAST = [DEFAULT_MODEL, ...FALLBACK_MODELS.filter((m) => m !== DEFAULT_MODEL)].slice(0, 3);

export const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
export const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

export async function userFrom(req: Request): Promise<string | null> {
  const h = req.headers.get("Authorization");
  if (!h?.startsWith("Bearer ")) return null;
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: h } } });
    const { data } = await sb.auth.getClaims(h.slice(7));
    return (data?.claims?.sub as string) ?? null;
  } catch {
    return null;
  }
}

export async function isStaff(userId: string): Promise<boolean> {
  const { data } = await admin().from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r: { role: string }) => r.role === "teacher" || r.role === "admin");
}

/** First JSON object in a model reply. */
export function parseJson(text: string): Record<string, unknown> | null {
  const s = text.replace(/```(json)?/gi, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

export type Opts = { models?: string[]; effort?: "low" | "medium" | "high"; json?: boolean; messages?: { role: string; content: string }[] };

/** Call the gateway, falling back across models; returns parsed JSON (when asked) and the raw text. */
export async function complete(userId: string, system: string, user: string, opts: Opts = {}): Promise<{ data: Record<string, unknown> | null; text: string; model: string }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw Object.assign(new Error("AI service not configured"), { status: 500 });
  const models = opts.models ?? FAST;
  const messages = [{ role: "system", content: system }, ...(opts.messages ?? []), { role: "user", content: user }];
  for (const model of models) {
    const body = (effort: boolean) => JSON.stringify({ model, messages, ...(effort && opts.effort ? { reasoning_effort: opts.effort } : { temperature: 0.2 }) });
    const post = (effort: boolean) => fetch(`${GATEWAY}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: body(effort) });
    let r = await post(true);
    // Some models reject reasoning_effort: retry once without it
    if (r.status === 400 && opts.effort) { await r.text(); r = await post(false); }
    if (r.status === 429) throw Object.assign(new Error("Too many requests right now. Try again in a minute."), { status: 429 });
    if (r.status === 402) throw Object.assign(new Error("AI credits have run out. Please tell your teacher or administrator."), { status: 402 });
    if (!r.ok) { console.error("gateway", model, r.status, (await r.text()).slice(0, 300)); continue; }
    const data = await r.json();
    const text = String(data?.choices?.[0]?.message?.content ?? "");
    const usage = data?.usage ?? {};
    const p = findModel(model)?.price ?? { input: 0.3, output: 2.5 };
    admin().from("ai_usage_logs").insert({
      user_id: userId, model, prompt_tokens: usage.prompt_tokens ?? 0, completion_tokens: usage.completion_tokens ?? 0,
      total_tokens: (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
      estimated_cost_usd: ((usage.prompt_tokens ?? 0) / 1e6) * p.input + ((usage.completion_tokens ?? 0) / 1e6) * p.output,
    }).then(() => undefined, () => undefined);
    if (!opts.json) { if (text.trim()) return { data: null, text, model }; continue; }
    const parsed = parseJson(text);
    if (parsed) return { data: parsed, text, model };
  }
  throw Object.assign(new Error("Refyn couldn't finish the feedback. Try again."), { status: 502 });
}

export const INTEGRITY_RULE = `ACADEMIC INTEGRITY: the work must be the student's own. Never write sentences, paragraphs, answers, methods, analyses or reflections the student could paste into their work. Explain what is missing, point to where, and ask questions that help them write it themselves. Illustrations must come from a different, made-up context, never from the student's own topic.`;

export type Loose = Record<string, unknown>;
export const str = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
export const quote = (v: unknown) => str(v, 400).replace(/^##\s*Page\s*\d+\s*/i, "");
export const page = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 && n < 200 ? n : null; };
export const list = <T,>(v: unknown, n: number): T[] => (Array.isArray(v) ? (v.slice(0, n) as T[]) : []);
export const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(String(v) as T) ? (String(v) as T) : fallback);

/** Annotations in the shape every coach uses. */
export const annotations = (v: unknown, n = 12) =>
  list<Loose>(v, n)
    .map((a) => ({ quote: quote(a.quote), page: page(a.page), type: pick(a.type, ["strength", "weakness", "missing", "suggestion"] as const, "suggestion"), descriptor: str(a.descriptor, 200), comment: str(a.comment, 500), fix: str(a.fix, 500) }))
    .filter((a) => a.comment);
