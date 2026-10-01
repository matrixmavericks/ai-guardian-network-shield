// IB MYP assessment reference: the one source every AI feature (chat, worksheets,
// tests, rubrics, marking, slides) uses for criteria, command terms and grading.
// No imports, so the web app can use it too.
//
// Sources (checked 30 Sep 2026): the IB's MYP subject briefs linked from each
// ibo.org/programmes/middle-years-programme/curriculum/<subject>/ page (pages
// updated 19 Feb 2026): sciences (from 2014), mathematics (2021), language and
// literature (from 2014), individuals and societies (2021), language acquisition
// (2020), arts (2022), design (from 2014), physical and health education (from
// 2014); the "MYP passing criteria" and "Grading and awards" pages. Criterion
// names are exact. Summaries and strand focuses are paraphrased, not the IB's
// wording; strands are listed only where they are certain (year 5 objectives).
// Command-term meanings are paraphrased from the IB glossary.

export type MypGroup =
  | "sciences"
  | "mathematics"
  | "language-literature"
  | "individuals-societies"
  | "language-acquisition"
  | "arts"
  | "design"
  | "phe";

export type Letter = "A" | "B" | "C" | "D";
export type MypCriterion = { name: string; focus: string; strands?: string[] };

export type MypGroupInfo = {
  name: string;
  courses: string;
  criteria: Record<Letter, MypCriterion>;
  /** External assessment in year 5, as the subject brief describes it */
  eAssessment: string;
  /** How to write authentic questions for this group */
  questionCraft: string;
};

