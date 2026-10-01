// Refyn assistant powers: what the chat knows about the person (their own
// classes, deadlines, grades, marking) and the interactive blocks it can put
// in a reply (quizzes, flashcards, graphs, charts, plans, actions).
// Shared with the client (src/lib/chatPowers.ts) for the block formats.

// deno-lint-ignore-file no-explicit-any
/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

export type LiveSummary = { role: "student" | "teacher"; classes: number; assignments: number; waiting?: number; events: number };

const DAY = 86_400_000;
const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** Dates in the person's own time zone, e.g. "Fri 3 Oct". */
const fmt = (iso: string | null | undefined, tz: string) => {
  if (!iso) return "no date";
  try {
    return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: tz }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
};
const validTz = (tz: unknown) => {
  if (typeof tz !== "string" || !tz) return "UTC";
  try { new Intl.DateTimeFormat("en-GB", { timeZone: tz }); return tz; } catch { return "UTC"; }
};

async function schoolEvents(db: Db, userId: string, tz: string, now: number): Promise<string[]> {
  const { data: m } = await db.from("school_members").select("school_id").eq("user_id", userId).limit(1);
  const school = m?.[0]?.school_id;
  if (!school) return [];
  const { data } = await db
    .from("school_events")
    .select("title, event_date, location")
    .eq("school_id", school)
    .gte("event_date", new Date(now - DAY).toISOString())
    .lte("event_date", new Date(now + 21 * DAY).toISOString())
    .order("event_date", { ascending: true })
    .limit(8);
  return (data ?? []).map((e: any) => `- ${fmt(e.event_date, tz)}: ${clip(e.title, 80)}${e.location ? ` (${clip(e.location, 40)})` : ""}`);
}

