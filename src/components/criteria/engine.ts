import { supabase } from "@/integrations/supabase/client";
import { extractFile } from "@/components/assistant/files/extract";
import { MYP, gradeFor, type Letter, type MypGroup } from "@/lib/myp";
import type { Annotation, ChatMessage } from "@/components/pp/analyze";

// Criterion-based review of MYP work: the assessment coach (students) and the
// marking copilot (teachers). Both run one AI judgement per criterion.

// These tables are newer than the generated Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const FILES = "pp-files";
export const LETTERS: Letter[] = ["A", "B", "C", "D"];

export type StrandCheck = { strand: string; text: string; demand: "none" | "limited" | "adequate" | "substantial" | "excellent" | "not assessed"; comment: string; quote: string; page: number | null };
export type CriterionResult = {
  criterion: Letter;
  level: number;
  weak: boolean;
  confidence: "low" | "medium" | "high";
  summary: string;
  whyThisLevel: string;
  whyNotHigher: string;
  whyNotLower: string;
  strands: StrandCheck[];
  annotations: Annotation[];
  nextBand: { band: string; steps: string[] } | null;
  topBand: string;
  questions: string[];
  studentComment?: string;
  model?: string;
  error?: string;
};
export type Results = Partial<Record<Letter, CriterionResult>>;
export type TaskSpec = { title: string; description: string; tsc: string };

const call = async <T,>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("criteria-review", { body });
  if (data?.error) throw new Error(data.error);
  if (error) {
    let message = error.message;
    try { message = (await (error as { context?: Response }).context?.json())?.error ?? message; } catch { /* not JSON */ }
    throw new Error(message || "Refyn couldn't review this just now.");
  }
  return data as T;
};

const failed = (l: Letter, error: string): CriterionResult => ({ criterion: l, level: 0, weak: false, confidence: "low", summary: "", whyThisLevel: "", whyNotHigher: "", whyNotLower: "", strands: [], annotations: [], nextBand: null, topBand: "", questions: [], error });

export async function reviewCriterion(text: string, group: MypGroup, year: number, letter: Letter, task: TaskSpec, audience: "student" | "teacher"): Promise<CriterionResult> {
  try {
    return await call<CriterionResult>({ action: "review", text, group, year, criterion: letter, task, audience });
  } catch (e) {
    return failed(letter, (e as Error).message);
  }
}

/** Total and the IB 1–7 guideline grade (only when all four criteria are marked). */
export function totals(levels: Partial<Record<Letter, number | null>>, criteria: Letter[]) {
  const marked = criteria.filter((l) => typeof levels[l] === "number");
  const total = marked.reduce((t, l) => t + (levels[l] as number), 0);
  const complete = marked.length === criteria.length;
  const grade = complete && criteria.length === 4 ? gradeFor(total) : null;
  return { total, max: criteria.length * 8, complete, grade };
}

export const ext = (name: string) => (/\.pdf$/i.test(name) ? "pdf" : /\.docx$/i.test(name) ? "docx" : null);

async function keepFile(path: string, file: File): Promise<boolean> {
  const { error } = await supabase.storage.from(FILES).upload(path, file, { contentType: file.type || "application/octet-stream", upsert: true });
  return !error;
}

export async function loadFile(path: string): Promise<Blob | null> {
  const { data } = await supabase.storage.from(FILES).download(path);
  return data ?? null;
}

/* ---------- the student assessment coach ---------- */

export type TaskReview = {
  id: string;
  createdAt: string;
  title: string;
  group: MypGroup;
  year: number;
  criteria: Letter[];
  task: TaskSpec;
  filePath: string | null;
  fileType: "pdf" | "docx" | null;
  words: number;
  pages?: number;
  text: string;
  results: Results;
  chat: ChatMessage[];
};

