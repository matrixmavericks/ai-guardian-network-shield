import { supabase } from "@/integrations/supabase/client";
import { DIAGRAM_SCHEMA, isDiagram, type DiagramSpec } from "./diagrams";
import { MYP, type Letter, type MypGroup } from "@/lib/myp";

/* ---------- Types ---------- */

export type QType = "mcq" | "short" | "long" | "working" | "fill" | "truefalse" | "match" | "table";

export type Part = { label: string; prompt: string; marks: number; lines: number; working?: boolean; answer?: string };

export type Question = {
  id: string;
  type: QType;
  prompt: string;
  marks: number;
  diagram?: DiagramSpec;
  options?: string[];
  pairs?: [string, string][];
  table?: { headers: string[]; rows: string[][] };
  lines?: number;
  parts?: Part[];
  answer?: string;
  /** MYP criterion this question assesses */
  criterion?: "A" | "B" | "C" | "D";
};

export type Section = { id: string; title: string; intro?: string; wordBank?: string[]; questions: Question[] };

export type Worksheet = {
  kind: "worksheet" | "test";
  title: string;
  subtitle?: string;
  instructions?: string;
  timeMinutes?: number;
  sections: Section[];
  extension?: string;
};

export type ExitTicket = { kind: "exit"; title: string; questions: Question[]; reflection?: string };
export type Flashcards = { kind: "flashcards"; title: string; cards: { front: string; back: string; diagram?: DiagramSpec }[] };

export type Printable = Worksheet | ExitTicket | Flashcards;
export type PrintKind = Printable["kind"];

export const QTYPE_LABEL: Record<QType, string> = {
  mcq: "Multiple choice",
  short: "Short answer",
  long: "Extended response",
  working: "Show your working",
  fill: "Fill in the blanks",
  truefalse: "True or false",
  match: "Matching",
  table: "Complete the table",
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export const marksOf = (q: Question) => (q.parts?.length ? q.parts.reduce((t, p) => t + (p.marks || 0), 0) : q.marks || 0);
export const totalMarks = (p: Printable) =>
  p.kind === "flashcards" ? 0 : p.kind === "exit" ? p.questions.reduce((t, q) => t + marksOf(q), 0) : p.sections.reduce((t, s) => t + s.questions.reduce((u, q) => u + marksOf(q), 0), 0);
export const questionCount = (p: Printable) => (p.kind === "flashcards" ? p.cards.length : p.kind === "exit" ? p.questions.length : p.sections.reduce((t, s) => t + s.questions.length, 0));

/* ---------- Normalising AI output ---------- */

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "");
const num = (v: unknown, d: number, lo = 0, hi = 50) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : d;
};
const TYPES: QType[] = ["mcq", "short", "long", "working", "fill", "truefalse", "match", "table"];

export const normQuestion = (raw: unknown): Question | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  let type = (TYPES.includes(r.type as QType) ? r.type : "short") as QType;
  const prompt = str(r.prompt ?? r.question ?? r.text);
  const q: Question = { id: uid(), type, prompt, marks: num(r.marks, type === "long" ? 6 : type === "mcq" || type === "truefalse" ? 1 : 2, 0, 40) };
  if (isDiagram(r.diagram)) q.diagram = r.diagram;
  const crit = String(r.criterion ?? "").trim().toUpperCase().replace(/^CRITERION\s*/, "");
  if (/^[ABCD]$/.test(crit)) q.criterion = crit as Question["criterion"];
  if (type === "mcq") {
    const opts = Array.isArray(r.options) ? r.options.map((o) => str(o, 300)).filter(Boolean).slice(0, 6) : [];
    if (opts.length >= 2) q.options = opts.map((o) => o.replace(/^[A-F][).:]\s+/, ""));
    else type = q.type = "short";
  }
  if (type === "match") {
    const pairs = Array.isArray(r.pairs) ? (r.pairs as unknown[]).map((p) => (Array.isArray(p) ? [str(p[0], 200), str(p[1], 200)] : null)).filter((p): p is [string, string] => !!p && !!p[0] && !!p[1]) : [];
    if (pairs.length >= 2) q.pairs = pairs.slice(0, 8);
    else type = q.type = "short";
  }
  if (type === "table") {
    const t = r.table as { headers?: unknown; rows?: unknown } | undefined;
    const headers = Array.isArray(t?.headers) ? t!.headers.map((h) => str(h, 80)).slice(0, 6) : [];
    const rows = Array.isArray(t?.rows) ? (t!.rows as unknown[]).filter(Array.isArray).map((row) => (row as unknown[]).map((c) => str(c, 120)).slice(0, headers.length || 6)).slice(0, 12) : [];
    if (headers.length && rows.length) q.table = { headers, rows };
    else type = q.type = "short";
  }
  if (Array.isArray(r.parts) && r.parts.length) {
    q.parts = (r.parts as unknown[])
      .map((p, i) => {
        if (!p || typeof p !== "object") return null;
        const pp = p as Record<string, unknown>;
        const part: Part = { label: str(pp.label, 6) || String.fromCharCode(97 + i), prompt: str(pp.prompt ?? pp.question), marks: num(pp.marks, 2, 0, 20), lines: num(pp.lines, 2, 0, 14), working: !!pp.working || pp.type === "working", answer: str(pp.answer, 1200) || undefined };
        return part;
      })
      .filter((p): p is Part => !!p && !!p.prompt)
      .slice(0, 6);
    if (!q.parts.length) delete q.parts;
  }
  q.lines = num(r.lines, type === "long" ? 8 : type === "working" ? 6 : type === "short" ? 2 : 0, 0, 20);
  const ans = r.answer ?? r.markScheme ?? r.mark_scheme;
  if (ans !== undefined) q.answer = Array.isArray(ans) ? ans.map((a) => str(a, 300)).join("; ") : str(ans, 1500);
  if (!q.prompt && !q.parts?.length) return null;
  return q;
};

