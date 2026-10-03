import type { HelpData, HelpItem } from "./types";

// Finds the help questions closest to what someone typed, without any AI:
// word overlap with the question, its keywords and its answer, with crude
// stemming so "joining" finds "join".

const STOP = new Set(
  "a an and are as at be can could do does for from get how i if in is it its me my of on or should so that the this to use using what whats when where which who why will with would you your refyn".split(" "),
);

const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "") || w;
export const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);

/** `coverage`: how much of what they typed the question and its keywords account for. */
export type Match = { item: HelpItem; score: number; coverage: number };

export function matchHelp(data: HelpData, text: string, limit = 5): Match[] {
  const want = new Set(words(text));
  if (!want.size) return [];
  const phrase = text.toLowerCase();
  const out: Match[] = [];
  for (const item of data.categories.flatMap((c) => c.items)) {
    const inQ = new Set(words(item.q));
    const inKeys = new Set(words((item.keywords ?? []).join(" ")));
    const inA = new Set(words(item.a));
    let score = 0;
    let covered = 0;
    for (const w of want) {
      if (inKeys.has(w)) score += 3;
      if (inQ.has(w)) score += 3;
      else if (inA.has(w)) score += 1;
      if (inKeys.has(w) || inQ.has(w)) covered++;
    }
    // Whole keyword phrases ("class code", "ctrl k") count extra
    for (const k of item.keywords ?? []) if (k.includes(" ") && phrase.includes(k)) score += 4;
    if (score > 0) out.push({ item, score: score / Math.sqrt(want.size + 1), coverage: covered / want.size });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** A confident single answer, or null when the question needs more than the FAQ. */
export function confidentMatch(matches: Match[]): HelpItem | null {
  const [top, next] = matches;
  if (!top) return null;
  const ahead = !next || top.score >= next.score * 1.15;
  const clearlyAhead = !next || top.score >= next.score * 1.35;
  if (top.coverage >= 0.99 && ahead && top.score >= 2) return top.item;
  if (top.coverage >= 0.75 && clearlyAhead && top.score >= 4) return top.item;
  return null;
}
