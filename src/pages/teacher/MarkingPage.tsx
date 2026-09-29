import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Keyboard,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StudyShell, primaryBtn, selectCls } from "@/components/subjects/kit";
import { EmptyState, Panel, PanelHead, ghostBtn } from "@/components/student/ui";
import { useStoredState } from "@/components/assistant/storage";
import { themeFor } from "@/components/student/themes";
import { modKey, tone } from "@/lib/portalAppearance";
import { cn } from "@/lib/utils";
import { convertPercentageToGrade, fetchGradingSystems, type GradingSystem } from "@/services/gradingService";
import { initialsOf, isGraded, pctOf, useTeacherData, waited, type TSubmission } from "@/components/teacher/data";

type View = "todo" | "marked" | "all";

const DEFAULT_BANK = [
  "Clear structure: each point builds on the last.",
  "Back up each claim with a specific piece of evidence.",
  "Explain the why, not just the what.",
  "Show every step of your working and check your units.",
  "Strong, accurate use of subject vocabulary.",
  "Link your conclusion back to the question.",
  "Evaluate your method: what are its limitations?",
  "Proofread for spelling and punctuation before you hand in.",
];

const TONES = [
  { id: "warm", label: "Encouraging" },
  { id: "direct", label: "Direct" },
  { id: "criteria", label: "MYP criteria" },
] as const;

const typingIn = (el: EventTarget | null) => el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