export const MYP: Record<MypGroup, MypGroupInfo> = {
  sciences: {
    name: "Sciences",
    courses: "biology, chemistry, physics, integrated sciences (and other school-designed sciences)",
    criteria: {
      A: {
        name: "Knowing and understanding",
        focus: "scientific knowledge (facts, concepts, processes, laws, models, theories) applied to solve problems and make scientifically supported judgments",
        strands: [
          "explain scientific knowledge",
          "apply scientific knowledge and understanding to solve problems in familiar and unfamiliar situations",
          "analyse and evaluate information to make scientifically supported judgments",
        ],
      },
      B: {
        name: "Inquiring and designing",
        focus: "designing scientific investigations",
        strands: [
          "explain a problem or question to be tested by a scientific investigation",
          "formulate a testable hypothesis and explain it using scientific reasoning",
          "explain how to manipulate the variables and how enough, relevant data will be collected",
          "design a scientific investigation (method, materials, safety)",
        ],
      },
      C: {
        name: "Processing and evaluating",
        focus: "collecting, processing and interpreting data and evaluating conclusions and methods",
        strands: [
          "present collected and transformed data",
          "interpret data and explain results using scientific reasoning",
          "evaluate the validity of a hypothesis from the outcome of the investigation",
          "evaluate the validity of the method",
          "explain improvements or extensions to the method",
        ],
      },
      D: {
        name: "Reflecting on the impacts of science",
        focus: "the implications of science and its applications for a specific problem or issue, using scientific language and documenting sources",
        strands: [
          "explain how science is applied and used to address a specific problem or issue",
          "discuss and evaluate the implications (moral, ethical, social, economic, political, cultural or environmental) of using science to solve that problem or issue",
          "apply scientific language effectively",
          "document the work of others and sources of information used",
        ],
      },
    },
    eAssessment:
      "Two-hour on-screen examination (biology, chemistry, physics, integrated sciences), three tasks: Knowing and understanding (criterion A, 25 marks); Investigation skills (criteria B and C, 50 marks: formulate hypotheses, plan investigations, present, interpret and evaluate data); Applying science (criterion D, 25 marks: impact of science on a real-life issue, with extended writing).",
    questionCraft:
      "A: recall and application of knowledge to familiar and unfamiliar scenarios, calculations with given data, interpreting information to make judgments. B: a stated research question or scenario; identify variables, formulate a hypothesis with scientific reasoning, plan a safe, fair method. C: give data (table or graph) from an investigation; process it, interpret trends, evaluate the hypothesis and the method, suggest improvements. D: a real-world application (e.g. vaccines, water treatment, renewable energy); explain how science addresses it and discuss/evaluate implications from several perspectives in extended writing. Calculations on given values in a knowledge context are criterion A, not C: C is for processing data from an investigation.",
  },
  mathematics: {
    name: "Mathematics",
    courses: "standard mathematics and extended mathematics",
    criteria: {
      A: {
        name: "Knowing and understanding",
        focus: "selecting and applying mathematics to solve problems in familiar and unfamiliar situations across number, algebra, geometry and trigonometry, statistics and probability",
        strands: [
          "select appropriate mathematics when solving problems in familiar and unfamiliar situations",
          "apply the selected mathematics successfully",
          "solve problems correctly in a variety of contexts",
        ],
      },
      B: {
        name: "Investigating patterns",
        focus: "investigating to discover patterns and general rules",
        strands: [
          "select and apply mathematical problem-solving techniques to discover complex patterns",
          "describe patterns as general rules consistent with findings",
          "prove, or verify and justify, general rules",
        ],
      },
      C: {
        name: "Communicating",
        focus: "mathematical language, forms of representation and lines of reasoning",
        strands: [
          "use appropriate mathematical language (notation, symbols, terminology)",
          "use appropriate forms of mathematical representation to present information",
          "move between different forms of mathematical representation",
          "communicate complete, coherent and concise mathematical lines of reasoning",
          "organize information using a logical structure",
        ],
      },
      D: {
        name: "Applying mathematics in real-life contexts",
        focus: "transferring mathematics to authentic real-life situations, drawing valid conclusions and reflecting on results",
        strands: [
          "identify relevant elements of authentic real-life situations",
          "select appropriate mathematical strategies when solving authentic real-life situations",
          "apply the selected strategies successfully to reach a solution",
          "justify the degree of accuracy of a solution",
          "justify whether a solution makes sense in the context of the real-life situation",
        ],
      },
    },
    eAssessment:
      "Two-hour on-screen examination (mathematics, extended mathematics), three tasks of about 31–35 marks each: Knowing and understanding (criteria A and C); Investigating patterns (criteria B and C); Applying mathematics in real-life contexts (criteria C and D, possibly extended writing that evaluates and justifies a model). Criterion C is assessed across all three tasks, 25 marks in total.",
    questionCraft:
      "A: skills questions on any branch, from familiar to unfamiliar. B: a structured investigation (e.g. growing tile patterns, sequences of shapes): tabulate cases, find the pattern, state the general rule, test/verify it with another case, justify or prove it. C: is not a separate question type; it is marked on notation, representation, reasoning and structure within every task, so ask students to show working, use correct notation and explain steps. D: an authentic real-life scenario with realistic data; model it, solve, justify the degree of accuracy and whether the answer makes sense in context.",
  },
  "language-literature": {
    name: "Language and literature",
    courses: "the school's language and literature courses (e.g. English language and literature)",
    criteria: {
      A: {
        name: "Analysing",
        focus: "the creator's choices, relationships within and between texts, effects on audiences, supported by the text",
        strands: [
          "analyse the content, context, language, structure, technique and style of texts and the relationships among texts",
          "analyse the effects of the creator's choices on an audience",
          "justify opinions and ideas using examples, explanations and terminology",
          "evaluate similarities and differences by connecting features across and within genres and texts",
        ],
      },
      B: {
        name: "Organizing",
        focus: "organizing ideas and opinions with conventions suited to form and purpose, and referencing sources",
        strands: [
          "employ organizational structures that serve the context and intention",
          "organize opinions and ideas in a sustained, coherent and logical manner",
          "use referencing and formatting tools to create a presentation style suited to the context and intention",
        ],
      },
      C: {
        name: "Producing text",
        focus: "producing written and spoken texts, with creative choices aimed at an audience",
        strands: [
          "produce texts that show insight, imagination and sensitivity, exploring new perspectives through the creative process",
          "make stylistic choices (linguistic, literary and visual devices) with awareness of the impact on an audience",
          "select relevant details and examples to develop ideas",
        ],
      },
      D: {
        name: "Using language",
        focus: "accurate, varied language appropriate to context and intention",
        strands: [
          "use appropriate and varied vocabulary, sentence structures and forms of expression",
          "write and speak in a register and style that serve the context and intention",
          "use correct grammar, syntax and punctuation",
          "spell, write and pronounce with accuracy",
          "use appropriate non-verbal communication techniques",
        ],
      },
    },
    eAssessment:
      "Two-hour on-screen examination. The subject brief describes an analysis task (analyse, compare and contrast two text extracts: criteria A, B and D) and a creative-writing task (a response of about 400–600 words to a stimulus such as an image: criteria B, C and D).",
    questionCraft:
      "A: give the extract(s) in full; ask students to analyse language, structure and technique and their effect on the audience, or to compare and contrast two texts. B: extended responses marked on structure and coherence (thesis, paragraphing, integrated comparison, referencing). C: creative or transactional writing from a stimulus with a clear audience and purpose. D: marked on vocabulary, register, grammar and accuracy across written or spoken work. Every analysis question must include the text it refers to.",
  },
  "individuals-societies": {
    name: "Individuals and societies",
    courses: "integrated humanities, history, geography, economics and other humanities and social sciences",
    criteria: {
      A: {
        name: "Knowing and understanding",
        focus: "factual and conceptual knowledge, terminology, developed descriptions, explanations and examples",
        strands: [
          "use a wide range of terminology in context",
          "demonstrate knowledge and understanding of content and concepts through developed descriptions, explanations and examples",
        ],
      },
      B: {
        name: "Investigating",
        focus: "systematic research: research questions, action plans, research methods and evaluating investigations",
        strands: [
          "formulate a clear, focused research question and justify its relevance",
          "formulate and follow an action plan to investigate it",
          "use research methods to collect and record appropriate, varied and relevant information",
          "evaluate the process and results of the investigation",
        ],
      },
      C: {
        name: "Communicating",
        focus: "organizing and communicating information in a style and format suited to audience and purpose, and documenting sources",
        strands: [
          "communicate information and ideas in a style appropriate to the audience and purpose",
          "structure information and ideas in the specified format",
          "document sources of information using a recognized convention",
        ],
      },
      D: {
        name: "Thinking critically",
        focus: "discussing concepts and issues, synthesizing arguments, evaluating sources, interpreting perspectives",
        strands: [
          "discuss concepts, issues, models, visual representations and theories",
          "synthesize information to make valid, well-supported arguments",
          "analyse and evaluate a range of sources/data in terms of origin and purpose, examining values and limitations",
          "interpret different perspectives and their implications",
        ],
      },
    },
    eAssessment:
      "Two-hour on-screen examination (integrated humanities, history, geography), three tasks as the subject brief describes them: Investigating (evaluate an investigation and plan your own, plus knowledge from the course or sources: criteria A and B, 26 marks); Communicating (present information creatively in a specified format for an audience: criteria A and C, 18 marks); Thinking critically (structured questions on issues, arguments and perspectives, ending in extended writing: criteria A, C and D, 36 marks).",
    questionCraft:
      "A: describe/explain with terminology and examples. B: give a research question or investigation plan to evaluate, or ask students to write a focused research question, justify it and plan the method and sources. C: a product in a specified format (article, speech, infographic text, letter) for a stated audience. D: sources labelled with their origin (who, when, what type); evaluate value and limitations by origin and purpose, compare perspectives, and 'To what extent…' or 'Discuss…' extended responses that reach a supported judgement.",
  },
  "language-acquisition": {
    name: "Language acquisition",
    courses: "additional languages, taught and assessed in phases (emergent, capable, proficient in eAssessment)",
    criteria: {
      A: { name: "Listening", focus: "interpreting and constructing meaning from spoken multimodal text, including how images and other spatial aspects work with the spoken text" },
      B: { name: "Reading", focus: "interpreting written, spatial and visual aspects of texts and how they convey ideas, values and attitudes" },
      C: { name: "Speaking", focus: "interacting on personal, local and global topics, supported by spoken, written and visual texts in the target language" },
      D: { name: "Writing", focus: "using language suited to audience and purpose to express ideas, values and opinions creatively and meaningfully" },
    },
    eAssessment:
      "On-screen examination of three tasks (receptive and productive) plus an internally assessed, IB-moderated speaking examination, at one of three proficiency levels: emergent, capable or proficient.",
    questionCraft:
      "A: comprehension questions on an audio-visual text. B: comprehension of a written/visual text (literal, inferential, and how visual features support meaning). C: an interactive oral with a stimulus. D: a written task with a clear text type, audience and purpose. Match the language demand to the phase. Strands differ by phase in the IB guide, so refer to criteria by name, not strand numbers.",
  },
  arts: {
    name: "Arts",
    courses: "visual arts, music, drama, dance, film, media and other arts disciplines",
    criteria: {
      A: { name: "Investigating", focus: "researching art movements or genres and artworks/performances, evaluating and selecting relevant information" },
      B: { name: "Developing", focus: "developing ideas and skills through practical exploration that informs artistic intentions and decisions" },
      C: { name: "Creating or performing", focus: "a finalized artwork or performance showing command of skills and techniques" },
      D: { name: "Evaluating", focus: "reflecting on their own work and artistic development and the role of the arts" },
    },
    eAssessment:
      "ePortfolio at year 5 (competent stage): the IB publishes a partially completed unit planner with the required tasks each session; teachers mark against the year-5 criteria and the IB moderates a sample.",
    questionCraft:
      "Tasks are process-based (research journals, developmental work, final piece or performance, reflection), not exam questions. These criterion names are from the current arts guide; older arts material used different names, so never use the old ones.",
  },
  design: {
    name: "Design",
    courses: "product design, digital design, or combined",
    criteria: {
      A: { name: "Inquiring and analysing", focus: "identifying and analysing a problem for a client or audience, researching it and analysing existing products, leading to a design brief" },
      B: { name: "Developing ideas", focus: "a detailed design specification, a range of design ideas, and presenting and justifying the chosen design" },
      C: { name: "Creating the solution", focus: "planning the creation, following the plan to make a testable prototype, and justifying changes" },
      D: { name: "Evaluating", focus: "designing and running tests, evaluating against the specification, improvements, and impact on the client or audience" },
    },
    eAssessment: "ePortfolio: a complete design project (design folder with brief and specification) marked by the teacher against year-5 criteria and moderated by the IB.",
    questionCraft: "Tasks follow the design cycle (inquiring and analysing, developing ideas, creating the solution, evaluating) for a real client or audience.",
  },
  phe: {
    name: "Physical and health education",
    courses: "physical and health education",
    criteria: {
      A: { name: "Knowing and understanding", focus: "knowledge of health and physical activity used to identify and solve problems, with correct terminology" },
      B: { name: "Planning for performance", focus: "designing, analysing and evaluating a plan to improve performance" },
      C: { name: "Applying and performing", focus: "applying skills, techniques, strategies and movement concepts in physical activity" },
      D: { name: "Reflecting and improving performance", focus: "personal and social development, goal setting and reflecting on performance" },
    },
    eAssessment: "ePortfolio: a target covering physical and psychological performance, a plan with interim cycles of analysis, the final performance, and reflection; teacher-marked and IB-moderated.",
    questionCraft: "A can be tested with written questions on health and physical-activity knowledge; B–D are assessed through planning documents, performance and reflection.",
  },
};

