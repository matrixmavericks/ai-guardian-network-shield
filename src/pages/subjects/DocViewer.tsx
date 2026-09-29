import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Check,
  Download,
  Layers,
  ListChecks,
  Maximize2,
  Minimize2,
  Minus,
  PlayCircle,
  Plus,
  Printer,
  ScrollText,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { findTopic, getSubject, topicsOf, type Subject, type Topic, type Unit } from "@/content/myp";
import { Bar, ghostBtn } from "@/components/student/ui";
import { Crumbs, Markdown, StatusIcon, StudyShell, SubjectBadge, iconBtn, primaryBtn } from "@/components/subjects/kit";
import { AskPanel } from "@/components/subjects/AskPanel";
import { cheatsheetMarkdown, printElement, topicMarkdown } from "@/components/subjects/docs";
import { downloadMarkdown, slugify } from "@/components/assistant/storage";
import { STATUS_META, isSaved, topicScore, topicStatus, useStudy, type StudyState } from "@/components/subjects/store";
import { SubjectMissing } from "./SubjectPage";

/* ---------- Documents ---------- */

const GuideDoc: React.FC<{ subject: Subject; unit: Unit; unitIndex: number; topic: Topic }> = ({ subject, unit, unitIndex, topic }) => (
  <article className="mx-auto max-w-[760px]">
    <header className="border-b border-lp-line pb-6">
      <div className="flex items-center gap-2 text-[12.5px] text-lp-mute">
        <SubjectBadge subject={subject} size="sm" />
        <span>
          {subject.name} · Unit {unitIndex + 1}: {unit.title}
        </span>
      </div>
      <h1 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[32px]">{topic.title}</h1>
      <p className="mt-2 text-[15.5px] leading-relaxed text-lp-soft">{topic.summary}</p>
    </header>
    <Markdown source={topic.guide} className="lp-guide mt-6" />
    <section className="mt-10 rounded-2xl border border-lp-line bg-lp-surface/70 p-5">
      <h2 className="text-[15px] font-semibold text-white">Key terms</h2>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {topic.keyTerms.map((k) => (
          <div key={k.term} className="rounded-xl border border-lp-line bg-lp-deep/50 p-3">
            <dt className="text-[13.5px] font-medium text-lp-sky">{k.term}</dt>
            <dd className="mt-0.5 text-[13px] leading-snug text-lp-soft">{k.def}</dd>
          </div>
        ))}
      </dl>
    </section>
  </article>
);

