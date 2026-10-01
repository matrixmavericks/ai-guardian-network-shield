import { supabase } from "@/integrations/supabase/client";
import { ATL_CLUSTERS, PP_CRITERIA, PP_FORMAT, PP_STRANDS, bestFit, type PPCriterionId, type PPStrandId } from "@/lib/personalProject";

// Personal project coach: local checks (format, structure, writing signals,
// similarity fingerprints), the examiner-style AI review one strand at a time,
// and the tutor that explains it.

// The review table is newer than the generated Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const FILES = "pp-files";

export type AnnotationType = "strength" | "weakness" | "missing" | "suggestion";
export type Annotation = { quote: string; page: number | null; type: AnnotationType; descriptor: string; comment: string; fix: string };
export type ElementCheck = { element: string; status: "met" | "partly" | "missing"; comment: string; quote: string; page: number | null };
export type StrandResult = {
  strand: PPStrandId;
  level: number;
  band: string | null;
  weak: boolean;
  confidence: "low" | "medium" | "high";
  commandTerm?: string;
  summary: string;
  whyThisLevel?: string;
  whyNotHigher?: string;
  whyNotLower?: string;
  elements: ElementCheck[];
  annotations: Annotation[];
  nextBand: { band: string; steps: string[] } | null;
  topBand?: string;
  questions: string[];
  model?: string;
  error?: string;
};
export type ReportMap = {
  learningGoal?: { summary?: string; page?: number | null; isAboutLearning?: boolean };
  personalInterest?: { summary?: string; page?: number | null };
  product?: { summary?: string; page?: number | null };
  successCriteria?: { name: string; detailed?: boolean; justified?: boolean; isProductQuality?: boolean; inPlan?: boolean; evaluated?: "yes" | "partly" | "no"; evaluationEvidence?: boolean; page?: number | null }[];
  plan?: { page?: number | null; steps?: number; productFocused?: boolean; detailed?: boolean; linksToCriteria?: boolean };
  atlForGoal?: { skill: string; cluster?: string; how?: string; evidence?: boolean; page?: number | null }[];
  atlForProduct?: { skill: string; cluster?: string; how?: string; evidence?: boolean; page?: number | null }[];
  biBiiSeparated?: boolean;
  impact?: { summary?: string; page?: number | null; isMoreThanGoal?: boolean };
  evidence?: { kind: string; page?: number | null; supports?: string }[];
  linksRelied?: number;
  sections?: { criterion: string; fromPage?: number | null; toPage?: number | null }[];
};
export type Overview = {
  headline: string;
  strengths: string[];
  priorities: { title: string; strand: string; gain: string; action: string }[];
  consistency: { issue: string; strands: string[] }[];
  examinerNote: string;
  error?: string;
};
export type Integrity = {
  authenticity: { signals: "few" | "some" | "many"; summary: string; passages: { quote: string; page?: number | null; why: string; fix: string }[] };
  citations: { hasBibliography: boolean; inTextCitations: boolean; summary: string; issues: { quote: string; page?: number | null; issue: string }[] };
  checkSources: { quote: string; page?: number | null; why: string }[];
};
export type Similarity = { compared: number; template?: number; matches: { overlap: number; shared: number; when: string }[]; note?: string };
export type Check = { id: string; ok: boolean | null; title: string; detail: string };
export type Writing = { sentences: number; meanLength: number; variety: number; personal: number; specifics: number; stock: { phrase: string; count: number }[] };
export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Review = {
  id: string;
  createdAt: string;
  title: string;
  fileName?: string;
  filePath?: string | null;
  fileType?: "pdf" | "docx" | null;
  pages?: number;
  words: number;
  minutes: number;
  text: string;
  map?: ReportMap & { error?: string };
  strands: Partial<Record<PPStrandId, StrandResult>>;
  criteria: Record<PPCriterionId, number>;
  /** Criteria with a strand that couldn't be reviewed (not scored) */
  incomplete?: PPCriterionId[];
  total: number;
  overview?: Overview;
  integrity?: Integrity & { error?: string };
  similarity?: Similarity & { error?: string };
  format: Check[];
  writing: Writing;
  chat?: ChatMessage[];
};