/** Command terms and what they ask for (paraphrased from the IB glossary). */
export const COMMAND_TERMS: Record<string, string> = {
  analyse: "break down to bring out the essential parts and how they relate, and draw conclusions",
  annotate: "add brief notes to a diagram, graph or text",
  apply: "use knowledge, a method or an idea in a given situation",
  calculate: "obtain a numerical answer, showing the working",
  classify: "arrange into groups by shared features",
  comment: "give a judgement based on a given statement or result",
  compare: "give an account of similarities between two (or more) things, referring to both (all) throughout",
  "compare and contrast": "give an account of similarities and differences, referring to both (all) throughout",
  construct: "display information in a diagrammatic or logical form",
  contrast: "give an account of the differences, referring to both (all) throughout",
  create: "produce something original from one's own thought or imagination",
  deduce: "reach a conclusion from the information given",
  define: "give the precise meaning of a word, phrase, concept or quantity",
  demonstrate: "make clear by reasoning or evidence, with examples or practical application",
  derive: "manipulate a relationship to reach a new equation or relationship",
  describe: "give a detailed account or picture of a situation, event, pattern or process",
  design: "produce a plan, simulation or model",
  determine: "obtain the only possible answer",
  discuss: "give a considered, balanced review of a range of arguments, factors or hypotheses, with conclusions supported by evidence",
  distinguish: "make clear the differences between two or more things",
  document: "credit sources using a recognized referencing convention",
  draw: "represent by a labelled, accurate diagram or graph",
  estimate: "obtain an approximate value",
  evaluate: "make an appraisal by weighing up strengths and limitations",
  examine: "consider an argument or concept to uncover its assumptions and relationships",
  explain: "give a detailed account including reasons or causes",
  explore: "undertake a systematic process of discovery",
  find: "obtain an answer, showing the relevant working",
  formulate: "express precisely and systematically the relevant concept(s) or argument(s)",
  identify: "provide an answer from a number of possibilities, or recognize and briefly state a fact or feature",
  interpret: "use knowledge and understanding to recognize trends and draw conclusions from given information",
  investigate: "observe, study or examine systematically to establish facts and reach conclusions",
  justify: "give valid reasons or evidence to support an answer or conclusion",
  label: "add labels to a diagram",
  list: "give a sequence of brief answers with no explanation",
  measure: "obtain a value for a quantity",
  outline: "give a brief account or summary",
  plot: "mark the position of points on a diagram or graph",
  predict: "give an expected result",
  present: "offer for display, observation or consideration",
  prove: "use a sequence of logical steps to obtain the required result formally",
  show: "give the steps in a calculation or derivation",
  "show that": "obtain the required result without the formality of a proof",
  simplify: "reduce an expression to its simplest form",
  sketch: "draw a diagram or graph showing the general shape and key features, labelled",
  solve: "obtain the answer(s) using algebraic, numerical or graphical methods",
  state: "give a specific name, value or other brief answer without explanation",
  suggest: "propose a solution, hypothesis or other possible answer",
  summarize: "abstract a general theme or the major points",
  synthesize: "combine different ideas to create new understanding",
  "to what extent": "consider the merits of an argument or concept and reach a conclusion supported by evidence and sound argument",
  use: "apply knowledge or rules to put theory into practice",
  verify: "provide evidence that validates the result",
};

