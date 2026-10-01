// MYP personal project assessment: criteria, strands, achievement-level ladders
// and examiner guidance, shared by the pp-feedback function and the web app.
// No imports, so the app can use it too.
//
// Sources (checked 30 Sep 2026):
// - IB, "Assessing the MYP personal project" (pds.ibo.org free learning): three
//   criteria A (strands i–iii), B (i–ii), C (i–ii), each out of 8, total 24, and
//   the examiner walkthrough of how each strand is judged and how strand levels
//   combine into a criterion level.
// - IB, "Personal project" page (ibo.org, updated 19 Feb 2026): process, product
//   and a report structured by the criteria; supervisor-assessed, IB-moderated.
// - The IB objectives and level descriptors as quoted in an IB school's
//   personal project guide (2026–27), which also gives the submission limits.
// Objectives are close to the IB wording; the level ladders keep the IB command
// terms and qualifiers exactly but are condensed. Supervisors and the IB decide
// the real levels: Refyn's are indicative.

export type PPCriterionId = "A" | "B" | "C";
export type PPStrandId = "Ai" | "Aii" | "Aiii" | "Bi" | "Bii" | "Ci" | "Cii";
export type Band = "1-2" | "3-4" | "5-6" | "7-8";

export type PPStrand = {
  id: PPStrandId;
  criterion: PPCriterionId;
  label: string;
  /** The objective (what the student should be able to do) */
  objective: string;
  /** Level ladder, lowest band first */
  bands: Record<Band, string>;
  /** How examiners judge this strand */
  lookFor: string[];
  /** Common reasons reports lose marks here */
  pitfalls: string[];
  /** The separate things the descriptors and examiners check, judged one by one */
  elements: string[];
  /** Words that usually head this part of a report */
  cues: RegExp;
};

export const PP_CRITERIA: Record<PPCriterionId, { name: string; strands: PPStrandId[] }> = {
  A: { name: "Planning", strands: ["Ai", "Aii", "Aiii"] },
  B: { name: "Applying skills", strands: ["Bi", "Bii"] },
  C: { name: "Reflecting", strands: ["Ci", "Cii"] },
};

export const ATL_CLUSTERS = [
  "communication", "collaboration", "organization", "affective", "reflection",
  "information literacy", "media literacy", "critical thinking", "creative thinking", "transfer",
];

