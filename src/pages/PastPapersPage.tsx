import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Check, ChevronDown, ExternalLink, FileStack, Loader2, ShieldCheck, Sparkles, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { StudyShell } from "@/components/subjects/kit";
import { ACCEPT, formatSize, words } from "@/components/assistant/files/extract";
import { COMMAND_TERMS, GRADE_BOUNDARIES, MYP, type Letter, type MypGroup } from "@/lib/myp";
import {
  GROUPS, KINDS, deletePaper, groupLabel, guessMeta, kindLabel, listPapers, mySchoolId, paperUrl, uploadPaper,
  type PaperMeta, type PastPaper,
} from "@/components/pastpapers/store";

const IB_PAGE: Record<MypGroup, string> = {
  sciences: "science",
  mathematics: "mathematics",
  "language-literature": "language-and-literature",
  "individuals-societies": "individuals-and-societies",
  "language-acquisition": "language-acquisition",
  arts: "arts",
  design: "design",
  phe: "physical-and-health-education",
};

const input = "h-9 w-full rounded-lg border border-lp-line bg-lp-deep/60 px-2.5 text-[13px] text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60";
const KIND_TONE: Record<string, string> = {
  paper: "bg-lp-blue/15 text-lp-sky",
  markscheme: "bg-lp-green/15 text-lp-green",
  specimen: "bg-violet-500/15 text-violet-300",
  report: "bg-amber-500/15 text-amber-300",
  other: "bg-white/[0.06] text-lp-soft",
};
const sessionOrder = (s: string) => {
  const m = s.match(/(20\d\d)/);
  return (m ? Number(m[1]) * 10 : 0) + (/nov/i.test(s) ? 5 : 0);
};

type Draft = { key: string; file: File; meta: PaperMeta; status: "ready" | "working" | "done" | "error"; message?: string };

/* ---------- upload ---------- */

