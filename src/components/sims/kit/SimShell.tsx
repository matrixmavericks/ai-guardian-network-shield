import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, Check, ClipboardPlus, Circle, Database, Expand, Link2, MessageSquare, Minimize, Pause, Play, Plus, RotateCcw, SlidersHorizontal, StepForward, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { SpaceShell } from "@/components/spaces/ui";
import { SUBJECTS, simById } from "../registry";
import { DataPanel, type Row } from "./graph";

// The page around every simulation: header actions, the stage, and a panel
// with controls, challenges, recorded data and the ideas behind it.

export type Challenge = { id: string; title: string; detail?: string; done: boolean };
type Tab = "controls" | "challenges" | "data" | "learn";

const SPEEDS = [0.25, 0.5, 1, 2, 4];

export const SimShell: React.FC<{
  id: string;
  stage: React.ReactNode;
  /** Readouts drawn over the stage */
  overlay?: React.ReactNode;
  /** A graph or extra view under the stage */
  below?: React.ReactNode;
  controls: React.ReactNode;
  learn: React.ReactNode;
  challenges?: Challenge[];
  /** The current measurements, saved as a row in Data */
  record?: () => Row;
  running?: boolean;
  onRun?: (run: boolean) => void;
  onReset?: () => void;
  onStep?: () => void;
  speed?: number;
  onSpeed?: (s: number) => void;
  /** The current set-up and results, in words, for Ask Refyn */
  ask: () => string;
}> = ({ id, stage, overlay, below, controls, learn, challenges = [], record, running, onRun, onReset, onStep, speed = 1, onSpeed, ask }) => {
  const meta = simById(id)!;
  const subject = SUBJECTS[meta.subject];
  const navigate = useNavigate();
  const { user } = useAuth();
  const teacher = user?.role === "teacher" || user?.role === "admin";
  const [tab, setTab] = useState<Tab>("controls");
  const [rows, setRows] = useState<Row[]>(() => { try { return JSON.parse(localStorage.getItem(`refyn:sim:${id}:rows`) || "[]"); } catch { return []; } });
  const [won, setWon] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(`refyn:sim:${id}:won`) || "[]"); } catch { return []; } });
  const [full, setFull] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const timeAware = !!onRun;

  useEffect(() => { try { localStorage.setItem(`refyn:sim:${id}:rows`, JSON.stringify(rows.slice(-200))); } catch { /* storage unavailable */ } }, [id, rows]);
  useEffect(() => { try { localStorage.setItem(`refyn:sim:${id}:won`, JSON.stringify(won)); } catch { /* storage unavailable */ } }, [id, won]);

  // Challenges stay completed once done
  useEffect(() => {
    const fresh = challenges.filter((c) => c.done && !won.includes(c.id));
    if (!fresh.length) return;
    setWon((w) => [...w, ...fresh.map((c) => c.id)]);
    fresh.forEach((c) => toast.success("Challenge complete", { description: c.title }));
  }, [challenges, won]);

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else root.current?.requestFullscreen?.().catch(() => toast.error("Full screen isn't available here"));
  };

  const doRecord = () => {
    if (!record) return;
    setRows((r) => [...r, record()]);
    toast("Recorded", { description: `${rows.length + 1} row${rows.length ? "s" : ""} in Data` });
  };

  // Space plays/pauses, R resets, F presents, Enter records (not while typing)
  const keys = useRef({ onRun, running, onReset, doRecord, toggleFull });
  keys.current = { onRun, running, onReset, doRecord, toggleFull };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select, [contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = keys.current;
      if (e.key === " " && k.onRun) { e.preventDefault(); k.onRun(!k.running); }
      else if (e.key.toLowerCase() === "r" && k.onReset) k.onReset();
      else if (e.key.toLowerCase() === "f") k.toggleFull();
      else if (e.key === "Enter" && record) k.doRecord();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [record]);

  const askRefyn = () => {
    const prompt = `I'm using the Refyn "${meta.title}" simulation (${subject.name}).\n${ask()}${rows.length ? `\nMy recorded data (${rows.length} rows): ${JSON.stringify(rows.slice(-12))}` : ""}\n\nHelp me understand what is happening and why. Ask me one question at a time to check my understanding.`;
    navigate(`/ai-learning-assistant?prompt=${encodeURIComponent(prompt.slice(0, 3500))}`);
  };
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied", { description: "It opens this simulation with these exact settings." }); }
    catch { toast.error("Couldn't copy the link"); }
  };
  const setTask = () => {
    const q = new URLSearchParams({
      title: meta.title,
      instructions: `Open the ${meta.title} simulation (link below). It starts with the settings I chose.\n\n1. Before you change anything, predict what will happen and write down why.\n2. Change one variable at a time and record your measurements in the Data tab.\n3. Complete the challenges in the simulation.\n4. Explain your results using the ideas from the Learn tab.`,
      linkTitle: `${meta.title} simulation`,
      linkUrl: window.location.href,
    });
    navigate(`/task/new?${q}`);
  };

  const doneCount = challenges.filter((c) => c.done || won.includes(c.id)).length;
  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: "controls", label: "Controls", icon: SlidersHorizontal },
    ...(challenges.length ? [{ id: "challenges" as Tab, label: "Challenges", icon: Trophy, badge: `${doneCount}/${challenges.length}` }] : []),
    ...(record ? [{ id: "data" as Tab, label: "Data", icon: Database, badge: rows.length ? String(rows.length) : undefined }] : []),
    { id: "learn", label: "Learn", icon: BookOpen },
  ];
  const iconBtn = "flex h-9 w-9 items-center justify-center rounded-xl border border-lp-line text-lp-soft transition-colors hover:border-lp-sky/50 hover:text-white";

  return (
    <SpaceShell>
      <div ref={root} className={cn("flex min-h-0 flex-1 flex-col bg-lp-bg", full && "sim-present")}>
        <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-lp-line/60 px-3 py-2 sm:px-5">
          {!full && <Link to="/sims" aria-label="All simulations" className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-mute hover:bg-white/[0.06] hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: subject.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: subject.color }} />{subject.name} · {meta.levels.join(" · ")}</p>
            <h1 className="truncate text-[16px] font-semibold tracking-[-0.01em] text-white sm:text-[17px]">{meta.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {timeAware && (
              <>
                <button type="button" onClick={() => onRun!(!running)} aria-label={running ? "Pause" : "Play"} title={`${running ? "Pause" : "Play"} (space)`} className="flex h-9 items-center gap-1.5 rounded-xl bg-lp-blue px-3 text-[13px] font-medium text-white hover:bg-[#2F6FE0]">
                  {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}<span className="hidden sm:inline">{running ? "Pause" : "Play"}</span>
                </button>
                {onStep && !running && <button type="button" onClick={onStep} aria-label="Step" title="Step forward" className={iconBtn}><StepForward className="h-4 w-4" /></button>}
                {onSpeed && (
                  <select value={speed} onChange={(e) => onSpeed(Number(e.target.value))} aria-label="Speed" title="Speed" className="h-9 rounded-xl border border-lp-line bg-lp-surface px-2 text-[13px] text-lp-soft outline-none hover:text-white">
                    {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
                  </select>
                )}
              </>
            )}
            {onReset && <button type="button" onClick={onReset} aria-label="Reset" title="Reset (R)" className={iconBtn}><RotateCcw className="h-4 w-4" /></button>}
            {record && <button type="button" onClick={doRecord} title="Record the current values (Enter)" className="flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-2.5 text-[13px] text-lp-soft hover:border-lp-sky/50 hover:text-white"><Circle className="h-3.5 w-3.5 fill-lp-red text-lp-red" /><span className="hidden sm:inline">Record</span></button>}
            <span className="mx-0.5 hidden h-6 w-px bg-lp-line sm:block" />
            <button type="button" onClick={askRefyn} title="Ask Refyn about this" className="flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-2.5 text-[13px] text-lp-soft hover:border-lp-sky/50 hover:text-white"><MessageSquare className="h-4 w-4" /><span className="hidden md:inline">Ask Refyn</span></button>
            <button type="button" onClick={share} aria-label="Copy a link to this set-up" title="Copy a link to this set-up" className={iconBtn}><Link2 className="h-4 w-4" /></button>
            {teacher && <button type="button" onClick={setTask} title="Set as a task with this set-up" className="flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-2.5 text-[13px] text-lp-soft hover:border-lp-sky/50 hover:text-white"><ClipboardPlus className="h-4 w-4" /><span className="hidden lg:inline">Set as task</span></button>}
            <button type="button" onClick={toggleFull} aria-label={full ? "Leave presenter mode" : "Presenter mode"} title={full ? "Leave presenter mode (F)" : "Presenter mode (F)"} className={iconBtn}>{full ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}</button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
          <div className="flex min-h-0 flex-col gap-3 p-3 sm:p-4 lg:overflow-y-auto">
            <div className="relative h-[52vh] min-h-[300px] shrink-0 overflow-hidden rounded-3xl border border-lp-line bg-lp-deep/50 lg:h-auto lg:min-h-[380px] lg:flex-1">
              {stage}
              {overlay}
            </div>
            {below}
          </div>
          <aside className="flex min-h-0 flex-col border-t border-lp-line/60 lg:border-l lg:border-t-0">
            <div role="tablist" className="flex shrink-0 gap-1 overflow-x-auto border-b border-lp-line/60 px-3 py-2">
              {tabs.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[13px] transition-colors", tab === t.id ? "bg-lp-raised text-white" : "text-lp-mute hover:text-white")}>
                  {t.label}{t.badge && <span className="rounded-full bg-lp-blue/20 px-1.5 text-[11px] tabular-nums text-lp-sky">{t.badge}</span>}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-24 lg:pb-6">
              <div className={cn("space-y-6", tab !== "controls" && "hidden")}>{controls}</div>
              {tab === "challenges" && (
                <ul className="space-y-2.5">
                  {challenges.map((c) => {
                    const done = c.done || won.includes(c.id);
                    return (
                      <li key={c.id} className={cn("flex gap-3 rounded-2xl border p-3.5 transition-colors", done ? "border-lp-green/40 bg-lp-green/10" : "border-lp-line bg-lp-surface/60")}>
                        <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", done ? "border-lp-green bg-lp-green text-[#ffffff]" : "border-lp-line text-lp-mute")}>{done ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 rotate-45 opacity-0" />}</span>
                        <span className="min-w-0"><span className="block text-[13.5px] font-medium leading-snug text-white">{c.title}</span>{c.detail && <span className="mt-0.5 block text-[12px] leading-relaxed text-lp-mute">{c.detail}</span>}</span>
                      </li>
                    );
                  })}
                  {won.length > 0 && <li><button type="button" onClick={() => setWon([])} className="text-[12px] text-lp-mute hover:text-white">Start the challenges again</button></li>}
                </ul>
              )}
              {tab === "data" && <DataPanel rows={rows} fileName={`refyn-${id}`} onClear={() => setRows([])} onRemove={(i) => setRows((r) => r.filter((_, k) => k !== i))} />}
              {tab === "learn" && <div className="sim-learn space-y-4 text-[13.5px] leading-relaxed text-lp-soft">{learn}</div>}
            </div>
          </aside>
        </div>
      </div>
    </SpaceShell>
  );
};

/** Building blocks for the Learn tab. */
export const Eq: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="my-2 rounded-xl border border-lp-line bg-lp-deep/60 px-3 py-2 text-center font-mono text-[14px] text-white">{children}</p>
);
export const H: React.FC<{ children: React.ReactNode }> = ({ children }) => <h3 className="text-[14px] font-semibold text-white">{children}</h3>;
export const Try: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl border border-lp-amber/30 bg-lp-amber/10 px-3 py-2.5 text-[13px]"><span className="font-semibold text-lp-amber">Predict, then test: </span>{children}</div>
);
