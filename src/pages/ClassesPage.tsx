import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { differenceInCalendarDays, format } from "date-fns";
import { ArrowRight, CalendarClock, Check, Copy, KeyRound, Loader2, Plus, School, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { EmptyState, chip, ghostBtn } from "@/components/student/ui";
import { StudyShell, primaryBtn } from "@/components/subjects/kit";
import { Field, Modal, inputCls } from "@/components/student/Modal";
import { monogram, themeFor } from "@/components/student/themes";

interface ClassItem {
  id: string;
  name: string;
  subject: string;
  description: string;
  join_code: string;
  teacher_id: string;
  created_at: string;
  memberCount?: number;
  curriculum_type?: string | null;
}

type Due = { id: string; title: string; class_id: string; due_date: string };

const CURRICULUM_LABELS: Record<string, string> = {
  general: "General",
  ib: "IB",
  "IB MYP": "IB MYP",
  ib_dp: "IB DP",
  ap: "AP",
  igcse: "IGCSE",
  cbse: "CBSE",
  a_levels: "A-Levels",
  custom: "Custom",
};

const SUBJECT_OPTIONS = ["Mathematics", "Science", "Biology", "Chemistry", "Physics", "English", "History", "Individuals & Societies", "Computer Science", "Design", "Art", "Music", "Physical Education", "Other"];

/* ---------- Six-box join code ---------- */

const CodeInput: React.FC<{ value: string; onChange: (v: string) => void; onSubmit: () => void; disabled?: boolean }> = ({ value, onChange, onSubmit, disabled }) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = value.padEnd(6, " ").slice(0, 6).split("");
  const set = (i: number, ch: string) => {
    const next = chars.slice();
    next[i] = ch;
    onChange(next.join("").replace(/\s+$/, "").replace(/\s/g, ""));
  };
  return (
    <div className="flex gap-1.5 sm:gap-2" onPaste={(e) => {
      const text = e.clipboardData.getData("text").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 6);
      if (text) {
        e.preventDefault();
        onChange(text);
        refs.current[Math.min(5, text.length)]?.focus();
      }
    }}>
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={c.trim()}
          disabled={disabled}
          inputMode="text"
          autoComplete="off"
          aria-label={`Code character ${i + 1}`}
          maxLength={1}
          onChange={(e) => {
            const ch = e.target.value.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-1);
            set(i, ch || " ");
            if (ch && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !c.trim() && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "Enter") onSubmit();
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
          }}
          className={cn(
            "h-12 w-10 rounded-xl border bg-lp-deep/70 text-center font-mono text-[20px] font-semibold uppercase text-white transition-all focus:outline-none sm:h-14 sm:w-12",
            c.trim() ? "border-lp-sky/50 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]" : "border-lp-line focus:border-lp-sky/60",
          )}
        />
      ))}
    </div>
  );
};

/* ---------- Class card ---------- */

