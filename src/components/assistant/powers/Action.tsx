import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, ClipboardPlus, Loader2, Send, WandSparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherData } from "@/components/teacher/data";
import { MYP, type Letter, type MypGroup } from "@/lib/myp";
import { createSet } from "@/components/criteria/engine";
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

const Assignment: React.FC<{ spec: Extract<ActionSpec, { type: "assignment" }>; storeKey: string }> = ({ spec, storeKey }) => {
  const { user } = useAuth();
  const { data, reload } = useTeacherData();
  const [state, setState] = useSaved<Done>(storeKey, { done: false });
  const [d, setD] = useState({ classId: spec.classId, title: spec.title, description: spec.description, due: spec.due });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!data.classes.some((c) => c.id === d.classId) && data.classes.length) setD((x) => ({ ...x, classId: data.classes.length === 1 ? data.classes[0].id : "" }));
  }, [data.classes]); // eslint-disable-line react-hooks/exhaustive-deps
  const cls = data.classes.find((c) => c.id === d.classId);

  const create = async () => {
    if (!user || !cls || !d.title.trim()) return;
    setBusy(true);
    setError("");
    const due = d.due ? new Date(d.due) : null;
    const { data: row, error: err } = await supabase.from("class_assignments").insert({
      class_id: cls.id, teacher_id: user.id, title: d.title.trim().slice(0, 200), description: d.description.trim() || null, due_date: due && !isNaN(due.getTime()) ? due.toISOString() : null, subject: cls.subject,
    }).select("id").single();
    setBusy(false);
    if (err || !row) { setError("Couldn't create it. Check the class and try again."); return; }
    setState({ done: true, link: `/class/${cls.id}`, note: `${d.title.trim()} · ${cls.name}` });
    reload();
  };

  return (
    <Card>
      <CardHead icon={ClipboardPlus} kind="Set an assignment" title={state.done ? state.note ?? d.title : d.title || "New assignment"} />
      {state.done ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[13.5px] text-emerald-300"><Check className="h-4 w-4" /> Created and visible to the class. {state.link && <Link to={state.link} className="text-lp-sky hover:underline">Open the class</Link>}</p>
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
          <textarea value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} rows={5} placeholder="Instructions for students" className={field} />
          {error && <p className="text-[12.5px] text-lp-red">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy || !cls || !d.title.trim()} onClick={create} className={primary}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPlus className="h-4 w-4" />} Create assignment</button>
            <span className="text-[12px] text-lp-mute">{cls ? `Students in ${cls.name} will see it straight away.` : "Pick the class first."}</span>
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

export const Action: React.FC<{ spec: ActionSpec; storeKey: string; teacher: boolean }> = ({ spec, storeKey, teacher }) => {
  if (spec.type === "open") return <OpenTool spec={spec} teacher={teacher} />;
  if (spec.type === "message") return <Message spec={spec} storeKey={storeKey} teacher={teacher} />;
  // Teacher-only actions never render for students, whatever the model wrote
  if (!teacher) return null;
  if (spec.type === "assignment") return <Assignment spec={spec} storeKey={storeKey} />;
  if (spec.type === "marking_set") return <MarkingSetAction spec={spec} storeKey={storeKey} />;
  return null;
};
