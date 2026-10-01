import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  Accessibility,
  BookMarked,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  FileText,
  Grid3x3,
  KeyRound,
  Layers,
  ListPlus,
  Loader2,
  Printer,
  Redo2,
  Send,
  Sparkles,
  Ticket,
  Undo2,
  UserRound,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StudyShell, primaryBtn } from "@/components/subjects/kit";
import { Panel, ghostBtn } from "@/components/student/ui";
import { Modal, Field, inputCls } from "@/components/student/Modal";
import { useStoredState } from "@/components/assistant/storage";
import { printElement } from "@/components/subjects/docs";
import { cn } from "@/lib/utils";
import { PrintableDoc, type DocOptions, type DocTheme, type QAction } from "@/components/studio/PrintableDoc";
import { SAMPLE } from "@/components/studio/samples";
import { PENDING_DIAGRAM, useLibrary, useStudio } from "@/components/studio/studio";
import { DIAGRAM_SCHEMA, type DiagramSpec } from "@/components/studio/diagrams";
import {
  QTYPE_LABEL,
  QUESTION_SHAPE,
  askStudio,
  buildPrompt,
  extractJson,
  normQuestion,
  normalize,
  questionCount,
  toMarkdown,
  toPlainText,
  totalMarks,
  uid,
  type GenOptions,
  type PrintKind,
  type Printable,
  type QType,
  type Question,
  type Worksheet,
} from "@/components/studio/worksheet";
import { useTeacherData } from "@/components/teacher/data";
import { SOLO, cleanRubric, newId, saveTask, stripAnswers } from "@/components/tasks/task";
import { MYP, detectGroups, programmeOf, type Letter } from "@/lib/myp";

const KINDS: { id: PrintKind; label: string; body: string; icon: React.ElementType }[] = [
  { id: "worksheet", label: "Worksheet", body: "Sections, mixed questions, challenge", icon: FileText },
  { id: "test", label: "Test paper", body: "Formal, marked, answer key", icon: ClipboardList },
  { id: "exit", label: "Exit tickets", body: "4 per page, cut and hand out", icon: Ticket },
  { id: "flashcards", label: "Flashcards", body: "Double-sided, 8 per page", icon: Layers },
];

const THEMES: { id: DocTheme; label: string }[] = [
  { id: "modern", label: "Modern" },
  { id: "bright", label: "Bright" },
  { id: "classic", label: "Classic" },
  { id: "exam", label: "IB exam" },
];

const ALL_TYPES: QType[] = ["mcq", "short", "working", "long", "fill", "truefalse", "match", "table"];

const STAGES = ["Planning the sections…", "Writing questions…", "Working out the answers…", "Drawing diagrams…", "Laying out the page…"];

const Toggle: React.FC<{ on: boolean; set: (v: boolean) => void; label: string; icon?: React.ElementType }> = ({ on, set, label, icon: Icon }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={() => set(!on)}
    className={cn(
      "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors",
      on ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white",
    )}
  >
    {Icon && <Icon className="h-3.5 w-3.5" />} {label}
  </button>
);

