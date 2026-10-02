import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Clock,
  CornerDownLeft,
  FileText,
  FlaskConical,
  GraduationCap,
  Image as ImageIcon,
  Moon,
  Pause,
  Play,
  Search,
  Sparkles,
  Sun,
  Timer,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/lib/portalAppearance";
import { SUBJECTS } from "@/content/myp";
import { useTeacherData } from "@/components/teacher/data";
import { SIMS, SUBJECTS as SIM_SUBJECTS } from "@/components/sims/registry";
import { SimThumb } from "@/components/sims/SimCards";
import { SCENES } from "@/components/focus/scenes";
import { SceneStill } from "@/components/focus/Ambient";
import { clock, focus, useFocus } from "@/components/focus/store";
import { calc } from "./calc";

export type PaletteNav = { title: string; href: string; icon: React.ElementType; group: string };

type Item = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ElementType;
  keywords?: string;
  /** Colour for the icon tile */
  accent?: string;
  /** What the side panel shows while this item is highlighted */
  preview?: () => React.ReactNode;
  run: () => void;
};

const RECENT_KEY = "refyn-palette-recent";
const readRecent = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
};
const pushRecent = (id: string) => {
  if (id === "ask" || id === "calc") return;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, 6)));
  } catch {
    /* storage unavailable */
  }
};

const score = (item: Item, q: string) => {
  if (!q) return 1;
  const hay = `${item.label} ${item.hint ?? ""} ${item.keywords ?? ""}`.toLowerCase();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.every((w) => hay.includes(w))) return 0;
  const label = item.label.toLowerCase();
  const lq = q.toLowerCase();
  const base = label.startsWith(lq) ? 3 : label.includes(lq) ? 2 : 1;
  // Pages and actions first when scores tie
  return base + (item.group === "Go to" || item.group === "Actions" ? 0.5 : 0);
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

const PreviewFrame: React.FC<{ children: React.ReactNode; title: string; body?: React.ReactNode; tag?: React.ReactNode }> = ({ children, title, body, tag }) => (
  <div className="lp-fade">
    <div className="relative h-[150px] overflow-hidden rounded-2xl border border-lp-line bg-lp-deep">{children}</div>
    {tag && <div className="mt-3">{tag}</div>}
    <p className="mt-2 text-[15px] font-semibold leading-snug text-white">{title}</p>
    {body && <div className="mt-1.5 text-[12.5px] leading-relaxed text-lp-soft">{body}</div>}
  </div>
);

/**
 * ⌘K / Ctrl+K anywhere in the portal: jump to pages, topics, simulations,
 * classes, students and assignments, run quick actions, start a focus
 * session, do a quick sum, or hand the question straight to Refyn.
 */
