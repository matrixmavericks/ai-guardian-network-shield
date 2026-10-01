import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

type Runtime = typeof globalThis & { Deno?: { env?: { get?: (name: string) => string | undefined } }; process?: { env?: Record<string, string | undefined> } };
const env = (name: string) => {
  const runtime = globalThis as Runtime;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
};

export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("Sign in required");
  const url = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
  const keyset = env("SUPABASE_PUBLISHABLE_KEYS");
  let publishable: string | undefined;
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        publishable = Object.values(parsed).find((v): v is string => typeof v === "string" && v.startsWith("sb_publishable_"));
      }
    } catch { /* Use legacy key below. */ }
  }
  const key = env("SUPABASE_PUBLISHABLE_KEY") ?? env("VITE_SUPABASE_PUBLISHABLE_KEY") ?? publishable ?? env("SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("Data connection unavailable");
  return createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
}