import { supabase } from "@/integrations/supabase/client";
import { MYP, type Letter, type MypGroup } from "@/lib/myp";
import { fetchConcepts, hashText, type Scene, type WorldBundle, type WorldItem } from "./spaces";

// The Brain: everything a person has in Refyn as one network. Subjects,
// classes, tasks, marks and targets, chats and their files, Gems, Worlds and
// scenes are nodes; what contains or produced what are links; and AI-extracted
// concepts link items about the same idea, even across subjects.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export type NodeType = "me" | "subject" | "class" | "student" | "task" | "criterion" | "target" | "chat" | "file" | "gem" | "world" | "note" | "scene" | "character" | "concept";

export type BrainNode = {
  id: string;
  type: NodeType;
  label: string;
  /** Second line in the panel (class, date, level…) */
  sub?: string;
  href?: string;
  /** Longer text for the panel */
  detail?: string;
  /** Criterion letter, for its colour */
  letter?: Letter;
  /** Subject slot, for its colour */
  slot?: number;
};
export type BrainLink = { source: string; target: string; kind: "has" | "concept" | "about" | "mark" };
export type Graph = { nodes: BrainNode[]; links: BrainLink[] };

/** Text sent to the concept indexer, by node id */
export type Indexable = { key: string; text: string };

export const TYPE_META: Record<NodeType, { label: string; plural: string; dark: string; light: string; r: number; rank: number }> = {
  me: { label: "You", plural: "You", dark: "#f8fafc", light: "#0f172a", r: 13, rank: 100 },
  subject: { label: "Subject", plural: "Subjects", dark: "#60a5fa", light: "#2563eb", r: 10, rank: 90 },
  world: { label: "World", plural: "Worlds", dark: "#22d3ee", light: "#0e7490", r: 10, rank: 85 },
  class: { label: "Class", plural: "Classes", dark: "#3b82f6", light: "#1d4ed8", r: 8, rank: 80 },
  gem: { label: "Gem", plural: "Gems", dark: "#e879f9", light: "#a21caf", r: 7.5, rank: 75 },
  concept: { label: "Idea", plural: "Ideas", dark: "#fde68a", light: "#a16207", r: 4.5, rank: 60 },
  criterion: { label: "Criterion", plural: "Criteria", dark: "#3987e5", light: "#2a78d6", r: 6, rank: 55 },
  task: { label: "Task", plural: "Tasks", dark: "#f59e0b", light: "#b45309", r: 5.5, rank: 50 },
  scene: { label: "Scene", plural: "Scenes", dark: "#fb923c", light: "#c2410c", r: 5.5, rank: 48 },
  chat: { label: "Chat", plural: "Chats", dark: "#a78bfa", light: "#6d28d9", r: 4.5, rank: 40 },
  student: { label: "Student", plural: "Students", dark: "#93c5fd", light: "#3b82f6", r: 4, rank: 38 },
  note: { label: "Note", plural: "Notes & files", dark: "#5eead4", light: "#0f766e", r: 4, rank: 35 },
  target: { label: "Target", plural: "Targets", dark: "#fb7185", light: "#be123c", r: 3.5, rank: 30 },
  character: { label: "Character", plural: "Characters", dark: "#fdba74", light: "#c2410c", r: 3.5, rank: 25 },
  file: { label: "File", plural: "Chat files", dark: "#94a3b8", light: "#475569", r: 3.5, rank: 20 },
};
export const SUBJECT_COLORS = { dark: ["#60a5fa", "#f472b6", "#34d399", "#fbbf24", "#a78bfa", "#fb923c", "#22d3ee", "#f87171"], light: ["#2563eb", "#db2777", "#059669", "#b45309", "#7c3aed", "#c2410c", "#0e7490", "#dc2626"] };
export const CRIT = { dark: { A: "#3987e5", B: "#d95926", C: "#199e70", D: "#c98500" }, light: { A: "#2a78d6", B: "#eb6834", C: "#1baf7a", D: "#eda100" } } as const;

