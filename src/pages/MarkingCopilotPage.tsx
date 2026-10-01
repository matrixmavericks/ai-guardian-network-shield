import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, BarChart3, Check, CheckCircle2, ClipboardList, Download, FileDown, Import, Lightbulb, Loader2, Plus, Sparkles, Square, Trash2, Upload, Users, Wand2, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { StudyShell } from "@/components/subjects/kit";
import { useTeacherData } from "@/components/teacher/data";
import { MYP, type Letter, type MypGroup } from "@/lib/myp";
import {
  LETTERS, addFiles, classInsights, commentOf, targetsOf, createSet, deleteItem, deleteSet, draftTsc, exportCsv, importSubmissions, levelOf, listSets, loadFile, loadSet,
  markAll, markItem, saveItem, saveToSubmission, totals, updateSet, type MarkingItem, type MarkingSet,
} from "@/components/criteria/engine";
import { WorkView } from "@/components/criteria/WorkView";

const input = "h-10 w-full rounded-xl border border-lp-line bg-lp-deep/60 px-3 text-[14px] text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60";
const area = "w-full resize-y rounded-xl border border-lp-line bg-lp-deep/60 px-3 py-2 text-[13.5px] leading-relaxed text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60";
const btn = "flex h-9 items-center gap-2 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:border-lp-blue/50 hover:text-white disabled:opacity-50";
const GROUPS = Object.keys(MYP) as MypGroup[];
const heat = (lv: number | null) =>
  lv === null ? "bg-lp-raised/40 text-lp-mute" : lv >= 7 ? "bg-emerald-500/25 text-emerald-200" : lv >= 5 ? "bg-sky-500/25 text-sky-200" : lv >= 3 ? "bg-amber-500/25 text-amber-200" : "bg-rose-500/25 text-rose-200";

/* ---------- new set / task editor ---------- */

type Draft = Pick<MarkingSet, "title" | "subject_group" | "year" | "criteria" | "task" | "assignment_id">;

