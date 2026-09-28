import { useEffect, useState } from "react";

// Per-user state kept in this browser (skills, notebook, archived chats).
// Storage can be unavailable (private mode, blocked site data), so every
// access is guarded and the UI works with the defaults.

const read = <T,>(key: string | null): T | undefined => {
  if (!key) return undefined;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};

/**
 * useState that persists under `key`. When the key changes (e.g. the signed-in
 * user loads), the stored value for the new key is read before anything is
 * written, so existing data is never overwritten with defaults.
 */
export const useStoredState = <T,>(key: string | null, initial: T) => {
  const [state, setState] = useState<{ key: string | null; value: T }>(() => ({ key, value: read<T>(key) ?? initial }));
  if (state.key !== key) setState({ key, value: read<T>(key) ?? initial });

  useEffect(() => {
    if (key && state.key === key) write(key, state.value);
  }, [key, state]);

  const setValue = (next: T | ((prev: T) => T)) =>
    setState((s) => ({ key: s.key, value: typeof next === "function" ? (next as (p: T) => T)(s.value) : next }));

  return [state.key === key ? state.value : read<T>(key) ?? initial, setValue] as const;
};

export type NotebookEntry = {
  id: string;
  title: string;
  content: string;
  source: string;
  createdAt: string;
};

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "refyn";

/** Save text as a .md file in the browser. */
export const downloadMarkdown = (filename: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/** A readable one-line preview of Markdown. */
export const plainText = (md: string) =>
  md
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