const Uploader: React.FC<{ userId: string; schoolId: string | null; onAdded: (p: PastPaper) => void }> = ({ userId, schoolId, onAdded }) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const pick = useRef<HTMLInputElement>(null);

  const add = (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, 20);
    setDrafts((d) => [...d, ...list.map((file) => ({ key: crypto.randomUUID(), file, meta: guessMeta(file.name), status: "ready" as const }))]);
  };
  const set = (key: string, p: Partial<Draft>) => setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const setMeta = (key: string, p: Partial<PaperMeta>) => setDrafts((d) => d.map((x) => (x.key === key ? { ...x, meta: { ...x.meta, ...p } } : x)));
  const pending = drafts.filter((d) => d.status === "ready" || d.status === "error");
  const incomplete = pending.filter((d) => !d.meta.subject.trim() || !d.meta.session.trim());

  const run = async () => {
    if (incomplete.length) { toast.error("Add a subject and session for every paper."); return; }
    setBusy(true);
    for (const d of pending) {
      set(d.key, { status: "working", message: "Reading" });
      try {
        const { paper, note } = await uploadPaper(userId, schoolId, d.file, d.meta, (s) => set(d.key, { message: s }));
        set(d.key, { status: "done", message: note ?? `${paper.pages ? `${paper.pages} pages · ` : ""}${words(paper.char_count).toLocaleString()} words` });
        onAdded(paper);
      } catch (e) {
        set(d.key, { status: "error", message: (e as Error).message });
      }
    }
    setBusy(false);
  };

  return (
    <section className="rounded-3xl border border-lp-line bg-lp-surface p-5 sm:p-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) add(e.dataTransfer.files); }}
        onClick={() => pick.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") pick.current?.click(); }}
        className={cn("flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors", drag ? "border-lp-sky bg-lp-blue/10" : "border-lp-line hover:border-lp-blue/50")}
      >
        <Upload className="h-6 w-6 text-lp-sky" />
        <p className="mt-2 text-[15px] font-medium text-white">Add past papers, markschemes and subject reports</p>
        <p className="mt-1 max-w-[520px] text-[13px] text-lp-mute">PDF, Word or images. Drop several at once: Refyn reads the subject, session and type from each file name, and you can correct them before saving.</p>
        <input ref={pick} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />
      </div>

      {drafts.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {drafts.map((d) => (
            <div key={d.key} className={cn("rounded-2xl border p-3", d.status === "error" ? "border-lp-red/50" : "border-lp-line bg-lp-deep/40")}>
              <div className="flex items-center gap-2">
                <FileStack className="h-4 w-4 shrink-0 text-lp-sky" />
                <p className="min-w-0 flex-1 truncate text-[13.5px] text-white">{d.file.name} <span className="text-lp-mute">· {formatSize(d.file.size)}</span></p>
                {d.status === "working" && <span className="flex items-center gap-1.5 text-[12px] text-lp-sky"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {d.message}</span>}
                {d.status === "done" && <span className="flex items-center gap-1.5 text-[12px] text-lp-green"><Check className="h-3.5 w-3.5" /> Added{d.message ? ` · ${d.message}` : ""}</span>}
                {(d.status === "ready" || d.status === "error") && (
                  <button type="button" onClick={() => setDrafts((x) => x.filter((y) => y.key !== d.key))} aria-label={`Remove ${d.file.name}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" /></button>
                )}
              </div>
              {(d.status === "ready" || d.status === "error") && (
                <div className="mt-2.5 grid gap-2 sm:grid-cols-4">
                  <select value={d.meta.subject_group} onChange={(e) => setMeta(d.key, { subject_group: e.target.value as PaperMeta["subject_group"] })} aria-label="Programme and subject group" className={input}>
                    {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                  <input value={d.meta.subject} onChange={(e) => setMeta(d.key, { subject: e.target.value })} placeholder="Subject, e.g. Biology" aria-label="Subject" className={cn(input, !d.meta.subject.trim() && "border-amber-500/60")} />
                  <input value={d.meta.session} onChange={(e) => setMeta(d.key, { session: e.target.value })} placeholder="Session, e.g. May 2024" aria-label="Session" className={cn(input, !d.meta.session.trim() && "border-amber-500/60")} />
                  <select value={d.meta.kind} onChange={(e) => setMeta(d.key, { kind: e.target.value as PaperMeta["kind"] })} aria-label="Document type" className={input}>
                    {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                  </select>
                </div>
              )}
              {d.status === "error" && <p className="mt-2 text-[12.5px] text-lp-red">{d.message}</p>}
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[12.5px] text-lp-mute">{schoolId ? "Shared with the teachers at your school. Students can't see past papers." : "Only you can see these (your account isn't linked to a school). Students can't see past papers."}</p>
            <div className="flex gap-2">
              {drafts.some((d) => d.status === "done") && !busy && (
                <button type="button" onClick={() => setDrafts((x) => x.filter((d) => d.status !== "done"))} className="h-10 rounded-xl border border-lp-line px-3.5 text-[13px] text-lp-soft hover:text-white">Clear added</button>
              )}
              <button type="button" onClick={run} disabled={busy || !pending.length} className="flex h-10 items-center gap-2 rounded-xl bg-lp-blue px-4 text-[13.5px] font-medium text-white hover:bg-[#2F6FE0] disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {pending.length ? `Add ${pending.length} ${pending.length === 1 ? "paper" : "papers"}` : "Added"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/* ---------- library ---------- */

const Library: React.FC<{ rows: PastPaper[] | null; userId: string; onDelete: (p: PastPaper) => void }> = ({ rows, userId, onDelete }) => {
  const [filter, setFilter] = useState<string>("all");
  const groups = useMemo(() => [...new Set((rows ?? []).map((r) => r.subject_group))], [rows]);
  const shown = (rows ?? []).filter((r) => filter === "all" || r.subject_group === filter);
  const bySubject = useMemo(() => {
    const m = new Map<string, PastPaper[]>();
    for (const r of shown) {
      const k = `${groupLabel(r.subject_group)} · ${r.subject}`;
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, list]) => [k, list.sort((a, b) => sessionOrder(b.session) - sessionOrder(a.session) || a.kind.localeCompare(b.kind))] as const);
  }, [shown]);

  if (!rows) return <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="lp-skeleton h-16 rounded-2xl" />)}</div>;
  if (!rows.length)
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-lp-line p-8 text-center">
        <FileStack className="mx-auto h-7 w-7 text-lp-mute" />
        <p className="mt-2 text-[14.5px] text-white">No past papers yet</p>
        <p className="mx-auto mt-1 max-w-[460px] text-[13px] text-lp-mute">Add your school's copies from the IB store or the Programme Resource Centre. Until then, Refyn writes clearly labelled IB-style questions and never presents them as past-paper questions.</p>
      </div>
    );

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {["all", ...groups].map((g) => (
          <button key={g} type="button" onClick={() => setFilter(g)} className={cn("h-8 rounded-full border px-3 text-[12.5px]", filter === g ? "border-lp-sky/60 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white")}>
            {g === "all" ? `All (${rows.length})` : groupLabel(g)}
          </button>
        ))}
      </div>
      <div className="space-y-5">
        {bySubject.map(([subject, list]) => (
          <div key={subject}>
            <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.14em] text-lp-mute">{subject}</p>
            <div className="divide-y divide-lp-line overflow-hidden rounded-2xl border border-lp-line bg-lp-surface">
              {list.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium", KIND_TONE[p.kind] ?? KIND_TONE.other)}>{kindLabel(p.kind)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-white">{p.session} <span className="text-lp-mute">· {p.title}</span></p>
                    <p className="text-[12px] text-lp-mute">
                      {p.pages ? `${p.pages} pages · ` : ""}{words(p.char_count).toLocaleString()} words · {p.uploaded_by === userId ? "added by you" : "shared by your school"} {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {p.file_path && (
                    <button type="button" title="Open the original" aria-label={`Open ${p.title}`} onClick={async () => { const url = await paperUrl(p); if (url) window.open(url, "_blank", "noopener"); else toast.error("Couldn't open it."); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                  {p.uploaded_by === userId && (
                    <button type="button" title="Delete" aria-label={`Delete ${p.title}`} onClick={() => onDelete(p)} className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-lp-red">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ---------- verified criteria reference ---------- */

const CriteriaCard: React.FC<{ initial: MypGroup }> = ({ initial }) => {
  const [g, setG] = useState<MypGroup>(initial);
  const [open, setOpen] = useState<Letter | null>(null);
  const [terms, setTerms] = useState(false);
  useEffect(() => setG(initial), [initial]);
  const info = MYP[g];
  return (
    <section className="rounded-3xl border border-lp-line bg-lp-surface p-5">
      <p className="flex items-center gap-2 text-[13px] font-medium text-lp-sky"><ShieldCheck className="h-4 w-4" /> MYP criteria Refyn uses</p>
      <select value={g} onChange={(e) => { setG(e.target.value as MypGroup); setOpen(null); }} aria-label="Subject group" className={cn(input, "mt-3")}>
        {(Object.keys(MYP) as MypGroup[]).map((k) => <option key={k} value={k}>{MYP[k].name}</option>)}
      </select>
      <div className="mt-3 space-y-1.5">
        {(["A", "B", "C", "D"] as const).map((l) => {
          const c = info.criteria[l];
          return (
            <div key={l} className="rounded-xl border border-lp-line bg-lp-deep/40">
              <button type="button" onClick={() => setOpen(open === l ? null : l)} aria-expanded={open === l} className="flex w-full items-center gap-2.5 px-3 py-2 text-left">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-lp-blue/20 text-[12px] font-semibold text-lp-sky">{l}</span>
                <span className="min-w-0 flex-1 text-[13.5px] text-white">{c.name}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-lp-mute transition-transform", open === l && "rotate-180")} />
              </button>
              {open === l && (
                <div className="border-t border-lp-line px-3 py-2.5 text-[12.5px] leading-relaxed text-lp-soft">
                  <p>Assesses {c.focus}.</p>
                  {c.strands && (
                    <ol className="mt-1.5 list-[lower-roman] space-y-0.5 pl-5">
                      {c.strands.map((s) => <li key={s}>{s}</li>)}
                    </ol>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-lp-mute">{info.eAssessment}</p>
      <div className="mt-3 rounded-xl border border-lp-line p-3">
        <p className="text-[12px] font-medium text-lp-soft">Each criterion 0–8 · total /32 → grade</p>
        <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11.5px]">
          {GRADE_BOUNDARIES.map((b) => (
            <div key={b.grade} className="rounded-md bg-lp-deep/60 py-1">
              <p className="font-semibold text-white">{b.grade}</p>
              <p className="text-lp-mute">{b.min}–{b.max}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-lp-mute">IB guideline for school reporting. eAssessment boundaries are set each session.</p>
      </div>
      <button type="button" onClick={() => setTerms((v) => !v)} className="mt-3 flex items-center gap-1 text-[12.5px] text-lp-sky hover:underline" aria-expanded={terms}>
        IB command terms <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", terms && "rotate-180")} />
      </button>
      {terms && (
        <dl className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1 text-[12px]">
          {Object.entries(COMMAND_TERMS).map(([t, d]) => (
            <div key={t}><dt className="inline font-medium capitalize text-white">{t}: </dt><dd className="inline text-lp-soft">{d}</dd></div>
          ))}
        </dl>
      )}
      <p className="mt-4 border-t border-lp-line pt-3 text-[11.5px] leading-relaxed text-lp-mute">
        Criterion names checked against the IB's current subject brief{" "}
        <a href={`https://www.ibo.org/programmes/middle-years-programme/curriculum/${IB_PAGE[g]}/`} target="_blank" rel="noreferrer" className="text-lp-sky hover:underline">on ibo.org</a>. Descriptions and strands are summarized; your IB subject guide has the full wording.
      </p>
    </section>
  );
};

/* ---------- page ---------- */

const PastPapersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PastPaper[] | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    mySchoolId(user.id).then(setSchoolId, () => setSchoolId(null));
    listPapers().then(setRows, (e) => { toast.error((e as Error).message); setRows([]); });
  }, [user]);

  const topGroup = useMemo<MypGroup>(() => {
    const counts = new Map<string, number>();
    for (const r of rows ?? []) counts.set(r.subject_group, (counts.get(r.subject_group) ?? 0) + 1);
    const best = [...counts.entries()].filter(([k]) => k in MYP).sort((a, b) => b[1] - a[1])[0]?.[0];
    return (best as MypGroup) ?? "sciences";
  }, [rows]);

  const remove = async (p: PastPaper) => {
    if (!confirm(`Delete "${p.subject}, ${p.session}, ${kindLabel(p.kind)}"? Other teachers at your school will lose it too.`)) return;
    try {
      await deletePaper(p);
      setRows((r) => r?.filter((x) => x.id !== p.id) ?? null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const ask = (text: string) => navigate(`/ai-learning-assistant?prompt=${encodeURIComponent(text)}`);

  if (!user) return null;
  return (
    <StudyShell wide>
      <header className="lp-fade mb-6" style={{ animationFillMode: "both" }}>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">Assessment</p>
        <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">Past papers</h1>
        <p className="mt-1.5 max-w-[680px] text-[14.5px] text-lp-soft">
          Add your school's copies of past IB papers and markschemes. When you ask for tests, worksheets or revision, Refyn quotes the real questions and cites each one (subject, session, question), and it never passes off new questions as past-paper ones.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <Uploader userId={user.id} schoolId={schoolId} onAdded={(p) => setRows((r) => [p, ...(r ?? [])])} />
          <Library rows={rows} userId={user.id} onDelete={remove} />
        </div>
        <aside className="space-y-4">
          <section className="rounded-3xl border border-lp-line bg-lp-surface p-5">
            <p className="flex items-center gap-2 text-[13px] font-medium text-lp-sky"><Sparkles className="h-4 w-4" /> Use them</p>
            <div className="mt-3 space-y-2">
              {[
                ["Test from past papers", "Using our past papers, make a 40-mark test on [topic] for [year group]: the original questions with their citations, criterion tags and the markscheme."],
                ["Revision by criterion", "From our past papers, collect the questions that assess criterion [A/B/C/D] in [subject], with markschemes."],
                ["Mock exam", "Build a mock on-screen-style exam for MYP [subject] from our past papers, following the IB task structure, with a markscheme."],
              ].map(([label, text]) => (
                <button key={label} type="button" onClick={() => ask(text)} className="w-full rounded-xl border border-lp-line bg-lp-deep/40 px-3 py-2.5 text-left hover:border-lp-blue/50">
                  <span className="block text-[13.5px] text-white">{label}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-lp-mute">{text}</span>
                </button>
              ))}
            </div>
          </section>
          <CriteriaCard initial={topGroup} />
        </aside>
      </div>
    </StudyShell>
  );
};

export default PastPapersPage;
