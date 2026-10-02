import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Expand,
  Flame,
  Image as ImageIcon,
  ListTodo,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Shrink,
  SkipForward,
  Sparkles,
  Timer,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Ambient, SceneStill } from "@/components/focus/Ambient";
import { SCENES, sceneById, type SceneId } from "@/components/focus/scenes";
import { SOUNDS } from "@/components/focus/sound";
import { PLANS, TIMERS, clock, focus, planOf, todayStats, useFocus, useLeft, weekMinutes, type FocusState } from "@/components/focus/store";
import { streak, today, useStudy, type TaskKind } from "@/components/subjects/store";
import { SUBJECTS, findTopic } from "@/content/myp";

const KIND: Record<TaskKind, string> = { guide: "Read the guide", practice: "Practice questions", flashcards: "Flashcards", mistakes: "Go over mistakes", exam: "Mock exam" };

type Panel = null | "scenes" | "sound" | "timer";

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

/** The progress ring around the clock, with a glowing head. */
const Ring: React.FC<{ p: number; tint: string; dim?: boolean }> = ({ p, tint, dim }) => {
  const r = 47, c = 2 * Math.PI * r;
  const a = -Math.PI / 2 + p * 2 * Math.PI;
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
      {p > 0.002 && <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={tint}
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeDasharray={`${c * p} ${c}`}
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dasharray 0.3s linear", filter: `drop-shadow(0 0 1.2px ${tint})`, opacity: dim ? 0.5 : 1 }}
      />}
      {p > 0.002 && <circle cx={50 + r * Math.cos(a)} cy={50 + r * Math.sin(a)} r="1.5" fill="#ffffff" style={{ filter: `drop-shadow(0 0 2.5px ${tint})` }} />}
    </svg>
  );
};

const IconBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }> = ({ label, active, className, children, ...rest }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    {...rest}
    className={cn(
      "inline-flex h-10 items-center justify-center gap-2 rounded-full px-3 text-[13px] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60",
      active && "bg-white/15 text-white",
      className,
    )}
  >
    {children}
  </button>
);

const ScenePicker: React.FC<{ s: FocusState }> = ({ s }) => (
  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
    {SCENES.map((sc, i) => (
      <button
        key={sc.id}
        type="button"
        onClick={() => focus.setScene(sc.id)}
        className={cn("group relative overflow-hidden rounded-2xl text-left ring-1 ring-white/10 transition-[transform,box-shadow] hover:-translate-y-0.5", s.scene === sc.id && "ring-2")}
        style={s.scene === sc.id ? { boxShadow: `0 0 0 2px ${sc.tint}` } : undefined}
        aria-pressed={s.scene === sc.id}
      >
        <div className="h-[84px] w-[min(150px,40vw)]">
          <SceneStill make={sc.make} />
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2 pt-6">
          <p className="text-[12.5px] font-semibold text-white">{sc.name}</p>
        </div>
        <span className="absolute right-2 top-2 rounded-md bg-black/45 px-1.5 text-[10.5px] font-medium text-white/80">{i + 1}</span>
      </button>
    ))}
  </div>
);

