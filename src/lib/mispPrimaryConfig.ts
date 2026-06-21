import {
  Sparkles, BookOpen, Palette, Music2, Leaf, Sun, Rocket, Smile,
  Heart, Calculator, PenTool, Globe2, Puzzle, Trophy, Star, Wand2,
  Languages, Map, Brush, ScrollText
} from "lucide-react";

export type PrimaryTool = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  icon: any;
  needsInput: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  buildPrompt: (input: string, gradeBand: string, unit?: string) => string;
};

export type PrimaryGame = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  category: "math" | "literacy" | "inquiry" | "social" | "creative";
  /** AI generates round content */
  generatePrompt: (gradeBand: string, unit?: string) => string;
};

export type PrimaryGradeBand = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  ageRange: string;
};

export type PrimaryConfig = {
  email: string;
  displayName: string;
  homeroomGrade: string; // e.g. "Primary 5"
  accent: string;
  bgGradient: string;
};

// IB PYP transdisciplinary themes
export const PYP_THEMES = [
  { id: "who-we-are", label: "Who We Are", emoji: "🧍" },
  { id: "where-we-are", label: "Where We Are in Place & Time", emoji: "🗺️" },
  { id: "how-we-express", label: "How We Express Ourselves", emoji: "🎨" },
  { id: "how-world-works", label: "How the World Works", emoji: "🔬" },
  { id: "how-we-organize", label: "How We Organize Ourselves", emoji: "🏘️" },
  { id: "sharing-planet", label: "Sharing the Planet", emoji: "🌍" },
];

export const PRIMARY_GRADE_BANDS: PrimaryGradeBand[] = [
  { id: "Primary 1", label: "Primary 1", emoji: "🌱", description: "Early years · phonics, counting, exploring", ageRange: "Ages 5-6" },
  { id: "Primary 2", label: "Primary 2", emoji: "🌿", description: "Building fluency · reading, place value, communities", ageRange: "Ages 6-7" },
  { id: "Primary 3", label: "Primary 3", emoji: "🌳", description: "Inquiry deepens · multiplication, paragraphs, ecosystems", ageRange: "Ages 7-8" },
  { id: "Primary 4", label: "Primary 4", emoji: "🌟", description: "Independent learners · fractions, narratives, systems", ageRange: "Ages 8-9" },
  { id: "Primary 5", label: "Primary 5", emoji: "🚀", description: "PYP Exhibition year · agency, action, advocacy", ageRange: "Ages 9-10" },
];

