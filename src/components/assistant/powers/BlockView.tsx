import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, BarChart3, CalendarRange, Layers, LineChart, ListChecks, Loader2, Radio, WandSparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherData } from "@/components/teacher/data";
import { BLOCK_LABEL, blockKey, parseBlock, type BlockKind, type QuizSpec } from "./blocks";
import { Quiz } from "./Quiz";
import { Flashcards } from "./Flashcards";
import { Graph } from "./Graph";
import { Chart } from "./Chart";
import { Plan } from "./Plan";
import { Action } from "./Action";
import { Card, CardHead, field, ghost, primary } from "./ui";
import type { OutputFile } from "@/components/assistant/files/outputs";

const ICONS: Record<BlockKind, React.ElementType> = { quiz: ListChecks, flashcards: Layers, graph: LineChart, chart: BarChart3, plan: CalendarRange, action: WandSparkles };
const BUILDING: Record<BlockKind, string> = { quiz: "Writing your quiz", flashcards: "Making flashcards", graph: "Plotting the graph", chart: "Drawing the chart", plan: "Building your plan", action: "Getting that ready" };

/** Teachers: turn a chat quiz into a Refyn live quiz for one of their classes. */
const LaunchLive: React.FC<{ spec: QuizSpec; onClose: () => void }> = ({ spec, onClose }) => {
  const { user } = useAuth();
  const { data } = useTeacherData();
  const navigate = useNavigate();
  const [classId, setClassId] = useState(data.classes.length === 1 ? data.classes[0].id : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const questions = spec.questions.filter((q) => q.type !== "short");
  const launch = async () => {
    if (!user || !classId) return;
    setBusy(true);
    setError("");
    try {
      const { data: session, error: e1 } = await supabase.from("live_quiz_sessions").insert({ class_id: classId, teacher_id: user.id, title: spec.title.slice(0, 200), description: "Made in Refyn chat" }).select("id").single();
      if (e1 || !session) throw e1;
      const rows = questions.map((q, i) => {
        const options = q.type === "mcq" ? q.options.map((text, k) => ({ text, isCorrect: k === q.answer })) : [{ text: "True", isCorrect: q.type === "tf" && q.answer }, { text: "False", isCorrect: q.type === "tf" && !q.answer }];
        return { session_id: session.id, question_order: i, question_text: q.q, question_type: q.type === "tf" ? "true_false" : "multiple_choice", options, correct_index: options.findIndex((o) => o.isCorrect), explanation: q.explain || null, ai_generated: true };
      });
      const { error: e2 } = await supabase.from("live_quiz_questions").insert(rows);
      if (e2) throw e2;
      navigate(`/class/${classId}?liveQuiz=${session.id}`);
    } catch {
      setBusy(false);
      setError("Couldn't create the live quiz. Try again.");
    }
  };
  return (
    <Card className="border-lp-sky/40">
      <CardHead icon={Radio} kind="Live quiz" title={`Launch "${spec.title}"`} />
      <p className="mt-2 text-[13px] text-lp-soft">{questions.length} question{questions.length === 1 ? "" : "s"}. Students join with a code from their class page and answer live; you get a leaderboard and results.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className={field + " sm:w-64"} aria-label="Class">
          <option value="">Choose a class…</option>
          {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="button" disabled={!classId || busy} onClick={launch} className={primary}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />} Launch</button>
        <button type="button" onClick={onClose} className={ghost}>Cancel</button>
      </div>
      {error && <p className="mt-2 text-[12.5px] text-lp-red">{error}</p>}
    </Card>
  );
};

export const BlockView: React.FC<{
  kind: BlockKind;
  attrs: string;
  body: string;
  complete: boolean;
  teacher: boolean;
  onAsk?: (prompt: string) => void;
  onSave?: (title: string, markdown: string) => void;
  /** Files written in the same reply (an action can attach them to a task) */
  files?: OutputFile[];
}> = ({ kind, attrs, body, complete, teacher, onAsk, onSave, files }) => {
  const block = useMemo(() => (complete ? parseBlock(kind, attrs, body) : null), [kind, attrs, body, complete]);
  const key = useMemo(() => blockKey(kind, body), [kind, body]);
  const [live, setLive] = useState<QuizSpec | null>(null);
  const Icon = ICONS[kind];

  if (!complete) {
    return (
      <Card className="border-dashed">
        <CardHead icon={Icon} kind={BLOCK_LABEL[kind]} title={`${BUILDING[kind]}…`}>
          <Loader2 className="h-4 w-4 animate-spin text-lp-sky" />
        </CardHead>
        <div className="mt-3 space-y-2"><div className="lp-skeleton h-3 w-3/4 rounded" /><div className="lp-skeleton h-3 w-1/2 rounded" /></div>
      </Card>
    );
  }
  if (!block) {
    return (
      <Card>
        <p className="flex items-center gap-2 text-[13px] text-lp-mute"><AlertCircle className="h-4 w-4 text-[#FBBF24]" /> This {BLOCK_LABEL[kind]} didn't come through properly.{onAsk ? "" : " Try asking again."}</p>
        {onAsk && <button type="button" onClick={() => onAsk(`The ${BLOCK_LABEL[kind]} in your last reply didn't display. Please send it again.`)} className={ghost + " mt-2"}>Ask Refyn to resend it</button>}
      </Card>
    );
  }
  switch (block.kind) {
    case "quiz":
      return (
        <>
          <Quiz spec={block.spec} storeKey={key} teacher={teacher} onAsk={onAsk} onLaunchLive={teacher ? setLive : undefined} />
          {live && <LaunchLive spec={live} onClose={() => setLive(null)} />}
        </>
      );
    case "flashcards": return <Flashcards spec={block.spec} storeKey={key} onSave={onSave} onAsk={onAsk} />;
    case "graph": return <Graph spec={block.spec} />;
    case "chart": return <Chart spec={block.spec} />;
    case "plan": return <Plan spec={block.spec} storeKey={key} onSave={onSave} />;
    case "action": return <Action spec={block.spec} storeKey={key} teacher={teacher} files={files} />;
  }
};
