import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Eye, FileText, Link2, ListChecks, Loader2, Paperclip, PenLine, Plus, Trash2, Upload, Users, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StudyShell } from "@/components/subjects/kit";
import { useTeacherData } from "@/components/teacher/data";
import { MYP, type Letter, type MypGroup } from "@/lib/myp";
import { RubricView } from "@/components/tasks/Rubric";
import {
  BANDS, BAND_PLAIN, cleanRubric, fmtSize, hasAnswerKey, loadTask, newId, removeTaskFiles, saveTask, uploadTaskFile, withoutAnswerKey,
  type Band, type CustomRubric, type MypRubric, type Rubric, type TaskResource,
} from "@/components/tasks/task";

const input = "h-10 w-full rounded-xl border border-lp-line bg-lp-deep/60 px-3 text-[14px] text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60";
const area = "w-full resize-y rounded-xl border border-lp-line bg-lp-deep/60 px-3 py-2.5 text-[14px] leading-relaxed text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60";
const ghost = "flex h-9 items-center gap-2 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:border-lp-blue/50 hover:text-white disabled:opacity-50";
const GROUPS = Object.keys(MYP) as MypGroup[];
const LETTERS: Letter[] = ["A", "B", "C", "D"];

const Section: React.FC<{ icon: React.ElementType; title: string; hint?: string; children: React.ReactNode; right?: React.ReactNode }> = ({ icon: Icon, title, hint, children, right }) => (
  <section className="rounded-3xl border border-lp-line bg-lp-surface p-5 sm:p-6">
    <div className="mb-4 flex flex-wrap items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lp-blue/15 text-lp-sky"><Icon className="h-[18px] w-[18px]" /></span>
      <div className="min-w-0 flex-1"><h2 className="text-[16px] font-semibold text-white">{title}</h2>{hint && <p className="mt-0.5 text-[12.5px] text-lp-mute">{hint}</p>}</div>
      {right}
    </div>
    {children}
  </section>
);

/** Markdown with a write / preview switch. */
const MarkdownField: React.FC<{ value: string; onChange: (v: string) => void; rows: number; placeholder: string; paper?: boolean }> = ({ value, onChange, rows, placeholder, paper }) => {
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <div className="mb-2 flex gap-1 text-[12.5px]">
        {[["Write", false], ["Preview", true]].map(([label, p]) => (
          <button key={String(label)} type="button" onClick={() => setPreview(p as boolean)} className={cn("rounded-lg px-2.5 py-1", preview === p ? "bg-lp-blue/20 text-white" : "text-lp-mute hover:text-white")}>{label as string}</button>
        ))}
        <span className="ml-auto self-center text-[11.5px] text-lp-mute">Markdown: # headings, **bold**, - lists, | tables |</span>
      </div>
      {preview ? (
        value.trim() ? (
          paper ? <div className="max-h-[560px] overflow-y-auto rounded-xl bg-[#FFFFFF] px-6 py-6"><div className="paper-md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown></div></div>
            : <div className="lp-md rounded-xl border border-lp-line p-4"><ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown></div>
        ) : <p className="rounded-xl border border-dashed border-lp-line p-6 text-center text-[13px] text-lp-mute">Nothing to preview yet.</p>
      ) : (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={cn(area, "font-[450]")} />
      )}
    </div>
  );
};

const defaultCustom = (): CustomRubric => ({ kind: "custom", criteria: [{ name: "Content", points: 10, levels: ["Excellent", "Good", "Developing", "Beginning"].map((label) => ({ label, descriptor: "" })) }] });

/* ---------- rubric editor ---------- */