export const PRIMARY_TOOLS: PrimaryTool[] = [
  {
    id: "story",
    title: "Magic Story Spinner",
    emoji: "📖",
    description: "Generate an age-perfect story tied to your current unit — with comprehension questions.",
    icon: BookOpen,
    needsInput: true,
    inputLabel: "What should the story be about?",
    inputPlaceholder: "e.g. a kind octopus who helps the reef recover",
    buildPrompt: (i, g, u) =>
      `Write a delightful, age-appropriate story for ${g} students (IB PYP)${u ? `, anchored to the unit theme "${u}"` : ""}, about: "${i}". Use simple sentences, vivid sensory language, 1 gentle conflict, 1 kind resolution. Keep it 250-350 words. After the story add: (1) 3 picture-the-scene prompts, (2) 4 comprehension questions (literal → inferential), (3) 1 PYP Learner Profile attribute the story illustrates, (4) one tiny "take action" idea a child could try.`,
  },
  {
    id: "uoi",
    title: "Unit of Inquiry Planner",
    emoji: "🧭",
    description: "Turn any topic into a full PYP unit: central idea, lines of inquiry, key concepts, provocations.",
    icon: ScrollText,
    needsInput: true,
    inputLabel: "Topic or starting idea",
    inputPlaceholder: "e.g. water in our community, marketplaces, friendship",
    buildPrompt: (i, g, u) =>
      `Build a complete PYP Unit of Inquiry for ${g} on "${i}"${u ? ` under the transdisciplinary theme "${u}"` : ""}. Include: (1) one crisp Central Idea (statement, not question), (2) 3 Lines of Inquiry, (3) Key Concepts (form, function, causation, change, connection, perspective, responsibility — pick the best 3), (4) Related Concepts, (5) 5 provocations to launch the unit (hands-on, image-based, story-based, walk-based, mystery), (6) suggested learner profile attributes, (7) 3 summative assessment ideas with student agency, (8) 1 action/advocacy connection.`,
  },
  {
    id: "mathgame",
    title: "Math Mini-Game Maker",
    emoji: "🎲",
    description: "Generate playful math game rules with materials, levels, and a sneaky learning goal.",
    icon: Calculator,
    needsInput: true,
    inputLabel: "Math focus",
    inputPlaceholder: "e.g. number bonds to 10, fractions of a whole, skip counting",
    buildPrompt: (i, g) =>
      `Design a hands-on classroom math game for ${g} that secretly teaches "${i}". Include: catchy name, 1-sentence story hook, materials (everyday items only), set-up in under 3 minutes, how-to-play in numbered steps, 3 difficulty levels (gentle / on-level / stretch), how to spot understanding while playing, and a 30-second "exit ticket" question.`,
  },
  {
    id: "phonics",
    title: "Phonics & Word Builder",
    emoji: "🔤",
    description: "Generate decodable sentences, word ladders, and silly tongue-twisters around a sound.",
    icon: PenTool,
    needsInput: true,
    inputLabel: "Sound or pattern",
    inputPlaceholder: "e.g. /sh/, magic-e, -ight, blends bl/cl/fl",
    buildPrompt: (i, g) =>
      `For ${g} early readers, create a phonics mini-lesson for "${i}". Include: (1) 8 decodable words easy → tricky, (2) 4 short decodable sentences, (3) one playful tongue-twister, (4) a 4-step word ladder, (5) 3 quick partner activities (no worksheets), (6) a writing prompt using at least 3 target words.`,
  },
  {
    id: "explorer",
    title: "Curious Explorer",
    emoji: "🔍",
    description: "Kid-safe answers to wild questions — turned into mini-inquiries.",
    icon: Sparkles,
    needsInput: true,
    inputLabel: "The big question a student asked",
    inputPlaceholder: "e.g. Why is the sky blue? Where does honey come from?",
    buildPrompt: (i, g) =>
      `A ${g} student asked: "${i}". Give a warm, accurate, jargon-free answer in 4-5 short paragraphs. Then turn it into a mini-inquiry: 3 follow-up wonder questions, 1 quick observation experiment they can do with classroom materials, 1 sketch-to-show idea, and 1 vocabulary word to introduce.`,
  },
  {
    id: "artsci",
    title: "Art × Science Studio",
    emoji: "🎨",
    description: "Cross-disciplinary make-and-learn projects with photo-able outcomes.",
    icon: Brush,
    needsInput: true,
    inputLabel: "Concept",
    inputPlaceholder: "e.g. symmetry, life cycles, light & shadow, weather",
    buildPrompt: (i, g) =>
      `Design a hands-on art+science project for ${g} exploring "${i}". Include: title, materials, step-by-step instructions a teacher can read aloud, the science being taught, the artistic skill being practiced, a display/sharing idea, and 3 reflection prompts using PYP Learner Profile language.`,
  },
  {
    id: "circletime",
    title: "Morning Circle Builder",
    emoji: "☀️",
    description: "A 10-minute circle plan: greeting, song idea, share question, and SEL moment.",
    icon: Sun,
    needsInput: false,
    buildPrompt: (_, g, u) =>
      `Build a 10-minute Morning Circle for ${g}${u ? ` linked to "${u}"` : ""}: (1) warm greeting ritual, (2) movement/song idea (just describe), (3) 1 share question kids will actually want to answer, (4) a tiny SEL moment with breathing + naming a feeling, (5) "today we're noticing…" inquiry seed, (6) closing chant or gesture.`,
  },
  {
    id: "differentiation",
    title: "Differentiation Helper",
    emoji: "🪜",
    description: "Take any task — instantly get gentle, on-level, and stretch versions for your room.",
    icon: Puzzle,
    needsInput: true,
    inputLabel: "The task you're planning",
    inputPlaceholder: "e.g. writing a letter to a friend, sorting 2D shapes",
    buildPrompt: (i, g) =>
      `Take this ${g} task: "${i}". Produce 3 differentiated versions: (1) GENTLE: scaffolded with visuals/sentence starters/manipulatives, (2) ON-LEVEL: clear success criteria, (3) STRETCH: extra agency, deeper inquiry. For each include success look-fors and a quick check-in question. End with one accommodation tip for ELL students.`,
  },
  {
    id: "parentnote",
    title: "Friendly Parent Note",
    emoji: "💌",
    description: "Warm, specific, jargon-free home update — celebrate or gently flag.",
    icon: Heart,
    needsInput: true,
    inputLabel: "Student & what happened",
    inputPlaceholder: "e.g. Aanya — showed great risk-taking sharing her writing today",
    buildPrompt: (i, g) =>
      `Write a warm 4-6 sentence note home for a ${g} parent about: "${i}". Tone: specific, kind, professional. Use Learner Profile language naturally. Avoid jargon. End with a small invitation for the parent to extend the moment at home.`,
  },
  {
    id: "transitions",
    title: "Transition & Brain Break Bank",
    emoji: "🤸",
    description: "Quick 60-90s activities to reset the room between lessons.",
    icon: Wand2,
    needsInput: false,
    buildPrompt: (_, g) =>
      `Give a teacher of ${g} a curated list of 6 brain breaks / transition activities (60-90 seconds each). Include name, what it does (calm / energize / focus), full instructions a teacher can read aloud, and which times of day it works best.`,
  },
  {
    id: "exhibition",
    title: "PYP Exhibition Coach",
    emoji: "🎤",
    description: "Help a Primary 5 student shape an Exhibition inquiry with real agency and action.",
    icon: Trophy,
    needsInput: true,
    inputLabel: "Student's issue or passion",
    inputPlaceholder: "e.g. food waste at lunchtime, plastic in our city",
    buildPrompt: (i, g) =>
      `A ${g} student wants to explore "${i}" for their PYP Exhibition. Coach them through: (1) a sharpened central idea, (2) 3 lines of inquiry, (3) 4 research methods accessible to a 10-year-old (including primary sources!), (4) potential mentors/community connections, (5) 3 concrete action ideas (advocacy / participation / lifestyle), (6) a public-sharing format, (7) 2 reflection prompts using Learner Profile + Approaches to Learning skills.`,
  },
  {
    id: "language",
    title: "Multilingual Helper",
    emoji: "🌐",
    description: "Translate key phrases and create dual-language supports for ELL students.",
    icon: Languages,
    needsInput: true,
    inputLabel: "Phrases or vocabulary + language(s) needed",
    inputPlaceholder: "e.g. classroom routines in Hindi & Marathi",
    buildPrompt: (i, g) =>
      `For an inclusive ${g} classroom, produce dual-language support for: "${i}". Include (1) the phrases in English, (2) accurate translations + pronunciation guide, (3) a visual cue suggestion for each, (4) one cultural note teachers should know, (5) a tiny activity that celebrates the language(s).`,
  },
];

