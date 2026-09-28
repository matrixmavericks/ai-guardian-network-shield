import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Lightbulb, PartyPopper, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { findTopic, getSubject, topicsOf } from "@/content/myp";
import { ghostBtn } from "@/components/student/ui";
import { Crumbs, Markdown, StudyShell, SubjectBadge, lessonSteps, primaryBtn } from "@/components/subjects/kit";
import { useStudy } from "@/components/subjects/store";
import { SubjectMissing } from "./SubjectPage";

/** A topic's guide, one section per step, then a two-question check. */
const LessonPlayer = () => {
  const { slug, id } = useParams();
  const subject = getSubject(slug);
  const found = subject ? findTopic(subject, id) : undefined;
  const study = useStudy();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const guide = found?.topic.guide;
  const sections = useMemo(() => (guide ? lessonSteps(guide) : []), [guide]);
  const checks = found ? found.topic.questions.slice(0, 2) : [];

  useEffect(() => {
    setStep(0);
    setAnswers({});
    if (subject && found) study.visit({ subject: subject.slug, path: `/subjects/${subject.slug}/lesson/${found.topic.id}`, label: `Lesson: ${found.topic.title} · ${subject.name}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!subject || !found) return <SubjectMissing />;
  const { topic, unit } = found;
  const all = topicsOf(subject);
  const nextTopic = all[all.indexOf(topic) + 1];
  const total = sections.length + 2; // sections + check + finish
  const onCheck = step === sections.length;
  const finished = step === sections.length + 1;
  const checked = checks.every((q) => answers[q.id] !== undefined);

  const answer = (qid: string, choice: number, correct: number) => {
    if (answers[qid] !== undefined) return;
    setAnswers((a) => ({ ...a, [qid]: choice }));
    study.answer(qid, choice, choice === correct);
  };

  const go = (n: number) => {
    if (n === sections.length + 1) study.markRead(topic.id, true);
    setStep(n);
  };

  const score = checks.filter((q) => answers[q.id] === q.answer).length;

  return (
    <StudyShell>
      <Crumbs
        items={[
          { label: "My subjects", to: "/my-courses" },
          { label: subject.name, to: `/subjects/${subject.slug}` },
          { label: "Lessons", to: `/subjects/${subject.slug}/lessons` },
          { label: topic.title },
        ]}
      />

      <div className="mx-auto mt-6 max-w-[780px]">
        <div className="flex items-center gap-3">
          <SubjectBadge subject={subject} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] text-lp-mute">{unit.title}</p>
            <h1 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-white">{topic.title}</h1>
          </div>
          <span className="shrink-0 text-[12.5px] tabular-nums text-lp-mute">
            Step {Math.min(step + 1, total)} of {total}
          </span>
        </div>

        <div className="mt-4 flex gap-1" aria-hidden>
          {Array.from({ length: total }).map((_, n) => (
            <div key={n} className="h-1.5 flex-1 overflow-hidden rounded-full bg-lp-line">
              <div className={cn("h-full rounded-full bg-gradient-to-r from-lp-blue to-lp-cyan transition-[width] duration-500", n <= step ? "w-full" : "w-0")} />
            </div>
          ))}
        </div>

        <div key={step} className="lp-fade mt-6 rounded-3xl border border-lp-line bg-lp-surface/70 p-6 sm:p-8" style={{ animationFillMode: "both" }}>
          {step < sections.length && (
            <>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-sky">
                {step === 0 ? "Let's start" : `Part ${step + 1}`}
              </p>
              {sections[step].title && <h2 className="mt-1.5 text-[24px] font-semibold leading-tight tracking-[-0.025em] text-white">{sections[step].title}</h2>}
              <Markdown source={sections[step].body} className="lp-guide mt-4" />
            </>
          )}

          {onCheck && (
            <>
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-lp-sky">
                <Lightbulb className="h-3.5 w-3.5" /> Quick check
              </p>
              <h2 className="mt-1.5 text-[24px] font-semibold tracking-[-0.025em] text-white">Did it stick?</h2>
              <div className="mt-5 space-y-6">
                {checks.map((q, qi) => {
                  const picked = answers[q.id];
                  return (
                    <div key={q.id}>
                      <p className="text-[15.5px] font-medium text-white">
                        {qi + 1}. {q.q}
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {q.options.map((o, n) => {
                          const state = picked === undefined ? "idle" : n === q.answer ? "correct" : n === picked ? "wrong" : "dim";
                          return (
                            <button
                              key={n}
                              type="button"
                              disabled={picked !== undefined}
                              onClick={() => answer(q.id, n, q.answer)}
                              className={cn(
                                "flex items-center gap-2 rounded-xl border px-3.5 py-3 text-left text-[14px] transition-colors",
                                state === "idle" && "border-lp-line bg-lp-deep/40 text-lp-text hover:border-lp-sky/50",
                                state === "correct" && "border-lp-green/60 bg-lp-green/10 text-white",
                                state === "wrong" && "border-lp-red/60 bg-lp-red/10 text-white",
                                state === "dim" && "border-lp-line/60 text-lp-mute",
                              )}
                            >
                              {state === "correct" && <Check className="h-4 w-4 shrink-0 text-lp-green" />}
                              {state === "wrong" && <X className="h-4 w-4 shrink-0 text-lp-red" />}
                              {o}
                            </button>
                          );
                        })}
                      </div>
                      {picked !== undefined && <p className="mt-2 text-[13px] leading-relaxed text-lp-mute">{q.explain}</p>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {finished && (
            <div className="py-4 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-lp-green/15 text-lp-green">
                <PartyPopper className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-[24px] font-semibold tracking-[-0.025em] text-white">Lesson complete</h2>
              <p className="mt-1 text-[14px] text-lp-soft">
                {score}/{checks.length} on the quick check. {topic.title} is marked as read.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {nextTopic && (
                  <Link to={`/subjects/${subject.slug}/lesson/${nextTopic.id}`} className={primaryBtn}>
                    Next: {nextTopic.title} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                <Link to={`/subjects/${subject.slug}/questionbank?topic=${topic.id}`} className={ghostBtn}>
                  Practise all {topic.questions.length} questions
                </Link>
                <Link to={`/subjects/${subject.slug}/flashcards?topic=${topic.id}`} className={ghostBtn}>
                  Flashcards
                </Link>
              </div>
            </div>
          )}
        </div>

        {!finished && (
          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => go(step - 1)} disabled={step === 0} className={ghostBtn}>
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button type="button" onClick={() => go(step + 1)} disabled={onCheck && !checked} className={primaryBtn}>
              {onCheck ? "Finish lesson" : step === sections.length - 1 ? "Quick check" : "Continue"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </StudyShell>
  );
};

export default LessonPlayer;
