import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { differenceInCalendarDays, format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, BookOpenText, CalendarPlus, Check, CheckCircle2, ClipboardList, Download, ExternalLink, Eye, File as FileIcon, FileText, Image as ImageIcon,
  Link2, ListChecks, Loader2, MessageCircleQuestion, Paperclip, PenLine, Printer, ScanSearch, Send, Upload, Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StudyShell } from "@/components/subjects/kit";
import { MYP } from "@/lib/myp";
import { PrintableDoc } from "@/components/studio/PrintableDoc";
import { printElement } from "@/components/subjects/docs";
import { downloadFile, fileFrom, printAsPdf } from "@/components/assistant/files/outputs";
import { planToIcs } from "@/components/assistant/powers/Plan";
import { download } from "@/components/assistant/powers/ui";
import { RubricView } from "@/components/tasks/Rubric";
import { fmtSize, loadTask, taskFileUrl, type Task, type TaskClass, type TaskResource, type TaskSubmission } from "@/components/tasks/task";

type Loaded = { task: Task; cls: TaskClass | null; teacherName: string | null; submission: TaskSubmission | null };
type Tab = "overview" | "task" | "resources" | "rubric" | "work";

const card = "rounded-2xl border border-lp-line bg-lp-surface";
const primary = "flex h-10 items-center justify-center gap-2 rounded-xl bg-lp-blue px-4 text-[13.5px] font-medium text-white hover:bg-[#2F6FE0] disabled:opacity-50";
const ghost = "flex h-9 items-center gap-2 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:border-lp-blue/50 hover:text-white disabled:opacity-50";

const isGraded = (s: TaskSubmission | null) => !!s && ((s.grade !== null && s.grade !== undefined) || s.status === "graded");
const legacyWorksheet = (t: Task) => !t.worksheet && !t.instructions && (t.description?.length ?? 0) > 300;

/* ---------- pieces ---------- */

const Paper: React.FC<{ children: React.ReactNode; innerRef?: React.Ref<HTMLDivElement> }> = ({ children, innerRef }) => (
  <div className="overflow-x-auto rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]">
    <div ref={innerRef} className="mx-auto w-full max-w-[794px] bg-[#FFFFFF] px-5 pb-10 pt-7 sm:px-12 sm:pb-14 sm:pt-11">{children}</div>
  </div>
);

const ResourceRow: React.FC<{ r: TaskResource }> = ({ r }) => {
  const [busy, setBusy] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const isImage = r.kind === "file" && r.type.startsWith("image/");
  useEffect(() => { if (isImage && r.kind === "file") taskFileUrl(r.path).then(setThumb); }, [isImage, r]);
  if (r.kind === "link") {
    let host = r.url;
    try { host = new URL(r.url).hostname.replace(/^www\./, ""); } catch { /* keep as written */ }
    return (
      <a href={r.url} target="_blank" rel="noopener noreferrer" className={cn(card, "flex items-center gap-3 px-4 py-3 transition-colors hover:border-lp-blue/50")}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lp-blue/15 text-lp-sky"><Link2 className="h-[18px] w-[18px]" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium text-white">{r.title}</span><span className="block truncate text-[12px] text-lp-mute">{host}</span></span>
        <ExternalLink className="h-4 w-4 shrink-0 text-lp-mute" />
      </a>
    );
  }
  if (r.kind === "file") {
    const open = async (dl: boolean) => {
      setBusy(true);
      const url = await taskFileUrl(r.path, dl ? r.name : undefined);
      setBusy(false);
      if (!url) return toast.error("Couldn't open the file. Ask your teacher to check it.");
      if (dl) { const a = document.createElement("a"); a.href = url; a.download = r.name; a.click(); } else window.open(url, "_blank", "noopener");
    };
    const Icon = isImage ? ImageIcon : /pdf|word|document|presentation|sheet|excel/i.test(r.type + r.name) ? FileText : FileIcon;
    return (
      <div className={cn(card, "overflow-hidden")}>
        {thumb && <button type="button" onClick={() => open(false)} className="block w-full bg-lp-deep"><img src={thumb} alt={r.name} className="mx-auto max-h-64 object-contain" /></button>}
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lp-blue/15 text-lp-sky"><Icon className="h-[18px] w-[18px]" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium text-white">{r.name}</span><span className="block text-[12px] text-lp-mute">{fmtSize(r.size)}</span></span>
          <button type="button" disabled={busy} onClick={() => open(false)} className={ghost}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}<span className="hidden sm:inline">Open</span></button>
          <button type="button" disabled={busy} onClick={() => open(true)} aria-label={`Download ${r.name}`} className={ghost}><Download className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }
  return null;
};

