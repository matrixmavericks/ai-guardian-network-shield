import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, ClipboardPlus, Loader2, Send, WandSparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherData } from "@/components/teacher/data";
import { MYP, type Letter, type MypGroup } from "@/lib/myp";
import { createSet } from "@/components/criteria/engine";
import { MIME, buildFile, type OutputFile } from "@/components/assistant/files/outputs";
import { SOLO, cleanRubric, hasAnswerKey, newId, saveTask, uploadTaskFile, withoutAnswerKey, type TaskResource } from "@/components/tasks/task";
import type { ActionSpec } from "./blocks";
import { Card, CardHead, field, primary, useSaved } from "./ui";

// Actions the assistant proposes. Nothing happens until the person checks the
// details and presses the button; each one uses their own permissions.

const TOOLS: Record<string, { to: string; label: string }> = {
  "assessment-coach": { to: "/assessment-coach", label: "Assessment coach" },
  "personal-project": { to: "/personal-project", label: "Personal project coach" },
  "marking-copilot": { to: "/marking-copilot", label: "Marking copilot" },
  "past-papers": { to: "/past-papers", label: "Past papers" },
  decks: { to: "/decks", label: "Presentations" },
  marking: { to: "/marking", label: "Marking" },
  grades: { to: "/grades", label: "Grades" },
  classes: { to: "/classes", label: "Classes" },
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
/** Best match for a name the model wrote ("Priya", "priya nair", "Ms Rao"). */
const bestMatch = <T extends { name: string }>(people: T[], name: string): T | undefined => {
  const n = norm(name);
  if (!n) return undefined;
  return people.find((p) => norm(p.name) === n) ?? people.find((p) => norm(p.name).startsWith(n) || n.startsWith(norm(p.name))) ?? people.find((p) => norm(p.name).split(" ").some((w) => w && n.split(" ").includes(w)));
};

type Done = { done: boolean; link?: string; note?: string };

const STUDENT_TOOLS = ["assessment-coach", "personal-project", "grades", "classes"];

const OpenTool: React.FC<{ spec: Extract<ActionSpec, { type: "open" }>; teacher: boolean }> = ({ spec, teacher }) => {
  // One task's page (students and teachers), by its id from YOUR REFYN
  if (spec.tool === "task" && /^[0-9a-f-]{36}$/i.test(spec.id)) {
    return (
      <Link to={`/task/${spec.id}`} className="my-3 flex items-center gap-3 rounded-2xl border border-lp-line bg-lp-surface px-4 py-3 transition-colors hover:border-lp-blue/50">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lp-blue/15 text-lp-sky"><ClipboardPlus className="h-[18px] w-[18px]" /></span>
        <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium text-white">{spec.label || "Open the task"}</span><span className="block text-[12px] text-lp-mute">Instructions, the task, resources and rubric</span></span>
        <ArrowRight className="h-4 w-4 text-lp-sky" />
      </Link>
    );
  }
  const tool = TOOLS[spec.tool];
  if (!tool || (!teacher && !STUDENT_TOOLS.includes(spec.tool))) return null;
  return (
    <Link to={tool.to} className="my-3 flex items-center gap-3 rounded-2xl border border-lp-line bg-lp-surface px-4 py-3 transition-colors hover:border-lp-blue/50">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lp-blue/15 text-lp-sky"><WandSparkles className="h-[18px] w-[18px]" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-white">{spec.label || `Open ${tool.label}`}</span>
        <span className="block text-[12px] text-lp-mute">{tool.label}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-lp-sky" />
    </Link>
  );
};

/** Files in the reply that look like they're for the teacher only. */
const teacherOnly = (f: OutputFile) => /answer|mark ?scheme|marking|solution|key\b|teacher/i.test(f.base);

const Assignment: React.FC<{ spec: Extract<ActionSpec, { type: "assignment" }>; storeKey: string; files: OutputFile[] }> = ({ spec, storeKey, files }) => {
  const { user } = useAuth();
  const { data, reload } = useTeacherData();
  const [state, setState] = useSaved<Done>(storeKey, { done: false });
  const [d, setD] = useState({ classId: spec.classId, title: spec.title, instructions: spec.instructions || spec.description, due: spec.due });
  // Which of the reply's files students get: the ones the AI named, otherwise every document that isn't a key
  const named = (f: OutputFile) => spec.attach.some((a) => a.toLowerCase().replace(/\.[a-z0-9]+$/, "") === f.base.toLowerCase());
  const [include, setInclude] = useState<Record<string, boolean>>(() => Object.fromEntries(files.map((f) => [f.name, spec.attach.length ? named(f) && !teacherOnly(f) : f.kind === "document" && !teacherOnly(f)])));
  const rubricOk = !!spec.rubric && spec.rubric.group in MYP;
  const [useRubric, setUseRubric] = useState(rubricOk);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!data.classes.some((c) => c.id === d.classId) && data.classes.length) setD((x) => ({ ...x, classId: data.classes.length === 1 ? data.classes[0].id : "" }));
  }, [data.classes]); // eslint-disable-line react-hooks/exhaustive-deps
  const cls = data.classes.find((c) => c.id === d.classId);
  const chosen = files.filter((f) => include[f.name]);
  const mainDoc = chosen.find((f) => f.kind === "document");

  const create = async () => {
    if (!user || !cls || !d.title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const taskId = newId();
      const resources: TaskResource[] = [];
      for (const f of chosen) {
        if (f === mainDoc) continue;
        if (f.kind === "document") resources.push({ kind: "doc", id: newId(), name: f.name, markdown: withoutAnswerKey(f.content).md });
        else {
          const blob = await buildFile(f, "xlsx");
          resources.push(await uploadTaskFile(cls.id, taskId, new File([blob], `${f.base}.xlsx`, { type: MIME.xlsx })));
        }
      }
      const due = d.due ? new Date(d.due) : null;
      const r = spec.rubric;
      const id = await saveTask(user.id, {
        class_id: cls.id, title: d.title.trim().slice(0, 200), instructions: d.instructions.trim() || null,
        worksheet: mainDoc ? withoutAnswerKey(mainDoc.content).md : null, resources,
        rubric: useRubric && r ? cleanRubric({ kind: "myp", group: r.group, year: r.year, criteria: r.criteria, clarifications: {} }) : null,
        due_date: due && !isNaN(due.getTime()) ? due.toISOString() : null, subject: cls.subject, ...SOLO, description: null,
      }, { id: taskId, create: true });
      setState({ done: true, link: `/task/${id}`, note: `${d.title.trim()} · ${cls.name}` });
      reload();
    } catch {
      setError("Couldn't create it. Check the class and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHead icon={ClipboardPlus} kind="Set a task" title={state.done ? state.note ?? d.title : d.title || "New task"} />
      {state.done ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[13.5px]">
          <span className="flex items-center gap-2 text-emerald-300"><Check className="h-4 w-4" /> Set. Students can open the full task now.</span>
          {state.link && <Link to={state.link} className="text-lp-sky hover:underline">Open the task page</Link>}
          {state.link && <Link to={`${state.link}/edit`} className="text-lp-sky hover:underline">Edit it</Link>}
        </div>
      ) : (
        <div className="mt-3 grid gap-2.5">
          <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_200px]">
            <select value={d.classId} onChange={(e) => setD({ ...d, classId: e.target.value })} className={field} aria-label="Class">
              <option value="">Choose a class…</option>
              {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="datetime-local" value={d.due} onChange={(e) => setD({ ...d, due: e.target.value })} className={field} aria-label="Due" />
          </div>
          <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Title" className={field} />
          <textarea value={d.instructions} onChange={(e) => setD({ ...d, instructions: e.target.value })} rows={4} placeholder="Instructions for students" className={field} />
          {(files.length > 0 || rubricOk) && (
            <div className="rounded-xl border border-lp-line p-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-lp-mute">What students get</p>
              <ul className="mt-2 space-y-1.5">
                {files.map((f) => (
                  <li key={f.name}>
                    <label className="flex items-start gap-2.5 text-[13.5px]">
                      <input type="checkbox" checked={!!include[f.name]} onChange={(e) => setInclude({ ...include, [f.name]: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#3B82F6]" />
                      <span className="min-w-0 flex-1">
                        <span className="text-white">{f.name}</span>
                        <span className="block text-[12px] text-lp-mute">
                          {teacherOnly(f) ? (include[f.name] ? "Careful: this looks like an answer key, and students would see it." : "Looks like it's for you (answer key or mark scheme), so it stays with you.")
                            : f === mainDoc ? `Shown as the task itself${hasAnswerKey(f.content) ? "; its answer key section is left out" : ""}.`
                              : f.kind === "sheet" ? "Attached as an Excel file." : "Shown as an extra document."}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
                {rubricOk && spec.rubric && (
                  <li>
                    <label className="flex items-start gap-2.5 text-[13.5px]">
                      <input type="checkbox" checked={useRubric} onChange={(e) => setUseRubric(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#3B82F6]" />
                      <span className="min-w-0 flex-1"><span className="text-white">Rubric: MYP {MYP[spec.rubric.group as MypGroup].name}, criteria {spec.rubric.criteria.join(", ")}</span><span className="block text-[12px] text-lp-mute">Year {spec.rubric.year}. Add task-specific clarifications in the editor afterwards.</span></span>
                    </label>
                  </li>
                )}
              </ul>
            </div>
          )}
          {error && <p className="text-[12.5px] text-lp-red">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy || !cls || !d.title.trim()} onClick={create} className={primary}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPlus className="h-4 w-4" />} Set task</button>
            <span className="text-[12px] text-lp-mute">{cls ? `Students in ${cls.name} get a task page with everything ticked above.` : "Pick the class first."}</span>
          </div>
        </div>
      )}
    </Card>
  );
};

type Person = { id: string; name: string };

/** People this person can message from the chat: a teacher's students, or a student's teachers. */
const useRecipients = (teacher: boolean): Person[] | null => {
  const { user } = useAuth();
  const { data } = useTeacherData(teacher);
  const [teachers, setTeachers] = useState<Person[] | null>(null);
  useEffect(() => {
    if (teacher || !user) return;
    (async () => {
      const { data: mem } = await supabase.from("class_members").select("class_id").eq("student_id", user.id);
      const ids = (mem ?? []).map((m) => m.class_id);
      if (!ids.length) { setTeachers([]); return; }
      const { data: cls } = await supabase.from("classes").select("teacher_id, name").in("id", ids);
      const tIds = [...new Set((cls ?? []).map((c) => c.teacher_id))];
      const { data: prof } = tIds.length ? await supabase.from("profiles").select("user_id, full_name").in("user_id", tIds) : { data: [] };
      setTeachers((prof ?? []).map((p) => ({ id: p.user_id, name: p.full_name || "Teacher" })));
    })();
  }, [teacher, user]);
  return useMemo(() => (teacher ? Object.values(data.students).map((s) => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name)) : teachers), [teacher, data.students, teachers]);
};

const Message: React.FC<{ spec: Extract<ActionSpec, { type: "message" }>; storeKey: string; teacher: boolean }> = ({ spec, storeKey, teacher }) => {
  const { user } = useAuth();
  const people = useRecipients(teacher);
  const [state, setState] = useSaved<Done>(storeKey, { done: false });
  const [to, setTo] = useState("");
  const [text, setText] = useState(spec.text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (people && !to) setTo(bestMatch(people, spec.to)?.id ?? (people.length === 1 ? people[0].id : "")); }, [people]); // eslint-disable-line react-hooks/exhaustive-deps
  const person = people?.find((p) => p.id === to);

  const send = async () => {
    if (!user || !person || !text.trim()) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.from("messages").insert({ sender_id: user.id, receiver_id: person.id, content: text.trim().slice(0, 4000) });
    setBusy(false);
    if (err) { setError("Couldn't send it. Try again."); return; }
    setState({ done: true, note: person.name });
  };

  return (
    <Card>
      <CardHead icon={Send} kind={teacher ? "Message a student" : "Message your teacher"} title={state.done ? `Sent to ${state.note}` : person ? `To ${person.name}` : spec.to ? `To ${spec.to}` : "New message"} />
      {state.done ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[13.5px] text-emerald-300"><Check className="h-4 w-4" /> Sent. <Link to="/messages" className="text-lp-sky hover:underline">Open messages</Link></p>
      ) : (
        <div className="mt-3 grid gap-2.5">
          <select value={to} onChange={(e) => setTo(e.target.value)} className={field} aria-label="Recipient" disabled={!people}>
            <option value="">{people ? (people.length ? "Choose who to send it to…" : "No one to message yet") : "Loading…"}</option>
            {people?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className={field} />
          {error && <p className="text-[12.5px] text-lp-red">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy || !person || !text.trim()} onClick={send} className={primary}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send</button>
            <span className="text-[12px] text-lp-mute">Read it through first: it's sent from you.</span>
          </div>
        </div>
      )}
    </Card>
  );
};

const MarkingSetAction: React.FC<{ spec: Extract<ActionSpec, { type: "marking_set" }>; storeKey: string }> = ({ spec, storeKey }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useSaved<Done>(storeKey, { done: false });
  const [busy, setBusy] = useState(false);
  const group = (spec.group in MYP ? spec.group : "sciences") as MypGroup;
  const criteria = spec.criteria as Letter[];
  const start = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const set = await createSet(user.id, { title: spec.title, subject_group: group, year: spec.year, criteria, task: { title: spec.title, description: spec.task, tsc: "" }, assignment_id: null });
      setState({ done: true, link: `/marking-copilot?set=${set.id}` });
      navigate(`/marking-copilot?set=${set.id}`);
    } catch {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHead icon={WandSparkles} kind="Marking copilot" title={spec.title} />
      <p className="mt-2 text-[13px] text-lp-soft">{MYP[group].name} · MYP {spec.year} · criteria {criteria.map((l) => `${l} ${MYP[group].criteria[l].name}`).join(", ")}</p>
      {spec.task && <p className="mt-1.5 line-clamp-3 text-[12.5px] text-lp-mute">{spec.task}</p>}
      <div className="mt-3">
        {state.done && state.link ? <Link to={state.link} className={primary + " w-fit"}><ArrowRight className="h-4 w-4" /> Open the marking set</Link> : <button type="button" disabled={busy} onClick={start} className={primary}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />} Start this marking set</button>}
      </div>
    </Card>
  );
};

export const Action: React.FC<{ spec: ActionSpec; storeKey: string; teacher: boolean; files?: OutputFile[] }> = ({ spec, storeKey, teacher, files = [] }) => {
  if (spec.type === "open") return <OpenTool spec={spec} teacher={teacher} />;
  if (spec.type === "message") return <Message spec={spec} storeKey={storeKey} teacher={teacher} />;
  // Teacher-only actions never render for students, whatever the model wrote
  if (!teacher) return null;
  if (spec.type === "assignment") return <Assignment spec={spec} storeKey={storeKey} files={files} />;
  if (spec.type === "marking_set") return <MarkingSetAction spec={spec} storeKey={storeKey} />;
  return null;
};