export const PP_STRANDS: PPStrand[] = [
  {
    id: "Ai",
    criterion: "A",
    label: "Learning goal and personal interest",
    objective: "State a learning goal for the project and explain how a personal interest led to that goal.",
    bands: {
      "1-2": "states a learning goal",
      "3-4": "states a learning goal and outlines the connection between personal interest(s) and that goal",
      "5-6": "states a learning goal and describes the connection between personal interest(s) and that goal",
      "7-8": "states a learning goal and explains the connection between personal interest(s) and that goal",
    },
    lookFor: [
      "A clearly stated learning goal: what you want to learn, not just the product you will make.",
      "How your personal interest led to this specific goal. To reach 7–8 you must explain, giving reasons why this interest led to this goal.",
    ],
    pitfalls: [
      "A learning goal that is just 'learn to make the product' (a website, a video) lacks depth.",
      "Describing your interest on its own, then stating a goal, without showing how one led to the other.",
      "Reasons that stay vague about why you settled on this particular goal.",
    ],
    elements: [
      "A learning goal is clearly stated",
      "The goal is about what the student wants to learn, not just making the product",
      "A personal interest is identified",
      "The connection between the interest and the goal is explained with reasons (why this interest led to this goal)",
      "The reasons are specific to the student rather than vague or generic"
    ],
    cues: /learning goal|personal interest|why i chose|my interest|inspired/i,
  },
  {
    id: "Aii",
    criterion: "A",
    label: "Product and success criteria",
    objective: "State an intended product and develop appropriate success criteria for the product.",
    bands: {
      "1-2": "states their intended product",
      "3-4": "states their intended product and presents basic success criteria for the product",
      "5-6": "states their intended product and presents multiple appropriate success criteria for the product",
      "7-8": "states their intended product and presents multiple appropriate, detailed success criteria for the product",
    },
    lookFor: [
      "The intended product, clearly stated.",
      "Several success criteria, each detailed (what exactly 'good' looks like).",
      "Why each criterion is appropriate for this product, made clear in the report, e.g. a 'research and justification' column or a short explanation backed by research. A reader who is not an expert must be able to see it.",
    ],
    pitfalls: [
      "Criteria that are process or plan items ('complete it on time', 'do research') rather than qualities of the finished product.",
      "Copying a generic template (cost, safety, customer…) that doesn't fit the product, e.g. a music composition.",
      "Detailed criteria with no explanation of why they are appropriate: examiners usually land at level 5.",
    ],
    elements: [
      "The intended product is clearly stated",
      "There are multiple success criteria",
      "Each criterion is detailed: it says what success looks like for this product",
      "It is made clear why each criterion is appropriate (e.g. justified with research)",
      "The criteria are qualities of the finished product, not process or plan items"
    ],
    cues: /success criteria|criteria|product|specification|rubric/i,
  },
  {
    id: "Aiii",
    criterion: "A",
    label: "Plan",
    objective: "Present a clear, detailed plan for achieving the product and its associated success criteria.",
    bands: {
      "1-2": "presents a plan that is superficial or that is not focused on a product",
      "3-4": "presents a plan for achieving the product and some of its associated success criteria",
      "5-6": "presents a detailed plan for achieving the product and most of its associated success criteria",
      "7-8": "presents a detailed plan for achieving the product and all of its associated success criteria",
    },
    lookFor: [
      "A plan focused on achieving the product (examiners ignore general project admin).",
      "Detail for each step: what you will actually do (needed for levels 5–8).",
      "Clear links from the steps to every success criterion, e.g. a column naming the criterion each step helps meet, and steps whose content really does meet it.",
    ],
    pitfalls: [
      "A generic school timeline instead of a plan for the product.",
      "Steps listed with no detail of what each involves.",
      "Some success criteria never addressed by any step (this alone can cost a level).",
    ],
    elements: [
      "The plan is focused on achieving the product",
      "The plan is detailed: what each step actually involves",
      "Steps are linked to the success criteria",
      "The plan allows all of the success criteria to be achieved, not just some",
      "The plan is clear to follow (sequence and timing)"
    ],
    cues: /plan|timeline|schedule|steps|gantt|milestone/i,
  },
  {
    id: "Bi",
    criterion: "B",
    label: "ATL skills for the learning goal",
    objective: "Explain how the ATL skill(s) was/were applied to help achieve the learning goal.",
    bands: {
      "1-2": "states which ATL skill(s) was/were applied to help achieve their learning goal",
      "3-4": "outlines which ATL skill(s) was/were applied to help achieve their learning goal, with superficial examples or evidence",
      "5-6": "describes how the ATL skill(s) was/were applied to help achieve their learning goal, with reference to examples or evidence",
      "7-8": "explains how the ATL skill(s) was/were applied to help achieve their learning goal, supported with detailed examples or evidence",
    },
    lookFor: [
      "A section clearly about the learning goal, separate from the product (Bii).",
      "Named ATL skills (from the ten clusters) and how you applied them, not just that you used them. 7–8 needs the why: reasons the skill, applied that way, helped you achieve the goal.",
      "Evidence (process journal extracts, photos, notes) integrated into the report and closely linked to what you claim. The narrative decides the level; evidence supports it.",
    ],
    pitfalls: [
      "Mixing learning-goal skills and product skills together, so the examiner can't tell which is which.",
      "Describing a skill in general ('research is important') rather than how you used it for your goal.",
      "Relying on hyperlinks: examiners don't follow links, so evidence must be in the report.",
    ],
    elements: [
      "This part is clearly about the learning goal, separate from the product (Bii)",
      "Specific ATL skills are named",
      "How each skill was applied is described, not just that it was used",
      "Why the skill, applied that way, helped achieve the learning goal is explained (reasons)",
      "Detailed examples or evidence support each claim",
      "The evidence is in the report itself (not only behind links) and matches the claims"
    ],
    cues: /atl|approaches to learning|skill|research skills|self-management|thinking skills/i,
  },
  {
    id: "Bii",
    criterion: "B",
    label: "ATL skills for the product",
    objective: "Explain how the ATL skill(s) was/were applied to help achieve the product.",
    bands: {
      "1-2": "states which ATL skill(s) was/were applied to help achieve their product",
      "3-4": "outlines which ATL skill(s) was/were applied to help achieve their product, with superficial examples or evidence",
      "5-6": "describes how the ATL skill(s) was/were applied to help achieve their product, with reference to examples or evidence",
      "7-8": "explains how the ATL skill(s) was/were applied to help achieve their product, supported with detailed examples or evidence",
    },
    lookFor: [
      "A section clearly about making the product.",
      "How each named ATL skill was applied to create the product, and why that helped (for 7–8).",
      "Detailed evidence of the product being made, closely linked to the claims.",
    ],
    pitfalls: [
      "Claiming a skill (e.g. creative thinking) but writing about something else.",
      "A descriptive account with no reasons: it stays at 5–6 at best.",
    ],
    elements: [
      "This part is clearly about the product, separate from the learning goal (Bi)",
      "Specific ATL skills are named",
      "How each skill was applied to create the product is described",
      "Why the skill helped achieve the product is explained (reasons)",
      "Detailed examples or evidence support each claim",
      "The evidence is in the report itself (not only behind links) and matches the claims"
    ],
    cues: /atl|skill|creative thinking|critical thinking|product|making|created|built/i,
  },
  {
    id: "Ci",
    criterion: "C",
    label: "Impact on you and your learning",
    objective: "Explain the impact of the project on themselves or their learning.",
    bands: {
      "1-2": "states the impact of the project on themselves or their learning",
      "3-4": "outlines the impact of the project on themselves or their learning",
      "5-6": "describes the impact of the project on themselves or their learning",
      "7-8": "explains the impact of the project on themselves or their learning",
    },
    lookFor: [
      "A specific impact of the project on you or your learning, not a repeat of what you made or learned to do.",
      "A detailed account of that impact; for 7–8, reasons or causes: why it made this impact on you. Quality matters more than quantity.",
    ],
    pitfalls: [
      "Just restating the learning goal ('I learned to crochet in the round').",
      "Listing many impacts briefly instead of explaining one or two well.",
    ],
    elements: [
      "A specific impact on the student or their learning is identified",
      "The impact goes beyond restating the learning goal or the product",
      "The impact is described in detail",
      "Reasons or causes for the impact are explained (why it had this effect)",
      "Depth over breadth: one or two impacts developed well rather than a list"
    ],
    cues: /impact|reflect|i learned|i have learned|changed|grown|this project taught/i,
  },
  {
    id: "Cii",
    criterion: "C",
    label: "Evaluating the product",
    objective: "Evaluate the product based on the success criteria.",
    bands: {
      "1-2": "states whether the product was achieved",
      "3-4": "states whether the product was achieved, partially supported with evidence or examples",
      "5-6": "evaluates the product based on the success criteria, partially supported with evidence or examples",
      "7-8": "evaluates the product based on the success criteria, fully supported with specific evidence or detailed examples",
    },
    lookFor: [
      "An evaluation against each success criterion from Aii: weigh the strengths and the limitations to judge the product's quality.",
      "Your own judgement. Feedback or survey results can inform it, but you must use them to evaluate.",
      "Specific evidence or detailed examples for each claim (photos, test results, measurements).",
    ],
    pitfalls: [
      "Only describing the product against each criterion, with no strengths and limitations weighed up.",
      "Presenting other people's opinions (a survey) as the evaluation.",
      "No evidence: any evaluation against the criteria goes beyond level 4, but weak evidence keeps it low.",
    ],
    elements: [
      "The product is evaluated against the success criteria from Aii",
      "Every success criterion is addressed",
      "Strengths and limitations are weighed up to judge quality (not just described)",
      "The judgement is the student's own (others' opinions are used as input, not as the evaluation)",
      "Claims are supported with specific evidence or detailed examples"
    ],
    cues: /evaluat|success criteria|strength|limitation|improve|met the criteria|feedback|survey/i,
  },
];

