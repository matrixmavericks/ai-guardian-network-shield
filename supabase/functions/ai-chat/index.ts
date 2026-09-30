import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_MODELS, BASIC_PLANS, DEFAULT_MODEL, FALLBACK_MODELS, findModel, normalizeModel, type AiModel, type Effort } from "../_shared/aiModels.ts";
import { DECK_INSTRUCTIONS, FILE_INSTRUCTIONS, LIBRARY_RULES, buildLibrary, historyBudget, libraryBudget, type LibraryUse } from "../_shared/chatLibrary.ts";
import { ASSESSMENT_INTENT, detectGroups, mypGuidance, programmeOf } from "../_shared/myp.ts";
import { PAST_PAPER_INTENT, pastPaperBlock } from "../_shared/pastPapers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FALLBACK_REPLY = "I'm sorry, the AI is temporarily unavailable. Please try again in a moment.";

const BLOCKED_KEYWORDS = [
  'write my essay', 'do my homework', 'give me the answer',
  'solve this for me', 'cheat', 'plagiarize', 'copy paste',
  'give me the exact answer'
];

// Approximate cost per 1M tokens (USD) when a model has no price in the catalog
const COST_PER_1M_INPUT = 0.10;
const COST_PER_1M_OUTPUT = 0.40;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, serviceKey);
}

async function checkQuota(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const adminClient = getAdminClient();
  
  // Get the most restrictive quota for this student
  const { data: quotas } = await adminClient
    .from('ai_usage_quotas')
    .select('monthly_limit_usd')
    .eq('student_id', userId);

  if (!quotas || quotas.length === 0) return { allowed: true };

  const lowestLimit = Math.min(...quotas.map((q: any) => Number(q.monthly_limit_usd)));

  // Get current month's usage
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const { data: usage } = await adminClient
    .from('ai_usage_logs')
    .select('estimated_cost_usd')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth);

  const totalUsed = (usage || []).reduce((sum: number, r: any) => sum + Number(r.estimated_cost_usd), 0);

  if (totalUsed >= lowestLimit) {
    return { allowed: false, reason: `You've reached your monthly AI usage limit ($${lowestLimit.toFixed(2)}). Please contact your teacher.` };
  }
  return { allowed: true };
}

async function getSchoolSettings(userId: string): Promise<any | null> {
  const adminClient = getAdminClient();
  
  // Find user's school via school_members
  const { data: membership } = await adminClient
    .from('school_members')
    .select('school_id')
    .eq('user_id', userId)
    .limit(1);
  
  if (!membership || membership.length === 0) return null;
  
  const { data: settings } = await adminClient
    .from('school_ai_settings')
    .select('*')
    .eq('school_id', membership[0].school_id)
    .maybeSingle();
  
  return settings;
}

/** Teachers and admins get the content-creation assistant, never guided mode. */
async function isStaff(userId: string): Promise<boolean> {
  try {
    const { data } = await getAdminClient().from('user_roles').select('role').eq('user_id', userId);
    return (data || []).some((r: any) => r.role === 'teacher' || r.role === 'admin');
  } catch {
    return false;
  }
}

const TEACHER_PROMPT = (subject: string) => `You are Refyn, a planning and content-creation assistant for teachers. The person you are working with is a teacher, not a student. Subject focus: ${subject === 'general' ? 'any subject' : subject}.

Do the work they ask for, completely and directly: lesson and unit plans, schemes of work, worksheets, question banks, quizzes and tests with answer keys, mark schemes and rubrics, model and exemplar answers, differentiated versions for support and extension, feedback and comments on student work, report comments, parent emails, and explanations of content at any level.
- Never withhold answers, never switch to guiding questions or Socratic tutoring, and don't remind them about academic integrity: they are the teacher, and answer keys and model answers are part of the job.
- Where it fits, align to the IB MYP (the subject group's own criteria A–D, command terms, global contexts, ATL skills) or to the curriculum they name. When an IB MYP ASSESSMENT reference is given below, follow it exactly; never guess criterion names or strands.
- Be practical and classroom-ready: timings, materials, success criteria, differentiation and assessment.
- If a request is ambiguous, make sensible assumptions, state them in one line, and deliver; offer to adjust afterwards instead of asking a list of questions first.
- When they want a resource they will use (a worksheet, plan, rubric, quiz, letter, spreadsheet), deliver it as a file block (see MAKING FILES).`;

