import { supabase } from "@/integrations/supabase/client";
import { MYP, type Letter, type MypGroup } from "@/lib/myp";

// Progress by MYP criterion, from marked tasks (assignment_submissions.assessment,
// written when a teacher saves rubric marks from the Marking copilot).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
export const LETTERS: Letter[] = ["A", "B", "C", "D"];

export type Mark = {
  taskId: string;
  title: string;
  classId: string;
  className: string;
  at: string;
  group: MypGroup;
  criteria: Letter[];
  levels: Partial<Record<Letter, number>>;
  targets: string[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const toMark = (s: Row, task: Row | undefined, className: string): Mark | null => {
  const a = s.assessment;
  if (!a || a.kind !== "myp" || !(a.group in MYP) || !task) return null;
  return {
    taskId: task.id, title: task.title, classId: task.class_id, className, at: s.graded_at ?? a.at ?? task.due_date ?? task.created_at,
    group: a.group, criteria: (a.criteria ?? []).filter((l: Letter) => LETTERS.includes(l)), levels: a.levels ?? {}, targets: Array.isArray(a.targets) ? a.targets : [],
  };
};

/** A student's own marked tasks, oldest first. */
export async function myMarks(userId: string): Promise<Mark[]> {
  const { data: subs } = await db.from("assignment_submissions").select("assignment_id, assessment, graded_at").eq("student_id", userId).not("assessment", "is", null);
  const rows = (subs ?? []) as Row[];
  if (!rows.length) return [];
  const { data: tasks } = await db.from("class_assignments").select("id, title, class_id, due_date, created_at").in("id", rows.map((r) => r.assignment_id));
  const byId = new Map(((tasks ?? []) as Row[]).map((t) => [t.id, t]));
  const classIds = [...new Set(((tasks ?? []) as Row[]).map((t) => t.class_id))];
  const { data: classes } = classIds.length ? await db.from("classes").select("id, name").in("id", classIds) : { data: [] };
  const cName = new Map(((classes ?? []) as Row[]).map((c) => [c.id, c.name]));
  return rows
    .map((r) => { const t = byId.get(r.assignment_id); return toMark(r, t, t ? cName.get(t.class_id) ?? "" : ""); })
    .filter((m): m is Mark => !!m)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export type Student = { id: string; name: string };
export type ClassProgress = {
  students: Student[];
  marks: (Mark & { studentId: string })[];
  /** Tasks past their deadline that a student hasn't handed in */
  missing: Record<string, { id: string; title: string; due: string }[]>;
};

export async function classProgress(classId: string, className: string): Promise<ClassProgress> {
  const [{ data: mem }, { data: tasks }] = await Promise.all([
    db.from("class_members").select("student_id").eq("class_id", classId),
    db.from("class_assignments").select("id, title, class_id, due_date, created_at").eq("class_id", classId),
  ]);
  const ids = [...new Set(((mem ?? []) as Row[]).map((m) => m.student_id as string))];
  const taskRows = (tasks ?? []) as Row[];
  const [{ data: profs }, { data: subs }] = await Promise.all([
    ids.length ? db.from("profiles").select("user_id, full_name").in("user_id", ids) : Promise.resolve({ data: [] }),
    taskRows.length ? db.from("assignment_submissions").select("assignment_id, student_id, assessment, graded_at").in("assignment_id", taskRows.map((t) => t.id)) : Promise.resolve({ data: [] }),
  ]);
  const name = new Map(((profs ?? []) as Row[]).map((p) => [p.user_id, p.full_name || "Student"]));
  const students = ids.map((id) => ({ id, name: name.get(id) ?? "Student" })).sort((a, b) => a.name.localeCompare(b.name));
  const byId = new Map(taskRows.map((t) => [t.id, t]));
  const subRows = (subs ?? []) as Row[];
  const marks = subRows
    .map((s) => { const m = toMark(s, byId.get(s.assignment_id), className); return m ? { ...m, studentId: s.student_id as string } : null; })
    .filter((m): m is Mark & { studentId: string } => !!m)
    .sort((a, b) => a.at.localeCompare(b.at));
  const now = Date.now();
  const past = taskRows.filter((t) => t.due_date && new Date(t.due_date).getTime() < now);
  const missing: ClassProgress["missing"] = {};
  for (const st of students) {
    const gone = past.filter((t) => !subRows.some((s) => s.assignment_id === t.id && s.student_id === st.id));
    if (gone.length) missing[st.id] = gone.map((t) => ({ id: t.id, title: t.title, due: t.due_date }));
  }
  return { students, marks, missing };
}

/* ---------- reading the numbers ---------- */

export type Series = { label: string; taskId: string; at: string } & Partial<Record<Letter, number>>;

/** One point per marked task (class views average the class), oldest first. */
export function seriesOf(marks: Mark[]): Series[] {
  const byTask = new Map<string, Mark[]>();
  for (const m of marks) byTask.set(m.taskId, [...(byTask.get(m.taskId) ?? []), m]);
  return [...byTask.values()]
    .map((ms) => {
      const point: Series = { label: ms[0].title, taskId: ms[0].taskId, at: ms.reduce((a, m) => (m.at > a ? m.at : a), ms[0].at) };
      for (const l of LETTERS) {
        const v = ms.map((m) => m.levels[l]).filter((x): x is number => typeof x === "number");
        if (v.length) point[l] = Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
      }
      return point;
    })
    .sort((a, b) => a.at.localeCompare(b.at));
}

export const criteriaIn = (marks: Mark[]): Letter[] => LETTERS.filter((l) => marks.some((m) => typeof m.levels[l] === "number"));

/** Latest level, the one before it, and the average, per criterion. */
export function summary(marks: Mark[], l: Letter) {
  const v = marks.map((m) => m.levels[l]).filter((x): x is number => typeof x === "number");
  if (!v.length) return null;
  return { latest: v[v.length - 1], previous: v.length > 1 ? v[v.length - 2] : null, average: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10, count: v.length };
}

export type Warning = { studentId: string; name: string; severity: "critical" | "serious"; label: string; detail: string; link: string };

/**
 * Early warnings for a class: a criterion that dropped by 2+ levels below the
 * student's earlier average, a latest level in the 1–2 band, or two or more
 * tasks past their deadline and not handed in.
 */
export function warningsOf(cp: ClassProgress): Warning[] {
  const out: Warning[] = [];
  for (const st of cp.students) {
    const mine = cp.marks.filter((m) => m.studentId === st.id);
    for (const l of LETTERS) {
      const v = mine.map((m) => ({ lv: m.levels[l], m })).filter((x): x is { lv: number; m: Mark & { studentId: string } } => typeof x.lv === "number");
      if (!v.length) continue;
      const last = v[v.length - 1];
      const before = v.slice(0, -1).map((x) => x.lv);
      const avg = before.length ? before.reduce((a, b) => a + b, 0) / before.length : null;
      if (last.lv <= 2) out.push({ studentId: st.id, name: st.name, severity: "critical", label: `Criterion ${l} at ${last.lv}/8`, detail: `On "${last.m.title}". Worth a conversation before the next task.`, link: `/task/${last.m.taskId}` });
      else if (avg !== null && avg - last.lv >= 2) out.push({ studentId: st.id, name: st.name, severity: "serious", label: `Criterion ${l} dropped to ${last.lv}`, detail: `From an average of ${Math.round(avg * 10) / 10} on earlier tasks ("${last.m.title}").`, link: `/task/${last.m.taskId}` });
    }
    const gone = cp.missing[st.id] ?? [];
    if (gone.length >= 2) out.push({ studentId: st.id, name: st.name, severity: gone.length >= 3 ? "critical" : "serious", label: `${gone.length} tasks not handed in`, detail: gone.slice(0, 3).map((g) => `"${g.title}"`).join(", "), link: `/task/${gone[0].id}` });
  }
  return out.sort((a, b) => (a.severity === b.severity ? a.name.localeCompare(b.name) : a.severity === "critical" ? -1 : 1));
}