export const strandById = (id: PPStrandId) => PP_STRANDS.find((s) => s.id === id)!;

/** Submission rules, as schools publish them from the IB projects guide. */
export const PP_FORMAT = {
  maxPages: 15,
  /** Each minute of recording replaces one page (e.g. 14 pages + 1 minute … 6 pages + 9 minutes) */
  pagesPerMinute: 1,
  maxMinutes: 9,
  fontPt: 11,
  marginCm: 2,
  notes: [
    "Up to 15 pages, or fewer pages plus a real-time recording: each minute of recording takes one page (e.g. 12 pages + 3 minutes).",
    "At least 11-point font and 2 cm margins; images must be readable at the size submitted.",
    "No title page (it counts towards the limit). The bibliography is submitted separately and doesn't count.",
    "Examiners don't follow links: everything to be assessed must be in the report.",
    "The academic integrity form, with at least three recorded supervisor meetings, goes with the report.",
  ],
};

/**
 * Best-fit criterion level from strand levels, following the IB examiners'
 * approach: a clear majority wins; between two levels, the higher unless the
 * higher strand is a weak fit; a wide spread uses the (rounded) average, lowered
 * if a strand at the top is weak.
 */
export function bestFit(levels: { level: number; weak?: boolean }[]): number {
  const valid = levels.filter((l) => Number.isFinite(l.level));
  if (!valid.length) return 0;
  const counts = new Map<number, number>();
  for (const l of valid) counts.set(l.level, (counts.get(l.level) ?? 0) + 1);
  const [mode, n] = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  const spread = Math.max(...valid.map((l) => l.level)) - Math.min(...valid.map((l) => l.level));
  if (valid.length === 1) return valid[0].level;
  // Every strand counts equally: a majority only decides when the levels are close
  if (n > valid.length / 2 && spread <= 1) return mode;
  const mean = valid.reduce((t, l) => t + l.level, 0) / valid.length;
  const lo = Math.floor(mean), hi = Math.ceil(mean);
  if (lo === hi) return lo;
  const topWeak = valid.filter((l) => l.level >= hi).some((l) => l.weak);
  if (valid.length === 2) return topWeak ? lo : hi;
  const rounded = Math.round(mean);
  return rounded === hi && topWeak ? lo : rounded;
}

