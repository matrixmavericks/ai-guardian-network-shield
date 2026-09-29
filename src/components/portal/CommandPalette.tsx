import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, CornerDownLeft, FileText, GraduationCap, Moon, Search, Sparkles, Sun, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/lib/portalAppearance";
import { SUBJECTS } from "@/content/myp";
import { useTeacherData } from "@/components/teacher/data";

export type PaletteNav = { title: string; href: string; icon: React.ElementType; group: string };

type Item = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ElementType;
  keywords?: string;
  run: () => void;
};

const score = (item: Item, q: string) => {
  if (!q) return 1;
  const hay = `${item.label} ${item.hint ?? ""} ${item.keywords ?? ""}`.toLowerCase();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.every((w) => hay.includes(w))) return 0;
  const label = item.label.toLowerCase();
  return label.startsWith(q.toLowerCase()) ? 3 : label.includes(q.toLowerCase()) ? 2 : 1;
};

/** Teacher-only sources: classes, students and assignments from the shared teacher data. */
const useTeacherItems = (enabled: boolean, go: (to: string) => void): Item[] => {
  const { data } = useTeacherData(enabled);
  return useMemo(() => {
    if (!enabled) return [];
    const out: Item[] = [];
    for (const c of data.classes)
      out.push({ id: `c-${c.id}`, group: "Classes", label: c.name, hint: c.subject, icon: Users, keywords: c.join_code, run: () => go(`/class/${c.id}`) });
    const seen = new Set<string>();
    for (const m of data.members) {
      if (seen.has(m.student_id)) continue;
      seen.add(m.student_id);
      const s = data.students[m.student_id];
      if (!s) continue;
      const cls = data.members.filter((x) => x.student_id === s.id).map((x) => data.classes.find((c) => c.id === x.class_id)?.name).filter(Boolean);
      out.push({ id: `s-${s.id}`, group: "Students", label: s.name, hint: cls.join(", "), icon: User, keywords: s.email ?? "", run: () => go(`/grades?student=${s.id}`) });
    }
    for (const a of data.assignments) {
      const cls = data.classes.find((c) => c.id === a.class_id);
      out.push({ id: `a-${a.id}`, group: "Assignments", label: a.title, hint: cls?.name, icon: FileText, run: () => go(`/marking?assignment=${a.id}`) });
    }
    return out;
  }, [enabled, data, go]);
};

/**
 * ⌘K / Ctrl+K anywhere in the portal: jump to pages, classes, students and
 * assignments, run quick actions, or hand the question straight to Refyn.
 */