const SetForm: React.FC<{ initial?: Draft; assignments: { id: string; title: string }[]; onSave: (d: Draft) => Promise<void>; onCancel: () => void; saveLabel: string }> = ({ initial, assignments, onSave, onCancel, saveLabel }) => {
  const [d, setD] = useState<Draft>(initial ?? { title: "", subject_group: "sciences", year: 5, criteria: ["A", "B", "C", "D"], task: { title: "", description: "", tsc: "" }, assignment_id: null });
  const [busy, setBusy] = useState<string | null>(null);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const task = (p: Partial<Draft["task"]>) => setD((x) => ({ ...x, task: { ...x.task, ...p } }));
  return (
    <section className="rounded-3xl border border-lp-line bg-lp-surface p-5 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-[12.5px] text-lp-mute">Name
            <input value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. 9B Osmosis lab report" className={cn(input, "mt-1")} />
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_130px] gap-2">
            <label className="block text-[12.5px] text-lp-mute">Subject group
              <select value={d.subject_group} onChange={(e) => set({ subject_group: e.target.value as MypGroup })} className={cn(input, "mt-1")}>{GROUPS.map((g) => <option key={g} value={g}>{MYP[g].name}</option>)}</select>
            </label>
            <label className="block text-[12.5px] text-lp-mute">Year
              <select value={d.year} onChange={(e) => set({ year: Number(e.target.value) })} className={cn(input, "mt-1")}>{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>MYP {y}</option>)}</select>
            </label>
          </div>
          <div>
            <p className="text-[12.5px] text-lp-mute">Criteria assessed</p>
            <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
              {LETTERS.map((l) => {
                const on = d.criteria.includes(l);
                return (
                  <button key={l} type="button" aria-pressed={on} onClick={() => set({ criteria: on ? d.criteria.filter((x) => x !== l) : ([...d.criteria, l].sort() as Letter[]) })} className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left", on ? "border-lp-sky/60 bg-lp-blue/15" : "border-lp-line")}>
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-semibold", on ? "bg-lp-blue text-white" : "bg-lp-raised text-lp-soft")}>{l}</span>
                    <span className="text-[13px] text-white">{MYP[d.subject_group].criteria[l].name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {assignments.length > 0 && (
            <label className="block text-[12.5px] text-lp-mute">Linked Refyn assignment (optional: import its submissions, save marks back)
              <select value={d.assignment_id ?? ""} onChange={(e) => set({ assignment_id: e.target.value || null })} className={cn(input, "mt-1")}>
                <option value="">None</option>
                {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="space-y-3">
          <label className="block text-[12.5px] text-lp-mute">The task (title and instructions students were given)
            <input value={d.task.title} onChange={(e) => task({ title: e.target.value })} placeholder="Task title" className={cn(input, "mt-1")} />
            <textarea value={d.task.description} onChange={(e) => task({ description: e.target.value })} rows={4} placeholder="Paste the task sheet" className={cn(area, "mt-2")} />
          </label>
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12.5px] text-lp-mute">Task-specific clarifications (used as the descriptors)</p>
              <button
                type="button"
                disabled={!!busy || !d.criteria.length}
                onClick={async () => { setBusy("tsc"); try { task({ tsc: await draftTsc(d) }); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); } }}
                className="flex items-center gap-1.5 text-[12.5px] text-lp-sky hover:underline disabled:opacity-50"
              >
                {busy === "tsc" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Draft with AI
              </button>
            </div>
            <textarea value={d.task.tsc} onChange={(e) => task({ tsc: e.target.value })} rows={9} placeholder="Paste your own, or draft them with AI and edit. Without them, Refyn judges against the criteria's strands." className={cn(area, "mt-1")} />
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className={btn}>Cancel</button>
        <button type="button" disabled={!!busy || !d.title.trim() || !d.criteria.length} onClick={async () => { setBusy("save"); try { await onSave({ ...d, title: d.title.trim() }); } finally { setBusy(null); } }} className="flex h-9 items-center gap-2 rounded-xl bg-lp-blue px-4 text-[13.5px] font-medium text-white disabled:opacity-50">
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {saveLabel}
        </button>
      </div>
    </section>
  );
};

/* ---------- one set ---------- */

const Distribution: React.FC<{ set: MarkingSet; items: MarkingItem[] }> = ({ set, items }) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-[repeat(var(--n),minmax(0,1fr))]" style={{ "--n": set.criteria.length } as React.CSSProperties}>
    {set.criteria.map((l) => {
      const lv = items.map((i) => levelOf(i, l)).filter((x): x is number => x !== null);
      const bands = [[1, 2], [3, 4], [5, 6], [7, 8]].map(([a, b]) => lv.filter((x) => x >= a && x <= b).length);
      const max = Math.max(1, ...bands);
      const mean = lv.length ? lv.reduce((a, b) => a + b, 0) / lv.length : null;
      return (
        <div key={l} className="rounded-2xl border border-lp-line bg-lp-surface p-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[12px] text-lp-mute">{l} · {MYP[set.subject_group].criteria[l].name}</p>
            <p className="shrink-0 text-[13px] font-semibold text-white">{mean !== null ? mean.toFixed(1) : "–"}</p>
          </div>
          <div className="mt-2.5 flex h-14 items-end gap-1.5">
            {bands.map((n, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className={cn("w-full rounded-t-md", ["bg-rose-400/70", "bg-amber-400/70", "bg-sky-400/70", "bg-emerald-400/70"][i])} style={{ height: `${(n / max) * 44 + 2}px` }} title={`${n} in ${["1–2", "3–4", "5–6", "7–8"][i]}`} />
                <span className="text-[10px] text-lp-mute">{["1–2", "3–4", "5–6", "7–8"][i]}</span>
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

const SetView: React.FC<{ setId: string; userId: string; onBack: () => void }> = ({ setId, userId, onBack }) => {
  const { data, patchSubmission } = useTeacherData();
  const [set, setSet] = useState<MarkingSet | null>(null);
  const [items, setItems] = useState<MarkingItem[] | null>(null);
  const [adding, setAdding] = useState<{ name: string; status: string }[] | null>(null);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const stop = useRef({ stop: false });
  const pick = useRef<HTMLInputElement>(null);
  const pendingSave = useRef(new Map<string, { patch: Partial<Pick<MarkingItem, "overrides" | "approved">>; timer: number }>());

  useEffect(() => {
    loadSet(setId).then((r) => { if (r) { setSet(r.set); setItems(r.items); } else { toast.error("Marking set not found"); onBack(); } });
  }, [setId, onBack]);
  useEffect(() => {
    const pending = pendingSave.current;
    return () => {
      // Leaving the set stops any batch pre-marking (the current pieces finish) and flushes unsaved edits
      stop.current.stop = true;
      pending.forEach((q, id) => { window.clearTimeout(q.timer); saveItem({ id } as MarkingItem, q.patch).catch(() => undefined); });
      pending.clear();
    };
  }, []);
  const patch = (i: MarkingItem) => setItems((xs) => xs?.map((x) => (x.id === i.id ? i : x)) ?? xs);
  const current = items?.find((i) => i.id === openId) ?? null;
  const idx = items && current ? items.indexOf(current) : -1;
  useEffect(() => {
    setFile(null);
    if (current?.file_path) loadFile(current.file_path).then(setFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  if (!set || !items) return <div className="flex h-60 items-center justify-center gap-2 text-lp-mute"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const done = items.filter((i) => i.status === "done").length;
  const pending = items.filter((i) => i.status === "queued" || i.status === "error").length;
  const approved = items.filter((i) => i.approved);
  const assignment = data.assignments.find((a) => a.id === set.assignment_id);
  const subs = data.submissions.filter((s) => s.assignment_id === set.assignment_id);

  // Edits are applied at once and saved shortly after, batched per student
  const update = (i: MarkingItem, p: Partial<Pick<MarkingItem, "overrides" | "approved">>) => {
    setItems((xs) => xs?.map((x) => (x.id === i.id ? { ...x, ...p } : x)) ?? xs);
    const q = pendingSave.current.get(i.id);
    window.clearTimeout(q?.timer);
    const all = { ...q?.patch, ...p };
    pendingSave.current.set(i.id, {
      patch: all,
      timer: window.setTimeout(() => {
        pendingSave.current.delete(i.id);
        saveItem(i, all).catch((e) => toast.error((e as Error).message));
      }, 500),
    });
  };

  if (current) {
    const results = current.result?.results ?? {};
    return (
      <WorkView
        group={set.subject_group}
        criteria={set.criteria}
        results={results}
        text={current.text}
        file={file}
        fileType={current.file_type}
        mode="teacher"
        overrides={current.overrides}
        onOverride={(l, lv) => { const o = { ...current.overrides }; if (lv === null) delete o[l]; else o[l] = lv; update(current, { overrides: o }); }}
        comment={commentOf(current, set)}
        onComment={(s) => update(current, { overrides: { ...current.overrides, comment: s } })}
        targets={targetsOf(current, set).join("\n")}
        onTargets={(s) => update(current, { overrides: { ...current.overrides, targets: s } })}
        approved={current.approved}
        onApprove={(v) => update(current, { approved: v })}
        onRetry={async () => { patch(await markItem(set, current, patch)); }}
        header={
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setOpenId(null)} className={btn}><ArrowLeft className="h-4 w-4" /> Class</button>
            <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
              <p className="truncate text-[16px] font-medium text-white">{current.student_name}</p>
              <p className="text-[12px] text-lp-mute">{set.title} · {idx + 1} of {items.length}{current.status === "working" ? " · marking…" : current.status === "queued" ? " · not marked yet" : ""}</p>
            </div>
            <div className="ml-auto flex gap-2">
              {current.status === "queued" && <button type="button" onClick={async () => patch(await markItem(set, current, patch))} className="flex h-9 items-center gap-2 rounded-xl bg-lp-blue px-3.5 text-[13px] font-medium text-white"><Sparkles className="h-4 w-4" /> Pre-mark</button>}
              <button type="button" disabled={idx <= 0} onClick={() => setOpenId(items[idx - 1].id)} className={btn}><ArrowLeft className="h-4 w-4" /> Previous</button>
              <button type="button" disabled={idx >= items.length - 1} onClick={() => setOpenId(items[idx + 1].id)} className={btn}>Next <ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
        }
      />
    );
  }

  const runAll = async () => {
    stop.current = { stop: false };
    setRunning(true);
    try { await markAll(set, items, patch, stop.current); } finally { setRunning(false); }
  };
  const upload = async (files: File[]) => {
    setAdding(files.map((f) => ({ name: f.name, status: "Waiting" })));
    const added = await addFiles(userId, set, files, (i, s) => setAdding((a) => a?.map((x, k) => (k === i ? { ...x, status: s } : x)) ?? a));
    setItems((xs) => [...(xs ?? []), ...added].sort((a, b) => a.student_name.localeCompare(b.student_name)));
    window.setTimeout(() => setAdding(null), 1500);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className={btn}><ArrowLeft className="h-4 w-4" /> All sets</button>
        <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
          <p className="truncate text-[20px] font-semibold tracking-[-0.01em] text-white">{set.title}</p>
          <p className="text-[12.5px] text-lp-mute">{MYP[set.subject_group].name} · MYP {set.year} · Criteria {set.criteria.join(", ")}{set.task.tsc ? " · with task-specific clarifications" : ""}{assignment ? ` · linked to "${assignment.title}"` : ""}</p>
        </div>
        <button type="button" onClick={() => setEditing((v) => !v)} className={cn(btn, "ml-auto sm:ml-0")}><ClipboardList className="h-4 w-4" /> Task and clarifications</button>
      </div>
      {editing && (
        <div className="mb-5">
          <SetForm initial={set} assignments={data.assignments} saveLabel="Save" onCancel={() => setEditing(false)} onSave={async (d) => { await updateSet(set.id, d); setSet({ ...set, ...d }); setEditing(false); toast.success("Saved. Pre-mark again to apply new clarifications."); }} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => pick.current?.click()} className={btn}><Upload className="h-4 w-4" /> Add student work</button>
        <input ref={pick} type="file" multiple accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; if (f.length) upload(f); }} />
        {assignment && (
          <button type="button" disabled={!!busy} onClick={async () => {
            setBusy("import");
            try {
              const names = Object.fromEntries(Object.values(data.students).map((s) => [s.id, s.name]));
              const { added, skipped } = await importSubmissions(userId, set, subs, names, items);
              setItems((xs) => [...(xs ?? []), ...added].sort((a, b) => a.student_name.localeCompare(b.student_name)));
              toast.success(`Imported ${added.length} submission${added.length === 1 ? "" : "s"}${skipped ? ` (${skipped} skipped: already here or empty)` : ""}`);
            } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
          }} className={btn}>{busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Import className="h-4 w-4" />} Import {subs.length} submission{subs.length === 1 ? "" : "s"}</button>
        )}
        <div className="flex-1" />
        {running ? (
          <button type="button" onClick={() => { stop.current.stop = true; }} className={btn}><Square className="h-3.5 w-3.5" /> Stop after current</button>
        ) : (
          <button type="button" disabled={!pending} onClick={runAll} className="flex h-9 items-center gap-2 rounded-xl bg-lp-blue px-4 text-[13.5px] font-medium text-white disabled:opacity-50">{pending || !items.length ? <><Sparkles className="h-4 w-4" /> Pre-mark {pending ? `${pending} ` : ""}with AI</> : <><CheckCircle2 className="h-4 w-4" /> All pre-marked</>}</button>
        )}
      </div>

      {adding && (
        <div className="mt-3 rounded-2xl border border-lp-line bg-lp-surface p-3">
          {adding.map((a, i) => <p key={i} className="flex items-center justify-between gap-3 py-0.5 text-[12.5px]"><span className="truncate text-lp-soft">{a.name}</span><span className={cn("shrink-0", a.status.startsWith("Error") ? "text-lp-red" : a.status === "Added" ? "text-lp-green" : "text-lp-mute")}>{a.status}</span></p>)}
        </div>
      )}
      {(running || items.some((i) => i.status === "working")) && (
        <div className="mt-3 rounded-2xl border border-lp-line bg-lp-surface p-3">
          <div className="flex items-center justify-between text-[12.5px] text-lp-soft"><span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-lp-sky" /> Pre-marking: each criterion is judged separately</span><span>{done} of {items.length}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lp-line"><div className="h-full rounded-full bg-lp-blue transition-all" style={{ width: `${(done / Math.max(1, items.length)) * 100}%` }} /></div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-lp-line p-10 text-center">
          <Users className="mx-auto h-7 w-7 text-lp-mute" />
          <p className="mt-2 text-[15px] text-white">Add your class's work</p>
          <p className="mx-auto mt-1 max-w-[480px] text-[13px] text-lp-mute">Drop in a PDF or Word file per student (name the files after the students), or import a Refyn assignment's submissions. Refyn pre-marks each criterion; you decide the final levels.</p>
        </div>
      ) : (
        <>
          {done > 0 && <div className="mt-5"><Distribution set={set} items={items} /></div>}

          <div className="mt-5 overflow-x-auto rounded-2xl border border-lp-line bg-lp-surface">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-lp-line text-left text-[12px] text-lp-mute">
                  <th className="sticky left-0 z-[1] bg-lp-surface px-4 py-2.5 font-medium">Student</th>
                  {set.criteria.map((l) => <th key={l} className="px-2 py-2.5 text-center font-medium" title={MYP[set.subject_group].criteria[l].name}>{l}</th>)}
                  <th className="px-2 py-2.5 text-center font-medium">Total</th>
                  {set.criteria.length === 4 && <th className="px-2 py-2.5 text-center font-medium" title="IB 1–7 boundary guideline">1–7</th>}
                  <th className="px-2 py-2.5 text-center font-medium">Approved</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-lp-line">
                {items.map((i) => {
                  const levels = Object.fromEntries(set.criteria.map((l) => [l, levelOf(i, l)])) as Partial<Record<Letter, number | null>>;
                  const t = totals(levels, set.criteria);
                  return (
                    <tr key={i.id} className="group/row cursor-pointer hover:bg-white/[0.03]" onClick={() => setOpenId(i.id)}>
                      <td className="sticky left-0 z-[1] max-w-[170px] bg-lp-surface px-4 py-2.5 sm:max-w-none">
                        {/* the sticky cell needs its own background, so it repeats the row hover */}
                        <span className="pointer-events-none absolute inset-0 group-hover/row:bg-white/[0.03]" />
                        <p className="truncate font-medium text-white">{i.student_name}</p>
                        <p className="truncate text-[11.5px] text-lp-mute">{i.status === "working" ? "Marking…" : i.status === "queued" ? "Not marked yet" : i.status === "error" ? `Error: ${i.error ?? ""}`.slice(0, 60) : i.file_type ? i.file_type.toUpperCase() : "Text"}</p>
                      </td>
                      {set.criteria.map((l) => (
                        <td key={l} className="px-2 py-2 text-center">
                          {i.status === "working" && levels[l] === null ? <Loader2 className="mx-auto h-4 w-4 animate-spin text-lp-mute" /> : (
                            <span className={cn("inline-flex h-8 w-9 items-center justify-center rounded-lg font-semibold", heat(levels[l] ?? null))}>
                              {levels[l] ?? "–"}{typeof i.overrides?.[l] === "number" && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-current" title="You changed this" />}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-2 text-center font-semibold text-white">{t.complete ? `${t.total}/${t.max}` : "–"}</td>
                      {set.criteria.length === 4 && <td className="px-2 text-center font-semibold text-white">{t.grade ?? "–"}</td>}
                      <td className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button type="button" aria-label={i.approved ? "Approved" : "Approve"} disabled={i.status !== "done"} onClick={() => update(i, { approved: !i.approved })} className={cn("mx-auto flex h-7 w-7 items-center justify-center rounded-lg border", i.approved ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300" : "border-lp-line text-lp-mute hover:text-white disabled:opacity-40")}>
                          <Check className="h-4 w-4" />
                        </button>
                      </td>
                      <td className="px-2" onClick={(e) => e.stopPropagation()}>
                        <button type="button" aria-label={`Remove ${i.student_name}`} onClick={async () => { if (!confirm(`Remove ${i.student_name}'s work from this set?`)) return; await deleteItem(i); setItems((xs) => xs?.filter((x) => x.id !== i.id) ?? xs); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-lp-mute hover:text-lp-red"><X className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" disabled={done < 2 || !!busy} onClick={async () => {
              setBusy("insights");
              try { const ins = await classInsights(set, items); await updateSet(set.id, { insights: ins }); setSet({ ...set, insights: ins }); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
            }} className={btn}>{busy === "insights" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />} {set.insights ? "Refresh class insights" : "Analyse the class"}</button>
            <button type="button" disabled={!done} onClick={() => {
              const url = URL.createObjectURL(exportCsv(set, items));
              const a = document.createElement("a"); a.href = url; a.download = `${set.title.replace(/[\\/:*?"<>|]+/g, "-")}.csv`; a.click();
              window.setTimeout(() => URL.revokeObjectURL(url), 2000);
            }} className={btn}><FileDown className="h-4 w-4" /> Export CSV</button>
            {approved.some((i) => i.submission_id) && (
              <button type="button" disabled={!!busy} onClick={async () => {
                if (!confirm(`Save ${approved.filter((i) => i.submission_id).length} approved mark(s) and comments to the Refyn assignment? Students will see them.`)) return;
                setBusy("save");
                let n = 0;
                for (const i of approved.filter((x) => x.submission_id)) {
                  try {
                    const saved = await saveToSubmission(i, set, userId);
                    if (saved) { n++; patchSubmission(i.submission_id!, { ...saved, status: "graded", graded_at: new Date().toISOString() }); }
                  } catch (e) { toast.error((e as Error).message); }
                }
                setBusy(null);
                toast.success(`Saved ${n} mark${n === 1 ? "" : "s"} to the gradebook`);
              }} className={btn}>{busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Save approved to gradebook</button>
            )}
            <span className="ml-auto text-[12px] text-lp-mute">{approved.length} of {items.length} approved</span>
          </div>

          {set.insights && (
            <section className="mt-5 rounded-3xl border border-lp-line bg-lp-surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="flex items-center gap-2 text-[15px] font-medium text-white"><BarChart3 className="h-4 w-4 text-lp-sky" /> Class insights</p>
                {set.insights.at && <p className="text-[11.5px] text-lp-mute">{formatDistanceToNow(new Date(set.insights.at), { addSuffix: true })}</p>}
              </div>
              <p className="mt-2 text-[14.5px] text-white">{set.insights.headline}</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-lp-mute">Common gaps</p>
                  <ul className="mt-2 space-y-2">{set.insights.misconceptions.map((m, k) => <li key={k} className="rounded-xl border border-lp-line p-3 text-[13px]"><span className="mr-1.5 rounded bg-lp-raised px-1.5 text-[11px] font-semibold text-lp-soft">{m.criterion}</span><span className="text-white">{m.issue}</span>{m.students.length > 0 && <p className="mt-1 text-[12px] text-lp-mute">{m.students.join(", ")}</p>}</li>)}</ul>
                </div>
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-lp-mute">Reteach next lesson</p>
                  <ul className="mt-2 space-y-2">{set.insights.reteach.map((r, k) => <li key={k} className="rounded-xl border border-lp-sky/30 bg-lp-blue/10 p-3 text-[13px] text-lp-soft"><span className="mr-1.5 rounded bg-lp-blue/30 px-1.5 text-[11px] font-semibold text-white">{r.criterion}</span>{r.activity}</li>)}</ul>
                  {set.insights.strengths.length > 0 && <><p className="mt-4 text-[12px] font-medium uppercase tracking-[0.12em] text-lp-mute">Strengths</p><ul className="mt-2 space-y-1 text-[13px] text-lp-soft">{set.insights.strengths.map((s) => <li key={s}>• {s}</li>)}</ul></>}
                </div>
              </div>
              {set.insights.groups.length > 0 && (
                <div className="mt-4">
                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-lp-mute">Suggested groups</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{set.insights.groups.map((g) => <div key={g.label} className="rounded-xl border border-lp-line p-3"><p className="text-[13px] font-medium text-white">{g.label}</p><p className="mt-1 text-[12px] text-lp-mute">{g.students.join(", ")}</p></div>)}</div>
                </div>
              )}
            </section>
          )}
        </>
      )}
      <p className="mt-6 text-[11.5px] text-lp-mute">Refyn pre-marks against the MYP criteria and your clarifications; every level is yours to confirm. 1–7 grades use the IB boundary guideline and only appear when all four criteria are marked.</p>
    </div>
  );
};

/* ---------- page ---------- */

const MarkingCopilotPage = () => {
  const { user } = useAuth();
  const { data } = useTeacherData();
  const [sets, setSets] = useState<(MarkingSet & { count: number })[] | null>(null);
  const [creating, setCreating] = useState(false);
  // ?set=<id> opens a set straight away (e.g. one started from the AI chat)
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(() => params.get("set"));
  const refresh = () => listSets().then(setSets, () => setSets([]));
  useEffect(() => { if (user) refresh(); }, [user]);
  useEffect(() => { if (params.get("set")) { params.delete("set"); setParams(params, { replace: true }); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const back = useMemo(() => () => { setOpenId(null); refresh(); }, []);

  if (!user) return null;
  return (
    <StudyShell wide>
      {openId ? <SetView setId={openId} userId={user.id} onBack={back} /> : (
        <>
          <header className="lp-fade mb-6 flex flex-wrap items-end justify-between gap-4" style={{ animationFillMode: "both" }}>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">Assessment</p>
              <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">Marking copilot</h1>
              <p className="mt-1.5 max-w-[680px] text-[14.5px] text-lp-soft">Drop in a class set of work. Refyn pre-marks every piece against the MYP criteria and your task-specific clarifications, with notes on each document. You moderate, approve and send feedback in a fraction of the time.</p>
            </div>
            {!creating && <button type="button" onClick={() => setCreating(true)} className="flex h-10 items-center gap-2 rounded-xl bg-lp-blue px-4 text-[14px] font-medium text-white"><Plus className="h-4 w-4" /> New marking set</button>}
          </header>
          {creating && (
            <div className="mb-6">
              <SetForm assignments={data.assignments} saveLabel="Create" onCancel={() => setCreating(false)} onSave={async (d) => {
                try { const s = await createSet(user.id, d); setCreating(false); setOpenId(s.id); } catch (e) { toast.error((e as Error).message); }
              }} />
            </div>
          )}
          {!sets ? <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="lp-skeleton h-20 rounded-2xl" />)}</div>
            : !sets.length && !creating ? (
              <div className="rounded-3xl border border-dashed border-lp-line p-10 text-center">
                <ClipboardList className="mx-auto h-7 w-7 text-lp-mute" />
                <p className="mt-2 text-[15px] text-white">No marking sets yet</p>
                <p className="mx-auto mt-1 max-w-[460px] text-[13px] text-lp-mute">Create one for a task: choose the subject group and criteria, paste the task sheet, and add your clarifications (or let Refyn draft them).</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sets.map((s) => (
                  <div key={s.id} className="group relative">
                    <button type="button" onClick={() => setOpenId(s.id)} className="block w-full rounded-2xl border border-lp-line bg-lp-surface p-4 text-left transition-colors hover:border-lp-blue/50">
                      <p className="truncate text-[15px] font-medium text-white">{s.title}</p>
                      <p className="mt-0.5 text-[12.5px] text-lp-mute">{MYP[s.subject_group].name} · MYP {s.year}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">{s.criteria.map((l) => <span key={l} className="rounded-md bg-lp-raised px-1.5 py-0.5 text-[11.5px] text-lp-soft">{l} {MYP[s.subject_group].criteria[l].name}</span>)}</div>
                      <p className="mt-3 text-[12px] text-lp-mute">{s.count} piece{s.count === 1 ? "" : "s"} of work · {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}</p>
                    </button>
                    <button type="button" aria-label={`Delete ${s.title}`} onClick={async () => {
                      if (!confirm(`Delete "${s.title}" and all its work?`)) return;
                      const full = await loadSet(s.id);
                      if (full) await deleteSet(full.set, full.items);
                      refresh();
                    }} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute opacity-0 hover:bg-white/[0.06] hover:text-lp-red group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
        </>
      )}
    </StudyShell>
  );
};

export default MarkingCopilotPage;