/* ---------- submitting ---------- */

const YourWork: React.FC<{ task: Task; submission: TaskSubmission | null; userId: string; onSaved: (s: TaskSubmission) => void }> = ({ task, submission, userId, onSaved }) => {
  const [text, setText] = useState(submission?.content ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const pick = useRef<HTMLInputElement>(null);
  const graded = isGraded(submission);

  const openSubmitted = async () => {
    const path = submission?.file_url?.split("/submission-files/")[1];
    if (!path) return;
    const { data } = await supabase.storage.from("submission-files").createSignedUrl(decodeURIComponent(path.split("?")[0]), 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener"); else toast.error("Couldn't open your file.");
  };

  const submit = async () => {
    if (!text.trim() && !file) return toast.error("Write your answer or attach a file.");
    setBusy(true);
    try {
      let fileUrl = submission?.file_url ?? null;
      let fileName = submission?.file_name ?? null;
      if (file) {
        const path = `${userId}/${task.id}/${file.name}`;
        const { error } = await supabase.storage.from("submission-files").upload(path, file, { upsert: true });
        if (error) throw error;
        fileUrl = supabase.storage.from("submission-files").getPublicUrl(path).data.publicUrl;
        fileName = file.name;
      }
      const row = { content: text.trim(), file_url: fileUrl, file_name: fileName, submitted_at: new Date().toISOString() };
      const res = submission
        ? await supabase.from("assignment_submissions").update({ ...row, status: "resubmitted" }).eq("id", submission.id).select("id, content, file_url, file_name, grade, max_grade, feedback, status, submitted_at, graded_at").single()
        : await supabase.from("assignment_submissions").insert({ ...row, assignment_id: task.id, student_id: userId, status: "submitted" }).select("id, content, file_url, file_name, grade, max_grade, feedback, status, submitted_at, graded_at").single();
      if (res.error || !res.data) throw res.error ?? new Error("Couldn't submit");
      onSaved(res.data as TaskSubmission);
      setFile(null);
      toast.success(submission ? "Resubmitted" : "Submitted. Your teacher can see it now.");
    } catch (e) {
      toast.error((e as Error).message || "Couldn't submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {graded && submission && (
        <div className={cn(card, "p-5")}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="lp-keep flex h-16 min-w-16 flex-col items-center justify-center rounded-2xl px-3 text-white" style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #3B5BDB 60%, #6D8BFF 100%)" }}>
              <span className="text-[22px] font-semibold leading-none">{submission.grade ?? "–"}</span>
              <span className="text-[11px] text-white/75">of {submission.max_grade}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-white">Marked{submission.graded_at ? ` ${formatDistanceToNow(new Date(submission.graded_at), { addSuffix: true })}` : ""}</p>
              {submission.grade !== null && submission.max_grade > 0 && <p className="text-[13px] text-lp-mute">{Math.round((submission.grade / submission.max_grade) * 100)}%</p>}
            </div>
          </div>
          {submission.feedback && (
            <div className="mt-4 rounded-xl border border-lp-line bg-lp-deep/50 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lp-mute">Teacher feedback</p>
              <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-white">{submission.feedback}</p>
            </div>
          )}
        </div>
      )}

      <div className={cn(card, "p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[15px] font-medium text-white">{submission ? "Your submission" : "Hand in your work"}</p>
          {submission && <span className="text-[12px] text-lp-mute">{submission.status === "resubmitted" ? "Resubmitted" : "Submitted"} {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}</span>}
        </div>
        {task.is_group_assignment && <p className="mt-2 flex items-center gap-2 text-[12.5px] text-lp-soft"><Users className="h-4 w-4 text-lp-sky" /> Group task: join or check your group on the class page.</p>}
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} disabled={graded} placeholder="Write your answer here, or attach your file below" className="mt-3 w-full resize-y rounded-xl border border-lp-line bg-lp-deep/60 px-3.5 py-3 text-[14px] leading-relaxed text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60 disabled:opacity-70" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {submission?.file_name && !file && <button type="button" onClick={openSubmitted} className={ghost}><Paperclip className="h-4 w-4" /> {submission.file_name}</button>}
          {file && <span className="flex h-9 items-center gap-2 rounded-xl border border-lp-sky/40 bg-lp-blue/10 px-3 text-[13px] text-white"><Paperclip className="h-4 w-4 text-lp-sky" /> {file.name}</span>}
          {!graded && <button type="button" onClick={() => pick.current?.click()} className={ghost}><Upload className="h-4 w-4" /> {submission?.file_name || file ? "Replace file" : "Attach a file"}</button>}
          <input ref={pick} type="file" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          <div className="flex-1" />
          {!graded && <button type="button" disabled={busy} onClick={submit} className={primary}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {submission ? "Resubmit" : "Submit"}</button>}
        </div>
        {graded && <p className="mt-2 text-[12px] text-lp-mute">This has been marked. Talk to your teacher if you want to hand in a new version.</p>}
      </div>
    </div>
  );
};

/* ---------- the page ---------- */

const TaskPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<Loaded | "missing" | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const paper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    loadTask(id, user.id).then((r) => setState(r ?? "missing"), () => setState("missing"));
  }, [id, user]);

  const loaded = state && state !== "missing" ? state : null;
  const t = loaded?.task;
  const printables = useMemo(() => t?.resources.filter((r): r is Extract<TaskResource, { kind: "printable" }> => r.kind === "printable") ?? [], [t]);
  const docs = useMemo(() => t?.resources.filter((r): r is Extract<TaskResource, { kind: "doc" }> => r.kind === "doc") ?? [], [t]);
  const files = useMemo(() => t?.resources.filter((r) => r.kind === "file" || r.kind === "link") ?? [], [t]);

  if (!user) return null;
  if (state === null) return <StudyShell wide><div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="lp-skeleton h-24 rounded-2xl" />)}</div></StudyShell>;
  if (state === "missing" || !loaded || !t) {
    return (
      <StudyShell wide>
        <div className="mx-auto max-w-md rounded-3xl border border-dashed border-lp-line p-10 text-center">
          <ClipboardList className="mx-auto h-7 w-7 text-lp-mute" />
          <p className="mt-2 text-[15px] text-white">This task isn't available</p>
          <p className="mt-1 text-[13px] text-lp-mute">It may have been removed, or it belongs to a class you're not in.</p>
          <button type="button" onClick={() => navigate("/classes")} className={cn(ghost, "mx-auto mt-4")}>Go to your classes</button>
        </div>
      </StudyShell>
    );
  }

  const { cls, teacherName, submission } = loaded;
  const teacherView = user.role === "teacher" || user.role === "admin";
  const hasTask = !!t.worksheet || printables.length > 0 || docs.length > 0 || legacyWorksheet(t);
  const due = t.due_date ? new Date(t.due_date) : null;
  const days = due ? differenceInCalendarDays(due, new Date()) : null;
  const graded = isGraded(submission);
  const status = graded ? "Marked" : submission ? "Handed in" : due && due < new Date() ? "Late" : "To do";
  const statusTone = graded ? "bg-emerald-500/15 text-emerald-300" : submission ? "bg-violet-500/15 text-violet-300" : status === "Late" ? "bg-rose-500/15 text-rose-300" : "bg-lp-blue/15 text-lp-sky";
  const myp = t.rubric?.kind === "myp" ? t.rubric : null;

  const tabs: { id: Tab; label: string; show: boolean; count?: number }[] = [
    { id: "overview", label: "Overview", show: true },
    { id: "task", label: "The task", show: hasTask },
    { id: "resources", label: "Resources", show: files.length > 0, count: files.length },
    { id: "rubric", label: "Rubric", show: !!t.rubric },
    { id: "work", label: teacherView ? "Hand-in" : "Your work", show: !teacherView },
  ];
  const go = (next: Tab) => { setTab(next); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const downloadTask = (fmt: "docx" | "pdf") => {
    const md = t.worksheet || (legacyWorksheet(t) ? t.description ?? "" : "");
    if (!md) return;
    const f = fileFrom(`${t.title}.${fmt}`, md);
    if (fmt === "pdf") printAsPdf(f); else downloadFile(f, "docx");
  };
  const addToCalendar = () => {
    if (!due) return;
    download(`${t.title} (due).ics`, planToIcs({ title: t.title, items: [{ date: format(due, "yyyy-MM-dd"), time: format(due, "HH:mm"), minutes: 30, title: `Due: ${t.title}`, detail: cls ? `For ${cls.name}` : "", tag: cls?.name ?? "" }] }, t.id.replace(/-/g, "")), "text/calendar;charset=utf-8");
  };

  return (
    <StudyShell wide>
      {teacherView && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-lp-sky/40 bg-lp-blue/10 px-4 py-3">
          <Eye className="h-4 w-4 text-lp-sky" />
          <p className="min-w-0 flex-1 text-[13.5px] text-lp-soft">This is the page your students see for this task.</p>
          {t.teacher_id === user.id && <Link to={`/task/${t.id}/edit`} className={ghost}><PenLine className="h-4 w-4" /> Edit task</Link>}
          {cls && <Link to={`/class/${cls.id}`} className={ghost}><ClipboardList className="h-4 w-4" /> Submissions</Link>}
        </div>
      )}

      <header className="mb-6">
        {cls && <Link to={`/class/${cls.id}`} className="inline-flex items-center gap-1.5 text-[13px] text-lp-mute hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> {cls.name}</Link>}
        <div className="mt-2 flex flex-wrap items-start gap-3">
          <h1 className="min-w-0 flex-1 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[34px]">{t.title}</h1>
          {!teacherView && <span className={cn("mt-2 rounded-full px-3 py-1 text-[12.5px] font-semibold", statusTone)}>{status}</span>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-lp-soft">
          {teacherName && <span>Set by {teacherName}</span>}
          {due && <span className={cn(status === "Late" && "text-lp-red")}>Due {format(due, "EEEE d MMMM, HH:mm")}{days !== null && days >= 0 && days <= 14 ? ` · ${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}` : ""}</span>}
          {t.subject && <span className="rounded-full border border-lp-line px-2 py-0.5 text-[12px]">{t.subject}</span>}
          {myp && <span className="rounded-full border border-lp-line px-2 py-0.5 text-[12px]">MYP {MYP[myp.group].name} · criteria {myp.criteria.join(", ")}</span>}
          {t.is_group_assignment && <span className="inline-flex items-center gap-1 rounded-full border border-lp-line px-2 py-0.5 text-[12px]"><Users className="h-3 w-3" /> Group</span>}
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <nav className="sticky top-0 z-10 -mx-1 mb-4 bg-lp-bg/95 px-1 pb-2 pt-1 backdrop-blur">
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-lp-line bg-lp-surface/60 p-1 text-[13px]">
              {tabs.filter((x) => x.show).map((x) => (
                <button key={x.id} type="button" onClick={() => go(x.id)} className={cn("shrink-0 whitespace-nowrap rounded-lg px-3.5 py-1.5", tab === x.id ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>
                  {x.label}{x.count ? <span className="ml-1.5 tabular-nums opacity-70">{x.count}</span> : null}
                </button>
              ))}
            </div>
          </nav>

          {tab === "overview" && (
            <div className="space-y-4">
              <div className={cn(card, "p-5 sm:p-6")}>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-lp-mute">Instructions</p>
                {t.instructions || (t.description && !legacyWorksheet(t)) ? (
                  <div className="lp-md mt-2"><ReactMarkdown remarkPlugins={[remarkGfm]}>{t.instructions || t.description || ""}</ReactMarkdown></div>
                ) : (
                  <p className="mt-2 text-[14px] text-lp-soft">{hasTask ? "Everything you need is in the task below." : "Your teacher hasn't added written instructions."}</p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {hasTask && <button type="button" onClick={() => go("task")} className={cn(card, "p-4 text-left transition-colors hover:border-lp-blue/50")}><FileText className="h-5 w-5 text-lp-sky" /><p className="mt-2 text-[14px] font-medium text-white">The task</p><p className="text-[12.5px] text-lp-mute">{printables.length ? "The worksheet, as your teacher designed it" : "The full task to complete"}</p></button>}
                {files.length > 0 && <button type="button" onClick={() => go("resources")} className={cn(card, "p-4 text-left transition-colors hover:border-lp-blue/50")}><Paperclip className="h-5 w-5 text-lp-sky" /><p className="mt-2 text-[14px] font-medium text-white">{files.length} resource{files.length === 1 ? "" : "s"}</p><p className="text-[12.5px] text-lp-mute">Files and links to use</p></button>}
                {t.rubric && <button type="button" onClick={() => go("rubric")} className={cn(card, "p-4 text-left transition-colors hover:border-lp-blue/50")}><ListChecks className="h-5 w-5 text-lp-sky" /><p className="mt-2 text-[14px] font-medium text-white">How it's marked</p><p className="text-[12.5px] text-lp-mute">{myp ? `Criteria ${myp.criteria.join(", ")}, level by level` : "The rubric, criterion by criterion"}</p></button>}
              </div>
            </div>
          )}

          {tab === "task" && (
            <div className="space-y-5">
              {printables.map((p) => (
                <div key={p.id}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] text-lp-mute">{p.name}</p>
                    <button type="button" onClick={() => paper.current && printElement(paper.current, p.name)} className={ghost}><Printer className="h-4 w-4" /> Print</button>
                  </div>
                  <div className="overflow-x-auto rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]"><PrintableDoc ref={paper} doc={p.doc} opts={{ ...p.opts, answerKey: false }} /></div>
                </div>
              ))}
              {!printables.length && (t.worksheet || legacyWorksheet(t)) && (
                <div>
                  <div className="mb-2 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => downloadTask("docx")} className={ghost}><Download className="h-4 w-4" /> Word</button>
                    <button type="button" onClick={() => downloadTask("pdf")} className={ghost}><Printer className="h-4 w-4" /> PDF / print</button>
                  </div>
                  <Paper innerRef={paper}>
                    {t.worksheet ? <div className="paper-md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{t.worksheet}</ReactMarkdown></div> : <div className="paper-md whitespace-pre-wrap">{t.description}</div>}
                  </Paper>
                </div>
              )}
              {docs.map((d) => (
                <div key={d.id}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] text-lp-mute">{d.name}</p>
                    <button type="button" onClick={() => downloadFile(fileFrom(d.name, d.markdown), "docx")} className={ghost}><Download className="h-4 w-4" /> Word</button>
                  </div>
                  <Paper><div className="paper-md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{d.markdown}</ReactMarkdown></div></Paper>
                </div>
              ))}
            </div>
          )}

          {tab === "resources" && <div className="grid gap-3 sm:grid-cols-2">{files.map((r) => <ResourceRow key={r.id} r={r} />)}</div>}
          {tab === "rubric" && t.rubric && <RubricView rubric={t.rubric} />}
          {tab === "work" && !teacherView && <YourWork task={t} submission={submission} userId={user.id} onSaved={(s) => setState({ ...loaded, submission: s })} />}
        </div>

        <aside className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">
          {!teacherView && (
            <div className={cn(card, "p-4")}>
              <p className="text-[12px] text-lp-mute">{graded ? "Marked" : submission ? "Handed in" : due ? (days !== null && days < 0 ? "Was due" : "Due") : "No deadline"}</p>
              <p className={cn("mt-0.5 text-[20px] font-semibold text-white", status === "Late" && "text-lp-red")}>
                {graded && submission ? `${submission.grade ?? "–"} / ${submission.max_grade}` : submission ? formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true }) : due ? formatDistanceToNow(due, { addSuffix: true }) : "Anytime"}
              </p>
              <button type="button" onClick={() => go("work")} className={cn(primary, "mt-3 w-full")}>{graded ? <><CheckCircle2 className="h-4 w-4" /> See feedback</> : submission ? <><Check className="h-4 w-4" /> View or resubmit</> : <><Send className="h-4 w-4" /> Hand in</>}</button>
            </div>
          )}
          <div className={cn(card, "p-2")}>
            {!teacherView && myp && (
              <Link to={`/assessment-coach?task=${t.id}`} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-white/[0.04]">
                <ScanSearch className="mt-0.5 h-[18px] w-[18px] shrink-0 text-lp-sky" />
                <span><span className="block text-[13.5px] font-medium text-white">Check my draft</span><span className="block text-[12px] text-lp-mute">Feedback against this task's rubric before you hand in</span></span>
              </Link>
            )}
            <Link to={`/ai-learning-assistant?task=${t.id}`} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-white/[0.04]">
              <MessageCircleQuestion className="mt-0.5 h-[18px] w-[18px] shrink-0 text-lp-sky" />
              <span><span className="block text-[13.5px] font-medium text-white">Ask Refyn about this task</span><span className="block text-[12px] text-lp-mute">{teacherView ? "Plan, adapt or differentiate it" : "Understand what's being asked, step by step"}</span></span>
            </Link>
            {due && !teacherView && (
              <button type="button" onClick={addToCalendar} className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left hover:bg-white/[0.04]">
                <CalendarPlus className="mt-0.5 h-[18px] w-[18px] shrink-0 text-lp-sky" />
                <span><span className="block text-[13.5px] font-medium text-white">Add the deadline to my calendar</span><span className="block text-[12px] text-lp-mute">Google, Outlook or Apple Calendar</span></span>
              </button>
            )}
            {t.rubric && tab !== "rubric" && (
              <button type="button" onClick={() => go("rubric")} className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left hover:bg-white/[0.04]">
                <BookOpenText className="mt-0.5 h-[18px] w-[18px] shrink-0 text-lp-sky" />
                <span><span className="block text-[13.5px] font-medium text-white">See how it's marked</span><span className="block text-[12px] text-lp-mute">What each level looks like in this task</span></span>
              </button>
            )}
          </div>
        </aside>
      </div>
    </StudyShell>
  );
};

export default TaskPage;
