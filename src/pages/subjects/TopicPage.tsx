import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FlaskConical,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardPen,
  Compass,
  Eye,
  GraduationCap,
  Layers,
  ListChecks,
  Loader2,
  MessageCircleQuestion,
  PenLine,
  Sparkles,
  Target,
  Users,
  Wand2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { tone } from "@/lib/portalAppearance";
import { findTopic, getSubject, type Question, type Subject, type Topic, type Unit } from "@/content/myp";
import { criterionName, depthOf, type ExamQuestion, type TopicDepth } from "@/content/myp/depth";
import { Crumbs, Markdown, StatusIcon, StudyShell, SubjectGlyph, primaryBtn } from "@/components/subjects/kit";
import { EmptyState, Panel, PanelHead, Ring, chip, ghostBtn } from "@/components/student/ui";
import { useStoredState } from "@/components/assistant/storage";
import { DiagramView } from "@/components/studio/diagrams";
import { extractJson } from "@/components/studio/worksheet";
import { STATUS_META, examScore, isSaved, latest, topicScore, topicStatus, useStudy, type StudyState } from "@/components/subjects/store";
import { loadClassProgress, useCourseLinks, type StudentProgress } from "@/components/subjects/classCourses";
import { SubjectMissing } from "./SubjectPage";
import { SimStrip } from "@/components/sims/SimCards";
import { simsForTopic } from "@/components/sims/registry";

/* ---------- Path ---------- */

type StepId = "learn" | "worked" | "terms" | "check" | "exam";

const stepsFor = (topic: Topic, d: TopicDepth | undefined, state: StudyState) => {
  const sc = topicScore(topic, state);
  const cardsDone = topic.flashcards.filter((f) => state.cards[f.id] !== undefined).length;
  const exam = examScore(state, d?.exam.map((q) => q.id) ?? []);
  return [
    { id: "learn" as StepId, label: "Learn", sub: state.read[topic.id] ? "Guide read" : "Read the guide", done: !!state.read[topic.id], icon: BookOpen },
    { id: "worked" as StepId, label: "Worked example", sub: (state.worked ?? {})[topic.id] ? "Done" : "Step by step", done: !!(state.worked ?? {})[topic.id], icon: Eye, hidden: !d?.worked },
    { id: "terms" as StepId, label: "Key terms", sub: `${cardsDone}/${topic.flashcards.length} cards`, done: cardsDone === topic.flashcards.length, icon: Layers },
    { id: "check" as StepId, label: "Quick check", sub: sc.answered ? `${sc.correct}/${sc.total} right` : `${sc.total} questions`, done: sc.answered === sc.total && sc.correct === sc.total, icon: ListChecks },
    { id: "exam" as StepId, label: "Exam practice", sub: exam === null ? `${d?.exam.length ?? 0} questions` : `Best ${exam}%`, done: exam !== null && exam >= 70, icon: ClipboardPen, hidden: !d?.exam.length },
  ].filter((s) => !s.hidden);
};

