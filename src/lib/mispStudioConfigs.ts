import {
  Atom, FlaskConical, Activity, Sigma, Calculator, Infinity as InfinityIcon,
  Globe2, BookMarked, Scale, LineChart, Beaker, Lightbulb, BarChart3,
  GraduationCap, Target, Quote, FileText, Layers, Brain
} from "lucide-react";

export type StudioTool = {
  id: string;
  title: string;
  description: string;
  icon: any;
  needsInput: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  /** Build the prompt sent to ai-chat */
  buildPrompt: (input: string, gradeBand: string) => string;
};

export type GradeBand = { id: string; label: string; description: string };

export type StudioConfig = {
  email: string;
  displayName: string;
  title: string;
  subjectLabel: string;
  accent: string; // tailwind gradient classes
  iconBg: string;
  iconColor: string;
  HeroIcon: any;
  systemContext: string;
  gradeBands: GradeBand[];
  tools: StudioTool[];
  quickLinks: { label: string; to: string; icon: any }[];
};

const physicsTools: StudioTool[] = [
  {
    id: "lab",
    title: "Lab Procedure Designer",
    description: "Generate a complete IB-style lab: aim, hypothesis, variables, equipment, method, safety, data table.",
    icon: Beaker,
    needsInput: true,
    inputLabel: "Lab topic / phenomenon",
    inputPlaceholder: "e.g. investigating the effect of length on pendulum period",
    buildPrompt: (i, g) =>
      `Design a full ${g} physics lab investigation for: "${i}". Include: aim, research question, hypothesis with theoretical justification, independent/dependent/controlled variables, full equipment list with quantities, step-by-step method (numbered), specific safety considerations, blank data table (raw + processed), suggested graph, expected sources of uncertainty, and 3 evaluation prompts. Format with clear headings using bold text.`,
  },
  {
    id: "ia",
    title: "IB Physics IA Coach",
    description: "Critique an IA research question against IB criteria — personal engagement, focus, methodology.",
    icon: Target,
    needsInput: true,
    inputLabel: "Student's research question",
    inputPlaceholder: "e.g. How does temperature affect the resistivity of nichrome wire?",
    buildPrompt: (i, g) =>
      `Evaluate this ${g} IB Physics IA research question: "${i}". Score it 1-10 on each of: personal engagement potential, focus & narrowness, scientific rigor, feasibility in a school lab, and quantitative depth. For each, give specific feedback. Then suggest 3 sharpened reformulations and list the key physics concepts the student must master before starting.`,
  },
  {
    id: "exam",
    title: "Exam-Style Question Set",
    description: "Generate past-paper-style questions on any topic with mark schemes.",
    icon: FileText,
    needsInput: true,
    inputLabel: "Topic",
    inputPlaceholder: "e.g. circular motion and gravitation",
    buildPrompt: (i, g) =>
      `Generate 5 ${g} physics exam-style questions on: "${i}". Mix multiple choice, short structured (4-6 marks), and one extended response (8-10 marks). For each question include: the question, marks breakdown, full mark scheme with command-term awareness, and a common student mistake to watch for.`,
  },
  {
    id: "analogy",
    title: "Concept → Real-World Analogy",
    description: "Turn an abstract concept into 3 visceral analogies students can actually feel.",
    icon: Lightbulb,
    needsInput: true,
    inputLabel: "Physics concept",
    inputPlaceholder: "e.g. quantum tunneling, electric field, simple harmonic motion",
    buildPrompt: (i, g) =>
      `Explain "${i}" for ${g} students using 3 distinct, vivid real-world analogies. For each: name the analogy, walk through how it maps onto the physics, then call out exactly where the analogy BREAKS DOWN so students don't develop misconceptions. End with one quick check-for-understanding question.`,
  },
  {
    id: "uncertainty",
    title: "Data & Uncertainty Tutor",
    description: "Paste raw experimental data — get processed values, uncertainty propagation, and graph guidance.",
    icon: BarChart3,
    needsInput: true,
    inputLabel: "Raw data or scenario",
    inputPlaceholder: "Paste a table or describe what was measured and how",
    buildPrompt: (i, g) =>
      `Act as an IB physics data-analysis tutor for a ${g} student. Given: "${i}". Show: (1) how to calculate absolute and percentage uncertainties for each measurement, (2) how uncertainties propagate through any calculation, (3) what graph to plot and what gradient/intercept represents, (4) how to draw best-fit and min/max gradient lines, (5) how to express the final result with correct sig figs and units.`,
  },
  {
    id: "derive",
    title: "Equation Derivation Walkthrough",
    description: "Step-by-step derivation with assumptions called out at each step.",
    icon: Sigma,
    needsInput: true,
    inputLabel: "Equation or relationship",
    inputPlaceholder: "e.g. derive v² = u² + 2as from first principles",
    buildPrompt: (i, g) =>
      `Derive "${i}" from first principles for a ${g} student. Number every algebraic step. After each step state (a) what was done and (b) any assumption introduced. End with the limits of validity of the final expression and one worked numerical example. Use plain-text math (×, ÷, ², √) — no LaTeX.`,
  },
];