const words = (t: string) => (t.replace(/^## Page \d+$/gm, "").match(/[\p{L}\p{N}’']+/gu) ?? []).length;

export async function runTaskReview(opts: {
  userId: string; text: string; title: string; group: MypGroup; year: number; criteria: Letter[]; task: TaskSpec; file?: File; pages?: number;
  onResult: (r: CriterionResult) => void;
}): Promise<TaskReview> {
  const { data: row, error } = await db
    .from("task_reviews")
    .insert({ user_id: opts.userId, title: opts.title.slice(0, 200) || "My work", subject_group: opts.group, year: opts.year, criteria: opts.criteria, task: opts.task, words: words(opts.text) })
    .select("id, created_at")
    .single();
  if (error || !row) throw new Error("Couldn't start the review.");
  const type = opts.file ? ext(opts.file.name) : null;
  let filePath: string | null = null;
  if (opts.file && type) {
    const path = `${opts.userId}/tasks/${row.id}.${type}`;
    if (await keepFile(path, opts.file)) {
      filePath = path;
      await db.from("task_reviews").update({ file_path: path, file_type: type }).eq("id", row.id);
    }
  }
  const review: TaskReview = {
    id: row.id, createdAt: row.created_at, title: opts.title, group: opts.group, year: opts.year, criteria: opts.criteria, task: opts.task,
    filePath, fileType: filePath ? type : null, words: words(opts.text), pages: opts.pages, text: opts.text, results: {}, chat: [],
  };
  await Promise.all(opts.criteria.map(async (l) => {
    const r = await reviewCriterion(opts.text, opts.group, opts.year, l, opts.task, "student");
    review.results[l] = r;
    opts.onResult(r);
  }));
  await saveTaskReview(review);
  return review;
}

// Query builders only run when awaited, so this must stay async even where callers don't wait for it
export async function saveTaskReview(r: TaskReview) {
  const { error } = await db.from("task_reviews").update({ result: { results: r.results, chat: r.chat, text: r.text, pages: r.pages ?? null } }).eq("id", r.id);
  if (error) throw new Error("Couldn't save.");
}

export async function retryTaskCriterion(r: TaskReview, l: Letter): Promise<TaskReview> {
  const next = { ...r, results: { ...r.results, [l]: await reviewCriterion(r.text, r.group, r.year, l, r.task, "student") } };
  await saveTaskReview(next);
  return next;
}

export async function listTaskReviews(): Promise<TaskReview[]> {
  const { data } = await db.from("task_reviews").select("id, title, subject_group, year, criteria, task, file_path, file_type, words, result, created_at").order("created_at", { ascending: false }).limit(40);
  return ((data ?? []) as Record<string, any>[]).map((d) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    id: d.id, createdAt: d.created_at, title: d.title, group: d.subject_group, year: d.year, criteria: d.criteria, task: d.task ?? { title: "", description: "", tsc: "" },
    filePath: d.file_path, fileType: d.file_type, words: d.words ?? 0, pages: d.result?.pages ?? undefined, text: d.result?.text ?? "", results: d.result?.results ?? {}, chat: d.result?.chat ?? [],
  }));
}

export async function deleteTaskReview(r: TaskReview) {
  await db.from("task_reviews").delete().eq("id", r.id);
  if (r.filePath) await supabase.storage.from(FILES).remove([r.filePath]);
}

/** A compact summary of the feedback for the tutor. */
export function digestOf(group: MypGroup, results: Results): string {
  return LETTERS.filter((l) => results[l]).map((l) => {
    const r = results[l]!;
    if (r.error) return `Criterion ${l}: not reviewed.`;
    return `Criterion ${l} (${MYP[group].criteria[l].name}) level ${r.level}${r.weak ? " (only just)" : ""}. ${r.summary} Why not higher: ${r.whyNotHigher} Strands: ${r.strands.map((s) => `${s.strand} ${s.demand}`).join("; ")}`;
  }).join("\n");
}

export async function askTutor(text: string, group: MypGroup, results: Results, chat: ChatMessage[], question: string, focus?: string): Promise<string> {
  const { answer } = await call<{ answer: string }>({ action: "ask", question, history: chat.slice(-10), text, group, digest: digestOf(group, results), focus });
  return answer;
}

/* ---------- the teacher marking copilot ---------- */