async function studentContext(db: Db, userId: string, tz: string, now: number) {
  const { data: mem } = await db.from("class_members").select("class_id").eq("student_id", userId);
  const classIds = [...new Set((mem ?? []).map((m: any) => m.class_id))];
  const lines: string[] = [];
  let assignmentsCount = 0;
  if (classIds.length) {
    const { data: classes } = await db.from("classes").select("id, name, subject, teacher_id").in("id", classIds);
    const teacherIds = [...new Set((classes ?? []).map((c: any) => c.teacher_id))];
    const { data: teachers } = teacherIds.length ? await db.from("profiles").select("user_id, full_name").in("user_id", teacherIds) : { data: [] };
    const tName = new Map((teachers ?? []).map((t: any) => [t.user_id, t.full_name]));
    const cName = new Map((classes ?? []).map((c: any) => [c.id, c.name]));
    lines.push(`Classes: ${(classes ?? []).map((c: any) => `${clip(c.name, 50)} (${clip(c.subject, 30)}${tName.get(c.teacher_id) ? `, ${clip(tName.get(c.teacher_id), 40)}` : ""})`).join("; ")}`);

    const { data: asg } = await db
      .from("class_assignments")
      .select("id, class_id, title, due_date, description")
      .in("class_id", classIds)
      .gte("due_date", new Date(now - 21 * DAY).toISOString())
      .lte("due_date", new Date(now + 28 * DAY).toISOString())
      .order("due_date", { ascending: true })
      .limit(40);
    const ids = (asg ?? []).map((a: any) => a.id);
    const { data: subs } = ids.length
      ? await db.from("assignment_submissions").select("assignment_id, status, grade, max_grade").eq("student_id", userId).in("assignment_id", ids)
      : { data: [] };
    const sub = new Map((subs ?? []).map((s: any) => [s.assignment_id, s]));
    const due: string[] = [];
    const overdue: string[] = [];
    for (const a of asg ?? []) {
      const s: any = sub.get(a.id);
      const state = !s ? "not submitted" : s.grade !== null && s.grade !== undefined ? `graded ${s.grade}/${s.max_grade}` : s.status === "graded" ? "graded" : "submitted";
      const line = `- ${fmt(a.due_date, tz)}: "${clip(a.title, 80)}" for ${clip(cName.get(a.class_id), 40)}: ${state}${a.description ? `. Brief: ${clip(a.description, 140)}` : ""}`;
      if (new Date(a.due_date).getTime() < now) { if (!s) overdue.push(line); } else due.push(line);
    }
    assignmentsCount = due.length + overdue.length;
    if (overdue.length) lines.push(`Past the deadline and not submitted:\n${overdue.join("\n")}`);
    lines.push(due.length ? `Due in the next four weeks:\n${due.join("\n")}` : "Nothing due in the next four weeks.");

    const { data: graded } = await db
      .from("assignment_submissions")
      .select("assignment_id, grade, max_grade, feedback, graded_at")
      .eq("student_id", userId)
      .not("graded_at", "is", null)
      .order("graded_at", { ascending: false })
      .limit(6);
    if (graded?.length) {
      const gIds = graded.map((g: any) => g.assignment_id);
      const { data: gA } = await db.from("class_assignments").select("id, title, class_id").in("id", gIds);
      const title = new Map((gA ?? []).map((a: any) => [a.id, a]));
      lines.push(`Recent marked work:\n${graded.map((g: any) => {
        const a: any = title.get(g.assignment_id);
        return `- "${clip(a?.title ?? "Assignment", 70)}"${a ? ` (${clip(cName.get(a.class_id), 30)})` : ""}: ${g.grade ?? "?"}/${g.max_grade ?? "?"}${g.feedback ? `. Teacher feedback: ${clip(g.feedback, 180)}` : ""}`;
      }).join("\n")}`);
    }
  } else {
    lines.push("Not in any Refyn class yet.");
  }

  const { data: mastery } = await db
    .from("student_topic_mastery")
    .select("topic_id, mastery_level, questions_attempted")
    .eq("user_id", userId)
    .gt("questions_attempted", 0)
    .order("mastery_level", { ascending: true })
    .limit(5);
  if (mastery?.length) {
    const { data: topics } = await db.from("course_topics").select("id, title").in("id", mastery.map((m: any) => m.topic_id));
    const tt = new Map((topics ?? []).map((t: any) => [t.id, t.title]));
    lines.push(`Weakest practised topics: ${mastery.map((m: any) => `${clip(tt.get(m.topic_id) ?? "topic", 50)} (${Math.round(Number(m.mastery_level ?? 0))}% mastery)`).join("; ")}`);
  }

  const { data: reviews } = await db.from("task_reviews").select("title, subject_group, result, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3);
  if (reviews?.length) {
    lines.push(`Recent assessment coach checks:\n${reviews.map((r: any) => {
      const res = r.result?.results ?? {};
      const lv = Object.entries(res).filter(([, v]: any) => v && !v.error).map(([k, v]: any) => `${k} ${v.level}/8`).join(", ");
      return `- "${clip(r.title, 60)}" (${r.subject_group}, ${fmt(r.created_at, tz)})${lv ? `: ${lv}` : ""}`;
    }).join("\n")}`);
  }
  const { data: pp } = await db.from("pp_reviews").select("title, result, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1);
  if (pp?.[0]?.result?.total !== undefined) lines.push(`Latest personal project draft check: "${clip(pp[0].title, 60)}", ${pp[0].result.total}/24 (${fmt(pp[0].created_at, tz)})`);

  return { lines, classes: classIds.length, assignments: assignmentsCount };
}

async function teacherContext(db: Db, userId: string, tz: string, now: number) {
  const lines: string[] = [];
  const { data: classes } = await db.from("classes").select("id, name, subject").eq("teacher_id", userId).order("created_at", { ascending: true });
  const classIds = (classes ?? []).map((c: any) => c.id);
  let assignmentsCount = 0;
  let waitingTotal = 0;
  if (!classIds.length) {
    lines.push("No Refyn classes yet.");
  } else {
    const { data: mem } = await db.from("class_members").select("class_id, student_id").in("class_id", classIds);
    const studentsOf = new Map<string, string[]>();
    for (const m of mem ?? []) studentsOf.set(m.class_id, [...(studentsOf.get(m.class_id) ?? []), m.student_id]);
    const studentIds = [...new Set((mem ?? []).map((m: any) => m.student_id))];
    const { data: profs } = studentIds.length ? await db.from("profiles").select("user_id, full_name").in("user_id", studentIds) : { data: [] };
    const name = new Map((profs ?? []).map((p: any) => [p.user_id, clip(p.full_name || "Student", 40)]));
    lines.push(`Classes (use these exact names; the id is for actions): ${(classes ?? []).map((c: any) => `${clip(c.name, 50)} [id ${c.id}] (${clip(c.subject, 30)}, ${studentsOf.get(c.id)?.length ?? 0} students)`).join("; ")}`);

    const { data: asg } = await db
      .from("class_assignments")
      .select("id, class_id, title, due_date, created_at")
      .in("class_id", classIds)
      .or(`due_date.gte.${new Date(now - 30 * DAY).toISOString()},created_at.gte.${new Date(now - 30 * DAY).toISOString()}`)
      .order("due_date", { ascending: true })
      .limit(40);
    const ids = (asg ?? []).map((a: any) => a.id);
    const { data: subs } = ids.length
      ? await db.from("assignment_submissions").select("assignment_id, student_id, grade, max_grade, status, submitted_at").in("assignment_id", ids).limit(3000)
      : { data: [] };
    const cName = new Map((classes ?? []).map((c: any) => [c.id, c.name]));
    let oldest = 0;
    const rows = (asg ?? []).map((a: any) => {
      const s = (subs ?? []).filter((x: any) => x.assignment_id === a.id);
      const roster = studentsOf.get(a.class_id) ?? [];
      const graded = s.filter((x: any) => x.grade !== null || x.status === "graded");
      const waiting = s.length - graded.length;
      waitingTotal += waiting;
      for (const x of s) if (!(x.grade !== null || x.status === "graded")) oldest = Math.max(oldest, Math.floor((now - new Date(x.submitted_at).getTime()) / DAY));
      const missing = roster.filter((id) => !s.some((x: any) => x.student_id === id));
      const past = a.due_date && new Date(a.due_date).getTime() < now;
      const pct = graded.filter((x: any) => x.grade !== null && x.max_grade).map((x: any) => (x.grade / x.max_grade) * 100);
      const avg = pct.length ? Math.round(pct.reduce((p: number, q: number) => p + q, 0) / pct.length) : null;
      return `- "${clip(a.title, 70)}" (${clip(cName.get(a.class_id), 40)}, due ${fmt(a.due_date, tz)}): ${s.length}/${roster.length} submitted, ${graded.length} marked, ${waiting} waiting${avg !== null ? `, class average ${avg}%` : ""}${past && missing.length ? `. Missing: ${missing.length <= 12 ? missing.map((id) => name.get(id) ?? "Student").join(", ") : `${missing.length} students`}` : ""}`;
    });
    assignmentsCount = rows.length;
    if (rows.length) lines.push(`Assignments from the last month and coming up:\n${rows.join("\n")}`);
    lines.push(`Marking queue: ${waitingTotal} submission${waitingTotal === 1 ? "" : "s"} waiting${waitingTotal ? `, oldest ${oldest} day${oldest === 1 ? "" : "s"}` : ""}.`);
  }
  const { data: sets } = await db.from("marking_sets").select("title, subject_group, criteria, updated_at, marking_items(count)").eq("teacher_id", userId).order("updated_at", { ascending: false }).limit(4);
  if (sets?.length) lines.push(`Marking copilot sets: ${sets.map((s: any) => `"${clip(s.title, 60)}" (${s.subject_group}, criteria ${(s.criteria ?? []).join("")}, ${s.marking_items?.[0]?.count ?? 0} pieces)`).join("; ")}`);
  return { lines, classes: classIds.length, assignments: assignmentsCount, waiting: waitingTotal };
}

/** The person's own Refyn data, compact, for the system prompt. Never other people's beyond a teacher's own classes. */
export async function liveContext(db: Db, userId: string, staff: boolean, tzRaw: unknown): Promise<{ text: string; summary: LiveSummary } | null> {
  const tz = validTz(tzRaw);
  const now = Date.now();
  try {
    const [core, events] = await Promise.all([
      staff ? teacherContext(db, userId, tz, now) : studentContext(db, userId, tz, now),
      schoolEvents(db, userId, tz, now).catch(() => []),
    ]);
    const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(now));
    const body = [
      `Now: ${today} (${tz}).`,
      ...core.lines,
      events.length ? `School calendar (next three weeks):\n${events.join("\n")}` : "",
    ].filter(Boolean).join("\n").slice(0, 7000);
    return {
      text: `YOUR REFYN (live data about the ${staff ? "teacher" : "student"} you are talking to, from their own Refyn account; use it when it helps, e.g. deadlines, what to revise, what to mark, and say plainly when something isn't in it. Never invent assignments, grades or dates):\n${body}`,
      summary: { role: staff ? "teacher" : "student", classes: core.classes, assignments: core.assignments, waiting: staff ? (core as { waiting: number }).waiting : undefined, events: events.length },
    };
  } catch (e) {
    console.error("live context failed (non-fatal):", e);
    return null;
  }
}

/* ---------- interactive blocks ---------- */

export const BLOCK_KINDS = ["QUIZ", "FLASHCARDS", "GRAPH", "CHART", "PLAN", "ACTION"] as const;

export const blockInstructions = (staff: boolean) => `

INTERACTIVE BLOCKS: the chat turns these blocks into interactive cards. Use one when it genuinely helps; write a sentence or two of normal text around it. The JSON must be valid (double quotes, no comments, no trailing commas). Never put a block inside a code fence.
- Quiz (practice questions the reader answers in the chat, marked instantly). Use for "quiz me", checking understanding, revision${staff ? ", or a quiz for a class (the teacher can launch it as a live class quiz)" : ""}. 4–10 questions; mix types; explanations say why, briefly.
<<<QUIZ title="Photosynthesis check">>>
{"questions":[{"q":"Where does the light-dependent stage happen?","type":"mcq","options":["Stroma","Thylakoid membranes","Cytoplasm","Mitochondria"],"answer":1,"explain":"Chlorophyll in the thylakoid membranes absorbs light."},{"q":"Glucose is a product of photosynthesis.","type":"tf","answer":true,"explain":"It is made in the Calvin cycle."},{"q":"Name the gas released.","type":"short","answer":"Oxygen","explain":"From splitting water."}]}
<<<END QUIZ>>>
  ("answer" is the 0-based option index for mcq, true/false for tf, and a model answer for short.)
- Flashcards (flip cards for memorising definitions, vocabulary, formulas, dates). 6–24 cards; fronts short.
<<<FLASHCARDS title="Cell organelles">>>
{"cards":[{"front":"Mitochondrion","back":"Site of aerobic respiration; releases energy as ATP"}]}
<<<END FLASHCARDS>>>
- Graph (an interactive plot of functions, for maths and science). Expressions in x using + - * / ^, parentheses, sqrt abs sin cos tan ln log exp, pi, e. Optional sliders: single-letter parameters with [start, min, max]. Optional points to mark.
<<<GRAPH title="Parabolas">>>
{"functions":[{"expr":"a*(x-h)^2+k","label":"y = a(x − h)² + k"}],"params":{"a":[1,-3,3],"h":[0,-5,5],"k":[0,-5,5]},"x":[-8,8],"y":[-6,10],"points":[{"x":0,"y":0,"label":"vertex at the start"}]}
<<<END GRAPH>>>
- Chart (bar, line or pie chart of data you were given or that appears in YOUR REFYN). Never chart invented numbers as if they were real.
<<<CHART title="Marks by criterion" type="bar">>>
{"labels":["A","B","C","D"],"series":[{"name":"Class average","data":[5.2,4.8,6.1,4.3]}],"unit":"/8"}
<<<END CHART>>>
- Plan (a dated schedule with checkboxes that can be added to a calendar: revision plans, project timelines${staff ? ", unit or marking plans" : ""}). Dates YYYY-MM-DD from "Now" onwards; build it around real deadlines from YOUR REFYN.
<<<PLAN title="Revision before the biology test">>>
{"items":[{"date":"2026-10-03","time":"17:00","minutes":40,"title":"Cells: flashcards + 10 questions","detail":"Focus on organelle functions","tag":"Biology test"}]}
<<<END PLAN>>>
- Action (a button that does something in Refyn after the person checks it and confirms; you never do it yourself). Only these types:
  ${staff ? `{"type":"assignment","classId":"<id from YOUR REFYN>","title":"...","description":"student-facing brief","due":"YYYY-MM-DDTHH:MM"} creates an assignment for a class.
  {"type":"message","to":"<student's name from YOUR REFYN>","text":"..."} sends a Refyn message to one student.
  {"type":"marking_set","title":"...","group":"sciences","year":5,"criteria":["A","B"],"task":"task description"} starts a Marking copilot set (groups: language-acquisition, language-literature, individuals-societies, sciences, mathematics, arts, phe, design).
  ` : `{"type":"message","to":"<teacher's name from YOUR REFYN>","text":"..."} drafts a Refyn message to their teacher (they edit and send it).
  `}{"type":"open","tool":"${staff ? "marking-copilot|past-papers|decks|grades|marking|personal-project" : "assessment-coach|personal-project|grades|classes"}","label":"..."} a button that opens that Refyn tool.
<<<ACTION>>>
{"type":"open","tool":"${staff ? "marking-copilot" : "assessment-coach"}","label":"${staff ? "Open Marking copilot" : "Check my lab report"}"}
<<<END ACTION>>>`;
