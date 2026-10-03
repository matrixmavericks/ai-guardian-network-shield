// Pre-written Refyn replies for the live demo. Students get guided help (hints,
// checks, never the answer up front); teachers get complete materials.

type Body = { prompt?: string; processTeaching?: boolean; history?: unknown; subject?: string };

const TRY_STUDENT = [
  "Can you just give me the answer to 3x + 7 = 22?",
  "Explain osmosis",
  "How does photosynthesis work?",
  "Help me start my Macbeth essay",
  "Quiz me on forces",
];
const TRY_TEACHER = [
  "Make a 3-question exit ticket on Newton's second law",
  "Plan a 50-minute lesson on osmosis",
  "Write a rubric for a forces lab report",
  "Differentiate the projectile task for three levels",
];

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""));

type Linear = { a: number; b: number; c: number; text: string };
const findLinear = (s: string): Linear | null => {
  const m = /(-?\d*)\s*x\s*([+-])\s*(\d+)\s*=\s*(-?\d+)/i.exec(s.replace(/−/g, "-"));
  if (!m) return null;
  const a = m[1] === "" ? 1 : m[1] === "-" ? -1 : Number(m[1]);
  const b = (m[2] === "-" ? -1 : 1) * Number(m[3]);
  const c = Number(m[4]);
  if (!a) return null;
  return { a, b, c, text: m[0].replace(/\s+/g, " ") };
};

const historyText = (h: unknown) => {
  try {
    return JSON.stringify(h ?? "");
  } catch {
    return "";
  }
};

function linearTutor(prompt: string, history: string): string | null {
  const asked = findLinear(prompt);
  const earlier = asked ?? findLinear(history);
  if (!earlier) return null;
  const { a, b, c } = earlier;
  const x = (c - b) / a;
  const undo = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`;
  const op = b >= 0 ? `subtract ${b} from` : `add ${Math.abs(b)} to`;

  if (asked) {
    return [
      "I could just tell you, but you'll remember it far better if you find it yourself, and it's only two steps.",
      "",
      "**Your goal:** get x on its own.",
      "",
      `1. Right now x has two things stuck to it: it's multiplied by **${a}**, then **${b >= 0 ? b : Math.abs(b)}** is ${b >= 0 ? "added" : "taken away"}.`,
      `2. Undo them in reverse order. What could you do to *both sides* to get rid of the **${undo}**?`,
      "",
      "Tell me what the equation looks like after that step and I'll check it. Stuck? Just say **hint**.",
    ].join("\n");
  }

  // Follow-ups to an earlier equation are short ("hint", "3x = 15", "x = 5")
  if (prompt.length > 40) return null;
  const p = prompt.toLowerCase().replace(/\s+/g, "");
  const middle = `${fmt(a)}x=${fmt(c - b)}`;
  if (/hint|stuck|help|idk|don'?tknow/.test(p)) {
    return [
      `Here's the next nudge: ${op} both sides.`,
      "",
      `${earlier.text}  →  ${fmt(a)}x = ${fmt(c)} ${b >= 0 ? "−" : "+"} ${Math.abs(b)}  →  **${fmt(a)}x = ${fmt(c - b)}**`,
      "",
      `Now one step left. x is being multiplied by ${fmt(a)}. What's the opposite of multiplying by ${fmt(a)}?`,
    ].join("\n");
  }
  if (p.includes(middle)) {
    return `Yes, **${fmt(a)}x = ${fmt(c - b)}** is exactly right. 🎯\n\nLast step: what do you do to both sides to undo the "× ${fmt(a)}"?`;
  }
  const num = /(?:x=)?(-?\d+(?:\.\d+)?)$/.exec(p);
  if (num) {
    const guess = Number(num[1]);
    if (Math.abs(guess - x) < 1e-9) {
      return [
        `**x = ${fmt(x)}.** That's it, and you got there yourself.`,
        "",
        `Always worth checking by putting it back in: ${fmt(a)} × ${fmt(x)} ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${fmt(a * x + b)} ✓`,
        "",
        "Want to try a harder one? Here's one with x on both sides: **5x − 4 = 2x + 11**.",
      ].join("\n");
    }
    return [
      `Not quite. Let's test it: ${fmt(a)} × ${fmt(guess)} ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${fmt(a * guess + b)}, but we need ${fmt(c)}.`,
      "",
      `Go back a step: after you ${op} both sides, what does the equation say?`,
    ].join("\n");
  }
  return null;
}

