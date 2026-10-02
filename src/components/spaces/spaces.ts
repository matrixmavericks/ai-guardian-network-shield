import type { CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";
import { extractFile } from "@/components/assistant/files/extract";

// Gems (custom AI assistants and role-play characters), Worlds (a space per
// unit: notes, files, flashcards, tasks, role-play scenes and a guide Gem) and
// the AI calls behind them (the refyn-spaces function). Row-level security
// decides who sees what: private to the owner unless a teacher shares with a class.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const COLORS = ["blue", "violet", "aqua", "amber", "rose", "emerald", "orange", "slate"] as const;
export type SpaceColor = (typeof COLORS)[number];

/** Gradient stops (dark → light) and the glow for each colour. White text sits on `a`/`b`. */
export const PALETTE: Record<SpaceColor, { a: string; b: string; c: string; glow: string; label: string }> = {
  blue: { a: "#1e40af", b: "#2563eb", c: "#7dd3fc", glow: "59 130 246", label: "Blue" },
  violet: { a: "#4c1d95", b: "#7c3aed", c: "#d8b4fe", glow: "139 92 246", label: "Violet" },
  aqua: { a: "#155e75", b: "#0891b2", c: "#67e8f9", glow: "6 182 212", label: "Aqua" },
  amber: { a: "#78350f", b: "#c2410c", c: "#fcd34d", glow: "245 158 11", label: "Amber" },
  rose: { a: "#881337", b: "#e11d48", c: "#fda4af", glow: "244 63 94", label: "Rose" },
  emerald: { a: "#064e3b", b: "#059669", c: "#6ee7b7", glow: "16 185 129", label: "Emerald" },
  orange: { a: "#7c2d12", b: "#ea580c", c: "#fdba74", glow: "249 115 22", label: "Orange" },
  slate: { a: "#1e293b", b: "#475569", c: "#cbd5e1", glow: "148 163 184", label: "Slate" },
};
export const colorOf = (c: unknown): SpaceColor => ((COLORS as readonly string[]).includes(c as string) ? (c as SpaceColor) : "blue");
/** CSS variables an orb or cover reads */
export const paletteVars = (c: SpaceColor) => {
  const p = PALETTE[c];
  return { "--sp-a": p.a, "--sp-b": p.b, "--sp-c": p.c, "--sp-glow": p.glow } as CSSProperties;
};

export type Visibility = "private" | "classes";
export type Knowledge = { id: string; name: string; chars: number; text: string };
export type Gem = {
  id: string;
  owner_id: string;
  kind: "assistant" | "character";
  name: string;
  tagline: string;
  emoji: string;
  color: SpaceColor;
  instructions: string;
  starters: string[];
  knowledge: Knowledge[];
  world_id: string | null;
  visibility: Visibility;
  class_ids: string[];
  uses: number;
  updated_at: string;
};
export type GemDraft = Pick<Gem, "kind" | "name" | "tagline" | "emoji" | "color" | "instructions" | "starters" | "knowledge" | "visibility" | "class_ids"> & { id?: string; world_id?: string | null };

export type World = {
  id: string;
  owner_id: string;
  title: string;
  subject: string;
  description: string;
  emoji: string;
  color: SpaceColor;
  visibility: Visibility;
  class_ids: string[];
  guide_gem_id: string | null;
  updated_at: string;
  counts?: { items: number; scenes: number };
};
export type WorldDraft = Pick<World, "title" | "subject" | "description" | "emoji" | "color" | "visibility" | "class_ids"> & { id?: string; guide_gem_id?: string | null };

export type ItemKind = "note" | "file" | "link" | "flashcards" | "task";
export type Card = { front: string; back: string };
export type WorldItem = {
  id: string;
  world_id: string;
  owner_id: string;
  kind: ItemKind;
  title: string;
  content: string;
  /** file: {path, mime, size}; link: {url}; flashcards: {cards}; task: {taskId, classId, due} */
  data: Row;
  position: number;
  updated_at: string;
};

export type Character = { name: string; emoji: string; persona: string };
export type Scene = {
  id: string;
  world_id: string;
  owner_id: string;
  title: string;
  setting: string;
  role: string;
  characters: Character[];
  goals: string[];
  position: number;
};
export type SceneDraft = Omit<Scene, "id" | "world_id" | "owner_id" | "position"> & { id?: string; position?: number };

/* ---------- rows ---------- */

const GEM_COLS = "id, owner_id, kind, name, tagline, emoji, color, instructions, starters, knowledge, world_id, visibility, class_ids, uses, updated_at";
const WORLD_COLS = "id, owner_id, title, subject, description, emoji, color, visibility, class_ids, guide_gem_id, updated_at";

const toGem = (r: Row): Gem => ({
  id: r.id, owner_id: r.owner_id, kind: r.kind === "character" ? "character" : "assistant", name: r.name, tagline: r.tagline ?? "", emoji: r.emoji || "✨",
  color: colorOf(r.color), instructions: r.instructions ?? "", starters: Array.isArray(r.starters) ? r.starters : [], knowledge: Array.isArray(r.knowledge) ? r.knowledge : [],
  world_id: r.world_id ?? null, visibility: r.visibility === "classes" ? "classes" : "private", class_ids: r.class_ids ?? [], uses: r.uses ?? 0, updated_at: r.updated_at,
});
const toWorld = (r: Row): World => ({
  id: r.id, owner_id: r.owner_id, title: r.title, subject: r.subject ?? "", description: r.description ?? "", emoji: r.emoji || "🌍", color: colorOf(r.color),
  visibility: r.visibility === "classes" ? "classes" : "private", class_ids: r.class_ids ?? [], guide_gem_id: r.guide_gem_id ?? null, updated_at: r.updated_at,
  counts: r.world_items || r.world_scenes ? { items: r.world_items?.[0]?.count ?? 0, scenes: r.world_scenes?.[0]?.count ?? 0 } : undefined,
});
const toScene = (r: Row): Scene => ({
  id: r.id, world_id: r.world_id, owner_id: r.owner_id, title: r.title, setting: r.setting ?? "", role: r.role ?? "",
  characters: Array.isArray(r.characters) ? r.characters : [], goals: r.goals ?? [], position: r.position ?? 0,
});

const fail = (e: unknown): never => { throw e instanceof Error ? e : new Error((e as { message?: string })?.message || "Something went wrong"); };

/* ---------- Gems ---------- */

/** Every Gem this person can use (their own and ones shared with their classes), not World guides. */
export async function listGems(): Promise<Gem[]> {
  const { data, error } = await db.from("gems").select(GEM_COLS).is("world_id", null).order("updated_at", { ascending: false }).limit(200);
  if (error) fail(error);
  return ((data ?? []) as Row[]).map(toGem);
}

export async function getGem(id: string): Promise<Gem | null> {
  const { data, error } = await db.from("gems").select(GEM_COLS).eq("id", id).maybeSingle();
  if (error) fail(error);
  return data ? toGem(data) : null;
}

export async function saveGem(ownerId: string, g: GemDraft): Promise<Gem> {
  const row = {
    kind: g.kind, name: g.name.trim().slice(0, 60) || "My Gem", tagline: g.tagline.trim().slice(0, 160) || null, emoji: g.emoji || "✨", color: g.color,
    instructions: g.instructions.slice(0, 8000), starters: g.starters.map((s) => s.trim()).filter(Boolean).slice(0, 6), knowledge: g.knowledge,
    visibility: g.visibility === "classes" && g.class_ids.length ? "classes" : "private", class_ids: g.visibility === "classes" ? g.class_ids : [],
    ...(g.world_id !== undefined ? { world_id: g.world_id } : {}),
  };
  const q = g.id ? db.from("gems").update(row).eq("id", g.id) : db.from("gems").insert({ ...row, owner_id: ownerId });
  const { data, error } = await q.select(GEM_COLS).single();
  if (error) fail(error);
  return toGem(data);
}

export async function deleteGem(id: string) {
  const { error } = await db.from("gems").delete().eq("id", id);
  if (error) fail(error);
}

/** A file's text, kept with the Gem so it can answer from it. */
export const KNOWLEDGE_FILE_CHARS = 100_000;
export const KNOWLEDGE_TOTAL_CHARS = 400_000;
export async function readKnowledge(file: File, onStatus?: (s: string) => void): Promise<Knowledge> {
  const { text } = await extractFile(file, null, onStatus);
  if (!text.trim()) throw new Error(`Couldn't find any text in ${file.name}.`);
  const t = text.slice(0, KNOWLEDGE_FILE_CHARS);
  return { id: crypto.randomUUID(), name: file.name.slice(0, 120), chars: t.length, text: t };
}

/* ---------- Worlds ---------- */

export async function listWorlds(): Promise<World[]> {
  const { data, error } = await db.from("worlds").select(`${WORLD_COLS}, world_items(count), world_scenes(count)`).order("updated_at", { ascending: false }).limit(100);
  if (error) fail(error);
  return ((data ?? []) as Row[]).map(toWorld);
}

export type WorldBundle = { world: World; items: WorldItem[]; scenes: Scene[]; guide: Gem | null };
export async function getWorld(id: string): Promise<WorldBundle | null> {
  const { data: w, error } = await db.from("worlds").select(WORLD_COLS).eq("id", id).maybeSingle();
  if (error) fail(error);
  if (!w) return null;
  const [{ data: items }, { data: scenes }, guide] = await Promise.all([
    db.from("world_items").select("id, world_id, owner_id, kind, title, content, data, position, updated_at").eq("world_id", id).order("position").order("created_at"),
    db.from("world_scenes").select("id, world_id, owner_id, title, setting, role, characters, goals, position").eq("world_id", id).order("position").order("created_at"),
    w.guide_gem_id ? getGem(w.guide_gem_id).catch(() => null) : Promise.resolve(null),
  ]);
  return { world: toWorld(w), items: (items ?? []) as WorldItem[], scenes: ((scenes ?? []) as Row[]).map(toScene), guide };
}

export async function saveWorld(ownerId: string, w: WorldDraft): Promise<World> {
  const row = {
    title: w.title.trim().slice(0, 120) || "Untitled World", subject: w.subject.trim().slice(0, 60) || null, description: w.description.trim().slice(0, 4000) || null,
    emoji: w.emoji || "🌍", color: w.color, visibility: w.visibility === "classes" && w.class_ids.length ? "classes" : "private", class_ids: w.visibility === "classes" ? w.class_ids : [],
    ...(w.guide_gem_id !== undefined ? { guide_gem_id: w.guide_gem_id } : {}),
  };
  const q = w.id ? db.from("worlds").update(row).eq("id", w.id) : db.from("worlds").insert({ ...row, owner_id: ownerId });
  const { data, error } = await q.select(WORLD_COLS).single();
  if (error) fail(error);
  return toWorld(data);
}

export async function deleteWorld(id: string) {
  // Its files first (items, scenes and its guide go with the World)
  const { data: files } = await supabase.storage.from("world-files").list(id, { limit: 1000 });
  if (files?.length) await supabase.storage.from("world-files").remove(files.map((f) => `${id}/${f.name}`));
  const { error } = await db.from("worlds").delete().eq("id", id);
  if (error) fail(error);
}

export async function addItem(ownerId: string, worldId: string, item: { kind: ItemKind; title: string; content?: string; data?: Row; position?: number }): Promise<WorldItem> {
  const { data, error } = await db.from("world_items").insert({
    world_id: worldId, owner_id: ownerId, kind: item.kind, title: item.title.trim().slice(0, 200) || "Untitled",
    content: (item.content ?? "").slice(0, 200_000), data: item.data ?? {}, position: item.position ?? Math.floor(Date.now() / 1000),
  }).select("id, world_id, owner_id, kind, title, content, data, position, updated_at").single();
  if (error) fail(error);
  return data as WorldItem;
}

export async function updateItem(id: string, patch: Partial<Pick<WorldItem, "title" | "content" | "data" | "position">>) {
  const { error } = await db.from("world_items").update(patch).eq("id", id);
  if (error) fail(error);
}

export async function deleteItem(item: WorldItem) {
  if (item.kind === "file" && item.data?.path) await supabase.storage.from("world-files").remove([item.data.path]);
  const { error } = await db.from("world_items").delete().eq("id", item.id);
  if (error) fail(error);
}

export async function saveScene(ownerId: string, worldId: string, s: SceneDraft): Promise<Scene> {
  const row = {
    title: s.title.trim().slice(0, 160) || "A scene", setting: s.setting.slice(0, 4000), role: s.role.slice(0, 600),
    characters: s.characters.filter((c) => c.name.trim()).slice(0, 4).map((c) => ({ name: c.name.trim().slice(0, 60), emoji: c.emoji || "🎭", persona: c.persona.slice(0, 1200) })),
    goals: s.goals.map((g) => g.trim()).filter(Boolean).slice(0, 6), ...(s.position !== undefined ? { position: s.position } : {}),
  };
  const q = s.id ? db.from("world_scenes").update(row).eq("id", s.id) : db.from("world_scenes").insert({ ...row, world_id: worldId, owner_id: ownerId });
  const { data, error } = await q.select("id, world_id, owner_id, title, setting, role, characters, goals, position").single();
  if (error) fail(error);
  return toScene(data);
}

export async function deleteScene(id: string) {
  const { error } = await db.from("world_scenes").delete().eq("id", id);
  if (error) fail(error);
}

/** Upload a file into a World; its text (when readable) lets the guide answer from it. */
export async function addWorldFile(ownerId: string, worldId: string, file: File, onStatus?: (s: string) => void): Promise<WorldItem> {
  if (file.size > 50 * 1024 * 1024) throw new Error(`${file.name} is over 50 MB.`);
  const safe = file.name.replace(/[^\w.\- ]+/g, "_").slice(-100);
  const path = `${worldId}/${crypto.randomUUID()}-${safe}`;
  onStatus?.("Uploading");
  const { error } = await supabase.storage.from("world-files").upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) fail(error);
  let text = "";
  try {
    onStatus?.("Reading");
    text = (await extractFile(file, null, onStatus)).text.slice(0, 150_000);
  } catch { /* stored, just not readable by the guide */ }
  return addItem(ownerId, worldId, { kind: "file", title: file.name, content: text, data: { path, mime: file.type, size: file.size } });
}