const scrollTo = (id: string) => document.getElementById(`topic-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

/* ---------- Worked example ---------- */

const Worked: React.FC<{ topic: Topic; d: TopicDepth; accent: string; onDone: () => void; done: boolean }> = ({ d, accent, onDone, done }) => {
  const w = d.worked!;
  const [shown, setShown] = useState(done ? w.steps.length + 1 : 0);
  const finished = shown > w.steps.length;
  return (
    <div>
      <div className="rounded-2xl border border-lp-line bg-lp-deep/40 p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-lp-mute">Problem</p>
        <p className="mt-1 text-[15px] leading-relaxed text-white">{w.problem}</p>
        {w.diagram && (
          <div className="mt-3 rounded-xl bg-[#FFFFFF] p-3">
            <DiagramView spec={w.diagram} accent={accent} className="mx-auto max-w-[420px]" />
          </div>
        )}
      </div>
      <ol className="mt-3 space-y-2">
        {w.steps.map((s, i) => (
          <li
            key={i}
            className={cn("flex gap-3 rounded-xl border px-4 py-3 text-[14px] leading-relaxed transition-all duration-500", i < shown ? "border-lp-line bg-lp-surface/60 text-lp-text" : "border-dashed border-lp-line/60 text-transparent select-none blur-[3px]")}
            aria-hidden={i >= shown}
          >
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold", i < shown ? "bg-lp-blue/20 text-lp-sky" : "bg-lp-line text-lp-mute")}>{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      {finished ? (
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-lp-green/40 bg-lp-green/10 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-lp-green" />
          <p className="text-[14.5px] text-white">
            <span className="font-semibold">Answer: </span>
            {w.answer}
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const next = shown + 1;
              setShown(next);
              if (next > w.steps.length) onDone();
            }}
            className={primaryBtn}
          >
            {shown < w.steps.length ? (
              <>
                <Eye className="h-4 w-4" /> {shown === 0 ? "Show the first step" : "Next step"}
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Show the answer
              </>
            )}
          </button>
          {shown === 0 && <span className="self-center text-[12.5px] text-lp-mute">Try it yourself first, then check each step.</span>}
        </div>
      )}
    </div>
  );
};

/* ---------- Quick check ---------- */

const QuickCheck: React.FC<{ topic: Topic; state: StudyState; answer: (id: string, choice: number, ok: boolean) => void }> = ({ topic, state, answer }) => {
  const [picked, setPicked] = useState<Record<string, number>>({});
  return (
    <div className="space-y-4">
      {topic.questions.map((q: Question, qi) => {
        const prev = latest(state, q.id);
        const choice = picked[q.id];
        const done = choice !== undefined;
        return (
          <div key={q.id} className="rounded-2xl border border-lp-line bg-lp-deep/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[14.5px] font-medium leading-relaxed text-white">
                <span className="mr-2 text-lp-mute">{qi + 1}.</span>
                {q.q}
              </p>
              {prev && !done && (
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", prev.ok ? "bg-lp-green/15 text-lp-green" : "bg-lp-red/15 text-lp-red")}>{prev.ok ? "Right last time" : "Wrong last time"}</span>
              )}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.options.map((o, i) => {
                const isRight = i === q.answer;
                const state = !done ? "idle" : isRight ? "right" : i === choice ? "wrong" : "dim";
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={done}
                    onClick={() => {
                      setPicked((p) => ({ ...p, [q.id]: i }));
                      answer(q.id, i, isRight);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-[13.5px] transition-colors",
                      state === "idle" && "border-lp-line text-lp-text hover:border-lp-sky/50 hover:bg-lp-blue/10",
                      state === "right" && "border-lp-green/60 bg-lp-green/10 text-white",
                      state === "wrong" && "border-lp-red/60 bg-lp-red/10 text-white",
                      state === "dim" && "border-lp-line text-lp-mute",
                    )}
                  >
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold", state === "right" ? "border-lp-green bg-lp-green text-[#03060F]" : state === "wrong" ? "border-lp-red bg-lp-red text-[#03060F]" : "border-lp-line text-lp-mute")}>
                      {state === "right" ? <Check className="h-3.5 w-3.5" /> : state === "wrong" ? <XCircle className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
                    </span>
                    {o}
                  </button>
                );
              })}
            </div>
            {done && <p className={cn("mt-3 rounded-xl px-3 py-2 text-[13px] leading-relaxed", choice === q.answer ? "bg-lp-green/10 text-lp-soft" : "bg-lp-red/10 text-lp-soft")}>{q.explain}</p>}
          </div>
        );
      })}
      <button type="button" onClick={() => setPicked({})} className="text-[12.5px] text-lp-sky hover:text-white">
        Try again
      </button>
    </div>
  );
};

/* ---------- Exam practice ---------- */

type Marking = { awarded: number[]; feedback?: string; next?: string; by: "self" | "refyn" };

const ExamCard: React.FC<{ q: ExamQuestion; n: number; subject: Subject; accent: string; state: StudyState; save: (score: number, max: number, by: "self" | "refyn") => void; draftKey: string | null }> = ({ q, n, subject, accent, state, save, draftKey }) => {
  const [drafts, setDrafts] = useStoredState<Record<string, string>>(draftKey, {});
  const text = drafts[q.id] ?? "";
  const [marking, setMarking] = useState<Marking | null>(null);
  const [scheme, setScheme] = useState(false);
  const [ticks, setTicks] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const best = (state.exam ?? {})[q.id]?.reduce((m, a) => Math.max(m, a.score), 0);
  const score = (idx: number[]) => Math.min(q.marks, idx.length);

  const aiMark = async () => {
    if (text.trim().length < 12) {
      toast.error("Write a bit more before asking Refyn to mark it");
      return;
    }
    setBusy(true);
    try {
      const prompt = [
        `You are an experienced IB MYP ${subject.group} examiner. Mark a student's answer fairly and kindly.`,
        `Question (${q.command}, ${q.marks} marks, criterion ${q.criterion}): ${q.prompt}`,
        `Mark scheme, one mark per point:\n${q.points.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
        `Student answer:\n"""${text.slice(0, 3000)}"""`,
        'Award a point only if the answer clearly makes it (allow equivalent wording). Return ONLY JSON: {"awarded":[1,3],"feedback":"one or two sentences to the student","next":"one concrete way to earn more marks"}',
      ].join("\n\n");
      const { data, error } = await supabase.functions.invoke("ai-chat", { body: { prompt, subject: subject.name, gradeLevel: "high-school", processTeaching: false, sessionId: null, history: [] } });
      if (error) throw error;
      const reply = String(data?.reply ?? "");
      const out = extractJson(reply) as { awarded?: unknown; feedback?: string; next?: string };
      const awarded = (Array.isArray(out.awarded) ? out.awarded : []).map(Number).filter((x) => x >= 1 && x <= q.points.length).map((x) => x - 1);
      const m: Marking = { awarded: [...new Set(awarded)], feedback: out.feedback, next: out.next, by: "refyn" };
      setMarking(m);
      setScheme(true);
      setTicks(new Set(m.awarded));
      save(score(m.awarded), q.marks, "refyn");
    } catch {
      toast.error("Refyn couldn't mark this just now. Use the mark scheme to mark it yourself.");
      setScheme(true);
    } finally {
      setBusy(false);
    }
  };

  const selfMark = () => {
    const idx = [...ticks];
    setMarking({ awarded: idx, by: "self" });
    save(score(idx), q.marks, "self");
  };

  return (
    <div className="rounded-2xl border border-lp-line bg-lp-deep/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full text-[12.5px] font-bold text-white lp-keep" style={{ background: accent }}>
          {n}
        </span>
        <span className="rounded-full bg-lp-blue/15 px-2.5 py-0.5 text-[11.5px] font-semibold text-lp-sky">{q.command}</span>
        <span className="rounded-full bg-lp-raised px-2.5 py-0.5 text-[11.5px] text-lp-soft" title={criterionName(subject.group, q.criterion)}>
          Criterion {q.criterion} · {criterionName(subject.group, q.criterion)}
        </span>
        <span className="ml-auto text-[12px] font-semibold tabular-nums text-lp-soft">
          [{q.marks}] {best !== undefined && <span className="ml-1 font-normal text-lp-mute">best {best}/{q.marks}</span>}
        </span>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-white">{q.prompt}</p>
      {q.diagram && (
        <div className="mt-3 rounded-xl bg-[#FFFFFF] p-3">
          <DiagramView spec={q.diagram} accent={accent} className="mx-auto max-w-[440px]" />
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
        rows={Math.max(3, Math.min(10, q.marks + 1))}
        placeholder="Write your answer here. It's saved as you type."
        className="mt-3 w-full resize-y rounded-xl border border-lp-line bg-lp-deep/50 p-3 text-[14px] leading-relaxed text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={aiMark} disabled={busy} className={cn(primaryBtn, "h-9")}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Mark with Refyn
        </button>
        <button type="button" onClick={() => setScheme((v) => !v)} className={cn(ghostBtn, "h-9")}>
          <ChevronDown className={cn("h-4 w-4 transition-transform", scheme && "rotate-180")} /> {scheme ? "Hide" : "Mark it myself"}
        </button>
        <span className="text-[11.5px] text-lp-mute">{text.trim() ? `${text.trim().split(/\s+/).length} words` : ""}</span>
      </div>

      {scheme && (
        <div className="mt-3 rounded-xl border border-lp-line bg-lp-surface/60 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-lp-mute">Mark scheme: tick each point your answer makes</p>
          <ul className="mt-2 space-y-1.5">
            {q.points.map((p, i) => {
              const on = ticks.has(i);
              const ai = marking?.by === "refyn" && marking.awarded.includes(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(ticks);
                      if (on) next.delete(i);
                      else next.add(i);
                      setTicks(next);
                    }}
                    className={cn("flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13.5px] transition-colors", on ? "bg-lp-green/10 text-white" : "text-lp-soft hover:bg-white/[0.04]")}
                  >
                    <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border", on ? "border-lp-green bg-lp-green text-[#03060F]" : "border-lp-line")}>{on && <Check className="h-3 w-3" />}</span>
                    <span className="flex-1">{p}</span>
                    {ai && <span className="shrink-0 text-[10.5px] font-medium text-lp-cyan">Refyn ✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={selfMark} className={cn(ghostBtn, "h-9")}>
              <Check className="h-4 w-4" /> Save my mark: {Math.min(q.marks, ticks.size)}/{q.marks}
            </button>
          </div>
        </div>
      )}

      {marking && (
        <div className={cn("mt-3 rounded-xl border px-4 py-3", score(marking.awarded) >= q.marks * 0.7 ? "border-lp-green/40 bg-lp-green/10" : "border-lp-amber/40 bg-lp-amber/10")}>
          <p className="text-[14px] font-semibold text-white">
            {score(marking.awarded)}/{q.marks} {marking.by === "refyn" ? "· marked by Refyn" : "· self-marked"}
          </p>
          {marking.feedback && <p className="mt-1 text-[13.5px] leading-relaxed text-lp-soft">{marking.feedback}</p>}
          {marking.next && (
            <p className="mt-1.5 flex items-start gap-2 text-[13.5px] leading-relaxed text-lp-soft">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-lp-sky" /> {marking.next}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/* ---------- Teacher view: class pulse on this topic ---------- */

const ClassPulse: React.FC<{ subject: Subject; topic: Topic }> = ({ subject, topic }) => {
  const { links } = useCourseLinks();
  const mine = links.filter((l) => l.subject === subject.slug);
  const [data, setData] = useState<Record<string, StudentProgress[]>>({});
  useEffect(() => {
    mine.forEach((l) => {
      if (data[l.classId]) return;
      loadClassProgress(l.classId, subject).then((rows) => setData((d) => ({ ...d, [l.classId]: rows })));
    });
  }, [mine.map((l) => l.classId).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!mine.length)
    return (
      <p className="mt-2 text-[13px] leading-relaxed text-lp-mute">
        Link a class to {subject.name} to see how your students are doing on this topic.{" "}
        <Link to={`/subjects/${subject.slug}?tab=classes`} className="text-lp-sky hover:text-white">
          Link a class
        </Link>
      </p>
    );
  return (
    <div className="mt-3 space-y-3">
      {mine.map((l) => {
        const rows = data[l.classId];
        const counts: Record<string, number> = {};
        rows?.forEach((r) => (counts[r.statuses[topic.id]] = (counts[r.statuses[topic.id]] ?? 0) + 1));
        const struggling = rows?.filter((r) => ["unfamiliar", "unseen"].includes(r.statuses[topic.id])) ?? [];
        return (
          <div key={l.id} className="rounded-xl border border-lp-line bg-lp-deep/40 p-3">
            <p className="text-[13.5px] font-medium text-white">{l.className}</p>
            {!rows ? (
              <div className="lp-skeleton mt-2 h-4 rounded" />
            ) : rows.length ? (
              <>
                <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-lp-line">
                  {(["mastered", "proficient", "familiar", "learning", "unfamiliar", "unseen"] as const).map((st) =>
                    counts[st] ? <span key={st} style={{ width: `${(counts[st] / rows.length) * 100}%`, background: STATUS_META[st].color }} title={`${STATUS_META[st].label}: ${counts[st]}`} /> : null,
                  )}
                </div>
                <p className="mt-2 text-[12px] text-lp-mute">
                  {(counts.mastered ?? 0) + (counts.proficient ?? 0)} of {rows.length} secure · {struggling.length} not started or struggling
                </p>
              </>
            ) : (
              <p className="mt-1 text-[12px] text-lp-mute">No students yet.</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Page ---------- */

const TopicPage = () => {
  const { slug, id } = useParams();
  const { user } = useAuth();
  const subject = getSubject(slug);
  const found = subject && id ? findTopic(subject, id) : undefined;
  const study = useStudy();
  const { state } = study;
  const { links } = useCourseLinks();
  const [guideOpen, setGuideOpen] = useState(false);
  const teacher = user?.role === "teacher" || user?.role === "admin";

  useEffect(() => {
    if (subject && found) study.visit({ subject: subject.slug, path: `/subjects/${subject.slug}/topic/${found.topic.id}`, label: `${found.topic.title} · ${subject.name}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject?.slug, found?.topic.id]);

  const d = found ? depthOf(found.topic.id) : undefined;
  const steps = useMemo(() => (found ? stepsFor(found.topic, d, state) : []), [found, d, state]);

  if (!subject || !found) return <SubjectMissing />;
  const { topic, unit } = found as { topic: Topic; unit: Unit };
  const unitIndex = subject.units.findIndex((u) => u.id === unit.id);
  const st = topicStatus(topic, state);
  const done = steps.filter((s) => s.done).length;
  const focusFrom = links.filter((l) => l.subject === subject.slug && l.focusUnits.includes(unit.id));
  const saved = isSaved(state, "topic", topic.id);
  const accent = subject.theme.accent;
  const all = subject.units.flatMap((u) => u.topics);
  const idx = all.findIndex((t) => t.id === topic.id);
  const next = all[idx + 1];
  const prev = all[idx - 1];
  const base = `/subjects/${subject.slug}`;
  const firstSection = topic.guide.split(/\n(?=##\s)/)[0];

  return (
    <StudyShell wide>
      <Crumbs items={[{ label: "My subjects", to: "/my-courses" }, { label: subject.name, to: base }, { label: `Unit ${unitIndex + 1}`, to: `${base}?tab=topics` }, { label: topic.title }]} />

      {/* Hero */}
      <section className="lp-fade relative mt-4 overflow-hidden rounded-3xl border border-lp-line bg-lp-surface p-5 sm:p-7" style={{ animationFillMode: "both" }}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ background: subject.theme.gradient }} />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-20" style={{ background: `radial-gradient(70% 90% at 100% 0%, ${accent}, transparent 70%)` }} />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-[min(100%,20rem)] flex-1 items-start gap-4">
            <span className="lp-keep flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14" style={{ background: subject.theme.gradient }}>
              <SubjectGlyph subject={subject} className="h-6 w-6 text-white sm:h-7 sm:w-7" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">
                {subject.name} · Unit {unitIndex + 1}: {unit.title}
              </p>
              <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[32px]">{topic.title}</h1>
              <p className="mt-1 max-w-[640px] text-[14.5px] text-lp-soft">{topic.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ color: tone(STATUS_META[st].color), background: `${STATUS_META[st].color}1A` }}>
                  <StatusIcon status={st} size={14} /> {STATUS_META[st].label}
                </span>
                {focusFrom.map((l) => (
                  <span key={l.id} className="inline-flex items-center gap-1.5 rounded-full bg-lp-blue/15 px-2.5 py-1 text-[12px] font-medium text-lp-sky">
                    <Users className="h-3.5 w-3.5" /> {teacher ? `${l.className} is here` : `Your class is on this unit`}
                  </span>
                ))}
                {d && <span className={chip}>{d.context.global}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Ring value={(done / Math.max(1, steps.length)) * 100} size={78} label={`${done}/${steps.length}`} tone={done === steps.length ? "green" : "blue"} />
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => study.toggleSaved({ kind: "topic", id: topic.id, subject: subject.slug })} className={cn(ghostBtn, "h-9")}>
                {saved ? <BookmarkCheck className="h-4 w-4 text-lp-sky" /> : <Bookmark className="h-4 w-4" />} {saved ? "Saved" : "Save"}
              </button>
              <Link to={`/ai-learning-assistant?prompt=${encodeURIComponent(`Help me understand "${topic.title}" in ${subject.name}. Start by asking what I already know.`)}`} className={cn(ghostBtn, "h-9")}>
                <Sparkles className="h-4 w-4" /> Ask Refyn
              </Link>
            </div>
          </div>
        </div>

        {/* Path */}
        <ol data-tour="topic-steps" className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.id}>
              <button type="button" onClick={() => scrollTo(s.id)} className={cn("group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors", s.done ? "border-lp-green/40 bg-lp-green/10" : "border-lp-line bg-lp-deep/40 hover:border-lp-sky/40")}>
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold", s.done ? "bg-lp-green text-[#03060F]" : "bg-lp-raised text-lp-soft")}>
                  {s.done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-white">{s.label}</span>
                  <span className="block truncate text-[11.5px] text-lp-mute">{s.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {/* Learn */}
          <Panel className="scroll-mt-6 p-5 sm:p-6" delay={40} as="section">
            <div id="topic-learn" className="scroll-mt-6" />
            <PanelHead
              title="1 · Learn"
              icon={BookOpen}
              meta={
                <Link to={`${base}/guide/${topic.id}`} className="inline-flex items-center gap-1 text-lp-sky hover:text-white">
                  Full study guide <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className={cn("relative mt-4 overflow-hidden", !guideOpen && "max-h-[340px]")}>
              <Markdown source={guideOpen ? topic.guide : firstSection} />
              {!guideOpen && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-lp-surface to-transparent" />}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setGuideOpen((v) => !v)} className={cn(ghostBtn, "h-9")}>
                <ChevronDown className={cn("h-4 w-4 transition-transform", guideOpen && "rotate-180")} /> {guideOpen ? "Show less" : "Read the whole guide here"}
              </button>
              <button type="button" onClick={() => study.markRead(topic.id, !state.read[topic.id])} className={cn(state.read[topic.id] ? ghostBtn : primaryBtn, "h-9")}>
                <Check className="h-4 w-4" /> {state.read[topic.id] ? "Read ✓" : "Mark as read"}
              </button>
              <Link to={`${base}/lesson/${topic.id}`} className={cn(ghostBtn, "h-9")}>
                <GraduationCap className="h-4 w-4" /> Lesson mode
              </Link>
            </div>
            {d?.diagrams.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {d.diagrams.map((g, i) => (
                  <figure key={i} className={cn("rounded-2xl border border-lp-line bg-[#FFFFFF] p-3", d.diagrams.length === 1 && "md:col-span-2")}>
                    <DiagramView spec={g.spec} accent={accent} className="mx-auto max-w-[480px]" />
                    <figcaption className="mt-2 px-1 text-center text-[12.5px] leading-snug text-[#475569]">{g.caption}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
          </Panel>

          {/* Simulations for this topic */}
          {simsForTopic(topic.id).length > 0 && (
            <Panel className="p-5 sm:p-6" delay={55} as="section">
              <PanelHead
                title="See it move"
                icon={FlaskConical}
                meta={<Link to="/sims" className="inline-flex items-center gap-1 text-lp-sky hover:text-white">All simulations <ArrowRight className="h-3.5 w-3.5" /></Link>}
              />
              <p className="mt-1 text-[13px] text-lp-mute">Interactive simulations for this topic: change one thing, watch what happens, and record your results.</p>
              <SimStrip sims={simsForTopic(topic.id)} className="mt-4" />
            </Panel>
          )}

          {/* Worked example */}
          {d?.worked && (
            <Panel className="p-5 sm:p-6" delay={70} as="section">
              <div id="topic-worked" className="scroll-mt-6" />
              <PanelHead title="2 · Worked example" icon={Eye} meta={(state.worked ?? {})[topic.id] ? "Done" : undefined} />
              <div className="mt-4">
                <Worked topic={topic} d={d} accent={accent} done={!!(state.worked ?? {})[topic.id]} onDone={() => study.markWorked(topic.id)} />
              </div>
            </Panel>
          )}

          {/* Key terms */}
          <Panel className="p-5 sm:p-6" delay={90} as="section">
            <div id="topic-terms" className="scroll-mt-6" />
            <PanelHead
              title={`${d?.worked ? 3 : 2} · Key terms`}
              icon={Layers}
              meta={
                <Link to={`${base}/flashcards?topic=${topic.id}`} className="inline-flex items-center gap-1 text-lp-sky hover:text-white">
                  Flashcards <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {topic.keyTerms.map((k) => (
                <div key={k.term} className="rounded-xl border border-lp-line bg-lp-deep/30 px-3.5 py-2.5">
                  <dt className="text-[13.5px] font-semibold text-white">{k.term}</dt>
                  <dd className="mt-0.5 text-[13px] leading-snug text-lp-soft">{k.def}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              {topic.flashcards.map((f) => {
                const v = state.cards[f.id];
                return (
                  <span key={f.id} className={cn("rounded-full px-2.5 py-0.5 text-[11.5px]", v === true ? "bg-lp-green/15 text-lp-green" : v === false ? "bg-lp-amber/15 text-lp-amber" : "bg-lp-raised text-lp-mute")} title={f.front}>
                    {v === true ? "Known" : v === false ? "Learning" : "New"}: {f.front.length > 28 ? `${f.front.slice(0, 27)}…` : f.front}
                  </span>
                );
              })}
            </div>
          </Panel>

          {/* Quick check */}
          <Panel className="p-5 sm:p-6" delay={110} as="section">
            <div id="topic-check" className="scroll-mt-6" />
            <PanelHead title={`${d?.worked ? 4 : 3} · Quick check`} icon={ListChecks} meta={`${topicScore(topic, state).correct}/${topic.questions.length} right last time`} />
            <div className="mt-4">
              <QuickCheck topic={topic} state={state} answer={study.answer} />
            </div>
          </Panel>

          {/* Exam practice */}
          {d?.exam.length ? (
            <Panel className="p-5 sm:p-6" delay={130} as="section">
              <div id="topic-exam" className="scroll-mt-6" />
              <PanelHead title={`${d.worked ? 5 : 4} · Exam practice`} icon={ClipboardPen} meta="MYP command terms and criteria" />
              <p className="mt-2 text-[13px] leading-relaxed text-lp-mute">Answer like a real paper, then let Refyn mark it against the mark scheme, or tick the points yourself.</p>
              <div className="mt-4 space-y-4">
                {d.exam.map((q, i) => (
                  <ExamCard key={q.id} q={q} n={i + 1} subject={subject} accent={accent} state={state} save={(score, max, by) => study.saveExam(q.id, score, max, by)} draftKey={user ? `refyn:${user.id}:exam-drafts` : null} />
                ))}
              </div>
            </Panel>
          ) : null}

          {/* Next */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {prev ? (
              <Link to={`${base}/topic/${prev.id}`} className={ghostBtn}>
                ← {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={`${base}/topic/${next.id}`} className={primaryBtn}>
                Next: {next.title} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Side */}
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          {d && (
            <Panel className="p-5" delay={60}>
              <PanelHead title="By the end you can" icon={Target} />
              <ul className="mt-3 space-y-2">
                {d.objectives.map((o, i) => {
                  const ok = i < done;
                  return (
                    <li key={o} className="flex gap-2.5 text-[13.5px] leading-snug text-lp-soft">
                      <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full", ok ? "bg-lp-green text-[#03060F]" : "border border-lp-line")}>{ok && <Check className="h-3 w-3" />}</span>
                      {o}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
          {d && (
            <Panel className="p-5" delay={90}>
              <PanelHead title="Why it matters" icon={Compass} />
              <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-lp-sky">Global context: {d.context.global}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-lp-soft">{d.context.hook}</p>
            </Panel>
          )}
          {d?.mistakes.length ? (
            <Panel className="p-5" delay={120}>
              <PanelHead title="Common mistakes" icon={AlertTriangle} />
              <ul className="mt-3 space-y-2">
                {d.mistakes.map((m) => (
                  <li key={m} className="flex gap-2.5 text-[13px] leading-snug text-lp-soft">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-lp-red" /> {m}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
          <Panel className="p-5" delay={150}>
            <PanelHead title="Go further" icon={Sparkles} />
            <div className="mt-3 grid gap-2">
              <Link to={`${base}/teach?topic=${topic.id}`} className="flex items-center gap-3 rounded-xl border border-lp-line p-3 text-[13.5px] text-white hover:border-lp-sky/40">
                <MessageCircleQuestion className="h-4 w-4 text-lp-cyan" /> Teach it to Refyn
              </Link>
              <Link to={`${base}/questionbank?topic=${topic.id}`} className="flex items-center gap-3 rounded-xl border border-lp-line p-3 text-[13.5px] text-white hover:border-lp-sky/40">
                <PenLine className="h-4 w-4 text-lp-sky" /> Timed practice on this topic
              </Link>
            </div>
          </Panel>
          {teacher && (
            <Panel className="p-5" delay={180}>
              <PanelHead title="Your classes on this topic" icon={Users} />
              <ClassPulse subject={subject} topic={topic} />
            </Panel>
          )}
          {!d && <EmptyState icon={BookOpen} title="More coming" body="Worked examples and exam practice for this topic are on the way." />}
        </aside>
      </div>
    </StudyShell>
  );
};

export default TopicPage;