export const wordCount = (t: string) => (t.replace(/^## Page \d+$/gm, "").match(/[\p{L}\p{N}’']+/gu) ?? []).length;
const plain = (t: string) => t.replace(/^## Page \d+$/gm, "");

/** Older saved reviews used found/gaps lists: turn them into annotations. */
export function upgrade(review: Review): Review {
  const strands = { ...review.strands };
  for (const id of Object.keys(strands) as PPStrandId[]) {
    const r = strands[id] as StrandResult & { found?: { quote: string; note: string }[]; gaps?: { quote: string; note: string }[] };
    if (!r || r.annotations) continue;
    strands[id] = {
      ...r,
      elements: r.elements ?? [],
      annotations: [
        ...(r.found ?? []).map((f) => ({ quote: f.quote, page: null, type: "strength" as const, descriptor: "", comment: f.note, fix: "" })),
        ...(r.gaps ?? []).map((g) => ({ quote: g.quote, page: null, type: "weakness" as const, descriptor: "", comment: g.note, fix: "" })),
      ],
    };
  }
  return { ...review, strands, chat: review.chat ?? [] };
}

/* ---------- format and structure ---------- */

export function formatChecks(text: string, pages: number | undefined, minutes: number): Check[] {
  const body = plain(text);
  const words = wordCount(text);
  const allowed = PP_FORMAT.maxPages - Math.min(PP_FORMAT.maxMinutes, minutes) * PP_FORMAT.pagesPerMinute;
  const estimate = Math.ceil(words / 450);
  const firstPage = text.split(/^## Page \d+$/m)[1] ?? "";
  const links = body.match(/\bhttps?:\/\/\S+|\bwww\.\S+/gi) ?? [];
  const hasBib = /\b(bibliography|references|works cited|sources)\b\s*\n/i.test(body.slice(Math.floor(body.length * 0.6)));
  const atl = ATL_CLUSTERS.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(body));
  const goal = body.match(/learning goal[^.\n]{0,40}?(is|was)\s+(to\s+)?([^.\n]{5,160})/i)?.[3] ?? "";
  const productish = /\b(make|create|build|design|produce|code|film|write|develop)\b.{0,40}\b(website|video|app|game|book|product|film|model|dress|cake|song|album|blog|podcast)\b/i.test(goal);
  const checks: Check[] = [
    pages
      ? { id: "length", ok: pages <= allowed, title: `${pages} of ${allowed} pages`, detail: pages <= allowed ? `Within the limit${minutes ? ` for a report with ${minutes} minute${minutes === 1 ? "" : "s"} of recording` : ""}.` : `Over the limit by ${pages - allowed}. Pages beyond the limit may not be assessed: cut, or move detail into clearer evidence.` }
      : { id: "length", ok: estimate <= allowed ? null : false, title: `About ${estimate} page${estimate === 1 ? "" : "s"} (${words.toLocaleString()} words)`, detail: `Estimated from the word count. The limit is ${allowed} pages${minutes ? ` with ${minutes} minutes of recording` : ""}; check the page count in the final PDF.` },
    pages && firstPage.replace(/\s+/g, " ").trim().length < 300
      ? { id: "title", ok: false, title: "Looks like a title page", detail: "The first page has very little text. A title page counts towards the page limit, so leave it out." }
      : { id: "title", ok: true, title: "No title page", detail: "Good: a title page would count towards the limit." },
    links.length
      ? { id: "links", ok: false, title: `${links.length} link${links.length === 1 ? "" : "s"} in the report`, detail: "Examiners don't follow links. Anything you want assessed (evidence, journal extracts, images) must be in the report itself. Links in your bibliography are fine." }
      : { id: "links", ok: true, title: "No links relied on", detail: "Everything assessed is in the report." },
    { id: "atl", ok: atl.length ? true : false, title: atl.length ? `ATL skills named: ${atl.join(", ")}` : "No ATL skill clusters named", detail: `Criterion B asks how you applied ATL skills. Name them (${ATL_CLUSTERS.join(", ")}) and explain how each helped.` },
    goal && productish
      ? { id: "goal", ok: false, title: "Your learning goal may just be making the product", detail: `"${goal.trim().slice(0, 120)}" sounds like the product itself. Examiners say this limits depth: the learning goal should be what you want to learn.` }
      : { id: "goal", ok: goal ? true : null, title: goal ? "Learning goal stated" : "Couldn't find 'my learning goal is…'", detail: goal ? "Make sure it's about what you'll learn, not just what you'll make." : "State your learning goal clearly near the start, in so many words." },
    { id: "bibliography", ok: null, title: hasBib ? "Bibliography found in the report" : "No bibliography found", detail: hasBib ? "The bibliography is submitted separately and doesn't count towards the page limit, so you can move it out of the report." : "Submit a bibliography of every source you used (it's separate from the report). Cite sources in the text too." },
    { id: "form", ok: null, title: "Academic integrity form", detail: "Submit the IB academic integrity form with your supervisor meetings recorded (at least three) and your declaration." },
  ];
  for (const s of PP_STRANDS) {
    if (!s.cues.test(body)) checks.push({ id: `section-${s.id}`, ok: false, title: `Couldn't find a part for ${s.id} (${s.label})`, detail: `The report should follow the criteria. Add a clearly headed part for: ${s.objective}` });
  }
  return checks;
}

/* ---------- writing signals (no verdict: these can't prove anything) ---------- */

const STOCK = [
  "delve", "tapestry", "testament to", "multifaceted", "in today's fast-paced world", "plays a crucial role", "it is important to note",
  "navigate the complexities", "embark on a journey", "a rich tapestry", "unleash", "elevate", "seamless", "in conclusion, this project",
  "furthermore,", "moreover,", "additionally,", "overall, this", "holistic", "pivotal", "invaluable", "foster", "underscores",
  "shed light on", "a deeper understanding", "ever-evolving", "harness the power",
];

export function writingSignals(text: string): Writing {
  const body = plain(text).replace(/\s+/g, " ");
  const sentences = body.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/).map((s) => s.trim()).filter((s) => s.split(" ").length >= 3);
  const lengths = sentences.map((s) => s.split(" ").length);
  const mean = lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length);
  const sd = Math.sqrt(lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, lengths.length));
  const words = body.toLowerCase().match(/[a-z’']+/g) ?? [];
  const firstPerson = words.filter((w) => ["i", "my", "me", "i'm", "i’m", "i've", "i’ve", "myself"].includes(w)).length;
  const specifics = (body.match(/\b\d{1,4}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi) ?? []).length;
  const lower = body.toLowerCase();
  const stock = STOCK.map((phrase) => ({ phrase, count: lower.split(phrase).length - 1 })).filter((s) => s.count > 0).sort((a, b) => b.count - a.count);
  const per1000 = (n: number) => Math.round((n / Math.max(1, words.length)) * 1000 * 10) / 10;
  return { sentences: sentences.length, meanLength: Math.round(mean * 10) / 10, variety: Math.round((sd / Math.max(1, mean)) * 100) / 100, personal: per1000(firstPerson), specifics: per1000(specifics), stock };
}

/* ---------- similarity fingerprints: hashes of 8-word phrases ---------- */

export function fingerprints(text: string): number[] {
  const words = plain(text).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const out = new Set<number>();
  for (let i = 0; i + 8 <= words.length; i++) {
    let h = 0x811c9dc5;
    const s = words.slice(i, i + 8).join(" ");
    for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 0x01000193); }
    out.add(h | 0);
  }
  return [...out].slice(0, 20_000);
}

