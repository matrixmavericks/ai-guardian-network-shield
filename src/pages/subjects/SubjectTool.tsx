import React, { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getSubject, type Subject } from "@/content/myp";
import { StudyShell } from "@/components/subjects/kit";
import { useStudy } from "@/components/subjects/store";
import { ExamBuilder, MistakesLog, Questionbank } from "./Practice";
import { CheatsheetList, Definitions, GuideList, LessonList, TeachRefyn } from "./Library";
import { Flashcards } from "./Flashcards";
import { SubjectMissing } from "./SubjectPage";

const TOOLS: Record<string, { label: string; wide?: boolean; Page: React.FC<{ subject: Subject }> }> = {
  questionbank: { label: "Questionbank", wide: true, Page: Questionbank },
  exam: { label: "Exam builder", wide: true, Page: ExamBuilder },
  mistakes: { label: "Mistakes log", Page: MistakesLog },
  teach: { label: "Teach Refyn", wide: true, Page: TeachRefyn },
  guides: { label: "Study guide", Page: GuideList },
  lessons: { label: "Lessons", Page: LessonList },
  flashcards: { label: "Flashcards", Page: Flashcards },
  cheatsheets: { label: "Cheatsheets", Page: CheatsheetList },
  definitions: { label: "Key definitions", Page: Definitions },
};

/** /subjects/:slug/:tool, one page per resource on the subject's Resources tab. */
const SubjectTool = () => {
  const { slug, tool } = useParams();
  const [params] = useSearchParams();
  const subject = getSubject(slug);
  const entry = tool ? TOOLS[tool] : undefined;
  const { visit } = useStudy();

  useEffect(() => {
    if (subject && entry) visit({ subject: subject.slug, path: `/subjects/${subject.slug}/${tool}`, label: `${entry.label} · ${subject.name}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject?.slug, tool]);

  if (!subject || !entry) return <SubjectMissing />;
  const { Page } = entry;
  return (
    <StudyShell wide={entry.wide}>
      {/* Keyed so each subject/tool starts with fresh state */}
      <Page key={`${subject.slug}/${tool}/${params.get("topic") ?? ""}`} subject={subject} />
    </StudyShell>
  );
};

export default SubjectTool;
