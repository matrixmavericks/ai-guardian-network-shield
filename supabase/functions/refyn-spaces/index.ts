// Gems, Worlds and the Brain: drafting a Gem from an idea, building a World
// from a description, drafting a role-play scene, and extracting the concepts
// that link a person's Refyn items in their Brain (cached by content hash).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FAST, GRADERS, admin, complete, cors, isStaff, json, list, pick, str, userFrom, type Loose } from "../_shared/grading.ts";

const COLORS = ["blue", "violet", "aqua", "amber", "rose", "emerald", "orange", "slate"] as const;
const SAFETY = `Everything is for school students aged 11-16 at an IB school: age-appropriate, kind and accurate. Never a romantic, violent-in-detail or otherwise unsuitable persona.`;
const STUDENT_GEM = `This Gem is for a student. It must help them learn and think for themselves, never do their assessed work for them: no writing essays, answers, lab reports or reflections they could hand in. It explains, questions, quizzes and gives feedback.`;

const cleanGem = (g: Loose) => ({
  name: str(g.name, 60) || "My Gem",
  tagline: str(g.tagline, 160),
  emoji: str(g.emoji, 8) || "✨",
  color: pick(g.color, COLORS, "blue"),
  instructions: String(g.instructions ?? "").trim().slice(0, 8000),
  starters: list<string>(g.starters, 6).map((s) => str(s, 200)).filter(Boolean),
});

const cleanScene = (s: Loose) => ({
  title: str(s.title, 160) || "A scene",
  setting: String(s.setting ?? "").trim().slice(0, 4000),
  role: str(s.role, 600),
  characters: list<Loose>(s.characters, 4).map((c) => ({ name: str(c.name, 60), emoji: str(c.emoji, 8) || "🎭", persona: String(c.persona ?? "").trim().slice(0, 1200) })).filter((c) => c.name),
  goals: list<string>(s.goals, 5).map((x) => str(x, 200)).filter(Boolean),
});

const SCENE_SHAPE = `{"title":"...","setting":"2-4 sentences: where and when, what is happening, the problem to solve","role":"who the student plays and what they want","characters":[{"name":"...","emoji":"one emoji","persona":"who they are, how they speak, what they know and want, what they'd push back on (2-4 sentences)"}],"goals":["3-4 learning goals the student shows by playing well, e.g. 'Explain why ...'"]}`;

// Concepts: short canonical names so the same idea across items gets the same string
const normConcept = (c: unknown) =>
  String(c ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 40);