const mathTools: StudioTool[] = [
  {
    id: "problemset",
    title: "Problem Set Generator",
    description: "Spin up a differentiated problem set with full worked solutions.",
    icon: Calculator,
    needsInput: true,
    inputLabel: "Topic",
    inputPlaceholder: "e.g. integration by parts, vectors, trigonometric identities",
    buildPrompt: (i, g) =>
      `Generate a ${g} problem set of 6 questions on "${i}", scaffolded easy → hard. For each: the problem, the technique it targets, full step-by-step solution, and a common student error. Use plain-text math (×, ÷, ², √, π) — no LaTeX.`,
  },
  {
    id: "solution",
    title: "Worked Solution Explainer",
    description: "Paste a tricky problem — get a teacher-quality walkthrough with WHY at every step.",
    icon: Brain,
    needsInput: true,
    inputLabel: "Problem",
    inputPlaceholder: "Type or paste the exact problem",
    buildPrompt: (i, g) =>
      `Solve and explain this ${g} math problem for a student: "${i}". For every line of working answer: WHAT you did, WHY you chose that move (over alternatives), and any algebraic pitfall. End with a generalisation: "If you ever see X, try Y." Plain-text math only (no LaTeX).`,
  },
  {
    id: "misconception",
    title: "Misconception Detector",
    description: "Paste a student's work — flag the conceptual error, not just the wrong line.",
    icon: Target,
    needsInput: true,
    inputLabel: "Student's working (text)",
    inputPlaceholder: "Paste the student's attempt",
    buildPrompt: (i, g) =>
      `A ${g} student wrote this working: "${i}". Identify the EARLIEST line where the conceptual misunderstanding appears (not just the first wrong number). Diagnose the underlying misconception, explain why students typically fall into it, and write a 60-second mini-lesson plus 2 targeted practice questions to fix it.`,
  },
  {
    id: "calcpaper",
    title: "Calculator Paper Practice",
    description: "GDC-active questions with TI-Nspire / Casio keystroke hints (IB AA/AI Paper 2/3 style).",
    icon: LineChart,
    needsInput: true,
    inputLabel: "Topic",
    inputPlaceholder: "e.g. statistics, calculus optimization, financial math",
    buildPrompt: (i, g) =>
      `Create 3 ${g} IB-style calculator-active questions on "${i}". For each: the question, the GDC feature it targets (e.g. nSolve, normCdf, fMin), suggested keystrokes for TI-Nspire AND Casio fx-CG50, and the full mark scheme.`,
  },
  {
    id: "bridge",
    title: "MYP → DP Concept Bridge",
    description: "Show exactly how an MYP topic evolves into its DP counterpart so students aren't blindsided.",
    icon: Layers,
    needsInput: true,
    inputLabel: "Topic to bridge",
    inputPlaceholder: "e.g. from MYP 5 quadratics to DP AA functions",
    buildPrompt: (i) =>
      `Map the conceptual bridge: "${i}". List (1) what MYP students already know, (2) the new abstractions DP introduces, (3) the specific notation changes, (4) 3 problems that look identical but require the DP-level technique, (5) the most common transition pitfall.`,
  },
  {
    id: "ia",
    title: "IA Exploration Idea Bank",
    description: "Personalised IA topic ideas with a feasibility & mathematical depth rating.",
    icon: Lightbulb,
    needsInput: true,
    inputLabel: "Student's interests",
    inputPlaceholder: "e.g. football statistics, music, fashion, gaming",
    buildPrompt: (i, g) =>
      `For a ${g} student interested in "${i}", suggest 5 IB Math IA exploration ideas. For each: the title, research question, the specific math syllabus area, depth rating (1-5), data-collection feasibility, and one risk to the personal-engagement criterion.`,
  },
];