const PrintableMaker = () => {
  const { user, config, look, band, setBand } = useStudio();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const lib = useLibrary();
  const { data: teacher } = useTeacherData(!!config);
  // The teacher's MYP subject group (for criterion names) and whether this band is DP
  const mypGroup = config ? detectGroups(config.subjectLabel)[0] : undefined;
  const programme = programmeOf("", band);
  const paperRef = useRef<HTMLDivElement>(null);

  const [gen, setGen] = useStoredState<Omit<GenOptions, "band">>(user ? `refyn:${user.id}:studio:gen` : null, {
    kind: "worksheet",
    topic: "",
    level: "core",
    count: 10,
    types: ["mcq", "short", "working", "long"],
    diagrams: true,
    minutes: 30,
    criterion: "",
    source: "",
    notes: "",
  });
  const [design, setDesign] = useStoredState<Omit<DocOptions, "accent" | "gradient">>(user ? `refyn:${user.id}:studio:design` : null, {
    theme: "modern",
    header: "",
    answerKey: true,
    grid: true,
    accessible: false,
    showMarks: true,
    nameFields: true,
  });
  const [history, setHistory] = useState<Printable[]>([]);
  const [future, setFuture] = useState<Printable[]>([]);
  const [docId, setDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assign, setAssign] = useState({ classId: "", due: "" });
  const [assigning, setAssigning] = useState(false);
  const [copied, setCopied] = useState(false);

  const doc = history[history.length - 1] ?? null;
  const shown: Printable | null = doc ?? (look ? SAMPLE[look.subject] : null);
  const setG = (patch: Partial<typeof gen>) => setGen((g) => ({ ...g, ...patch }));

  const commit = useCallback(
    (next: Printable, id?: string) => {
      setHistory((h) => [...h.slice(-30), next]);
      setFuture([]);
      const saveId = id ?? docId ?? uid();
      if (!docId || id) setDocId(saveId);
      lib.save({ id: saveId, type: "printable", title: next.title, at: Date.now(), kind: next.kind, doc: next, band });
    },
    [docId, lib, band],
  );

  const undo = () => {
    if (history.length < 2) return;
    setFuture((f) => [history[history.length - 1], ...f]);
    setHistory((h) => h.slice(0, -1));
  };
  const redo = () => {
    if (!future.length) return;
    setHistory((h) => [...h, future[0]]);
    setFuture((f) => f.slice(1));
  };

  // Open from the library, a tool hand-off or a pending diagram
  useEffect(() => {
    const id = params.get("id");
    if (id) {
      const item = lib.items.find((x) => x.id === id && x.type === "printable");
      if (item && item.type === "printable") {
        setHistory([item.doc]);
        setDocId(item.id);
      }
    }
    const kind = params.get("kind") as PrintKind | null;
    const topic = params.get("topic");
    if (kind || topic) setG({ ...(kind ? { kind } : {}), ...(topic ? { topic } : {}), ...(params.get("diagrams") ? { diagrams: params.get("diagrams") === "1" } : {}) });
    const src = sessionStorage.getItem("refyn:studio:source");
    if (src) {
      setG({ source: src });
      setMore(true);
      sessionStorage.removeItem("refyn:studio:source");
    }
    const pending = sessionStorage.getItem(PENDING_DIAGRAM);
    if (pending) {
      sessionStorage.removeItem(PENDING_DIAGRAM);
      try {
        const { spec, caption } = JSON.parse(pending) as { spec: DiagramSpec; caption?: string };
        const q: Question = { id: uid(), type: "short", prompt: caption || "Use the diagram to answer the question.", marks: 2, lines: 4, diagram: spec };
        const base = (history[history.length - 1] as Worksheet | undefined) ?? null;
        if (base && (base.kind === "worksheet" || base.kind === "test")) {
          commit({ ...base, sections: base.sections.map((s, i, arr) => (i === arr.length - 1 ? { ...s, questions: [...s.questions, q] } : s)) });
        } else {
          commit({ kind: "worksheet", title: "Diagram questions", sections: [{ id: uid(), title: "Questions", questions: [q] }] }, uid());
        }
        toast.success("Diagram added to your worksheet");
      } catch {
        /* ignore a bad hand-off */
      }
    }
    if (params.get("auto") === "1" && topic) window.setTimeout(() => document.getElementById("studio-generate")?.click(), 200);
    if (id || kind || topic || params.get("auto")) setParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) return;
    setStage(0);
    const t = window.setInterval(() => setStage((s) => Math.min(STAGES.length - 1, s + 1)), 3200);
    return () => window.clearInterval(t);
  }, [loading]);

  const generate = async (override?: Partial<GenOptions>) => {
    if (!config) return;
    const o: GenOptions = { ...gen, ...override, band, group: mypGroup, programme, criterion: programme === "dp" ? undefined : (override?.criterion ?? gen.criterion) };
    if (!o.topic.trim()) {
      toast.error("Add a topic first");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const reply = await askStudio(buildPrompt(o, config.systemContext), config.subjectLabel, band);
      const next = normalize(extractJson(reply), o.kind);
      commit(next, override ? uid() : docId && doc?.kind === o.kind && doc.title === next.title ? docId : uid());
      toast.success(`${KINDS.find((k) => k.id === o.kind)?.label} ready: ${questionCount(next)} ${o.kind === "flashcards" ? "cards" : "questions"}`);
    } catch (e) {
      setError((e as Error)?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onAction = async (qid: string, action: QAction) => {
    if (!doc || doc.kind === "flashcards" || !config) return;
    const mapQs = (fn: (qs: Question[]) => Question[]): Printable =>
      doc.kind === "exit" ? { ...doc, questions: fn(doc.questions) } : { ...doc, sections: doc.sections.map((s) => ({ ...s, questions: fn(s.questions) })).filter((s) => s.questions.length) };
    if (action === "delete") return commit(mapQs((qs) => qs.filter((q) => q.id !== qid)));
    if (action === "more" || action === "less")
      return commit(mapQs((qs) => qs.map((q) => (q.id === qid ? { ...q, marks: Math.max(0, q.marks + (action === "more" ? 1 : -1)) } : q))));
    if (action === "up" || action === "down") {
      if (doc.kind === "exit") {
        const i = doc.questions.findIndex((q) => q.id === qid);
        const j = action === "up" ? i - 1 : i + 1;
        if (j < 0 || j >= doc.questions.length) return;
        const qs = [...doc.questions];
        [qs[i], qs[j]] = [qs[j], qs[i]];
        return commit({ ...doc, questions: qs });
      }
      // move within and across sections
      const flat = doc.sections.flatMap((s, si) => s.questions.map((q) => ({ q, si })));
      const i = flat.findIndex((x) => x.q.id === qid);
      const j = action === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= flat.length) return;
      [flat[i], flat[j]] = [{ q: flat[j].q, si: flat[i].si }, { q: flat[i].q, si: flat[j].si }];
      return commit({ ...doc, sections: doc.sections.map((s, si) => ({ ...s, questions: flat.filter((x) => x.si === si).map((x) => x.q) })) });
    }
    if (action === "regen") {
      const all = doc.kind === "exit" ? doc.questions : doc.sections.flatMap((s) => s.questions);
      const old = all.find((q) => q.id === qid);
      if (!old) return;
      setBusyId(qid);
      try {
        const prompt = [
          config.systemContext,
          `Rewrite one question from a ${band} ${doc.kind} titled "${doc.title}" (level: ${gen.level}).`,
          `Keep it as a "${old.type}" question worth about ${old.marks} marks, on the same idea but clearly different from: "${old.prompt}".`,
          "Use plain Unicode maths, never LaTeX.",
          QUESTION_SHAPE,
          old.diagram || gen.diagrams ? DIAGRAM_SCHEMA : "",
          "Include an answer. Return ONLY the JSON for the single question object.",
        ].join("\n\n");
        const reply = await askStudio(prompt, config.subjectLabel, band);
        const q = normQuestion(extractJson(reply));
        if (!q) throw new Error("No question came back");
        commit(mapQs((qs) => qs.map((x) => (x.id === qid ? { ...q, id: qid } : x))));
      } catch {
        toast.error("Couldn't rewrite that question. Try again.");
      } finally {
        setBusyId(null);
      }
    }
  };

  const addQuestion = () => {
    if (!doc || doc.kind === "flashcards") return;
    const q: Question = { id: uid(), type: "short", prompt: "New question: click to edit.", marks: 2, lines: 3 };
    if (doc.kind === "exit") return commit({ ...doc, questions: [...doc.questions, q] });
    commit({ ...doc, sections: doc.sections.map((s, i, arr) => (i === arr.length - 1 ? { ...s, questions: [...s.questions, q] } : s)) });
  };

  const opts: DocOptions | null = look
    ? { ...design, header: design.header || `Mahindra International School · ${config?.title.replace(" Studio", "") ?? ""}`, accent: look.accent, gradient: look.gradient }
    : null;

  const print = () => {
    if (!paperRef.current || !shown) return;
    printElement(paperRef.current, shown.title);
  };
  const copy = async () => {
    if (!shown) return;
    try {
      await navigator.clipboard.writeText(toPlainText(shown, design.answerKey));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Copy was blocked by the browser");
    }
  };
  const doAssign = async () => {
    if (!doc || !user) return;
    const cls = teacher.classes.find((c) => c.id === assign.classId);
    if (!cls) return toast.error("Choose a class");
    setAssigning(true);
    // Students can read everything in a task, so the mark scheme never goes in
    const clean = stripAnswers(doc);
    const tagged = doc.kind === "flashcards" ? [] : [...new Set((doc.kind === "exit" ? doc.questions : doc.sections.flatMap((s) => s.questions)).map((q) => q.criterion).filter(Boolean))] as Letter[];
    const year = Number(String(band).match(/(\d)/)?.[1]) || 5;
    try {
      const id = await saveTask(user.id, {
        class_id: cls.id,
        title: doc.title,
        instructions: doc.kind === "worksheet" || doc.kind === "test" ? doc.instructions ?? null : null,
        worksheet: toMarkdown(clean),
        resources: opts ? [{ kind: "printable", id: newId(), name: doc.title, doc: clean, opts: { theme: opts.theme, accent: opts.accent, gradient: opts.gradient, header: opts.header, grid: opts.grid, accessible: opts.accessible, showMarks: opts.showMarks, nameFields: opts.nameFields } }] : [],
        rubric: mypGroup && programme !== "dp" && tagged.length ? cleanRubric({ kind: "myp", group: mypGroup, year: Math.min(5, year), criteria: tagged, clarifications: {} }) : null,
        due_date: assign.due ? new Date(assign.due).toISOString() : null,
        subject: cls.subject,
        ...SOLO,
        description: null,
      }, { create: true });
      setAssignOpen(false);
      toast.success(`Assigned to ${cls.name}`, { action: { label: "Open the task", onClick: () => navigate(`/task/${id}`) } });
    } catch {
      toast.error("Couldn't create the assignment");
    } finally {
      setAssigning(false);
    }
  };

  const ideas = useMemo(() => look?.ideas.filter((i) => i.kind === gen.kind || gen.kind === "worksheet").slice(0, 4) ?? [], [look, gen.kind]);

  if (!config || !look || !opts) return <Navigate to="/dashboard" replace />;

  return (
    <StudyShell wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">
            <Link to="/studio" className="hover:text-white">
              {config.title}
            </Link>{" "}
            · Create
          </p>
          <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.035em] text-white">Printables</h1>
          <p className="mt-1 text-[14px] text-lp-soft">Worksheets, tests, exit tickets and flashcards with exact diagrams, ready to print.</p>
        </div>
        {doc && (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={undo} disabled={history.length < 2} className="flex h-9 w-9 items-center justify-center rounded-xl border border-lp-line text-lp-soft hover:text-white disabled:opacity-40" aria-label="Undo" title="Undo">
              <Undo2 className="h-4 w-4" />
            </button>
            <button type="button" onClick={redo} disabled={!future.length} className="flex h-9 w-9 items-center justify-center rounded-xl border border-lp-line text-lp-soft hover:text-white disabled:opacity-40" aria-label="Redo" title="Redo">
              <Redo2 className="h-4 w-4" />
            </button>
            <span className="ml-2 inline-flex items-center gap-1 text-[12px] text-lp-mute">
              <Check className="h-3.5 w-3.5 text-lp-green" /> Saved to library
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* ---------- Setup ---------- */}
        <div className="space-y-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:self-start xl:overflow-y-auto xl:pb-2">
          <Panel className="p-4" delay={40}>
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((k) => {
                const on = gen.kind === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setG({ kind: k.id, count: k.id === "flashcards" ? 12 : gen.count > 20 ? 10 : gen.count })}
                    className={cn("rounded-2xl border p-3 text-left transition-colors", on ? "border-lp-sky/50 bg-lp-blue/15" : "border-lp-line hover:border-lp-sky/30")}
                  >
                    <k.icon className={cn("h-4 w-4", on ? "text-lp-sky" : "text-lp-mute")} />
                    <p className={cn("mt-2 text-[13.5px] font-medium", on ? "text-white" : "text-lp-text")}>{k.label}</p>
                    <p className="text-[11.5px] leading-snug text-lp-mute">{k.body}</p>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel className="p-4" delay={70}>
            <label className="block text-[12.5px] font-medium text-lp-soft" htmlFor="studio-topic">
              Topic
            </label>
            <textarea
              id="studio-topic"
              value={gen.topic}
              onChange={(e) => setG({ topic: e.target.value })}
              rows={3}
              placeholder="e.g. Sine and cosine rule with bearings problems"
              className="mt-1.5 w-full resize-none rounded-xl border border-lp-line bg-lp-deep/40 p-3 text-[14px] text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ideas.map((i) => (
                <button key={i.title} type="button" onClick={() => setG({ topic: i.topic, diagrams: i.diagrams })} className="rounded-full border border-lp-line px-2.5 py-1 text-[11.5px] text-lp-soft hover:border-lp-sky/40 hover:text-white">
                  {i.title}
                </button>
              ))}
            </div>

            <p className="mt-4 text-[12.5px] font-medium text-lp-soft">Grade band</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {config.gradeBands.map((b) => (
                <button key={b.id} type="button" title={b.description} onClick={() => setBand(b.id)} className={cn("h-8 rounded-lg border px-2.5 text-[12.5px] font-medium", band === b.id ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white")}>
                  {b.label}
                </button>
              ))}
            </div>

            <p className="mt-4 text-[12.5px] font-medium text-lp-soft">Level</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl border border-lp-line bg-lp-deep/40 p-1">
              {(["support", "core", "stretch"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setG({ level: l })} className={cn("h-8 rounded-lg text-[12.5px] font-medium capitalize", gen.level === l ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>
                  {l}
                </button>
              ))}
            </div>

            {gen.kind !== "exit" && (
              <>
                <div className="mt-4 flex items-center justify-between text-[12.5px]">
                  <span className="font-medium text-lp-soft">{gen.kind === "flashcards" ? "Cards" : "Questions"}</span>
                  <span className="tabular-nums text-white">{gen.count}</span>
                </div>
                <input
                  type="range"
                  min={gen.kind === "flashcards" ? 8 : 4}
                  max={gen.kind === "flashcards" ? 24 : 20}
                  value={gen.count}
                  onChange={(e) => setG({ count: Number(e.target.value) })}
                  className="lp-range mt-2"
                  style={{ ["--fill" as string]: `${((gen.count - (gen.kind === "flashcards" ? 8 : 4)) / (gen.kind === "flashcards" ? 16 : 16)) * 100}%` }}
                  aria-label="Number of questions"
                />
              </>
            )}

            {(gen.kind === "worksheet" || gen.kind === "test") && (
              <>
                <p className="mt-4 text-[12.5px] font-medium text-lp-soft">Question types</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ALL_TYPES.map((t) => {
                    const on = gen.types.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setG({ types: on ? (gen.types.length > 1 ? gen.types.filter((x) => x !== t) : gen.types) : [...gen.types, t] })}
                        className={cn("h-7 rounded-full border px-2.5 text-[11.5px] font-medium", on ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white")}
                      >
                        {QTYPE_LABEL[t]}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {gen.kind !== "flashcards" && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-lp-line bg-lp-deep/40 px-3 py-2.5">
                <div>
                  <p className="text-[13px] font-medium text-white">Exact diagrams</p>
                  <p className="text-[11.5px] text-lp-mute">Triangles, graphs, circuits and more, drawn to scale</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={gen.diagrams}
                  onClick={() => setG({ diagrams: !gen.diagrams })}
                  className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", gen.diagrams ? "bg-lp-blue" : "bg-lp-line")}
                >
                  <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-[#FFFFFF] shadow transition-transform", gen.diagrams ? "translate-x-[22px]" : "translate-x-0.5")} />
                </button>
              </div>
            )}

            <button type="button" onClick={() => setMore((m) => !m)} className="mt-4 inline-flex items-center gap-1 text-[12.5px] text-lp-sky hover:text-white">
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", more && "rotate-180")} /> More options
            </button>
            {more && (
              <div className="mt-3 space-y-3">
                {(gen.kind === "worksheet" || gen.kind === "test") && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-[12px] text-lp-mute">
                      Time (min)
                      <input type="number" min={5} max={180} value={gen.minutes ?? ""} onChange={(e) => setG({ minutes: Number(e.target.value) || undefined })} className={cn(inputCls, "mt-1 h-9 py-1")} />
                    </label>
                    {programme === "dp" ? (
                      <p className="self-end pb-2 text-[11.5px] leading-snug text-lp-mute">DP work uses markschemes, not MYP criteria.</p>
                    ) : (
                      <label className="block text-[12px] text-lp-mute">
                        MYP criterion
                        <select value={gen.criterion ?? ""} onChange={(e) => setG({ criterion: e.target.value })} className={cn(inputCls, "mt-1 h-9 py-1")} title={mypGroup && gen.criterion ? MYP[mypGroup].criteria[gen.criterion as Letter]?.name : undefined}>
                          <option value="">Any</option>
                          {(["A", "B", "C", "D"] as const).map((c) => (
                            <option key={c} value={c}>
                              {c}{mypGroup ? ` · ${MYP[mypGroup].criteria[c].name}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                )}
                <label className="block text-[12px] text-lp-mute">
                  Build it from your own material (optional)
                  <textarea value={gen.source ?? ""} onChange={(e) => setG({ source: e.target.value })} rows={4} placeholder="Paste a passage, notes, data or a past-paper question…" className={cn(inputCls, "mt-1 h-auto resize-y py-2")} />
                </label>
                <label className="block text-[12px] text-lp-mute">
                  Anything else?
                  <input value={gen.notes ?? ""} onChange={(e) => setG({ notes: e.target.value })} placeholder="e.g. use cricket examples, include a data table" className={cn(inputCls, "mt-1 h-9 py-1")} />
                </label>
              </div>
            )}

            <button id="studio-generate" type="button" onClick={() => generate()} disabled={loading} className={cn(primaryBtn, "mt-5 h-11 w-full")}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? STAGES[stage] : doc ? "Generate again" : `Create ${KINDS.find((k) => k.id === gen.kind)?.label.toLowerCase()}`}
            </button>
            {error && <p className="mt-2 text-[12.5px] text-lp-red">{error}</p>}
          </Panel>

          {doc && (doc.kind === "worksheet" || doc.kind === "test") && (
            <Panel className="p-4" delay={0}>
              <p className="text-[12.5px] font-medium text-lp-soft">Make another version</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {(["support", "core", "stretch"] as const).map((l) => (
                  <button key={l} type="button" disabled={loading} onClick={() => generate({ level: l })} className="h-9 rounded-lg border border-lp-line text-[12.5px] font-medium capitalize text-lp-soft hover:border-lp-sky/40 hover:text-white disabled:opacity-50">
                    {l}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] text-lp-mute">Same topic at a different level, so every group gets a sheet that fits. Each version is saved to your library.</p>
            </Panel>
          )}
        </div>

        {/* ---------- Preview ---------- */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-lp-line bg-lp-surface/60 p-1">
              {THEMES.map((t) => (
                <button key={t.id} type="button" onClick={() => setDesign((d) => ({ ...d, theme: t.id }))} className={cn("h-8 rounded-lg px-3 text-[12.5px] font-medium", design.theme === t.id ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>
                  {t.label}
                </button>
              ))}
            </div>
            <Toggle on={design.answerKey} set={(v) => setDesign((d) => ({ ...d, answerKey: v }))} label="Answer key" icon={KeyRound} />
            <Toggle on={design.nameFields} set={(v) => setDesign((d) => ({ ...d, nameFields: v }))} label="Name line" icon={UserRound} />
            <Toggle on={design.showMarks} set={(v) => setDesign((d) => ({ ...d, showMarks: v }))} label="Marks" icon={BookMarked} />
            <Toggle on={design.grid} set={(v) => setDesign((d) => ({ ...d, grid: v }))} label="Squared paper" icon={Grid3x3} />
            <Toggle on={design.accessible} set={(v) => setDesign((d) => ({ ...d, accessible: v }))} label="Easy-read" icon={Accessibility} />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={print} className={primaryBtn}>
              <Printer className="h-4 w-4" /> Print or save as PDF
            </button>
            <button type="button" onClick={copy} className={ghostBtn}>
              {copied ? <Check className="h-4 w-4 text-lp-green" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy text"}
            </button>
            {doc && (
              <button type="button" onClick={() => setAssignOpen(true)} className={ghostBtn}>
                <Send className="h-4 w-4" /> Assign to a class
              </button>
            )}
            {doc && doc.kind !== "flashcards" && (
              <button type="button" onClick={addQuestion} className={ghostBtn}>
                <ListPlus className="h-4 w-4" /> Add question
              </button>
            )}
            <Link to="/studio/diagrams" className={ghostBtn}>
              <Wand2 className="h-4 w-4" /> Diagram lab
            </Link>
            {shown && shown.kind !== "flashcards" && (
              <span className="ml-auto text-[12px] text-lp-mute">
                {questionCount(shown)} questions · {totalMarks(shown)} marks
              </span>
            )}
          </div>

          <div className="relative rounded-[28px] border border-lp-line bg-lp-deep/50 p-3 sm:p-6">
            {!doc && !loading && (
              <div className="ws-noprint absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full border border-lp-sky/40 bg-lp-surface px-3 py-1 text-[12px] font-medium text-lp-sky shadow-lg">
                Example · click Create to make your own
              </div>
            )}
            {loading && (
              <div className="absolute inset-3 z-10 flex items-start justify-center rounded-2xl bg-lp-deep/40 pt-24 backdrop-blur-[2px] sm:inset-6">
                <div className="rounded-2xl border border-lp-line bg-lp-surface px-5 py-4 text-center shadow-xl">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-lp-sky" />
                  <p className="mt-2 text-[14px] font-medium text-white">{STAGES[stage]}</p>
                  <p className="text-[12px] text-lp-mute">Usually 15–30 seconds</p>
                </div>
              </div>
            )}
            <div className={cn("overflow-x-auto rounded-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] transition-opacity", loading && "opacity-40")}>
              {shown && (
                <PrintableDoc
                  ref={paperRef}
                  doc={shown}
                  opts={opts}
                  editable={!!doc}
                  busyId={busyId}
                  onEdit={doc ? (next) => commit(next) : undefined}
                  onAction={doc ? onAction : undefined}
                />
              )}
            </div>
            {doc && <p className="ws-noprint mt-3 text-center text-[12px] text-lp-mute">Click any text to edit it. Hover a question to move, rewrite or delete it.</p>}
          </div>
        </div>
      </div>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign to a class"
        description="Students see the questions in their class, and you mark their answers in Marking."
        footer={
          <>
            <button type="button" onClick={() => setAssignOpen(false)} className={ghostBtn}>
              Cancel
            </button>
            <button type="button" onClick={doAssign} disabled={assigning || !assign.classId} className={primaryBtn}>
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Assign
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Class">
            <select value={assign.classId} onChange={(e) => setAssign((a) => ({ ...a, classId: e.target.value }))} className={inputCls}>
              <option value="">Choose a class</option>
              {teacher.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due" hint="Optional">
            <input type="datetime-local" value={assign.due} onChange={(e) => setAssign((a) => ({ ...a, due: e.target.value }))} className={inputCls} />
          </Field>
          <p className="text-[12.5px] text-lp-mute">Tip: print the sheet too, so students can work on paper and hand in a photo.</p>
        </div>
      </Modal>
    </StudyShell>
  );
};

export default PrintableMaker;