export const normalize = (raw: unknown, kind: PrintKind): Printable => {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const title = str(r.title, 140) || "Worksheet";
  if (kind === "flashcards") {
    const cards = (Array.isArray(r.cards) ? r.cards : [])
      .map((c) => {
        const cc = (c || {}) as Record<string, unknown>;
        const card = { front: str(cc.front ?? cc.term, 300), back: str(cc.back ?? cc.definition, 600) } as Flashcards["cards"][number];
        if (isDiagram(cc.diagram)) card.diagram = cc.diagram;
        return card;
      })
      .filter((c) => c.front && c.back)
      .slice(0, 24);
    if (!cards.length) throw new Error("No flashcards came back. Try again.");
    return { kind, title, cards };
  }
  if (kind === "exit") {
    const questions = (Array.isArray(r.questions) ? r.questions : []).map(normQuestion).filter((q): q is Question => !!q).slice(0, 4);
    if (!questions.length) throw new Error("No questions came back. Try again.");
    return { kind, title, questions, reflection: str(r.reflection, 200) || undefined };
  }
  const rawSections = Array.isArray(r.sections) ? r.sections : Array.isArray(r.questions) ? [{ title: "Questions", questions: r.questions }] : [];
  const sections: Section[] = rawSections
    .map((s, i) => {
      const ss = (s || {}) as Record<string, unknown>;
      return {
        id: uid(),
        title: str(ss.title, 120) || `Section ${String.fromCharCode(65 + i)}`,
        intro: str(ss.intro ?? ss.instructions, 400) || undefined,
        wordBank: Array.isArray(ss.wordBank) ? ss.wordBank.map((w) => str(w, 40)).filter(Boolean).slice(0, 16) : undefined,
        questions: (Array.isArray(ss.questions) ? ss.questions : []).map(normQuestion).filter((q): q is Question => !!q).slice(0, 30),
      };
    })
    .filter((s) => s.questions.length);
  if (!sections.length) throw new Error("No questions came back. Try again.");
  return {
    kind,
    title,
    subtitle: str(r.subtitle, 160) || undefined,
    instructions: str(r.instructions, 500) || undefined,
    timeMinutes: r.timeMinutes ? num(r.timeMinutes, 30, 5, 180) : undefined,
    sections,
    extension: str(r.extension ?? r.challenge, 600) || undefined,
  };
};

/* ---------- AI ---------- */

/** Pulls the first JSON object out of a model reply (handles code fences and stray text). */
export const extractJson = (text: string): unknown => {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The reply wasn't in the expected format. Try again.");
  const body = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(body);
  } catch {
    // common slips: trailing commas, smart quotes
    return JSON.parse(body.replace(/,\s*([}\]])/g, "$1").replace(/[“”]/g, '"'));
  }
};

export const askStudio = async (prompt: string, subject: string, gradeLevel: string) => {
  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: { prompt, subject, gradeLevel, processTeaching: false, sessionId: null, history: [] },
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.reply || data?.error || "Refyn couldn't answer just now.");
  return String(data.reply || "");
};

export type GenOptions = {
  kind: PrintKind;
  topic: string;
  band: string;
  level: "support" | "core" | "stretch";
  count: number;
  types: QType[];
  diagrams: boolean;
  minutes?: number;
  criterion?: string;
  /** Subject group and programme, from the teacher's subject and grade band */
  group?: MypGroup;
  programme?: "myp" | "dp";
  source?: string;
  notes?: string;
};

