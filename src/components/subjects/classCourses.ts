import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getSubject, topicsOf, type Subject } from "@/content/myp";
import { STATUS_META, topicStatus, type Status, type StudyState } from "./store";

/** A class aligned to one of the built-in MYP courses. */
export type CourseLink = {
  id: string;
  classId: string;
  className: string;
  subject: string;
  focusUnits: string[];
  teacherId: string | null;
};

const missing = (e: { code?: string; message?: string } | null) => !!e && (e.code === "PGRST205" || e.code === "42P01" || /class_myp_courses/.test(e.message ?? ""));

type Row = { id: string; class_id: string; subject_slug: string; focus_unit_ids: string[] | null };

/**
 * Course links visible to the signed-in user: for a student, links on classes
 * they belong to; for a teacher, links on classes they teach.
 */
export const useCourseLinks = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<CourseLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const teacher = user.role === "teacher" || user.role === "admin";
    const { data: classes } = teacher
      ? await supabase.from("classes").select("id, name, teacher_id").eq("teacher_id", user.id)
      : await supabase.from("class_members").select("class_id, classes(id, name, teacher_id)").eq("student_id", user.id).then((r) => ({
          data: (r.data ?? []).map((m) => (m as unknown as { classes: { id: string; name: string; teacher_id: string } | null }).classes).filter(Boolean) as { id: string; name: string; teacher_id: string }[],
        }));
    const list = classes ?? [];
    if (!list.length) {
      setLinks([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("class_myp_courses").select("id, class_id, subject_slug, focus_unit_ids").in("class_id", list.map((c) => c.id));
    if (missing(error)) setAvailable(false);
    setLinks(
      ((data ?? []) as Row[])
        .filter((r) => getSubject(r.subject_slug))
        .map((r) => {
          const c = list.find((x) => x.id === r.class_id);
          return { id: r.id, classId: r.class_id, className: c?.name ?? "Class", subject: r.subject_slug, focusUnits: r.focus_unit_ids ?? [], teacherId: c?.teacher_id ?? null };
        }),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const link = async (classId: string, subject: string) => {
    const { error } = await supabase.from("class_myp_courses").insert({ class_id: classId, subject_slug: subject, created_by: user?.id ?? null });
    if (error && !/duplicate/i.test(error.message)) throw error;
    await load();
  };
  const unlink = async (id: string) => {
    const { error } = await supabase.from("class_myp_courses").delete().eq("id", id);
    if (error) throw error;
    await load();
  };
  const setFocus = async (id: string, unitIds: string[]) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, focusUnits: unitIds } : l)));
    const { error } = await supabase.from("class_myp_courses").update({ focus_unit_ids: unitIds }).eq("id", id);
    if (error) {
      await load();
      throw error;
    }
  };

  return { links, loading, available, reload: load, link, unlink, setFocus };
};

/** Suggests the MYP course that matches a class's subject name, if any. */
export const guessCourse = (subjectName: string): string | null => {
  const s = subjectName.toLowerCase();
  if (/bio/.test(s)) return "biology";
  if (/chem/.test(s)) return "chemistry";
  if (/phys/.test(s)) return "physics";
  if (/math/.test(s)) return "extended-mathematics";
  if (/english|language|literature/.test(s)) return "english-lang-lit";
  if (/histor/.test(s)) return "history";
  if (/societ|geograph|econom|humanit|i&s/.test(s)) return "individuals-societies";
  return null;
};

export type StudentProgress = { studentId: string; name: string; statuses: Record<string, Status>; progress: number; lastActive: number | null };

/** Every student's topic statuses on a course, read from their synced study state. */
export const loadClassProgress = async (classId: string, subject: Subject): Promise<StudentProgress[]> => {
  const { data: members } = await supabase.from("class_members").select("student_id").eq("class_id", classId);
  const ids = (members ?? []).map((m) => m.student_id);
  if (!ids.length) return [];
  const [{ data: states }, { data: profiles }] = await Promise.all([
    supabase.from("student_study_state").select("user_id, state, updated_at").in("user_id", ids),
    supabase.from("profiles").select("user_id, full_name").in("user_id", ids),
  ]);
  const topics = topicsOf(subject);
  return ids
    .map((id) => {
      const row = (states ?? []).find((s) => s.user_id === id);
      const raw = (row?.state ?? {}) as Partial<StudyState>;
      const state: StudyState = { subjects: null, attempts: {}, read: {}, cards: {}, saved: [], plans: {}, activity: {}, recent: null, exam: {}, worked: {}, settingsAt: 0, ...raw };
      const statuses: Record<string, Status> = {};
      let weight = 0;
      for (const t of topics) {
        const st = topicStatus(t, state);
        statuses[t.id] = st;
        weight += STATUS_META[st].weight;
      }
      return {
        studentId: id,
        name: (profiles ?? []).find((p) => p.user_id === id)?.full_name ?? "Student",
        statuses,
        progress: topics.length ? Math.round(weight / topics.length) : 0,
        lastActive: row?.updated_at ? new Date(row.updated_at).getTime() : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};
