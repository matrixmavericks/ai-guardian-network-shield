import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Bookmark, BookmarkCheck, BookOpen, BookText, Check, MessageCircleQuestion, PlayCircle, ScrollText, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { topicsOf, type Subject, type Topic } from "@/content/myp";
import { EmptyState, chip } from "@/components/student/ui";
import { StatusIcon, ToolHeader, lessonSteps, primaryBtn } from "@/components/subjects/kit";
import { isSaved, topicStatus, useStudy, type StudyState } from "@/components/subjects/store";

const minutesToRead = (t: Topic) => Math.max(2, Math.round(t.guide.split(/\s+/).length / 180));

/** Units with a row per topic; `row` renders the right-hand side. */
const UnitList: React.FC<{
  subject: Subject;
  state: StudyState;
  href: (t: Topic) => string;
  meta: (t: Topic) => React.ReactNode;
}> = ({ subject, state, href, meta }) => (
  <div className="space-y-4">
    {subject.units.map((u, ui) => (
      <section key={u.id} className="lp-fade overflow-hidden rounded-3xl border border-lp-line bg-lp-surface/70" style={{ animationDelay: `${ui * 60}ms`, animationFillMode: "both" }}>
        <div className="border-b border-lp-line px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">Unit {ui + 1}</p>
          <h2 className="text-[15.5px] font-medium text-white">{u.title}</h2>
        </div>
        <ul className="divide-y divide-lp-line/70">
          {u.topics.map((t) => (
            <li key={t.id}>
              <Link to={href(t)} className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03]">
                <StatusIcon status={topicStatus(t, state)} size={20} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-white group-hover:text-lp-sky">{t.title}</span>
                  <span className="block truncate text-[12.5px] text-lp-mute">{t.summary}</span>
                </span>
                <span className="hidden shrink-0 items-center gap-2 sm:flex">{meta(t)}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-lp-mute transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
);

const ReadBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-lp-green/15 px-2 py-0.5 text-[11px] font-medium text-lp-green">
    <Check className="h-3 w-3" /> Read
  </span>
);

export const GuideList: React.FC<{ subject: Subject }> = ({ subject }) => {
  const { state } = useStudy();
  return (
    <>
      <ToolHeader subject={subject} title="Study guide" body="Clear notes for every topic, with worked examples and exam tips." icon={BookOpen} accent="#34D399" />
      <div className="mt-6">
        <UnitList
          subject={subject}
          state={state}
          href={(t) => `/subjects/${subject.slug}/guide/${t.id}`}
          meta={(t) => (state.read[t.id] ? <ReadBadge /> : <span className="text-[12px] text-lp-mute">{minutesToRead(t)} min read</span>)}
        />
      </div>
    </>
  );
};

export const LessonList: React.FC<{ subject: Subject }> = ({ subject }) => {
  const { state } = useStudy();
  return (
    <>
      <ToolHeader subject={subject} title="Lessons" body="Step-by-step walkthroughs of each topic that end with a quick check." icon={PlayCircle} accent="#FBBF24" />
      <div className="mt-6">
        <UnitList
          subject={subject}
          state={state}
          href={(t) => `/subjects/${subject.slug}/lesson/${t.id}`}
          meta={(t) => (state.read[t.id] ? <ReadBadge /> : <span className="text-[12px] text-lp-mute">{lessonSteps(t.guide).length + 2} steps</span>)}
        />
      </div>
    </>
  );
};

export const CheatsheetList: React.FC<{ subject: Subject }> = ({ subject }) => {
  const { state } = useStudy();
  return (
    <>
      <ToolHeader subject={subject} title="Cheatsheets" body="Each unit on one page: summaries, key terms and quick facts. Print it or save it as a PDF." icon={ScrollText} />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subject.units.map((u, ui) => (
          <Link
            key={u.id}
            to={`/subjects/${subject.slug}/cheatsheet/${u.id}`}
            className="lp-fade group overflow-hidden rounded-3xl border border-lp-line bg-lp-surface/70 transition-all hover:-translate-y-1 hover:border-white/20"
            style={{ animationDelay: `${ui * 60}ms`, animationFillMode: "both" }}
          >
            {/* A miniature of the printed page */}
            <div className="relative h-44 overflow-hidden bg-lp-deep/60 px-6 pt-5">
              <div className="mx-auto h-full w-full max-w-[230px] rounded-t-md bg-[#FFFFFF] p-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-1deg]">
                <div className="h-1 rounded-full" style={{ background: subject.theme.gradient }} />
                <p className="mt-2 text-[6.5px] font-semibold uppercase tracking-[0.2em] text-[#2563EB]">Refyn · Cheatsheet</p>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-[#0B1530]">{u.title}</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {u.topics.slice(0, 4).map((t) => (
                    <div key={t.id} className="rounded border border-[#E3E8F2] p-1.5">
                      <p className="truncate text-[6.5px] font-semibold text-[#0B1530]">{t.title}</p>
                      {[80, 95, 60, 88].map((w, i) => (
                        <div key={i} className="mt-1 h-[3px] rounded-full bg-[#E6EBF4]" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">Unit {ui + 1}</p>
                <p className="truncate text-[15px] font-medium text-white group-hover:text-lp-sky">{u.title}</p>
              </div>
              {isSaved(state, "cheatsheet", u.id) ? <BookmarkCheck className="h-4 w-4 shrink-0 text-lp-sky" /> : <span className={chip}>{u.topics.length} topics</span>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
};

/* ---------- Key definitions ---------- */

const highlight = (text: string, q: string) => {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-lp-blue/30 px-0.5 text-white">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
};

export const Definitions: React.FC<{ subject: Subject }> = ({ subject }) => {
  const [params] = useSearchParams();
  const study = useStudy();
  const [q, setQ] = useState(params.get("q") || "");
  const [view, setView] = useState<"unit" | "az">("unit");
  const terms = useMemo(
    () => subject.units.flatMap((u, ui) => u.topics.flatMap((t) => t.keyTerms.map((k) => ({ ...k, topic: t, unit: u, unitIndex: ui })))),
    [subject],
  );
  const match = terms.filter((k) => !q || k.term.toLowerCase().includes(q.toLowerCase()) || k.def.toLowerCase().includes(q.toLowerCase()));
  const sections =
    view === "unit"
      ? subject.units.map((u, ui) => ({ key: u.id, title: `Unit ${ui + 1}: ${u.title}`, items: match.filter((k) => k.unit.id === u.id) }))
      : [...new Set(match.map((k) => k.term[0].toUpperCase()))].sort().map((l) => ({ key: l, title: l, items: match.filter((k) => k.term[0].toUpperCase() === l).sort((a, b) => a.term.localeCompare(b.term)) }));

  return (
    <>
      <ToolHeader subject={subject} title="Key definitions" body={`${terms.length} key terms from every topic, in one place.`} icon={BookText} accent="#5EEAD4" />
      <div className="lp-fade sticky top-0 z-10 -mx-1 mt-6 flex flex-wrap items-center gap-2 bg-lp-bg/80 px-1 py-2 backdrop-blur" style={{ animationFillMode: "both" }}>
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search key terms</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search terms and definitions"
            className="h-10 w-full rounded-xl border border-lp-line bg-lp-surface pl-9 pr-3 text-[13.5px] text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none"
          />
        </label>
        <div role="tablist" className="flex gap-1 rounded-xl border border-lp-line bg-lp-deep/70 p-1">
          {(
            [
              ["unit", "By unit"],
              ["az", "A–Z"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn("h-8 rounded-lg px-3 text-[13px] font-medium", view === id ? "bg-lp-raised text-white" : "text-lp-mute hover:text-white")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {match.length === 0 ? (
        <EmptyState icon={Search} title="No terms match" body="Try a shorter word or check the spelling." />
      ) : (
        <div className="mt-4 space-y-7">
          {sections
            .filter((s) => s.items.length)
            .map((s) => (
              <section key={s.key}>
                <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-lp-mute">{s.title}</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {s.items.map((k) => {
                    const saved = isSaved(study.state, "term", k.term);
                    return (
                      <div key={`${k.topic.id}-${k.term}`} className="group relative rounded-2xl border border-lp-line bg-lp-surface/70 p-4 transition-colors hover:border-white/15">
                        <p className="pr-8 text-[15px] font-medium text-white">{highlight(k.term, q)}</p>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-lp-soft">{highlight(k.def, q)}</p>
                        <Link to={`/subjects/${subject.slug}/guide/${k.topic.id}`} className="mt-2.5 inline-flex items-center gap-1 text-[12px] text-lp-mute hover:text-lp-sky">
                          <BookOpen className="h-3 w-3" /> {k.topic.title}
                        </Link>
                        <button
                          type="button"
                          onClick={() => study.toggleSaved({ kind: "term", id: k.term, subject: subject.slug })}
                          aria-pressed={saved}
                          aria-label={saved ? `Remove ${k.term} from saved` : `Save ${k.term}`}
                          className={cn("absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]", saved ? "text-lp-sky" : "text-lp-mute opacity-60 group-hover:opacity-100")}
                        >
                          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
        </div>
      )}
    </>
  );
};

/* ---------- Teach Refyn ---------- */

export const TeachRefyn: React.FC<{ subject: Subject }> = ({ subject }) => {
  const { state } = useStudy();
  const topics = topicsOf(subject);
  const [params] = useSearchParams();
  const [pick, setPick] = useState(params.get("topic") || topics[0].id);
  const topic = topics.find((t) => t.id === pick) ?? topics[0];

  const brief = [
    `TEACH-BACK SESSION. The student will teach you the IB MYP ${subject.name} topic "${topic.title}".`,
    "Play a curious classmate who hasn't learned this yet. Don't lecture and don't give the answers.",
    "After each explanation, ask ONE follow-up question that probes a gap, a vague word or a missing example.",
    "When the student says they're done (or after about 6 exchanges), give short feedback: what they explained well, what was missing or wrong, and one thing to revise.",
    `Key points a good explanation covers: ${topic.keyTerms.map((k) => `${k.term} (${k.def})`).join("; ")}.`,
  ].join(" ");
  const link = `/ai-learning-assistant?${new URLSearchParams({
    resourceTitle: `Teach Refyn: ${topic.title}`,
    resourceDesc: brief,
    prompt: `I'm going to teach you about ${topic.title.toLowerCase()}. `,
  }).toString()}`;

  return (
    <>
      <ToolHeader subject={subject} title="Teach Refyn" body="The best way to learn something is to explain it. Teach a topic and Refyn asks the questions." icon={MessageCircleQuestion} accent="#3FE9FF" />
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="lp-fade space-y-3" style={{ animationFillMode: "both" }}>
          {subject.units.map((u, ui) => (
            <div key={u.id} className="rounded-2xl border border-lp-line bg-lp-surface/70 p-4">
              <p className="mb-2 text-[12px] font-medium text-lp-mute">
                Unit {ui + 1} · <span className="text-lp-soft">{u.title}</span>
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                {u.topics.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={t.id === topic.id}
                    onClick={() => setPick(t.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13px] transition-colors",
                      t.id === topic.id ? "border-lp-cyan/50 bg-lp-cyan/10 text-white" : "border-lp-line text-lp-soft hover:text-white",
                    )}
                  >
                    <StatusIcon status={topicStatus(t, state)} size={16} />
                    <span className="truncate">{t.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <aside className="lp-fade rounded-3xl border border-lp-cyan/25 bg-gradient-to-b from-lp-cyan/[0.07] to-lp-surface/70 p-5 lg:sticky lg:top-6 lg:self-start" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-cyan">You're teaching</p>
          <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-white">{topic.title}</h2>
          <p className="mt-1 text-[13px] text-lp-soft">{topic.summary}</p>
          <ol className="mt-5 space-y-3">
            {[
              "Explain the topic in your own words, as if to a classmate.",
              "Refyn asks follow-up questions wherever your explanation is thin.",
              "Finish and get feedback on what you nailed and what to revise.",
            ].map((s, i) => (
              <li key={i} className="flex gap-3 text-[13px] text-lp-soft">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lp-cyan/15 text-[12px] font-semibold text-lp-cyan">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">Try to cover</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {topic.keyTerms.map((k) => (
              <span key={k.term} className={chip}>
                {k.term}
              </span>
            ))}
          </div>
          <Link to={link} className={cn(primaryBtn, "mt-6 w-full")}>
            Start teaching <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to={`/subjects/${subject.slug}/guide/${topic.id}`} className="mt-2 flex items-center justify-center gap-1.5 text-[12.5px] text-lp-mute hover:text-white">
            <BookOpen className="h-3.5 w-3.5" /> Skim the guide first
          </Link>
        </aside>
      </div>
    </>
  );
};
