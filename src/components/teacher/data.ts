import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/* ---------- Types ---------- */

export type TClass = {
  id: string;
  name: string;
  subject: string;
  curriculum_type: string;
  join_code: string;
  grading_system_id: string | null;
  created_at: string;
  description: string | null;
};
export type TAssignment = {
  id: string;
  class_id: string;
  title: string;
  subject: string | null;
  description: string | null;
  due_date: string | null;
  created_at: string;
};
export type TSubmission = {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  grade: number | null;
  max_grade: number;
  feedback: string | null;
  status: string;
  submitted_at: string;
  graded_at: string | null;
};
export type TStudent = { id: string; name: string; email: string | null };
export type TeacherData = {
  classes: TClass[];
  members: { class_id: string; student_id: string }[];
  assignments: TAssignment[];
  submissions: TSubmission[];
  students: Record<string, TStudent>;
};

const EMPTY: TeacherData = { classes: [], members: [], assignments: [], submissions: [], students: {} };

/* ---------- Loading (shared across pages, refreshed on every visit) ---------- */

let cache: { uid: string; data: TeacherData; at: number } | null = null;
const subscribers = new Set<(d: TeacherData) => void>();

const load = async (uid: string): Promise<TeacherData> => {
  const { data: classes, error } = await supabase
    .from("classes")
    .select("id, name, subject, curriculum_type, join_code, grading_system_id, created_at, description")
    .eq("teacher_id", uid)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const classIds = (classes || []).map((c) => c.id);
  if (!classIds.length) return { ...EMPTY, classes: [] };

  const [{ data: members }, { data: assignments }] = await Promise.all([
    supabase.from("class_members").select("class_id, student_id").in("class_id", classIds),
    supabase
      .from("class_assignments")
      .select("id, class_id, title, subject, description, due_date, created_at")
      .in("class_id", classIds)
      .order("due_date", { ascending: true }),
  ]);
  const assignmentIds = (assignments || []).map((a) => a.id);
  const studentIds = [...new Set((members || []).map((m) => m.student_id))];

  const [{ data: submissions }, { data: profiles }] = await Promise.all([
    assignmentIds.length
      ? supabase
          .from("assignment_submissions")
          .select("id, assignment_id, student_id, content, file_url, file_name, grade, max_grade, feedback, status, submitted_at, graded_at")
          .in("assignment_id", assignmentIds)
          .order("submitted_at", { ascending: true })
          .limit(5000)
      : Promise.resolve({ data: [] as TSubmission[] }),
    studentIds.length
      ? supabase.from("profiles").select("user_id, full_name, email").in("user_id", studentIds)
      : Promise.resolve({ data: [] as { user_id: string; full_name: string; email: string | null }[] }),
  ]);

  const students: Record<string, TStudent> = {};
  for (const id of studentIds) students[id] = { id, name: "Student", email: null };
  for (const p of profiles || []) students[p.user_id] = { id: p.user_id, name: p.full_name || p.email || "Student", email: p.email };

  return {
    classes: (classes || []) as TClass[],
    members: members || [],
    assignments: (assignments || []) as TAssignment[],
    submissions: (submissions || []) as TSubmission[],
    students,
  };
};

/** Everything a teacher's pages need, loaded once and shared between pages. */
export const useTeacherData = (enabled = true) => {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [data, setData] = useState<TeacherData>(() => (cache && cache.uid === uid ? cache.data : EMPTY));
  const [loading, setLoading] = useState(!(cache && cache.uid === uid));
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!uid) return;
    try {
      const next = await load(uid);
      cache = { uid, data: next, at: Date.now() };
      subscribers.forEach((s) => s(next));
      setError("");
    } catch (e) {
      setError((e as Error)?.message || "Couldn't load your classes");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    subscribers.add(setData);
    return () => {
      subscribers.delete(setData);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // Pages and the sidebar share one copy; skip refetching if it is only a few seconds old
    if (cache && cache.uid === uid && Date.now() - cache.at < 20_000) {
      setData(cache.data);
      setLoading(false);
      return;
    }
    reload();
  }, [reload, uid, enabled]);

  /** Apply a saved change locally (e.g. a grade) without refetching everything. */
  const patchSubmission = useCallback(
    (id: string, patch: Partial<TSubmission>) => {
      if (!uid) return;
      const base = cache?.uid === uid ? cache.data : data;
      const next = { ...base, submissions: base.submissions.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
      cache = { uid, data: next, at: cache?.at ?? Date.now() };
      subscribers.forEach((s) => s(next));
    },
    [uid, data],
  );

  return { data, loading, error, reload, patchSubmission };
};