async function getSchoolTrainingExamples(trainingDataIds: string[]): Promise<string> {
  if (!trainingDataIds || trainingDataIds.length === 0) return '';
  const adminClient = getAdminClient();
  
  const { data } = await adminClient
    .from('model_training_data')
    .select('input_prompt, ideal_response, subject, grade_level')
    .in('id', trainingDataIds)
    .eq('approved', true);
  
  if (!data || data.length === 0) return '';
  
  return '\n\nSCHOOL TRAINING EXAMPLES (use these as reference for tone and style):\n' +
    data.map((d: any) => `- Student asks: "${d.input_prompt}"\n  Ideal response: "${d.ideal_response}"`).join('\n');
}

// ─── Model availability (learned from the gateway) ──────────────────────

type Availability = Map<string, { available: boolean; gatewayId: string | null; checkedAt: number }>;

const PROBE_EVERY_MS = 6 * 60 * 60 * 1000;
let availabilityCache: { at: number; map: Availability } | null = null;
let probing = false;

async function loadAvailability(): Promise<Availability> {
  if (availabilityCache && Date.now() - availabilityCache.at < 60_000) return availabilityCache.map;
  const map: Availability = new Map();
  try {
    const { data } = await getAdminClient().from('ai_model_availability').select('model, available, gateway_id, checked_at');
    for (const r of data || []) {
      map.set(r.model, { available: r.available, gatewayId: r.gateway_id, checkedAt: new Date(r.checked_at).getTime() });
    }
  } catch (e) {
    console.error('Model availability load failed (non-fatal):', e);
  }
  availabilityCache = { at: Date.now(), map };
  return map;
}

async function recordAvailability(model: string, available: boolean, gatewayId: string | null, detail: string | null) {
  try {
    await getAdminClient().from('ai_model_availability').upsert({
      model,
      available,
      gateway_id: gatewayId,
      detail: detail ? detail.slice(0, 300) : null,
      checked_at: new Date().toISOString(),
    });
    availabilityCache?.map.set(model, { available, gatewayId, checkedAt: Date.now() });
  } catch (e) {
    console.error('Model availability write failed (non-fatal):', e);
  }
}

/** A 4xx that means "this model id isn't served", not a problem with the request. */
const modelMissing = (status: number, text: string) =>
  [400, 404, 422].includes(status) && /model|not found|unsupported|invalid|unknown|does not exist/i.test(text);

/** Check one catalogue model (and its alternate ids) with a tiny request. */
async function probeModel(apiKey: string, m: AiModel) {
  let last = '';
  for (const gatewayId of [m.id, ...(m.alt ?? [])]) {
    try {
      const r = await callGateway(apiKey, gatewayId, null, [{ role: 'user', content: 'Reply with the single word OK.' }], 30_000);
      if (r.ok) return recordAvailability(m.id, true, gatewayId, null);
      if (!modelMissing(r.status, r.text)) return; // rate limit or outage: inconclusive, check again later
      last = `${r.status} ${r.text}`;
    } catch {
      return; // timeout: inconclusive
    }
  }
  await recordAvailability(m.id, false, null, last);
}

/** Re-check models whose status is unknown or stale, a few at a time. */
async function probeStale(apiKey: string) {
  if (probing) return;
  probing = true;
  try {
    const avail = await loadAvailability();
    const stale = AI_MODELS.filter((m) => {
      const a = avail.get(m.id);
      return !a || Date.now() - a.checkedAt > PROBE_EVERY_MS;
    });
    for (let i = 0; i < stale.length; i += 4) {
      await Promise.all(stale.slice(i, i + 4).map((m) => probeModel(apiKey, m)));
    }
  } finally {
    probing = false;
  }
}

/** Keep work running after the response is sent (Supabase Edge Runtime). */
const runInBackground = (p: Promise<unknown>) => {
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(p);
  else p.catch(() => undefined);
};