const MarkingPage = () => {
  const { user } = useAuth();
  const { data, loading, patchSubmission } = useTeacherData();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>("todo");
  const [classId, setClassId] = useState(params.get("class") ?? "");
  const [assignmentId, setAssignmentId] = useState(params.get("assignment") ?? "");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(params.get("sub"));
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [markedThisSession, setMarkedThisSession] = useState(0);
  const [systems, setSystems] = useState<GradingSystem[]>([]);
  const [bank, setBank] = useStoredState<string[]>(user ? `refyn:${user.id}:comment-bank` : null, DEFAULT_BANK);
  const [showKeys, setShowKeys] = useState(false);
  const feedbackRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchGradingSystems().then(setSystems).catch(() => setSystems([]));
  }, []);

  // A deep link to one submission opens the right view for it
  useEffect(() => {
    const sub = params.get("sub");
    if (!sub) return;
    const s = data.submissions.find((x) => x.id === sub);
    if (s && isGraded(s)) setView("all");
  }, [params, data.submissions]);

  const assignmentsInClass = useMemo(() => data.assignments.filter((a) => !classId || a.class_id === classId), [data.assignments, classId]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = data.submissions.filter((s) => {
      const a = data.assignments.find((x) => x.id === s.assignment_id);
      if (!a) return false;
      if (classId && a.class_id !== classId) return false;
      if (assignmentId && s.assignment_id !== assignmentId) return false;
      if (view === "todo" && isGraded(s)) return false;
      if (view === "marked" && !isGraded(s)) return false;
      if (term) {
        const name = data.students[s.student_id]?.name ?? "";
        if (!`${name} ${a.title}`.toLowerCase().includes(term)) return false;
      }
      return true;
    });
    return view === "marked"
      ? out.sort((a, b) => ((a.graded_at ?? "") < (b.graded_at ?? "") ? 1 : -1))
      : out.sort((a, b) => (a.submitted_at < b.submitted_at ? -1 : 1));
  }, [data, classId, assignmentId, view, q]);

  const current: TSubmission | null = useMemo(() => {
    const byId = selected ? data.submissions.find((s) => s.id === selected) : null;
    return byId ?? list[0] ?? null;
  }, [selected, data.submissions, list]);
  const index = current ? list.findIndex((s) => s.id === current.id) : -1;
  const assignment = current ? data.assignments.find((a) => a.id === current.assignment_id) ?? null : null;
  const cls = assignment ? data.classes.find((c) => c.id === assignment.class_id) ?? null : null;
  const student = current ? data.students[current.student_id] : null;
  const system = cls?.grading_system_id ? systems.find((s) => s.id === cls.grading_system_id) ?? null : null;

  // Load the chosen submission into the form
  useEffect(() => {
    setScore(current?.grade != null ? String(current.grade) : "");
    setFeedback(current?.feedback ?? "");
    setEstimate(null);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = useCallback(
    (id: string | null) => {
      setSelected(id);
      const next = new URLSearchParams(params);
      if (id) next.set("sub", id);
      else next.delete("sub");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const move = useCallback(
    (dir: 1 | -1) => {
      if (!list.length) return;
      const i = index < 0 ? 0 : Math.min(list.length - 1, Math.max(0, index + dir));
      select(list[i].id);
    },
    [list, index, select],
  );

  const max = current?.max_grade || 100;
  const scoreNum = score.trim() === "" ? null : Number(score);
  // Marks are whole numbers (the grade column is an integer)
  const valid = scoreNum !== null && Number.isInteger(scoreNum) && scoreNum >= 0 && scoreNum <= max;
  const pct = valid ? (scoreNum! / max) * 100 : null;

  const save = useCallback(async () => {
    if (!current || !user) return;
    if (!valid) {
      toast.error(`Enter a whole mark between 0 and ${max}`);
      return;
    }
    setSaving(true);
    const patch = {
      grade: scoreNum!,
      feedback: feedback.trim() || null,
      graded_at: new Date().toISOString(),
      status: "graded",
    };
    const { error } = await supabase
      .from("assignment_submissions")
      .update({ ...patch, graded_by: user.id })
      .eq("id", current.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save that mark. Please try again.");
      return;
    }
    const wasNew = !isGraded(current);
    patchSubmission(current.id, patch);
    if (wasNew) setMarkedThisSession((n) => n + 1);
    toast.success(`Returned to ${student?.name ?? "the student"}`);
    // In the to-mark view the saved item drops out, so the same index is the next one
    const rest = list.filter((s) => s.id !== current.id);
    const nextItem = view === "todo" ? rest[Math.min(index, rest.length - 1)] : list[index + 1];
    select(nextItem?.id ?? null);
  }, [current, user, valid, max, scoreNum, feedback, patchSubmission, student, list, view, index, select]);

  const insert = useCallback((text: string) => {
    setFeedback((f) => (f.trim() ? `${f.trim()}\n${text}` : text));
    window.setTimeout(() => feedbackRef.current?.focus(), 0);
  }, []);

  const draft = async (toneId: (typeof TONES)[number]["id"]) => {
    if (!current || !assignment) return;
    setDrafting(toneId);
    setEstimate(null);
    const style =
      toneId === "warm"
        ? "warm and encouraging, like a supportive teacher"
        : toneId === "direct"
          ? "direct and concise, no filler"
          : "structured around the relevant IB MYP assessment criteria, naming the criterion for each point";
    const prompt = [
      `You are helping a teacher write feedback on a student's work. Write it ${style}.`,
      `Assignment: ${assignment.title}.`,
      assignment.description ? `Task: ${assignment.description}` : "",
      `The work is marked out of ${max}.`,
      "Write: one sentence on what works well, two specific next steps, and one question that pushes their thinking. Speak to the student as \"you\". Under 90 words. Plain text, no headings, no names.",
      `On the very last line write "Suggested mark: N/${max}" with your honest estimate.`,
      "",
      "Student's work:",
      (current.content || "(The student attached a file and wrote no text.)").slice(0, 6000),
    ]
      .filter(Boolean)
      .join("\n");
    try {
      const { data: res, error } = await supabase.functions.invoke("ai-chat", {
        body: { prompt, subject: "general", gradeLevel: "high-school", processTeaching: false, sessionId: null, history: [] },
      });
      if (error) throw error;
      const reply = String(res?.reply || res?.response || "").trim();
      if (!reply) throw new Error("empty");
      const m = /suggested mark:\s*([\d.]+)\s*\/\s*([\d.]+)/i.exec(reply);
      if (m) setEstimate(Math.min(max, Math.max(0, Math.round(Number(m[1])))));
      setFeedback(reply.replace(/\n?\s*suggested mark:.*$/i, "").trim());
      window.setTimeout(() => feedbackRef.current?.focus(), 0);
    } catch {
      toast.error("Refyn couldn't draft feedback just now.");
    } finally {
      setDrafting(null);
    }
  };

  // Keyboard: J/K or arrows to move, ⌘/Ctrl+Enter to return, Alt+1–9 for saved comments
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        save();
        return;
      }
      if (e.altKey && /^[1-9]$/.test(e.key)) {
        const text = bank[Number(e.key) - 1];
        if (text) {
          e.preventDefault();
          insert(text);
        }
        return;
      }
      if (typingIn(e.target) || e.metaKey || e.ctrlKey) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "f") {
        e.preventDefault();
        feedbackRef.current?.focus();
      } else if (e.key === "?") {
        setShowKeys((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, move, insert, bank]);

  const todoCount = data.submissions.filter((s) => !isGraded(s)).length;
  const words = current?.content ? current.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const late = current && assignment?.due_date ? new Date(current.submitted_at) > new Date(assignment.due_date) : false;
  const quick = [...new Set([1, 0.85, 0.7, 0.5].map((f) => Math.round(max * f)))];

  return (
    <StudyShell wide>
      <header className="lp-fade flex flex-wrap items-end justify-between gap-4" style={{ animationFillMode: "both" }}>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">Teaching</p>
          <h1 className="mt-1 text-[32px] font-semibold tracking-[-0.035em] text-white">Marking</h1>
          <p className="mt-1 text-[14.5px] text-lp-soft">
            {todoCount ? `${todoCount} waiting.` : "Nothing waiting."} {markedThisSession > 0 && <span className="text-lp-green">{markedThisSession} returned this session.</span>}
          </p>
        </div>
        <button type="button" onClick={() => setShowKeys((v) => !v)} className={ghostBtn}>
          <Keyboard className="h-4 w-4" /> Shortcuts
        </button>
      </header>

      {showKeys && (
        <div className="lp-fade mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-lp-line bg-lp-surface/70 p-4 text-[12.5px] text-lp-soft sm:grid-cols-5" style={{ animationFillMode: "both" }}>
          {[
            ["J / ↓", "Next"],
            ["K / ↑", "Previous"],
            ["F", "Write feedback"],
            ["Alt + 1–9", "Insert saved comment"],
            [`${modKey()} + Enter`, "Return and go to next"],
          ].map(([k, v]) => (
            <p key={k}>
              <kbd className="rounded-md border border-lp-line bg-lp-deep/60 px-1.5 py-0.5 text-[11.5px] text-white">{k}</kbd> <span className="ml-1">{v}</span>
            </p>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="lp-fade mt-6 flex flex-wrap items-center gap-3" style={{ animationDelay: "40ms", animationFillMode: "both" }}>
        <div className="inline-flex rounded-xl border border-lp-line bg-lp-surface/60 p-1">
          {(
            [
              ["todo", "To mark"],
              ["marked", "Marked"],
              ["all", "All"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn("h-8 rounded-lg px-3 text-[13px] font-medium transition-colors", view === id ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setAssignmentId("");
          }}
          className={cn(selectCls, "w-auto min-w-[170px]")}
          aria-label="Class"
        >
          <option value="">All classes</option>
          {data.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} className={cn(selectCls, "w-auto min-w-[200px] max-w-[280px]")} aria-label="Assignment">
          <option value="">All assignments</option>
          {assignmentsInClass.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
        <label className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a student or task" className="h-10 w-full rounded-xl border border-lp-line bg-lp-deep/40 pl-9 pr-3 text-[13.5px] text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none" />
        </label>
      </div>

      {loading && !data.classes.length ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <div className="lp-skeleton h-[520px] rounded-3xl" />
          <div className="lp-skeleton h-[520px] rounded-3xl" />
          <div className="lp-skeleton h-[520px] rounded-3xl" />
        </div>
      ) : !list.length && !current ? (
        <Panel className="mt-6 p-8">
          <EmptyState
            icon={CheckCircle2}
            title={view === "todo" ? "All caught up" : "Nothing here yet"}
            body={view === "todo" ? "Every hand-in in this view has been marked. New work shows up here, oldest first." : "Try another class, assignment or view."}
            action={
              view === "todo" ? (
                <button type="button" onClick={() => setView("marked")} className={ghostBtn}>
                  See marked work
                </button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          {/* Queue */}
          <Panel className="p-2 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto" delay={60}>
            <p className="px-3 pb-2 pt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">
              {list.length} in view
            </p>
            <ul className="max-h-[320px] space-y-0.5 overflow-y-auto xl:max-h-none">
              {list.map((s) => {
                const a = data.assignments.find((x) => x.id === s.assignment_id);
                const c = data.classes.find((x) => x.id === a?.class_id);
                const name = data.students[s.student_id]?.name ?? "Student";
                const on = current?.id === s.id;
                const p = pctOf(s);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => select(s.id)}
                      className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", on ? "bg-lp-blue/15 ring-1 ring-inset ring-lp-sky/30" : "hover:bg-white/[0.04]")}
                    >
                      <span className="lp-keep flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: themeFor(name).gradient }}>
                        {initialsOf(name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-[13.5px]", on ? "font-medium text-white" : "text-lp-text")}>{name}</span>
                        <span className="flex items-center gap-1.5 truncate text-[11.5px] text-lp-mute">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: themeFor(c?.subject).accent }} />
                          <span className="truncate">{a?.title}</span>
                        </span>
                      </span>
                      {p !== null ? (
                        <span className="shrink-0 text-[12px] font-semibold tabular-nums text-lp-green">{Math.round(p)}%</span>
                      ) : (
                        <span className="shrink-0 text-[11.5px] tabular-nums text-lp-mute">{waited(s.submitted_at)}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {/* Submission */}
          <div className="min-w-0">
            {current && assignment ? (
              <Panel className="p-5 sm:p-7" delay={100}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="lp-keep flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white" style={{ background: themeFor(student?.name ?? "").gradient }}>
                      {initialsOf(student?.name ?? "Student")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[18px] font-semibold tracking-[-0.02em] text-white">{student?.name ?? "Student"}</p>
                      <p className="truncate text-[12.5px] text-lp-mute">{student?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => move(-1)} disabled={index <= 0} className="flex h-9 w-9 items-center justify-center rounded-xl border border-lp-line text-lp-soft hover:text-white disabled:opacity-40" aria-label="Previous">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-[64px] text-center text-[12.5px] tabular-nums text-lp-mute">
                      {index + 1} / {list.length}
                    </span>
                    <button type="button" onClick={() => move(1)} disabled={index >= list.length - 1} className="flex h-9 w-9 items-center justify-center rounded-xl border border-lp-line text-lp-soft hover:text-white disabled:opacity-40" aria-label="Next">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-lp-line bg-lp-deep/40 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    {cls && (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium" style={{ color: tone(themeFor(cls.subject).accent), background: `${themeFor(cls.subject).accent}1A` }}>
                        {cls.name}
                      </span>
                    )}
                    {assignment.due_date && <span className="text-lp-mute">Due {format(new Date(assignment.due_date), "EEE d MMM, HH:mm")}</span>}
                  </div>
                  <p className="mt-2 text-[17px] font-semibold text-white">{assignment.title}</p>
                  {assignment.description && <p className="mt-1 text-[13.5px] leading-relaxed text-lp-soft">{assignment.description}</p>}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] text-lp-mute">
                  <Clock className="h-3.5 w-3.5" /> Handed in {formatDistanceToNow(new Date(current.submitted_at), { addSuffix: true })}
                  {late && <span className="rounded-full bg-lp-amber/15 px-2 py-0.5 font-medium text-lp-amber">Late</span>}
                  {words > 0 && <span>· {words} words</span>}
                  {isGraded(current) && current.graded_at && <span className="text-lp-green">· Marked {formatDistanceToNow(new Date(current.graded_at), { addSuffix: true })}</span>}
                </div>

                <article className="mt-4 whitespace-pre-wrap rounded-2xl border border-lp-line bg-lp-surface/60 p-5 text-[15px] leading-[1.75] text-lp-text">
                  {current.content?.trim() || <span className="text-lp-mute">No written answer. See the attached file.</span>}
                </article>

                {current.file_url && (
                  <a href={current.file_url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-3 rounded-2xl border border-lp-line p-3 transition-colors hover:border-lp-sky/40">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lp-blue/15 text-lp-sky">
                      <FileText className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-white">{current.file_name || "Attached file"}</span>
                      <span className="text-[12px] text-lp-mute">Opens in a new tab</span>
                    </span>
                    <Download className="h-4 w-4 text-lp-mute" />
                  </a>
                )}
              </Panel>
            ) : (
              <Panel className="p-8" delay={100}>
                <EmptyState icon={ClipboardCheck} title="Pick a hand-in" body="Choose a student on the left to start." />
              </Panel>
            )}
          </div>

          {/* Grade + feedback */}
          <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
            {current && (
              <Panel className="p-5" delay={140}>
                <PanelHead title="Mark" icon={ClipboardCheck} meta={system ? system.name : "Percentage"} />
                <div className="mt-4 flex items-end gap-3">
                  <label className="flex-1">
                    <span className="sr-only">Mark</span>
                    <div className="flex h-14 items-center rounded-2xl border border-lp-line bg-lp-deep/40 px-4 focus-within:border-lp-sky/60">
                      <input
                        value={score}
                        onChange={(e) => setScore(e.target.value.replace(/\D/g, ""))}
                        inputMode="numeric"
                        placeholder="—"
                        className="w-full bg-transparent text-[26px] font-semibold tabular-nums text-white placeholder:text-lp-mute focus:outline-none"
                        aria-label={`Mark out of ${max}`}
                      />
                      <span className="shrink-0 text-[15px] text-lp-mute">/ {max}</span>
                    </div>
                  </label>
                  <div className="h-14 min-w-[84px] rounded-2xl border border-lp-line bg-lp-surface/60 px-3 py-2 text-center">
                    <p className="text-[10.5px] uppercase tracking-[0.14em] text-lp-mute">{system ? "Grade" : "Percent"}</p>
                    <p className={cn("text-[17px] font-semibold tabular-nums", pct === null ? "text-lp-mute" : pct >= 70 ? "text-lp-green" : pct >= 50 ? "text-lp-amber" : "text-lp-red")}>
                      {pct === null ? "—" : system ? convertPercentageToGrade(pct, system) : `${Math.round(pct)}%`}
                    </p>
                  </div>
                </div>
                {score !== "" && !valid && <p className="mt-2 text-[12px] text-lp-red">Enter a whole mark between 0 and {max}.</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {quick.map((v) => (
                    <button key={v} type="button" onClick={() => setScore(String(v))} className="h-8 rounded-lg border border-lp-line px-2.5 text-[12.5px] tabular-nums text-lp-soft hover:border-lp-sky/50 hover:text-white">
                      {v}
                    </button>
                  ))}
                  {estimate !== null && (
                    <button type="button" onClick={() => setScore(String(estimate))} className="inline-flex h-8 items-center gap-1 rounded-lg border border-lp-cyan/40 bg-lp-cyan/10 px-2.5 text-[12.5px] text-lp-cyan" title="Refyn's estimate. You decide the mark.">
                      <Sparkles className="h-3 w-3" /> Refyn: {estimate}
                    </button>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-white">Feedback</p>
                  <span className="text-[11.5px] text-lp-mute">{feedback.trim() ? `${feedback.trim().split(/\s+/).length} words` : "Optional"}</span>
                </div>
                <textarea
                  ref={feedbackRef}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={Math.min(14, Math.max(6, feedback.split("\n").length + Math.ceil(feedback.length / 42)))}
                  placeholder="What went well, and the next step…"
                  className="mt-2 w-full resize-y rounded-2xl border border-lp-line bg-lp-deep/40 p-3.5 text-[14px] leading-relaxed text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 inline-flex items-center gap-1 text-[12px] text-lp-mute">
                    <Wand2 className="h-3.5 w-3.5 text-lp-cyan" /> Draft with Refyn
                  </span>
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={!!drafting}
                      onClick={() => draft(t.id)}
                      className="inline-flex h-7 items-center gap-1 rounded-full border border-lp-line px-2.5 text-[12px] text-lp-soft transition-colors hover:border-lp-cyan/50 hover:text-white disabled:opacity-50"
                    >
                      {drafting === t.id && <Loader2 className="h-3 w-3 animate-spin" />} {t.label}
                    </button>
                  ))}
                </div>

                <button type="button" onClick={save} disabled={saving || !valid} className={cn(primaryBtn, "mt-5 h-11 w-full")}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isGraded(current) ? "Update mark" : "Return to student"}
                  <kbd className="ml-1 rounded border border-white/30 px-1 text-[10.5px] font-normal">{modKey()} ↵</kbd>
                </button>
                <p className="mt-2 text-center text-[11.5px] text-lp-mute">Students see the mark and feedback straight away.</p>
              </Panel>
            )}

            <Panel className="mt-5 p-5" delay={180}>
              <PanelHead title="Comment bank" meta="Alt + 1–9" />
              <ul className="mt-3 space-y-1">
                {bank.map((c, i) => (
                  <li key={`${i}-${c}`} className="group flex items-start gap-2">
                    <button type="button" onClick={() => insert(c)} className="flex min-w-0 flex-1 items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] leading-snug text-lp-soft transition-colors hover:bg-white/[0.04] hover:text-white">
                      <kbd className="mt-px shrink-0 rounded border border-lp-line px-1 text-[10.5px] tabular-nums text-lp-mute">{i < 9 ? i + 1 : "·"}</kbd>
                      <span>{c}</span>
                    </button>
                    <button type="button" onClick={() => setBank((b) => b.filter((_, j) => j !== i))} className="mt-1 hidden h-6 w-6 shrink-0 items-center justify-center rounded-md text-lp-mute hover:text-lp-red group-hover:flex" aria-label="Remove comment">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={!feedback.trim()}
                onClick={() => {
                  const text = feedback.trim().split("\n").pop()?.trim();
                  if (text && !bank.includes(text)) setBank((b) => [...b, text].slice(0, 20));
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-lp-sky hover:text-white disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" /> Save the last line of feedback
              </button>
              {bank.length !== DEFAULT_BANK.length || bank.some((c, i) => c !== DEFAULT_BANK[i]) ? (
                <button type="button" onClick={() => setBank(DEFAULT_BANK)} className="ml-4 inline-flex items-center gap-1 text-[12px] text-lp-mute hover:text-white">
                  <X className="h-3 w-3" /> Reset
                </button>
              ) : null}
            </Panel>

            <p className="mt-4 flex items-center justify-center gap-3 text-[11.5px] text-lp-mute">
              <span className="inline-flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" /> move
              </span>
              <Link to="/grades" className="text-lp-sky hover:text-white">
                Open gradebook
              </Link>
            </p>
          </div>
        </div>
      )}
    </StudyShell>
  );
};

export default MarkingPage;
