// Personal project coach: examiner-style feedback on a student's MYP personal
// project report, one strand at a time, plus integrity checks and a tutor that
// explains the feedback.
//
// actions:
//   map        { text }                         → the report's structure (goal, product, criteria traceability, ATL skills, evidence)
//   strand     { text, strand }                 → element checks, level with reasons, annotations, next steps
//   overview   { map, strands }                 → headline, strengths, priorities ranked by marks, consistency issues
//   integrity  { text }                         → authenticity signals, referencing, sources to check
//   similarity { reviewId, hashes[] }           → anonymous overlap with reports at the same school
//   ask        { question, history, text, digest, focus? } → { answer } (explains, never writes the report)
// Report text keeps "## Page N" markers so feedback can point to pages.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DEFAULT_MODEL, FALLBACK_MODELS, findModel } from "../_shared/aiModels.ts";
import { ATL_CLUSTERS, PP_CRITERIA, PP_STRANDS, bandOf, strandBrief, type PPStrandId } from "../_shared/personalProject.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MAX_TEXT = 140_000;
const DAILY_REVIEWS = 10;
/** Deep-reasoning models for grading, best first */
const GRADERS = ["google/gemini-3.1-pro-preview", "openai/gpt-5.4", "google/gemini-2.5-pro", DEFAULT_MODEL];
const FAST = [DEFAULT_MODEL, ...FALLBACK_MODELS.filter((m) => m !== DEFAULT_MODEL)].slice(0, 3);

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

type Opts = { models?: string[]; effort?: "low" | "medium" | "high"; json?: boolean; messages?: { role: string; content: string }[] };

/** Call the gateway, falling back across models; returns parsed JSON or plain text. */
async function complete(apiKey: string, userId: string, system: string, user: string, opts: Opts = {}): Promise<{ data: Record<string, unknown> | null; text: string; model: string }> {
  const models = opts.models ?? FAST;
  const messages = [{ role: "system", content: system }, ...(opts.messages ?? []), { role: "user", content: user }];
  for (const model of models) {
    const body = (effort: boolean) => JSON.stringify({ model, messages, ...(effort && opts.effort ? { reasoning_effort: opts.effort } : { temperature: 0.2 }) });
    let r = await fetch(`${GATEWAY}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: body(true) });
    // Some models reject reasoning_effort: retry once without it
    if (r.status === 400 && opts.effort) { await r.text(); r = await fetch(`${GATEWAY}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: body(false) }); }
    if (r.status === 429) throw Object.assign(new Error("Too many requests right now. Try again in a minute."), { status: 429 });
    if (r.status === 402) throw Object.assign(new Error("AI credits have run out. Please tell your teacher."), { status: 402 });
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

const INTEGRITY_RULE = `ACADEMIC INTEGRITY: the report must be the student's own work. Never write sentences, paragraphs, success criteria, plans, ATL accounts or reflections the student could paste into their report. Explain what is missing, point to where, and ask questions that help them write it themselves. Illustrations must come from a different, made-up project (e.g. "someone learning to bake bread might…"), never from the student's own topic.`;

