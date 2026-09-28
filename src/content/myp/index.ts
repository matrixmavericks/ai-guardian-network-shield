import { biology } from "./biology";
import { chemistry } from "./chemistry";
import { english } from "./english";
import { history } from "./history";
import { maths } from "./maths";
import { physics } from "./physics";
import { societies } from "./societies";
import type { Question, Subject, Topic, Unit } from "./types";

export * from "./types";

/** Every built-in MYP subject, in the order shown on "My subjects". */
export const SUBJECTS: Subject[] = [biology, chemistry, english, maths, history, societies, physics];

export const getSubject = (slug?: string) => SUBJECTS.find((s) => s.slug === slug);

export const topicsOf = (subject: Subject): Topic[] => subject.units.flatMap((u) => u.topics);

export const questionsOf = (subject: Subject): (Question & { topicId: string })[] =>
  topicsOf(subject).flatMap((t) => t.questions.map((q) => ({ ...q, topicId: t.id })));

export const findTopic = (subject: Subject, topicId?: string): { topic: Topic; unit: Unit } | undefined => {
  for (const unit of subject.units) {
    const topic = unit.topics.find((t) => t.id === topicId);
    if (topic) return { topic, unit };
  }
  return undefined;
};

/** Which AI-chat subject preset best fits each subject. */
export const aiSubjectFor = (subject: Subject) =>
  subject.group === "Sciences" ? "science" : subject.group === "Mathematics" ? "math" : subject.slug === "english-lang-lit" ? "writing" : "general";
