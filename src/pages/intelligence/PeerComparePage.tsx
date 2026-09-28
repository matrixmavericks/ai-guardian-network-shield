import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, EyeOff, Lock, Sparkles, Sprout, Target, Users, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StudyShell, Markdown, primaryBtn } from "@/components/subjects/kit";
import { EmptyState, Panel, PanelHead, ghostBtn } from "@/components/student/ui";
import { themeFor } from "@/components/student/themes";
import { Inline, IntelHeader, ReportSkeleton, RunButton, findSection, itemsOf, parseSections, splitLabel, useIntelReport } from "@/components/intelligence/intel";

/** Turn phrases like "top 20%", "73rd percentile" or "upper half" into a 0–100 position. */
const percentileOf = (text: string): number | null => {
  const t = text.toLowerCase();
  let m = /top\s+(\d{1,2})\s*%/.exec(t);
  if (m) return 100 - Number(m[1]) / 2;
  m = /bottom\s+(\d{1,2})\s*%/.exec(t);
  if (m) return Number(m[1]) / 2;
  m = /(\d{1,2})(?:st|nd|rd|th)\s+percentile/.exec(t);
  if (m) return Number(m[1]);
  if (/top (quarter|25)/.test(t)) return 88;
  if (/top third/.test(t)) return 83;
  if (/(top|upper) half|above (the )?(class )?(average|middle)/.test(t)) return 68;
  if (/(bottom|lower) half|below (the )?(class )?(average|middle)/.test(t)) return 32;
  if (/middle|around (the )?(class )?average|(at|near) (the )?(class )?average|in line with|on par/.test(t)) return 50;
  if (/bottom third/.test(t)) return 17;
  return null;
};

const zone = (p: number) => (p >= 75 ? { label: "Shining", color: "#34D399" } : p >= 55 ? { label: "Ahead", color: "#7CB4FF" } : p >= 40 ? { label: "With the pack", color: "#FBBF24" } : { label: "Room to grow", color: "#F2706A" });

const StandingRow: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const { label, rest } = splitLabel(text);
  const p = percentileOf(text);
  const z = p !== null ? zone(p) : null;
  return (
    <li className="lp-fade rounded-2xl border border-lp-line bg-lp-deep/40 p-4" style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[14px] font-semibold text-white">{label || "Overall"}</p>
        {z && (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: z.color, background: `${z.color}1F` }}>
            {z.label}
          </span>
        )}
      </div>
      {p !== null && (
        <div className="relative mt-3 h-2.5 rounded-full" style={{ background: "linear-gradient(90deg, rgba(242,112,106,0.35), rgba(251,191,36,0.35) 40%, rgba(124,180,255,0.35) 60%, rgba(52,211,153,0.45))" }}>
          <span className="absolute left-1/2 top-[-3px] h-4 w-px bg-white/25" aria-hidden />
          <span
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-lp-surface shadow-[0_0_0_3px_rgba(255,255,255,0.15)] transition-[left] duration-700"
            style={{ left: `${Math.max(3, Math.min(97, p))}%`, background: z?.color }}
            aria-label={`About ${Math.round(p)} out of 100`}
          />
        </div>
      )}
      <p className="mt-2.5 text-[13px] leading-relaxed text-lp-soft">
        <Inline text={rest} />
      </p>
    </li>
  );
};