/** IB guideline for turning four criterion levels (total 0–32) into a 1–7 grade in school reporting. */
export const GRADE_BOUNDARIES: { grade: number; min: number; max: number }[] = [
  { grade: 1, min: 1, max: 5 },
  { grade: 2, min: 6, max: 9 },
  { grade: 3, min: 10, max: 14 },
  { grade: 4, min: 15, max: 18 },
  { grade: 5, min: 19, max: 23 },
  { grade: 6, min: 24, max: 27 },
  { grade: 7, min: 28, max: 32 },
];

export const gradeFor = (total: number) => GRADE_BOUNDARIES.find((b) => total >= b.min && total <= b.max)?.grade ?? null;

const GROUP_PATTERNS: [MypGroup, RegExp][] = [
  ["sciences", /\b(sciences?|biology|biological|chemistry|chemical|physics|integrated sciences?|photosynthesis|enzymes?|cells?|atoms?|molecules?|electricity|circuits?|forces?|ecosystems?|genetics|periodic table|acids?|motion|energy transfer)\b/i],
  ["mathematics", /\b(maths?|mathematics|algebra|geometry|trigonometry|trig|equations?|quadratics?|probability|statistics|fractions?|percentages?|sequences?|functions?|graphs? of|pythagoras|extended mathematics)\b/i],
  ["language-literature", /\b(english|language and literature|language & literature|lang ?lit|literature|poems?|poetry|novels?|short stor(y|ies)|persuasive writing|narrative|shakespeare|literary)\b/i],
  ["individuals-societies", /\b(individuals and societies|individuals & societies|i&s|humanities|history|historical|geography|economics|economy|world war|first world war|second world war|ww1|ww2|wwi|wwii|cold war|revolution|urbani[sz]ation|migration|globali[sz]ation|climate change|sources? (a|b|c|d)|population)\b/i],
  ["language-acquisition", /\b(language acquisition|french|spanish|german|hindi|marathi|mandarin|chinese|japanese|arabic|italian|sanskrit)\b/i],
  ["arts", /\b(arts?|visual arts?|music|drama|theatre|dance|film|painting|sculpture)\b/i],
  ["design", /\b(design cycle|product design|digital design|myp design|design technology|prototype|design brief|design specification)\b/i],
  ["phe", /\b(physical and health education|phe|physical education|\bpe\b|fitness|sports?|athletics|health education)\b/i],
];

