import React, { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AlertTriangle, ArrowRight, CalendarDays, ClipboardCheck, ClipboardList, FileText, Layers, Library, Loader2, Shapes, Sparkles, Ticket, Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PilotFeedbackPrompt from "@/components/PilotFeedbackPrompt";
import { StudyShell, primaryBtn } from "@/components/subjects/kit";
import { Panel, PanelHead } from "@/components/student/ui";
import { cn } from "@/lib/utils";
import { CATALOG, DiagramView } from "@/components/studio/diagrams";
import { useLibrary, useStudio } from "@/components/studio/studio";
import type { PrintKind } from "@/components/studio/worksheet";
import { needsMarking, startOfWeek, studentRows, useTeacherData, weekLoad } from "@/components/teacher/data";

const MAKE: { id: PrintKind; label: string; icon: React.ElementType }[] = [
  { id: "worksheet", label: "Worksheet", icon: FileText },
  { id: "test", label: "Test", icon: ClipboardList },
  { id: "exit", label: "Exit tickets", icon: Ticket },
  { id: "flashcards", label: "Flashcards", icon: Layers },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const StudioHome = () => {
  const { isLoading } = useAuth();
  const navigate = useNavigate();
  const { config, look, band, setBand } = useStudio();
  const lib = useLibrary();
  const { data, loading } = useTeacherData(!!config);
  const [kind, setKind] = useState<PrintKind>("worksheet");
  const [topic, setTopic] = useState("");

  const toMark = data.submissions.filter(needsMarking).length;
  const flagged = useMemo(() => studentRows(data).filter((r) => r.reasons.length).length, [data]);
  const due = useMemo(() => weekLoad(data, startOfWeek()).reduce((n, d) => n + d.items.length, 0), [data]);
  const showcase = useMemo(() => (look ? CATALOG.filter((c) => c.subjects.includes(look.subject)).slice(0, 3) : []), [look]);

  if (isLoading) return null;
  if (!config || !look) return <Navigate to="/dashboard" replace />;

  const HeroIcon = config.HeroIcon;
  const surname = config.displayName.replace(/^(Mr|Mrs|Ms|Dr)\.?\s+\S+\s+/, "$1 ").trim();

  const make = (k: PrintKind, t: string, diagrams?: boolean) =>
    navigate(`/studio/create?kind=${k}&topic=${encodeURIComponent(t)}${diagrams === undefined ? "" : `&diagrams=${diagrams ? 1 : 0}`}&auto=1`);

  return (
    <StudyShell wide>
      {/* Hero */}
      <section className="lp-keep lp-fade relative overflow-hidden rounded-[32px] text-white" style={{ background: look.gradient, animationFillMode: "both" }}>
        <div aria-hidden className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "18px 18px", maskImage: "linear-gradient(115deg, transparent 35%, black)", WebkitMaskImage: "linear-gradient(115deg, transparent 35%, black)" }} />
        <HeroIcon aria-hidden className="absolute -bottom-10 -right-6 h-64 w-64 text-white/10" strokeWidth={1.2} />
        <div className="relative p-6 sm:p-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
            Refyn Studio · Mahindra pilot · {format(new Date(), "EEEE d MMMM")}
          </p>
          <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.035em] sm:text-[40px]">
            {greeting()}, {surname}
          </h1>
          <p className="mt-1 text-[15px] text-white/80">
            {config.title} · {config.subjectLabel}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (topic.trim()) make(kind, topic.trim());
            }}
            className="mt-6 max-w-[820px] rounded-3xl bg-white/15 p-2 backdrop-blur-md ring-1 ring-white/25"
          >
            <div className="flex flex-wrap gap-1 px-1 pb-2 pt-1">
              {MAKE.map((m) => (
                <button key={m.id} type="button" onClick={() => setKind(m.id)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors", kind === m.id ? "bg-[#FFFFFF] text-[#0F172A]" : "text-white/85 hover:bg-white/15")}>
                  <m.icon className="h-3.5 w-3.5" /> {m.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-[#FFFFFF] p-1.5 pl-4">
              <Sparkles className="h-4 w-4 shrink-0" style={{ color: look.accent }} />
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={`What should the ${MAKE.find((m) => m.id === kind)?.label.toLowerCase()} cover?`}
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
                aria-label="Topic"
              />
              <button type="submit" disabled={!topic.trim()} className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[14px] font-semibold text-white disabled:opacity-50" style={{ background: look.accent }}>
                Create <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 px-2 pb-1 pt-2">
              <span className="text-[11.5px] text-white/70">For</span>
              {config.gradeBands.map((b) => (
                <button key={b.id} type="button" title={b.description} onClick={() => setBand(b.id)} className={cn("h-7 rounded-full px-2.5 text-[11.5px] font-medium", band === b.id ? "bg-[#FFFFFF]/90 text-[#0F172A]" : "text-white/80 hover:bg-white/15")}>
                  {b.label}
                </button>
              ))}
            </div>
          </form>
        </div>
      </section>

      {/* Today */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { icon: ClipboardCheck, label: "to mark", value: toMark, to: "/marking", accent: "#7CB4FF" },
          { icon: AlertTriangle, label: flagged === 1 ? "student to check on" : "students to check on", value: flagged, to: "/teaching", accent: "#FBBF24" },
          { icon: CalendarDays, label: due === 1 ? "deadline this week" : "deadlines this week", value: due, to: "/teaching", accent: "#34D399" },
        ].map((s, i) => (
          <Link key={s.label} to={s.to} className="block rounded-3xl">
            <Panel className="flex items-center gap-4 p-4 transition-colors hover:border-lp-sky/30" delay={60 + i * 30}>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${s.accent}1F`, color: s.accent }}>
                <s.icon className="h-5 w-5" />
              </span>
              <p className="min-w-0 flex-1 text-[14px] text-lp-soft">
                <span className="mr-1.5 text-[26px] font-semibold tabular-nums text-white">{loading && !data.classes.length ? "–" : s.value}</span>
                {s.label}
              </p>
              <ArrowRight className="h-4 w-4 text-lp-mute" />
            </Panel>
          </Link>
        ))}
      </div>

      {/* Ideas */}
      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-white">Start from an idea</h2>
          <Link to="/studio/create" className="inline-flex items-center gap-1 text-[13px] text-lp-sky hover:text-white">
            Blank printable <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {look.ideas.map((idea, i) => {
            const K = MAKE.find((m) => m.id === idea.kind)!;
            return (
              <button key={idea.title} type="button" onClick={() => make(idea.kind, idea.topic, idea.diagrams)} className="group text-left">
                <Panel className="h-full p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-lp-sky/40" delay={80 + i * 30}>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${look.accent}1F`, color: look.accent }}>
                      <K.icon className="h-3 w-3" /> {K.label}
                    </span>
                    {idea.diagrams && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-lp-mute">
                        <Shapes className="h-3 w-3" /> diagrams
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-[15px] font-medium text-white">{idea.title}</p>
                  <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-lp-mute">{idea.topic}</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-lp-sky opacity-0 transition-opacity group-hover:opacity-100">
                    Create for {band} <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </Panel>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        {/* Toolkit */}
        <Panel className="p-5 sm:p-6" delay={120}>
          <PanelHead title={`${config.title.replace(" Studio", "")} toolkit`} icon={Wand2} meta={`${config.tools.length} tools`} />
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {config.tools.map((t) => (
              <Link key={t.id} to={`/studio/tool/${t.id}`} className="group flex gap-3 rounded-2xl border border-lp-line bg-lp-deep/40 p-3.5 transition-colors hover:border-lp-sky/40">
                <span className="lp-keep flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: look.gradient }}>
                  <t.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-white group-hover:text-lp-sky">{t.title}</span>
                  <span className="line-clamp-2 block text-[12px] leading-snug text-lp-mute">{t.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          {/* Diagram lab */}
          <Panel className="p-5" delay={150}>
            <PanelHead
              title="Diagram lab"
              icon={Shapes}
              meta={
                <Link to="/studio/diagrams" className="inline-flex items-center gap-1 text-lp-sky hover:text-white">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <p className="mt-1 text-[12.5px] text-lp-mute">Exact figures, calculated and drawn to scale, ready for any worksheet.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {showcase.map((c) => (
                <Link key={c.kind} to="/studio/diagrams" className="overflow-hidden rounded-xl border border-lp-line bg-[#FFFFFF] p-1.5 transition-colors hover:border-lp-sky/50" title={c.name}>
                  <div className="pointer-events-none h-[86px]">
                    <DiagramView spec={c.example} accent={look.accent} className="h-full [&_svg]:h-full" />
                  </div>
                </Link>
              ))}
            </div>
          </Panel>

          {/* Recent */}
          <Panel className="p-5" delay={180}>
            <PanelHead
              title="Recent"
              icon={Library}
              meta={
                <Link to="/studio/library" className="inline-flex items-center gap-1 text-lp-sky hover:text-white">
                  Library <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            {lib.items.length ? (
              <ul className="mt-3 space-y-1">
                {lib.items.slice(0, 5).map((it) => {
                  const to = it.type === "printable" ? `/studio/create?id=${it.id}` : it.type === "diagram" ? `/studio/diagrams?id=${it.id}` : `/studio/tool/${it.tool}?item=${it.id}`;
                  const Icon = it.type === "printable" ? MAKE.find((m) => m.id === it.kind)?.icon ?? FileText : it.type === "diagram" ? Shapes : Wand2;
                  return (
                    <li key={it.id}>
                      <Link to={to} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04]">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lp-raised text-lp-sky">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13.5px] text-white">{it.title}</span>
                        <span className="shrink-0 text-[11.5px] text-lp-mute">{format(it.at, "d MMM")}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] text-lp-mute">Everything you create is saved here automatically.</p>
            )}
          </Panel>
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        <PilotFeedbackPrompt context="teacher" />
      </div>
      {loading && !data.classes.length && <Loader2 className="sr-only" />}
    </StudyShell>
  );
};

export default StudioHome;