const ClassCard: React.FC<{
  cls: ClassItem;
  teacherName?: string;
  next?: Due;
  pending: number;
  isTeacher: boolean;
  onCopy: () => void;
  onDelete: () => void;
  delay: number;
}> = ({ cls, teacherName, next, pending, isTeacher, onCopy, onDelete, delay }) => {
  const theme = themeFor(cls.subject || cls.name);
  const days = next ? differenceInCalendarDays(new Date(next.due_date), new Date()) : null;
  return (
    <Link
      to={`/class/${cls.id}`}
      className="lp-fade group flex flex-col overflow-hidden rounded-3xl border border-lp-line bg-lp-surface transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_60px_-28px_rgba(59,130,246,0.6)]"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="lp-keep relative h-28 overflow-hidden" style={{ background: theme.gradient }}>
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "14px 14px", maskImage: "linear-gradient(120deg, transparent 30%, black)", WebkitMaskImage: "linear-gradient(120deg, transparent 30%, black)" }}
        />
        <span aria-hidden className="absolute -bottom-7 right-3 select-none text-[92px] font-semibold leading-none tracking-[-0.06em] text-white/20 transition-transform duration-500 group-hover:-translate-y-1">
          {monogram(cls.name)}
        </span>
        <div className="absolute left-4 top-4 flex gap-1.5">
          {cls.curriculum_type && cls.curriculum_type !== "general" && (
            <span className="rounded-full bg-black/25 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
              {CURRICULUM_LABELS[cls.curriculum_type] ?? cls.curriculum_type}
            </span>
          )}
          {pending > 0 && <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-semibold text-[#0B1530]">{pending} to do</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[16.5px] font-semibold tracking-[-0.015em] text-white">{cls.name}</h3>
        <p className="mt-0.5 text-[12.5px] text-lp-mute">
          {cls.subject}
          {teacherName ? ` · ${teacherName}` : ""}
        </p>
        {cls.description && <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-lp-soft">{cls.description}</p>}

        <div className="mt-auto pt-4">
          {isTeacher ? (
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-lp-soft">
                <Users className="h-3.5 w-3.5 text-lp-sky" /> {cls.memberCount ?? 0} students
              </span>
              <span className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                <button type="button" onClick={onCopy} title="Copy join code" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-lp-line px-2.5 font-mono text-[12.5px] uppercase text-lp-soft hover:text-white">
                  <Copy className="h-3.5 w-3.5" /> {cls.join_code}
                </button>
                <button type="button" onClick={onDelete} title="Delete class" aria-label="Delete class" className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-lp-red/10 hover:text-lp-red">
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </div>
          ) : next ? (
            <div className="flex items-center gap-3 rounded-2xl border border-lp-line bg-lp-deep/50 px-3 py-2.5">
              <CalendarClock className={cn("h-4 w-4 shrink-0", days !== null && days <= 2 ? "text-lp-red" : "text-lp-sky")} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-white">{next.title}</p>
                <p className="text-[11.5px] text-lp-mute">
                  Due {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`} · {format(new Date(next.due_date), "d MMM")}
                </p>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-[12.5px] text-lp-mute">
              <Check className="h-3.5 w-3.5 text-lp-green" /> Nothing due right now
            </p>
          )}
          <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-lp-sky transition-transform group-hover:translate-x-0.5">
            Open class <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
};

/* ---------- Page ---------- */

const ClassesPage = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  // ?new=1 (from the overview or ⌘K) opens the create form straight away
  const [createOpen, setCreateOpen] = useState(() => searchParams.get("new") === "1");
  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [newClass, setNewClass] = useState({ name: "", subject: "Mathematics", description: "", curriculum_type: "general" });
  const [creating, setCreating] = useState(false);
  const [dueList, setDueList] = useState<Due[]>([]);
  const [teachers, setTeachers] = useState<Record<string, string>>({});

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const fetchClasses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let list: ClassItem[] = [];
      if (isTeacher) {
        const { data, error } = await supabase.from("classes").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false });
        if (error) throw error;
        list = await Promise.all(
          (data || []).map(async (cls) => {
            const { count } = await supabase.from("class_members").select("*", { count: "exact", head: true }).eq("class_id", cls.id);
            return { ...cls, memberCount: count || 0 } as ClassItem;
          }),
        );
      } else {
        const { data: memberships, error: memError } = await supabase.from("class_members").select("class_id").eq("student_id", user.id);
        if (memError) throw memError;
        if (memberships && memberships.length > 0) {
          const { data, error } = await supabase.from("classes").select("*").in("id", memberships.map((m) => m.class_id));
          if (error) throw error;
          list = (data || []) as ClassItem[];
        }
      }
      setClasses(list);

      // Students: what's due next in each class, and who teaches it
      if (!isTeacher && list.length) {
        const ids = list.map((c) => c.id);
        const [{ data: due }, { data: subs }, { data: contacts }] = await Promise.all([
          supabase.from("class_assignments").select("id, title, class_id, due_date").in("class_id", ids).gte("due_date", new Date().toISOString()).order("due_date", { ascending: true }),
          supabase.from("assignment_submissions").select("assignment_id").eq("student_id", user.id),
          supabase.rpc("get_user_contacts", { _user_id: user.id }),
        ]);
        const done = new Set((subs || []).map((s) => s.assignment_id));
        setDueList(((due || []) as Due[]).filter((d) => d.due_date && !done.has(d.id)));
        const names: Record<string, string> = {};
        for (const c of (contacts || []) as { user_id: string; full_name: string }[]) names[c.user_id] = c.full_name;
        setTeachers(names);
      }
    } catch (err) {
      console.error("Error fetching classes:", err);
      toast.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreate = async () => {
    if (!newClass.name.trim()) {
      toast.error("Please enter a class name");
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from("classes").insert({
        name: newClass.name.trim(),
        subject: newClass.subject,
        description: newClass.description.trim(),
        teacher_id: user!.id,
        curriculum_type: newClass.curriculum_type,
      });
      if (error) throw error;
      toast.success("Class created!");
      setCreateOpen(false);
      setNewClass({ name: "", subject: "Mathematics", description: "", curriculum_type: "general" });
      fetchClasses();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create class");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a class code");
      return;
    }
    setJoining(true);
    try {
      const { data: cls, error: clsError } = await supabase.from("classes").select("id, name").eq("join_code", joinCode.trim().toLowerCase()).maybeSingle();
      if (clsError) throw clsError;
      if (!cls) {
        toast.error("Invalid class code. Please check and try again.");
        return;
      }
      const { error: joinError } = await supabase.from("class_members").insert({ class_id: cls.id, student_id: user!.id });
      if (joinError) {
        if (joinError.code === "23505") toast.info("You are already in this class");
        else throw joinError;
      } else {
        toast.success(`Joined "${cls.name}" successfully!`);
        setJoinCode("");
        fetchClasses();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to join class");
    } finally {
      setJoining(false);
    }
  };

  const handleDelete = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;
    try {
      const { error } = await supabase.from("classes").delete().eq("id", classId);
      if (error) throw error;
      toast.success("Class deleted");
      fetchClasses();
    } catch {
      toast.error("Failed to delete class");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Join code copied!");
  };

  const nextFor = useMemo(() => {
    const map = new Map<string, Due>();
    for (const d of dueList) if (!map.has(d.class_id)) map.set(d.class_id, d);
    return map;
  }, [dueList]);
  const weekDue = dueList.filter((d) => differenceInCalendarDays(new Date(d.due_date), new Date()) <= 7);

  const joinPanel = (
    <div className="rounded-3xl border border-lp-blue/30 bg-gradient-to-br from-lp-blue/[0.12] via-lp-surface to-lp-surface p-5">
      <p className="flex items-center gap-2 text-[14px] font-medium text-white">
        <KeyRound className="h-4 w-4 text-lp-cyan" /> Join a class
      </p>
      <p className="mt-1 text-[12.5px] text-lp-mute">Enter the 6-character code from your teacher.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <CodeInput value={joinCode} onChange={setJoinCode} onSubmit={handleJoin} disabled={joining} />
        <button type="button" onClick={handleJoin} disabled={joining || joinCode.length < 6} className={cn(primaryBtn, "h-12 sm:h-14")}>
          {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Join
        </button>
      </div>
    </div>
  );

  return (
    <StudyShell>
      <header className="lp-fade flex flex-wrap items-end justify-between gap-4" style={{ animationFillMode: "both" }}>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">{isTeacher ? "Teaching" : "Learning"}</p>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[34px]">Classes</h1>
          <p className="mt-1.5 max-w-[560px] text-[14.5px] text-lp-soft">
            {isTeacher ? "Create classes, share join codes and manage your students." : "Your classes, what's due next, and a quick way to join a new one."}
          </p>
        </div>
        {isTeacher ? (
          <button type="button" onClick={() => setCreateOpen(true)} className={primaryBtn}>
            <Plus className="h-4 w-4" /> Create class
          </button>
        ) : (
          classes.length > 0 && (
            <div className="flex gap-2">
              <span className={cn(chip, "px-3 py-1 text-[12.5px]")}>
                <School className="h-3.5 w-3.5 text-lp-sky" /> {classes.length} class{classes.length === 1 ? "" : "es"}
              </span>
              <span className={cn(chip, "px-3 py-1 text-[12.5px]")}>
                <CalendarClock className="h-3.5 w-3.5 text-lp-sky" /> {weekDue.length} due this week
              </span>
            </div>
          )
        )}
      </header>

      {!isTeacher && classes.length > 0 && <div className="lp-fade mt-6" style={{ animationDelay: "60ms", animationFillMode: "both" }}>{joinPanel}</div>}

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="lp-skeleton h-[280px] rounded-3xl" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          isTeacher ? (
            <div className="rounded-3xl border border-dashed border-lp-line">
              <EmptyState
                icon={School}
                title="No classes yet"
                body="Create your first class and share its join code with your students."
                action={
                  <button type="button" onClick={() => setCreateOpen(true)} className={primaryBtn}>
                    <Plus className="h-4 w-4" /> Create class
                  </button>
                }
              />
            </div>
          ) : (
            <div className="mx-auto max-w-[560px]">
              <div className="mb-5 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-lp-line bg-lp-raised text-lp-sky">
                  <School className="h-5 w-5" />
                </span>
                <p className="mt-4 text-[17px] font-semibold text-white">You haven't joined a class yet</p>
                <p className="mt-1 text-[13.5px] text-lp-mute">Your teacher will give you a join code. Enter it below to see assignments, resources and live quizzes.</p>
              </div>
              {joinPanel}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls, i) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                teacherName={teachers[cls.teacher_id]}
                next={nextFor.get(cls.id)}
                pending={dueList.filter((d) => d.class_id === cls.id).length}
                isTeacher={isTeacher}
                onCopy={() => copyCode(cls.join_code)}
                onDelete={() => handleDelete(cls.id)}
                delay={80 + i * 50}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create a class"
        description="Students join with the code we generate for you."
        footer={
          <>
            <button type="button" onClick={() => setCreateOpen(false)} className={ghostBtn}>
              Cancel
            </button>
            <button type="button" onClick={handleCreate} disabled={creating || !newClass.name.trim()} className={primaryBtn}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create class
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Class name">
            <input className={inputCls} placeholder="e.g. MYP 5 Biology" value={newClass.name} onChange={(e) => setNewClass((p) => ({ ...p, name: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Subject">
              <select className={inputCls} value={newClass.subject} onChange={(e) => setNewClass((p) => ({ ...p, subject: e.target.value }))}>
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Curriculum">
              <select className={inputCls} value={newClass.curriculum_type} onChange={(e) => setNewClass((p) => ({ ...p, curriculum_type: e.target.value }))}>
                <option value="general">General</option>
                <option value="ib">IB (International Baccalaureate)</option>
                <option value="ap">AP (Advanced Placement)</option>
                <option value="igcse">IGCSE (Cambridge)</option>
                <option value="cbse">CBSE</option>
                <option value="a_levels">A-Levels</option>
                <option value="custom">Custom</option>
              </select>
            </Field>
          </div>
          <Field label="Description (optional)">
            <textarea className={cn(inputCls, "min-h-[88px]")} placeholder="What this class covers" value={newClass.description} onChange={(e) => setNewClass((p) => ({ ...p, description: e.target.value }))} />
          </Field>
        </div>
      </Modal>

    </StudyShell>
  );
};

export default ClassesPage;
