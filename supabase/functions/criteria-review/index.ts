// Criterion-based review of MYP work: the student assessment coach and the
// teacher marking copilot.
//
// actions:
//   review  { text, group, year, criterion, task, audience }  → one criterion judged like a teacher-examiner
//   tsc     { group, year, criteria, task }                    → task-specific clarifications (teachers)
//   summary { group, criteria, students }                       → class insights from many results (teachers)
//   ask     { question, history, text, digest, focus? }        → tutor answer (explains, never writes the work)
// Work text keeps "## Page N" markers so feedback can point to pages.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GRADERS, FAST, INTEGRITY_RULE, admin, annotations, complete, cors, isStaff, json, list, page, pick, quote, str, userFrom, type Loose } from "../_shared/grading.ts";
import { MYP, criterionBrief, type Letter, type MypGroup } from "../_shared/myp.ts";

const MAX_TEXT = 140_000;
const DAILY_STUDENT_REVIEWS = 15;
const DAILY_TEACHER_ITEMS = 200;
const LETTERS = ["A", "B", "C", "D"] as const;

const groupOf = (v: unknown): MypGroup | null => (typeof v === "string" && v in MYP ? (v as MypGroup) : null);
const taskBlock = (t: Loose | undefined) => {
  const task = t ?? {};
  const title = str(task.title, 200);
  const description = str(task.description, 6000);
  const tsc = str(task.tsc, 8000);
  return [
    title || description ? `THE TASK: ${title}${description ? `\n${description}` : ""}` : "The task sheet wasn't provided: infer the task from the work.",
    tsc ? `TASK-SPECIFIC CLARIFICATIONS (the teacher's descriptors for this task; use them as the level descriptors):\n${tsc}` : "",
  ].filter(Boolean).join("\n\n");
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const userId = await userFrom(req);
  if (!userId) return json({ error: "Sign in required" }, 401);

  let body: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const text = String(body.text ?? "").slice(0, MAX_TEXT).trim();
  const workBlock = `THE STUDENT'S WORK ("## Page N" lines mark page breaks; they are not part of the work):\n"""\n${text}\n"""`;

  try {
    /* ---------- one criterion ---------- */
    if (body.action === "review") {
      const group = groupOf(body.group);
      const letter = pick(body.criterion, LETTERS, "A") as Letter;
      if (!group || text.length < 150) return json({ error: "Add the work and choose its subject group." }, 400);
      const teacher = body.audience === "teacher";
      if (teacher && !(await isStaff(userId))) return json({ error: "Only teachers can use the marking copilot." }, 403);
      // Fair use
      const since = new Date(Date.now() - 24 * 3600e3).toISOString();
      const table = teacher ? "marking_items" : "task_reviews";
      const owner = teacher ? "teacher_id" : "user_id";
      const { count } = await admin().from(table).select("id", { count: "exact", head: true }).eq(owner, userId).gte("created_at", since);
      const cap = teacher ? DAILY_TEACHER_ITEMS : DAILY_STUDENT_REVIEWS;
      if ((count ?? 0) > cap) return json({ error: teacher ? `You've pre-marked ${cap} pieces of work today. Try again tomorrow.` : `You've reviewed ${cap} pieces of work today. Make your changes and come back tomorrow.` }, 429);

      const c = MYP[group].criteria[letter];
      const strands = c.strands ?? [c.focus];
      const system = `You are an experienced IB MYP ${MYP[group].name} teacher and moderator ${teacher ? "pre-marking a student's work for their teacher, who will moderate your judgement" : "giving a student detailed formative feedback on a draft"}. Judge ONLY criterion ${letter} (${c.name}).

${criterionBrief(group, letter, Number(body.year) || 5)}

${taskBlock(body.task)}

${INTEGRITY_RULE}

Method (in order):
1. Find everything in the work relevant to this criterion. Judge only what is written.
2. For each strand listed, decide the level of demand the work reaches (none / limited / adequate / substantial / excellent, i.e. the 1–2 / 3–4 / 5–6 / 7–8 pattern) with a short reason and the exact words that show it.
3. Decide the criterion level by best fit across the strands (each strand counts equally). If task-specific clarifications are given, use them as the descriptors. If the task doesn't assess a strand, say so and leave it out of the judgement.
4. Upper mark of a band if the work largely meets it, lower if only just ("weak": true). Don't be generous.
5. Annotate the work like a teacher marking it: 3 to 10 notes on specific passages (strength, weakness, missing with the nearest passage or an empty quote, or suggestion), each tied to a strand and with a concrete fix.

Quotes must be copied exactly from the work, 5–40 words, from one place (never across a "## Page" line). Never invent quotes. ${teacher ? "Write the notes for the teacher, and the studentComment for the student." : "Talk to the student as \"you\", warmly and honestly."} British spelling.

Reply with JSON only:
{"level": 0-8, "weak": true|false, "confidence": "low"|"medium"|"high",
 "summary": "2-3 sentences on where this criterion stands and the main thing holding it back",
 "whyThisLevel": "...", "whyNotHigher": "what the next level needs that isn't there (empty at 8)", "whyNotLower": "(empty at 0-1)",
 "strands": [{"strand": "i|ii|iii|iv|v or 'focus'", "demand": "none"|"limited"|"adequate"|"substantial"|"excellent"|"not assessed", "comment": "...", "quote": "exact words or empty", "page": n|null}],
 "annotations": [{"quote": "exact words or empty", "page": n|null, "type": "strength"|"weakness"|"missing"|"suggestion", "descriptor": "the strand or descriptor words this relates to", "comment": "...", "fix": "what to do (without writing it)"}],
 "nextBand": {"band": "e.g. 7-8", "steps": ["specific, ordered actions"]},
 "topBand": "what 7-8 work on this criterion looks like for this task, described in general terms",
 "questions": ["2-3 questions that help the student improve it themselves"]${teacher ? `,
 "studentComment": "3-4 sentences of feedback to the student on this criterion: one specific strength, one specific next step, encouraging and in plain English"` : ""}}`;
      const { data, model } = await complete(userId, system, workBlock, { models: GRADERS, effort: teacher ? "low" : "medium", json: true });
      const o = data ?? {};
      const level = Math.max(0, Math.min(8, Math.round(Number(o.level) || 0)));
      const nb = (o.nextBand ?? {}) as Loose;
      return json({
        criterion: letter,
        level,
        weak: o.weak === true,
        confidence: pick(o.confidence, ["low", "medium", "high"] as const, "medium"),
        summary: str(o.summary, 900),
        whyThisLevel: str(o.whyThisLevel, 900),
        whyNotHigher: str(o.whyNotHigher, 900),
        whyNotLower: str(o.whyNotLower, 700),
        strands: list<Loose>(o.strands, 6).map((s, i) => ({ strand: str(s.strand, 8) || "ivx".split("")[i] || "", text: strands[i] ?? "", demand: pick(s.demand, ["none", "limited", "adequate", "substantial", "excellent", "not assessed"] as const, "adequate"), comment: str(s.comment, 400), quote: quote(s.quote), page: page(s.page) })),
        annotations: annotations(o.annotations, 10),
        nextBand: { band: str(nb.band, 10), steps: list<unknown>(nb.steps, 6).map((s) => str(s, 300)).filter(Boolean) },
        topBand: str(o.topBand, 900),
        questions: list<unknown>(o.questions, 3).map((q) => str(q, 300)).filter(Boolean),
        studentComment: teacher ? str(o.studentComment, 1200) : undefined,
        model,
      });
    }

    /* ---------- task-specific clarifications ---------- */
    if (body.action === "tsc") {
      const group = groupOf(body.group);
      if (!group) return json({ error: "Choose a subject group." }, 400);
      if (!(await isStaff(userId))) return json({ error: "Only teachers can do this." }, 403);
      const letters = list<string>(body.criteria, 4).filter((l) => LETTERS.includes(l as Letter)) as Letter[];
      const system = `You are an experienced IB MYP ${MYP[group].name} teacher writing task-specific clarifications: for each criterion assessed, rewrite each band (1–2, 3–4, 5–6, 7–8) for THIS task, in student-friendly language, keeping the IB command-term progression and covering every strand. Don't copy the IB's generic descriptors word for word; make them concrete for the task.

${letters.map((l) => criterionBrief(group, l, Number(body.year) || 5)).join("\n\n")}

${taskBlock(body.task)}

Reply with JSON only: {"clarifications": {"A": {"1-2": "...", "3-4": "...", "5-6": "...", "7-8": "..."}, ...only the criteria assessed}}`;
      const { data } = await complete(userId, system, "Write the task-specific clarifications.", { models: GRADERS, effort: "low", json: true });
      const out: Record<string, Record<string, string>> = {};
      const cl = ((data ?? {}).clarifications ?? {}) as Record<string, Loose>;
      for (const l of letters) {
        const b = cl[l] ?? {};
        out[l] = { "1-2": str(b["1-2"], 600), "3-4": str(b["3-4"], 600), "5-6": str(b["5-6"], 600), "7-8": str(b["7-8"], 600) };
      }
      return json({ clarifications: out });
    }

    /* ---------- class insights ---------- */
    if (body.action === "summary") {
      const group = groupOf(body.group);
      if (!group) return json({ error: "Choose a subject group." }, 400);
      if (!(await isStaff(userId))) return json({ error: "Only teachers can do this." }, 403);
      const students = list<Loose>(body.students, 60).map((s) => ({ name: str(s.name, 80), levels: s.levels, notes: str(s.notes, 1200) }));
      const system = `You are an experienced IB MYP ${MYP[group].name} teacher and head of department. From the per-student criterion levels and teacher notes below, write class-level insights to plan the next lessons. Criteria: ${list<string>(body.criteria, 4).map((l) => `${l} ${MYP[group].criteria[l as Letter]?.name ?? ""}`).join("; ")}.

Reply with JSON only:
{"headline": "one sentence on how the class did",
 "strengths": ["2-3 things most students did well"],
 "misconceptions": [{"issue": "a common weakness or misconception", "criterion": "A|B|C|D", "students": ["names"]}],
 "reteach": [{"activity": "a specific 10-20 minute activity to address it", "criterion": "A|B|C|D"}],
 "groups": [{"label": "e.g. Needs a model of evaluation", "students": ["names"]}]}`;
      const { data } = await complete(userId, system, JSON.stringify(students).slice(0, 60_000), { models: GRADERS, effort: "low", json: true });
      const o = data ?? {};
      return json({
        headline: str(o.headline, 300),
        strengths: list<unknown>(o.strengths, 4).map((s) => str(s, 300)).filter(Boolean),
        misconceptions: list<Loose>(o.misconceptions, 6).map((m) => ({ issue: str(m.issue, 300), criterion: str(m.criterion, 2), students: list<unknown>(m.students, 40).map((n) => str(n, 80)) })).filter((m) => m.issue),
        reteach: list<Loose>(o.reteach, 5).map((r) => ({ activity: str(r.activity, 400), criterion: str(r.criterion, 2) })).filter((r) => r.activity),
        groups: list<Loose>(o.groups, 5).map((g) => ({ label: str(g.label, 120), students: list<unknown>(g.students, 40).map((n) => str(n, 80)) })).filter((g) => g.label),
      });
    }

    /* ---------- tutor ---------- */
    if (body.action === "ask") {
      const question = str(body.question, 2000);
      if (!question) return json({ error: "Ask a question." }, 400);
      const history = list<Loose>(body.history, 12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: str(m.content, 3000) }));
      const group = groupOf(body.group);
      const system = `You are Refyn, a friendly IB MYP tutor. The student has had criterion-based feedback on a piece of work and wants to understand it. Explain clearly for a teenager: what the feedback means, what the criterion and its command terms ask for, why the work got the level it did, and what they could do next. Short paragraphs and bullet points; check understanding with one question at the end when it helps.

${INTEGRITY_RULE}
If they ask you to write or rewrite part of their work, kindly say you can't (it must be their own work), then help them plan it.

${group ? `Subject group: ${MYP[group].name}. Criteria: ${LETTERS.map((l) => `${l} ${MYP[group].criteria[l].name}`).join("; ")}.` : ""}
Command terms: state = a specific brief answer; outline = a brief account; describe = a detailed account; explain = a detailed account including reasons or causes; evaluate = weigh up strengths and limitations to make an appraisal; analyse = break down to bring out parts and relationships.
Levels from Refyn are indicative: their teacher assesses the work.

THE FEEDBACK THEY RECEIVED (summary):
${str(body.digest, 20_000)}
${body.focus ? `\nTHEY ARE ASKING ABOUT THIS PART OF THE FEEDBACK:\n${str(body.focus, 3000)}` : ""}

${text ? workBlock : ""}`;
      const { text: answer } = await complete(userId, system, question, { models: FAST, messages: history });
      return json({ answer: answer.trim().slice(0, 8000) });
    }
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    console.error("criteria-review", e);
    return json({ error: (e as Error).message || "Something went wrong." }, status);
  }

  return json({ error: "Unknown action" }, 400);
});
