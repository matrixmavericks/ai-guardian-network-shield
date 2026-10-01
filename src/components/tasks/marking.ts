import { supabase } from "@/integrations/supabase/client";
import { createSet, importSubmissions, loadSet, type MarkingItem, type MarkingSet } from "@/components/criteria/engine";
import { tscText, type Task } from "./task";

// Pre-marking a task's hand-ins in the Marking copilot, using the task's own
// rubric and task-specific clarifications.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** The task's marking set (made the first time), with any new hand-ins imported. */
export async function openMarkingFor(task: Task, teacherId: string): Promise<{ setId: string; added: number }> {
  const r = task.rubric;
  if (r?.kind !== "myp") throw new Error("Pre-marking uses the task's MYP rubric. Add one in the task editor first.");
  const { data: existing } = await db.from("marking_sets").select("id").eq("assignment_id", task.id).eq("teacher_id", teacherId).order("created_at", { ascending: false }).limit(1);
  let set: MarkingSet;
  let items: MarkingItem[] = [];
  const loaded = existing?.[0] ? await loadSet(existing[0].id) : null;
  if (loaded) {
    set = loaded.set;
    items = loaded.items;
  } else {
    const description = [task.instructions || task.description, task.worksheet].filter(Boolean).join("\n\n").slice(0, 8000);
    set = await createSet(teacherId, { title: task.title, subject_group: r.group, year: r.year, criteria: r.criteria, task: { title: task.title, description, tsc: tscText(r) }, assignment_id: task.id });
  }
  const { data: subs } = await db.from("assignment_submissions").select("id, student_id, content, file_url, file_name").eq("assignment_id", task.id);
  const ids = [...new Set(((subs ?? []) as { student_id: string }[]).map((s) => s.student_id))];
  const { data: profs } = ids.length ? await db.from("profiles").select("user_id, full_name").in("user_id", ids) : { data: [] };
  const names = Object.fromEntries(((profs ?? []) as { user_id: string; full_name: string | null }[]).map((p) => [p.user_id, p.full_name || "Student"]));
  const { added } = await importSubmissions(teacherId, set, subs ?? [], names, items);
  return { setId: set.id, added: added.length };
}