const CHAT_SUBJECT: Record<string, MypGroup> = { math: "mathematics", science: "sciences", writing: "language-literature", languages: "language-acquisition" };

/** Subject groups mentioned in a request (best first). */
export function detectGroups(text: string, chatSubject?: string): MypGroup[] {
  const hits = GROUP_PATTERNS.filter(([, re]) => re.test(text)).map(([g]) => g);
  const fromSubject = chatSubject ? CHAT_SUBJECT[chatSubject] : undefined;
  return [...new Set([...(fromSubject ? [fromSubject] : []), ...hits])];
}

/** Requests where assessment accuracy matters: tests, worksheets, rubrics, marking, past papers. */
export const ASSESSMENT_INTENT =
  /\b(tests?|quiz(zes)?|exams?|examination|papers?|worksheets?|questions?|assessments?|assess|rubrics?|mark ?schemes?|markschemes?|marking|mark (this|my|these)|criteri(on|a)|bands?|achievement levels?|grade boundar(y|ies)|revision|practice|homework|summative|formative|exit tickets?|task[- ]specific|command terms?|past papers?|specimen|eassessment|on-screen|internal assessments?|ia)\b/i;

/** DP (not MYP) work: MYP criteria must never be applied to it. */
const DP_ACRONYM = /\b(DP|IBDP|HL|SL|IA|EE|TOK)\b/;
const DP_WORDS = /\b(diploma programme|diploma|internal assessment|extended essay|theory of knowledge|paper [123])\b/i;
const MYP_MENTION = /\b(MYP|middle years|grade [6-9]|grade 10|year [7-9]|year 1[01]|criteri(on|a) [ABCD])\b/i;