const humanitiesTools: StudioTool[] = [
  {
    id: "opcvl",
    title: "Source Analysis Coach (OPCVL)",
    description: "Paste any source — get an Origin / Purpose / Content / Value / Limitation breakdown.",
    icon: Quote,
    needsInput: true,
    inputLabel: "Source text or description",
    inputPlaceholder: "Paste the source or describe it",
    buildPrompt: (i, g) =>
      `For this ${g} I&S/History source: "${i}", produce a full OPCVL analysis. Origin: who, when, where, what type. Purpose: intent and audience. Content: 3 key claims with quotes/paraphrase. Value: 3 reasons a historian would value it. Limitation: 3 reasons to treat it critically. End with one IB-style 4-mark "with reference to origin and purpose…" model answer.`,
  },
  {
    id: "outline",
    title: "Essay Outliner",
    description: "Turn a prompt into a Paper-2 style essay plan with thesis, evidence, and counter-arguments.",
    icon: FileText,
    needsInput: true,
    inputLabel: "Essay question",
    inputPlaceholder: "e.g. To what extent did economic factors cause WWI?",
    buildPrompt: (i, g) =>
      `Build a structured ${g} essay outline for: "${i}". Include: (1) sharpened thesis with a clear line of argument, (2) 3 body paragraphs each with a topic sentence, specific evidence (with dates/names/figures), analysis, and a mini-conclusion, (3) one strong counter-argument paragraph with rebuttal, (4) a conclusion that returns to the thesis with nuance, (5) IB rubric alignment notes (focus, knowledge, analysis, evaluation).`,
  },
  {
    id: "casestudy",
    title: "Real-World Case Study Finder",
    description: "Find timely, classroom-ready case studies for any concept.",
    icon: Globe2,
    needsInput: true,
    inputLabel: "Concept",
    inputPlaceholder: "e.g. inflation, globalization, urbanization, market failure",
    buildPrompt: (i, g) =>
      `Suggest 4 recent (last 5 years) real-world case studies for teaching "${i}" to ${g} students. For each: the country/context, 2-3 sentence summary, the specific syllabus concept it illustrates, a discussion question, and a possible exam-style application question.`,
  },
  {
    id: "diagram",
    title: "Econ Diagram Explainer",
    description: "Get an ASCII-sketched diagram + step-by-step shifts and welfare analysis.",
    icon: LineChart,
    needsInput: true,
    inputLabel: "Diagram or scenario",
    inputPlaceholder: "e.g. effect of indirect tax on a market, monopoly DWL",
    buildPrompt: (i, g) =>
      `For ${g} IB Economics, explain the diagram for "${i}". Sketch it as ASCII art with axes labelled, mark all key points (P, Q, equilibria, shaded areas), then walk through (1) the initial equilibrium, (2) the shift and what causes it, (3) the new equilibrium, (4) effects on consumer surplus / producer surplus / government revenue / deadweight loss, (5) stakeholder evaluation.`,
  },
  {
    id: "commandterms",
    title: "Command Term Cards",
    description: "Generate flashcard-ready definitions and exemplar sentences for IB command terms.",
    icon: BookMarked,
    needsInput: true,
    inputLabel: "Command terms (comma-separated)",
    inputPlaceholder: "e.g. evaluate, analyse, justify, compare and contrast",
    buildPrompt: (i, g) =>
      `For these ${g} IB command terms: "${i}", create flashcard content. For each term: the official IB definition, what graders are looking for, a 1-sentence student-friendly version, a "weak response" example, and a "strong response" example showing the difference.`,
  },
  {
    id: "debate",
    title: "Debate Stimulus Generator",
    description: "Provocative discussion prompts mapped to TOK and inquiry questions.",
    icon: Scale,
    needsInput: true,
    inputLabel: "Topic or unit",
    inputPlaceholder: "e.g. development, power, scarcity, sustainability",
    buildPrompt: (i, g) =>
      `Create 3 debate stimuli for ${g} students on "${i}". For each: a provocative motion, 3 strongest points FOR, 3 strongest AGAINST, the TOK / global-context link, and one statistic or quote to spark the room.`,
  },
];

