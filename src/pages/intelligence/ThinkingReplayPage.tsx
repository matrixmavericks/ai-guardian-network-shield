import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Brain, CheckSquare, Clock, Compass, Flame, HelpCircle, Lightbulb, MessageSquare, OctagonAlert, Quote, Sparkles, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { StudyShell, Markdown, selectCls } from "@/components/subjects/kit";
import { EmptyState, Panel, PanelHead } from "@/components/student/ui";
import { useStoredState } from "@/components/assistant/storage";
import { Inline, IntelHeader, ReportSkeleton, RunButton, findSection, itemsOf, parseSections, useIntelReport } from "@/components/intelligence/intel";

type Row = { role: string; content: string; created_at: string; session_id: string };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const KINDS: { key: string; label: string; test: RegExp; color: string }[] = [
  { key: "why", label: "Why", test: /\bwhy\b/i, color: "#A78BFA" },
  { key: "how", label: "How", test: /\bhow\b/i, color: "#7CB4FF" },
  { key: "what", label: "What", test: /\bwhat\b|\bdefine\b|\bmeaning\b/i, color: "#3FE9FF" },
  { key: "check", label: "Check me", test: /\bcheck\b|\bis (this|it|my)\b|\bcorrect\b|\bright\?/i, color: "#34D399" },
  { key: "help", label: "Help / plan", test: /\bhelp\b|\bplan\b|\bexplain\b/i, color: "#FBBF24" },
];

/* ---------- Analytics computed from the student's own chats ---------- */

const Heatmap: React.FC<{ rows: Row[] }> = ({ rows }) => {
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
    for (const r of rows) {
      const d = new Date(r.created_at);
      g[(d.getDay() + 6) % 7][d.getHours()]++;
    }
    return g;
  }, [rows]);
  const max = Math.max(1, ...grid.flat());
  const peak = grid.flatMap((row, di) => row.map((v, h) => ({ v, di, h }))).sort((a, b) => b.v - a.v)[0];
  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[280px]">
          {grid.map((row, di) => (
            <div key={di} className="flex items-center gap-[2px] py-[1px] sm:gap-1 sm:py-[2px]">
              <span className="w-8 shrink-0 text-[11px] text-lp-mute sm:w-9">{DAYS[di]}</span>
              {row.map((v, h) => (
                <span
                  key={h}
                  title={`${DAYS[di]} ${h}:00 · ${v} message${v === 1 ? "" : "s"}`}
                  className="h-3 flex-1 rounded-[3px] sm:h-4 sm:rounded-[4px]"
                  style={{ background: v ? `rgba(63, 233, 255, ${0.15 + (v / max) * 0.85})` : "#111C36" }}
                />
              ))}
            </div>
          ))}
          <div className="ml-9 mt-1 flex justify-between text-[10.5px] text-lp-mute sm:ml-10">
            {[0, 6, 12, 18, 23].map((h) => (
              <span key={h}>{h === 0 ? "12am" : h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}</span>
            ))}
          </div>
        </div>
      </div>
      {peak && peak.v > 0 && (
        <p className="mt-3 text-[12.5px] text-lp-soft">
          You ask the most on <span className="font-semibold text-white">{DAYS[peak.di]}s around {format(new Date(2026, 0, 1, peak.h), "h a")}</span>.
        </p>
      )}
    </div>
  );
};