export const isDpOnly = (text: string) => (DP_ACRONYM.test(text) || DP_WORDS.test(text)) && !MYP_MENTION.test(text);

/** Which programme a request is for. A grade band (e.g. "DP Physics HL", "MYP 4-5") decides first. */
export function programmeOf(text: string, level?: string): "dp" | "myp" {
  if (level && (DP_ACRONYM.test(level) || DP_WORDS.test(level))) return "dp";
  if (level && MYP_MENTION.test(level)) return "myp";
  return isDpOnly(text) ? "dp" : "myp";
}

/** Stricter intent for students, so everyday homework help isn't turned into criterion-tagged output. */
export const STUDENT_ASSESSMENT_INTENT =
  /\b(criteri(on|a)|rubrics?|mark ?schemes?|markschemes?|achievement levels?|bands?|grade boundar(y|ies)|past papers?|exam questions?|exam practice|practice questions?|test me|quiz me|eassessment|on-screen exam|command terms?)\b/i;

const groupDetail = (g: MypGroup) => {
  const info = MYP[g];
  const crit = (Object.keys(info.criteria) as Letter[])
    .map((l) => {
      const c = info.criteria[l];
      return `- Criterion ${l}: ${c.name} (max 8). Assesses ${c.focus}.${c.strands ? `\n  Strands: ${c.strands.map((s, i) => `(${"i ii iii iv v".split(" ")[i]}) ${s}`).join("; ")}.` : ""}`;
    })
    .join("\n");
  return `${info.name.toUpperCase()} (${info.courses})\n${crit}\nExternal assessment: ${info.eAssessment}\nWriting authentic questions: ${info.questionCraft}`;
};

/** Every subject group with its four criterion names, one line each. */
export const mypCriteriaList = () =>
  (Object.keys(MYP) as MypGroup[])
    .map((g) => `- ${MYP[g].name}: ${(Object.keys(MYP[g].criteria) as Letter[]).map((l) => `${l} ${MYP[g].criteria[l].name}`).join(" · ")}`)
    .join("\n");

