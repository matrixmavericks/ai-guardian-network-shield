import { supabase } from "@/integrations/supabase/client";
import { MYP, type Letter, type MypGroup } from "@/lib/myp";
import type { Printable, Question } from "@/components/studio/worksheet";
import type { DocOptions } from "@/components/studio/PrintableDoc";
import type { Assessment } from "@/components/criteria/engine";

// A task is a class assignment with everything a student needs: instructions,
// the worksheet itself, resources and a rubric (columns added in
// 20261001150000_task_materials.sql). Students can read every field of a task,
// so answers and mark schemes must never be stored in it.

// The new columns are newer than the generated Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
export const TASK_FILES = "task-files";

export type Band = "1-2" | "3-4" | "5-6" | "7-8";
export const BANDS: Band[] = ["1-2", "3-4", "5-6", "7-8"];

export type TaskResource =
  | { kind: "file"; id: string; name: string; path: string; size: number; type: string }
  | { kind: "link"; id: string; title: string; url: string }
  | { kind: "doc"; id: string; name: string; markdown: string }
  // A worksheet made in the Studio, shown exactly as designed (answers removed)
  | { kind: "printable"; id: string; name: string; doc: Printable; opts: Omit<DocOptions, "answerKey"> };

export type MypRubric = { kind: "myp"; group: MypGroup; year: number; criteria: Letter[]; clarifications: Partial<Record<Letter, Partial<Record<Band, string>>>>; notes?: string };
export type CustomCriterion = { name: string; points: number; levels: { label: string; descriptor: string }[] };
export type CustomRubric = { kind: "custom"; criteria: CustomCriterion[]; notes?: string };
export type Rubric = MypRubric | CustomRubric;

export type Task = {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  worksheet: string | null;
  resources: TaskResource[];
  rubric: Rubric | null;
  due_date: string | null;
  subject: string | null;
  is_group_assignment: boolean;
  group_formation: string;
  min_group_size: number;
  max_group_size: number;
  grading_type: string;
  created_at: string;
  updated_at: string;
};

export type TaskSubmission = {
  id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  grade: number | null;
  max_grade: number;
  feedback: string | null;
  status: string;
  submitted_at: string;
  graded_at: string | null;
  /** Criterion levels, comments and targets, when the teacher marked with the rubric */
  assessment?: Assessment | null;
  reflection?: string | null;
  reflected_at?: string | null;
};

export const SUBMISSION_COLUMNS = "id, content, file_url, file_name, grade, max_grade, feedback, status, submitted_at, graded_at, assessment, reflection, reflected_at";

export type TaskClass = { id: string; name: string; subject: string; teacher_id: string };

/* ---------- checking what's stored ---------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;
const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
const LETTERS: Letter[] = ["A", "B", "C", "D"];

export function cleanRubric(v: unknown): Rubric | null {
  const r = v as Loose | null;
  if (!r || typeof r !== "object") return null;
  if (r.kind === "myp" && typeof r.group === "string" && r.group in MYP) {
    const criteria = (Array.isArray(r.criteria) ? r.criteria : []).filter((l: unknown): l is Letter => LETTERS.includes(l as Letter));
    if (!criteria.length) return null;
    const clarifications: MypRubric["clarifications"] = {};
    for (const l of criteria) {
      const c = r.clarifications?.[l];
      if (c && typeof c === "object") clarifications[l] = Object.fromEntries(BANDS.filter((b) => typeof c[b] === "string" && c[b].trim()).map((b) => [b, str(c[b], 2000)]));
    }
    return { kind: "myp", group: r.group as MypGroup, year: Math.min(5, Math.max(1, Math.round(Number(r.year) || 5))), criteria: [...new Set(criteria)].sort() as Letter[], clarifications, notes: str(r.notes, 4000) || undefined };
  }
  if (r.kind === "custom" && Array.isArray(r.criteria)) {
    const criteria = r.criteria
      .map((c: Loose) => ({
        name: str(c?.name, 120),
        points: Math.max(0, Math.min(1000, Number(c?.points) || 0)),
        levels: (Array.isArray(c?.levels) ? c.levels : []).map((l: Loose) => ({ label: str(l?.label, 60), descriptor: str(l?.descriptor, 2000) })).filter((l: { label: string; descriptor: string }) => l.label || l.descriptor).slice(0, 8),
      }))
      .filter((c: CustomCriterion) => c.name)
      .slice(0, 20);
    return criteria.length ? { kind: "custom", criteria, notes: str(r.notes, 4000) || undefined } : null;
  }
  return null;
}

export function cleanResources(v: unknown): TaskResource[] {
  if (!Array.isArray(v)) return [];
  return v.filter((r: Loose) => r && typeof r === "object" && typeof r.id === "string" && ["file", "link", "doc", "printable"].includes(r.kind)) as TaskResource[];
}

const toTask = (row: Loose): Task => ({ ...(row as Task), resources: cleanResources(row.resources), rubric: cleanRubric(row.rubric) });

/* ---------- loading and saving ---------- */