/* ---------- calls ---------- */

const call = async <T,>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("pp-feedback", { body });
  if (data?.error) throw new Error(data.error);
  if (error) {
    let message = error.message;
    try { message = (await (error as { context?: Response }).context?.json())?.error ?? message; } catch { /* not JSON */ }
    throw new Error(message || "Refyn couldn't review this just now.");
  }
  return data as T;
};

const emptyStrand = (id: PPStrandId, error: string): StrandResult => ({ strand: id, level: 0, band: null, weak: false, confidence: "low", summary: "", elements: [], annotations: [], nextBand: null, questions: [], error });

const strandDigest = (r: StrandResult) => ({
  id: r.strand, level: r.error ? null : r.level, weak: r.weak, summary: r.summary, whyNotHigher: r.whyNotHigher,
  elements: r.elements.map((e) => `${e.status}: ${e.element}`),
});

/* ---------- the review ---------- */

export type Progress = { done: number; total: number; label: string };

export async function runReview(opts: {
  userId: string;
  schoolId: string | null;
  text: string;
  title: string;
  file?: File;
  pages?: number;
  minutes: number;
  compare: boolean;
  onProgress: (p: Progress) => void;
  onStrand?: (r: StrandResult) => void;
}): Promise<Review> {
  const { text } = opts;
  const words = wordCount(text);
  const fileType = opts.file ? (/\.pdf$/i.test(opts.file.name) ? "pdf" : /\.docx$/i.test(opts.file.name) ? "docx" : null) : null;
  const { data: row, error } = await db
    .from("pp_reviews")
    .insert({ user_id: opts.userId, school_id: opts.schoolId, title: opts.title.slice(0, 200) || "Personal project report", file_name: opts.file?.name.slice(0, 200) ?? null, pages: opts.pages ?? null, words, recording_minutes: opts.minutes })
    .select("id, created_at")
    .single();
  if (error || !row) throw new Error("Couldn't start the review.");

  // Keep the original so feedback can be shown on the real document
  let filePath: string | null = null;
  if (opts.file && fileType) {
    const path = `${opts.userId}/${row.id}.${fileType}`;
    const up = await supabase.storage.from(FILES).upload(path, opts.file, { contentType: opts.file.type || (fileType === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), upsert: true });
    if (!up.error) {
      filePath = path;
      await db.from("pp_reviews").update({ file_path: path, file_type: fileType }).eq("id", row.id);
    }
  }

  const review: Review = {
    id: row.id,
    createdAt: row.created_at,
    title: opts.title,
    fileName: opts.file?.name,
    filePath,
    fileType: filePath ? fileType : null,
    pages: opts.pages,
    words,
    minutes: opts.minutes,
    text,
    strands: {},
    criteria: { A: 0, B: 0, C: 0 },
    total: 0,
    format: formatChecks(text, opts.pages, opts.minutes),
    writing: writingSignals(text),
    chat: [],
  };

  const jobs: { label: string; run: () => Promise<void> }[] = [
    {
      label: "Mapping your report",
      run: async () => {
        try { review.map = (await call<{ map: ReportMap }>({ action: "map", text })).map; } catch (e) { review.map = { error: (e as Error).message }; }
      },
    },
    ...PP_STRANDS.map((s) => ({
      label: `Grading ${s.id}: ${s.label}`,
      run: async () => {
        try { review.strands[s.id] = await call<StrandResult>({ action: "strand", strand: s.id, text }); } catch (e) { review.strands[s.id] = emptyStrand(s.id, (e as Error).message); }
        opts.onStrand?.(review.strands[s.id]!);
      },
    })),
    {
      label: "Checking your voice and referencing",
      run: async () => {
        try { review.integrity = await call<Integrity>({ action: "integrity", text }); } catch (e) { review.integrity = { authenticity: { signals: "some", summary: "", passages: [] }, citations: { hasBibliography: false, inTextCitations: false, summary: "", issues: [] }, checkSources: [], error: (e as Error).message }; }
      },
    },
    ...(opts.compare
      ? [{
          label: "Comparing with other reports",
          run: async () => {
            try { review.similarity = await call<Similarity>({ action: "similarity", reviewId: review.id, hashes: fingerprints(text) }); } catch (e) { review.similarity = { compared: 0, matches: [], error: (e as Error).message }; }
          },
        }]
      : []),
  ];

  let done = 0;
  const total = jobs.length + 1;
  opts.onProgress({ done, total, label: "Reading your report" });
  const queue = [...jobs];
  const worker = async () => {
    while (queue.length) {
      const job = queue.shift()!;
      opts.onProgress({ done, total, label: job.label });
      await job.run();
      done++;
      opts.onProgress({ done, total, label: job.label });
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);

  score(review);
  opts.onProgress({ done, total, label: "Writing your overall feedback" });
  review.overview = await overviewFor(review);
  opts.onProgress({ done: total, total, label: "Done" });
  await save(review);
  return review;
}

async function overviewFor(review: Review): Promise<Overview> {
  try {
    return await call<Overview>({ action: "overview", map: review.map ?? {}, strands: Object.values(review.strands).filter(Boolean).map((r) => strandDigest(r!)) });
  } catch (e) {
    return { headline: "", strengths: [], priorities: [], consistency: [], examinerNote: "", error: (e as Error).message };
  }
}

const save = (review: Review) => db.from("pp_reviews").update({ result: review }).eq("id", review.id);

/** Criterion levels (best fit of their strands). A criterion missing a strand isn't scored. */
function score(review: Review) {
  review.incomplete = [];
  for (const c of Object.keys(PP_CRITERIA) as PPCriterionId[]) {
    const results = PP_CRITERIA[c].strands.map((id) => review.strands[id]);
    if (results.some((r) => !r || r.error)) {
      review.criteria[c] = 0;
      review.incomplete.push(c);
      continue;
    }
    review.criteria[c] = bestFit((results as StrandResult[]).map((r) => ({ level: r.level, weak: r.weak })));
  }
  review.total = review.criteria.A + review.criteria.B + review.criteria.C;
}

/** Grade one strand again (after a failure), refresh the overview, and save. */
export async function retryStrand(review: Review, id: PPStrandId): Promise<Review> {
  const next: Review = { ...review, strands: { ...review.strands }, criteria: { ...review.criteria } };
  try {
    next.strands[id] = await call<StrandResult>({ action: "strand", strand: id, text: review.text });
  } catch (e) {
    next.strands[id] = { ...(review.strands[id] ?? emptyStrand(id, "")), error: (e as Error).message };
  }
  score(next);
  if (!next.strands[id]?.error) next.overview = await overviewFor(next);
  await save(next);
  return next;
}

/* ---------- the tutor ---------- */

/** A compact summary of the feedback for the tutor. */
export function digestOf(review: Review): string {
  const lines = [
    `Indicative levels: A ${review.criteria.A}/8, B ${review.criteria.B}/8, C ${review.criteria.C}/8, total ${review.total}/24.`,
    ...PP_STRANDS.map((s) => {
      const r = review.strands[s.id];
      if (!r || r.error) return `${s.id}: not reviewed.`;
      return `${s.id} (${s.label}) level ${r.level}${r.weak ? " (only just)" : ""}. ${r.summary} Why not higher: ${r.whyNotHigher ?? ""} Elements: ${r.elements.map((e) => `${e.status} – ${e.element}`).join("; ")}`;
    }),
    review.overview?.priorities.length ? `Priorities: ${review.overview.priorities.map((p) => `${p.title} (${p.strand}, ${p.gain})`).join("; ")}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function askTutor(review: Review, question: string, focus?: string): Promise<Review> {
  const history = (review.chat ?? []).slice(-10);
  const { answer } = await call<{ answer: string }>({ action: "ask", question, history, text: review.text, digest: digestOf(review), focus });
  const next: Review = { ...review, chat: [...(review.chat ?? []), { role: "user", content: question }, { role: "assistant", content: answer }] };
  await save(next);
  return next;
}

/* ---------- stored reviews and files ---------- */

export async function listReviews(): Promise<{ id: string; title: string; created_at: string; words: number | null; file_path: string | null; file_type: string | null; result: Partial<Review> }[]> {
  const { data } = await db.from("pp_reviews").select("id, title, created_at, words, file_path, file_type, result").order("created_at", { ascending: false }).limit(30);
  return data ?? [];
}

export async function deleteReview(id: string, filePath?: string | null) {
  await db.from("pp_reviews").delete().eq("id", id);
  if (filePath) await supabase.storage.from(FILES).remove([filePath]);
}

export async function loadFile(path: string): Promise<Blob | null> {
  const { data } = await supabase.storage.from(FILES).download(path);
  return data ?? null;
}

/* ---------- finding quotes in text (for highlights) ---------- */

const canon = (c: string) => (/[‘’`´]/.test(c) ? "'" : /[“”„]/.test(c) ? '"' : /[–—−]/.test(c) ? "-" : c.toLowerCase());

/** Normalized text with a map back to original indices (collapsed spaces, plain quotes and dashes, lower case). */
export function normalize(text: string): { norm: string; map: number[] } {
  const map: number[] = [];
  let norm = "";
  let space = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (!space && norm) { norm += " "; map.push(i); }
      space = true;
      continue;
    }
    space = false;
    norm += canon(ch);
    map.push(i);
  }
  return { norm, map };
}

export const normQuote = (quote: string) => [...quote.replace(/\s+/g, " ").trim()].map(canon).join("").replace(/^["'.…]+|["'.…]+$/g, "");

/** Where a quote appears in normalized text, as [start, end) in normalized indices, or null. */
export function findNorm(norm: string, quote: string): [number, number] | null {
  const q = normQuote(quote);
  if (q.length < 4) return null;
  let at = norm.indexOf(q);
  if (at >= 0) return [at, at + q.length];
  // The model sometimes trims or merges words: fall back to the first 50 characters
  if (q.length > 50) {
    at = norm.indexOf(q.slice(0, 50));
    if (at >= 0) return [at, Math.min(norm.length, at + q.length)];
  }
  return null;
}

/** Where a quote appears in the text, as [start, end) original indices, or null. */
export function locate(text: string, quote: string): [number, number] | null {
  const { norm, map } = normalize(text);
  const hit = findNorm(norm, quote);
  if (!hit) return null;
  return [map[hit[0]], map[Math.min(map.length - 1, hit[1] - 1)] + 1];
}