const commandTermsBlock = () =>
  Object.entries(COMMAND_TERMS)
    .map(([t, d]) => `${t}: ${d}`)
    .join("; ");

export const MYP_RULES = `IB MYP ASSESSMENT (verified reference: use exactly these criterion names; never invent or rename criteria)
- Each subject group has four criteria, A–D, each marked 0–8 in bands 1–2, 3–4, 5–6 and 7–8 (0 = does not reach the 1–2 band). The criteria are equally weighted. Criterion names and meanings differ by subject group: always use the right group's names below, and name the group.
- Tag every question with its criterion and marks, e.g. "(Criterion A · 3 marks)". Choose the criterion by what the question actually assesses, using the strands below, not by the topic. If a question assesses two criteria, name both.
- Start each question with an IB command term (listed below) and use it in its IB meaning; the marks should fit the demand of the term (state/identify/list: about 1 mark per point; outline/describe: 2–3; explain: 2–4; analyse/evaluate/discuss/to what extent/justify: 4+ with extended writing).
- Mark schemes: give the specific creditworthy points for point-marked questions; for extended responses give a level-based scheme (bands 1–2, 3–4, 5–6, 7–8, or the question's own mark range) with task-specific clarifications.
- Rubrics: write task-specific clarifications of the criterion for this task, band by band, in student-friendly language. Across bands, raise the demand the way IB descriptors do: a more demanding command term (e.g. state → outline → describe → explain), familiar → unfamiliar situations, and a rising qualifier (e.g. limited → adequate → substantial → excellent, or rarely → sometimes → usually → consistently). Do not claim to quote the IB's descriptors word for word.
- Final grades: add the four criterion levels (0–32) and use the IB boundary guidelines: ${GRADE_BOUNDARIES.map((b) => `${b.min}–${b.max} = ${b.grade}`).join(", ")}. Official eAssessment grade boundaries are set per exam session, so don't present these as eAssessment boundaries.
- PAST PAPERS: only call a question a real IB past-paper question if it comes from a past paper in the provided PAST PAPERS excerpts, and then cite it (subject, session, question number). Otherwise label new questions "IB-style" and never invent past-paper sessions, question numbers or quotes from IB papers. If the teacher asks for past-paper questions you don't have, say the school hasn't added that paper to Past papers yet, and offer IB-style questions instead.
- Diploma Programme work (DP, HL/SL, IA, EE, TOK) is not assessed with MYP criteria A–D: never put MYP criteria on DP work.
Command terms: ${commandTermsBlock()}.`;

/**
 * DP sciences (biology, chemistry, physics guides, first assessment 2025), checked
 * against the IB guides on ibo.org on 30 Sep 2026. Paper structures verified for physics.
 */
export const DP_SCIENCES = `DP BIOLOGY, CHEMISTRY AND PHYSICS (guides for first assessment 2025): the internal assessment is one scientific investigation (10 hours, 20% of the grade, 24 marks), marked on four criteria of 6 marks each (bands 1–2, 3–4, 5–6): Research design, Data analysis, Conclusion, Evaluation. The older criteria (personal engagement, exploration, analysis, evaluation, communication) no longer apply; never use them. Physics external assessment: SL Paper 1 (1 h 30; 1A multiple choice and 1B data-based questions; 45 marks; 36%) and Paper 2 (1 h 30; short-answer and extended-response; 55 marks; 44%); HL Paper 1 (2 h; 60 marks; 36%) and Paper 2 (2 h 30; 90 marks; 44%).`;

/** DP economics (guide for first assessment 2022), checked against the IB guide on ibo.org on 30 Sep 2026. */
export const DP_ECONOMICS = `DP ECONOMICS (guide for first assessment 2022): SL: Paper 1 (extended response, one question from a choice of three, 25 marks, 30%), Paper 2 (data response, 1 h 45, one question from a choice of two, 40 marks, 40%), internal assessment (portfolio of three commentaries on news extracts, max 800 words each, each through a different key concept, 45 marks, 30%). HL: Paper 1 (25 marks, 20%), Paper 2 (40 marks, 30%), Paper 3 (policy paper, 1 h 45, two compulsory questions of 30 marks: part (a) 20, part (b) 10, 30%), internal assessment (45 marks, 20%). Each Paper 2 question: (a)(i) and (a)(ii) 2 + 2 marks, (b) 5 marks (may be split 3 + 2), (c), (d), (e), (f) 4 marks each, (g) 15 marks (synthesis and evaluation, markbands); total 40. Markschemes combine analytic marking and markbands.`;

