// Interactive blocks in assistant replies (formats in supabase/functions/_shared/chatPowers.ts):
//   <<<QUIZ title="…">>> {json} <<<END QUIZ>>>   and FLASHCARDS, GRAPH, CHART, PLAN, ACTION.
// Everything the model writes is checked and trimmed here before it is rendered.

export type BlockKind = "quiz" | "flashcards" | "graph" | "chart" | "plan" | "action";

export type QuizQuestion =
  | { type: "mcq"; q: string; options: string[]; answer: number; explain: string }
  | { type: "tf"; q: string; answer: boolean; explain: string }
  | { type: "short"; q: string; answer: string; explain: string };
export type QuizSpec = { title: string; questions: QuizQuestion[] };
export type FlashSpec = { title: string; cards: { front: string; back: string }[] };
export type GraphSpec = {
  title: string;
  functions: { expr: string; label: string }[];
  params: Record<string, [number, number, number]>;
  x: [number, number];
  y: [number, number] | null;
  points: { x: number; y: number; label: string }[];
};
export type ChartSpec = { title: string; type: "bar" | "line" | "pie"; labels: string[]; series: { name: string; data: number[] }[]; unit: string };
export type PlanItem = { date: string; time: string; minutes: number; title: string; detail: string; tag: string };
export type PlanSpec = { title: string; items: PlanItem[] };
export type ActionSpec =
  | { type: "assignment"; classId: string; title: string; description: string; due: string; instructions: string; attach: string[]; rubric: { group: string; year: number; criteria: string[] } | null }
  | { type: "message"; to: string; text: string }
  | { type: "marking_set"; title: string; group: string; year: number; criteria: string[]; task: string }
  | { type: "open"; tool: string; label: string; id: string };

export type Block =
  | { kind: "quiz"; spec: QuizSpec }
  | { kind: "flashcards"; spec: FlashSpec }
  | { kind: "graph"; spec: GraphSpec }
  | { kind: "chart"; spec: ChartSpec }
  | { kind: "plan"; spec: PlanSpec }
  | { kind: "action"; spec: ActionSpec };

export const BLOCK_LABEL: Record<BlockKind, string> = { quiz: "quiz", flashcards: "flashcards", graph: "graph", chart: "chart", plan: "plan", action: "action" };

const str = (v: unknown, n = 400) => (typeof v === "string" ? v.trim().slice(0, n) : typeof v === "number" ? String(v) : "");
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : d);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

/** Pull the JSON object out of a block body (tolerates code fences and text around it). */
export function blockJson(body: string): Loose | null {
  const s = body.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "");
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    const v = JSON.parse(s.slice(a, b + 1));
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

function quiz(title: string, j: Loose): QuizSpec | null {
  const questions: QuizQuestion[] = [];
  for (const raw of arr(j.questions).slice(0, 30)) {
    const r = raw as Loose;
    const q = str(r?.q ?? r?.question, 600);
    if (!q) continue;
    const explain = str(r.explain ?? r.explanation, 600);
    const type = str(r.type).toLowerCase();
    const options = arr(r.options).map((o) => str(o, 200)).filter(Boolean).slice(0, 6);
    if ((type === "mcq" || (!type && options.length >= 2)) && options.length >= 2) {
      let answer = typeof r.answer === "number" ? r.answer : options.findIndex((o) => o.toLowerCase() === str(r.answer).toLowerCase());
      if (!(answer >= 0 && answer < options.length)) answer = 0;
      questions.push({ type: "mcq", q, options, answer, explain });
    } else if (type === "tf" || type === "true_false" || typeof r.answer === "boolean") {
      const answer = typeof r.answer === "boolean" ? r.answer : /^t(rue)?$/i.test(str(r.answer));
      questions.push({ type: "tf", q, answer, explain });
    } else {
      const answer = str(r.answer, 600);
      if (answer) questions.push({ type: "short", q, answer, explain });
    }
  }
  return questions.length ? { title, questions } : null;
}

function flashcards(title: string, j: Loose): FlashSpec | null {
  const cards = arr(j.cards).map((c) => ({ front: str((c as Loose)?.front, 300), back: str((c as Loose)?.back, 600) })).filter((c) => c.front && c.back).slice(0, 60);
  return cards.length ? { title, cards } : null;
}

function range(v: unknown, d: [number, number]): [number, number] {
  const a = arr(v);
  const lo = num(a[0], d[0]);
  const hi = num(a[1], d[1]);
  return hi > lo && hi - lo < 1e6 ? [lo, hi] : d;
}

