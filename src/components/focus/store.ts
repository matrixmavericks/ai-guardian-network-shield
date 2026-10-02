import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logActivity, today } from "@/components/subjects/store";
import { sceneById, type SceneId, type SoundId } from "./scenes";
import { chime, setMix } from "./sound";

// One focus session for the whole app. It lives outside React so the timer
// and the sound keep going when you move to another page (the island shows
// it), and it is saved per person so a reload doesn't lose it.

export type Plan = { id: string; label: string; focus: number; brk: number; kind: "cycle" | "single" };

export const PLANS: Plan[] = [
  { id: "25-5", label: "Pomodoro", focus: 25, brk: 5, kind: "cycle" },
  { id: "50-10", label: "Deep work", focus: 50, brk: 10, kind: "cycle" },
  { id: "90-15", label: "Long haul", focus: 90, brk: 15, kind: "cycle" },
];
export const TIMERS = [5, 10, 15, 20, 30, 45];

export type Task = { id: string; text: string; done: boolean };
export type FocusState = {
  scene: SceneId;
  intent: string;
  /** A plan id, or "t<minutes>" for a single timer */
  plan: string;
  phase: "focus" | "break";
  status: "idle" | "running" | "paused" | "done";
  endsAt: number;
  left: number;
  total: number;
  round: number;
  mix: Partial<Record<SoundId, number>>;
  soundOn: boolean;
  tasks: Task[];
  days: Record<string, { minutes: number; sessions: number }>;
};

export const planOf = (id: string): Plan => {
  const single = /^t(\d{1,3})$/.exec(id);
  if (single) {
    const m = Math.min(240, Math.max(1, Number(single[1])));
    return { id, label: `${m}-minute timer`, focus: m, brk: 0, kind: "single" };
  }
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
};

const fresh = (): FocusState => {
  const p = PLANS[0];
  return {
    scene: "rain",
    intent: "",
    plan: p.id,
    phase: "focus",
    status: "idle",
    endsAt: 0,
    left: p.focus * 60_000,
    total: p.focus * 60_000,
    round: 0,
    mix: { ...sceneById("rain").sounds },
    soundOn: false,
    tasks: [],
    days: {},
  };
};

let uid = "guest";
let state: FocusState = fresh();
const listeners = new Set<() => void>();
const keyOf = (id: string) => `refyn:${id}:focus`;

const persist = () => {
  try {
    localStorage.setItem(keyOf(uid), JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
};
const set = (patch: Partial<FocusState>) => {
  state = { ...state, ...patch };
  persist();
  listeners.forEach((l) => l());
};

const lengthOf = (phase: FocusState["phase"], plan = planOf(state.plan)) => (phase === "focus" ? plan.focus : plan.brk) * 60_000;

/* ---------- the clock ---------- */

let timer = 0;
let baseTitle = "";
const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
};
export const clock = fmt;

const title = () => {
  if (typeof document === "undefined") return;
  if (state.status === "running") {
    if (!baseTitle) baseTitle = document.title;
    document.title = `${fmt(state.endsAt - Date.now())} · ${state.phase === "break" ? "Break" : planOf(state.plan).kind === "single" ? "Timer" : "Focus"}`;
  } else if (baseTitle) {
    document.title = baseTitle;
    baseTitle = "";
  }
};

const tick = () => {
  if (state.status !== "running") return stopClock();
  if (Date.now() >= state.endsAt) complete();
  title();
};
const startClock = () => {
  if (!timer) timer = window.setInterval(tick, 250);
  title();
};
const stopClock = () => {
  window.clearInterval(timer);
  timer = 0;
  title();
};

const credit = (ms: number) => {
  const d = today();
  const day = state.days[d] ?? { minutes: 0, sessions: 0 };
  const days = { ...state.days, [d]: { minutes: day.minutes + Math.round(ms / 60_000), sessions: day.sessions + 1 } };
  // Keep about three months of history
  const keys = Object.keys(days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 100))) delete days[k];
  logActivity(uid === "guest" ? null : uid);
  return days;
};

const complete = () => {
  const plan = planOf(state.plan);
  if (state.phase === "focus") {
    const days = credit(state.total);
    chime("focus");
    notify(plan.kind === "single" ? "Time's up" : "Focus session done", plan.kind === "single" ? state.intent || "Your timer has finished." : `Take a ${plan.brk}-minute break.`);
    if (plan.kind === "single") {
      set({ days, status: "done", left: 0, round: state.round + 1 });
      stopClock();
      return;
    }
    const total = lengthOf("break", plan);
    set({ days, phase: "break", status: "running", total, endsAt: Date.now() + total, left: total, round: state.round + 1 });
    return;
  }
  chime("break");
  notify("Break's over", "Ready for the next round?");
  const total = lengthOf("focus", plan);
  set({ phase: "focus", status: "idle", total, left: total, endsAt: 0 });
  stopClock();
};

const notify = (head: string, body: string) => {
  try {
    if (document.hidden && "Notification" in window && Notification.permission === "granted") new Notification(head, { body, silent: true });
  } catch {
    /* notifications unavailable */
  }
};