const LEVEL: Record<GenOptions["level"], string> = {
  support: "SUPPORT level: accessible language, scaffolded steps, worked hints, sentence starters, gentle difficulty ramp",
  core: "CORE level: on-grade difficulty with a clear ramp from recall to application",
  stretch: "STRETCH level: challenging application, multi-step reasoning, unfamiliar contexts, evaluation",
};

export const QUESTION_SHAPE = `Question object: {"type":"mcq|short|long|working|fill|truefalse|match|table","prompt":"...","marks":2,"options":["...","...","...","..."] (mcq only, no letters),"pairs":[["term","definition"]] (match only),"table":{"headers":["x","y"],"rows":[["1",""],["2",""]]} (table only; "" = blank for students),"lines":3 (answer lines),"parts":[{"label":"a","prompt":"...","marks":2,"lines":2,"working":true,"answer":"..."}] (optional sub-parts),"diagram":{...} (optional),"answer":"mark scheme / correct answer","criterion":"A" (MYP only: the criterion the question assesses)}
For "fill" put ___ where each blank goes. For truefalse the prompt is the statement.`;

/** What the AI must know about MYP criteria (or DP) for this printable. */
const assessmentLine = (o: GenOptions) => {
  if (o.programme === "dp") return "This is IB Diploma Programme work: do not use MYP criteria A–D; use DP-style questions, command terms and markschemes, and leave \"criterion\" out.";
  const g = o.group ? MYP[o.group] : null;
  const lines = [
    g
      ? `This is IB MYP ${g.name}. Its assessment criteria are exactly: ${(["A", "B", "C", "D"] as const).map((l) => `${l} ${g.criteria[l].name}`).join("; ")}. Give every question a "criterion" field with the criterion it actually assesses.`
      : `This is IB MYP work. Give every question a "criterion" field (A–D) for the subject group's own criteria; never borrow another group's criterion names.`,
  ];
  if (o.criterion && g) {
    const c = g.criteria[o.criterion as Letter];
    if (c) lines.push(`Focus on criterion ${o.criterion}: ${c.name}, which assesses ${c.focus}.${c.strands ? ` Cover its strands: ${c.strands.join("; ")}.` : ""}`);
  } else if (o.criterion) lines.push(`Focus on MYP criterion ${o.criterion} for this subject group.`);
  return lines.join(" ");
};

export const buildPrompt = (o: GenOptions, systemContext: string) => {
  const base = [
    systemContext,
    `Create a classroom-ready ${o.kind === "test" ? "test paper" : o.kind === "exit" ? "exit ticket" : o.kind === "flashcards" ? "set of flashcards" : "worksheet"} for ${o.band} on: "${o.topic}".`,
    LEVEL[o.level],
    assessmentLine(o),
    o.source ? `Base it on this material from the teacher:\n"""${o.source.slice(0, 4000)}"""` : "",
    o.notes ? `Teacher's extra instructions: ${o.notes.slice(0, 600)}` : "",
    "Use accurate, specific content with real numbers and contexts. Use plain Unicode maths (×, ÷, ², √, π, °, ≤) and never LaTeX or $ signs. British spelling.",
  ];
  if (o.kind === "flashcards") {
    base.push(`Make ${Math.max(8, Math.min(24, o.count))} cards. Return ONLY JSON: {"title":"...","cards":[{"front":"term or question","back":"definition or answer, max 40 words"}]}`);
  } else if (o.kind === "exit") {
    base.push(
      `Make 3 quick questions (one recall, one apply, one explain) that take 5 minutes in total, plus a one-line self-reflection prompt.`,
      QUESTION_SHAPE,
      o.diagrams ? DIAGRAM_SCHEMA : "Do not include diagrams.",
      `Return ONLY JSON: {"title":"...","questions":[Question],"reflection":"..."}`,
    );
  } else {
    base.push(
      `About ${o.count} questions in 2-4 titled sections that ramp in difficulty. Use these question types: ${o.types.join(", ")}.`,
      o.kind === "test" ? `It is a formal test: include marks for every question, start each question with an IB command term used in its IB meaning, and match the marks to the demand.` : `Include a short "extension" challenge at the end.`,
      o.minutes ? `It should take about ${o.minutes} minutes.` : "",
      QUESTION_SHAPE,
      o.diagrams ? DIAGRAM_SCHEMA : "Do not include diagrams.",
      `Every question needs an "answer" (the mark scheme). Return ONLY JSON: {"title":"...","subtitle":"...","instructions":"...","timeMinutes":30,"sections":[{"title":"...","intro":"...","wordBank":["optional"],"questions":[Question]}],"extension":"..."}`,
    );
  }
  return base.filter(Boolean).join("\n\n");
};

