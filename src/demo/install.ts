/* eslint-disable @typescript-eslint/no-explicit-any -- stands in for the untyped, chainable Supabase client */
import { supabase } from "@/integrations/supabase/client";
import { SUBJECTS as MYP } from "@/content/myp";
import { createQuery } from "./query";
import { buildTables, contactsFor } from "./fixtures";
import { demoReply, demoStream } from "./ai";
import { DEMO_USERS, exitDemo, type DemoRole } from "./session";

// Swap the Supabase client for an in-memory one before the app renders, so the
// demo runs the real portal pages on made-up data and never reaches the real
// backend. Writes live in memory for this page load.

const NOT_IN_DEMO = "This part of Refyn needs a real account, so it's switched off in the live demo.";

/** Half-built progress so the student's world and subjects have something to show. */
function seedStudy(userId: string) {
  const key = `refyn:${userId}:study`;
  try {
    if (localStorage.getItem(key)) return;
    const target: Record<string, number> = { biology: 0.8, chemistry: 0.42, physics: 1, "extended-mathematics": 0.6, "english-lang-lit": 0.25, history: 0.1, "individuals-societies": 0.5 };
    const attempts: Record<string, { ok: boolean; choice: number; at: number }[]> = {};
    const read: Record<string, number> = {};
    const hourAgo = Date.now() - 3_600_000;
    for (const s of MYP) {
      const topics = s.units.flatMap((u) => u.topics);
      const n = Math.round((target[s.slug] ?? 0) * topics.length);
      topics.slice(0, n).forEach((t) => {
        read[t.id] = hourAgo;
        t.questions.forEach((q) => (attempts[q.id] = [{ ok: true, choice: q.answer, at: hourAgo }]));
      });
    }
    const d = (k: number) => {
      const x = new Date(Date.now() - k * 86_400_000);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    };
    const activity: Record<string, number> = {};
    [0, 1, 2, 3, 4, 6, 7, 8].forEach((k, i) => (activity[d(k)] = [3, 2, 5, 1, 4, 2, 3, 1][i]));
    localStorage.setItem(key, JSON.stringify({ subjects: null, attempts, read, cards: {}, saved: [], plans: {}, activity, recent: null, exam: {}, worked: {}, settingsAt: 1 }));
  } catch {
    /* storage blocked: the world starts empty */
  }
}

export function installDemo(role: DemoRole) {
  const me = DEMO_USERS[role];
  const tables = buildTables();
  const latency = () => 60 + Math.random() * 140;
  const sb = supabase as any;

  const fakeUser = { id: me.id, email: me.email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: { full_name: me.fullName }, identities: [{ provider: "google" }], created_at: new Date(Date.now() - 80 * 86_400_000).toISOString() };
  const session = { access_token: "demo", refresh_token: "demo", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: fakeUser };

  sb.from = (table: string) => createQuery(tables, table, latency);
  sb.rpc = (name: string, args: Record<string, unknown> = {}) =>
    createQuery({ rpc: name === "get_user_contacts" ? contactsFor(tables, String(args._user_id ?? me.id)) : [] }, "rpc", latency);
  const channel = { on: () => channel, subscribe: (cb?: (s: string) => void) => (cb?.("SUBSCRIBED"), channel), unsubscribe: async () => "ok", send: async () => "ok", track: async () => "ok", untrack: async () => "ok", presenceState: () => ({}) };
  sb.channel = () => channel;
  sb.removeChannel = async () => "ok";
  sb.removeAllChannels = async () => [];
  const bucket = {
    upload: async (path: string) => ({ data: { path }, error: null }),
    download: async () => ({ data: null, error: { message: NOT_IN_DEMO } }),
    remove: async () => ({ data: [], error: null }),
    list: async () => ({ data: [], error: null }),
    createSignedUrl: async () => ({ data: { signedUrl: "about:blank" }, error: null }),
    createSignedUrls: async () => ({ data: [], error: null }),
    getPublicUrl: () => ({ data: { publicUrl: "about:blank" } }),
  };
  sb.storage = { from: () => bucket };

  const invoke = async (name: string, opts: { body?: any } = {}) => {
    await new Promise((r) => setTimeout(r, 700));
    if (name === "ai-chat") {
      const reply = demoReply(opts.body ?? {}, role);
      return { data: { success: true, reply, response: reply, meta: {} }, error: null };
    }
    return { data: null, error: { name: "FunctionsHttpError", message: NOT_IN_DEMO, context: null } };
  };
  Object.defineProperty(sb, "functions", { value: { invoke }, configurable: true });

  const auth = sb.auth;
  auth.getSession = async () => ({ data: { session }, error: null });
  auth.getUser = async () => ({ data: { user: fakeUser }, error: null });
  auth.refreshSession = async () => ({ data: { session, user: fakeUser }, error: null });
  auth.onAuthStateChange = (cb: (e: string, s: unknown) => void) => {
    setTimeout(() => cb("INITIAL_SESSION", session), 0);
    return { data: { subscription: { id: "demo", callback: cb, unsubscribe: () => {} } } };
  };
  auth.signOut = async () => {
    exitDemo();
    return { error: null };
  };
  auth.updateUser = async () => ({ data: { user: fakeUser }, error: null });
  // Signing in for real starts from a clean slate
  auth.signInWithPassword = async () => {
    exitDemo("/login");
    return { data: { user: null, session: null }, error: { message: "Leaving the demo…" } };
  };

  // Edge functions called with fetch (streamed chat, decks)
  const base = String(import.meta.env.VITE_SUPABASE_URL ?? "");
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (base && url.startsWith(`${base}/functions/v1/`)) {
      if (url.endsWith("/ai-chat")) {
        let body = {};
        try {
          body = JSON.parse(String(init?.body ?? "{}"));
        } catch {
          /* empty */
        }
        return demoStream(demoReply(body, role));
      }
      await new Promise((r) => setTimeout(r, 400));
      return new Response(JSON.stringify({ error: NOT_IN_DEMO }), { status: 403, headers: { "content-type": "application/json" } });
    }
    if (base && (url.startsWith(`${base}/rest/v1/`) || url.startsWith(`${base}/storage/v1/`))) {
      return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    }
    return realFetch(input as RequestInfo, init);
  };

  if (role === "student") seedStudy(me.id);
  document.documentElement.dataset.demo = role;
  (window as any).__demo = { role, tables };
}