export type MarkingSet = {
  id: string;
  title: string;
  subject_group: MypGroup;
  year: number;
  criteria: Letter[];
  task: TaskSpec;
  assignment_id: string | null;
  insights: ClassInsights | null;
  created_at: string;
  updated_at: string;
};
export type Overrides = Partial<Record<Letter, number>> & { comment?: string };
export type MarkingItem = {
  id: string;
  set_id: string;
  student_name: string;
  student_id: string | null;
  submission_id: string | null;
  file_path: string | null;
  file_type: "pdf" | "docx" | null;
  text: string;
  status: "queued" | "working" | "done" | "error";
  error: string | null;
  result: { results?: Results; pages?: number };
  overrides: Overrides;
  approved: boolean;
  created_at: string;
};
export type ClassInsights = {
  headline: string;
  strengths: string[];
  misconceptions: { issue: string; criterion: string; students: string[] }[];
  reteach: { activity: string; criterion: string }[];
  groups: { label: string; students: string[] }[];
  at?: string;
};

export const levelOf = (item: MarkingItem, l: Letter): number | null => {
  const o = item.overrides?.[l];
  if (typeof o === "number") return o;
  const r = item.result?.results?.[l];
  return r && !r.error ? r.level : null;
};

/** The comment to the student: the teacher's edit, or the AI's per-criterion comments joined. */
export const commentOf = (item: MarkingItem, set: MarkingSet): string =>
  item.overrides?.comment ?? set.criteria.map((l) => {
    const c = item.result?.results?.[l]?.studentComment;
    return c ? `Criterion ${l} (${MYP[set.subject_group].criteria[l].name}): ${c}` : "";
  }).filter(Boolean).join("\n\n");

export async function listSets(): Promise<(MarkingSet & { count: number })[]> {
  const { data } = await db.from("marking_sets").select("*, marking_items(count)").order("updated_at", { ascending: false }).limit(50);
  return ((data ?? []) as (MarkingSet & { marking_items?: { count: number }[] })[]).map((s) => ({ ...s, task: s.task ?? { title: "", description: "", tsc: "" }, count: s.marking_items?.[0]?.count ?? 0 }));
}

export async function createSet(teacherId: string, s: Pick<MarkingSet, "title" | "subject_group" | "year" | "criteria" | "task" | "assignment_id">): Promise<MarkingSet> {
  const { data, error } = await db.from("marking_sets").insert({ ...s, teacher_id: teacherId }).select("*").single();
  if (error || !data) throw new Error("Couldn't create the marking set.");
  return data as MarkingSet;
}

export async function updateSet(id: string, patch: Partial<MarkingSet>) {
  const { error } = await db.from("marking_sets").update(patch).eq("id", id);
  if (error) throw new Error("Couldn't save.");
}

export async function loadSet(id: string): Promise<{ set: MarkingSet; items: MarkingItem[] } | null> {
  const [{ data: set }, { data: items }] = await Promise.all([
    db.from("marking_sets").select("*").eq("id", id).maybeSingle(),
    db.from("marking_items").select("*").eq("set_id", id).order("student_name", { ascending: true }),
  ]);
  if (!set) return null;
  return { set: { ...set, task: set.task ?? { title: "", description: "", tsc: "" } } as MarkingSet, items: (items ?? []) as MarkingItem[] };
}

export async function deleteSet(set: MarkingSet, items: MarkingItem[]) {
  await db.from("marking_sets").delete().eq("id", set.id);
  const paths = items.map((i) => i.file_path).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from(FILES).remove(paths);
}

export async function deleteItem(item: MarkingItem) {
  await db.from("marking_items").delete().eq("id", item.id);
  if (item.file_path) await supabase.storage.from(FILES).remove([item.file_path]);
}

/** "smith_jane_lab report.pdf" → "Smith Jane Lab Report" (the teacher can rename). */
export const nameFromFile = (name: string) =>
  name.replace(/\.[a-z0-9]+$/i, "").replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 120) || "Student";

