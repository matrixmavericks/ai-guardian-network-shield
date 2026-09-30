import React, { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, ClipboardType, FileText, Fingerprint, Loader2, ScanSearch, ShieldCheck, Sparkles, Target, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { StudyShell } from "@/components/subjects/kit";
import { extractFile, formatSize } from "@/components/assistant/files/extract";
import { mySchoolId } from "@/components/pastpapers/store";
import { PP_CRITERIA, PP_STRANDS, type PPCriterionId, type PPStrandId } from "@/lib/personalProject";
import { deleteReview, listReviews, retryStrand, runReview, wordCount, type Progress, type Review, type StrandResult } from "@/components/pp/analyze";
import { ReviewView } from "@/components/pp/Review";

type Row = Awaited<ReturnType<typeof listReviews>>[number];
const input = "h-10 w-full rounded-xl border border-lp-line bg-lp-deep/60 px-3 text-[14px] text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60";

const Features = () => (
  <div className="grid gap-3 sm:grid-cols-2">
    {[
      [Target, "Every strand, one at a time", "Ai to Cii, judged against the IB criteria the way examiners do, with the level ladder and what gets you to the next band."],
      [ScanSearch, "Notes on your own words", "Highlights in your report show what earns credit and what to improve."],
      [ShieldCheck, "Your own voice and referencing", "Finds generic passages, missing citations and text to check against sources. Nothing is written for you."],
      [Fingerprint, "Similarity check", "Compares your draft anonymously with other reports at your school, ignoring shared template text."],
    ].map(([Icon, title, body]) => {
      const I = Icon as React.ElementType;
      return (
        <div key={title as string} className="rounded-2xl border border-lp-line bg-lp-surface/60 p-4">
          <I className="h-5 w-5 text-lp-sky" />
          <p className="mt-2 text-[14px] font-medium text-white">{title as string}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-lp-mute">{body as string}</p>
        </div>
      );
    })}
  </div>
);

const Start: React.FC<{ onRun: (o: { text: string; title: string; fileName?: string; pages?: number; minutes: number; compare: boolean }) => void }> = ({ onRun }) => {
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(0);
  const [compare, setCompare] = useState(true);
  const [reading, setReading] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const pick = useRef<HTMLInputElement>(null);

  const go = async () => {
    try {
      if (mode === "upload") {
        if (!file) return;
        setReading("Reading your report");
        const out = await extractFile(file, null, setReading);
        if (wordCount(out.text) < 150) throw new Error("There isn't enough text in this file. If it's a scanned PDF, upload the Word or PDF you wrote instead.");
        onRun({ text: out.text, title: title.trim() || file.name.replace(/\.[a-z0-9]+$/i, ""), fileName: file.name, pages: out.pages, minutes, compare });
      } else {
        if (wordCount(text) < 150) { toast.error("Paste your whole report (at least 150 words)."); return; }
        onRun({ text, title: title.trim() || "Personal project report", minutes, compare });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReading(null);
    }
  };

  return (
    <section className="rounded-3xl border border-lp-line bg-lp-surface p-5 sm:p-6">
      <div className="flex rounded-xl border border-lp-line bg-lp-deep/40 p-1 text-[13px] sm:inline-flex">
        {([["upload", "Upload report", Upload], ["paste", "Paste text", ClipboardType]] as const).map(([k, label, Icon]) => (
          <button key={k} type="button" onClick={() => setMode(k)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 sm:flex-none", mode === k ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      {mode === "upload" ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
          onClick={() => pick.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") pick.current?.click(); }}
          className={cn("mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors", drag ? "border-lp-sky bg-lp-blue/10" : "border-lp-line hover:border-lp-blue/50")}
        >
          {file ? (
            <>
              <FileText className="h-7 w-7 text-lp-sky" />
              <p className="mt-2 text-[15px] font-medium text-white">{file.name}</p>
              <p className="text-[12.5px] text-lp-mute">{formatSize(file.size)} · click to choose another</p>
            </>
          ) : (
            <>
              <Upload className="h-7 w-7 text-lp-sky" />
              <p className="mt-2 text-[15px] font-medium text-white">Drop your report here</p>
              <p className="mt-1 text-[13px] text-lp-mute">PDF or Word. Upload the PDF you'll submit to get an exact page count.</p>
            </>
          )}
          <input ref={pick} type="file" accept=".pdf,.docx,.txt,.md,.rtf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ""; }} />
        </div>
      ) : (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder="Paste your whole report, from your learning goal to your evaluation." className="mt-4 w-full resize-y rounded-2xl border border-lp-line bg-lp-deep/60 px-4 py-3 text-[14px] leading-relaxed text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60" />
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <label className="block text-[12.5px] text-lp-mute">
          Title (optional)
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Draft 2: learning to compose for strings" className={cn(input, "mt-1")} />
        </label>
        <label className="block text-[12.5px] text-lp-mute">
          Recording submitted with it
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={cn(input, "mt-1")}>
            <option value={0}>None (15 pages)</option>
            {Array.from({ length: 9 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m} min ({15 - m} pages)</option>)}
          </select>
        </label>
      </div>
      <label className="mt-3 flex items-start gap-2.5 text-[13px] text-lp-soft">
        <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#3B82F6]" />
        <span>Check similarity with other reports at my school. <span className="text-lp-mute">Refyn stores an anonymous fingerprint (hashes of 8-word phrases, not your text). Nobody sees your report.</span></span>
      </label>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[520px] text-[12.5px] leading-relaxed text-lp-mute">Feedback, not a mark: your supervisor assesses your report and the IB moderates it. Refyn never writes your report for you.</p>
        <button type="button" onClick={go} disabled={!!reading || (mode === "upload" ? !file : !text.trim())} className="flex h-11 items-center gap-2 rounded-xl bg-lp-blue px-5 text-[14.5px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(59,130,246,0.9)] hover:bg-[#2F6FE0] disabled:opacity-50">
          {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {reading ?? "Get feedback"}
        </button>
      </div>
    </section>
  );
};

const Working: React.FC<{ progress: Progress; strands: Partial<Record<PPStrandId, StrandResult>> }> = ({ progress, strands }) => (
  <section className="rounded-3xl border border-lp-line bg-lp-surface p-6">
    <div className="flex items-center gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-lp-sky" />
      <p className="text-[16px] font-medium text-white">Reviewing your report…</p>
    </div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-lp-line"><div className="h-full rounded-full bg-lp-blue transition-all duration-500" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>
    <p className="mt-2 text-[12.5px] text-lp-mute">{progress.done} of {progress.total} checks · {progress.label}</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      {(Object.keys(PP_CRITERIA) as PPCriterionId[]).map((c) => (
        <div key={c} className="rounded-2xl border border-lp-line p-4">
          <p className="text-[12.5px] text-lp-mute">Criterion {c} · {PP_CRITERIA[c].name}</p>
          <div className="mt-2 space-y-1.5">
            {PP_CRITERIA[c].strands.map((id) => {
              const r = strands[id];
              const s = PP_STRANDS.find((x) => x.id === id)!;
              return (
                <div key={id} className="flex items-center gap-2 text-[13px]">
                  {r ? <Check className="h-4 w-4 text-lp-green" /> : <Loader2 className="h-4 w-4 animate-spin text-lp-mute" />}
                  <span className="min-w-0 flex-1 truncate text-lp-soft">{id} · {s.label}</span>
                  {r && <span className="font-semibold text-white">{r.error ? "–" : r.level}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  </section>
);

const PersonalProjectPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [working, setWorking] = useState<{ progress: Progress; strands: Partial<Record<PPStrandId, StrandResult>> } | null>(null);
  const [open, setOpen] = useState<{ review: Review; previous: Review | null } | null>(null);

  const refresh = () => listReviews().then(setRows, () => setRows([]));
  useEffect(() => {
    if (!user) return;
    mySchoolId(user.id).then(setSchoolId, () => setSchoolId(null));
    refresh();
  }, [user]);

  const previousOf = (id: string, list: Row[]) => {
    const i = list.findIndex((r) => r.id === id);
    const prev = list.slice(i + 1).find((r) => (r.result as Review)?.strands);
    return prev ? ({ ...(prev.result as Review), id: prev.id } as Review) : null;
  };

  const run = async (o: { text: string; title: string; fileName?: string; pages?: number; minutes: number; compare: boolean }) => {
    if (!user) return;
    const strands: Partial<Record<PPStrandId, StrandResult>> = {};
    setWorking({ progress: { done: 0, total: 1, label: "Starting" }, strands });
    try {
      const review = await runReview({
        userId: user.id,
        schoolId,
        ...o,
        onProgress: (progress) => setWorking((w) => (w ? { ...w, progress } : w)),
        onStrand: (r) => setWorking((w) => (w ? { ...w, strands: { ...w.strands, [r.strand]: r } } : w)),
      });
      const list = await listReviews();
      setRows(list);
      setOpen({ review, previous: previousOf(review.id, list) });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setWorking(null);
    }
  };

  if (!user) return null;
  return (
    <StudyShell wide>
      {open ? (
        <ReviewView
          review={open.review}
          previous={open.previous}
          onBack={() => { setOpen(null); refresh(); }}
          onRetry={async (id) => {
            const next = await retryStrand(open.review, id);
            setOpen((o) => (o ? { ...o, review: next } : o));
            if (next.strands[id]?.error) toast.error(next.strands[id]!.error!);
          }}
        />
      ) : (
        <>
          <header className="lp-fade mb-6" style={{ animationFillMode: "both" }}>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">MYP personal project</p>
            <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">Personal project coach</h1>
            <p className="mt-1.5 max-w-[680px] text-[14.5px] text-lp-soft">
              Upload a draft of your report and get feedback on every strand of the IB criteria (Planning, Applying skills, Reflecting), notes on your own words, and integrity checks. Then improve it and review the next draft.
            </p>
          </header>
          {working ? <Working progress={working.progress} strands={working.strands} /> : <Start onRun={run} />}
          <div className="mt-6"><Features /></div>
          <section className="mt-8">
            <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-lp-mute">Your drafts</p>
            {!rows ? (
              <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="lp-skeleton h-16 rounded-2xl" />)}</div>
            ) : !rows.length ? (
              <p className="rounded-2xl border border-dashed border-lp-line p-6 text-center text-[13.5px] text-lp-mute">Your reviewed drafts will appear here, so you can see your progress.</p>
            ) : (
              <div className="divide-y divide-lp-line overflow-hidden rounded-2xl border border-lp-line bg-lp-surface">
                {rows.map((r) => {
                  const res = r.result as Partial<Review>;
                  const done = !!res?.strands;
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <button
                        type="button"
                        disabled={!done}
                        onClick={() => setOpen({ review: { ...(res as Review), id: r.id }, previous: previousOf(r.id, rows) })}
                        className="flex min-w-0 flex-1 items-center gap-4 text-left disabled:cursor-default"
                      >
                        <div className="flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-lp-blue/15">
                          <span className="text-[16px] font-semibold leading-none text-white">{done ? res.total : "–"}</span>
                          <span className="text-[10px] text-lp-mute">/24</span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] text-white">{r.title}</p>
                          <p className="text-[12px] text-lp-mute">
                            {done ? `A ${res.criteria?.A} · B ${res.criteria?.B} · C ${res.criteria?.C}` : "Didn't finish"} · {r.words ? `${r.words.toLocaleString()} words · ` : ""}{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </button>
                      <button type="button" aria-label={`Delete ${r.title}`} onClick={async () => { if (!confirm("Delete this review?")) return; await deleteReview(r.id); refresh(); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-lp-red">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </StudyShell>
  );
};

export default PersonalProjectPage;
