import React, { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ClipboardType, FileText, Loader2, ScanSearch, Sparkles, Target, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { StudyShell } from "@/components/subjects/kit";
import { extractFile, formatSize } from "@/components/assistant/files/extract";
import { MYP, type Letter, type MypGroup } from "@/lib/myp";
import {
  LETTERS, askTutor, deleteTaskReview, ext, listTaskReviews, loadFile, retryTaskCriterion, runTaskReview, saveTaskReview, totals, type CriterionResult, type TaskReview,
} from "@/components/criteria/engine";
import { WorkView } from "@/components/criteria/WorkView";
import { useSearchParams } from "react-router-dom";
import { loadTask, tscText } from "@/components/tasks/task";

const input = "h-10 w-full rounded-xl border border-lp-line bg-lp-deep/60 px-3 text-[14px] text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60";
const GROUPS = Object.keys(MYP) as MypGroup[];
const wordsIn = (t: string) => (t.match(/[\p{L}\p{N}’']+/gu) ?? []).length;

/** A task set in Refyn, so its rubric and clarifications drive the review. */
type FromTask = { group: MypGroup; year: number; criteria: Letter[]; title: string; description: string; tsc: string };

const Start: React.FC<{ onRun: (o: { text: string; title: string; group: MypGroup; year: number; criteria: Letter[]; task: { title: string; description: string; tsc: string }; file?: File; pages?: number }) => void; from?: FromTask | null }> = ({ onRun, from }) => {
  const [group, setGroup] = useState<MypGroup>(from?.group ?? "sciences");
  const [year, setYear] = useState(from?.year ?? 5);
  const [criteria, setCriteria] = useState<Letter[]>(from?.criteria ?? ["B", "C"]);
  const [title, setTitle] = useState(from?.title ?? "");
  const [taskText, setTaskText] = useState(from?.description ?? "");
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const pickWork = useRef<HTMLInputElement>(null);
  const pickTask = useRef<HTMLInputElement>(null);

  const toggle = (l: Letter) => setCriteria((c) => (c.includes(l) ? c.filter((x) => x !== l) : [...c, l].sort() as Letter[]));
  const readTask = async (f: File) => {
    setBusy("Reading the task sheet");
    try { setTaskText((await extractFile(f, null)).text.slice(0, 6000)); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const go = async () => {
    if (!criteria.length) { toast.error("Choose at least one criterion."); return; }
    try {
      const task = { title: title.trim(), description: taskText.trim(), tsc: from?.tsc ?? "" };
      if (mode === "upload") {
        if (!file) return;
        setBusy("Reading your work");
        const out = await extractFile(file, null, setBusy);
        if (wordsIn(out.text) < 60) throw new Error("There isn't enough text in this file to review.");
        onRun({ text: out.text, title: title.trim() || file.name.replace(/\.[a-z0-9]+$/i, ""), group, year, criteria, task, file: ext(file.name) ? file : undefined, pages: out.pages });
      } else {
        if (wordsIn(text) < 60) { toast.error("Paste your work (at least 60 words)."); return; }
        onRun({ text, title: title.trim() || "My work", group, year, criteria, task });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-3xl border border-lp-line bg-lp-surface p-5 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[12.5px] font-medium text-lp-soft">1 · Subject and year</p>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_130px] gap-2">
            <select value={group} onChange={(e) => setGroup(e.target.value as MypGroup)} aria-label="Subject group" className={input}>
              {GROUPS.map((g) => <option key={g} value={g}>{MYP[g].name}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="MYP year" className={input}>
              {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>MYP {y}</option>)}
            </select>
          </div>
          <p className="mt-4 text-[12.5px] font-medium text-lp-soft">2 · Which criteria is it assessed on?</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {LETTERS.map((l) => (
              <button key={l} type="button" onClick={() => toggle(l)} aria-pressed={criteria.includes(l)} className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left", criteria.includes(l) ? "border-lp-sky/60 bg-lp-blue/15" : "border-lp-line hover:border-lp-blue/40")}>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-semibold", criteria.includes(l) ? "bg-lp-blue text-white" : "bg-lp-raised text-lp-soft")}>{l}</span>
                <span className="text-[13px] leading-snug text-white">{MYP[group].criteria[l].name}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] font-medium text-lp-soft">3 · The task <span className="font-normal text-lp-mute">(optional, but feedback is much sharper with it)</span></p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title, e.g. Investigating osmosis in potatoes" className={cn(input, "mt-2")} />
          <textarea value={taskText} onChange={(e) => setTaskText(e.target.value)} rows={4} placeholder="Paste the task sheet or your teacher's instructions and task-specific clarifications" className="mt-2 w-full resize-y rounded-xl border border-lp-line bg-lp-deep/60 px-3 py-2 text-[13.5px] text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60" />
          <button type="button" onClick={() => pickTask.current?.click()} className="mt-1 text-[12.5px] text-lp-sky hover:underline">or upload the task sheet</button>
          <input ref={pickTask} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readTask(f); e.target.value = ""; }} />
        </div>
        <div>
          <p className="text-[12.5px] font-medium text-lp-soft">4 · Your work</p>
          <div className="mt-2 flex rounded-xl border border-lp-line bg-lp-deep/40 p-1 text-[13px] sm:inline-flex">
            {([["upload", "Upload", Upload], ["paste", "Paste", ClipboardType]] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" onClick={() => setMode(k)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 sm:flex-none", mode === k ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}><Icon className="h-4 w-4" /> {label}</button>
            ))}
          </div>
          {mode === "upload" ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
              onClick={() => pickWork.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") pickWork.current?.click(); }}
              className={cn("mt-3 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors", drag ? "border-lp-sky bg-lp-blue/10" : "border-lp-line hover:border-lp-blue/50")}
            >
              {file ? (<><FileText className="h-7 w-7 text-lp-sky" /><p className="mt-2 text-[15px] font-medium text-white">{file.name}</p><p className="text-[12.5px] text-lp-mute">{formatSize(file.size)} · click to choose another</p></>)
                : (<><Upload className="h-7 w-7 text-lp-sky" /><p className="mt-2 text-[15px] font-medium text-white">Drop your lab report, essay or task</p><p className="mt-1 text-[13px] text-lp-mute">PDF or Word. Feedback appears as notes on your own document.</p></>)}
              <input ref={pickWork} type="file" accept=".pdf,.docx,.txt,.md,.rtf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ""; }} />
            </div>
          ) : (
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder="Paste your work" className="mt-3 w-full resize-y rounded-2xl border border-lp-line bg-lp-deep/60 px-4 py-3 text-[14px] leading-relaxed text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60" />
          )}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[560px] text-[12.5px] leading-relaxed text-lp-mute">Feedback against the real MYP criteria for {MYP[group].name}, strand by strand. It's feedback, not a mark: your teacher assesses your work. Refyn never writes it for you.</p>
        <button type="button" onClick={go} disabled={!!busy || !criteria.length || (mode === "upload" ? !file : !text.trim())} className="flex h-11 items-center gap-2 rounded-xl bg-lp-blue px-5 text-[14.5px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(59,130,246,0.9)] hover:bg-[#2F6FE0] disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy ?? "Get feedback"}
        </button>
      </div>
    </section>
  );
};

const AssessmentCoachPage = () => {
  const { user } = useAuth();
  // ?task=<id> from a task page: start from that task's rubric
  const [params, setParams] = useSearchParams();
  const [from, setFrom] = useState<FromTask | null>(null);
  useEffect(() => {
    const id = params.get("task");
    if (!id) return;
    loadTask(id, null).then((r) => {
      const rb = r?.task.rubric;
      if (r && rb?.kind === "myp") {
        setFrom({ group: rb.group, year: rb.year, criteria: rb.criteria, title: r.task.title, description: [r.task.instructions || r.task.description, r.task.worksheet].filter(Boolean).join("\n\n").slice(0, 6000), tsc: tscText(rb) });
        toast.success("Set up from your task: its criteria and your teacher's clarifications are loaded.");
      }
    });
    params.delete("task");
    setParams(params, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [rows, setRows] = useState<TaskReview[] | null>(null);
  const [open, setOpen] = useState<{ review: TaskReview; file: Blob | null } | null>(null);
  const [working, setWorking] = useState<{ criteria: Letter[]; done: Partial<Record<Letter, CriterionResult>> } | null>(null);

  const refresh = () => listTaskReviews().then(setRows, () => setRows([]));
  useEffect(() => { if (user) refresh(); }, [user]);

  const run = async (o: Parameters<React.ComponentProps<typeof Start>["onRun"]>[0]) => {
    if (!user) return;
    setWorking({ criteria: o.criteria, done: {} });
    try {
      const review = await runTaskReview({ userId: user.id, ...o, onResult: (r) => setWorking((w) => (w ? { ...w, done: { ...w.done, [r.criterion]: r } } : w)) });
      setOpen({ review, file: o.file && review.fileType ? o.file : null });
      refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setWorking(null);
    }
  };
  const openReview = async (r: TaskReview) => {
    setOpen({ review: r, file: null });
    if (r.filePath) {
      const file = await loadFile(r.filePath);
      setOpen((o) => (o && o.review.id === r.id ? { ...o, file } : o));
    }
  };
  const update = (review: TaskReview) => setOpen((o) => (o ? { ...o, review } : o));

  if (!user) return null;
  if (open) {
    const r = open.review;
    return (
      <StudyShell wide>
        <WorkView
          group={r.group}
          criteria={r.criteria}
          results={r.results}
          text={r.text}
          file={open.file}
          fileType={r.fileType}
          mode="student"
          chat={r.chat}
          onAsk={async (q, focus) => {
            const answer = await askTutor(r.text, r.group, r.results, r.chat, q, focus);
            const next = { ...r, chat: [...r.chat, { role: "user" as const, content: q }, { role: "assistant" as const, content: answer }] };
            update(next);
            saveTaskReview(next).catch(() => toast.error("Couldn't save this conversation."));
          }}
          onRetry={async (l) => update(await retryTaskCriterion(r, l))}
          header={
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => { setOpen(null); refresh(); }} className="flex h-9 items-center gap-2 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:text-white"><ArrowLeft className="h-4 w-4" /> All work</button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-white">{r.title}</p>
                <p className="text-[12px] text-lp-mute">{MYP[r.group].name} · MYP {r.year} · {r.words.toLocaleString()} words{r.task.title && r.task.title !== r.title ? ` · ${r.task.title}` : ""}</p>
              </div>
            </div>
          }
        />
      </StudyShell>
    );
  }

  return (
    <StudyShell wide>
      <header className="lp-fade mb-6" style={{ animationFillMode: "both" }}>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">MYP assessment</p>
        <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">Assessment coach</h1>
        <p className="mt-1.5 max-w-[680px] text-[14.5px] text-lp-soft">Check a lab report, essay, investigation or maths task against your subject's real MYP criteria before you hand it in. Feedback shows up as notes on your own document, strand by strand, with what the next band needs.</p>
      </header>
      {working ? (
        <section className="rounded-3xl border border-lp-line bg-lp-surface p-6">
          <div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-lp-sky" /><p className="text-[16px] font-medium text-white">Reviewing your work, one criterion at a time…</p></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {working.criteria.map((l) => {
              const r = working.done[l];
              return (
                <div key={l} className="rounded-2xl border border-lp-line p-4">
                  <p className="text-[12.5px] text-lp-mute">Criterion {l}</p>
                  <p className="mt-1 text-[24px] font-semibold text-white">{r ? (r.error ? "–" : r.level) : <Loader2 className="h-5 w-5 animate-spin text-lp-mute" />}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[12.5px] text-lp-mute">A careful review takes a minute or two.</p>
        </section>
      ) : <Start key={from ? "task" : "blank"} onRun={run} from={from} />}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          [Target, "The real criteria", "Every subject group's MYP criteria, strand by strand, with why you got each level and what the next band needs."],
          [ScanSearch, "Notes on your document", "Highlights and numbered notes on your own PDF or Word file, so you see exactly where to improve."],
          [Sparkles, "Ask anything", "An AI tutor explains any note, command term or criterion, without doing the work for you."],
        ].map(([Icon, t, b]) => {
          const I = Icon as React.ElementType;
          return <div key={t as string} className="rounded-2xl border border-lp-line bg-lp-surface/60 p-4"><I className="h-5 w-5 text-lp-sky" /><p className="mt-2 text-[14px] font-medium text-white">{t as string}</p><p className="mt-1 text-[12.5px] leading-relaxed text-lp-mute">{b as string}</p></div>;
        })}
      </div>

      <section className="mt-8">
        <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-lp-mute">Your work</p>
        {!rows ? <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="lp-skeleton h-16 rounded-2xl" />)}</div>
          : !rows.length ? <p className="rounded-2xl border border-dashed border-lp-line p-6 text-center text-[13.5px] text-lp-mute">Work you check will appear here, so you can see how each draft improves.</p>
          : (
            <div className="divide-y divide-lp-line overflow-hidden rounded-2xl border border-lp-line bg-lp-surface">
              {rows.map((r) => {
                const levels = Object.fromEntries(r.criteria.map((l) => [l, r.results[l] && !r.results[l]!.error ? r.results[l]!.level : null]));
                const t = totals(levels, r.criteria);
                const done = Object.keys(r.results).length > 0;
                return (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <button type="button" disabled={!done} onClick={() => openReview(r)} className="flex min-w-0 flex-1 items-center gap-4 text-left disabled:cursor-default">
                      <div className="flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-lp-blue/15">
                        <span className="text-[16px] font-semibold leading-none text-white">{done ? t.total : "–"}</span>
                        <span className="text-[10px] text-lp-mute">/{t.max}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] text-white">{r.title}</p>
                        <p className="text-[12px] text-lp-mute">{MYP[r.group].name} · {r.criteria.map((l) => `${l} ${levels[l] ?? "–"}`).join(" · ")} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</p>
                      </div>
                    </button>
                    <button type="button" aria-label={`Delete ${r.title}`} onClick={async () => { if (!confirm("Delete this review and its file?")) return; await deleteTaskReview(r); refresh(); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-lp-red"><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          )}
      </section>
    </StudyShell>
  );
};

export default AssessmentCoachPage;