const SoundMixer: React.FC<{ s: FocusState; tint: string }> = ({ s, tint }) => (
  <div className="w-[min(320px,86vw)]">
    <div className="mb-3 flex items-center justify-between">
      <p className="text-[13px] font-semibold text-white">Sound</p>
      <button
        type="button"
        onClick={() => focus.toggleSound()}
        className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors", s.soundOn ? "bg-white text-[#0b1226]" : "bg-white/10 text-white hover:bg-white/15")}
      >
        {s.soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        {s.soundOn ? "On" : "Off"}
      </button>
    </div>
    <div className="space-y-1.5">
      {SOUNDS.map((x) => {
        const v = Math.round((s.mix[x.id] ?? 0) * 100);
        return (
          <label key={x.id} className="grid grid-cols-[92px_1fr_32px] items-center gap-3 text-[12.5px] text-white/80">
            <span>{x.name}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={v}
              onChange={(e) => focus.setLevel(x.id, Number(e.target.value) / 100)}
              className="fx-range w-full"
              style={{ ["--c" as string]: tint, ["--p" as string]: `${v}%` }}
              aria-label={`${x.name} volume`}
            />
            <span className="text-right tabular-nums text-white/50">{v}</span>
          </label>
        );
      })}
    </div>
    <p className="mt-3 text-[11.5px] leading-snug text-white/45">Every sound is made live in your browser, so nothing downloads.</p>
  </div>
);

const TimerPicker: React.FC<{ s: FocusState; teacher: boolean; onDone: () => void }> = ({ s, teacher, onDone }) => {
  const [custom, setCustom] = useState("");
  const pick = (id: string) => {
    focus.setPlan(id);
    onDone();
  };
  const cycles = (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Study cycles</p>
      <div className="grid gap-1.5">
        {PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => pick(p.id)}
            className={cn("flex items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] transition-colors hover:bg-white/10", s.plan === p.id ? "bg-white/15 text-white" : "text-white/80")}
          >
            <span className="font-medium">{p.label}</span>
            <span className="tabular-nums text-white/55">
              {p.focus} min focus · {p.brk} min break
            </span>
          </button>
        ))}
      </div>
    </div>
  );
  const singles = (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">{teacher ? "Class timers" : "Single timer"}</p>
      <div className="flex flex-wrap gap-1.5">
        {TIMERS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => pick(`t${m}`)}
            className={cn("h-9 min-w-[52px] rounded-xl px-3 text-[13px] font-medium tabular-nums transition-colors hover:bg-white/15", s.plan === `t${m}` ? "bg-white text-[#0b1226]" : "bg-white/10 text-white")}
          >
            {m}m
          </button>
        ))}
      </div>
      <form
        className="mt-2.5 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const m = Math.round(Number(custom));
          if (m >= 1 && m <= 240) pick(`t${m}`);
        }}
      >
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 3))}
          inputMode="numeric"
          placeholder="Any minutes"
          aria-label="Custom minutes"
          className="h-9 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-[13px] text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
        />
        <button type="submit" className="h-9 shrink-0 rounded-xl bg-white/15 px-3 text-[13px] font-medium text-white hover:bg-white/25">
          Set
        </button>
      </form>
    </div>
  );
  return (
    <div className="grid w-[min(340px,86vw)] gap-4">
      {teacher ? singles : cycles}
      {teacher ? cycles : singles}
    </div>
  );
};