export const PRIMARY_GAMES: PrimaryGame[] = [
  {
    id: "word-wizard",
    title: "Word Wizard",
    emoji: "🧙",
    description: "Race to build words from a magic letter pool. Vocabulary on fire.",
    category: "literacy",
    generatePrompt: (g, u) =>
      `Generate one round of "Word Wizard" for ${g}${u ? ` themed around "${u}"` : ""}. Return JSON only: { "letters": [9 single uppercase letters with a good vowel mix], "targetWords": [6 valid words buildable from these letters appropriate for the grade, easy→hard], "bonusWord": "one wow-factor word", "theme": "one-line theme hint" }.`,
  },
  {
    id: "number-ninja",
    title: "Number Ninja",
    emoji: "🥷",
    description: "Lightning math missions across levels.",
    category: "math",
    generatePrompt: (g) =>
      `Generate one round of "Number Ninja" for ${g}. Return JSON only: { "missions": [array of 6 objects: { "question": "string", "answer": "string", "hint": "string", "level": "easy|medium|hard" }] }. Mix operations and word problems appropriate for the grade.`,
  },
  {
    id: "would-you-rather",
    title: "Inquiry Would-You-Rather",
    emoji: "🤔",
    description: "Provocations that get kids talking and thinking — PYP style.",
    category: "inquiry",
    generatePrompt: (g, u) =>
      `Create 5 "Would You Rather" prompts for ${g}${u ? ` linked to "${u}"` : ""} that spark real thinking. Return JSON only: { "prompts": [{ "a": "string", "b": "string", "discussion": "one follow-up question that deepens inquiry" }] }.`,
  },
  {
    id: "mystery-box",
    title: "Mystery Box",
    emoji: "📦",
    description: "Guess the concept from progressively easier clues.",
    category: "inquiry",
    generatePrompt: (g, u) =>
      `Pick a single curiosity-rich concept appropriate for ${g}${u ? ` and unit "${u}"` : ""}. Return JSON only: { "answer": "the concept", "clues": [5 clues ordered hardest→easiest], "celebration": "a fun fact reveal" }.`,
  },
  {
    id: "kindness-quest",
    title: "Kindness Quest",
    emoji: "💛",
    description: "Daily missions that grow empathy and the Learner Profile.",
    category: "social",
    generatePrompt: (g) =>
      `Generate 6 "Kindness Quest" missions for ${g} students to complete during the day. Return JSON only: { "missions": [{ "title": "string", "do": "concrete action", "learnerProfile": "one attribute", "reflect": "tiny reflection prompt" }] }.`,
  },
  {
    id: "story-cubes",
    title: "Story Cubes",
    emoji: "🎲",
    description: "Random prompts kids combine into wild stories.",
    category: "creative",
    generatePrompt: (g) =>
      `Generate Story Cubes for ${g}. Return JSON only: { "character": "string", "setting": "string", "object": "string", "problem": "string", "twist": "string", "feeling": "string", "challenge": "a creative-writing challenge using all of the above" }.`,
  },
];