export const STUDIO_CONFIGS: Record<string, StudioConfig> = {
  "vinod.chacko@misp.org": {
    email: "vinod.chacko@misp.org",
    displayName: "Mr. Vinod Chacko",
    title: "Physics Studio",
    subjectLabel: "Physics · MYP Integrated Sciences · DP Physics SL/HL",
    accent: "from-cyan-500/20 via-blue-500/10 to-indigo-500/20",
    iconBg: "bg-cyan-500/10 border-cyan-400/30",
    iconColor: "text-cyan-300",
    HeroIcon: Atom,
    systemContext:
      "You are a senior IB Physics teacher at Mahindra International School Pune. You teach MYP Integrated Sciences (Physics strand) for grades 6-10 and DP Physics SL & HL. Use IB language, command terms, and assessment criteria where relevant.",
    gradeBands: [
      { id: "MYP 1-3", label: "MYP 1-3", description: "Grades 6-8 · Integrated Sciences (Physics strand)" },
      { id: "MYP 4-5", label: "MYP 4-5", description: "Grades 9-10 · eAssessment-aligned" },
      { id: "DP SL", label: "DP SL", description: "Grades 11-12 · Standard Level" },
      { id: "DP HL", label: "DP HL", description: "Grades 11-12 · Higher Level" },
    ],
    tools: physicsTools,
    quickLinks: [
      { label: "My Classes", to: "/classes", icon: GraduationCap },
      { label: "Generate Learning Path", to: "/create-learning-path", icon: Activity },
      { label: "Teaching Plan", to: "/teacher-plan-generator", icon: FileText },
      { label: "AI Usage & Quotas", to: "/ai-usage", icon: BarChart3 },
    ],
  },
  "vineet.sharma@misp.org": {
    email: "vineet.sharma@misp.org",
    displayName: "Mr. Vineet Sharma",
    title: "Mathematics Studio",
    subjectLabel: "Math · MYP 1-3 · MYP 4-5 Ext/Std · DP Math AA / AI (SL & HL)",
    accent: "from-violet-500/20 via-fuchsia-500/10 to-pink-500/20",
    iconBg: "bg-violet-500/10 border-violet-400/30",
    iconColor: "text-violet-300",
    HeroIcon: InfinityIcon,
    systemContext:
      "You are a senior IB Mathematics teacher at Mahindra International School Pune. You teach MYP Math 1-3, MYP 4-5 (Extended & Standard), and DP Math Analysis & Approaches (AA) and Applications & Interpretation (AI) at SL and HL. Use plain-text math notation only — never LaTeX. Use ×, ÷, ², √, π and similar Unicode.",
    gradeBands: [
      { id: "MYP 1-3", label: "MYP 1-3", description: "Grades 6-8 · Foundational" },
      { id: "MYP 4-5 Standard", label: "MYP 4-5 Std", description: "On-level pathway" },
      { id: "MYP 4-5 Extended", label: "MYP 4-5 Ext", description: "Accelerated pathway" },
      { id: "DP AA SL", label: "AA SL", description: "Analysis & Approaches SL" },
      { id: "DP AA HL", label: "AA HL", description: "Analysis & Approaches HL" },
      { id: "DP AI SL", label: "AI SL", description: "Applications & Interpretation SL" },
      { id: "DP AI HL", label: "AI HL", description: "Applications & Interpretation HL" },
    ],
    tools: mathTools,
    quickLinks: [
      { label: "My Classes", to: "/classes", icon: GraduationCap },
      { label: "Create Live Quiz", to: "/classes", icon: Activity },
      { label: "Generate Learning Path", to: "/create-learning-path", icon: Sigma },
      { label: "Teaching Plan", to: "/teacher-plan-generator", icon: FileText },
    ],
  },
  "rohit.phalke@misp.org": {
    email: "rohit.phalke@misp.org",
    displayName: "Mr. Rohit Phalke",
    title: "Individuals & Societies Studio",
    subjectLabel: "I&S · MYP 1-5 Integrated Humanities · DP Economics",
    accent: "from-amber-500/20 via-orange-500/10 to-rose-500/20",
    iconBg: "bg-amber-500/10 border-amber-400/30",
    iconColor: "text-amber-300",
    HeroIcon: Globe2,
    systemContext:
      "You are a senior IB Individuals & Societies teacher at Mahindra International School Pune. You teach MYP I&S (Integrated Humanities — history, geography, civics, economics threads) for grades 6-10, and DP Economics. Use IB command terms and assessment language. Anchor everything in real-world case studies when possible.",
    gradeBands: [
      { id: "MYP 1-2", label: "MYP 1-2", description: "Grades 6-7 · Foundational humanities" },
      { id: "MYP 3", label: "MYP 3", description: "Grade 8 · Concept-driven inquiry" },
      { id: "MYP 4-5", label: "MYP 4-5", description: "Grades 9-10 · eAssessment-aligned" },
      { id: "DP Econ SL", label: "DP Econ SL", description: "Economics Standard Level" },
      { id: "DP Econ HL", label: "DP Econ HL", description: "Economics Higher Level" },
    ],
    tools: humanitiesTools,
    quickLinks: [
      { label: "My Classes", to: "/classes", icon: GraduationCap },
      { label: "Generate Learning Path", to: "/create-learning-path", icon: Globe2 },
      { label: "Teaching Plan", to: "/teacher-plan-generator", icon: FileText },
      { label: "AI Usage & Quotas", to: "/ai-usage", icon: BarChart3 },
    ],
  },
};

export function getStudioConfig(email?: string | null): StudioConfig | null {
  if (!email) return null;
  return STUDIO_CONFIGS[email.toLowerCase()] ?? null;
}