const CHAT_SUBJECT: Record<string, string> = { math: "Mathematics", science: "Sciences", writing: "Language and literature", languages: "Language acquisition" };
const ALIAS: Record<string, string> = { maths: "Mathematics", math: "Mathematics", mathematics: "Mathematics", science: "Sciences", sciences: "Sciences", biology: "Sciences", chemistry: "Sciences", physics: "Sciences", english: "Language and literature", history: "Individuals and societies", geography: "Individuals and societies", "individuals & societies": "Individuals and societies" };
const subjectName = (raw: unknown) => {
  const s = String(raw ?? "").trim();
  if (!s || s.toLowerCase() === "general") return null;
  return CHAT_SUBJECT[s.toLowerCase()] ?? ALIAS[s.toLowerCase()] ?? s.charAt(0).toUpperCase() + s.slice(1);
};
const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
/** What the concept indexer reads for an item (the same on every page, so its cache is shared) */
export const indexText = (...parts: unknown[]) => parts.map((p) => clip(p, 400)).filter(Boolean).join(". ").slice(0, 600);
const itemText = (it: Pick<WorldItem, "title" | "kind" | "data">, snippet: unknown) =>
  indexText(it.title, snippet, it.kind === "flashcards" ? (it.data?.cards ?? []).slice(0, 12).map((c: Row) => c.front).join("; ") : "");
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");

class Builder {
  nodes = new Map<string, BrainNode>();
  links: BrainLink[] = [];
  seen = new Set<string>();
  index: Indexable[] = [];
  subjects: string[] = [];
  add(n: BrainNode) { if (!this.nodes.has(n.id)) this.nodes.set(n.id, n); return n.id; }
  link(source: string, target: string, kind: BrainLink["kind"] = "has") {
    if (source === target || !this.nodes.has(source) || !this.nodes.has(target)) return;
    const k = source < target ? `${source}|${target}` : `${target}|${source}`;
    if (this.seen.has(k)) return;
    this.seen.add(k);
    this.links.push({ source, target, kind });
  }
  subject(raw: unknown): string | null {
    const name = subjectName(raw);
    if (!name) return null;
    const id = `subject:${name.toLowerCase()}`;
    if (!this.nodes.has(id)) {
      this.subjects.push(name);
      this.add({ id, type: "subject", label: name, slot: (this.subjects.length - 1) % 8 });
      this.link("me", id);
    }
    return id;
  }
  text(key: string, ...parts: unknown[]) { this.raw(key, indexText(...parts)); }
  raw(key: string, t: string) { if (t.length > 8) this.index.push({ key, text: t }); }
}

export type TeacherInput = { classes: Row[]; members: { class_id: string; student_id: string }[]; assignments: Row[]; students: Record<string, { name: string }> };