export async function addFiles(teacherId: string, set: MarkingSet, files: File[], onStatus: (i: number, s: string) => void): Promise<MarkingItem[]> {
  const out: MarkingItem[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    try {
      onStatus(i, "Reading");
      const extracted = await extractFile(f, null, (s) => onStatus(i, s));
      const id = crypto.randomUUID();
      const type = ext(f.name);
      let path: string | null = null;
      if (type) {
        onStatus(i, "Uploading");
        const p = `${teacherId}/marking/${set.id}/${id}.${type}`;
        if (await keepFile(p, f)) path = p;
      }
      const { data, error } = await db.from("marking_items").insert({
        id, set_id: set.id, teacher_id: teacherId, student_name: nameFromFile(f.name), file_path: path, file_type: path ? type : null,
        text: extracted.text.slice(0, 200_000), result: { pages: extracted.pages ?? null },
      }).select("*").single();
      if (error || !data) throw new Error("Couldn't save it.");
      out.push(data as MarkingItem);
      onStatus(i, "Added");
    } catch (e) {
      onStatus(i, `Error: ${(e as Error).message}`);
    }
  }
  return out;
}

/** Bring in the submissions to a Refyn assignment (their text, or their uploaded file). */
export async function importSubmissions(
  teacherId: string, set: MarkingSet, subs: { id: string; student_id: string; content: string | null; file_url: string | null; file_name: string | null }[], names: Record<string, string>, existing: MarkingItem[],
): Promise<{ added: MarkingItem[]; skipped: number }> {
  const added: MarkingItem[] = [];
  let skipped = 0;
  for (const s of subs) {
    if (existing.some((i) => i.submission_id === s.id)) { skipped++; continue; }
    let text = (s.content ?? "").trim();
    let path: string | null = null;
    let type: "pdf" | "docx" | null = null;
    let pages: number | undefined;
    if (s.file_url) {
      try {
        // The submissions bucket is private: its stored "public" URLs don't open, so download by path
        const stored = s.file_url.split("/submission-files/")[1];
        const blob = stored
          ? (await supabase.storage.from("submission-files").download(decodeURIComponent(stored.split("?")[0]))).data
          : await (await fetch(s.file_url)).blob();
        if (!blob) throw new Error("Couldn't open the file.");
        const name = s.file_name || decodeURIComponent(s.file_url.split("/").pop() || "") || "submission";
        const file = new File([blob], name, { type: blob.type });
        const extracted = await extractFile(file, null);
        text = [text, extracted.text].filter(Boolean).join("\n\n");
        pages = extracted.pages;
        type = ext(name);
        if (type) {
          const p = `${teacherId}/marking/${set.id}/${s.id}.${type}`;
          if (await keepFile(p, file)) path = p;
        }
      } catch { /* fall back to the text */ }
    }
    if (text.length < 50) { skipped++; continue; }
    const { data } = await db.from("marking_items").insert({
      set_id: set.id, teacher_id: teacherId, student_name: (names[s.student_id] || "Student").slice(0, 120), student_id: s.student_id, submission_id: s.id,
      file_path: path, file_type: path ? type : null, text: text.slice(0, 200_000), result: { pages: pages ?? null },
    }).select("*").single();
    if (data) added.push(data as MarkingItem); else skipped++;
  }
  return { added, skipped };
}

export async function markItem(set: MarkingSet, item: MarkingItem, onUpdate: (i: MarkingItem) => void): Promise<MarkingItem> {
  let current: MarkingItem = { ...item, status: "working", error: null };
  onUpdate(current);
  await db.from("marking_items").update({ status: "working", error: null }).eq("id", item.id);
  const results: Results = { ...(item.result?.results ?? {}) };
  await Promise.all(set.criteria.map(async (l) => {
    if (results[l] && !results[l]!.error) return;
    results[l] = await reviewCriterion(item.text, set.subject_group, set.year, l, set.task, "teacher");
    current = { ...current, result: { ...current.result, results: { ...results } } };
    onUpdate(current);
  }));
  const errors = set.criteria.filter((l) => results[l]?.error);
  current = { ...current, status: errors.length ? "error" : "done", error: errors.length ? results[errors[0]]!.error! : null, result: { ...current.result, results } };
  await db.from("marking_items").update({ status: current.status, error: current.error, result: current.result }).eq("id", item.id);
  onUpdate(current);
  return current;
}