const STUDENT: [RegExp, string][] = [
  [
    /photosynth/i,
    [
      "Let's build it up rather than memorise it.",
      "",
      "**The big idea:** plants make their own food (glucose) using energy from light.",
      "",
      "> carbon dioxide + water → glucose + oxygen  *(light energy, in the chloroplasts)*",
      "",
      "Think about where each ingredient comes from:",
      "- **Carbon dioxide** gets into the leaf through tiny pores. Do you remember what they're called?",
      "- **Water** travels up from the roots.",
      "- **Light** is absorbed by a green pigment, **chlorophyll**.",
      "",
      "**Quick check:** if a plant spends two days in a dark cupboard, what happens to the starch in its leaves, and why?",
    ].join("\n"),
  ],
  [
    /osmosis|diffusion|water potential/i,
    [
      "**Diffusion** is the net movement of particles from where they're more concentrated to where they're less concentrated.",
      "",
      "**Osmosis** is a special case: the diffusion of *water* across a **partially permeable membrane**, from a dilute solution to a more concentrated one.",
      "",
      "A way to picture it: the membrane lets small water molecules through but not the bigger solute particles, so water moves across to even things out.",
      "",
      "**Try this:** a potato cylinder sits in very salty water for 30 minutes. Does its mass go up or down? Explain using the word *osmosis*, and I'll tell you how close you are.",
    ].join("\n"),
  ],
  [
    /quadratic|factoris|factoriz|x²|x\^2/i,
    [
      "Let's work through one together: **x² + 5x + 6 = 0**.",
      "",
      "Factorising means writing it as two brackets: (x + ?)(x + ?) = 0.",
      "",
      "1. Find two numbers that **multiply to 6** and **add to 5**.",
      "2. Put them in the brackets.",
      "3. If two things multiply to make zero, one of them must be zero. That gives you both answers.",
      "",
      "What are your two numbers for step 1?",
    ].join("\n"),
  ],
  [
    /projectile|launch angle|trajector/i,
    [
      "Good one to explore. Ignoring air resistance:",
      "",
      "- The **horizontal** velocity stays the same the whole flight.",
      "- The **vertical** velocity changes, because gravity pulls down at 9.8 m/s².",
      "",
      "So the path is a parabola, and the range depends on both how fast it goes sideways *and* how long it stays up.",
      "",
      "**Prediction first:** which launch angle do you think gives the longest range? Then open the projectile simulation and test it. Was your prediction right?",
    ].join("\n"),
  ],
  [
    /force|newton|accelerat|f\s*=\s*ma/i,
    [
      "**Newton's second law:** the resultant force on an object equals its mass times its acceleration.",
      "",
      "> F = m × a  *(newtons = kilograms × metres per second squared)*",
      "",
      "In words: push harder and it speeds up faster; make it heavier and the same push does less.",
      "",
      "**Check yourself:**",
      "1. A 2 kg trolley has a resultant force of 6 N on it. What's its acceleration?",
      "2. If the mass doubled but the force stayed the same, what would happen to the acceleration?",
      "",
      "Send me your answers and I'll check your working.",
    ].join("\n"),
  ],
  [
    /essay|macbeth|thesis|paragraph|shakespeare/i,
    [
      "Strong essays start with an argument, not a summary. Let's build yours.",
      "",
      "1. What does Macbeth want at the start of the play, and what does he want by the end?",
      "2. At which moment does his ambition stop being something *he* controls?",
      "3. Which two or three quotations show that change best?",
      "",
      "Now try one sentence that answers the question *and* says how: \"Shakespeare presents ambition as destructive by…\"",
      "",
      "Send me your sentence and I'll help you sharpen it. I won't write it for you, but I'll make it a lot better.",
    ].join("\n"),
  ],
  [
    /quiz|test me/i,
    [
      "Quick quiz on forces, one question at a time.",
      "",
      "**Question 1.** A car moves at a steady 30 m/s on a straight road. What is the resultant force on it?",
      "",
      "A) Zero  B) Forwards  C) Backwards  D) It depends on the mass",
      "",
      "Reply with a letter, plus one sentence on why.",
    ].join("\n"),
  ],
];

