import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { SUBJECTS, topicsOf, type Subject, type Topic } from "@/content/myp";

// Study progress for the built-in MYP subjects. One small external store keeps
// every component (and other tabs) in sync. It saves to this browser straight
// away and to the student's account (student_study_state) a moment later, so
// progress follows them between devices and still works offline.

export type Attempt = { ok: boolean; choice: number; at: number };
export type SavedKind = "topic" | "question" | "term" | "cheatsheet";
export type SavedItem = { kind: SavedKind; id: string; subject: string; at: number };
export type TaskKind = "guide" | "practice" | "flashcards" | "mistakes" | "exam";
export type PlanTask = { id: string; kind: TaskKind; topicId?: string; done: boolean };
export type PlanDay = { date: string; tasks: PlanTask[] };
export type StudyPlan = { createdAt: number; examDate: string; weekdays: number[]; minutes: number; days: PlanDay[] };
export type Recent = { subject: string; path: string; label: string; at: number };

export type StudyState = {
  /** Slugs the student picked; null until they choose (then all subjects show). */
  subjects: string[] | null;
  attempts: Record<string, Attempt[]>;
  read: Record<string, number>;
  /** Flashcard confidence: true = got it, false = still learning. */
  cards: Record<string, boolean>;
  saved: SavedItem[];
  plans: Record<string, StudyPlan>;
  /** Actions per day (YYYY-MM-DD), for the streak. */
  activity: Record<string, number>;
  recent: Recent | null;
  /** When settings-like fields (subjects, cards, saved, plans) last changed here. The newer copy wins those. */
  settingsAt: number;
};

const EMPTY: StudyState = { subjects: null, attempts: {}, read: {}, cards: {}, saved: [], plans: {}, activity: {}, recent: null, settingsAt: 0 };

const cache = new Map<string, StudyState>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const load = (key: string): StudyState => {
  const hit = cache.get(key);
  if (hit) return hit;
  let state = EMPTY;
  try {
    const raw = localStorage.getItem(key);
    if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as Partial<StudyState>) };
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  cache.set(key, state);
  return state;
};

const writeLocal = (key: string, state: StudyState) => {
  cache.set(key, state);
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  emit();
};

/* ---------- Account sync ---------- */

export type SyncStatus = "local" | "syncing" | "synced" | "offline";

let syncStatus: SyncStatus = "local";
const statusListeners = new Set<() => void>();
const setStatus = (s: SyncStatus) => {
  if (s === syncStatus) return;
  syncStatus = s;
  statusListeners.forEach((l) => l());
};

/** Whether progress is saved to the account ("synced") or only on this device. */
export const useSyncStatus = () =>
  useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => syncStatus,
  );

const userOf = (key: string) => {
  const id = key.split(":")[1];
  return id && id !== "guest" ? id : null;
};

const pulled = new Map<string, Promise<void>>();
const timers = new Map<string, number>();
/** Accounts where the table is unavailable (e.g. not migrated yet): stay local-only. */
const disabled = new Set<string>();

const mergeAttempts = (a: StudyState["attempts"], b: StudyState["attempts"]) => {
  const out: StudyState["attempts"] = { ...a };
  for (const [q, list] of Object.entries(b)) {
    const seen = new Set((out[q] || []).map((x) => `${x.at}:${x.choice}`));
    out[q] = [...(out[q] || []), ...list.filter((x) => !seen.has(`${x.at}:${x.choice}`))].sort((x, y) => x.at - y.at).slice(-6);
  }
  return out;
};

const maxRecord = (a: Record<string, number>, b: Record<string, number>) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] || 0, v);
  return out;
};

/**
 * Combine this device's copy with the account's. Answers, read guides and
 * streak days are merged; settings-like fields come from the newer copy so a
 * removal on one device isn't undone by another.
 */
export const mergeStates = (local: StudyState, remote: Partial<StudyState>): StudyState => {
  const r: StudyState = { ...EMPTY, ...remote };
  const [newer, older] = r.settingsAt > local.settingsAt ? [r, local] : [local, r];
  const recent = !local.recent ? r.recent : !r.recent ? local.recent : local.recent.at >= r.recent.at ? local.recent : r.recent;
  return {
    subjects: newer.subjects,
    cards: { ...older.cards, ...newer.cards },
    saved: newer.saved,
    plans: newer.plans,
    attempts: mergeAttempts(local.attempts, r.attempts),
    read: maxRecord(local.read, r.read),
    activity: maxRecord(local.activity, r.activity),
    recent,
    settingsAt: Math.max(local.settingsAt, r.settingsAt),
  };
};

const missingTable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "PGRST205" || e.code === "42P01" || /student_study_state/.test(e.message || ""));

const push = async (key: string) => {
  const userId = userOf(key);
  if (!userId || disabled.has(key)) return;
  setStatus("syncing");
  const { error } = await supabase
    .from("student_study_state")
    .upsert({ user_id: userId, state: load(key) as unknown as Json, updated_at: new Date().toISOString() });
  if (missingTable(error)) disabled.add(key);
  setStatus(error ? (missingTable(error) ? "local" : "offline") : "synced");
};