const RubricEditor: React.FC<{ value: Rubric | null; onChange: (r: Rubric | null) => void; taskText: () => { title: string; description: string } }> = ({ value, onChange, taskText }) => {
  const [open, setOpen] = useState<Letter | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const kind = value?.kind ?? "none";
  const myp = value?.kind === "myp" ? value : null;
  const custom = value?.kind === "custom" ? value : null;
  const setMyp = (p: Partial<MypRubric>) => myp && onChange({ ...myp, ...p });

  const draft = async () => {
    if (!myp) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("criteria-review", { body: { action: "tsc", group: myp.group, year: myp.year, criteria: myp.criteria, task: { ...taskText(), tsc: "" } } });
      if (error || data?.error || !data?.clarifications) throw new Error(data?.error || "Couldn't draft them just now.");
      const next: MypRubric["clarifications"] = { ...myp.clarifications };
      for (const l of myp.criteria) {
        const c = data.clarifications[l];
        if (c) next[l] = Object.fromEntries(BANDS.map((b) => [b, (next[l]?.[b]?.trim() ? next[l]![b] : c[b]) ?? ""]).filter(([, v]) => v));
      }
      setMyp({ clarifications: next });
      setOpen(myp.criteria[0]);
      toast.success("Drafted. Read them through and edit them in your own words.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {([["none", "No rubric"], ["myp", "IB MYP criteria"], ["custom", "My own rubric"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => onChange(k === "none" ? null : k === "myp" ? { kind: "myp", group: myp?.group ?? "sciences", year: myp?.year ?? 5, criteria: myp?.criteria ?? ["A"], clarifications: myp?.clarifications ?? {} } : custom ?? defaultCustom())} className={cn("h-9 rounded-xl border px-3.5 text-[13px]", kind === k ? "border-lp-sky/60 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white")}>{label}</button>
        ))}
        {value && <button type="button" onClick={() => setPreview((v) => !v)} className={cn(ghost, "ml-auto", preview && "border-lp-sky/50 text-white")}><Eye className="h-4 w-4" /> {preview ? "Back to editing" : "Preview as a student"}</button>}
      </div>

      {preview && value ? <RubricView rubric={value} /> : (
        <>
          {myp && (
            <div className="space-y-3">
              <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
                <select value={myp.group} onChange={(e) => setMyp({ group: e.target.value as MypGroup })} className={input} aria-label="Subject group">{GROUPS.map((g) => <option key={g} value={g}>{MYP[g].name}</option>)}</select>
                <select value={myp.year} onChange={(e) => setMyp({ year: Number(e.target.value) })} className={input} aria-label="MYP year">{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>MYP {y}</option>)}</select>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {LETTERS.map((l) => {
                  const on = myp.criteria.includes(l);
                  return (
                    <button key={l} type="button" aria-pressed={on} onClick={() => setMyp({ criteria: on ? myp.criteria.filter((x) => x !== l) : ([...myp.criteria, l].sort() as Letter[]) })} className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left", on ? "border-lp-sky/60 bg-lp-blue/15" : "border-lp-line")}>
                      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-semibold", on ? "bg-lp-blue text-white" : "bg-lp-raised text-lp-soft")}>{l}</span>
                      <span className="text-[13px] text-white">{MYP[myp.group].criteria[l].name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <p className="text-[12.5px] text-lp-mute">Task-specific clarifications turn each band into what it means for this task. Students see them first.</p>
                <button type="button" disabled={busy || !myp.criteria.length} onClick={draft} className={ghost}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Draft them with AI</button>
              </div>
              {myp.criteria.map((l) => {
                const c = myp.clarifications[l] ?? {};
                const filled = BANDS.filter((b) => c[b]?.trim()).length;
                return (
                  <div key={l} className="rounded-2xl border border-lp-line">
                    <button type="button" onClick={() => setOpen(open === l ? null : l)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lp-blue text-[13px] font-semibold text-white lp-keep">{l}</span>
                      <span className="min-w-0 flex-1 text-[14px] text-white">{MYP[myp.group].criteria[l].name}</span>
                      <span className="text-[12px] text-lp-mute">{filled}/4 bands clarified</span>
                      <ChevronDown className={cn("h-4 w-4 text-lp-mute transition-transform", open === l && "rotate-180")} />
                    </button>
                    {open === l && (
                      <div className="space-y-2.5 border-t border-lp-line px-4 py-3">
                        {[...BANDS].reverse().map((b: Band) => (
                          <label key={b} className="block">
                            <span className="text-[12.5px] font-medium text-lp-soft">{b.replace("-", "–")} · {BAND_PLAIN[b].label}</span>
                            <textarea value={c[b] ?? ""} rows={2} onChange={(e) => setMyp({ clarifications: { ...myp.clarifications, [l]: { ...c, [b]: e.target.value } } })} placeholder={BAND_PLAIN[b].text} className={cn(area, "mt-1 text-[13.5px]")} />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <label className="block text-[12.5px] text-lp-mute">Notes for students (optional)
                <textarea value={myp.notes ?? ""} onChange={(e) => setMyp({ notes: e.target.value })} rows={2} placeholder="e.g. Criterion C is marked from your results table and conclusion only." className={cn(area, "mt-1")} />
              </label>
            </div>
          )}

          {custom && (
            <div className="space-y-3">
              {custom.criteria.map((c, i) => {
                const set = (p: Partial<typeof c>) => onChange({ ...custom, criteria: custom.criteria.map((x, k) => (k === i ? { ...x, ...p } : x)) });
                return (
                  <div key={i} className="rounded-2xl border border-lp-line p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_110px_auto] gap-2">
                      <input value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="Criterion, e.g. Use of evidence" className={input} />
                      <input type="number" min={0} value={c.points} onChange={(e) => set({ points: Number(e.target.value) })} className={input} aria-label="Points" />
                      <button type="button" aria-label="Remove criterion" onClick={() => onChange({ ...custom, criteria: custom.criteria.filter((_, k) => k !== i) })} className="flex h-10 w-10 items-center justify-center rounded-xl text-lp-mute hover:text-lp-red"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {c.levels.map((lv, k) => (
                        <div key={k} className="rounded-xl bg-lp-raised/40 p-2">
                          <input value={lv.label} onChange={(e) => set({ levels: c.levels.map((x, j) => (j === k ? { ...x, label: e.target.value } : x)) })} className="w-full bg-transparent text-[12.5px] font-semibold text-lp-sky outline-none" />
                          <textarea value={lv.descriptor} onChange={(e) => set({ levels: c.levels.map((x, j) => (j === k ? { ...x, descriptor: e.target.value } : x)) })} rows={2} placeholder="What work at this level looks like" className="mt-1 w-full resize-y bg-transparent text-[13px] text-white outline-none placeholder:text-lp-mute" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button type="button" onClick={() => onChange({ ...custom, criteria: [...custom.criteria, { ...defaultCustom().criteria[0], name: "" }] })} className={ghost}><Plus className="h-4 w-4" /> Add a criterion</button>
            </div>
          )}
          {!value && <p className="text-[13px] text-lp-mute">Students won't see a rubric for this task.</p>}
        </>
      )}
    </div>
  );
};

/* ---------- the page ---------- */

type Pending = { id: string; file: File };

const TaskEditorPage = () => {
  const { id: existingId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, reload } = useTeacherData();
  const [taskId] = useState(() => existingId ?? newId());
  const [loading, setLoading] = useState(!!existingId);
  const [classId, setClassId] = useState(params.get("class") ?? "");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [instructions, setInstructions] = useState("");
  const [worksheet, setWorksheet] = useState("");
  const [resources, setResources] = useState<TaskResource[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [link, setLink] = useState({ title: "", url: "" });
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [group, setGroup] = useState({ on: false, formation: "student_choice", min: 2, max: 4, grading: "group" });
  const [saving, setSaving] = useState(false);
  const pick = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!existingId || !user) return;
    loadTask(existingId, null).then((r) => {
      if (!r || r.task.teacher_id !== user.id) { toast.error("You can only edit your own tasks."); navigate(-1); return; }
      const t = r.task;
      setClassId(t.class_id); setTitle(t.title); setDue(t.due_date ? format(new Date(t.due_date), "yyyy-MM-dd'T'HH:mm") : "");
      setInstructions(t.instructions ?? (t.worksheet ? "" : t.description ?? "")); setWorksheet(t.worksheet ?? ""); setResources(t.resources); setRubric(t.rubric);
      setGroup({ on: t.is_group_assignment, formation: t.group_formation, min: t.min_group_size, max: t.max_group_size, grading: t.grading_type });
      setLoading(false);
    });
  }, [existingId, user, navigate]);

  // Opened from a simulation's "Set as task": title, steps and a link to that exact set-up
  useEffect(() => {
    if (existingId) return;
    const t = params.get("title"), ins = params.get("instructions"), url = params.get("linkUrl");
    if (t) setTitle(t.slice(0, 200));
    if (ins) setInstructions(ins.slice(0, 4000));
    if (url && /^https?:\/\//.test(url)) setResources((r) => (r.some((x) => x.kind === "link" && x.url === url) ? r : [...r, { kind: "link", id: newId(), title: (params.get("linkTitle") || "Simulation").slice(0, 120), url }]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A class with a single option picks itself
  useEffect(() => { if (!classId && data.classes.length === 1) setClassId(data.classes[0].id); }, [data.classes, classId]);

  const cls = data.classes.find((c) => c.id === classId);
  const hasFiles = resources.some((r) => r.kind === "file");
  const answerKey = hasAnswerKey(worksheet);

  const save = async () => {
    if (!user || !cls || !title.trim()) return toast.error(!cls ? "Choose the class" : "Give the task a title");
    if (answerKey && !confirm("The task still contains an answer key or mark scheme, which students would be able to see. Save anyway?")) return;
    setSaving(true);
    try {
      const uploaded: TaskResource[] = [];
      for (const p of pending) uploaded.push(await uploadTaskFile(cls.id, taskId, p.file));
      const id = await saveTask(user.id, {
        class_id: cls.id, title: title.trim().slice(0, 200), instructions: instructions.trim() || null, worksheet: worksheet.trim() || null,
        resources: [...resources, ...uploaded], rubric: cleanRubric(rubric), due_date: due ? new Date(due).toISOString() : null, subject: cls.subject,
        is_group_assignment: group.on, group_formation: group.formation, min_group_size: group.min, max_group_size: group.max, grading_type: group.grading,
        description: null,
      }, { id: taskId, create: !existingId });
      if (removed.length) await removeTaskFiles(removed);
      reload();
      toast.success(existingId ? "Task saved" : `Task set for ${cls.name}`);
      navigate(`/task/${id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setSaving(false);
    }
  };

  if (!user) return null;
  if (loading) return <StudyShell wide><div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="lp-skeleton h-28 rounded-3xl" />)}</div></StudyShell>;

  return (
    <StudyShell wide>
      <div className="mx-auto max-w-[900px]">
        <button type="button" onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-lp-mute hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-white sm:text-[32px]">{existingId ? "Edit task" : "Set a task"}</h1>
        <p className="mt-1 text-[14px] text-lp-soft">Everything students need in one place: what to do, the task itself, resources and how it's marked.</p>

        <div className="mt-6 space-y-4">
          <Section icon={PenLine} title="The basics">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <label className="block text-[12.5px] text-lp-mute">Class
                <select value={classId} disabled={!!existingId && hasFiles} onChange={(e) => setClassId(e.target.value)} className={cn(input, "mt-1")}>
                  <option value="">Choose a class…</option>
                  {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {!!existingId && hasFiles && <span className="mt-1 block text-[11.5px]">The class can't change once files are attached.</span>}
              </label>
              <label className="block text-[12.5px] text-lp-mute">Due
                <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className={cn(input, "mt-1")} />
              </label>
            </div>
            <label className="mt-3 block text-[12.5px] text-lp-mute">Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Osmosis in potato cylinders: lab report" className={cn(input, "mt-1")} />
            </label>
            <div className="mt-3 rounded-2xl border border-lp-line p-3">
              <label className="flex items-center gap-2.5 text-[13.5px] text-white"><input type="checkbox" checked={group.on} onChange={(e) => setGroup({ ...group, on: e.target.checked })} className="h-4 w-4 accent-[#3B82F6]" /><Users className="h-4 w-4 text-lp-sky" /> Group task</label>
              {group.on && (
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <select value={group.formation} onChange={(e) => setGroup({ ...group, formation: e.target.value })} className={cn(input, "sm:col-span-2")}><option value="student_choice">Students choose groups</option><option value="teacher_assigned">I assign the groups</option></select>
                  <input type="number" min={2} max={10} value={group.min} onChange={(e) => setGroup({ ...group, min: Number(e.target.value) })} className={input} aria-label="Smallest group" />
                  <input type="number" min={2} max={10} value={group.max} onChange={(e) => setGroup({ ...group, max: Number(e.target.value) })} className={input} aria-label="Largest group" />
                  <select value={group.grading} onChange={(e) => setGroup({ ...group, grading: e.target.value })} className={cn(input, "sm:col-span-4")}><option value="group">One grade for the group</option><option value="individual">Individual grades</option></select>
                </div>
              )}
            </div>
          </Section>

          <Section icon={ListChecks} title="Instructions" hint="What students should do, how long it should take, what to hand in and in what format.">
            <MarkdownField value={instructions} onChange={setInstructions} rows={7} placeholder={"## What to do\n1. Read the task sheet.\n2. ...\n\n**Hand in:** one PDF, max 1,500 words."} />
          </Section>

          <Section icon={FileText} title="The task" hint="The worksheet, questions or brief itself. Students see it on a printable sheet and can download it as Word or PDF.">
            {resources.filter((r) => r.kind === "printable" || r.kind === "doc").map((r) => (
              <div key={r.id} className="mb-3 flex items-center gap-3 rounded-xl border border-lp-line px-3 py-2.5">
                <FileText className="h-4 w-4 text-lp-sky" />
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-white">{r.kind === "printable" ? `${r.name} (Studio worksheet, shown as designed)` : r.name}</span>
                <button type="button" aria-label="Remove" onClick={() => setResources(resources.filter((x) => x.id !== r.id))} className="text-lp-mute hover:text-lp-red"><X className="h-4 w-4" /></button>
              </div>
            ))}
            {answerKey && (
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">This includes an answer key or mark scheme. Students can see everything in the task.</span>
                <button type="button" onClick={() => setWorksheet(withoutAnswerKey(worksheet).md)} className="rounded-lg bg-amber-500/20 px-2.5 py-1 font-medium">Remove it</button>
              </div>
            )}
            <MarkdownField value={worksheet} onChange={setWorksheet} rows={12} paper placeholder={"# Osmosis in potato cylinders\n\n## Part A: Plan\n1. Write a research question...\n\n| Concentration (M) | Mass before (g) | Mass after (g) |\n|---|---|---|\n| 0.0 | | |"} />
          </Section>

          <Section icon={Paperclip} title="Resources" hint="Files and links students use for the task. Only this class can open the files.">
            <div className="space-y-2">
              {resources.filter((r) => r.kind === "file" || r.kind === "link").map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-lp-line px-3 py-2.5">
                  {r.kind === "link" ? <Link2 className="h-4 w-4 text-lp-sky" /> : <Paperclip className="h-4 w-4 text-lp-sky" />}
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-white">{r.kind === "link" ? r.title : r.name}</span>
                  <span className="shrink-0 text-[12px] text-lp-mute">{r.kind === "file" ? fmtSize(r.size) : r.kind === "link" ? (() => { try { return new URL(r.url).hostname; } catch { return ""; } })() : ""}</span>
                  <button type="button" aria-label="Remove" onClick={() => { setResources(resources.filter((x) => x.id !== r.id)); if (r.kind === "file") setRemoved([...removed, r.path]); }} className="text-lp-mute hover:text-lp-red"><X className="h-4 w-4" /></button>
                </div>
              ))}
              {pending.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-dashed border-lp-sky/40 px-3 py-2.5">
                  <Upload className="h-4 w-4 text-lp-sky" />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-white">{p.file.name}</span>
                  <span className="shrink-0 text-[12px] text-lp-mute">{fmtSize(p.file.size)} · uploads when you save</span>
                  <button type="button" aria-label="Remove" onClick={() => setPending(pending.filter((x) => x.id !== p.id))} className="text-lp-mute hover:text-lp-red"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => pick.current?.click()} className={ghost}><Upload className="h-4 w-4" /> Add files</button>
              <input ref={pick} type="file" multiple className="hidden" onChange={(e) => { const f = [...(e.target.files ?? [])].filter((x) => x.size <= 50 * 1024 * 1024); if (f.length < (e.target.files?.length ?? 0)) toast.error("Files over 50 MB were skipped."); setPending([...pending, ...f.map((file) => ({ id: newId(), file }))]); e.target.value = ""; }} />
            </div>
            <form className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto]" onSubmit={(e) => {
              e.preventDefault();
              let url = link.url.trim();
              if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
              try { new URL(url); } catch { return toast.error("That link doesn't look right."); }
              setResources([...resources, { kind: "link", id: newId(), title: link.title.trim() || url, url }]);
              setLink({ title: "", url: "" });
            }}>
              <input value={link.title} onChange={(e) => setLink({ ...link, title: e.target.value })} placeholder="Link title (optional)" className={input} />
              <input value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="https://…" className={input} />
              <button type="submit" disabled={!link.url.trim()} className={ghost}><Link2 className="h-4 w-4" /> Add link</button>
            </form>
          </Section>

          <Section icon={ListChecks} title="How it's marked" hint="The rubric students see, level by level.">
            <RubricEditor value={rubric} onChange={setRubric} taskText={() => ({ title: title.trim(), description: [instructions, worksheet].filter(Boolean).join("\n\n").slice(0, 6000) })} />
          </Section>
        </div>

        {/* Room on the right for the floating assistant button on phones */}
        <div className="sticky bottom-0 z-10 -mx-1 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-lp-line bg-lp-bg/95 py-3 pl-1 pr-16 backdrop-blur sm:pr-1">
          {existingId && <Link to={`/task/${existingId}`} className={ghost}>Cancel</Link>}
          <button type="button" disabled={saving || !cls || !title.trim()} onClick={save} className="flex h-10 items-center gap-2 rounded-xl bg-lp-blue px-5 text-[14px] font-medium text-white hover:bg-[#2F6FE0] disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {existingId ? "Save changes" : cls ? `Set for ${cls.name}` : "Set task"}
          </button>
        </div>
      </div>
    </StudyShell>
  );
};

export default TaskEditorPage;