const CheatsheetDoc = React.forwardRef<HTMLDivElement, { subject: Subject; unit: Unit; unitIndex: number }>(({ subject, unit, unitIndex }, ref) => (
  <div ref={ref} className="mx-auto max-w-[940px] overflow-hidden rounded-md bg-[#FFFFFF] font-ui text-[#1B2640] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.75)]">
    <div className="h-2" style={{ background: subject.theme.gradient }} />
    <div className="px-6 pb-7 pt-6 sm:px-9">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E3E8F2] pb-4">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[#2563EB]">Refyn · Cheatsheet</p>
          <h2 className="mt-1.5 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[#0B1530]">
            Unit {unitIndex + 1}: {unit.title}
          </h2>
        </div>
        <p className="text-[12px] text-[#5A6A88]">{subject.name} · IB MYP</p>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {unit.topics.map((t) => (
          <section key={t.id} className="relative break-inside-avoid rounded-xl border border-[#E3E8F2] p-4 pl-5">
            <span className="absolute bottom-4 left-0 top-4 w-[3px] rounded-r" style={{ background: subject.theme.gradient }} />
            <h3 className="text-[15px] font-semibold text-[#0B1530]">{t.title}</h3>
            <p className="mt-0.5 text-[12.5px] leading-snug text-[#4A5875]">{t.summary}</p>
            <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#7A89A6]">Key terms</p>
            <ul className="mt-1 space-y-1">
              {t.keyTerms.map((k) => (
                <li key={k.term} className="text-[12.5px] leading-snug text-[#34425E]">
                  <span className="font-semibold text-[#0B1530]">{k.term}:</span> {k.def}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#7A89A6]">Quick facts</p>
            <ul className="mt-1 space-y-1">
              {t.flashcards.map((f) => (
                <li key={f.id} className="text-[12.5px] leading-snug text-[#34425E]">
                  <span className="font-medium text-[#0B1530]">{f.front}</span> {f.back}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-6 text-center text-[11px] text-[#8A97B0]">Made with Refyn</p>
    </div>
  </div>
));
CheatsheetDoc.displayName = "CheatsheetDoc";

/* ---------- Side panel ---------- */

const GuideDetails: React.FC<{ subject: Subject; unit: Unit; topic: Topic; state: StudyState; study: ReturnType<typeof useStudy> }> = ({ subject, unit, topic, state, study }) => {
  const base = `/subjects/${subject.slug}`;
  const st = topicStatus(topic, state);
  const sc = topicScore(topic, state);
  const read = !!state.read[topic.id];
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-lp-line bg-lp-deep/50 p-4">
        <div className="flex items-center gap-3">
          <StatusIcon status={st} size={26} />
          <div>
            <p className="text-[14px] font-medium text-white">{STATUS_META[st].label}</p>
            <p className="text-[12px] text-lp-mute">
              {sc.correct}/{sc.total} correct on your latest try
            </p>
          </div>
        </div>
        <Bar value={STATUS_META[st].weight} className="mt-3" tone={st === "mastered" ? "green" : "blue"} />
      </div>

      <button
        type="button"
        onClick={() => study.markRead(topic.id, !read)}
        className={cn(read ? ghostBtn : primaryBtn, "w-full")}
        aria-pressed={read}
      >
        <Check className="h-4 w-4" /> {read ? "Read · mark as unread" : "Mark as read"}
      </button>

      <Link to={`${base}/topic/${topic.id}`} className="flex items-center gap-3 rounded-2xl border border-lp-sky/30 bg-lp-blue/10 p-3.5 transition-colors hover:border-lp-sky/60">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lp-blue/20 text-lp-sky">
          <Target className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium text-white">Open the topic hub</span>
          <span className="block text-[12px] text-lp-mute">Worked example, exam practice and mark scheme</span>
        </span>
        <ArrowRight className="h-4 w-4 text-lp-sky" />
      </Link>

      <div className="grid grid-cols-3 gap-2">
        {[
          { to: `${base}/questionbank?topic=${topic.id}`, icon: ListChecks, label: "Practice" },
          { to: `${base}/flashcards?topic=${topic.id}`, icon: Layers, label: "Cards" },
          { to: `${base}/lesson/${topic.id}`, icon: PlayCircle, label: "Lesson" },
        ].map((a) => (
          <Link key={a.label} to={a.to} className="flex flex-col items-center gap-1.5 rounded-xl border border-lp-line bg-lp-surface py-3 text-[12px] text-lp-soft transition-colors hover:border-white/20 hover:text-white">
            <a.icon className="h-4 w-4 text-lp-sky" />
            {a.label}
          </Link>
        ))}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">More from this unit</p>
        <ul className="space-y-1">
          {unit.topics.map((t) => (
            <li key={t.id}>
              <Link
                to={`${base}/guide/${t.id}`}
                aria-current={t.id === topic.id ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-colors",
                  t.id === topic.id ? "bg-lp-blue/15 text-white" : "text-lp-soft hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <StatusIcon status={topicStatus(t, state)} size={16} />
                <span className="truncate">{t.title}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link to={`${base}/cheatsheet/${unit.id}`} className="mt-2 inline-flex items-center gap-1.5 px-2.5 text-[12.5px] text-lp-sky hover:underline">
          <ScrollText className="h-3.5 w-3.5" /> Unit cheatsheet
        </Link>
      </div>
    </div>
  );
};

const SheetDetails: React.FC<{ subject: Subject; unit: Unit; state: StudyState }> = ({ subject, unit, state }) => {
  const base = `/subjects/${subject.slug}`;
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">On this sheet</p>
        <ul className="space-y-1">
          {unit.topics.map((t) => (
            <li key={t.id}>
              <Link to={`${base}/guide/${t.id}`} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] text-lp-soft transition-colors hover:bg-white/[0.04] hover:text-white">
                <StatusIcon status={topicStatus(t, state)} size={16} />
                <span className="truncate">{t.title}</span>
                <BookOpen className="ml-auto h-3.5 w-3.5 shrink-0 text-lp-mute" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">All cheatsheets</p>
        <ul className="space-y-1">
          {subject.units.map((u, i) => (
            <li key={u.id}>
              <Link
                to={`${base}/cheatsheet/${u.id}`}
                aria-current={u.id === unit.id ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-colors",
                  u.id === unit.id ? "bg-lp-blue/15 text-white" : "text-lp-soft hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <ScrollText className="h-4 w-4 shrink-0 text-lp-mute" />
                <span className="truncate">
                  Unit {i + 1}: {u.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/* ---------- Page ---------- */

const DocViewer: React.FC<{ kind: "guide" | "cheatsheet" }> = ({ kind }) => {
  const { slug, id } = useParams();
  const subject = getSubject(slug);
  const study = useStudy();
  const { state } = study;
  const [zoom, setZoom] = useState(100);
  const [side, setSide] = useState<"details" | "ask">("details");
  const [fullscreen, setFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  const found = subject && kind === "guide" ? findTopic(subject, id) : undefined;
  const unit = subject ? (kind === "guide" ? found?.unit : subject.units.find((u) => u.id === id)) : undefined;
  const unitIndex = subject && unit ? subject.units.indexOf(unit) : -1;
  const topic = found?.topic;
  const title = kind === "guide" ? topic?.title : unit ? `${unit.title} cheatsheet` : undefined;

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === viewerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (subject && title) study.visit({ subject: subject.slug, path: `/subjects/${subject.slug}/${kind}/${id}`, label: `${title} · ${subject.name}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject?.slug, kind, id]);

  if (!subject || !unit || (kind === "guide" && !topic)) return <SubjectMissing />;

  const base = `/subjects/${subject.slug}`;
  const saveKind = kind === "guide" ? "topic" : "cheatsheet";
  const saveId = kind === "guide" ? topic!.id : unit.id;
  const saved = isSaved(state, saveKind, saveId);
  const markdown = kind === "guide" ? topicMarkdown(subject, unit, topic!) : cheatsheetMarkdown(subject, unit);

  // Previous / next in reading order
  const seq =
    kind === "guide"
      ? topicsOf(subject).map((t) => ({ id: t.id, label: t.title }))
      : subject.units.map((u, i) => ({ id: u.id, label: `Unit ${i + 1}: ${u.title}` }));
  const at = seq.findIndex((x) => x.id === id);
  const prev = seq[at - 1];
  const next = seq[at + 1];

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else viewerRef.current?.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <StudyShell wide>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Crumbs
          items={[
            { label: "My subjects", to: "/my-courses" },
            { label: subject.name, to: base },
            kind === "guide" ? { label: "Study guide", to: `${base}/guides` } : { label: "Cheatsheets", to: `${base}/cheatsheets` },
            { label: kind === "guide" ? topic!.title : unit.title },
          ]}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => study.toggleSaved({ kind: saveKind, id: saveId, subject: subject.slug })}
            className={cn(iconBtn, saved && "border-lp-sky/50 text-lp-sky")}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save"}
            title={saved ? "Saved" : "Save"}
          >
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => downloadMarkdown(`${slugify(`${subject.name} ${title}`)}.md`, markdown)} className={iconBtn} aria-label="Download" title="Download (.md)">
            <Download className="h-4 w-4" />
          </button>
          {kind === "cheatsheet" && (
            <button type="button" onClick={() => paperRef.current && printElement(paperRef.current, title!)} className={iconBtn} aria-label="Print or save as PDF" title="Print / save as PDF">
              <Printer className="h-4 w-4" />
            </button>
          )}
          {kind === "guide" && (
            <button
              type="button"
              onClick={() => study.markRead(topic!.id, !state.read[topic!.id])}
              className={cn(state.read[topic!.id] ? ghostBtn : primaryBtn, "h-9")}
              aria-pressed={!!state.read[topic!.id]}
            >
              <Check className="h-4 w-4" /> {state.read[topic!.id] ? "Read" : "Mark as read"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div
          ref={viewerRef}
          className="lp-fade min-w-0 overflow-clip rounded-3xl border border-lp-line bg-lp-deep/60 [&:fullscreen]:overflow-y-auto [&:fullscreen]:rounded-none [&:fullscreen]:bg-lp-bg"
          style={{ animationFillMode: "both" }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-lp-line bg-lp-surface/85 px-3 py-2 backdrop-blur">
            <p className="truncate pl-1 text-[12.5px] text-lp-mute">
              {kind === "guide" ? `Topic ${at + 1} of ${seq.length}` : `Sheet ${at + 1} of ${seq.length}`}
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setZoom((z) => Math.max(70, z - 10))} className={cn(iconBtn, "h-8 w-8")} aria-label="Zoom out" disabled={zoom <= 70}>
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setZoom(100)} className="h-8 min-w-[52px] rounded-lg text-[12.5px] tabular-nums text-lp-soft hover:text-white" title="Reset zoom">
                {zoom}%
              </button>
              <button type="button" onClick={() => setZoom((z) => Math.min(160, z + 10))} className={cn(iconBtn, "h-8 w-8")} aria-label="Zoom in" disabled={zoom >= 160}>
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={toggleFullscreen} className={cn(iconBtn, "ml-1 h-8 w-8")} aria-label={fullscreen ? "Exit full screen" : "Full screen"} title={fullscreen ? "Exit full screen" : "Full screen"}>
                {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto px-4 py-7 sm:px-8 sm:py-10">
            <div style={{ zoom: zoom / 100 }}>
              {kind === "guide" ? (
                <GuideDoc subject={subject} unit={unit} unitIndex={unitIndex} topic={topic!} />
              ) : (
                <CheatsheetDoc ref={paperRef} subject={subject} unit={unit} unitIndex={unitIndex} />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-lp-line px-3 py-3 sm:px-4">
            {prev ? (
              <Link to={`${base}/${kind}/${prev.id}`} className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-white/[0.04]">
                <ArrowLeft className="h-4 w-4 shrink-0 text-lp-mute transition-transform group-hover:-translate-x-0.5" />
                <span className="min-w-0">
                  <span className="block text-[11px] text-lp-mute">Previous</span>
                  <span className="block truncate text-[13px] text-white">{prev.label}</span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={`${base}/${kind}/${next.id}`} className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-right hover:bg-white/[0.04]">
                <span className="min-w-0">
                  <span className="block text-[11px] text-lp-mute">Next</span>
                  <span className="block truncate text-[13px] text-white">{next.label}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-lp-mute transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>

        <aside className="lp-fade lg:sticky lg:top-6 lg:self-start" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
          <div className="flex flex-col rounded-3xl border border-lp-line bg-lp-surface/70 p-4 lg:h-[calc(100vh-8rem)]">
            <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-lp-line bg-lp-deep/70 p-1">
              {(["details", "ask"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  type="button"
                  aria-selected={side === t}
                  onClick={() => setSide(t)}
                  className={cn("h-8 rounded-lg text-[13px] font-medium capitalize transition-colors", side === t ? "bg-lp-raised text-white" : "text-lp-mute hover:text-white")}
                >
                  {t}
                </button>
              ))}
            </div>
            {side === "details" ? (
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {kind === "guide" ? (
                  <GuideDetails subject={subject} unit={unit} topic={topic!} state={state} study={study} />
                ) : (
                  <SheetDetails subject={subject} unit={unit} state={state} />
                )}
              </div>
            ) : (
              <AskPanel
                subject={subject}
                title={title!}
                kind={kind === "guide" ? "study guide" : "cheatsheet"}
                context={markdown}
                className="min-h-[420px] flex-1 lg:min-h-0"
              />
            )}
          </div>
        </aside>
      </div>
    </StudyShell>
  );
};

export default DocViewer;