function graph(title: string, j: Loose): GraphSpec | null {
  const functions = arr(j.functions)
    .map((f) => (typeof f === "string" ? { expr: str(f, 200), label: "" } : { expr: str((f as Loose)?.expr ?? (f as Loose)?.y, 200), label: str((f as Loose)?.label, 80) }))
    .filter((f) => f.expr)
    .slice(0, 6);
  if (!functions.length) return null;
  const params: GraphSpec["params"] = {};
  for (const [k, v] of Object.entries((j.params as Loose) ?? {})) {
    if (!/^[a-df-wyz]$/i.test(k)) continue; // single letters, never x or e
    const a = arr(v);
    const [lo, hi] = range([a[1], a[2]], [-10, 10]);
    params[k.toLowerCase()] = [Math.min(hi, Math.max(lo, num(a[0], (lo + hi) / 2))), lo, hi];
  }
  const points = arr(j.points).map((p) => ({ x: num((p as Loose)?.x, NaN), y: num((p as Loose)?.y, NaN), label: str((p as Loose)?.label, 60) })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)).slice(0, 12);
  return { title, functions, params, x: range(j.x, [-10, 10]), y: j.y ? range(j.y, [-10, 10]) : null, points };
}

function chart(title: string, type: string, j: Loose): ChartSpec | null {
  const labels = arr(j.labels).map((l) => str(l, 40)).slice(0, 40);
  const series = arr(j.series).map((s) => ({ name: str((s as Loose)?.name, 40) || "Series", data: arr((s as Loose)?.data).map((d) => num(d, 0)).slice(0, labels.length) })).filter((s) => s.data.length).slice(0, 5);
  if (!labels.length || !series.length) return null;
  const t = (str(j.type) || type).toLowerCase();
  return { title, type: t === "line" ? "line" : t === "pie" ? "pie" : "bar", labels, series, unit: str(j.unit, 12) };
}

function plan(title: string, j: Loose): PlanSpec | null {
  const items = arr(j.items)
    .map((i) => {
      const r = i as Loose;
      const date = str(r?.date, 10);
      return { date, time: /^\d{1,2}:\d{2}$/.test(str(r?.time)) ? str(r.time).padStart(5, "0") : "", minutes: Math.max(0, Math.min(600, Math.round(num(r?.minutes, 0)))), title: str(r?.title, 140), detail: str(r?.detail, 300), tag: str(r?.tag, 40) };
    })
    .filter((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.date) && i.title)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 60);
  return items.length ? { title, items } : null;
}

function action(j: Loose): ActionSpec | null {
  const type = str(j.type).toLowerCase();
  if (type === "assignment") {
    const r = j.rubric as Loose | undefined;
    const criteria = arr(r?.criteria).map((c) => str(c, 1).toUpperCase()).filter((c) => c && "ABCD".includes(c));
    return {
      type, classId: str(j.classId ?? j.class_id, 60), title: str(j.title, 200), description: str(j.description, 4000), due: str(j.due, 16),
      instructions: str(j.instructions, 8000), attach: arr(j.attach).map((a) => str(a, 160)).filter(Boolean).slice(0, 6),
      rubric: r && criteria.length ? { group: str(r.group, 40), year: Math.min(5, Math.max(1, Math.round(num(r.year, 5)))), criteria: [...new Set(criteria)].sort() } : null,
    };
  }
  if (type === "message") { const text = str(j.text, 2000); return text ? { type, to: str(j.to, 80), text } : null; }
  if (type === "marking_set") {
    const criteria = arr(j.criteria).map((c) => str(c, 1).toUpperCase()).filter((c) => "ABCD".includes(c) && c);
    return { type, title: str(j.title, 200) || "Marking set", group: str(j.group, 40), year: Math.min(5, Math.max(1, Math.round(num(j.year, 5)))), criteria: criteria.length ? [...new Set(criteria)].sort() : ["A", "B", "C", "D"], task: str(j.task, 4000) };
  }
  if (type === "open") { const tool = str(j.tool, 40); return tool ? { type, tool, label: str(j.label, 60), id: str(j.id, 60) } : null; }
  return null;
}

/** A finished block body → a renderable block, or null when the model's JSON is unusable. */
export function parseBlock(kind: BlockKind, attrs: string, body: string): Block | null {
  const attr = (k: string) => attrs.match(new RegExp(`${k}\\s*=\\s*"([^"]*)"`, "i"))?.[1]?.trim() ?? "";
  const j = blockJson(body);
  if (!j) return null;
  const title = (attr("title") || str(j.title, 120)).slice(0, 120);
  switch (kind) {
    case "quiz": { const s = quiz(title || "Quick quiz", j); return s && { kind, spec: s }; }
    case "flashcards": { const s = flashcards(title || "Flashcards", j); return s && { kind, spec: s }; }
    case "graph": { const s = graph(title, j); return s && { kind, spec: s }; }
    case "chart": { const s = chart(title, attr("type"), j); return s && { kind, spec: s }; }
    case "plan": { const s = plan(title || "Plan", j); return s && { kind, spec: s }; }
    case "action": { const s = action(j); return s && { kind, spec: s }; }
  }
}

/** A stable key for a block's saved progress (survives reloads, unlike message ids). */
export function blockKey(kind: string, body: string): string {
  let h = 5381;
  for (let i = 0; i < body.length; i++) h = ((h << 5) + h + body.charCodeAt(i)) | 0;
  return `${kind}:${(h >>> 0).toString(36)}:${body.length}`;
}