const CommandPalette: React.FC<{ nav: PaletteNav[]; role: "student" | "teacher"; open: boolean; onOpenChange: (v: boolean) => void }> = ({
  nav,
  role,
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { mode, toggle } = useAppearance();
  const fs = useFocus();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
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
    setRecent(readRecent());
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
  const live = fs.status === "running" || fs.status === "paused";

  const items = useMemo<Item[]>(() => {
    const base: Item[] = nav.map((n) => ({ id: `n-${n.href}`, group: "Go to", label: n.title, hint: n.group, icon: n.icon, run: () => go(n.href) }));
    const focusItems: Item[] = [
      live
        ? {
            id: "x-focus-toggle",
            group: "Actions",
            label: fs.status === "running" ? "Pause the focus timer" : "Resume the focus timer",
            hint: `${clock(fs.status === "running" ? fs.endsAt - Date.now() : fs.left)} left`,
            icon: fs.status === "running" ? Pause : Play,
            keywords: "focus timer pomodoro pause resume",
            run: () => {
              focus.toggle();
              onOpenChange(false);
            },
          }
        : {
            id: "x-focus",
            group: "Actions",
            label: role === "teacher" ? "Start a class timer" : "Start a focus session",
            hint: "Timer, calm scenes and ambient sound",
            icon: Timer,
            keywords: "focus pomodoro timer study concentrate deep work room ambient sound class timer",
            preview: () => (
              <PreviewFrame title="Focus room" body="A timer with living scenes and ambient sound. It keeps running while you use the rest of Refyn.">
                <SceneStill make={SCENES.find((s) => s.id === fs.scene)?.make ?? SCENES[0].make} />
              </PreviewFrame>
            ),
            run: () => {
              focus.start();
              go("/focus");
            },
          },
      ...(role === "teacher"
        ? [5, 10, 15].map<Item>((m) => ({
            id: `x-ct-${m}`,
            group: "Actions",
            label: `Class timer: ${m} minutes`,
            icon: Clock,
            keywords: "countdown activity timer present",
            run: () => {
              focus.setPlan(`t${m}`);
              focus.start();
              go("/focus");
            },
          }))
        : []),
    ];
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
            ...SUBJECTS.map((s) => ({ id: `sub-${s.slug}`, group: "Subjects", label: s.name, hint: s.group, icon: GraduationCap, accent: s.theme.accent, run: () => go(`/subjects/${s.slug}`) })),
            ...SUBJECTS.map((s) => ({ id: `qb-${s.slug}`, group: "Practice", label: `${s.name} questionbank`, icon: BookOpen, accent: s.theme.accent, keywords: "practice questions quiz", run: () => go(`/subjects/${s.slug}/questionbank`) })),
          ];
    const topics: Item[] = SUBJECTS.flatMap((s) =>
      s.units.flatMap((u) =>
        u.topics.map((t) => ({
          id: `t-${t.id}`,
          group: "Topics",
          label: t.title,
          hint: `${s.name} · ${u.title}`,
          icon: BookOpen,
          accent: s.theme.accent,
          keywords: t.keyTerms.map((k) => k.term).join(" "),
          preview: () => (
            <PreviewFrame
              title={t.title}
              tag={<span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: s.theme.accent }}>{s.name}</span>}
              body={<p className="line-clamp-5">{t.summary}</p>}
            >
              <div className="absolute inset-0" style={{ background: s.theme.gradient }} />
              <div className="absolute inset-0 flex items-end p-4">
                <div className="flex flex-wrap gap-1.5">
                  {t.keyTerms.slice(0, 4).map((k) => (
                    <span key={k.term} className="rounded-full bg-black/35 px-2 py-0.5 text-[11px] text-[#ffffff] backdrop-blur">{k.term}</span>
                  ))}
                </div>
              </div>
            </PreviewFrame>
          ),
          run: () => go(`/subjects/${s.slug}/topic/${t.id}`),
        })),
      ),
    );
    const sims: Item[] = SIMS.map((sim) => ({
      id: `sim-${sim.id}`,
      group: "Simulations",
      label: sim.title,
      hint: `${SIM_SUBJECTS[sim.subject].name} · ${sim.tagline}`,
      icon: FlaskConical,
      accent: SIM_SUBJECTS[sim.subject].color,
      keywords: `simulation sim interactive ${sim.levels.join(" ")}`,
      preview: () => (
        <PreviewFrame
          title={sim.title}
          tag={<span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: SIM_SUBJECTS[sim.subject].color }}>{SIM_SUBJECTS[sim.subject].name} simulation</span>}
          body={sim.tagline}
        >
          <SimThumb meta={sim} />
        </PreviewFrame>
      ),
      run: () => go(`/sims/${sim.id}`),
    }));
    const scenes: Item[] = SCENES.map((sc) => ({
      id: `scene-${sc.id}`,
      group: "Focus scenes",
      label: `Focus with ${sc.name.toLowerCase()}`,
      hint: sc.mood,
      icon: ImageIcon,
      accent: sc.tint,
      keywords: `focus room scene ambient sound background ${sc.id}`,
      preview: () => (
        <PreviewFrame title={sc.name} body={sc.mood}>
          <SceneStill make={sc.make} />
        </PreviewFrame>
      ),
      run: () => {
        focus.setScene(sc.id);
        go("/focus");
      },
    }));
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
    return [...base, ...focusItems, ...actions, theme, ...teacherItems, ...sims, ...topics, ...scenes];
  }, [nav, role, go, mode, toggle, onOpenChange, teacherItems, live, fs.status, fs.scene, fs.endsAt, fs.left]);

  const results = useMemo(() => {
    const query = q.trim();
    const list: Item[] = [];
    const sum = calc(query);
    if (sum)
      list.push({
        id: "calc",
        group: "Calculator",
        label: `= ${sum.text}`,
        hint: `${query}${sum.degrees ? " · angles in degrees" : ""} · Enter to copy`,
        icon: Calculator,
        preview: () => (
          <div className="lp-fade">
            <p className="text-[12px] text-lp-mute">{query} =</p>
            <p className="mt-1 break-all text-[34px] font-semibold leading-tight tracking-[-0.02em] text-white tabular-nums">{sum.text}</p>
            {sum.degrees && <p className="mt-2 text-[12px] text-lp-mute">Angles are in degrees.</p>}
          </div>
        ),
        run: () => {
          navigator.clipboard?.writeText(String(Number(sum.value.toPrecision(12)))).then(
            () => toast.success(`Copied ${sum.text}`),
            () => undefined,
          );
          onOpenChange(false);
        },
      });
    if (!query) {
      const byId = new Map(items.map((it) => [it.id, it]));
      const rec = recent.map((id) => byId.get(id)).filter((x): x is Item => !!x).map((it) => ({ ...it, group: "Recent" }));
      const shown = new Set(rec.map((r) => r.id));
      list.push(...rec, ...items.filter((it) => ["Go to", "Actions"].includes(it.group) && !shown.has(it.id)));
      return list;
    }
    const scored = items
      .map((it) => ({ it, s: score(it, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40);
    // Keep each group together, in the order its best match appears
    const order: string[] = [];
    for (const x of scored) if (!order.includes(x.it.group)) order.push(x.it.group);
    for (const g of order) list.push(...scored.filter((x) => x.it.group === g).map((x) => x.it));
    list.push({
      id: "ask",
      group: "Ask Refyn",
      label: `Ask Refyn: “${query}”`,
      icon: Sparkles,
      run: () => go(`/ai-learning-assistant?prompt=${encodeURIComponent(query)}`),
    });
    return list;
  }, [items, q, go, recent, onOpenChange]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const run = (it: Item) => {
    pushRecent(it.id);
    it.run();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) run(results[active]);
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  const current = results[active];
  const CurrentIcon = current?.icon;
  let lastGroup = "";
  return createPortal(
    <div className="lp-app fixed inset-0 z-[80] flex items-start justify-center bg-lp-deep/70 px-4 pt-[10vh] font-ui backdrop-blur-sm" onMouseDown={() => onOpenChange(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search and jump"
        onMouseDown={(e) => e.stopPropagation()}
        className="lp-pop lp-fade w-full max-w-[880px] overflow-hidden rounded-3xl border border-lp-line bg-lp-surface shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-center gap-3 border-b border-lp-line px-5">
          <Search className="h-4 w-4 shrink-0 text-lp-mute" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={role === "teacher" ? "Search classes, students, topics, simulations, or ask Refyn…" : "Search topics, simulations, pages, do a sum, or ask Refyn…"}
            className="h-14 w-full bg-transparent text-[15px] text-white placeholder:text-lp-mute focus:outline-none"
            aria-label="Search"
            aria-activedescendant={current ? `cp-${active}` : undefined}
            aria-controls="cp-list"
          />
          <kbd className="hidden shrink-0 rounded-md border border-lp-line px-1.5 py-0.5 text-[10.5px] text-lp-mute sm:block">Esc</kbd>
        </div>
        <div className="grid md:grid-cols-[minmax(0,1fr)_300px]">
          <div ref={listRef} id="cp-list" className="max-h-[58vh] overflow-y-auto p-2" role="listbox">
            {results.length === 0 && <p className="px-4 py-8 text-center text-[13.5px] text-lp-mute">Nothing matches that yet.</p>}
            {results.map((it, i) => {
              const header = it.group !== lastGroup ? it.group : null;
              lastGroup = it.group;
              const Icon = it.icon;
              const on = i === active;
              return (
                <div key={`${it.group}-${it.id}`}>
                  {header && <p className="px-3 pb-1.5 pt-3 text-[10.5px] font-medium uppercase tracking-[0.18em] text-lp-mute">{header}</p>}
                  <button
                    type="button"
                    id={`cp-${i}`}
                    data-idx={i}
                    role="option"
                    aria-selected={on}
                    onMouseMove={() => setActive(i)}
                    onClick={() => run(it)}
                    className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", on ? "bg-lp-blue/15 text-white" : "text-lp-soft")}
                  >
                    <span
                      className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", on ? "border-lp-sky/40 text-lp-sky" : "border-lp-line text-lp-mute")}
                      style={it.accent ? { color: it.accent, borderColor: `${it.accent}55`, background: on ? `${it.accent}1f` : undefined } : undefined}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[14px]", it.id === "calc" && "text-[17px] font-semibold tabular-nums text-white")}>{it.label}</span>
                      {it.hint && <span className="block truncate text-[12px] text-lp-mute">{it.hint}</span>}
                    </span>
                    {on && <ArrowRight className="h-4 w-4 shrink-0 text-lp-sky" />}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="hidden border-l border-lp-line bg-lp-deep/40 p-4 md:block" aria-hidden>
            {current?.preview ? (
              <div key={current.id}>{current.preview()}</div>
            ) : current && CurrentIcon ? (
              <div key={current.id} className="lp-fade flex h-full flex-col justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-lp-line bg-lp-surface text-lp-sky" style={current.accent ? { color: current.accent } : undefined}>
                  <CurrentIcon className="h-6 w-6" />
                </span>
                <p className="mt-4 text-[15px] font-semibold text-white">{current.label}</p>
                {current.hint && <p className="mt-1 text-[12.5px] leading-relaxed text-lp-soft">{current.hint}</p>}
                <p className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-lp-mute">
                  <CornerDownLeft className="h-3.5 w-3.5" /> Enter to open
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-4 border-t border-lp-line px-5 py-2.5 text-[11.5px] text-lp-mute">
          <span>
            <kbd className="font-sans">↑↓</kbd> to move
          </span>
          <span>
            <kbd className="font-sans">Enter</kbd> to open
          </span>
          <span className="ml-auto hidden sm:block">Try “projectile”, “quadratics” or “12*(3+4)”</span>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CommandPalette;
