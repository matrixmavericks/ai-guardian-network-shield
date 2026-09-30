// Personal project coach: rubric feedback on a student's MYP personal project
// report, one strand at a time, plus integrity checks.
//
// actions:
//   strand     { text, strand }            → { level, weak, band, summary, found[], gaps[], nextBand, questions[] }
//   integrity  { text }                    → { authenticity, citations, unsupported[], checkSources[] }
//   similarity { reviewId, hashes[] }      → { compared, matches[] }  (anonymous overlap with reports at the same school)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DEFAULT_MODEL, FALLBACK_MODELS, findModel } from "../_shared/aiModels.ts";
import { PP_STRANDS, bandOf, strandBrief, type PPStrandId } from "../_shared/personalProject.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MAX_TEXT = 140_000;
const DAILY_REVIEWS = 15;
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function userFrom(req: Request): Promise<string | null> {
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

/** First JSON object in a model reply. */
function parseJson(text: string): Record<string, unknown> | null {
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

async function ask(apiKey: string, userId: string, system: string, user: string): Promise<Record<string, unknown>> {
  for (const model of [DEFAULT_MODEL, ...FALLBACK_MODELS.filter((m) => m !== DEFAULT_MODEL)].slice(0, 3)) {
    const r = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
    if (r.status === 429) throw Object.assign(new Error("Too many requests right now. Try again in a minute."), { status: 429 });
    if (r.status === 402) throw Object.assign(new Error("AI credits have run out. Please tell your teacher."), { status: 402 });
    if (!r.ok) { console.error("gateway", model, r.status, (await r.text()).slice(0, 300)); continue; }
    const data = await r.json();
    const out = parseJson(String(data?.choices?.[0]?.message?.content ?? ""));
    const usage = data?.usage ?? {};
    const p = findModel(model)?.price ?? { input: 0.3, output: 2.5 };
    admin().from("ai_usage_logs").insert({
      user_id: userId, model, prompt_tokens: usage.prompt_tokens ?? 0, completion_tokens: usage.completion_tokens ?? 0,
      total_tokens: (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
      estimated_cost_usd: ((usage.prompt_tokens ?? 0) / 1e6) * p.input + ((usage.completion_tokens ?? 0) / 1e6) * p.output,
    }).then(() => undefined, () => undefined);
    if (out) return out;
  }
  throw Object.assign(new Error("Refyn couldn't read the feedback. Try again."), { status: 502 });
}

const INTEGRITY_RULE = `ACADEMIC INTEGRITY: the report must be the student's own work. Never write sentences, paragraphs, success criteria, plans or reflections the student could paste into their report. Explain what is missing, point to where, and ask questions that help them write it themselves. Short examples of the *kind* of detail needed are fine only if clearly generic (e.g. "a date, what you tried, what happened").`;

const clampQuote = (q: unknown) => String(q ?? "").replace(/\s+/g, " ").trim().slice(0, 400);
const list = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n) : []);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const userId = await userFrom(req);
  if (!userId) return json({ error: "Sign in required" }, 401);
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI service not configured" }, 500);

  let body: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }

  // A fair-use limit on full reviews per day
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { count } = await admin().from("pp_reviews").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
  if ((count ?? 0) > DAILY_REVIEWS) return json({ error: `You've reviewed ${DAILY_REVIEWS} drafts today. Make your changes and come back tomorrow.` }, 429);

  try {
    /* ---------- one strand of the rubric ---------- */
    if (body.action === "strand") {
      const id = String(body.strand) as PPStrandId;
      const strand = PP_STRANDS.find((s) => s.id === id);
      const text = String(body.text ?? "").slice(0, MAX_TEXT).trim();
      if (!strand || text.length < 200) return json({ error: "Add your report first." }, 400);
      const system = `You are an experienced IB MYP personal project examiner giving formative feedback to a student on a draft of their report. Judge ONLY the strand below, the way IB examiners do.

${strandBrief(id)}

${INTEGRITY_RULE}

How to judge:
- Find the parts of the report that address this strand (they may be anywhere). Judge only what is written in the report.
- Decide the command term the writing actually reaches (states / outlines / describes / explains, or for Cii whether it truly evaluates), then the band, then the level within the band (upper mark if the work largely meets the band, lower if only just).
- "weak": true if the work only just fits the level you give.
- Quotes must be copied exactly from the report, 5–35 words each, so they can be highlighted. Never invent quotes.
- Be encouraging, specific and honest. Talk to the student as "you". Use British spelling.

Reply with JSON only:
{"level": 0-8, "weak": true|false, "confidence": "low"|"medium"|"high",
 "summary": "2-3 sentences: what this strand currently shows and the main thing holding it back",
 "found": [{"quote": "exact words from the report", "note": "why this earns credit"}],
 "gaps": [{"quote": "exact words from the report, or empty if the problem is something missing", "note": "what's wrong or missing here and what to do"}],
 "nextBand": {"band": "the next band up, e.g. 7-8", "steps": ["specific actions to reach it"]},
 "questions": ["2-4 questions that help the student write the missing part themselves"]}`;
      const out = await ask(apiKey, userId, system, `THE STUDENT'S REPORT:\n"""\n${text}\n"""`);
      const level = Math.max(0, Math.min(8, Math.round(Number(out.level) || 0)));
      return json({
        strand: id,
        level,
        band: bandOf(level),
        weak: out.weak === true,
        confidence: ["low", "medium", "high"].includes(String(out.confidence)) ? out.confidence : "medium",
        summary: String(out.summary ?? "").slice(0, 900),
        found: list(out.found, 6).map((f: { quote?: unknown; note?: unknown }) => ({ quote: clampQuote(f?.quote), note: String(f?.note ?? "").slice(0, 400) })).filter((f) => f.quote),
        gaps: list(out.gaps, 6).map((g: { quote?: unknown; note?: unknown }) => ({ quote: clampQuote(g?.quote), note: String(g?.note ?? "").slice(0, 500) })).filter((g) => g.note),
        nextBand: out.nextBand && typeof out.nextBand === "object"
          ? { band: String((out.nextBand as { band?: unknown }).band ?? ""), steps: list((out.nextBand as { steps?: unknown }).steps, 6).map((s) => String(s).slice(0, 300)) }
          : null,
        questions: list(out.questions, 4).map((q) => String(q).slice(0, 300)),
      });
    }

    /* ---------- integrity: authenticity, referencing, claims to check ---------- */
    if (body.action === "integrity") {
      const text = String(body.text ?? "").slice(0, MAX_TEXT).trim();
      if (text.length < 200) return json({ error: "Add your report first." }, 400);
      const system = `You help an MYP student check the academic integrity of their personal project report before they submit it. You are not an AI detector and you never accuse: no tool can prove whether text was written by AI. Your job is to point out passages that don't yet sound like the student's own account of their own project, and referencing problems, so the student can fix them.

${INTEGRITY_RULE}

Look for:
1. Passages that read as generic or impersonal: no specific personal detail (dates, what they tried, what went wrong, decisions they made), polished filler, clichés, or a voice very different from the rest of the report. For each, say what personal detail from their own process would make it clearly theirs.
2. Referencing: quotations or specific facts, statistics, definitions or ideas from sources with no in-text citation; whether there is a bibliography or reference list; citations that don't appear in it.
3. Passages that read like they were taken from a source (encyclopaedic definitions, textbook phrasing, marketing copy): the student should check each against its source and quote-and-cite or put it in their own words.

Quotes must be copied exactly from the report (5–35 words). Reply with JSON only:
{"authenticity": {"signals": "few"|"some"|"many", "summary": "2-3 sentences", "passages": [{"quote": "...", "why": "...", "fix": "what to add or change, without writing it for them"}]},
 "citations": {"hasBibliography": true|false, "inTextCitations": true|false, "summary": "1-2 sentences", "issues": [{"quote": "...", "issue": "..."}]},
 "checkSources": [{"quote": "...", "why": "why this might come from a source"}]}`;
      const out = await ask(apiKey, userId, system, `THE STUDENT'S REPORT:\n"""\n${text}\n"""`);
      const a = (out.authenticity ?? {}) as Record<string, unknown>;
      const c = (out.citations ?? {}) as Record<string, unknown>;
      return json({
        authenticity: {
          signals: ["few", "some", "many"].includes(String(a.signals)) ? a.signals : "some",
          summary: String(a.summary ?? "").slice(0, 700),
          passages: list(a.passages, 8).map((p: { quote?: unknown; why?: unknown; fix?: unknown }) => ({ quote: clampQuote(p?.quote), why: String(p?.why ?? "").slice(0, 400), fix: String(p?.fix ?? "").slice(0, 400) })).filter((p) => p.quote),
        },
        citations: {
          hasBibliography: c.hasBibliography === true,
          inTextCitations: c.inTextCitations === true,
          summary: String(c.summary ?? "").slice(0, 500),
          issues: list(c.issues, 10).map((i: { quote?: unknown; issue?: unknown }) => ({ quote: clampQuote(i?.quote), issue: String(i?.issue ?? "").slice(0, 400) })).filter((i) => i.issue),
        },
        checkSources: list(out.checkSources, 8).map((p: { quote?: unknown; why?: unknown }) => ({ quote: clampQuote(p?.quote), why: String(p?.why ?? "").slice(0, 300) })).filter((p) => p.quote),
      });
    }

    /* ---------- similarity with other reports at the same school ---------- */
    if (body.action === "similarity") {
      const reviewId = String(body.reviewId ?? "");
      const hashes = (Array.isArray(body.hashes) ? body.hashes : []).map((h: unknown) => Number(h) | 0).slice(0, 20_000);
      const db = admin();
      const { data: review } = await db.from("pp_reviews").select("id, user_id, school_id").eq("id", reviewId).maybeSingle();
      if (!review || review.user_id !== userId) return json({ error: "Not found" }, 404);
      if (hashes.length < 20) return json({ compared: 0, matches: [] });
      await db.from("pp_fingerprints").upsert({ review_id: reviewId, user_id: userId, school_id: review.school_id, hashes: [...new Set(hashes)] });
      if (!review.school_id) return json({ compared: 0, matches: [], note: "Your account isn't linked to a school, so there are no other reports to compare with." });
      const { data: others } = await db
        .from("pp_fingerprints")
        .select("review_id, user_id, hashes, created_at")
        .eq("school_id", review.school_id)
        .neq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(400);
      const mine = new Set<number>(hashes);
      // Each other student's latest draft only
      const latest = new Map<string, { hashes: number[]; created_at: string }>();
      for (const o of (others ?? []) as { user_id: string; hashes: number[]; created_at: string }[]) if (!latest.has(o.user_id)) latest.set(o.user_id, o);
      // Phrases in 3+ other reports are shared template text (headings, school prompts), not copying
      const df = new Map<number, number>();
      for (const o of latest.values()) for (const h of new Set(o.hashes)) if (mine.has(h)) df.set(h, (df.get(h) ?? 0) + 1);
      const template = new Set([...df.entries()].filter(([, n]) => n >= 3).map(([h]) => h));
      const base = mine.size - template.size || 1;
      const matches: { overlap: number; shared: number; when: string }[] = [];
      for (const o of latest.values()) {
        let shared = 0;
        for (const h of new Set(o.hashes)) if (mine.has(h) && !template.has(h)) shared++;
        const overlap = shared / base;
        if (shared >= 6 && overlap >= 0.02) matches.push({ overlap: Math.round(overlap * 1000) / 1000, shared, when: o.created_at });
      }
      matches.sort((a, b) => b.overlap - a.overlap);
      return json({ compared: latest.size, template: template.size, matches: matches.slice(0, 5) });
    }
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    console.error("pp-feedback", e);
    return json({ error: (e as Error).message || "Something went wrong." }, status);
  }

  return json({ error: "Unknown action" }, 400);
});