const PeerComparePage = () => {
  const { user } = useAuth();
  const report = useIntelReport("peer_compare");
  const [mine, setMine] = useState<{ subject: string; pct: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: subs } = await supabase.from("assignment_submissions").select("assignment_id, grade, max_grade").eq("student_id", user.id).not("grade", "is", null);
      const ids = [...new Set((subs || []).map((s) => s.assignment_id))];
      const { data: asg } = ids.length ? await supabase.from("class_assignments").select("id, subject").in("id", ids) : { data: [] as { id: string; subject: string | null }[] };
      const subj = new Map((asg || []).map((a) => [a.id, a.subject || "General"]));
      setMine(
        (subs || [])
          .filter((s) => s.max_grade)
          .map((s) => ({ subject: subj.get(s.assignment_id) ?? "General", pct: ((s.grade as number) / (s.max_grade as number)) * 100 })),
      );
      setLoading(false);
    })();
  }, [user]);

  const bySubject = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const g of mine) m.set(g.subject, [...(m.get(g.subject) || []), g.pct]);
    return [...m.entries()].map(([subject, xs]) => ({ subject, pct: xs.reduce((a, b) => a + b, 0) / xs.length, n: xs.length })).sort((a, b) => b.pct - a.pct);
  }, [mine]);

  const sections = parseSections(report.reply);
  const stand = itemsOf(findSection(sections, "stand")?.body);
  const powers = itemsOf(findSection(sections, "superpower", "shine")?.body);
  const edges = itemsOf(findSection(sections, "growth", "edge", "push")?.body);
  const nextMove = findSection(sections, "next move", "smart", "next step");
  const known = [findSection(sections, "stand"), findSection(sections, "superpower", "shine"), findSection(sections, "growth", "edge", "push"), nextMove];
  const extra = sections.filter((s) => !known.includes(s));
  const nextText = nextMove ? itemsOf(nextMove.body).map((i) => i.text).join(" ") : "";

  return (
    <StudyShell>
      <IntelHeader
        icon={Users}
        gradient="linear-gradient(135deg, #34D399, #0D9488 55%, #134E4A)"
        title="Peer benchmark"
        body="See where you shine and where to push, compared anonymously with classmates on the same assignments."
        badge="Anonymous"
      />

      <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Panel className="p-5" delay={60}>
          <PanelHead title="Your averages" icon={BarChart3} meta={<span>{mine.length} graded</span>} />
          {loading ? (
            <div className="lp-skeleton mt-4 h-32 rounded-2xl" />
          ) : bySubject.length ? (
            <ul className="mt-4 space-y-3">
              {bySubject.map((s) => (
                <li key={s.subject}>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-white">{s.subject}</span>
                    <span className="tabular-nums text-lp-mute">
                      {Math.round(s.pct)}% · {s.n} piece{s.n === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-lp-line">
                    <div className="lp-bar-in h-full rounded-full" style={{ width: `${s.pct}%`, background: themeFor(s.subject).accent }} />
                  </div>
                </li>
              ))}
              {bySubject.length < 4 && (
                <li className="rounded-xl border border-dashed border-lp-line px-3.5 py-3 text-[12.5px] leading-relaxed text-lp-mute">
                  More subjects show up here as your teachers mark work. Averages are yours only and never shown to classmates.
                </li>
              )}
            </ul>
          ) : (
            <p className="mt-4 text-[13px] leading-relaxed text-lp-mute">No marked work yet. The benchmark needs a few graded assignments that classmates did too.</p>
          )}
        </Panel>
        <Panel className="p-5" delay={100}>
          <PanelHead title="How it stays fair" icon={Lock} />
          <ul className="mt-3 space-y-3 text-[13px] leading-relaxed text-lp-soft">
            <li className="flex gap-3">
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-lp-green" /> Only anonymous class averages are used. No names, no rankings, no leaderboards.
            </li>
            <li className="flex gap-3">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-lp-green" /> You're compared on the same assignments, so it's like for like.
            </li>
            <li className="flex gap-3">
              <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-lp-green" /> The point is your next step, not your position.
            </li>
          </ul>
          <RunButton className="mt-5" loading={report.loading} hasRun={!!report.reply} label="Show my benchmark" at={report.at} onClick={() => report.run()} />
        </Panel>
      </div>
      {report.error && <p className="mt-4 rounded-xl border border-lp-red/30 bg-lp-red/10 px-3 py-2 text-[13px] text-lp-red">{report.error}</p>}

      <div className="mt-4">
        {report.loading ? (
          <ReportSkeleton />
        ) : !report.reply ? (
          <div className="rounded-3xl border border-dashed border-lp-line">
            <EmptyState icon={Users} title="Your benchmark appears here" body="Press Show my benchmark to see where you stand, your superpowers and your growth edges." />
          </div>
        ) : (
          <div className="space-y-4">
            {stand.length > 0 && (
              <Panel className="p-5" delay={40}>
                <PanelHead title="Where you stand" icon={BarChart3} meta={<span className="hidden sm:inline">left: room to grow · right: shining</span>} />
                <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {stand.map((s, i) => (
                    <StandingRow key={i} text={s.text} delay={i * 50} />
                  ))}
                </ul>
              </Panel>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {powers.length > 0 && (
                <Panel className="p-5" delay={80}>
                  <PanelHead title="Your superpowers" icon={Zap} />
                  <ul className="mt-3 space-y-2">
                    {powers.map((p, i) => {
                      const { label, rest } = splitLabel(p.text);
                      return (
                        <li key={i} className="rounded-2xl border border-lp-green/25 bg-lp-green/[0.06] px-4 py-3">
                          {label && <p className="text-[13.5px] font-semibold text-lp-green">{label}</p>}
                          <p className="text-[13px] leading-relaxed text-lp-soft">
                            <Inline text={rest} />
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              )}
              {edges.length > 0 && (
                <Panel className="p-5" delay={120}>
                  <PanelHead title="Your growth edges" icon={Sprout} />
                  <ul className="mt-3 space-y-2">
                    {edges.map((p, i) => {
                      const { label, rest } = splitLabel(p.text);
                      return (
                        <li key={i} className="rounded-2xl border border-[#FBBF24]/25 bg-[#FBBF24]/[0.06] px-4 py-3">
                          {label && <p className="text-[13.5px] font-semibold text-[#FCD34D]">{label}</p>}
                          <p className="text-[13px] leading-relaxed text-lp-soft">
                            <Inline text={rest} />
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              )}
            </div>

            {nextMove && (
              <div className="lp-fade relative overflow-hidden rounded-3xl border border-lp-cyan/30 bg-gradient-to-r from-lp-cyan/[0.12] via-lp-surface to-lp-surface p-6" style={{ animationFillMode: "both" }}>
                <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-lp-cyan">
                  <Sparkles className="h-3.5 w-3.5" /> Smart next move
                </p>
                <div className="mt-2 max-w-[780px] text-[15.5px] leading-relaxed text-white">
                  <Markdown source={nextMove.body} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/ai-learning-assistant?${new URLSearchParams({ resourceTitle: "My peer benchmark", resourceDesc: report.reply.slice(0, 1500), prompt: `Help me act on this: ${nextText.slice(0, 300)}` })}`}
                    className={primaryBtn}
                  >
                    <Sparkles className="h-4 w-4" /> Plan it with Refyn
                  </Link>
                  <Link to="/my-courses" className={ghostBtn}>
                    Practise in My Subjects <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}

            {extra.map((s) => (
              <Panel key={s.title} className="p-5">
                {s.title && <PanelHead title={s.title} icon={Sparkles} />}
                <div className="mt-3">
                  <Markdown source={s.body} />
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </StudyShell>
  );
};

export default PeerComparePage;