const GENERIC = new Set(["homework", "task", "tasks", "chat", "notes", "note", "question", "questions", "assignment", "study", "learning", "school", "student", "teacher", "work", "lesson", "class", "test", "quiz", "revision", "help", "file", "document"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const userId = await userFrom(req);
  if (!userId) return json({ error: "Sign in required" }, 401);
  let body: Loose;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const action = String(body.action ?? "");
  try {
    const staff = await isStaff(userId);

    if (action === "draft_gem") {
      const idea = str(body.idea, 1500);
      if (!idea) return json({ error: "Describe the Gem you want." }, 400);
      const kind = body.kind === "character" ? "character" : "assistant";
      const system = `You design "Gems" for Refyn, a school learning platform: custom AI assistants with a clear purpose and personality. ${SAFETY}
${staff ? "The person is a teacher; the Gem may be for their own work or for their students (then it must teach, not do students' work)." : STUDENT_GEM}
${kind === "character" ? "This Gem is a CHARACTER for role-play (a historical figure, a scientist, a fictional person in a scenario). Instructions describe who they are, how they speak, what they know (accurately), and that they stay in character but step out to correct a factual misunderstanding." : ""}
Write instructions in the second person ("You are ..."), 120-300 words: purpose, personality and tone, how it helps (methods, steps), what it never does, how it starts a conversation. Starters are 4 short things a user would type first.
Return ONLY JSON: {"name":"2-4 words","tagline":"one line under 90 characters","emoji":"one emoji","color":"one of ${COLORS.join("|")}","instructions":"...","starters":["...","...","...","..."]}`;
      const { data } = await complete(userId, system, `The Gem: ${idea}`, { models: FAST, json: true });
      return json({ gem: cleanGem(data ?? {}) });
    }

    if (action === "draft_scene") {
      const w = (body.world ?? {}) as Loose;
      const idea = str(body.idea, 1200);
      const system = `You design role-play scenes for learning in Refyn. ${SAFETY} The scene is set in a World about "${str(w.title, 120)}"${w.subject ? ` (${str(w.subject, 60)})` : ""}. Make it historically and scientifically accurate (say where it is invented), playable in 10-15 turns, with real decisions for the student. Return ONLY JSON: ${SCENE_SHAPE}`;
      const { data } = await complete(userId, system, `World description: ${str(w.description, 1500)}\nScene idea: ${idea || "Pick the most useful scene for learning this topic."}`, { models: FAST, json: true });
      return json({ scene: cleanScene(data ?? {}) });
    }

    if (action === "build_world") {
      const title = str(body.title, 120);
      if (!title) return json({ error: "Give the World a title." }, 400);
      const system = `You build "Worlds" in Refyn: a learning space for one unit or topic. ${SAFETY}
${staff ? "The person is a teacher building it for their class." : "The person is a student building it for their own learning."} Level: ${str(body.level, 60) || "IB MYP (ages 11-16)"}.
Everything must be accurate. Notes are concise study notes in markdown (headings, lists, a small table where it helps), written so a student can learn from them. Flashcards are short fronts with precise backs. Scenes are role-play situations that make the student use the ideas (debates, interviews with historical figures or scientists, lab or field decisions, negotiations), each with 1-2 characters.
The guide is the World's own Gem: ${staff ? "it teaches and coaches students in this unit; it never does their assessed work" : STUDENT_GEM}
Return ONLY JSON:
{"description":"2-3 sentences","emoji":"one emoji","color":"one of ${COLORS.join("|")}",
 "guide":{"name":"2-4 words","tagline":"...","emoji":"...","instructions":"You are ... (120-250 words)","starters":["...","...","...","..."]},
 "notes":[{"title":"...","content":"markdown, 150-350 words"}] (3 notes),
 "flashcards":[{"front":"...","back":"..."}] (10-14 cards),
 "scenes":[${SCENE_SHAPE}] (2 scenes)}`;
      const { data } = await complete(userId, system, `Title: ${title}\nSubject: ${str(body.subject, 60)}\nWhat it should cover: ${str(body.description, 2500) || "the key ideas of this topic"}`, { models: GRADERS, effort: "low", json: true });
      const d = data ?? {};
      const guide = cleanGem((d.guide ?? {}) as Loose);
      return json({
        world: {
          description: str(d.description, 600), emoji: str(d.emoji, 8) || "🌍", color: pick(d.color, COLORS, "blue"),
          guide: { ...guide, color: pick((d.guide as Loose)?.color ?? d.color, COLORS, "blue") },
          notes: list<Loose>(d.notes, 5).map((n) => ({ title: str(n.title, 200), content: String(n.content ?? "").trim().slice(0, 20000) })).filter((n) => n.title && n.content),
          flashcards: list<Loose>(d.flashcards, 30).map((c) => ({ front: str(c.front, 300), back: str(c.back, 600) })).filter((c) => c.front && c.back),
          scenes: list<Loose>(d.scenes, 4).map(cleanScene),
        },
      });
    }

    if (action === "concepts") {
      const items = list<Loose>(body.items, 200)
        .map((i) => ({ key: str(i.key, 120), hash: str(i.hash, 64), text: str(i.text, 600) }))
        .filter((i) => i.key && i.hash && i.text);
      const db = admin();
      const { data: cached } = await db.from("brain_concepts").select("item_key, hash, concepts").eq("user_id", userId);
      const have = new Map(((cached ?? []) as { item_key: string; hash: string; concepts: string[] }[]).map((c) => [c.item_key, c]));
      const todo = items.filter((i) => have.get(i.key)?.hash !== i.hash).slice(0, 80);
      // Reuse the names already in this person's Brain so items connect
      const vocabulary = [...new Set([...have.values()].flatMap((c) => c.concepts))].slice(0, 200);
      for (let i = 0; i < todo.length; i += 40) {
        const batch = todo.slice(i, i + 40);
        const system = `You index a student's or teacher's learning items into concepts for a knowledge graph. For each item return 2-5 concepts: the specific subject ideas it is about (e.g. "osmosis", "water potential", "persuasive techniques", "world war one causes", "quadratic equations"), never generic words (homework, task, notes, chat, revision). Concepts are lowercase, 1-3 words, singular, canonical: the same idea must get exactly the same name across items${vocabulary.length ? `; reuse these existing names when they fit: ${vocabulary.join(", ")}` : ""}. Return ONLY JSON: {"items":{"<key>":["concept","concept"]}}`;
        const user = batch.map((b) => `${b.key}: ${b.text}`).join("\n");
        const { data } = await complete(userId, system, user, { models: FAST, json: true });
        const out = ((data?.items ?? {}) as Record<string, unknown>);
        const rows = batch.map((b) => {
          const concepts = [...new Set(list<string>(out[b.key], 6).map(normConcept).filter((c) => c.length > 1 && !GENERIC.has(c)))].slice(0, 5);
          have.set(b.key, { item_key: b.key, hash: b.hash, concepts });
          return { user_id: userId, item_key: b.key, hash: b.hash, concepts, updated_at: new Date().toISOString() };
        });
        if (rows.length) await db.from("brain_concepts").upsert(rows, { onConflict: "user_id,item_key" });
      }
      return json({ concepts: Object.fromEntries(items.map((i) => [i.key, have.get(i.key)?.concepts ?? []])), pending: Math.max(0, items.filter((i) => have.get(i.key)?.hash !== i.hash).length) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    console.error("refyn-spaces", action, e);
    return json({ error: (e as Error).message || "Something went wrong" }, status);
  }
});
