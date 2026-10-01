import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// One live list of the signed-in person's notifications, shared by every bell
// on the page (sidebar, phone menu, chat). Rows come from database triggers.

// The table is newer than the generated Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type NotificationKind = "task_set" | "task_due" | "task_marked" | "submission" | "reflection" | "message";
export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

type State = { items: Notification[]; loaded: boolean };
let state: State = { items: [], loaded: false };
let owner: string | null = null;
let channel: ReturnType<typeof supabase.channel> | null = null;
const listeners = new Set<(s: State) => void>();
const set = (next: State) => { state = next; listeners.forEach((l) => l(state)); };

const DESKTOP_KEY = "refyn:desktop-notifications";
export const desktopSupported = () => typeof window !== "undefined" && "Notification" in window;
export const desktopOn = () => {
  try { return desktopSupported() && window.Notification.permission === "granted" && localStorage.getItem(DESKTOP_KEY) === "on"; } catch { return false; }
};
export async function enableDesktop(): Promise<boolean> {
  if (!desktopSupported()) return false;
  const p = await window.Notification.requestPermission();
  try { localStorage.setItem(DESKTOP_KEY, p === "granted" ? "on" : "off"); } catch { /* storage unavailable */ }
  return p === "granted";
}
export const disableDesktop = () => { try { localStorage.setItem(DESKTOP_KEY, "off"); } catch { /* storage unavailable */ } };

/** A desktop alert when the tab is in the background (only if the person turned them on). */
const alertDesktop = (n: Notification) => {
  if (!desktopOn() || !document.hidden) return;
  try {
    const note = new window.Notification(n.title, { body: n.body ?? undefined, tag: n.id, icon: "/favicon.ico" });
    note.onclick = () => { window.focus(); if (n.link) window.location.assign(n.link); note.close(); };
  } catch { /* some browsers only allow this from a service worker */ }
};

async function start(userId: string) {
  if (owner === userId) return;
  owner = userId;
  if (channel) { supabase.removeChannel(channel); channel = null; }
  set({ items: [], loaded: false });
  const { data } = await db.from("notifications").select("id, kind, title, body, link, data, read_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(60);
  if (owner !== userId) return;
  set({ items: (data ?? []) as Notification[], loaded: true });
  channel = supabase
    .channel(`notifications-${userId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
      const n = payload.new as Notification;
      if (state.items.some((x) => x.id === n.id)) return;
      set({ ...state, items: [n, ...state.items].slice(0, 100) });
      alertDesktop(n);
    })
    .subscribe();
}

function stop() {
  owner = null;
  if (channel) { supabase.removeChannel(channel); channel = null; }
  set({ items: [], loaded: false });
}

export function useNotifications() {
  const { user } = useAuth();
  const [s, setS] = useState(state);
  useEffect(() => {
    listeners.add(setS);
    return () => { listeners.delete(setS); };
  }, []);
  useEffect(() => {
    if (user?.id) start(user.id); else if (owner) stop();
  }, [user?.id]);
  return {
    ...s,
    unread: s.items.filter((n) => !n.read_at).length,
    markRead: async (ids: string[]) => {
      const now = new Date().toISOString();
      const todo = ids.filter((id) => state.items.find((n) => n.id === id && !n.read_at));
      if (!todo.length) return;
      set({ ...state, items: state.items.map((n) => (todo.includes(n.id) ? { ...n, read_at: now } : n)) });
      await db.from("notifications").update({ read_at: now }).in("id", todo);
    },
    clear: async (id: string) => {
      set({ ...state, items: state.items.filter((n) => n.id !== id) });
      await db.from("notifications").delete().eq("id", id);
    },
  };
}