export const bandOf = (level: number): Band | null =>
  level >= 7 ? "7-8" : level >= 5 ? "5-6" : level >= 3 ? "3-4" : level >= 1 ? "1-2" : null;

/**
 * Calibration from the IB examiners' own marking of a sample report (the
 * "Assessing the MYP personal project" course), paraphrased.
 */
export const PP_CALIBRATION: Record<PPStrandId, string> = {
  Ai: "IB examiners gave 7 (not 8) to a report that stated its goal clearly and gave reasons linking the interest to the goal, because those reasons were slightly vague and not fully explained.",
  Aii: "IB examiners gave 8 to four detailed criteria in a table whose 'research and justification' column made each criterion's appropriateness clear; a testing column was not needed. Several detailed criteria with no sign of why they are appropriate usually get 5.",
  Aiii: "IB examiners gave 7 to a detailed product plan with a column linking steps to criteria, because one criterion was not fully mapped in the plan. A generic whole-project timeline adds nothing to Aiii.",
  Bi: "IB examiners gave 6 where the account of how a skill was applied was a very brief description (close to an outline), lifted by evidence that was closely linked to the claims.",
  Bii: "IB examiners gave 6 to an account that described how creative thinking was applied but never explained why it helped, and that drifted away from the skill it named.",
  Ci: "IB examiners gave 4 where the report mostly repeated what had been learned (the learning goal) and only outlined a specific impact.",
  Cii: "IB examiners gave a weak 5 where the evaluation did use the success criteria but each was addressed briefly, one relied on someone else's opinion, and there was little evidence. Criterion C overall was 4 because Cii was a weak 5.",
};

/** The rubric as text for the AI (one strand, with its criterion context). */
export function strandBrief(id: PPStrandId): string {
  const s = strandById(id);
  const c = PP_CRITERIA[s.criterion];
  return `MYP PERSONAL PROJECT: Criterion ${s.criterion} (${c.name}), strand ${id.slice(1)}: ${s.label}
Objective: ${s.objective}
Achievement levels (0 = does not reach 1–2): ${(Object.keys(s.bands) as Band[]).map((b) => `${b}: the student ${s.bands[b]}`).join(" | ")}
How examiners judge it: ${s.lookFor.join(" ")}
Common pitfalls: ${s.pitfalls.join(" ")}
Elements to judge one by one: ${s.elements.map((e, i) => `(${i + 1}) ${e}`).join("; ")}
Calibration: ${PP_CALIBRATION[id]}
Command terms: state = a specific brief answer; outline = a brief account; describe = a detailed account; explain = a detailed account including reasons or causes; evaluate = an appraisal weighing up strengths and limitations.
ATL skill clusters: ${ATL_CLUSTERS.join(", ")}.
Examiners use a best-fit approach, judge only what is in the report (never follow links), take the level from the narrative (evidence supports it), and award the upper mark of a band when the work largely meets it.`;
}
