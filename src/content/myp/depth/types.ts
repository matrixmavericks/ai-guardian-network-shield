import type { DiagramSpec } from "@/components/studio/diagrams";

/** MYP assessment criteria letters; their names differ by subject group. */
export type Criterion = "A" | "B" | "C" | "D";

export type ExamQuestion = {
  id: string;
  /** IB command term, e.g. "Explain", "Calculate", "Evaluate" */
  command: string;
  criterion: Criterion;
  marks: number;
  prompt: string;
  /** Marking points: each is worth one mark unless marks < points */
  points: string[];
  diagram?: DiagramSpec;
};

export type WorkedExample = { problem: string; steps: string[]; answer: string; diagram?: DiagramSpec };

export type TopicDepth = {
  objectives: string[];
  context: { global: string; hook: string };
  diagrams: { spec: DiagramSpec; caption: string }[];
  worked?: WorkedExample;
  exam: ExamQuestion[];
  mistakes: string[];
};

type ExamTuple = [command: string, criterion: Criterion, marks: number, prompt: string, points: string[], diagram?: DiagramSpec];

/** Compact builder so the content files read like a scheme of work. */
export const depth = (
  topicId: string,
  objectives: string[],
  context: [global: string, hook: string],
  body: { diagrams?: [DiagramSpec, string][]; worked?: WorkedExample; exam: ExamTuple[]; mistakes: string[] },
): [string, TopicDepth] => [
  topicId,
  {
    objectives,
    context: { global: context[0], hook: context[1] },
    diagrams: (body.diagrams ?? []).map(([spec, caption]) => ({ spec, caption })),
    worked: body.worked,
    exam: body.exam.map(([command, criterion, marks, prompt, points, diagram], i) => ({ id: `${topicId}-x${i + 1}`, command, criterion, marks, prompt, points, diagram })),
    mistakes: body.mistakes,
  },
];

export const CRITERIA: Record<string, Record<Criterion, string>> = {
  Sciences: { A: "Knowing and understanding", B: "Inquiring and designing", C: "Processing and evaluating", D: "Reflecting on the impacts of science" },
  Mathematics: { A: "Knowing and understanding", B: "Investigating patterns", C: "Communicating", D: "Applying mathematics in real-life contexts" },
  "Individuals & Societies": { A: "Knowing and understanding", B: "Investigating", C: "Communicating", D: "Thinking critically" },
  "Language & Literature": { A: "Analysing", B: "Organizing", C: "Producing text", D: "Using language" },
};

export const criterionName = (group: string, c: Criterion) => (CRITERIA[group] ?? CRITERIA["Individuals & Societies"])[c];