export async function worldFileUrl(path: string) {
  const { data, error } = await supabase.storage.from("world-files").createSignedUrl(path, 3600);
  if (error) fail(error);
  return data!.signedUrl;
}

/* ---------- AI (refyn-spaces) ---------- */

async function spaces<T>(action: string, body: Row): Promise<T> {
  const { data, error } = await supabase.functions.invoke("refyn-spaces", { body: { action, ...body } });
  if (error) {
    let msg = "Refyn couldn't do that just now. Try again.";
    try {
      const j = await (error as { context?: Response }).context?.json();
      if (j?.error) msg = j.error;
    } catch { /* keep the default */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export type GemShape = Pick<Gem, "name" | "tagline" | "emoji" | "color" | "instructions" | "starters">;
export const draftGem = (idea: string, kind: Gem["kind"]) => spaces<{ gem: GemShape }>("draft_gem", { idea, kind }).then((r) => ({ ...r.gem, color: colorOf(r.gem.color) }));
export const draftScene = (world: Pick<World, "title" | "subject" | "description">, idea: string) =>
  spaces<{ scene: SceneDraft }>("draft_scene", { world, idea }).then((r) => r.scene);

type BuiltWorld = { description: string; emoji: string; color: SpaceColor; guide: GemShape; notes: { title: string; content: string }[]; flashcards: Card[]; scenes: SceneDraft[] };

export type BuildStep = "design" | "world" | "guide" | "notes" | "cards" | "scenes" | "done";
/** Build a World with AI: the plan, then the World, its guide, notes, flashcards and scenes. */
export async function buildWorld(
  ownerId: string,
  input: { title: string; subject: string; level?: string; description: string; visibility: Visibility; class_ids: string[] },
  onStep: (s: BuildStep) => void,
): Promise<string> {
  onStep("design");
  const { world: plan } = await spaces<{ world: BuiltWorld }>("build_world", { title: input.title, subject: input.subject, level: input.level, description: input.description });
  onStep("world");
  const world = await saveWorld(ownerId, {
    title: input.title, subject: input.subject, description: plan.description || input.description, emoji: plan.emoji, color: colorOf(plan.color),
    visibility: input.visibility, class_ids: input.class_ids,
  });
  onStep("guide");
  const guide = await saveGem(ownerId, { ...plan.guide, color: colorOf(plan.guide.color), kind: "assistant", knowledge: [], visibility: "private", class_ids: [], world_id: world.id });
  await saveWorld(ownerId, { ...world, guide_gem_id: guide.id });
  onStep("notes");
  let pos = 0;
  for (const n of plan.notes) await addItem(ownerId, world.id, { kind: "note", title: n.title, content: n.content, position: pos++ });
  onStep("cards");
  if (plan.flashcards.length) await addItem(ownerId, world.id, { kind: "flashcards", title: "Key ideas", data: { cards: plan.flashcards }, position: pos++ });
  onStep("scenes");
  for (const [i, s] of plan.scenes.entries()) await saveScene(ownerId, world.id, { ...s, position: i });
  onStep("done");
  return world.id;
}

export const fetchConcepts = (items: { key: string; hash: string; text: string }[]) =>
  spaces<{ concepts: Record<string, string[]>; pending: number }>("concepts", { items });

/** Short, stable content hash (FNV-1a), so unchanged items aren't re-read. */
export const hashText = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + "-" + s.length.toString(36);
};

/* ---------- starters ---------- */

export type GemTemplate = GemShape & { kind: Gem["kind"]; for: "student" | "teacher" | "all" };

export const GEM_TEMPLATES: GemTemplate[] = [
  {
    for: "student", kind: "assistant", name: "Socratic Tutor", emoji: "🦉", color: "violet", tagline: "Answers with better questions until you get it yourself.",
    instructions: "You are a Socratic tutor for a secondary-school student. Never give the final answer first. Find out what the student already thinks, then ask one short, focused question at a time that moves them a step closer. If they are stuck after two tries, give a hint, then a worked example of a similar (not the same) problem. Praise specific reasoning, not just right answers. When they get there, ask them to explain the idea back in their own words and point out anything still shaky. Keep every message under 120 words. Start by asking what they're working on and what they've tried.",
    starters: ["I don't get why this works", "Help me think through this question", "Check my reasoning", "I'm stuck on my homework"],
  },
  {
    for: "student", kind: "assistant", name: "Quiz Master", emoji: "🎯", color: "amber", tagline: "Quick quizzes at the right level, with every miss explained.",
    instructions: "You are an upbeat quiz master. Ask what topic and level the student wants, then quiz them one question at a time, mixing recall, application and one harder 'stretch' question every few turns. After each answer: say whether it's right, explain why in two or three sentences, and adjust the difficulty (harder after two right, easier after a miss). Keep score and give a short summary every 5 questions with the ideas to review. When asked, make a QUIZ or FLASHCARDS block for practice. Never shame mistakes.",
    starters: ["Quiz me on cell biology", "10 quick questions on algebra", "Test me before my exam", "Harder questions please"],
  },
  {
    for: "student", kind: "assistant", name: "Essay Coach", emoji: "✍️", color: "rose", tagline: "Criterion-by-criterion feedback on your drafts. Never writes them.",
    instructions: "You are a writing coach who helps a student improve their own essays and reports. You never write or rewrite paragraphs for them. Ask for the task and criteria if they haven't shared them. Give feedback in this order: one genuine strength with a quote, the two most important things to improve (each with a quote from their draft, why it matters, and a question or tip to fix it themselves), then one small next step. Comment on structure, argument, evidence, analysis and language. If they ask you to write it, explain kindly that it has to be their work and offer a plan or a model of a different topic instead.",
    starters: ["Give me feedback on my draft", "Is my thesis strong enough?", "How do I analyse more deeply?", "Check my conclusion"],
  },
  {
    for: "student", kind: "assistant", name: "Concept Explainer", emoji: "💡", color: "aqua", tagline: "Any idea three ways: simple, visual and exam-ready.",
    instructions: "You explain ideas so they stick. For each concept give three layers: (1) the simple version in two sentences with an everyday analogy, (2) a visual: a diagram described in words, a table, or a GRAPH block when it's mathematical, (3) the exam-ready version with correct terms, a common mistake to avoid and one quick check question. Ask which layer they want deeper. Keep it accurate and say when something is a simplification.",
    starters: ["Explain osmosis", "What actually is a derivative?", "Explain supply and demand", "Make photosynthesis click"],
  },
  {
    for: "student", kind: "assistant", name: "Study Planner", emoji: "🗓️", color: "emerald", tagline: "Turns deadlines into a realistic plan, with breaks.",
    instructions: "You help a student plan their time. Ask for their deadlines, tests and how much time they really have each day. Build a realistic plan: hardest work when they're fresh, sessions of 25-45 minutes with breaks, spaced review before tests, and buffer days. Use a PLAN block so they can tick tasks off and add them to a calendar. Check in on how the last plan went and adjust without judgement. Keep advice short and practical.",
    starters: ["Plan my week", "I have 3 tests next week", "I keep procrastinating", "Make a revision timetable"],
  },
  {
    for: "student", kind: "assistant", name: "Debate Partner", emoji: "⚔️", color: "orange", tagline: "Argues the other side so you can sharpen your case.",
    instructions: "You are a respectful debate sparring partner. Ask for the motion and which side the student is on, then argue the opposite side well: one point at a time, with evidence and reasoning. After each of their replies, briefly score it on claim, evidence and rebuttal (out of 3 each) and suggest how to make it sharper. Every few turns, step out and name the strongest and weakest parts of their case. Keep it civil and factual; flag anything you're unsure about.",
    starters: ["Debate me: homework should be banned", "Argue against my essay's thesis", "Practise for a debate competition", "Find the holes in my argument"],
  },
  {
    for: "teacher", kind: "assistant", name: "Lesson Hook Designer", emoji: "🎣", color: "amber", tagline: "Five-minute openers that make a class lean in.",
    instructions: "You design lesson hooks for secondary classes. Ask for the topic, age group and what the lesson leads to. Offer three different hooks (e.g. a surprising demo or image, a provocative question, a short mystery or a quick game), each with what the teacher says and does, the materials, timing (under 7 minutes) and how it links to the lesson's main question. Make them practical in an ordinary classroom and inclusive.",
    starters: ["Hook for a lesson on fractions", "Opener for WW1 causes", "Make chemical bonding exciting", "A hook with no tech"],
  },
  {
    for: "teacher", kind: "assistant", name: "Differentiation Helper", emoji: "🧩", color: "aqua", tagline: "One task, adapted for support, core and stretch.",
    instructions: "You help teachers differentiate. Ask for the task or paste of the worksheet and the class profile. Return three versions: support (scaffolds, sentence starters, worked example, fewer steps), core, and stretch (more open, transfer or evaluation). Keep the same learning goal across all three. Add notes for students with EAL or attention needs, and how to group or check in. Write in a way the teacher can paste straight into a worksheet.",
    starters: ["Differentiate this worksheet", "Scaffolds for an essay task", "Stretch questions for top students", "Adapt this for EAL learners"],
  },
  {
    for: "teacher", kind: "assistant", name: "Rubric Writer", emoji: "📐", color: "violet", tagline: "Clear, student-friendly level descriptors for any task.",
    instructions: "You write task-specific rubrics. Ask for the task, subject, age group and criteria (MYP criteria A-D if the school uses them). For each criterion write clear descriptors for the bands 1-2, 3-4, 5-6 and 7-8, task-specific and in student-friendly language with 'I can...' statements, plus what evidence would show each band. Keep wording original rather than copying official documents. Offer a one-page student checklist version too.",
    starters: ["Rubric for a lab report", "Student-friendly criteria for an essay", "Clarify criterion B for this task", "Make a self-assessment checklist"],
  },
  {
    for: "teacher", kind: "assistant", name: "Parent Email Drafter", emoji: "✉️", color: "emerald", tagline: "Warm, clear emails to families in seconds.",
    instructions: "You draft emails from a teacher to parents or guardians. Ask for the purpose and the key facts. Write warmly and clearly, under 180 words: what is happening, what it means for the student, what the family can do, and how to reach the teacher. For concerns, lead with something positive and stay factual and kind. Never include information the teacher didn't give. Offer a shorter version and a version for a translated message.",
    starters: ["Missing homework email", "Celebrate a student's progress", "Upcoming trip reminder", "Concern about behaviour"],
  },
  {
    for: "teacher", kind: "assistant", name: "Exit Ticket Maker", emoji: "🎟️", color: "rose", tagline: "Three-question checks that show who's got it.",
    instructions: "You write exit tickets. Ask for the lesson's objective. Give three short questions: one recall, one application, one that reveals a common misconception, plus the model answers and what a wrong answer tells the teacher to do next lesson. Offer a QUIZ block version the teacher can run live.",
    starters: ["Exit ticket for today's lesson", "Check understanding of ratios", "Misconception check on forces", "A 2-minute plenary"],
  },
  {
    for: "teacher", kind: "assistant", name: "Feedback Phrasebank", emoji: "💬", color: "blue", tagline: "Specific, kind feedback comments, fast.",
    instructions: "You help teachers write feedback. Given a piece of student work or a description of it, write feedback with: one specific strength, one or two targets phrased as actions, and a question that makes the student think. Keep it under 80 words per student, specific to the work, and in a warm tone. When asked, produce a bank of reusable comments for common strengths and issues for a task.",
    starters: ["Feedback on this paragraph", "Comment bank for a lab report", "Targets for a weak essay", "Make this feedback kinder"],
  },
  {
    for: "all", kind: "character", name: "Marie Curie", emoji: "🔬", color: "aqua", tagline: "Talk radioactivity, persistence and science in 1900s Paris.",
    instructions: "You are Marie Curie (1867-1934), physicist and chemist, speaking around 1911 in Paris. You speak with warmth, precision and modesty, with a scientist's curiosity. You can discuss your childhood in Warsaw, studying at the Sorbonne, your work with Pierre on polonium and radium, the idea of radioactivity, the Nobel Prizes, and the barriers women faced in science. Keep facts accurate; if asked about events after your time, say you can't know them, or step out of character briefly to explain. Ask the student questions back about their own ideas. Stay in character, but step out in italics to correct a factual misunderstanding.",
    starters: ["What is radioactivity?", "Was it hard being a woman in science?", "How did you discover radium?", "What advice would you give me?"],
  },
  {
    for: "all", kind: "character", name: "Charles Darwin", emoji: "🐢", color: "emerald", tagline: "Debate natural selection with the naturalist himself.",
    instructions: "You are Charles Darwin, speaking around 1860, soon after publishing your book on the origin of species. You are thoughtful, careful and a little anxious about controversy. You can discuss the voyage of the Beagle, finches and tortoises of the Galapagos, variation, inheritance (as understood then: you don't know about genes), artificial selection, and the reactions to your work. Ask the student to reason from evidence. Stay in character, but step out in italics to correct a misunderstanding or to note what science learned later.",
    starters: ["How does natural selection work?", "What did you see in the Galapagos?", "Why were people angry with you?", "What about humans?"],
  },
];

export const EMOJI_CHOICES = ["✨", "🦉", "🎯", "✍️", "💡", "🗓️", "⚔️", "🧠", "🔬", "🧪", "🧬", "🌍", "📐", "📚", "🎭", "🎨", "🎵", "🏛️", "🚀", "🌋", "🌊", "🌱", "⚡", "🔭", "🧮", "💬", "🗺️", "🐢", "🦊", "🐉", "👑", "🪐"];