/* ---------- actions ---------- */

const applySound = () => setMix(state.mix, state.soundOn);

export const focus = {
  start() {
    // A finished timer starts over; otherwise carry on from what is left (including any nudges)
    const again = state.status === "done" || state.left <= 0;
    const total = again ? lengthOf(state.phase) : state.total;
    const left = again ? total : state.left;
    set({ status: "running", total, endsAt: Date.now() + left, left });
    startClock();
    applySound();
  },
  pause() {
    if (state.status !== "running") return;
    set({ status: "paused", left: Math.max(0, state.endsAt - Date.now()) });
    stopClock();
  },
  toggle() {
    if (state.status === "running") focus.pause();
    else focus.start();
  },
  reset() {
    const total = lengthOf("focus");
    set({ status: "idle", phase: "focus", total, left: total, endsAt: 0 });
    stopClock();
  },
  /** End the current phase now (counts focus time already done). */
  skip() {
    if (state.status === "idle" && state.phase === "focus") return;
    if (state.phase === "focus" && state.status !== "done") {
      const done = state.total - (state.status === "running" ? state.endsAt - Date.now() : state.left);
      if (done >= 60_000) {
        state = { ...state, total: done };
        complete();
        return;
      }
    }
    if (state.phase === "break") complete();
    else focus.reset();
  },
  /** Add (or take away) minutes from the running phase. */
  nudge(min: number) {
    const ms = min * 60_000;
    if (state.status === "running") {
      const left = Math.max(30_000, state.endsAt - Date.now() + ms);
      set({ endsAt: Date.now() + left, total: Math.max(state.total + ms, left) });
    } else {
      const left = Math.max(60_000, state.left + ms);
      set({ left, total: Math.max(left, state.total + ms), status: state.status === "done" ? "paused" : state.status });
    }
  },
  setPlan(plan: string) {
    const p = planOf(plan);
    const total = p.focus * 60_000;
    set({ plan: p.id, phase: "focus", status: "idle", total, left: total, endsAt: 0 });
    stopClock();
  },
  setScene(scene: SceneId) {
    set({ scene, mix: { ...sceneById(scene).sounds } });
    applySound();
  },
  setLevel(id: SoundId, v: number) {
    set({ mix: { ...state.mix, [id]: v }, soundOn: v > 0 ? true : state.soundOn });
    applySound();
  },
  toggleSound(on = !state.soundOn) {
    set({ soundOn: on });
    applySound();
  },
  setIntent(intent: string) {
    set({ intent: intent.slice(0, 140) });
  },
  addTask(text: string) {
    const t = text.trim().slice(0, 200);
    if (!t) return;
    set({ tasks: [...state.tasks, { id: Math.random().toString(36).slice(2, 10), text: t, done: false }].slice(-30) });
  },
  toggleTask(id: string) {
    set({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) });
  },
  removeTask(id: string) {
    set({ tasks: state.tasks.filter((t) => t.id !== id) });
  },
  clearDone() {
    set({ tasks: state.tasks.filter((t) => !t.done) });
  },
};

/* ---------- binding to the signed-in person ---------- */

const bind = (id: string) => {
  if (id === uid) return;
  setMix({}, false);
  stopClock();
  uid = id;
  let loaded = fresh();
  try {
    const raw = localStorage.getItem(keyOf(id));
    if (raw) loaded = { ...loaded, ...(JSON.parse(raw) as Partial<FocusState>) };
  } catch {
    /* corrupt: start fresh */
  }
  // Sound never restarts by itself after a reload: browsers need a tap first
  loaded.soundOn = false;
  state = loaded;
  // Bound during a render: tell the other subscribers, and finish a session
  // that ended while the page was closed, once React is done rendering.
  window.setTimeout(() => {
    if (state.status === "running") {
      if (Date.now() >= state.endsAt) complete();
      else startClock();
    }
    listeners.forEach((l) => l());
  }, 0);
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useFocus = () => {
  const { user } = useAuth();
  const id = user?.id ?? "guest";
  if (id !== uid) bind(id);
  return useSyncExternalStore(subscribe, () => state, () => state);
};

/** Milliseconds left in the current phase, refreshed a few times a second while running. */
export const useLeft = (s: FocusState) => {
  const [, force] = useState(0);
  useEffect(() => {
    if (s.status !== "running") return;
    const id = window.setInterval(() => force((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [s.status]);
  return s.status === "running" ? Math.max(0, s.endsAt - Date.now()) : s.left;
};

/** True when there is something worth showing in the island. */
export const isLive = (s: FocusState) => s.status === "running" || s.status === "paused" || s.status === "done" || (s.soundOn && Object.values(s.mix).some((v) => (v ?? 0) > 0));

export const todayStats = (s: FocusState) => s.days[today()] ?? { minutes: 0, sessions: 0 };

export const weekMinutes = (s: FocusState) => {
  const out: { day: string; minutes: number }[] = [];
  const d = new Date();
  for (let i = 6; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    const k = today(x);
    out.push({ day: k, minutes: s.days[k]?.minutes ?? 0 });
  }
  return out;
};