/** Everything this person has, as a graph (concepts come separately, see `linkConcepts`). */
export async function loadBrain(user: { id: string; name: string; teacher: boolean }, teacherData?: TeacherInput): Promise<Graph & { index: Indexable[] }> {
  const b = new Builder();
  b.add({ id: "me", type: "me", label: user.name || "You", sub: user.teacher ? "Your teaching" : "Your learning" });

  const [snips, gems, worlds, items, scenes, sessions] = await Promise.all([
    db.rpc("brain_snippets").then((r: { data: Row[] | null }) => r.data ?? [], () => []),
    db.from("gems").select("id, owner_id, name, tagline, emoji, kind, world_id, class_ids").order("updated_at", { ascending: false }).limit(150).then((r: { data: Row[] | null }) => r.data ?? []),
    db.from("worlds").select("id, owner_id, title, subject, description, emoji, class_ids").order("updated_at", { ascending: false }).limit(80).then((r: { data: Row[] | null }) => r.data ?? []),
    db.from("world_items").select("id, world_id, kind, title, data").order("position").limit(400).then((r: { data: WorldItem[] | null }) => r.data ?? []),
    db.from("world_scenes").select("id, world_id, title, setting, characters").limit(150).then((r: { data: Scene[] | null }) => r.data ?? []),
    db.from("ai_chat_sessions").select("id, title, subject, gem_id, world_id, scene_id, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(80).then((r: { data: Row[] | null }) => r.data ?? []),
  ]);
  const snip = new Map<string, Row>((snips as Row[]).map((s) => [s.key, s]));

  /* classes and tasks */
  let classes: Row[] = [];
  let tasks: Row[] = [];
  let subs: Row[] = [];
  if (user.teacher && teacherData) {
    classes = teacherData.classes;
    tasks = teacherData.assignments;
  } else {
    const { data: mem } = await db.from("class_members").select("class_id").eq("student_id", user.id);
    const ids = ((mem ?? []) as Row[]).map((m) => m.class_id);
    if (ids.length) {
      const [{ data: cls }, { data: asg }, { data: mine }] = await Promise.all([
        db.from("classes").select("id, name, subject").in("id", ids),
        db.from("class_assignments").select("id, title, class_id, subject, description, instructions, due_date").in("class_id", ids).order("due_date", { ascending: false }).limit(300),
        db.from("assignment_submissions").select("assignment_id, status, grade, max_grade, assessment, graded_at").eq("student_id", user.id),
      ]);
      classes = cls ?? [];
      tasks = asg ?? [];
      subs = mine ?? [];
    }
  }
  const classSubject = new Map<string, string | null>();
  for (const c of classes) {
    const id = b.add({ id: `class:${c.id}`, type: "class", label: c.name, sub: c.subject ?? undefined, href: `/class/${c.id}` });
    const s = b.subject(c.subject);
    classSubject.set(c.id, s);
    b.link(s ?? "me", id);
  }
  if (user.teacher && teacherData) {
    for (const m of teacherData.members.slice(0, 400)) {
      const st = teacherData.students[m.student_id];
      if (!st) continue;
      b.add({ id: `student:${m.student_id}`, type: "student", label: st.name, href: "/progress" });
      b.link(`class:${m.class_id}`, `student:${m.student_id}`);
    }
  }
  const subByTask = new Map(subs.map((s) => [s.assignment_id, s]));
  for (const t of tasks) {
    const sub = subByTask.get(t.id);
    const status = sub ? (sub.assessment || (sub.grade !== null && sub.grade !== undefined) ? "marked" : "handed in") : t.due_date && new Date(t.due_date) < new Date() ? "past due" : "to do";
    const id = b.add({ id: `task:${t.id}`, type: "task", label: t.title, sub: [day(t.due_date) && `Due ${day(t.due_date)}`, !user.teacher && status].filter(Boolean).join(" · "), href: `/task/${t.id}`, detail: clip(t.description || t.instructions, 280) });
    b.link(`class:${t.class_id}`, id);
    if (!b.nodes.has(`class:${t.class_id}`)) b.link(b.subject(t.subject) ?? "me", id);
    b.text(id, t.title, t.description, t.instructions);
    // Marks: the task links to each criterion it was marked on, and to its targets
    const a = sub?.assessment;
    if (a?.kind === "myp" && a.group in MYP) {
      const g = a.group as MypGroup;
      for (const l of (a.criteria ?? []) as Letter[]) {
        const lv = a.levels?.[l];
        if (typeof lv !== "number") continue;
        const cid = b.add({ id: `crit:${g}:${l}`, type: "criterion", label: `${l} · ${MYP[g].criteria[l].name}`, sub: MYP[g].name, letter: l, href: "/progress" });
        b.link(b.subject(MYP[g].name) ?? "me", cid);
        b.link(id, cid, "mark");
      }
      ((a.targets ?? []) as string[]).slice(0, 3).forEach((tg, i) => {
        const tid = b.add({ id: `target:${t.id}:${i}`, type: "target", label: clip(tg, 70), detail: clip(tg, 400), sub: `From "${clip(t.title, 50)}"`, href: `/task/${t.id}` });
        b.link(id, tid);
        b.text(tid, tg);
      });
    }
  }

  /* Worlds, their items, scenes and characters */
  for (const w of worlds as Row[]) {
    const id = b.add({ id: `world:${w.id}`, type: "world", label: `${w.emoji ?? "🌍"} ${w.title}`, sub: w.subject ?? undefined, href: `/world/${w.id}`, detail: clip(w.description, 280) });
    const s = b.subject(w.subject);
    const viaClass = (w.class_ids ?? []).find((c: string) => b.nodes.has(`class:${c}`));
    b.link(viaClass && w.owner_id !== user.id ? `class:${viaClass}` : s ?? "me", id);
    if (s && viaClass) b.link(s, id);
    b.text(id, w.title, w.description);
  }
  for (const it of items as WorldItem[]) {
    if (it.kind === "task" && it.data?.taskId) { b.link(`world:${it.world_id}`, `task:${it.data.taskId}`); continue; }
    const id = b.add({ id: `witem:${it.id}`, type: "note", label: it.title, sub: it.kind === "flashcards" ? `${it.data?.cards?.length ?? 0} flashcards` : it.kind === "file" ? "File" : it.kind === "link" ? "Link" : "Note", href: `/world/${it.world_id}?item=${it.id}` });
    b.link(`world:${it.world_id}`, id);
    const sn = snip.get(`witem:${it.id}`);
    b.raw(id, itemText(it, sn?.snippet));
  }
  for (const sc of scenes as Scene[]) {
    const id = b.add({ id: `scene:${sc.id}`, type: "scene", label: `🎭 ${sc.title}`, href: `/world/${sc.world_id}/scene/${sc.id}`, detail: clip(sc.setting, 280) });
    b.link(`world:${sc.world_id}`, id);
    b.text(id, sc.title, sc.setting);
    for (const c of (sc.characters ?? []).slice(0, 4)) {
      const cid = b.add({ id: `character:${sc.id}:${c.name}`, type: "character", label: `${c.emoji ?? ""} ${c.name}`.trim(), detail: clip(c.persona, 280), href: `/world/${sc.world_id}/scene/${sc.id}` });
      b.link(id, cid);
    }
  }

  /* Gems */
  for (const g of gems as Row[]) {
    const id = b.add({ id: `gem:${g.id}`, type: "gem", label: `${g.emoji ?? "✨"} ${g.name}`, sub: g.kind === "character" ? "Character" : g.world_id ? "World guide" : "Gem", href: `/gems/${g.id}`, detail: clip(g.tagline, 200) });
    if (g.world_id && b.nodes.has(`world:${g.world_id}`)) b.link(`world:${g.world_id}`, id);
    else {
      const viaClass = (g.class_ids ?? []).find((c: string) => b.nodes.has(`class:${c}`));
      b.link(viaClass && g.owner_id !== user.id ? `class:${viaClass}` : "me", id);
    }
    b.text(id, g.name, g.tagline);
  }

  /* Chats and their files */
  for (const s of sessions as Row[]) {
    const sn = snip.get(`chat:${s.id}`);
    const id = b.add({ id: `chat:${s.id}`, type: "chat", label: clip(s.title || "Chat", 70), sub: day(s.updated_at), href: s.gem_id ? `/gems/${s.gem_id}` : `/ai-learning-assistant?session=${s.id}`, detail: clip(sn?.snippet, 240) });
    const parent = s.scene_id && b.nodes.has(`scene:${s.scene_id}`) ? `scene:${s.scene_id}` : s.gem_id && b.nodes.has(`gem:${s.gem_id}`) ? `gem:${s.gem_id}` : s.world_id && b.nodes.has(`world:${s.world_id}`) ? `world:${s.world_id}` : b.subject(s.subject) ?? "me";
    b.link(parent, id);
    b.text(id, s.title, sn?.snippet);
  }
  for (const f of (snips as Row[]).filter((x) => String(x.key).startsWith("file:"))) {
    if (!b.nodes.has(f.parent)) continue;
    const id = b.add({ id: f.key, type: "file", label: clip(f.title, 60), sub: f.kind === "note" ? "Note in a chat" : "File in a chat", detail: clip(f.snippet, 240), href: b.nodes.get(f.parent)?.href });
    b.link(f.parent, id);
    b.text(id, f.title, f.snippet);
  }

  return { nodes: [...b.nodes.values()], links: b.links, index: b.index };
}

/**
 * Ask for the ideas in each item (cached server-side by content hash) and add
 * the ideas back as batches arrive (see `conceptLayer` for the nodes).
 */
export async function linkConcepts(index: Indexable[], onConcepts: (byItem: Record<string, string[]>, pending: number) => void, signal?: { cancelled: boolean }) {
  const items = index.map((i) => ({ key: i.key, hash: hashText(i.text), text: i.text }));
  for (let round = 0; round < 6 && !signal?.cancelled; round++) {
    const { concepts, pending } = await fetchConcepts(items);
    if (signal?.cancelled) return;
    onConcepts(concepts, pending);
    if (!pending) return;
  }
}

/** Concept nodes and links for ideas shared by at least `min` items. */
export function conceptLayer(byItem: Record<string, string[]>, present: Set<string>, min = 2): Graph {
  const members = new Map<string, string[]>();
  for (const [key, cs] of Object.entries(byItem)) {
    if (!present.has(key)) continue;
    for (const c of cs) members.set(c, [...(members.get(c) ?? []), key]);
  }
  const nodes: BrainNode[] = [];
  const links: BrainLink[] = [];
  for (const [c, keys] of members) {
    if (keys.length < min) continue;
    const id = `concept:${c}`;
    nodes.push({ id, type: "concept", label: c, sub: `In ${keys.length} items` });
    for (const k of keys) links.push({ source: k, target: id, kind: "concept" });
  }
  return { nodes, links };
}

/** One World as a small network: its notes, files, tasks, scenes, characters and guide. */
export function worldGraph({ world, items, scenes, guide }: WorldBundle): Graph & { index: Indexable[] } {
  const b = new Builder();
  b.add({ id: `world:${world.id}`, type: "world", label: `${world.emoji} ${world.title}`, sub: world.subject || undefined, detail: clip(world.description, 280) });
  b.text(`world:${world.id}`, world.title, world.description);
  if (guide) {
    b.add({ id: `gem:${guide.id}`, type: "gem", label: `${guide.emoji} ${guide.name}`, sub: "World guide", detail: clip(guide.tagline, 200) });
    b.link(`world:${world.id}`, `gem:${guide.id}`);
    b.text(`gem:${guide.id}`, guide.name, guide.tagline);
  }
  for (const it of items) {
    const id = it.kind === "task" ? `task:${it.data?.taskId}` : `witem:${it.id}`;
    b.add({ id, type: it.kind === "task" ? "task" : "note", label: it.title, sub: it.kind === "flashcards" ? `${it.data?.cards?.length ?? 0} flashcards` : it.kind === "task" ? "Task" : it.kind === "file" ? "File" : it.kind === "link" ? "Link" : "Note", href: it.kind === "task" ? `/task/${it.data?.taskId}` : `?tab=library&item=${it.id}` });
    b.link(`world:${world.id}`, id);
    if (it.kind !== "task") b.raw(id, itemText(it, it.content.slice(0, 400)));
  }
  for (const sc of scenes) {
    const id = `scene:${sc.id}`;
    b.add({ id, type: "scene", label: `🎭 ${sc.title}`, href: `/world/${world.id}/scene/${sc.id}`, detail: clip(sc.setting, 280) });
    b.link(`world:${world.id}`, id);
    b.text(id, sc.title, sc.setting);
    for (const c of sc.characters.slice(0, 4)) {
      const cid = b.add({ id: `character:${sc.id}:${c.name}`, type: "character", label: `${c.emoji ?? ""} ${c.name}`.trim(), detail: clip(c.persona, 280), href: `/world/${world.id}/scene/${sc.id}` });
      b.link(id, cid);
    }
  }
  return { nodes: [...b.nodes.values()], links: b.links, index: b.index };
}