/* ---------- Derived numbers ---------- */

const DAY = 86_400_000;

export const pctOf = (s: Pick<TSubmission, "grade" | "max_grade">) => (s.grade !== null && s.max_grade ? (s.grade / s.max_grade) * 100 : null);
export const isGraded = (s: TSubmission) => s.grade !== null || s.status === "graded";
export const needsMarking = (s: TSubmission) => !isGraded(s);
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export const firstName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return /^(mr|mrs|ms|miss|mx|dr|prof)\.?$/i.test(parts[0]) && parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0] || name;
};
export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter((p) => p && !/^(mr|mrs|ms|miss|mx|dr|prof)\.?$/i.test(p))
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

export const studentsOf = (d: TeacherData, classId: string) =>
  d.members.filter((m) => m.class_id === classId).map((m) => d.students[m.student_id] ?? { id: m.student_id, name: "Student", email: null });

export const classOf = (d: TeacherData, assignmentId: string) => {
  const a = d.assignments.find((x) => x.id === assignmentId);
  return a ? d.classes.find((c) => c.id === a.class_id) ?? null : null;
};

export type ClassStat = {
  cls: TClass;
  students: number;
  assignments: number;
  avg: number | null;
  handIn: number | null;
  toMark: number;
  nextDue: TAssignment | null;
  series: number[];
};

export const classStats = (d: TeacherData, now = Date.now()): ClassStat[] =>
  d.classes.map((cls) => {
    const members = d.members.filter((m) => m.class_id === cls.id);
    const asg = d.assignments.filter((a) => a.class_id === cls.id);
    const ids = new Set(asg.map((a) => a.id));
    const subs = d.submissions.filter((s) => ids.has(s.assignment_id));
    const graded = subs.map(pctOf).filter((x): x is number => x !== null);
    const pastDue = asg.filter((a) => a.due_date && new Date(a.due_date).getTime() < now);
    const expected = pastDue.length * members.length;
    const handedIn = subs.filter((s) => pastDue.some((a) => a.id === s.assignment_id)).length;
    const series = asg
      .map((a) => mean(subs.filter((s) => s.assignment_id === a.id).map(pctOf).filter((x): x is number => x !== null)))
      .filter((x): x is number => x !== null);
    return {
      cls,
      students: members.length,
      assignments: asg.length,
      avg: mean(graded),
      handIn: expected ? Math.min(100, (handedIn / expected) * 100) : null,
      toMark: subs.filter(needsMarking).length,
      nextDue: asg.filter((a) => a.due_date && new Date(a.due_date).getTime() >= now).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))[0] ?? null,
      series,
    };
  });

export type StudentRow = {
  student: TStudent;
  classIds: string[];
  avg: number | null;
  graded: number;
  missing: TAssignment[];
  trend: number | null;
  lastHandIn: string | null;
  reasons: { tone: "red" | "amber" | "blue"; text: string }[];
  risk: number;
};