// Placeholder primary teacher emails. Replace with the real ones the school provides.
export const PRIMARY_TEACHERS: PrimaryConfig[] = [
  {
    email: "primary2.teacher@misp.org",
    displayName: "Primary 2 Homeroom",
    homeroomGrade: "Primary 2",
    accent: "from-yellow-300 via-orange-300 to-pink-300",
    bgGradient: "from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/40",
  },
  {
    email: "primary5.teacher@misp.org",
    displayName: "Primary 5 Homeroom",
    homeroomGrade: "Primary 5",
    accent: "from-sky-300 via-indigo-300 to-violet-300",
    bgGradient: "from-sky-50 via-indigo-50 to-violet-50 dark:from-sky-950/40 dark:via-indigo-950/30 dark:to-violet-950/40",
  },
  {
    email: "primary3.teacher@misp.org",
    displayName: "Primary Homeroom",
    homeroomGrade: "Primary 3",
    accent: "from-emerald-300 via-teal-300 to-cyan-300",
    bgGradient: "from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/40",
  },
];

export function getPrimaryConfig(email?: string | null): PrimaryConfig | null {
  if (!email) return null;
  const lower = email.toLowerCase();
  return PRIMARY_TEACHERS.find((t) => t.email.toLowerCase() === lower) ?? null;
}