const AskStyle: React.FC<{ questions: string[] }> = ({ questions }) => {
  const counts = KINDS.map((k) => ({ ...k, n: questions.filter((q) => k.test.test(q)).length }));
  const total = Math.max(1, counts.reduce((a, c) => a + c.n, 0));
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-lp-line">
        {counts.map((c) => (
          <span key={c.key} className="lp-bar-in h-full" style={{ width: `${(c.n / total) * 100}%`, background: c.color }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {counts.map((c) => (
          <li key={c.key} className="flex items-center gap-2 text-[12.5px] text-lp-soft">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
            {c.label} <span className="tabular-nums text-lp-mute">{Math.round((c.n / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ---------- Page ---------- */

const ThinkingReplayPage = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<{ id: string; title: string | null; created_at: string }[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const report = useIntelReport("thinking_replay", sessionId || "all");
  const [done, setDone] = useStoredState<string[]>(user ? `refyn:${user.id}:intel:replay-done` : null, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("ai_chat_sessions")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setSessions(data || []));
    supabase
      .from("ai_chat_messages")
      .select("role, content, created_at, session_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(600)
      .then(({ data }) => {
        setRows((data as Row[]) || []);
        setLoadingStats(false);
      });
  }, [user]);

  const mine = useMemo(() => rows.filter((r) => r.role === "user" && (!sessionId || r.session_id === sessionId)), [rows, sessionId]);
  const questions = mine.map((r) => r.content);
  const sessionCount = new Set(mine.map((r) => r.session_id)).size;
  const avgLen = questions.length ? Math.round(questions.reduce((a, q) => a + q.split(/\s+/).length, 0) / questions.length) : 0;
  const followUps = (() => {
    const bySession = new Map<string, number>();
    for (const r of mine) bySession.set(r.session_id, (bySession.get(r.session_id) || 0) + 1);
    const vals = [...bySession.values()];
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "0";
  })();

  const sections = parseSections(report.reply);
  const summary = findSection(sections, "journey", "summary");
  const asked = itemsOf(findSection(sections, "question")?.body);
  const dead = itemsOf(findSection(sections, "dead")?.body);
  const wins = itemsOf(findSection(sections, "breakthrough")?.body);
  const pattern = findSection(sections, "pattern");
  const recs = itemsOf(findSection(sections, "recommend", "next")?.body);
  const known = [summary, findSection(sections, "question"), findSection(sections, "dead"), findSection(sections, "breakthrough"), pattern, findSection(sections, "recommend", "next")];
  const extra = sections.filter((s) => !known.includes(s));

  const rail = [
    ...asked.map((i) => ({ ...i, kind: "q" as const })),
    ...dead.map((i) => ({ ...i, kind: "d" as const })),
    ...wins.map((i) => ({ ...i, kind: "b" as const })),
  ];
  const KIND = {
    q: { icon: HelpCircle, color: "#7CB4FF", label: "Asked" },
    d: { icon: OctagonAlert, color: "#F2706A", label: "Got stuck" },
    b: { icon: Lightbulb, color: "#34D399", label: "Breakthrough" },
  } as const;

  return (
    <StudyShell>
      <IntelHeader
        icon={Brain}
        gradient="linear-gradient(135deg, #A78BFA, #6366F1 55%, #1E1B4B)"
        title="Thinking replay"
        body="See how you actually think. Refyn replays your AI chats as a journey of questions, dead-ends and breakthroughs, and shows when and how you ask."
      />

      {/* Stats from your own chats */}
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: MessageSquare, label: "Questions asked", value: questions.length },
          { icon: Compass, label: "Chats", value: sessionCount },
          { icon: Flame, label: "Follow-ups per chat", value: followUps },
          { icon: Clock, label: "Words per question", value: avgLen },
        ].map((k, i) => (
          <div key={k.label} className="lp-fade flex items-center gap-3 rounded-2xl border border-lp-line bg-lp-surface/70 px-4 py-3" style={{ animationDelay: `${40 + i * 40}ms`, animationFillMode: "both" }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lp-raised text-[#C4B5FD]">
              <k.icon className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[18px] font-semibold tabular-nums leading-tight text-white">{loadingStats ? "–" : k.value}</span>
              <span className="block text-[12px] text-lp-mute">{k.label}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Panel className="p-5" delay={80}>
          <PanelHead title="When you think best" icon={Clock} meta={<span>last {Math.min(rows.length, 600)} messages</span>} />
          <div className="mt-4">{mine.length ? <Heatmap rows={mine} /> : <p className="text-[13px] text-lp-mute">Chat with the AI assistant and your pattern appears here.</p>}</div>
        </Panel>
        <Panel className="p-5" delay={120}>
          <PanelHead title="How you ask" icon={HelpCircle} />
          <div className="mt-4">{mine.length ? <AskStyle questions={questions} /> : <p className="text-[13px] text-lp-mute">No questions yet.</p>}</div>
          <p className="mt-4 text-[12px] leading-relaxed text-lp-mute">"Why" and "how" questions build deeper understanding than "what" questions. Try asking one more why.</p>
        </Panel>
      </div>

      {/* AI replay */}
      <Panel className="mt-4 p-5" delay={160}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-[240px] flex-1">
            <PanelHead title="Replay a chat" icon={Sparkles} />
            <label className="mt-3 block max-w-[420px]">
              <span className="sr-only">Chat to replay</span>
              <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className={cn(selectCls, "w-full")}>
                <option value="">All recent chats</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {(s.title || "Untitled").slice(0, 60)} · {format(new Date(s.created_at), "d MMM")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <RunButton loading={report.loading} hasRun={!!report.reply} label="Replay my thinking" at={report.at} onClick={() => report.run({ sessionId: sessionId || undefined })} />
        </div>
        {report.error && <p className="mt-4 rounded-xl border border-lp-red/30 bg-lp-red/10 px-3 py-2 text-[13px] text-lp-red">{report.error}</p>}
      </Panel>

      <div className="mt-4">
        {report.loading ? (
          <ReportSkeleton />
        ) : !report.reply ? (
          <div className="rounded-3xl border border-dashed border-lp-line">
            <EmptyState
              icon={Brain}
              title="Your replay will appear here"
              body={rows.length ? "Choose a chat (or all of them) and press Replay. Refyn reads your questions and maps how your thinking moved." : "Have a few conversations with the AI assistant first, then come back to replay them."}
              action={!rows.length ? <Link to="/ai-learning-assistant" className="text-[13.5px] font-medium text-lp-sky hover:underline">Open the AI assistant</Link> : undefined}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {summary && (
              <div className="lp-fade relative overflow-hidden rounded-3xl border border-[#A78BFA]/30 bg-gradient-to-br from-[#A78BFA]/15 via-lp-surface to-lp-surface p-6" style={{ animationFillMode: "both" }}>
                <Quote className="absolute right-5 top-5 h-10 w-10 text-[#A78BFA]/25" />
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#C4B5FD]">Your journey</p>
                <p className="mt-2 max-w-[780px] text-[17px] leading-relaxed text-white">
                  <Inline text={summary.body.replace(/\n+/g, " ")} />
                </p>
              </div>
            )}

            {rail.length > 0 && (
              <Panel className="p-5" delay={60}>
                <PanelHead
                  title="The replay"
                  icon={Compass}
                  meta={
                    <span className="flex gap-3">
                      {(Object.keys(KIND) as (keyof typeof KIND)[]).map((k) => (
                        <span key={k} className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: KIND[k].color }} /> {KIND[k].label}
                        </span>
                      ))}
                    </span>
                  }
                />
                <ol className="relative mt-5 space-y-3 pl-8">
                  <span aria-hidden className="absolute bottom-2 left-[11px] top-2 w-0.5 rounded-full bg-gradient-to-b from-[#7CB4FF] via-[#F2706A] to-[#34D399] opacity-50" />
                  {rail.map((item, i) => {
                    const k = KIND[item.kind];
                    return (
                      <li key={i} className="lp-fade relative" style={{ animationDelay: `${Math.min(i, 12) * 40}ms`, animationFillMode: "both" }}>
                        <span className="absolute -left-8 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-lp-surface" style={{ borderColor: k.color, color: k.color }}>
                          <k.icon className="h-3 w-3" />
                        </span>
                        <div className="rounded-2xl border border-lp-line bg-lp-deep/40 px-4 py-3">
                          {item.group && <p className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-lp-mute">{item.group}</p>}
                          <p className="text-[13.5px] leading-relaxed text-lp-soft">
                            <Inline text={item.text} />
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </Panel>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {pattern && (
                <Panel className="p-5" delay={100}>
                  <PanelHead title="Your thinking pattern" icon={Brain} />
                  <div className="mt-3 text-[14px] leading-relaxed text-lp-soft">
                    <Markdown source={pattern.body} />
                  </div>
                </Panel>
              )}
              {recs.length > 0 && (
                <Panel className="p-5" delay={140}>
                  <PanelHead title="Try next session" icon={CheckSquare} meta={<span>{recs.filter((r) => done.includes(r.text)).length}/{recs.length}</span>} />
                  <ul className="mt-3 space-y-2">
                    {recs.map((r) => {
                      const ok = done.includes(r.text);
                      return (
                        <li key={r.text}>
                          <button
                            type="button"
                            onClick={() => setDone((d) => (ok ? d.filter((x) => x !== r.text) : [...d, r.text]))}
                            className="flex w-full items-start gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-white/[0.03]"
                          >
                            {ok ? <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-lp-green" /> : <Square className="mt-0.5 h-4 w-4 shrink-0 text-lp-mute" />}
                            <span className={cn("text-[13.5px] leading-relaxed", ok ? "text-lp-mute line-through" : "text-lp-soft")}>
                              <Inline text={r.text} />
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
          </div>
        )}
      </div>
    </StudyShell>
  );
};

export default ThinkingReplayPage;