/**
 * Assessment guidance for a request, or null when the request isn't about
 * assessment. Adds the detailed reference for the groups it mentions (or the
 * criterion names of every group when none is clear).
 */
export function mypGuidance(text: string, chatSubject?: string, who: "staff" | "student" | "always" = "staff", level?: string): string | null {
  if (who === "staff" && !ASSESSMENT_INTENT.test(text)) return null;
  if (who === "student" && !STUDENT_ASSESSMENT_INTENT.test(text)) return null;
  if (programmeOf(text, level) === "dp") {
    const sciences = /\b(biology|chemistry|physics|sciences?)\b/i.test(text) || chatSubject === "science";
    const economics = /\beconomics?|\becon\b/i.test(text);
    return `IB DIPLOMA PROGRAMME: this request is about DP work. Use DP-style questions, IB command terms and markschemes (point-based or markbands as appropriate). Never use MYP criteria A–D for DP work. Only call a question a past-paper question if it comes from the provided PAST PAPERS excerpts, and cite it. Only state paper structures, marks or IA criteria given here or in the teacher's documents; for other DP subjects, don't guess them.${sciences ? `\n${DP_SCIENCES}` : ""}${economics ? `\n${DP_ECONOMICS}` : ""}`;
  }
  const groups = detectGroups(text, chatSubject).slice(0, 2);
  const detail = groups.length
    ? groups.map(groupDetail).join("\n\n")
    : `Criteria by subject group (ask or infer the group before tagging):\n${mypCriteriaList()}`;
  return `${MYP_RULES}\n\n${detail}`;
}

/** Short criterion names for one group, e.g. for a slide or form label. */
export const criterionLabel = (g: MypGroup, l: Letter) => `Criterion ${l}: ${MYP[g].criteria[l].name}`;

/** How the four bands rise for any criterion (the IB's pattern, not its wording). */
export const BAND_PATTERN: Record<"1-2" | "3-4" | "5-6" | "7-8", string> = {
  "1-2": "limited: the lowest command term of the strands (e.g. states, identifies), with major gaps or errors",
  "3-4": "adequate: a brief or partial response (e.g. outlines), familiar situations, some gaps",
  "5-6": "substantial: a detailed response (e.g. describes), mostly accurate, some unfamiliar situations",
  "7-8": "excellent: the full command term of the strands (e.g. explains, evaluates), consistently accurate, unfamiliar situations handled",
};

/**
 * The rubric text an AI grader needs for one criterion: name, focus, strands,
 * the band pattern, and how the MYP year changes expectations.
 */
export function criterionBrief(g: MypGroup, l: Letter, year: number): string {
  const info = MYP[g];
  const c = info.criteria[l];
  const y = Math.min(5, Math.max(1, Math.round(year) || 5));
  return `IB MYP ${info.name.toUpperCase()}, Criterion ${l}: ${c.name} (levels 0–8; 0 = does not reach the 1–2 band).
Assesses: ${c.focus}.
${c.strands ? `Strands (year 5 objectives, summarized): ${c.strands.map((s, i) => `(${"i ii iii iv v".split(" ")[i]}) ${s}`).join("; ")}.` : "The IB guide's strands for this group vary by phase or aren't listed here: judge against the criterion's focus and the task, and don't invent strand numbers."}
How the bands rise: ${Object.entries(BAND_PATTERN).map(([b, d]) => `${b} ${d}`).join("; ")}.
MYP year ${y}: ${y === 5 ? "use the year-5 objectives above as they are." : `the strands above are the year-5 versions; the IB's year ${y <= 2 ? "1" : "3"} objectives ask for the same skills at a lower demand (simpler command terms and more familiar situations), so judge against what a year ${y} student is expected to show, guided by the task-specific clarifications when given.`}
Teachers use a best-fit approach: the level is the band whose descriptor the work fully or largely meets, the upper mark when it largely meets it and the lower when it only just does.`;
}
