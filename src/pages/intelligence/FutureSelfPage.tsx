import React, { useMemo, useState } from "react";
import { ArrowRight, CheckSquare, Flag, Rocket, Search, Sparkles, Square, Target, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { StudyShell, Markdown } from "@/components/subjects/kit";
import { EmptyState, Panel, PanelHead } from "@/components/student/ui";
import { useStoredState } from "@/components/assistant/storage";
import { Inline, IntelHeader, ReportSkeleton, RunButton, findSection, itemsOf, parseSections, splitLabel, useIntelReport } from "@/components/intelligence/intel";

const FIELDS: { name: string; color: string; careers: string[] }[] = [
  { name: "Science & health", color: "#34D399", careers: ["Doctor", "Bioengineer", "Environmental Scientist", "Psychologist"] },
  { name: "Tech", color: "#7CB4FF", careers: ["Software Engineer", "AI Researcher", "Game Designer", "Cybersecurity Analyst"] },
  { name: "Business", color: "#FBBF24", careers: ["Entrepreneur", "Investment Banker", "Product Manager", "Marketing Lead"] },
  { name: "Creative", color: "#F472B6", careers: ["Architect", "Film Director", "Journalist", "UX Designer"] },
  { name: "Law & society", color: "#A78BFA", careers: ["Lawyer", "Diplomat", "Policy Analyst", "Economist"] },
];

const YEARS = [
  { key: "year 1", label: "Year 1", sub: "Foundation", color: "#7CB4FF" },
  { key: "year 2", label: "Year 2", sub: "Specialisation", color: "#A78BFA" },
  { key: "year 3", label: "Year 3", sub: "Distinction", color: "#FBBF24" },
];

const FutureSelfPage = () => {
  const { user } = useAuth();
  const [career, setCareer] = useState("Software Engineer");
  const [active, setActive] = useState("Software Engineer");
  const key = active.trim().toLowerCase();
  const report = useIntelReport("future_self", key);
  const [checked, setChecked] = useStoredState<string[]>(user ? `refyn:${user.id}:intel:future-actions` : null, []);
  const recent = Object.entries(report.cache)
    .sort((a, b) => b[1].at - a[1].at)
    .map(([k]) => k)
    .slice(0, 6);

  const go = (c: string) => {
    const name = c.trim();
    if (!name) return;
    setCareer(name);
    setActive(name);
    report.run({ career: name }, name.toLowerCase());
  };
  const open = (c: string) => {
    setCareer(c);
    setActive(c);
  };

  const sections = parseSections(report.reply);
  const headline = findSection(sections, "future self");
  const years = YEARS.map((y) => ({ ...y, section: findSection(sections, y.key) }));
  const gaps = itemsOf(findSection(sections, "skill gap", "gap")?.body);
  const actions = itemsOf(findSection(sections, "action", "this month")?.body);
  const known = [headline, ...years.map((y) => y.section), findSection(sections, "skill gap", "gap"), findSection(sections, "action", "this month")];
  const extra = sections.filter((s) => !known.includes(s));
  const title = headline?.title.split(":").slice(1).join(":").trim() || active;
  const actionKey = (t: string) => `${key}::${t}`;
  const doneCount = actions.filter((a) => checked.includes(actionKey(a.text))).length;

  const allCareers = useMemo(() => FIELDS.flatMap((f) => f.careers.map((c) => ({ c, color: f.color }))), []);

  return (
    <StudyShell>
      <IntelHeader
        icon={Rocket}
        gradient="linear-gradient(135deg, #3FE9FF, #3B82F6 55%, #1E3A8A)"
        title="Future self"
        body="Pick a career you're curious about. Refyn builds a 3-year roadmap from your current subjects and grades: courses, projects, skills and this month's first steps."
      />

      <Panel className="mt-7 p-5" delay={60}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(career);
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <label className="relative min-w-[240px] flex-1">
            <span className="sr-only">Target career</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
            <input
              value={career}
              onChange={(e) => setCareer(e.target.value)}
              placeholder="Any career, e.g. Marine Biologist"
              className="h-11 w-full rounded-xl border border-lp-line bg-lp-deep/70 pl-9 pr-3 text-[14px] text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none"
            />
          </label>
          <RunButton loading={report.loading} hasRun={!!report.reply && career.trim().toLowerCase() === key} label="Build my roadmap" at={career.trim().toLowerCase() === key ? report.at : null} onClick={() => go(career)} />
        </form>

        <div className="mt-4 space-y-2.5">
          {FIELDS.map((f) => (
            <div key={f.name} className="flex flex-wrap items-center gap-1.5">
              <span className="w-[120px] shrink-0 text-[11.5px] font-medium uppercase tracking-[0.12em] text-lp-mute">{f.name}</span>
              {f.careers.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => go(c)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12.5px] transition-colors",
                    active === c ? "text-white" : "border-lp-line text-lp-soft hover:text-white",
                  )}
                  style={active === c ? { borderColor: `${f.color}80`, background: `${f.color}1F` } : undefined}
                >
                  {c}
                </button>
              ))}
            </div>
          ))}
        </div>

        {recent.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-lp-line pt-4">
            <span className="text-[12px] text-lp-mute">Your roadmaps:</span>
            {recent.map((k) => {
              const label = allCareers.find((x) => x.c.toLowerCase() === k)?.c ?? k.replace(/\b\w/g, (m) => m.toUpperCase());
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => open(label)}
                  className={cn("rounded-full border px-2.5 py-0.5 text-[12px]", k === key ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
        {report.error && <p className="mt-4 rounded-xl border border-lp-red/30 bg-lp-red/10 px-3 py-2 text-[13px] text-lp-red">{report.error}</p>}
      </Panel>

      <div className="mt-4">
        {report.loading ? (
          <ReportSkeleton lines={4} />
        ) : !report.reply ? (
          <div className="rounded-3xl border border-dashed border-lp-line">
            <EmptyState icon={Rocket} title="Your roadmap appears here" body="Choose a career above. It takes a few seconds to build, and it's saved so you can come back to it." />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Headline */}
            <div className="lp-fade relative overflow-hidden rounded-3xl border border-lp-cyan/25 p-6" style={{ background: "linear-gradient(120deg, rgba(63,233,255,0.14), rgba(59,130,246,0.1) 45%, rgba(10,19,40,0.9))", animationFillMode: "both" }}>
              <Rocket aria-hidden className="absolute -right-4 -top-4 h-32 w-32 rotate-12 text-white/[0.05]" />
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-cyan">Your future self</p>
              <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-white">{title}</h2>
              {headline?.body && (
                <div className="mt-2 max-w-[760px] text-[14.5px] leading-relaxed text-lp-soft">
                  <Markdown source={headline.body} />
                </div>
              )}
            </div>

            {/* 3-year road */}
            <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-3">
              <span aria-hidden className="absolute left-[16%] right-[16%] top-[30px] hidden h-0.5 bg-gradient-to-r from-[#7CB4FF] via-[#A78BFA] to-[#FBBF24] opacity-60 lg:block" />
              {years.map((y, yi) => {
                const items = itemsOf(y.section?.body);
                return (
                  <Panel key={y.key} className="relative p-5" delay={80 + yi * 60}>
                    <div className="flex items-center gap-3">
                      <span className="relative z-[1] flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold text-lp-deep" style={{ background: y.color }}>
                        {yi + 1}
                      </span>
                      <div>
                        <p className="text-[15px] font-semibold text-white">{y.label}</p>
                        <p className="text-[12px]" style={{ color: y.color }}>
                          {y.section?.title.split(":").slice(1).join(":").trim() || y.sub}
                        </p>
                      </div>
                    </div>
                    {items.length ? (
                      <ul className="mt-4 space-y-2.5">
                        {items.map((it, i) => {
                          const { label, rest } = splitLabel(it.text);
                          return (
                            <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-lp-soft">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: y.color }} />
                              <span>
                                {it.group && i > 0 && items[i - 1].group !== it.group && <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-lp-mute">{it.group}</span>}
                                {label && <span className="font-semibold text-white">{label}: </span>}
                                <Inline text={rest} />
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-4 text-[13px] text-lp-mute">Not included in this roadmap.</p>
                    )}
                  </Panel>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {gaps.length > 0 && (
                <Panel className="p-5" delay={120}>
                  <PanelHead title="Skills to strengthen" icon={TrendingUp} />
                  <ul className="mt-3 space-y-2">
                    {gaps.map((g, i) => {
                      const { label, rest } = splitLabel(g.text);
                      return (
                        <li key={i} className="rounded-2xl border border-lp-line bg-lp-deep/40 px-4 py-3">
                          {label && <p className="flex items-center gap-2 text-[13.5px] font-semibold text-white"><Target className="h-3.5 w-3.5 text-[#FBBF24]" /> {label}</p>}
                          <p className={cn("text-[13px] leading-relaxed text-lp-soft", label && "mt-0.5")}>
                            <Inline text={rest} />
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              )}
              {actions.length > 0 && (
                <Panel className="p-5" delay={160}>
                  <PanelHead title="This month" icon={Flag} meta={<span>{doneCount}/{actions.length} done</span>} />
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-lp-line">
                    <div className="h-full rounded-full bg-gradient-to-r from-lp-blue to-lp-cyan transition-[width] duration-500" style={{ width: `${(doneCount / actions.length) * 100}%` }} />
                  </div>
                  <ul className="mt-3 space-y-1">
                    {actions.map((a) => {
                      const ok = checked.includes(actionKey(a.text));
                      return (
                        <li key={a.text}>
                          <button
                            type="button"
                            onClick={() => setChecked((c) => (ok ? c.filter((x) => x !== actionKey(a.text)) : [...c, actionKey(a.text)]))}
                            className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.03]"
                          >
                            {ok ? <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-lp-green" /> : <Square className="mt-0.5 h-4 w-4 shrink-0 text-lp-mute" />}
                            <span className={cn("text-[13.5px] leading-relaxed", ok ? "text-lp-mute line-through" : "text-lp-soft")}>
                              <Inline text={a.text} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              )}
            </div>

            {extra.map((s) => (
              <Panel key={s.title} className="p-5">
                {s.title && <PanelHead title={s.title} icon={Sparkles} />}
                <div className="mt-3">
                  <Markdown source={s.body} />
                </div>
              </Panel>
            ))}

            <p className="flex items-center gap-1.5 text-[12px] text-lp-mute">
              <ArrowRight className="h-3.5 w-3.5" /> A starting point, not a prediction. Talk it through with your teachers or careers counsellor.
            </p>
          </div>
        )}
      </div>
    </StudyShell>
  );
};

export default FutureSelfPage;
