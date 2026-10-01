import { supabase } from "@/integrations/supabase/client";

// Streamed replies from the ai-chat function (Server-Sent Events). The function
// answers errors (rate limits, quotas, school rules) as plain JSON instead.

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export type StreamStart = { model?: string; modelName?: string; effort?: string | null; notice?: string };
export type StreamResult =
  | { kind: "stream"; text: string; meta: Record<string, unknown>; interrupted: boolean; aborted: boolean }
  // A JSON answer: an error, or an older deployment that doesn't stream
  | { kind: "json"; status: number; data: Record<string, unknown> | null };

export async function streamChat(
  body: Record<string, unknown>,
  on: { start?: (s: StreamStart) => void; delta: (text: string, full: string) => void },
  signal?: AbortSignal,
): Promise<StreamResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  });
  if (!(res.headers.get("content-type") ?? "").includes("text/event-stream") || !res.body) {
    let json: Record<string, unknown> | null = null;
    try { json = await res.json(); } catch { /* not JSON */ }
    return { kind: "json", status: res.status, data: json };
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let meta: Record<string, unknown> = {};
  let interrupted = false;
  let finished = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let cut: number;
      while ((cut = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, cut);
        buf = buf.slice(cut + 2);
        const line = chunk.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        let ev: { type?: string; text?: string; meta?: Record<string, unknown>; model?: string; modelName?: string; effort?: string | null; notice?: string };
        try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
        if (ev.type === "start") on.start?.({ model: ev.model, modelName: ev.modelName, effort: ev.effort, notice: ev.notice });
        else if (ev.type === "delta" && ev.text) { text += ev.text; on.delta(ev.text, text); }
        else if (ev.type === "done") { meta = ev.meta ?? {}; finished = true; }
        else if (ev.type === "error") interrupted = true;
      }
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return { kind: "stream", text, meta, interrupted: false, aborted: true };
    interrupted = true;
  }
  return { kind: "stream", text, meta, interrupted: interrupted || !finished, aborted: false };
}