const Side: React.FC<{ s: FocusState; teacher: boolean; tint: string; onClose: () => void }> = ({ s, teacher, tint, onClose }) => {
  const { state } = useStudy();
  const [text, setText] = useState("");
  const stats = todayStats(s);
  const week = weekMinutes(s);
  const max = Math.max(30, ...week.map((d) => d.minutes));
  const days = streak(state);
  const suggestions = useMemo(() => {
    if (teacher) return [];
    const d = today();
    const out: string[] = [];
    for (const [slug, plan] of Object.entries(state.plans)) {
      const subject = SUBJECTS.find((x) => x.slug === slug);
      const day = plan.days.find((x) => x.date === d);
      if (!subject || !day) continue;
      for (const t of day.tasks) {
        if (t.done) continue;
        const topic = t.topicId ? findTopic(subject, t.topicId)?.topic : undefined;
        out.push(`${subject.name}: ${KIND[t.kind]}${topic ? ` (${topic.title})` : ""}`);
      }
    }
    return out.filter((x) => !s.tasks.some((t) => t.text === x)).slice(0, 4);
  }, [teacher, state.plans, s.tasks]);

  return (
    <aside className="fx-glass-strong fx-up flex h-full w-[min(360px,92vw)] flex-col overflow-hidden rounded-3xl text-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <p className="text-[15px] font-semibold">Today</p>
        <IconBtn label="Close" onClick={onClose} className="h-8 w-8 px-0">
          <X className="h-4 w-4" />
        </IconBtn>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-5 pb-5">
        <div className="grid grid-cols-3 gap-2">
          {[
            { k: "Focused", v: `${stats.minutes}`, u: "min" },
            { k: "Sessions", v: `${stats.sessions}`, u: "" },
            { k: "Streak", v: `${days}`, u: days === 1 ? "day" : "days" },
          ].map((x) => (
            <div key={x.k} className="rounded-2xl bg-white/[0.06] px-3 py-2.5">
              <p className="text-[11px] text-white/55">{x.k}</p>
              <p className="mt-0.5 text-[20px] font-semibold tabular-nums leading-none">
                {x.v}
                {x.u && <span className="ml-1 text-[11.5px] font-normal text-white/55">{x.u}</span>}
              </p>
            </div>
          ))}
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">This week</p>
          <div className="flex h-[72px] gap-2" role="img" aria-label={`Focus minutes for the last 7 days: ${week.map((d) => d.minutes).join(", ")}`}>
            {week.map((d) => {
              const isToday = d.day === today();
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-md transition-[height] duration-700"
                      style={{ height: `${Math.max(4, (d.minutes / max) * 100)}%`, background: isToday ? tint : "rgba(255,255,255,0.22)" }}
                      title={`${d.minutes} min`}
                    />
                  </div>
                  <span className={cn("text-[10.5px]", isToday ? "text-white" : "text-white/45")}>{new Date(`${d.day}T12:00`).toLocaleDateString(undefined, { weekday: "narrow" })}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">{teacher ? "Lesson steps" : "Tasks"}</p>
            {s.tasks.some((t) => t.done) && (
              <button type="button" onClick={focus.clearDone} className="text-[11.5px] text-white/55 hover:text-white">
                Clear done
              </button>
            )}
          </div>
          <ul className="space-y-1">
            {s.tasks.map((t) => (
              <li key={t.id} className="group flex items-start gap-2.5 rounded-xl px-2 py-1.5 hover:bg-white/[0.06]">
                <button
                  type="button"
                  onClick={() => focus.toggleTask(t.id)}
                  aria-label={t.done ? `Mark "${t.text}" not done` : `Mark "${t.text}" done`}
                  className={cn("mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors", t.done ? "border-transparent text-[#0b1226]" : "border-white/35 hover:border-white/70")}
                  style={t.done ? { background: tint } : undefined}
                >
                  {t.done && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>
                <span className={cn("min-w-0 flex-1 text-[13.5px] leading-snug", t.done && "text-white/45 line-through")}>{t.text}</span>
                <button type="button" onClick={() => focus.removeTask(t.id)} aria-label={`Remove "${t.text}"`} className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100">
                  <X className="h-3.5 w-3.5 text-white/50 hover:text-white" />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              focus.addTask(text);
              setText("");
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={teacher ? "Add a step, e.g. Pair discussion" : "Add a task"}
              aria-label="Add a task"
              className="h-9 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-[13px] text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
            <button type="submit" aria-label="Add" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25">
              <Plus className="h-4 w-4" />
            </button>
          </form>
          {suggestions.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[11.5px] text-white/50">From your study plan today</p>
              <div className="space-y-1">
                {suggestions.map((x) => (
                  <button key={x} type="button" onClick={() => focus.addTask(x)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[12.5px] text-white/75 hover:bg-white/[0.06] hover:text-white">
                    <Plus className="h-3.5 w-3.5 shrink-0" style={{ color: tint }} />
                    {x}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {!teacher && (
          <Link
            to={`/ai-learning-assistant${s.intent ? `?prompt=${encodeURIComponent(`I'm working on: ${s.intent}. Help me get unstuck without giving me the answer.`)}` : ""}`}
            className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3.5 transition-colors hover:bg-white/10"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: tint, color: "#0b1226" }}>
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-medium">Stuck? Ask Refyn</span>
              <span className="block text-[12px] text-white/55">Your timer keeps running while you ask.</span>
            </span>
          </Link>
        )}
      </div>
    </aside>
  );
};

const FocusPage: React.FC = () => {
  const s = useFocus();
  const left = useLeft(s);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const teacher = user?.role === "teacher" || user?.role === "admin";
  const plan = planOf(s.plan);
  const scene = sceneById(s.scene);
  const tint = scene.tint;
  const [panel, setPanel] = useState<Panel>(null);
  const [side, setSide] = useState(false);
  const [awake, setAwake] = useState(true);
  const [full, setFull] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Cross-fade between scenes
  const [layers, setLayers] = useState<{ id: SceneId; n: number }[]>([{ id: s.scene, n: 0 }]);
  useEffect(() => {
    setLayers((L) => (L[L.length - 1].id === s.scene ? L : [...L.slice(-1), { id: s.scene, n: L[L.length - 1].n + 1 }]));
  }, [s.scene]);
  useEffect(() => {
    if (layers.length < 2) return;
    const t = window.setTimeout(() => setLayers((L) => L.slice(-1)), 1300);
    return () => window.clearTimeout(t);
  }, [layers]);

  // Zen: the controls fade away while a session runs and nobody touches anything
  useEffect(() => {
    if (s.status !== "running" || panel || side) {
      setAwake(true);
      return;
    }
    let t = window.setTimeout(() => setAwake(false), 3500);
    const wake = () => {
      setAwake(true);
      window.clearTimeout(t);
      t = window.setTimeout(() => setAwake(false), 3500);
    };
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [s.status, panel, side]);

  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else root.current?.requestFullscreen?.().catch(() => undefined);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel(null);
        setSide(false);
        return;
      }
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (e.key === " ") {
        e.preventDefault();
        focus.toggle();
      } else if (k === "r") focus.reset();
      else if (k === "f") toggleFull();
      else if (k === "m") focus.toggleSound();
      else if (k === "t") setSide((v) => !v);
      else if (k === "s") focus.skip();
      else if (/^[1-6]$/.test(k)) focus.setScene(SCENES[Number(k) - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const progress = s.total > 0 ? 1 - left / s.total : 0;
  const time = clock(left);
  const label =
    s.status === "done"
      ? "Time's up"
      : s.phase === "break"
        ? "Break"
        : plan.kind === "single"
          ? teacher
            ? "Class timer"
            : "Timer"
          : `Focus · round ${s.round + 1}`;
  const zen = s.status === "running" && !awake;
  const stats = todayStats(s);
  // Back to where they came from in the app, or home if they opened the room directly
  const back = () => (location.key !== "default" ? navigate(-1) : navigate(teacher ? "/dashboard" : "/student-dashboard"));
  const toggle = (p: Exclude<Panel, null>) => setPanel((x) => (x === p ? null : p));

  return (
    <div ref={root} className={cn("fixed inset-0 z-[1] overflow-hidden bg-[#03060f] font-ui text-white antialiased", zen && "fx-zen")}>
      {layers.map((l) => (
        <div key={l.n} className="fx-in absolute inset-0">
          <Ambient make={sceneById(l.id).make} />
        </div>
      ))}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.28),rgba(0,0,0,0)_65%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />

      {/* Top bar */}
      <header className="fx-zen-hide absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
        <IconBtn label="Leave the Focus room" onClick={back} className="fx-glass pl-2.5 pr-3.5">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
        </IconBtn>
        <div className="hidden min-w-0 text-center md:block">
          <p className="truncate text-[13px] font-semibold text-white/90">{scene.name}</p>
          <p className="truncate text-[12px] text-white/55">{scene.mood}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="fx-glass hidden h-10 items-center gap-2 rounded-full px-3.5 text-[12.5px] text-white/80 sm:inline-flex" title="Focused today">
            <Flame className="h-3.5 w-3.5" style={{ color: tint }} />
            <span className="tabular-nums">{stats.minutes} min today</span>
          </span>
          <IconBtn label={side ? "Hide today" : "Show today"} active={side} onClick={() => setSide((v) => !v)} className="fx-glass w-10 px-0">
            <ListTodo className="h-4 w-4" />
          </IconBtn>
        </div>
      </header>

      {/* Clock */}
      <main className={cn("absolute inset-0 flex flex-col items-center justify-center px-4 pb-24 pt-16 transition-[padding] duration-500", side && "lg:pr-[380px]")}>
        <p className="fx-zen-dim mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.24em] text-white/75 transition-opacity">
          <span className={cn("h-1.5 w-1.5 rounded-full", s.status === "running" && "fx-pulse")} style={{ background: tint, ["--c" as string]: tint }} />
          {label}
        </p>
        <div className="relative flex items-center justify-center" style={{ width: "min(80vw, 46vh, 440px)", height: "min(80vw, 46vh, 440px)" }}>
          <Ring p={s.status === "done" ? 1 : progress} tint={tint} dim={s.status === "paused"} />
          {s.phase === "break" && s.status === "running" && (
            <div aria-hidden className="fx-breathe absolute inset-[16%] rounded-full" style={{ background: `radial-gradient(circle, ${tint}55, transparent 70%)` }} />
          )}
          <div className="relative text-center">
            <p
              role="timer"
              aria-live="off"
              aria-label={`${time} left`}
              className={cn("fx-time font-extralight leading-none tracking-[-0.05em]", time.length > 5 ? "text-[clamp(44px,11vw,92px)]" : "text-[clamp(64px,16vw,124px)]")}
            >
              {time}
            </p>
            {s.phase === "break" && s.status === "running" && <p className="mt-3 text-[13px] text-white/70">Breathe with the circle</p>}
            {s.status === "paused" && <p className="mt-3 text-[13px] text-white/60">Paused</p>}
          </div>
        </div>

        <input
          value={s.intent}
          onChange={(e) => focus.setIntent(e.target.value)}
          placeholder={teacher ? "What is the class working on?" : "What are you working on?"}
          aria-label={teacher ? "What the class is working on" : "What you are working on"}
          className={cn(
            "fx-zen-dim mt-6 w-full max-w-[560px] border-b border-transparent bg-transparent pb-1 text-center font-medium text-white placeholder:text-white/40 transition-[border-color,opacity] hover:border-white/20 focus:border-white/50 focus:outline-none",
            full ? "text-[clamp(22px,3.2vw,40px)]" : "text-[18px] sm:text-[20px]",
          )}
        />

        <div className="fx-zen-hide mt-7 flex items-center gap-3">
          <IconBtn label="Restart" onClick={focus.reset} className="fx-glass h-12 w-12 px-0">
            <RotateCcw className="h-[18px] w-[18px]" />
          </IconBtn>
          <IconBtn label="5 minutes less" onClick={() => focus.nudge(-5)} className="fx-glass hidden h-12 w-12 px-0 sm:inline-flex">
            <Minus className="h-[18px] w-[18px]" />
          </IconBtn>
          <button
            type="button"
            onClick={focus.toggle}
            aria-label={s.status === "running" ? "Pause" : "Start"}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-[#0b1226] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)] transition-transform hover:scale-105 active:scale-95"
            style={{ background: `linear-gradient(140deg, #ffffff, ${tint})` }}
          >
            {s.status === "running" ? <Pause className="h-7 w-7" fill="currentColor" /> : <Play className="ml-1 h-7 w-7" fill="currentColor" />}
          </button>
          <IconBtn label="5 minutes more" onClick={() => focus.nudge(5)} className="fx-glass hidden h-12 w-12 px-0 sm:inline-flex">
            <Plus className="h-[18px] w-[18px]" />
          </IconBtn>
          <IconBtn label={s.phase === "break" ? "Skip the break" : "Finish now"} onClick={focus.skip} className="fx-glass h-12 w-12 px-0">
            <SkipForward className="h-[18px] w-[18px]" />
          </IconBtn>
        </div>
      </main>

      {/* Today panel */}
      {side && (
        <div className="absolute bottom-24 right-3 top-[72px] z-20 sm:right-5">
          <Side s={s} teacher={teacher} tint={tint} onClose={() => setSide(false)} />
        </div>
      )}

      {/* Dock */}
      <div className="fx-zen-hide absolute inset-x-0 bottom-5 z-20 flex justify-center px-3">
        <div className="relative">
          {panel && (
            <div className="absolute bottom-full left-1/2 mb-3 w-max max-w-[92vw] -translate-x-1/2">
            <div className="fx-glass-strong fx-up max-h-[60vh] overflow-y-auto rounded-3xl p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)]">
              {panel === "scenes" && <ScenePicker s={s} />}
              {panel === "sound" && <SoundMixer s={s} tint={tint} />}
              {panel === "timer" && <TimerPicker s={s} teacher={teacher} onDone={() => setPanel(null)} />}
            </div>
            </div>
          )}
          <nav aria-label="Focus room" className="fx-glass flex items-center gap-1 rounded-full p-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
            <IconBtn label="Scene" active={panel === "scenes"} onClick={() => toggle("scenes")}>
              <ImageIcon className="h-4 w-4" /> <span className="hidden sm:inline">Scene</span>
            </IconBtn>
            <IconBtn label="Sound" active={panel === "sound"} onClick={() => toggle("sound")}>
              {s.soundOn ? (
                <span className="fx-eq flex h-4 w-4 items-end justify-center gap-[2px]" style={{ color: tint }}>
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Sound</span>
            </IconBtn>
            <IconBtn label="Timer" active={panel === "timer"} onClick={() => toggle("timer")}>
              <Timer className="h-4 w-4" /> <span className="hidden sm:inline">{plan.kind === "single" ? `${plan.focus} min` : plan.label}</span>
            </IconBtn>
            <span className="mx-1 h-5 w-px bg-white/15" />
            <IconBtn label={full ? "Exit full screen" : teacher ? "Present full screen" : "Full screen"} onClick={toggleFull} className="w-10 px-0">
              {full ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </IconBtn>
          </nav>
        </div>
      </div>

      <p className="fx-zen-hide pointer-events-none absolute bottom-2 left-1/2 hidden -translate-x-1/2 text-[11px] text-white/35 lg:block">
        Space start or pause · 1–6 scenes · M sound · T today · F full screen
      </p>
    </div>
  );
};

export default FocusPage;