const schedulePush = (key: string) => {
  if (!userOf(key) || disabled.has(key)) return;
  window.clearTimeout(timers.get(key));
  timers.set(key, window.setTimeout(() => {
    timers.delete(key);
    push(key);
  }, 1500));
};

/** Save anything still waiting when the tab is hidden or closed. */
if (typeof window !== "undefined") {
  const flush = () => {
    for (const [key, t] of timers) {
      window.clearTimeout(t);
      timers.delete(key);
      push(key);
    }
  };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
}

/** Load the account copy once per session and merge it in. */
const pull = (key: string) => {
  const userId = userOf(key);
  if (!userId) return Promise.resolve();
  if (!pulled.has(key)) {
    pulled.set(
      key,
      (async () => {
        setStatus("syncing");
        const { data, error } = await supabase.from("student_study_state").select("state").eq("user_id", userId).maybeSingle();
        if (error) {
          if (missingTable(error)) disabled.add(key);
          pulled.delete(key); // try again next visit
          setStatus(missingTable(error) ? "local" : "offline");
          return;
        }
        const local = load(key);
        const remote = (data?.state ?? null) as Partial<StudyState> | null;
        const merged = remote ? mergeStates(local, remote) : local;
        if (remote) writeLocal(key, merged);
        // Upload if this device had anything the account didn't.
        if (!remote || JSON.stringify(merged) !== JSON.stringify({ ...EMPTY, ...remote })) await push(key);
        else setStatus("synced");
      })(),
    );
  }
  return pulled.get(key)!;
};

const save = (key: string, state: StudyState) => {
  writeLocal(key, state);
  schedulePush(key);
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key && cache.has(e.key)) {
      cache.delete(e.key);
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
};

export const today = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Mark a settings-like change so it wins over older copies when merging. */
const touch = (s: StudyState): StudyState => ({ ...s, settingsAt: Date.now() });

const bump = (s: StudyState): StudyState => {
  const d = today();
  return { ...s, activity: { ...s.activity, [d]: (s.activity[d] || 0) + 1 } };
};

export const useStudy = () => {
  const { user } = useAuth();
  const key = `refyn:${user?.id ?? "guest"}:study`;
  const state = useSyncExternalStore(subscribe, () => load(key));
  useEffect(() => {
    pull(key);
  }, [key]);
  const update = useCallback((fn: (s: StudyState) => StudyState) => save(key, fn(load(key))), [key]);

  const actions = {
    answer: (questionId: string, choice: number, ok: boolean) =>
      update((s) => bump({ ...s, attempts: { ...s.attempts, [questionId]: [...(s.attempts[questionId] || []), { ok, choice, at: Date.now() }].slice(-6) } })),
    markRead: (topicId: string, read = true) =>
      update((s) => {
        const next = { ...s.read };
        if (read) next[topicId] = Date.now();
        else delete next[topicId];
        return read ? bump({ ...s, read: next }) : { ...s, read: next };
      }),
    rateCard: (cardId: string, known: boolean) => update((s) => touch(bump({ ...s, cards: { ...s.cards, [cardId]: known } }))),
    resetCards: (cardIds: string[]) =>
      update((s) => {
        const cards = { ...s.cards };
        cardIds.forEach((id) => delete cards[id]);
        return touch({ ...s, cards });
      }),
    toggleSaved: (item: Omit<SavedItem, "at">) =>
      update((s) => {
        const exists = s.saved.some((x) => x.kind === item.kind && x.id === item.id);
        return touch({ ...s, saved: exists ? s.saved.filter((x) => !(x.kind === item.kind && x.id === item.id)) : [{ ...item, at: Date.now() }, ...s.saved] });
      }),
    setSubjects: (slugs: string[]) => update((s) => touch({ ...s, subjects: slugs })),
    setPlan: (slug: string, plan: StudyPlan | null) =>
      update((s) => {
        const plans = { ...s.plans };
        if (plan) plans[slug] = plan;
        else delete plans[slug];
        return touch({ ...s, plans });
      }),
    togglePlanTask: (slug: string, date: string, taskId: string) =>
      update((s) => {
        const plan = s.plans[slug];
        if (!plan) return s;
        const days = plan.days.map((d) =>
          d.date !== date ? d : { ...d, tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) },
        );
        return touch({ ...s, plans: { ...s.plans, [slug]: { ...plan, days } } });
      }),
    visit: (recent: Omit<Recent, "at">) =>
      update((s) => (s.recent?.path === recent.path ? s : { ...s, recent: { ...recent, at: Date.now() } })),
  };

  return { state, ...actions };
};

export const isSaved = (state: StudyState, kind: SavedKind, id: string) => state.saved.some((x) => x.kind === kind && x.id === id);

/* ---------- Topic status ---------- */

export type Status = "mastered" | "proficient" | "familiar" | "learning" | "unfamiliar" | "unseen";