// ─── Model choice ────────────────────────────────────────────────────────

type Access = {
  schoolModels: string[] | null;
  premium: boolean;
  /** Catalogue models the gateway doesn't serve for this app */
  unavailable: Set<string>;
  /** Gateway id that answered for a model, when it differs from the catalogue id */
  gatewayIds: Map<string, string>;
};

/** Which models this user may pick: the school's allow-list, the plan's tier, and what's live. */
async function getAccess(userId: string | null, schoolSettings: any): Promise<Access> {
  const schoolModels = schoolSettings?.allowed_ai_models?.length > 0
    ? (schoolSettings.allowed_ai_models as string[]).map(normalizeModel)
    : null;
  const avail = await loadAvailability();
  const unavailable = new Set([...avail].filter(([, a]) => !a.available).map(([id]) => id));
  const gatewayIds = new Map([...avail].filter(([, a]) => a.gatewayId).map(([id, a]) => [id, a.gatewayId as string]));
  if (!userId) return { schoolModels, premium: false, unavailable, gatewayIds };
  try {
    const { data } = await getAdminClient()
      .from('user_plans')
      .select('plan_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    return { schoolModels, premium: !data || !BASIC_PLANS.includes(data.plan_id), unavailable, gatewayIds };
  } catch {
    return { schoolModels, premium: false, unavailable, gatewayIds };
  }
}

type Blocked = 'school' | 'plan' | 'unavailable' | null;

const blockedReason = (m: AiModel, access: Access): Blocked =>
  access.unavailable.has(m.id)
    ? 'unavailable'
    : access.schoolModels && !access.schoolModels.includes(m.id)
      ? 'school'
      : m.premium && !access.premium
        ? 'plan'
        : null;

/** The model to use: the requested one if allowed, otherwise the best allowed default. */
function resolveModel(requested: string | null, access: Access): { id: string; notice: string | null } {
  const wanted = requested ? findModel(requested) : undefined;
  if (wanted && !blockedReason(wanted, access)) return { id: wanted.id, notice: null };

  // School allow-lists may contain ids outside the catalog; keep honouring them.
  const live = (id: string) => !access.unavailable.has(id);
  const fallback = access.schoolModels
    ? access.schoolModels.find((id) => findModel(id) && live(id)) ?? access.schoolModels[0]
    : [DEFAULT_MODEL, ...FALLBACK_MODELS].find(live) ?? FALLBACK_MODELS[FALLBACK_MODELS.length - 1];
  const name = findModel(fallback)?.name ?? fallback;
  const reason = wanted ? blockedReason(wanted, access) : null;
  const notice = !wanted
    ? null
    : reason === 'unavailable'
      ? `${wanted.name} isn't live on Refyn yet, so ${name} answered.`
      : reason === 'school'
        ? `Your school hasn't enabled ${wanted.name}, so ${name} answered.`
        : `${wanted.name} needs the Premium plan, so ${name} answered.`;
  return { id: fallback, notice };
}

type GatewayResult = { ok: true; data: any } | { ok: false; status: number; text: string };

async function callGateway(apiKey: string, model: string, effort: Effort | null, messages: unknown[], timeoutMs: number): Promise<GatewayResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, ...(effort ? { reasoning_effort: effort } : {}) }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, status: res.status, text: await res.text() };
    return { ok: true, data: await res.json() };
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth ---
  const authHeader = req.headers.get('Authorization');
  let userId: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace('Bearer ', '');
      const { data, error } = await supabase.auth.getClaims(token);
      if (!error && data?.claims?.sub) {
        userId = data.claims.sub;
      }
    } catch (e) {
      console.error('Auth check failed:', e);
    }
  }

  // --- Parse body ---
  let prompt: string;
  let subject: string;
  let gradeLevel: string;
  let processTeaching: boolean;
  let sessionId: string | null;
  let resourceContext: string | null;
  let history: Array<{ role: string; content: string }> = [];
  let requestedModel: string | null = null;
  let requestedEffort: string | null = null;
  let action: string | null = null;
  let libraryEnabled = false;
  let images: string[] = [];
  let describeName = '';

  try {
    const body = await req.json();
    action = typeof body.action === 'string' ? body.action : null;
    prompt = (body.prompt || '').trim();
    subject = body.subject || 'general';
    gradeLevel = body.gradeLevel || 'high-school';
    processTeaching = body.processTeaching !== false;
    sessionId = body.sessionId || null;
    resourceContext = body.resourceContext || null;
    requestedModel = typeof body.model === 'string' ? body.model : null;
    requestedEffort = typeof body.effort === 'string' ? body.effort : null;
    if (Array.isArray(body.history)) {
      history = body.history
        .filter((m: any) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
        .slice(-80); // trimmed to the model's history budget below
    }
    libraryEnabled = body.library === true;
    // Images attached to this message (or to transcribe): data URLs only, a few MB at most
    const rawImages = Array.isArray(body.images) ? body.images : [];
    images = rawImages
      .filter((u: unknown) => typeof u === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(u as string) && (u as string).length < 5_000_000)
      .slice(0, 8);
    describeName = typeof body.name === 'string' ? body.name.slice(0, 200) : '';
  } catch {
    return json({ success: false, reply: FALLBACK_REPLY, error: 'Invalid request body', meta: null }, 400);
  }

  // --- Model list for the picker: what this user may choose ---
  if (action === 'models') {
    let settings: any = null;
    if (userId) {
      try { settings = await getSchoolSettings(userId); } catch { /* no school */ }
    }
    const access = await getAccess(userId, settings);
    // Refresh what the gateway serves (at most every few hours) without delaying the reply
    const probeKey = Deno.env.get('LOVABLE_API_KEY');
    if (probeKey) runInBackground(probeStale(probeKey));
    return json({
      success: true,
      default: resolveModel(null, access).id,
      schoolRestricted: !!access.schoolModels,
      models: AI_MODELS.map((m) => ({ id: m.id, available: !blockedReason(m, access), reason: blockedReason(m, access) })),
    });
  }

  if (action === 'describe') {
    if (!userId) return json({ success: false, error: 'Sign in required' }, 401);
    if (!images.length) return json({ success: false, error: 'No images' }, 400);
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ success: false, error: 'AI service not configured' }, 500);
    let settings: any = null;
    try { settings = await getSchoolSettings(userId); } catch { /* no school */ }
    const access = await getAccess(userId, settings);
    const model = resolveModel(null, access).id;
    const content = [
      {
        type: 'text',
        text: `These are ${images.length > 1 ? 'pages or images' : 'an image'} from "${describeName || 'an uploaded file'}", added to a school AI assistant's library.
Transcribe all readable text exactly, keeping its structure: headings, numbered questions, lists, and tables as markdown tables. ${images.length > 1 ? 'Start each page with "## Page N".' : ''}
Then, under "Visual description", briefly describe any diagrams, graphs, photos or handwriting that matter.
Do not answer, solve or grade anything in the image: only transcribe and describe it.`,
      },
      ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];
    try {
      const r = await callGateway(apiKey, access.gatewayIds.get(model) ?? model, null, [{ role: 'user', content }], 90_000);
      if (!r.ok) return json({ success: false, error: `Couldn't read the image (${r.status})` }, 502);
      const text = r.data?.choices?.[0]?.message?.content || '';
      const usage = r.data?.usage;
      const info = findModel(model);
      const p = info?.price ?? { input: COST_PER_1M_INPUT, output: COST_PER_1M_OUTPUT };
      const pt = usage?.prompt_tokens ?? 1500 * images.length;
      const ct = usage?.completion_tokens ?? Math.ceil(text.length / 4);
      runInBackground(getAdminClient().from('ai_usage_logs').insert({
        user_id: userId, session_id: sessionId, prompt_tokens: pt, completion_tokens: ct, total_tokens: pt + ct,
        estimated_cost_usd: (pt / 1e6) * p.input + (ct / 1e6) * p.output, model,
      }));
      return json({ success: true, text });
    } catch (e) {
      console.error('describe failed:', e);
      return json({ success: false, error: 'Timed out reading the image' }, 504);
    }
  }

  if (!prompt) {
    return json({ success: false, reply: 'Please enter a question.', error: 'Empty prompt', meta: null }, 400);
  }

  // --- Who is asking: teachers get the planning assistant, students the guided tutor ---
  const staff = userId ? await isStaff(userId) : false;
  if (staff) processTeaching = false;

  // --- Quota check ---
  if (userId) {
    try {
      const quotaResult = await checkQuota(userId);
      if (!quotaResult.allowed) {
        return json({ success: false, reply: quotaResult.reason!, error: 'quota_exceeded', meta: null }, 429);
      }
    } catch (e) {
      console.error('Quota check failed (non-fatal):', e);
    }
  }

  // --- Moderation ---
  const lowerPrompt = prompt.toLowerCase();
  const flaggedKeywords = staff ? [] : BLOCKED_KEYWORDS.filter(kw => lowerPrompt.includes(kw));
  let moderationStatus: 'approved' | 'rewritten' | 'flagged' = 'approved';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let effectivePrompt = prompt;

  if (flaggedKeywords.length > 0) {
    moderationStatus = 'rewritten';
    severity = flaggedKeywords.length >= 3 ? 'high' : 'medium';
    effectivePrompt = `The student asked: "${prompt}". Instead of giving them the direct answer, guide them through the thinking process step by step. Ask them guiding questions to help them discover the answer themselves. Focus on teaching the underlying concepts.`;
  }

  // --- School settings enforcement ---
  let schoolSettings: any = null;
  let schoolTrainingContext = '';
  
  if (userId) {
    try {
      schoolSettings = await getSchoolSettings(userId);
      if (schoolSettings && !staff) {
        // Check if student chat is allowed
        if (schoolSettings.allow_student_chat === false) {
          return json({ success: false, reply: 'AI chat is not enabled for your school. Please contact your administrator.', error: 'school_chat_disabled', meta: null }, 403);
        }
        
        // Check subject restrictions
        if (schoolSettings.subject_restrictions && schoolSettings.subject_restrictions.length > 0) {
          if (!schoolSettings.subject_restrictions.includes(subject)) {
            return json({ success: false, reply: `AI chat is only available for the following subjects at your school: ${schoolSettings.subject_restrictions.join(', ')}. You selected "${subject}".`, error: 'subject_restricted', meta: null }, 403);
          }
        }
        
        // Check school-level blocked keywords
        if (schoolSettings.blocked_keywords && schoolSettings.blocked_keywords.length > 0) {
          const schoolFlagged = schoolSettings.blocked_keywords.filter((kw: string) => lowerPrompt.includes(kw.toLowerCase()));
          if (schoolFlagged.length > 0) {
            moderationStatus = 'rewritten';
            severity = 'high';
            effectivePrompt = `The student asked: "${prompt}". This prompt contains restricted content per school policy. Instead of giving them the direct answer, guide them through the thinking process step by step.`;
          }
        }
        
        // Load school training examples
        if (schoolSettings.custom_model_training_data_ids && schoolSettings.custom_model_training_data_ids.length > 0) {
          schoolTrainingContext = await getSchoolTrainingExamples(schoolSettings.custom_model_training_data_ids);
        }
      }
    } catch (e) {
      console.error('School settings check failed (non-fatal):', e);
    }
  }

  // --- Moderation (keyword-based, after school check) ---

  // --- Build system prompt ---
  let systemMessage = schoolSettings?.custom_system_prompt 
    ? `${schoolSettings.custom_system_prompt}\n\nSubject: ${subject}. Grade level: ${gradeLevel}.`
    : `You are an educational AI assistant. Subject: ${subject}. Grade level: ${gradeLevel}.`;
  if (staff) systemMessage = TEACHER_PROMPT(subject);
  
  systemMessage += `
Use markdown formatting. Use **bold** for key terms. Use bullet points and numbered lists. Keep explanations clear and age-appropriate.

CRITICAL MATH FORMATTING RULES:
- NEVER use LaTeX notation like $x^2$, \\frac{}, \\sqrt{}, or any dollar-sign math syntax.
- Use Unicode symbols instead: × (multiply), ÷ (divide), ² ³ (superscripts), √ (square root), π, ∑, ∫, ≤, ≥, ≠, ∞, θ, α, β, Δ.
- Write fractions as a/b or use "numerator over denominator" phrasing.
- Write exponents inline: x², x³, or "x to the power of n".
- For equations, write them on their own line in plain text, e.g.: "Area = π × r²"
- For complex formulas, use code blocks with plain text formatting.`;
  systemMessage += FILE_INSTRUCTIONS;

  const forceProcessMode = !staff && schoolSettings?.process_mode_enabled === true;
  if (staff) {
    systemMessage += `\nThis is teacher mode: give complete, direct, finished work.` + DECK_INSTRUCTIONS;
  } else if (processTeaching || forceProcessMode || moderationStatus === 'rewritten') {
    systemMessage += `
IMPORTANT: You are in Process Teaching Mode.
1. NEVER give direct answers
2. Break problems into step-by-step learning opportunities
3. Ask guiding questions
4. Explain underlying concepts
5. Encourage the student to discover the answer themselves`;
  } else {
    systemMessage += `\nProvide helpful, educational responses with clear explanations.`;
  }

  const subjectInstructions: Record<string, string> = {
    math: '\nFor math: Show steps clearly, explain reasoning, use proper notation.',
    writing: '\nFor writing: Focus on structure, thesis development, original thought.',
    languages: '\nFor languages: Help with grammar rules, translation concepts, cultural context.',
    science: '\nFor science: Explain with evidence-based reasoning, encourage hypothesis formation.',
  };
  if (!staff && subjectInstructions[subject]) {
    systemMessage += subjectInstructions[subject];
  }

  // Add resource context if provided
  if (resourceContext) {
    systemMessage += `\n\nThe student is referencing the following class resource:\n${resourceContext}\nUse this context to provide more relevant and targeted assistance.`;
  }

  // Add school training examples
  if (schoolTrainingContext) {
    systemMessage += schoolTrainingContext;
  }

  // IB assessment accuracy: the verified MYP criteria and rules for assessment requests
  const assessText = `${prompt}\n${resourceContext ?? ''}\n${subject}`;
  const mypRef = mypGuidance(assessText, subject, staff ? 'staff' : 'student', gradeLevel);
  if (mypRef) systemMessage += `\n\n${mypRef}`;

  // --- Call AI with timeout ---
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    return json({ success: false, reply: FALLBACK_REPLY, error: 'AI service not configured', meta: null }, 500);
  }

  let responseText = '';
  let promptTokens = 0;
  let completionTokens = 0;

  // --- Pick the model and reasoning level ---
  const access = await getAccess(userId, schoolSettings);
  const resolved = resolveModel(requestedModel, access);
  let usedModel = resolved.id;
  let notice = resolved.notice;
  const chosen = findModel(usedModel);
  let usedEffort: Effort | null = chosen && chosen.efforts.length
    ? (chosen.efforts.includes(requestedEffort as Effort) ? (requestedEffort as Effort) : chosen.defaultEffort ?? null)
    : null;
  const priceIn = chosen?.price.input ?? COST_PER_1M_INPUT;

  // Chat library: every file, note and saved reply in this chat, within budget
  let libraryUse: LibraryUse | null = null;
  if (libraryEnabled && userId && sessionId) {
    try {
      const { data: items } = await getAdminClient()
        .from('chat_context_items')
        .select('id, name, kind, content, pinned, created_at')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      const recent = history.filter((h) => h.role === 'user').slice(-2).map((h) => h.content).join('\n');
      const lib = buildLibrary(items ?? [], `${prompt}\n${prompt}\n${recent}`, libraryBudget(priceIn));
      if (lib) {
        libraryUse = lib.use;
        systemMessage += `\n${LIBRARY_RULES}${lib.use.mode === 'excerpts' ? `\nThe library is larger than one reply can read, so you are seeing the parts most relevant to this question from ${lib.use.used} of ${lib.use.items} items. If something the user mentions seems missing, say so and suggest they pin that file.` : ''}\n<library>\n${lib.text}\n</library>`;
      }
    } catch (e) {
      console.error('Library load failed (non-fatal):', e);
    }
  }

  // Past papers (teachers only): the school's own IB papers, when the request is about assessment
  let pastPapersUsed: string[] = [];
  if (staff && userId && (PAST_PAPER_INTENT.test(prompt) || ASSESSMENT_INTENT.test(prompt))) {
    try {
      const programme = programmeOf(assessText, gradeLevel);
      const groups = programme === 'dp' ? 'dp' as const : detectGroups(assessText, subject);
      const explicit = PAST_PAPER_INTENT.test(prompt);
      // Without a clear subject, only search every paper when past papers were asked for
      if (explicit || groups === 'dp' || groups.length) {
        const recent = history.filter((h) => h.role === 'user').slice(-2).map((h) => h.content).join('\n');
        const block = await pastPaperBlock(getAdminClient(), userId, `${prompt}\n${prompt}\n${recent}`, groups, Math.min(120_000, Math.round(libraryBudget(priceIn) / 3)));
        if (block) {
          pastPapersUsed = block.used;
          systemMessage += `\n\n${block.text}`;
        } else if (explicit) {
          systemMessage += `\n\nPAST PAPERS: the teacher has no past papers in Refyn for this subject yet. Say so plainly, point them to Past papers in the sidebar to add their school's copies, and offer clearly labelled IB-style questions meanwhile. Never present invented questions as past-paper questions.`;
        }
      }
    } catch (e) {
      console.error('Past papers load failed (non-fatal):', e);
    }
  }

  // Conversation history: as many recent turns as fit the model's budget
  const histBudget = historyBudget(priceIn);
  const kept: typeof history = [];
  let histUsed = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const c = history[i].content.length;
    if (kept.length >= 4 && histUsed + c > histBudget) break;
    kept.unshift({ role: history[i].role, content: history[i].content.slice(0, 40_000) });
    histUsed += Math.min(c, 40_000);
  }

  const userContent = images.length
    ? [{ type: 'text', text: effectivePrompt }, ...images.map((url) => ({ type: 'image_url', image_url: { url } }))]
    : effectivePrompt;
  let messages: unknown[] = [
    { role: 'system', content: systemMessage },
    ...kept,
    { role: 'user', content: userContent },
  ];
  const timeoutMs = usedEffort === 'high' ? 110_000 : usedEffort === 'medium' ? 75_000 : 45_000;

  // Try the chosen model, then known-good ones if the gateway rejects it
  // (e.g. a model that isn't live yet). School allow-lists still apply.
  const candidates = [usedModel, ...FALLBACK_MODELS.filter(id => id !== usedModel && (!access.schoolModels || access.schoolModels.includes(id)))].slice(0, 3);

  try {
    for (const candidate of candidates) {
      const effort = candidate === usedModel ? usedEffort : null;
      const gatewayId = access.gatewayIds.get(candidate) ?? candidate;
      let result = await callGateway(lovableApiKey, gatewayId, effort, messages, timeoutMs);

      // Some models reject reasoning_effort: retry once without it
      if (!result.ok && result.status === 400 && effort && /reason/i.test(result.text)) {
        result = await callGateway(lovableApiKey, gatewayId, null, messages, timeoutMs);
        if (result.ok) usedEffort = null;
      }

      // A model without image input: answer from the text (the library holds a transcription)
      if (!result.ok && result.status === 400 && images.length && /image|vision|multimodal|content/i.test(result.text)) {
        messages = [{ role: 'system', content: systemMessage }, ...kept, { role: 'user', content: effectivePrompt }];
        result = await callGateway(lovableApiKey, gatewayId, effort, messages, timeoutMs);
      }

      if (!result.ok) {
        console.error('AI gateway error:', candidate, result.status, result.text.slice(0, 500));
        if (result.status === 429) {
          return json({ success: false, reply: 'Rate limit exceeded. Please wait a moment and try again.', error: 'rate_limited', meta: null }, 429);
        }
        if (result.status === 402) {
          return json({ success: false, reply: 'AI service requires credits. Please contact your administrator.', error: 'payment_required', meta: null }, 402);
        }
        if ([400, 404, 422].includes(result.status)) {
          // Model not served: remember it so the picker stops offering it, then try the next one
          if (modelMissing(result.status, result.text)) runInBackground(recordAvailability(candidate, false, null, `${result.status} ${result.text}`));
          continue;
        }
        throw new Error(`AI gateway returned ${result.status}`);
      }

      if (candidate !== usedModel) {
        const from = findModel(usedModel)?.name ?? usedModel;
        const to = findModel(candidate)?.name ?? candidate;
        notice = `${from} isn't available right now, so ${to} answered.`;
        usedModel = candidate;
        usedEffort = null;
      }

      if (access.unavailable.has(candidate) || !access.gatewayIds.has(candidate)) {
        runInBackground(recordAvailability(candidate, true, gatewayId, null));
      }

      const aiData = result.data;
      responseText = aiData?.choices?.[0]?.message?.content || '';

      // Extract token usage if available
      if (aiData?.usage) {
        promptTokens = aiData.usage.prompt_tokens || 0;
        completionTokens = aiData.usage.completion_tokens || 0;
      } else {
        // Estimate tokens (~4 chars per token)
        promptTokens = Math.ceil((systemMessage.length + effectivePrompt.length) / 4);
        completionTokens = Math.ceil((responseText.length) / 4);
      }
      break;
    }
  } catch (err) {
    console.error('AI call failed:', err);
  }
  const usedInfo = findModel(usedModel);

  const answered = !!responseText && responseText.trim().length > 0;
  if (!answered) {
    responseText = FALLBACK_REPLY;
  }

  // --- Log to prompt_logs + ai_usage_logs (best-effort) ---
  if (userId) {
    try {
      const adminClient = getAdminClient();
      const totalTokens = promptTokens + completionTokens;
      const price = usedInfo?.price ?? { input: COST_PER_1M_INPUT, output: COST_PER_1M_OUTPUT };
      const estimatedCost = (promptTokens / 1_000_000) * price.input + (completionTokens / 1_000_000) * price.output;

      // Log usage
      await adminClient.from('ai_usage_logs').insert({
        user_id: userId,
        session_id: sessionId || null,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCost,
        model: usedModel,
      });

      // Log prompt
      await adminClient.from('prompt_logs').insert({
        user_id: userId,
        original_prompt: prompt,
        modified_prompt: moderationStatus === 'rewritten' ? effectivePrompt : null,
        response: responseText.substring(0, 500),
        status: moderationStatus as string,
        severity,
        subject,
        grade_level: gradeLevel,
        process_mode_enabled: processTeaching,
        flagged_keywords: flaggedKeywords.length > 0 ? flaggedKeywords : null,
        ai_engine: usedInfo?.provider ?? usedModel.split('/')[0] ?? 'google',
      });
    } catch (logErr) {
      console.error('Logging failed (non-fatal):', logErr);
    }
  }

  return json({
    success: true,
    reply: responseText,
    error: null,
    meta: {
      moderationStatus,
      severity,
      flaggedKeywords: flaggedKeywords.length > 0 ? flaggedKeywords : undefined,
      // Only report a model when one actually produced the reply
      model: answered ? usedModel : undefined,
      modelName: answered ? usedInfo?.name ?? usedModel : undefined,
      provider: answered ? usedInfo?.provider ?? usedModel.split('/')[0] : undefined,
      effort: answered ? usedEffort : undefined,
      requestedModel: requestedModel ? normalizeModel(requestedModel) : null,
      notice: notice ?? undefined,
      library: libraryUse ?? undefined,
      pastPapers: pastPapersUsed.length ? pastPapersUsed : undefined,
      ibReference: mypRef ? true : undefined,
      usage: answered ? { prompt: promptTokens, completion: completionTokens } : undefined,
      mode: staff ? 'teacher' : processTeaching || forceProcessMode ? 'guided' : 'direct',
    },
  });
});