/** Mark every queued or failed item, a few at a time. */
export async function markAll(set: MarkingSet, items: MarkingItem[], onUpdate: (i: MarkingItem) => void, signal: { stop: boolean }) {
  const queue = items.filter((i) => i.status === "queued" || i.status === "error");
  const worker = async () => {
    while (queue.length && !signal.stop) await markItem(set, queue.shift()!, onUpdate);
  };
  await Promise.all([worker(), worker()]);
}

export async function saveItem(item: MarkingItem, patch: Partial<Pick<MarkingItem, "overrides" | "approved" | "student_name">>) {
  const { error } = await db.from("marking_items").update(patch).eq("id", item.id);
  if (error) throw new Error("Couldn't save.");
}

export async function draftTsc(set: Pick<MarkingSet, "subject_group" | "year" | "criteria" | "task">): Promise<string> {
  const { clarifications } = await call<{ clarifications: Record<string, Record<string, string>> }>({ action: "tsc", group: set.subject_group, year: set.year, criteria: set.criteria, task: set.task });
  return set.criteria.map((l) => {
    const b = clarifications[l];
    if (!b) return "";
    return `Criterion ${l}: ${MYP[set.subject_group].criteria[l].name}\n${["7-8", "5-6", "3-4", "1-2"].map((band) => `${band}: ${b[band]}`).join("\n")}`;
  }).filter(Boolean).join("\n\n");
}

export async function classInsights(set: MarkingSet, items: MarkingItem[]): Promise<ClassInsights> {
  const students = items.filter((i) => i.status === "done").map((i) => ({
    name: i.student_name,
    levels: Object.fromEntries(set.criteria.map((l) => [l, levelOf(i, l)])),
    notes: set.criteria.map((l) => { const r = i.result?.results?.[l]; return r ? `${l}: ${r.summary} Needs: ${r.whyNotHigher}` : ""; }).join(" "),
  }));
  const out = await call<ClassInsights>({ action: "summary", group: set.subject_group, criteria: set.criteria, students });
  return { ...out, at: new Date().toISOString() };
}

export function exportCsv(set: MarkingSet, items: MarkingItem[]): Blob {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Student", ...set.criteria.map((l) => `${l} ${MYP[set.subject_group].criteria[l].name}`), "Total", "Out of", ...(set.criteria.length === 4 ? ["1-7 (IB guideline)"] : []), "Approved", "Comment"];
  const rows = items.map((i) => {
    const levels = Object.fromEntries(set.criteria.map((l) => [l, levelOf(i, l)])) as Partial<Record<Letter, number | null>>;
    const t = totals(levels, set.criteria);
    return [i.student_name, ...set.criteria.map((l) => levels[l] ?? ""), t.complete ? t.total : "", t.max, ...(set.criteria.length === 4 ? [t.grade ?? ""] : []), i.approved ? "yes" : "no", commentOf(i, set)];
  });
  return new Blob(["﻿" + [head, ...rows].map((r) => r.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
}

/** Write an approved item's levels and comment back to its Refyn submission. */
export async function saveToSubmission(item: MarkingItem, set: MarkingSet, teacherId: string): Promise<{ grade: number; feedback: string } | null> {
  if (!item.submission_id) return null;
  const { data: sub } = await db.from("assignment_submissions").select("max_grade").eq("id", item.submission_id).maybeSingle();
  const max = Number(sub?.max_grade) || 100;
  const levels = Object.fromEntries(set.criteria.map((l) => [l, levelOf(item, l)])) as Partial<Record<Letter, number | null>>;
  const t = totals(levels, set.criteria);
  if (!t.complete) throw new Error(`${item.student_name} isn't fully marked yet.`);
  const grade = Math.round((t.total / t.max) * max);
  const feedback = `${set.criteria.map((l) => `${l} ${MYP[set.subject_group].criteria[l].name}: ${levels[l]}/8`).join(" · ")}${t.grade ? ` · Grade ${t.grade} (IB guideline)` : ""}\n\n${commentOf(item, set)}`.slice(0, 5000);
  const { error } = await db.from("assignment_submissions").update({ grade, feedback, graded_at: new Date().toISOString(), status: "graded", graded_by: teacherId }).eq("id", item.submission_id);
  if (error) throw new Error(`Couldn't save ${item.student_name}'s mark.`);
  return { grade, feedback };
}