const TEACHER: [RegExp, string][] = [
  [
    /exit ticket|exit slip|plenary/i,
    [
      "**Exit ticket: Newton's second law** (5 minutes)",
      "",
      "1. **Recall.** Write Newton's second law as an equation and give the unit of each quantity.",
      "2. **Apply.** A 1,200 kg car accelerates at 2.5 m/s². Calculate the resultant force on it.",
      "3. **Explain.** Trolleys A and B are pushed with the same force. A has twice the mass of B. Compare their accelerations and explain why.",
      "",
      "**Answers**",
      "1. F = ma: force in newtons (N), mass in kilograms (kg), acceleration in m/s².",
      "2. F = 1,200 × 2.5 = **3,000 N**.",
      "3. A's acceleration is **half** of B's: for a fixed force, acceleration is inversely proportional to mass (a = F/m).",
      "",
      "**What to look for:** anyone who gets 480 N in Q2 has divided instead of multiplied. Revisit rearranging F = ma at the start of the next lesson.",
    ].join("\n"),
  ],
  [
    /rubric|mark scheme|success criteria/i,
    [
      "**Rubric: forces lab report** (two criteria, each out of 8)",
      "",
      "| Level | Designing the investigation | Processing and evaluating |",
      "|---|---|---|",
      "| 1–2 | States a question; the method is incomplete | Presents some data; a basic conclusion |",
      "| 3–4 | Testable question with a simple hypothesis; names the variables | Tables with units; describes the trend |",
      "| 5–6 | Hypothesis explained with physics; controls variables; a safe, repeatable method | A correct graph; interprets the trend with F = ma; spots anomalies |",
      "| 7–8 | Justified hypothesis; explains how each variable is controlled and why; enough repeats for a reliable mean | Error bars from repeats; evaluates reliability and suggests specific, justified improvements |",
      "",
      "**Student-friendly checklist:** question ✓ hypothesis with a reason ✓ three variables named ✓ three repeats ✓ graph with error bars ✓ one specific improvement ✓",
    ].join("\n"),
  ],
  [
    /lesson|plan/i,
    [
      "**50-minute lesson: osmosis**",
      "",
      "**Objective:** explain osmosis in terms of water moving across a partially permeable membrane, and predict the result of a potato practical.",
      "",
      "- **0–5 Hook.** Show a limp lettuce leaf and one crisped in water overnight. \"What happened?\"",
      "- **5–15 Teach.** Diffusion recap, then osmosis with a membrane diagram. Pairs explain it back in one sentence each.",
      "- **15–20 Predict.** Cards: potato in pure water, weak salt, strong salt. Students predict the mass change and justify it.",
      "- **20–40 Practical.** Potato cylinders in five concentrations (set up at the start, read at the end). Meanwhile: data-handling worksheet on a sample set.",
      "- **40–47 Results.** Weigh, calculate percentage change, plot class results on the board.",
      "- **47–50 Exit ticket.** \"Where would the line cross zero, and what does that tell us?\"",
      "",
      "**Differentiation:** sentence starters for the explanation; a stretch question on water potential.",
      "**Misconception to watch:** \"salt moves into the potato\": it's the water that moves.",
    ].join("\n"),
  ],
  [
    /differentiat|three levels|scaffold|support and stretch/i,
    [
      "**Projectile investigation, three ways**",
      "",
      "**Support.** Use the projectile simulation with speed fixed at 20 m/s. Fill in the table for 15°, 30°, 45°, 60° and 75°, then circle the angle with the longest range. Sentence starter: \"The longest range was at… because…\"",
      "",
      "**Core.** Find the angle for the longest range at two different speeds. Explain why angles that add to 90° give the same range, using horizontal and vertical velocity.",
      "",
      "**Stretch.** Add a launch height of 2 m. Does 45° still give the longest range? Predict first, test it, then explain using time of flight.",
      "",
      "All three groups finish with the same question, so the plenary works for everyone: *what two things decide how far a projectile goes?*",
    ].join("\n"),
  ],
];