export const STATUS_ORDER: Status[] = ["mastered", "proficient", "familiar", "learning", "unfamiliar", "unseen"];

export const STATUS_META: Record<Status, { label: string; color: string; weight: number; fill: number; hint: string }> = {
  mastered: { label: "Mastered", color: "#34D399", weight: 100, fill: 1, hint: "Every practice question right on your latest try." },
  proficient: { label: "Proficient", color: "#3FE9FF", weight: 75, fill: 0.75, hint: "Three quarters of the questions right." },
  familiar: { label: "Familiar", color: "#7CB4FF", weight: 50, fill: 0.5, hint: "Half the questions right." },
  learning: { label: "Learning", color: "#FBBF24", weight: 25, fill: 0.25, hint: "Started: guide read, cards reviewed or a question right." },
  unfamiliar: { label: "Unfamiliar", color: "#F2706A", weight: 10, fill: 0.08, hint: "Attempted, but most answers were wrong." },
  unseen: { label: "Unseen", color: "#4B5B78", weight: 0, fill: 0, hint: "Not started yet." },
};

export const latest = (state: StudyState, questionId: string) => {
  const a = state.attempts[questionId];
  return a && a.length ? a[a.length - 1] : undefined;
};

export const topicScore = (topic: Topic, state: StudyState) => {
  let answered = 0;
  let correct = 0;
  for (const q of topic.questions) {
    const a = latest(state, q.id);
    if (a) {
      answered++;
      if (a.ok) correct++;
    }
  }
  return { answered, correct, total: topic.questions.length };
};

export const topicStatus = (topic: Topic, state: StudyState): Status => {
  const { answered, correct, total } = topicScore(topic, state);
  if (!answered) {
    const touched = state.read[topic.id] || topic.flashcards.some((f) => state.cards[f.id] !== undefined);
    return touched ? "learning" : "unseen";
  }
  const score = correct / total;
  if (score >= 1) return "mastered";
  if (score >= 0.75) return "proficient";
  if (score >= 0.5) return "familiar";
  if (score >= 0.25) return "learning";
  return "unfamiliar";
};

export const subjectSummary = (subject: Subject, state: StudyState) => {
  const topics = topicsOf(subject);
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<Status, number>;
  let weight = 0;
  for (const t of topics) {
    const st = topicStatus(t, state);
    counts[st]++;
    weight += STATUS_META[st].weight;
  }
  const questions = topics.flatMap((t) => t.questions);
  const answered = questions.filter((q) => latest(state, q.id)).length;
  const mistakes = questions.filter((q) => latest(state, q.id)?.ok === false).length;
  return { counts, progress: topics.length ? Math.round(weight / topics.length) : 0, topics: topics.length, answered, questions: questions.length, mistakes };
};

export const streak = (state: StudyState) => {
  let n = 0;
  const d = new Date();
  if (!state.activity[today(d)]) d.setDate(d.getDate() - 1);
  while (state.activity[today(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
};

export const mySubjects = (state: StudyState) =>
  state.subjects ? SUBJECTS.filter((s) => state.subjects!.includes(s.slug)) : SUBJECTS;

/* ---------- Study plan ---------- */

/**
 * Spread the subject's topics over the chosen weekdays up to the exam, weakest
 * first. Sessions left over become mixed review, and the last one is a mock exam.
 */
export const buildPlan = (subject: Subject, state: StudyState, examDate: string, weekdays: number[], minutes: number): StudyPlan => {
  const order = topicsOf(subject)
    .map((t, i) => ({ t, i, w: STATUS_META[topicStatus(t, state)].weight }))
    .sort((a, b) => a.w - b.w || a.i - b.i)
    .map((x) => x.t);

  const dates: string[] = [];
  const end = new Date(`${examDate}T00:00:00`);
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (d < end && dates.length < 90) {
    if (weekdays.includes(d.getDay())) dates.push(today(d));
    d.setDate(d.getDate() + 1);
  }

  const perSession = Math.max(minutes >= 60 ? 2 : 1, Math.ceil(order.length / Math.max(1, dates.length - 1)));
  let n = 0;
  const task = (kind: TaskKind, topicId?: string): PlanTask => ({ id: `t${++n}`, kind, topicId, done: false });

  const days: PlanDay[] = dates.map((date, i) => {
    const chunk = order.slice(i * perSession, i * perSession + perSession);
    const isLast = i === dates.length - 1 && dates.length > 1;
    if (isLast) return { date, tasks: [task("mistakes"), task("exam")] };
    if (chunk.length) {
      return {
        date,
        tasks: chunk.flatMap((t) => [
          ...(state.read[t.id] ? [] : [task("guide", t.id)]),
          task("flashcards", t.id),
          task("practice", t.id),
        ]),
      };
    }
    return { date, tasks: [task("mistakes"), task("practice", order[i % order.length]?.id)] };
  });

  return { createdAt: Date.now(), examDate, weekdays, minutes, days };
};
