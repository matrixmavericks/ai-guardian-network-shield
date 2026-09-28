// Built-in IB MYP study content. Written for Refyn; aligned to MYP year 4–5 level.

export type Question = {
  id: string;
  q: string;
  options: string[];
  /** Index of the correct option */
  answer: number;
  explain: string;
};

export type KeyTerm = { term: string; def: string };
export type Flashcard = { id: string; front: string; back: string };

export type Topic = {
  id: string;
  title: string;
  summary: string;
  /** Study guide in Markdown */
  guide: string;
  keyTerms: KeyTerm[];
  flashcards: Flashcard[];
  questions: Question[];
};

export type Unit = { id: string; title: string; topics: Topic[] };

export type SubjectTheme = {
  /** CSS gradient for the subject card and header */
  gradient: string;
  /** Solid accent used for small highlights */
  accent: string;
};

export type Subject = {
  slug: string;
  name: string;
  /** e.g. "Sciences", "Mathematics" */
  group: string;
  description: string;
  icon: "leaf" | "flask" | "atom" | "sigma" | "book" | "landmark" | "globe";
  theme: SubjectTheme;
  units: Unit[];
};

/* ---------- Compact builders so content files stay readable ---------- */

type QTuple = [question: string, options: string[], answer: number, explanation: string];

export const topic = (
  id: string,
  title: string,
  summary: string,
  guide: string,
  keyTerms: [string, string][],
  flashcards: [string, string][],
  questions: QTuple[],
): Topic => ({
  id,
  title,
  summary,
  guide: guide.trim(),
  keyTerms: keyTerms.map(([term, def]) => ({ term, def })),
  flashcards: flashcards.map(([front, back], i) => ({ id: `${id}-f${i + 1}`, front, back })),
  questions: questions.map(([q, options, answer, explain], i) => ({ id: `${id}-q${i + 1}`, q, options, answer, explain })),
});

export const unit = (id: string, title: string, topics: Topic[]): Unit => ({ id, title, topics });