const str = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const quote = (v: unknown) => str(v, 400).replace(/^##\s*Page\s*\d+\s*/i, "");
const page = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 && n < 200 ? n : null; };
const list = <T,>(v: unknown, n: number): T[] => (Array.isArray(v) ? (v.slice(0, n) as T[]) : []);
type Loose = Record<string, unknown>;
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(String(v) as T) ? (String(v) as T) : fallback);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const userId = await userFrom(req);
  if (!userId) return json({ error: "Sign in required" }, 401);
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI service not configured" }, 500);

  let body: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }

  // A fair-use limit on full reviews per day (the tutor isn't counted)
  if (body.action !== "ask") {
    const since = new Date(Date.now() - 24 * 3600e3).toISOString();
    const { count } = await admin().from("pp_reviews").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
    if ((count ?? 0) > DAILY_REVIEWS) return json({ error: `You've reviewed ${DAILY_REVIEWS} drafts today. Make your changes and come back tomorrow.` }, 429);
  }
  const text = String(body.text ?? "").slice(0, MAX_TEXT).trim();
  const reportBlock = `THE STUDENT'S REPORT ("## Page N" lines mark page breaks; they are not part of the report):\n"""\n${text}\n"""`;

  try {
    /* ---------- map: the report's structure ---------- */
    if (body.action === "map") {
      if (text.length < 200) return json({ error: "Add your report first." }, 400);
      const system = `You are an experienced IB MYP personal project examiner. Read the whole report and map its structure exactly as written (don't judge quality yet, don't invent anything that isn't there). Use page numbers from the "## Page N" markers when present (null otherwise). Keep each summary under 25 words, in your own words.

Reply with JSON only:
{"learningGoal": {"summary": "...", "page": n|null, "isAboutLearning": true|false},
 "personalInterest": {"summary": "...", "page": n|null},
 "product": {"summary": "...", "page": n|null},
 "successCriteria": [{"name": "short name", "detailed": true|false, "justified": true|false, "isProductQuality": true|false, "inPlan": true|false, "evaluated": "yes"|"partly"|"no", "evaluationEvidence": true|false, "page": n|null}],
 "plan": {"page": n|null, "steps": n, "productFocused": true|false, "detailed": true|false, "linksToCriteria": true|false},
 "atlForGoal": [{"skill": "how the student names it", "cluster": "one of: ${ATL_CLUSTERS.join(", ")}", "how": "described"|"explained"|"named only", "evidence": true|false, "page": n|null}],
 "atlForProduct": [same shape],
 "biBiiSeparated": true|false,
 "impact": {"summary": "...", "page": n|null, "isMoreThanGoal": true|false},
 "evidence": [{"kind": "journal extract|photo|table|screenshot|survey|other", "page": n|null, "supports": "what it is evidence for"}],
 "linksRelied": n,
 "sections": [{"criterion": "A"|"B"|"C", "fromPage": n|null, "toPage": n|null}]}`;
      const { data } = await complete(apiKey, userId, system, reportBlock, { models: GRADERS, effort: "low", json: true });
      return json({ map: data ?? {} });
    }

    /* ---------- one strand, judged like an examiner ---------- */
    if (body.action === "strand") {
      const id = String(body.strand) as PPStrandId;
      const strand = PP_STRANDS.find((s) => s.id === id);
      if (!strand || text.length < 200) return json({ error: "Add your report first." }, 400);
      const system = `You are a senior IB MYP personal project examiner giving detailed formative feedback to a student on a draft report. Judge ONLY the strand below, exactly as IB examiners do.

${strandBrief(id)}

${INTEGRITY_RULE}

Method (follow it in order):
1. Find every part of the report relevant to this strand (it may be anywhere). Judge only what is written in the report.
2. Judge each element in the list above: "met", "partly" or "missing", with a short comment and the exact words that show it.
3. Decide which command term the writing actually reaches (states / outlines / describes / explains; for Cii, whether it truly evaluates) and which qualifiers it meets (e.g. basic / appropriate / detailed; some / most / all; superficial / reference to / detailed evidence).
4. The band is the highest whose descriptor the work fully or largely meets. Within the band, give the upper mark if the work largely meets it and the lower if it only just does ("weak": true). Use the calibration as your anchor. Don't be generous: a level the student hasn't earned helps no one.
5. Annotate the report like an examiner marking it: 4 to 12 notes on specific passages, each a strength, a weakness, something missing (quote the nearest passage, or leave the quote empty), or a suggestion. Tie each to the descriptor wording it relates to and give a concrete fix.

Quotes must be copied exactly from the report, 5–40 words, from one place (never across a "## Page" line), so they can be highlighted. Never invent quotes. Talk to the student as "you", warmly and honestly. British spelling.

Reply with JSON only:
{"level": 0-8, "weak": true|false, "confidence": "low"|"medium"|"high",
 "commandTerm": "the command term the writing reaches",
 "summary": "2-3 sentences on where this strand stands and the main thing holding it back",
 "whyThisLevel": "which descriptor the work meets and how, citing the elements",
 "whyNotHigher": "exactly what the next level up needs that isn't there yet (or empty at 8)",
 "whyNotLower": "what the work does that the level below doesn't (or empty at 0-1)",
 "elements": [{"element": "the element, as listed", "status": "met"|"partly"|"missing", "comment": "...", "quote": "exact words or empty", "page": n|null}],
 "annotations": [{"quote": "exact words or empty", "page": n|null, "type": "strength"|"weakness"|"missing"|"suggestion", "descriptor": "the descriptor words this relates to", "comment": "what the examiner sees here", "fix": "what to do (without writing it for them)"}],
 "nextBand": {"band": "e.g. 7-8", "steps": ["specific, ordered actions"]},
 "topBand": "what a 7-8 response for this strand contains, described in general terms (not written for this report)",
 "questions": ["2-4 questions that help the student write the missing parts themselves"]}`;
      const { data: out, model } = await complete(apiKey, userId, system, reportBlock, { models: GRADERS, effort: "medium", json: true });
      const o = out ?? {};
      const level = Math.max(0, Math.min(8, Math.round(Number(o.level) || 0)));
      const nb = (o.nextBand ?? {}) as Loose;
      return json({
        strand: id,
        level,
        band: bandOf(level),
        weak: o.weak === true,
        confidence: pick(o.confidence, ["low", "medium", "high"] as const, "medium"),
        commandTerm: str(o.commandTerm, 40),
        summary: str(o.summary, 900),
        whyThisLevel: str(o.whyThisLevel, 900),
        whyNotHigher: str(o.whyNotHigher, 900),
        whyNotLower: str(o.whyNotLower, 700),
        elements: list<Loose>(o.elements, 8).map((e) => ({ element: str(e.element, 200), status: pick(e.status, ["met", "partly", "missing"] as const, "partly"), comment: str(e.comment, 400), quote: quote(e.quote), page: page(e.page) })).filter((e) => e.element),
        annotations: list<Loose>(o.annotations, 12).map((a) => ({ quote: quote(a.quote), page: page(a.page), type: pick(a.type, ["strength", "weakness", "missing", "suggestion"] as const, "suggestion"), descriptor: str(a.descriptor, 200), comment: str(a.comment, 500), fix: str(a.fix, 500) })).filter((a) => a.comment),
        nextBand: { band: str(nb.band, 10), steps: list<unknown>(nb.steps, 6).map((s) => str(s, 300)).filter(Boolean) },
        topBand: str(o.topBand, 900),
        questions: list<unknown>(o.questions, 4).map((q) => str(q, 300)).filter(Boolean),
        model,
      });
    }

    /* ---------- overview: priorities across the whole report ---------- */
    if (body.action === "overview") {
      const digest = JSON.stringify({ map: body.map ?? {}, strands: body.strands ?? [] }).slice(0, 60_000);
      const system = `You are a senior IB MYP personal project examiner writing the overall feedback for a student's draft, from the strand-by-strand judgements and the report map below. Criteria: ${Object.entries(PP_CRITERIA).map(([k, c]) => `${k} ${c.name} (${c.strands.join(", ")})`).join("; ")}, each out of 8.

${INTEGRITY_RULE}

Prioritise by marks: which changes would raise a strand or criterion level most, for the least work. Check consistency across the report, e.g. every success criterion from Aii should appear in the Aiii plan and be evaluated in Cii; ATL skills in B should be separated for goal and product and backed by evidence; the impact in Ci shouldn't just repeat the learning goal.

Reply with JSON only:
{"headline": "one sentence on where the report stands",
 "strengths": ["3 specific strengths"],
 "priorities": [{"title": "short action", "strand": "Ai|Aii|Aiii|Bi|Bii|Ci|Cii", "gain": "e.g. could lift Cii from 5 to 7", "action": "what to do, specifically"}],
 "consistency": [{"issue": "...", "strands": ["Aii", "Cii"]}],
 "examinerNote": "2-3 sentences of overall advice, in the voice of a supportive examiner"}`;
      const { data } = await complete(apiKey, userId, system, digest, { models: GRADERS, effort: "low", json: true });
      const o = data ?? {};
      return json({
        headline: str(o.headline, 300),
        strengths: list<unknown>(o.strengths, 4).map((s) => str(s, 300)).filter(Boolean),
        priorities: list<Loose>(o.priorities, 6).map((p) => ({ title: str(p.title, 120), strand: str(p.strand, 6), gain: str(p.gain, 120), action: str(p.action, 500) })).filter((p) => p.title),
        consistency: list<Loose>(o.consistency, 6).map((c) => ({ issue: str(c.issue, 400), strands: list<unknown>(c.strands, 4).map((s) => str(s, 6)) })).filter((c) => c.issue),
        examinerNote: str(o.examinerNote, 700),
      });
    }

    /* ---------- integrity: authenticity, referencing, claims to check ---------- */
    if (body.action === "integrity") {
      if (text.length < 200) return json({ error: "Add your report first." }, 400);
      const system = `You help an MYP student check the academic integrity of their personal project report before they submit it. You are not an AI detector and you never accuse: no tool can prove whether text was written by AI. Your job is to point out passages that don't yet sound like the student's own account of their own project, and referencing problems, so the student can fix them.

${INTEGRITY_RULE}

Look for:
1. Passages that read as generic or impersonal: no specific personal detail (dates, what they tried, what went wrong, decisions they made), polished filler, clichés, or a voice very different from the rest of the report. For each, say what personal detail from their own process would make it clearly theirs.
2. Referencing: quotations or specific facts, statistics, definitions or ideas from sources with no in-text citation; whether there is a bibliography or reference list; citations that don't appear in it.
3. Passages that read like they were taken from a source (encyclopaedic definitions, textbook phrasing, marketing copy): the student should check each against its source and quote-and-cite or put it in their own words.

Quotes must be copied exactly from the report (5–35 words, from one place). Reply with JSON only:
{"authenticity": {"signals": "few"|"some"|"many", "summary": "2-3 sentences", "passages": [{"quote": "...", "page": n|null, "why": "...", "fix": "what to add or change, without writing it for them"}]},
 "citations": {"hasBibliography": true|false, "inTextCitations": true|false, "summary": "1-2 sentences", "issues": [{"quote": "...", "page": n|null, "issue": "..."}]},
 "checkSources": [{"quote": "...", "page": n|null, "why": "why this might come from a source"}]}`;
      const { data } = await complete(apiKey, userId, system, reportBlock, { models: FAST, json: true });
      const o = data ?? {};
      const a = (o.authenticity ?? {}) as Loose;
      const c = (o.citations ?? {}) as Loose;
      return json({
        authenticity: {
          signals: pick(a.signals, ["few", "some", "many"] as const, "some"),
          summary: str(a.summary, 700),
          passages: list<Loose>(a.passages, 8).map((p) => ({ quote: quote(p.quote), page: page(p.page), why: str(p.why, 400), fix: str(p.fix, 400) })).filter((p) => p.quote),
        },
        citations: {
          hasBibliography: c.hasBibliography === true,
          inTextCitations: c.inTextCitations === true,
          summary: str(c.summary, 500),
          issues: list<Loose>(c.issues, 10).map((i) => ({ quote: quote(i.quote), page: page(i.page), issue: str(i.issue, 400) })).filter((i) => i.issue),
        },
        checkSources: list<Loose>(o.checkSources, 8).map((p) => ({ quote: quote(p.quote), page: page(p.page), why: str(p.why, 300) })).filter((p) => p.quote),
      });
    }

    /* ---------- tutor: explain the feedback ---------- */
    if (body.action === "ask") {
      const question = str(body.question, 2000);
      if (!question) return json({ error: "Ask a question." }, 400);
      const history = list<Loose>(body.history, 12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: str(m.content, 3000) }));
      const system = `You are Refyn, a friendly IB MYP personal project tutor. The student has had examiner-style feedback on a draft of their report and wants to understand it. Explain clearly for a 15–16 year old: what the feedback means, what the IB criterion and command terms ask for, why their work got the level it did, and what they could do next. Use short paragraphs and bullet points, and check understanding with one question at the end when it helps.

${INTEGRITY_RULE}
If they ask you to write or rewrite part of their report, kindly say you can't (it must be their own work, and the IB checks this), then help them plan it: what to include, questions to answer, how to structure it.

The IB personal project criteria: ${PP_STRANDS.map((s) => `${s.id} (${PP_CRITERIA[s.criterion].name}): ${s.objective} Levels: ${Object.entries(s.bands).map(([b, d]) => `${b} ${d}`).join("; ")}.`).join(" ")}
Command terms: state = a specific brief answer; outline = a brief account; describe = a detailed account; explain = a detailed account including reasons or causes; evaluate = weigh up strengths and limitations to make an appraisal.
The levels Refyn gave are indicative: their supervisor assesses the report and the IB moderates it.

THE FEEDBACK THEY RECEIVED (summary):
${str(body.digest, 20_000)}
${body.focus ? `\nTHEY ARE ASKING ABOUT THIS PART OF THE FEEDBACK:\n${str(body.focus, 3000)}` : ""}

${text ? reportBlock : ""}`;
      const { text: answer } = await complete(apiKey, userId, system, question, { models: FAST, messages: history });
      return json({ answer: answer.trim().slice(0, 8000) });
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