/** Per-student picture across the teacher's classes, with plain-language reasons to check in. */
export const studentRows = (d: TeacherData, now = Date.now()): StudentRow[] => {
  const byStudent = new Map<string, string[]>();
  for (const m of d.members) byStudent.set(m.student_id, [...(byStudent.get(m.student_id) || []), m.class_id]);
  return [...byStudent.entries()].map(([sid, classIds]) => {
    const student = d.students[sid] ?? { id: sid, name: "Student", email: null };
    const asg = d.assignments.filter((a) => classIds.includes(a.class_id));
    const subs = d.submissions.filter((s) => s.student_id === sid);
    const handed = new Set(subs.map((s) => s.assignment_id));
    const missing = asg.filter((a) => a.due_date && new Date(a.due_date).getTime() < now && !handed.has(a.id));
    const graded = subs
      .filter((s) => pctOf(s) !== null)
      .sort((a, b) => ((a.graded_at || a.submitted_at) < (b.graded_at || b.submitted_at) ? -1 : 1))
      .map((s) => pctOf(s) as number);
    const avg = mean(graded);
    const recent = mean(graded.slice(-2));
    const before = mean(graded.slice(0, -2));
    const trend = graded.length >= 4 && recent !== null && before !== null ? recent - before : null;
    const lastHandIn = subs.map((s) => s.submitted_at).sort().pop() ?? null;

    const reasons: StudentRow["reasons"] = [];
    let risk = 0;
    if (missing.length >= 2) {
      reasons.push({ tone: "red", text: `${missing.length} pieces missing` });
      risk += 2 + missing.length;
    } else if (missing.length === 1) {
      reasons.push({ tone: "amber", text: `Missing ${missing[0].title}` });
      risk += 1.5;
    }
    if (avg !== null && avg < 55) {
      reasons.push({ tone: "red", text: `Averaging ${Math.round(avg)}%` });
      risk += 3;
    } else if (avg !== null && avg < 65) {
      reasons.push({ tone: "amber", text: `Averaging ${Math.round(avg)}%` });
      risk += 1;
    }
    if (trend !== null && trend <= -10) {
      reasons.push({ tone: "amber", text: `Down ${Math.round(-trend)} pts lately` });
      risk += 2;
    }
    const dueRecently = asg.some((a) => a.due_date && now - new Date(a.due_date).getTime() < 14 * DAY && new Date(a.due_date).getTime() < now);
    if (dueRecently && (!lastHandIn || now - new Date(lastHandIn).getTime() > 14 * DAY)) {
      reasons.push({ tone: "blue", text: "Quiet for 2+ weeks" });
      risk += 1.5;
    }
    return { student, classIds, avg, graded: graded.length, missing, trend, lastHandIn, reasons, risk };
  });
};

export type DayLoad = { date: Date; items: TAssignment[]; clash: { shared: number } | null };

/** Deadlines for the 7 days from `start`, flagging days where students share two or more deadlines. */
export const weekLoad = (d: TeacherData, start: Date): DayLoad[] => {
  const days: DayLoad[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const next = date.getTime() + DAY;
    const items = d.assignments.filter((a) => a.due_date && new Date(a.due_date).getTime() >= date.getTime() && new Date(a.due_date).getTime() < next);
    let clash: DayLoad["clash"] = null;
    if (items.length >= 2) {
      const counts = new Map<string, number>();
      for (const a of items) for (const m of d.members.filter((x) => x.class_id === a.class_id)) counts.set(m.student_id, (counts.get(m.student_id) || 0) + 1);
      const shared = [...counts.values()].filter((n) => n >= 2).length;
      if (shared) clash = { shared };
    }
    days.push({ date, items, clash });
  }
  return days;
};

export const startOfWeek = (d = new Date()) => {
  const day = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
};

export const waited = (iso: string, now = Date.now()) => {
  const h = Math.max(0, (now - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${Math.round(h)}h`;
  const days = Math.round(h / 24);
  return `${days}d`;
};

/** Splits "### Name\nbody" blocks into per-person entries. */
export const peopleOf = (md: string) =>
  md
    .replace(/\r\n/g, "\n")
    .split(/\n(?=###\s)/)
    .map((block) => {
      const m = /^###\s+(.*)\n?([\s\S]*)$/.exec(block.trim());
      return m ? { name: m[1].replace(/[*#]/g, "").trim(), body: m[2].trim() } : null;
    })
    .filter((x): x is { name: string; body: string } => !!x && !!x.name);
