/**
 * Refyn skills: short procedures the assistant follows for one kind of task.
 * Installed skills switch on when a message matches their triggers; any skill
 * can be called directly with @slug. Every skill keeps the student doing the
 * thinking, so they work with Guided mode rather than around it.
 */
export type Skill = {
  slug: string;
  name: string;
  category: string;
  description: string;
  /** Words or phrases that switch the skill on automatically when installed */
  triggers: string[];
  /** What the assistant is told to do while the skill is active */
  instructions: string;
};

export const MAX_INSTALLED = 8;
export const MAX_PER_MESSAGE = 3;

export const SKILLS: Skill[] = [
  {
    slug: "socratic",
    name: "Socratic tutor",
    category: "Thinking",
    description: "Guides you with one question at a time until you reach the answer yourself.",
    triggers: ["i don't understand", "i dont understand", "confused", "why does", "how does", "stuck"],
    instructions:
      "Ask exactly one short guiding question per reply. Wait for the student's answer before moving on. Never state the final answer; confirm it only once the student has reached it.",
  },
  {
    slug: "essay-coach",
    name: "Essay coach",
    category: "Writing",
    description: "Argument first, then outline, then feedback on each paragraph you write. Never writes it for you.",
    triggers: ["essay", "thesis", "paragraph", "argument", "introduction", "conclusion"],
    instructions:
      "Work in stages: (1) help the student choose a clear argument, (2) build a paragraph-by-paragraph outline, (3) give feedback on paragraphs the student writes using claim, evidence, explanation. Do not write sentences or paragraphs for the student.",
  },
  {
    slug: "worked-example",
    name: "Worked example",
    category: "Maths",
    description: "Solves a similar problem step by step with different numbers, then hands yours back to you.",
    triggers: ["solve", "equation", "calculate", "simplify", "factorise", "factorize", "integrate", "differentiate"],
    instructions:
      "Do not solve the student's exact problem. Solve a parallel problem with different numbers, showing each step and why. Then ask the student to apply the same steps to their own problem and check their working.",
  },
  {
    slug: "myp-criteria",
    name: "MYP criteria coach",
    category: "IB",
    description: "Maps a task to the IB MYP criteria A–D and explains what a top-band response needs.",
    triggers: ["criterion", "criteria", "myp", "rubric", "band", "achievement level"],
    instructions:
      "Identify which IB MYP assessment criteria (A–D) the task is assessed against for its subject group. For each, explain in student-friendly words what distinguishes the 7–8 band from the 5–6 band, then ask the student which criterion they want to strengthen first.",
  },
  {
    slug: "revision-planner",
    name: "Revision planner",
    category: "Study skills",
    description: "Turns a test date and a list of topics into a day-by-day revision plan.",
    triggers: ["revise", "revision", "exam", "test on", "test next", "study plan"],
    instructions:
      "Ask for the test date, the topics and how much time the student has each day if not given. Then produce a day-by-day plan as a table, mixing topics, including retrieval practice and a rest day, and ending with a timed practice session.",
  },
  {
    slug: "flashcards",
    name: "Flashcard maker",
    category: "Study skills",
    description: "Turns your notes or a topic into question-and-answer flashcards you can revise from.",
    triggers: ["flashcard", "flash card", "memorise", "memorize", "key terms"],
    instructions:
      "Produce 8–12 flashcards as a two-column Markdown table (Question | Answer). Keep answers short and precise. Afterwards, offer to quiz the student using them one at a time.",
  },
  {
    slug: "lab-report",
    name: "Lab report reviewer",
    category: "Science",
    description: "Checks your aim, hypothesis, variables, method, results and conclusion, and asks about the gaps.",
    triggers: ["lab", "experiment", "hypothesis", "variable", "practical", "method"],
    instructions:
      "Review the lab work against: aim, hypothesis, independent/dependent/controlled variables, method, results and analysis, conclusion and evaluation. For each missing or weak part, ask a question that helps the student fix it. Do not write sections for them.",
  },
  {
    slug: "language-partner",
    name: "Language partner",
    category: "Languages",
    description: "Short conversation practice in the language you're learning, with gentle corrections.",
    triggers: ["practice french", "practise french", "practice spanish", "practise spanish", "practice hindi", "conversation practice", "speak in"],
    instructions:
      "Hold a short conversation in the target language at the student's level. After each student message, reply in the language, then add a small table of any mistakes (what they wrote | better version | why).",
  },
  {
    slug: "citation-helper",
    name: "Citation helper",
    category: "Research",
    description: "Formats your sources in MLA, APA or Harvard and points out what's missing.",
    triggers: ["cite", "citation", "reference", "bibliography", "works cited", "mla", "apa", "harvard"],
    instructions:
      "Ask which style is required if not given. Format each source correctly and list any missing details (author, date, publisher, URL, access date) the student needs to find. Explain one rule of the style briefly.",
  },
  {
    slug: "debate-sparring",
    name: "Debate sparring",
    category: "Thinking",
    description: "Takes the other side of your argument, then scores your rebuttal.",
    triggers: ["debate", "counterargument", "counter-argument", "argue against", "other side"],
    instructions:
      "Take the opposing position and give one strong argument at a time. After the student's rebuttal, score it out of 10 for logic, evidence and clarity with one sentence of feedback each, then raise the next argument.",
  },
  {
    slug: "feedback-decoder",
    name: "Feedback decoder",
    category: "Grades",
    description: "Explains teacher feedback in plain words and turns it into three next steps.",
    triggers: ["feedback", "my teacher said", "teacher wrote", "comment on my", "marked"],
    instructions:
      "Rephrase the teacher's feedback in plain, encouraging language, then turn it into exactly three concrete next steps the student can act on, each with a short example of what 'better' looks like.",
  },
  {
    slug: "exam-practice",
    name: "Exam question practice",
    category: "Study skills",
    description: "Sets exam-style questions one at a time and marks your answer against a mark scheme.",
    triggers: ["exam question", "past paper", "practice question", "exam style", "mark scheme"],
    instructions:
      "Set one exam-style question with its mark allocation. Wait for the student's answer, then mark it against a short mark scheme, explaining where marks were gained or lost, before setting the next question.",
  },
];

export const skillBySlug = (slug: string) => SKILLS.find((s) => s.slug === slug);

/** Skills mentioned with @slug anywhere in the text. */
export const mentionedSkills = (text: string) =>
  Array.from(text.matchAll(/@([a-z0-9-]+)/gi))
    .map((m) => skillBySlug(m[1].toLowerCase()))
    .filter((s): s is Skill => !!s);

/** Skills that apply to a message: @mentions first, then installed skills whose triggers match. */
export const skillsForMessage = (text: string, installed: string[]) => {
  const lower = text.toLowerCase();
  const picked: Skill[] = [];
  for (const s of mentionedSkills(text)) if (!picked.includes(s)) picked.push(s);
  for (const slug of installed) {
    const s = skillBySlug(slug);
    if (s && !picked.includes(s) && s.triggers.some((t) => lower.includes(t))) picked.push(s);
  }
  return picked.slice(0, MAX_PER_MESSAGE);
};

/** The block sent to the assistant alongside the message. */
export const skillContext = (skills: Skill[]) =>
  skills.length === 0
    ? ""
    : `Refyn skills the student has switched on for this reply. Follow these procedures:\n${skills
        .map((s) => `- ${s.name}: ${s.instructions}`)
        .join("\n")}`;