const CommandPalette: React.FC<{ nav: PaletteNav[]; role: "student" | "teacher"; open: boolean; onOpenChange: (v: boolean) => void }> = ({
  nav,
  role,
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { mode, toggle } = useAppearance();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  const go = useMemo(
    () => (to: string) => {
      onOpenChange(false);
      navigate(to);
    },
    [navigate, onOpenChange],
  );

  const teacherItems = useTeacherItems(open && role === "teacher", go);

  const items = useMemo<Item[]>(() => {
    const base: Item[] = nav.map((n) => ({ id: `n-${n.href}`, group: "Go to", label: n.title, hint: n.group, icon: n.icon, run: () => go(n.href) }));
    const actions: Item[] =
      role === "teacher"
        ? [
            { id: "x-mark", group: "Actions", label: "Mark the next submission", icon: CornerDownLeft, keywords: "grade marking queue", run: () => go("/marking") },
            { id: "x-class", group: "Actions", label: "Create a class", icon: Users, keywords: "new class join code", run: () => go("/classes?new=1") },
            { id: "x-brief", group: "Actions", label: "Draft parent emails", icon: Sparkles, keywords: "parent brief weekly", run: () => go("/intel/parent-brief") },
            { id: "x-diff", group: "Actions", label: "Differentiate a lesson", icon: Sparkles, keywords: "iep scaffold support stretch", run: () => go("/intel/auto-iep") },
            { id: "x-plan", group: "Actions", label: "Plan a unit with Refyn", icon: Sparkles, keywords: "lesson plan unit planner", run: () => go("/teacher-plan-generator") },
          ]
        : [
            ...SUBJECTS.map((s) => ({ id: `sub-${s.slug}`, group: "Subjects", label: s.name, hint: s.group, icon: GraduationCap, run: () => go(`/subjects/${s.slug}`) })),
            ...SUBJECTS.map((s) => ({ id: `qb-${s.slug}`, group: "Practice", label: `${s.name} questionbank`, icon: BookOpen, keywords: "practice questions quiz", run: () => go(`/subjects/${s.slug}/questionbank`) })),
          ];
    const theme: Item = {
      id: "x-theme",
      group: "Actions",
      label: mode === "light" ? "Switch to dark mode" : "Switch to light mode",
      icon: mode === "light" ? Moon : Sun,
      keywords: "theme appearance light dark",
      run: () => {
        toggle();
        onOpenChange(false);
      },
    };
    return [...base, ...actions, theme, ...teacherItems];
  }, [nav, role, go, mode, toggle, onOpenChange, teacherItems]);

  const results = useMemo(() => {
    const scored = items
      .map((it) => ({ it, s: score(it, q.trim()) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    const limited = q.trim() ? scored.slice(0, 40) : scored.filter((x) => ["Go to", "Actions"].includes(x.it.group));
    const list = limited.map((x) => x.it);
    if (q.trim())
      list.push({
        id: "ask",
        group: "Ask Refyn",
        label: `Ask Refyn: “${q.trim()}”`,
        icon: Sparkles,
        run: () => go(`/ai-learning-assistant?prompt=${encodeURIComponent(q.trim())}`),
      });
    return list;
  }, [items, q, go]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[active]?.run();
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  let lastGroup = "";
  return createPortal(
    <div className="lp-app fixed inset-0 z-[80] flex items-start justify-center bg-lp-deep/70 px-4 pt-[12vh] font-ui backdrop-blur-sm" onMouseDown={() => onOpenChange(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search and jump"
        onMouseDown={(e) => e.stopPropagation()}
        className="lp-pop lp-fade w-full max-w-[620px] overflow-hidden rounded-3xl border border-lp-line bg-lp-surface shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-center gap-3 border-b border-lp-line px-5">
          <Search className="h-4 w-4 shrink-0 text-lp-mute" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={role === "teacher" ? "Search classes, students, assignments or ask Refyn…" : "Search pages, subjects or ask Refyn…"}
            className="h-14 w-full bg-transparent text-[15px] text-white placeholder:text-lp-mute focus:outline-none"
            aria-label="Search"
          />
          <kbd className="hidden shrink-0 rounded-md border border-lp-line px-1.5 py-0.5 text-[10.5px] text-lp-mute sm:block">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[56vh] overflow-y-auto p-2" role="listbox">
          {results.length === 0 && <p className="px-4 py-8 text-center text-[13.5px] text-lp-mute">Nothing matches that yet.</p>}
          {results.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            const Icon = it.icon;
            return (
              <div key={it.id}>
                {header && <p className="px-3 pb-1.5 pt-3 text-[10.5px] font-medium uppercase tracking-[0.18em] text-lp-mute">{header}</p>}
                <button
                  type="button"
                  data-idx={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => it.run()}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    i === active ? "bg-lp-blue/15 text-white" : "text-lp-soft",
                  )}
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", i === active ? "border-lp-sky/40 text-lp-sky" : "border-lp-line text-lp-mute")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px]">{it.label}</span>
                    {it.hint && <span className="block truncate text-[12px] text-lp-mute">{it.hint}</span>}
                  </span>
                  {i === active && <ArrowRight className="h-4 w-4 shrink-0 text-lp-sky" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 border-t border-lp-line px-5 py-2.5 text-[11.5px] text-lp-mute">
          <span><kbd className="font-sans">↑↓</kbd> to move</span>
          <span><kbd className="font-sans">Enter</kbd> to open</span>
          <span className="ml-auto hidden sm:block">Type anything and Refyn can answer it</span>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CommandPalette;
