import { supabase } from "@/integrations/supabase/client";
import type { Deck, DeckBrief, DeckDesign } from "./types";

// Talks to the ai-studio function: streamed deck generation and edits (SSE),
// and slide image generation.

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-studio`;

/**
 * Best-effort parse of an unfinished JSON object, so a slide can be shown
 * while its text is still arriving: closes open strings, arrays and objects
 * and drops a dangling key.
 */
export function parsePartial(text: string): Record<string, unknown> | null {
  const s = text.trim();
  if (!s.startsWith("{")) return null;
  const stack: string[] = [];
  let inStr = false, esc = false, out = "";
  for (const ch of s) {
    out += ch;
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inStr) out += esc ? '\\"' : '"';
  // Drop trailing commas, and keys or colons with no value yet
  const tidy = (t: string) =>
    t.replace(/,\s*$/, "").replace(/,\s*"[^"]*"\s*:?\s*$/, "").replace(/\{\s*"[^"]*"\s*:?\s*$/, "{").replace(/:\s*$/, ": null");
  let candidate = tidy(out);
  for (let i = stack.length - 1; i >= 0; i--) candidate = tidy(candidate) + stack[i];
  try {
    const v = JSON.parse(candidate);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

export type StreamEvent =
  | { type: "item"; item: Record<string, unknown> }
  | { type: "partial"; text: string }
  | { type: "done"; usage?: unknown }
  | { type: "error"; message: string };

async function stream(body: Record<string, unknown>, onEvent: (e: StreamEvent) => void, signal?: AbortSignal) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    let message = `Refyn Slides is unavailable (${res.status}).`;
    try { message = (await res.json()).error ?? message; } catch { /* not JSON */ }
    throw new Error(message);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const raw = buf.slice(0, i).trim();
      buf = buf.slice(i + 2);
      if (!raw.startsWith("data:")) continue;
      try { onEvent(JSON.parse(raw.slice(5).trim())); } catch { /* ignore */ }
    }
  }
}

export const streamDeck = (brief: DeckBrief, design: DeckDesign, onEvent: (e: StreamEvent) => void, signal?: AbortSignal) =>
  stream({ action: "deck", brief, design, sessionId: brief.sessionId ?? null }, onEvent, signal);

/** The deck without runtime-only image fields, for the edit prompt. */
export const deckForAi = (deck: Deck) => ({
  title: deck.title,
  subtitle: deck.subtitle,
  slides: deck.slides.map((s) => ({ ...s, image: s.image ? { prompt: s.image.prompt, alt: s.image.alt } : undefined })),
});

export const streamEdit = (deck: Deck, instruction: string, scope: string[] | null, onEvent: (e: StreamEvent) => void, signal?: AbortSignal) =>
  stream({ action: "edit", deck: deckForAi(deck), instruction, scope, imageStyle: deck.design.imageStyle }, onEvent, signal);

export async function generateImage(prompt: string, style: string, quality: "fast" | "best" = "fast"): Promise<{ path: string; url: string }> {
  const { data, error } = await supabase.functions.invoke("ai-studio", { body: { action: "image", prompt, style, quality } });
  if (error || !data?.path) throw new Error(data?.error || "Couldn't make that image.");
  return { path: data.path, url: data.url };
}