function markingFeedback(prompt: string) {
  const max = Number(/marked out of (\d+)/i.exec(prompt)?.[1] ?? 100);
  const work = prompt.split(/Student's work:/i)[1]?.trim() ?? "";
  const strength = work.length > 600 ? 0.86 : work.length > 300 ? 0.7 : 0.48;
  const mark = Math.round(max * strength);
  const osmosis = /osmosis|potato|salt/i.test(work);
  const lines = osmosis
    ? strength > 0.8
      ? "You designed a genuinely fair test, and repeating each concentration made your means trustworthy. Next: add error bars from the range of your repeats, and explain your anomaly with a specific cause rather than general error. To push your thinking: at what concentration would the cylinder's mass not change at all, and what does that tell you about the cells?"
      : strength > 0.6
        ? "Your method is clear and your conclusion links the mass change to osmosis. Next: repeat each concentration three times and use the mean, and describe the trend with numbers from your table. To push your thinking: why did the cylinder in pure water gain mass?"
        : "You've correctly spotted that osmosis is involved. Next: write out your method step by step so someone else could repeat it, and include a results table with units. To push your thinking: which way did the water move in the salty solution, and why?"
    : strength > 0.8
      ? "This is precise and well organised, and your explanation uses the key ideas accurately. Next: back up your conclusion with specific values, and add one improvement with a reason. To push your thinking: what would change if you repeated this at a different scale?"
      : strength > 0.6
        ? "You cover the main ideas clearly. Next: use more subject vocabulary and give an everyday example for each point. To push your thinking: which part of your answer are you least sure about, and how could you check it?"
        : "You've made a start on the key ideas. Next: explain each point in a full sentence, and add an example or a labelled diagram. To push your thinking: what is happening to the particles at each stage?";
  return `${lines}\nSuggested mark: ${mark}/${max}`;
}

/** The reply Refyn gives in the demo. */
export function demoReply(body: Body, role: "student" | "teacher"): string {
  const prompt = String(body.prompt ?? "").trim();
  if (/helping a teacher write feedback/i.test(prompt)) return markingFeedback(prompt);

  const teacher = role === "teacher" || body.processTeaching === false;
  if (!teacher) {
    const lin = linearTutor(prompt, historyText(body.history));
    if (lin) return lin;
  }
  for (const [re, text] of teacher ? [...TEACHER, ...STUDENT] : STUDENT) if (re.test(prompt)) return text;

  const tries = (teacher ? TRY_TEACHER : TRY_STUDENT).map((t) => `- "${t}"`).join("\n");
  return teacher
    ? `In the live demo my replies are written in advance, so I can't take on this one yet. Try one of these to see what Refyn makes for teachers:\n\n${tries}\n\nWith your own account I plan, write, differentiate and mark across every subject you teach, using your classes and your marking queue.`
    : `Good question! In the live demo my replies are written in advance, so I can't take on this one yet. Try one of these to see how Refyn teaches:\n\n${tries}\n\nWith your own account I'll work through anything in your subjects, step by step.`;
}

/** The same reply as a Server-Sent Events stream, typed out like the real thing. */
export function demoStream(text: string): Response {
  const enc = new TextEncoder();
  const parts = text.match(/[\s\S]{1,5}/g) ?? [text];
  const send = (c: ReadableStreamDefaultController, ev: unknown) => c.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
  const stream = new ReadableStream({
    async start(c) {
      await new Promise((r) => setTimeout(r, 550));
      send(c, { type: "start" });
      for (const p of parts) {
        await new Promise((r) => setTimeout(r, 12));
        send(c, { type: "delta", text: p });
      }
      send(c, { type: "done", meta: {} });
      c.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
}