export async function loadTask(id: string, userId: string | null) {
  const { data: row } = await db.from("class_assignments").select("*").eq("id", id).maybeSingle();
  if (!row) return null;
  const task = toTask(row);
  const [{ data: cls }, { data: sub }] = await Promise.all([
    db.from("classes").select("id, name, subject, teacher_id").eq("id", task.class_id).maybeSingle(),
    userId ? db.from("assignment_submissions").select(SUBMISSION_COLUMNS).eq("assignment_id", id).eq("student_id", userId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const { data: teacher } = await db.from("profiles").select("full_name").eq("user_id", task.teacher_id).maybeSingle();
  return { task, cls: (cls as TaskClass | null) ?? null, teacherName: (teacher?.full_name as string | undefined) ?? null, submission: (sub as TaskSubmission | null) ?? null };
}

export type TaskInput = Pick<Task, "class_id" | "title" | "instructions" | "worksheet" | "resources" | "rubric" | "due_date" | "subject" | "is_group_assignment" | "group_formation" | "min_group_size" | "max_group_size" | "grading_type"> & { description?: string | null };

/** A short plain-text summary for lists that only show the description. */
export const summaryOf = (t: { instructions?: string | null; worksheet?: string | null; description?: string | null }) =>
  (t.description?.trim() || (t.instructions ?? "").replace(/[#*_>`|-]+/g, " ").replace(/\s+/g, " ").trim()).slice(0, 280) || null;

/** Create (with an id chosen up front, so files can be uploaded first) or update a task. */
export async function saveTask(teacherId: string, input: TaskInput, opts: { id?: string; create: boolean }): Promise<string> {
  const row = { ...input, description: input.description ?? summaryOf(input), teacher_id: teacherId };
  if (!opts.create && opts.id) {
    const { error } = await db.from("class_assignments").update(row).eq("id", opts.id);
    if (error) throw new Error("Couldn't save the task.");
    return opts.id;
  }
  const { data, error } = await db.from("class_assignments").insert(opts.id ? { ...row, id: opts.id } : row).select("id").single();
  if (error || !data) throw new Error("Couldn't create the task.");
  return data.id as string;
}

/** Defaults for the columns the old assignment form set (group work off). */
export const SOLO = { is_group_assignment: false, group_formation: "student_choice", min_group_size: 2, max_group_size: 4, grading_type: "group" } as const;

export const newId = () => crypto.randomUUID();

export async function uploadTaskFile(classId: string, taskId: string, file: File): Promise<TaskResource> {
  const id = newId();
  const safe = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
  const path = `${classId}/${taskId}/${id}-${safe}`;
  const { error } = await supabase.storage.from(TASK_FILES).upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw new Error(`Couldn't upload ${file.name}.`);
  return { kind: "file", id, name: file.name, path, size: file.size, type: file.type };
}

export async function taskFileUrl(path: string, download?: string): Promise<string | null> {
  const { data } = await supabase.storage.from(TASK_FILES).createSignedUrl(path, 60 * 30, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}

export const removeTaskFiles = (paths: string[]) => (paths.length ? supabase.storage.from(TASK_FILES).remove(paths) : Promise.resolve());

/* ---------- keeping answers out ---------- */

/** A Studio worksheet without its mark scheme (students can read everything in a task). */
export function stripAnswers(p: Printable): Printable {
  const q = (x: Question): Question => ({ ...x, answer: undefined, parts: x.parts?.map((pt) => ({ ...pt, answer: undefined })) });
  if (p.kind === "flashcards") return p;
  if (p.kind === "exit") return { ...p, questions: p.questions.map(q) };
  return { ...p, sections: p.sections.map((s) => ({ ...s, questions: s.questions.map(q) })) };
}

const KEY_HEADING = /^#{1,4}\s*(answer key|answers|mark scheme|marking scheme|marking guide|model answers?|solutions|teacher notes?)\b.*$/im;

/** Cut an answer key / mark scheme section off a markdown worksheet. */
export function withoutAnswerKey(md: string): { md: string; removed: boolean } {
  const m = md.match(KEY_HEADING);
  if (!m || m.index === undefined) return { md, removed: false };
  // Remove from the key's heading to the next heading of the same or a higher level
  const level = (m[0].match(/^#+/)?.[0].length ?? 2);
  const rest = md.slice(m.index + m[0].length);
  const next = rest.search(new RegExp(`^#{1,${level}}\\s`, "m"));
  const cut = md.slice(0, m.index) + (next >= 0 ? rest.slice(next) : "");
  return { md: cut.replace(/\n{3,}/g, "\n\n").trim(), removed: true };
}

export const hasAnswerKey = (md: string) => KEY_HEADING.test(md);

/* ---------- the rubric in plain words ---------- */

// Paraphrased for students; how MYP bands rise, not the IB's descriptor wording.
export const BAND_PLAIN: Record<Band, { label: string; text: string }> = {
  "1-2": { label: "Limited", text: "Some of the strands are attempted at a basic level (for example stating or identifying), with big gaps or errors." },
  "3-4": { label: "Adequate", text: "Most strands are covered, but briefly or only partly (for example outlining), mostly in familiar situations, with some gaps." },
  "5-6": { label: "Substantial", text: "Every strand is covered in detail (for example describing), mostly accurately, including some unfamiliar situations." },
  "7-8": { label: "Excellent", text: "Every strand is fully explained, justified or evaluated, consistently accurately, including unfamiliar situations." },
};

/** What the AI (and the assessment coach) should know about this task. */
export function taskBrief(task: Task, cls: TaskClass | null): string {
  const parts = [
    `Task: ${task.title}${cls ? ` (${cls.name}${cls.subject ? `, ${cls.subject}` : ""})` : ""}${task.due_date ? `, due ${new Date(task.due_date).toDateString()}` : ""}.`,
    task.instructions || task.description ? `Instructions:\n${(task.instructions || task.description || "").slice(0, 6000)}` : "",
    task.worksheet ? `The task itself:\n${task.worksheet.slice(0, 8000)}` : "",
    task.resources.length ? `Resources: ${task.resources.map((r) => (r.kind === "link" ? `${r.title} (${r.url})` : r.name)).join("; ")}` : "",
  ];
  const r = task.rubric;
  if (r?.kind === "myp") {
    parts.push(`Assessed with IB MYP ${MYP[r.group].name}, year ${r.year}, criteria ${r.criteria.map((l) => `${l} ${MYP[r.group].criteria[l].name}`).join(", ")}.`);
    const tsc = r.criteria.filter((l) => r.clarifications[l] && Object.keys(r.clarifications[l]!).length).map((l) => `Criterion ${l}:\n${BANDS.filter((b) => r.clarifications[l]![b]).map((b) => `${b}: ${r.clarifications[l]![b]}`).join("\n")}`);
    if (tsc.length) parts.push(`Task-specific clarifications from the teacher:\n${tsc.join("\n\n")}`);
  } else if (r?.kind === "custom") {
    parts.push(`Rubric:\n${r.criteria.map((c) => `${c.name} (${c.points} points): ${c.levels.map((l) => `${l.label}: ${l.descriptor}`).join(" | ")}`).join("\n")}`);
  }
  return parts.filter(Boolean).join("\n\n");
}

/** Plain text of the clarifications, as the criteria-review function expects them. */
export const tscText = (r: MypRubric) =>
  r.criteria.map((l) => {
    const c = r.clarifications[l];
    if (!c || !Object.keys(c).length) return "";
    return `Criterion ${l}: ${MYP[r.group].criteria[l].name}\n${[...BANDS].reverse().filter((b) => c[b]).map((b) => `${b}: ${c[b]}`).join("\n")}`;
  }).filter(Boolean).join("\n\n");

/* ---------- the marking loop ---------- */

export type CarriedTargets = { taskId: string; title: string; targets: string[]; reflection: string | null };

/**
 * Targets from the student's most recent marked task in the same class (or,
 * failing that, the same MYP subject group), to show on this one.
 */
export async function previousTargets(userId: string, task: Task): Promise<CarriedTargets | null> {
  const { data } = await db
    .from("assignment_submissions")
    .select("assignment_id, assessment, reflection, graded_at")
    .eq("student_id", userId)
    .not("assessment", "is", null)
    .order("graded_at", { ascending: false })
    .limit(12);
  const rows = ((data ?? []) as Loose[]).filter((r) => r.assignment_id !== task.id && Array.isArray(r.assessment?.targets) && r.assessment.targets.length);
  if (!rows.length) return null;
  const { data: tasks } = await db.from("class_assignments").select("id, title, class_id, rubric").in("id", rows.map((r) => r.assignment_id));
  const group = task.rubric?.kind === "myp" ? task.rubric.group : null;
  const byId = new Map(((tasks ?? []) as Loose[]).map((t) => [t.id, t]));
  const pick = rows.find((r) => byId.get(r.assignment_id)?.class_id === task.class_id) ?? (group ? rows.find((r) => byId.get(r.assignment_id)?.rubric?.group === group) : undefined);
  if (!pick) return null;
  const t = byId.get(pick.assignment_id)!;
  return { taskId: t.id, title: t.title, targets: (pick.assessment.targets as string[]).slice(0, 5), reflection: pick.reflection ?? null };
}

export async function saveReflection(submissionId: string, text: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("save_reflection", { _submission: submissionId, _text: text });
  if (error) throw new Error("Couldn't save your reflection.");
  return data as string;
}

export type TaskStats = { students: number; handedIn: number; marked: number; reflections: { name: string; text: string; at: string }[] };

/** Handed in / marked / class size and students' reflections, for the teacher's view of a task. */
export async function taskStats(task: Task): Promise<TaskStats> {
  const [{ count: students }, { data: subs }] = await Promise.all([
    db.from("class_members").select("id", { count: "exact", head: true }).eq("class_id", task.class_id),
    db.from("assignment_submissions").select("student_id, grade, status, reflection, reflected_at").eq("assignment_id", task.id),
  ]);
  const list = (subs ?? []) as { student_id: string; grade: number | null; status: string; reflection: string | null; reflected_at: string | null }[];
  const withText = list.filter((s) => s.reflection);
  const { data: profs } = withText.length ? await db.from("profiles").select("user_id, full_name").in("user_id", withText.map((s) => s.student_id)) : { data: [] };
  const name = new Map(((profs ?? []) as { user_id: string; full_name: string | null }[]).map((p) => [p.user_id, p.full_name || "Student"]));
  return {
    students: students ?? 0,
    handedIn: list.length,
    marked: list.filter((s) => s.grade !== null || s.status === "graded").length,
    reflections: withText.map((s) => ({ name: name.get(s.student_id) ?? "Student", text: s.reflection!, at: s.reflected_at ?? "" })).sort((a, b) => b.at.localeCompare(a.at)),
  };
}

export const fmtSize = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${Math.round(n / 1e3)} KB` : `${n} B`);