/* ---------- Markdown for students (never includes answers) ---------- */

export const toMarkdown = (p: Printable) => {
  const out: string[] = [`# ${p.title}`];
  if (p.kind === "flashcards") {
    p.cards.forEach((c, i) => out.push(`${i + 1}. **${c.front}**`));
    return out.join("\n\n");
  }
  const qMd = (q: Question, n: number) => {
    const lines = [`**${n}.** ${q.prompt}${q.marks && !q.parts?.length ? ` *[${q.marks} mark${q.marks === 1 ? "" : "s"}]*` : ""}${q.criterion ? ` · Criterion ${q.criterion}` : ""}`];
    q.options?.forEach((o, i) => lines.push(`- ${String.fromCharCode(65 + i)}. ${o}`));
    if (q.pairs?.length) lines.push("", "| | |", "|---|---|", ...q.pairs.map(([a, b], i) => `| ${i + 1}. ${a} | ${String.fromCharCode(65 + i)}. ${b} |`));
    if (q.table) lines.push("", `| ${q.table.headers.join(" | ")} |`, `|${q.table.headers.map(() => "---").join("|")}|`, ...q.table.rows.map((r) => `| ${r.map((c) => c || " ").join(" | ")} |`));
    q.parts?.forEach((pt) => lines.push(`- (${pt.label}) ${pt.prompt} *[${pt.marks}]*`));
    if (q.diagram) lines.push("*(See the diagram on the worksheet.)*");
    return lines.join("\n");
  };
  if (p.kind === "exit") {
    p.questions.forEach((q, i) => out.push(qMd(q, i + 1)));
    if (p.reflection) out.push(`*${p.reflection}*`);
    return out.join("\n\n");
  }
  if (p.subtitle) out.push(`*${p.subtitle}*`);
  if (p.instructions) out.push(p.instructions);
  if (p.timeMinutes) out.push(`**Time:** ${p.timeMinutes} minutes · **Total:** ${totalMarks(p)} marks`);
  let n = 0;
  for (const s of p.sections) {
    out.push(`## ${s.title}${s.intro ? `\n\n${s.intro}` : ""}${s.wordBank?.length ? `\n\n**Word bank:** ${s.wordBank.join(", ")}` : ""}`);
    for (const q of s.questions) out.push(qMd(q, ++n));
  }
  if (p.extension) out.push(`## Challenge\n\n${p.extension}`);
  return out.join("\n\n");
};

/* ---------- Plain text (copy / assign to class) ---------- */

export const toPlainText = (p: Printable, withAnswers = false) => {
  const out: string[] = [p.title];
  if (p.kind === "flashcards") {
    p.cards.forEach((c, i) => out.push(`${i + 1}. ${c.front}${withAnswers ? `\n   ${c.back}` : ""}`));
    return out.join("\n");
  }
  const qText = (q: Question, n: string) => {
    const lines = [`${n} ${q.prompt}${q.marks && !q.parts?.length ? ` [${q.marks}]` : ""}${q.criterion ? ` (Criterion ${q.criterion})` : ""}`];
    q.options?.forEach((o, i) => lines.push(`   ${String.fromCharCode(65 + i)}. ${o}`));
    q.pairs?.forEach(([a, b], i) => lines.push(`   ${i + 1}. ${a}  —  ${String.fromCharCode(65 + i)}. ${b}`));
    if (q.table) lines.push(`   ${q.table.headers.join(" | ")}`, ...q.table.rows.map((r) => `   ${r.map((c) => c || "____").join(" | ")}`));
    q.parts?.forEach((pt) => lines.push(`   (${pt.label}) ${pt.prompt} [${pt.marks}]${withAnswers && pt.answer ? `\n      Answer: ${pt.answer}` : ""}`));
    if (q.diagram) lines.push("   [Diagram]");
    if (withAnswers && q.answer) lines.push(`   Answer: ${q.answer}`);
    return lines.join("\n");
  };
  if (p.kind === "exit") {
    p.questions.forEach((q, i) => out.push(qText(q, `${i + 1}.`)));
    if (p.reflection) out.push(p.reflection);
    return out.join("\n\n");
  }
  if (p.instructions) out.push(p.instructions);
  let n = 0;
  for (const s of p.sections) {
    out.push(`\n${s.title}${s.intro ? `\n${s.intro}` : ""}${s.wordBank?.length ? `\nWord bank: ${s.wordBank.join(", ")}` : ""}`);
    for (const q of s.questions) out.push(qText(q, `${++n}.`));
  }
  if (p.extension) out.push(`\nChallenge: ${p.extension}`);
  return out.join("\n\n");
};
