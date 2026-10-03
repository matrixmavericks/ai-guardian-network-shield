import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Expand, Flame, Shrink, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { mySubjects, streak, subjectSummary, useStudy } from "@/components/subjects/store";
import { hasWebGL, prefersReducedMotion, useNear } from "@/components/landing/three/scroll";
import type { ScreenLabel, WorldBuilding, WorldHandle } from "./worldScene";

// "Your world" on the student dashboard: a floating island with a building for
// each of your subjects, built up floor by floor as you master its topics.

const MODELS: Record<string, string> = {
  biology: "/media/world/biology.glb",
  chemistry: "/media/world/chemistry.glb",
  physics: "/media/world/physics.glb",
  "extended-mathematics": "/media/world/maths.glb",
  "english-lang-lit": "/media/world/english.glb",
  history: "/media/world/history.glb",
  "individuals-societies": "/media/world/societies.glb",
};
const SHORT: Record<string, string> = {
  biology: "Biology",
  chemistry: "Chemistry",
  physics: "Physics",
  "extended-mathematics": "Maths",
  "english-lang-lit": "English",
  history: "History",
  "individuals-societies": "I&S",
};
const BUILDING: Record<string, string> = {
  biology: "greenhouse",
  chemistry: "alchemy tower",
  physics: "observatory",
  "extended-mathematics": "crystal pyramid",
  "english-lang-lit": "book cottage",
  history: "temple",
  "individuals-societies": "town hall",
};

const MyWorld: React.FC = () => {
  const { state } = useStudy();
  const navigate = useNavigate();
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labelEls = useRef<Record<string, HTMLButtonElement | null>>({});
  const handle = useRef<WorldHandle | null>(null);
  const near = useNear(wrap, "60% 0px");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [full, setFull] = useState(false);

  const subjects = useMemo(() => mySubjects(state).filter((s) => MODELS[s.slug]), [state]);
  const rows = useMemo(
    () =>
      subjects.map((s) => {
        const sum = subjectSummary(s, state);
        return { slug: s.slug, name: s.name, accent: s.theme.accent, progress: sum.progress, mastered: sum.counts.mastered, topics: sum.topics };
      }),
    [subjects, state],
  );
  const days = streak(state);
  const avg = rows.length ? rows.reduce((a, r) => a + r.progress, 0) / rows.length : 0;
  const level = 1 + Math.floor(avg / 10);
  const masteredTopics = rows.reduce((a, r) => a + r.mastered, 0);
  // The closest next floor: the subject nearest its next 25% step
  const goal = useMemo(() => {
    const options = rows
      .map((r) => {
        const next = Math.min(100, (Math.floor(r.progress / 25) + 1) * 25);
        return { ...r, next, gap: next - r.progress };
      })
      .filter((r) => r.progress < 100)
      .sort((a, b) => a.gap - b.gap);
    return options[0];
  }, [rows]);
  const buildings: WorldBuilding[] = useMemo(() => rows.map((r) => ({ slug: r.slug, model: MODELS[r.slug], progress: r.progress, accent: r.accent })), [rows]);
  const key = buildings.map((b) => b.slug).join(",");

  // Build the scene once the panel is near (rebuilt only if the set of subjects changes)
  useEffect(() => {
    if (!near || !canvas.current || !buildings.length) return;
    if (!hasWebGL()) return setFailed(true);
    let cancelled = false;
    setReady(false);
    const place = (labels: Record<string, ScreenLabel>) => {
      // Front-most labels first; any that would overlap one already shown wait until the island turns
      const kept: { x: number; y: number; w: number }[] = [];
      for (const [slug, l] of Object.entries(labels).sort((p, q) => q[1].front - p[1].front)) {
        const el = labelEls.current[slug];
        if (!el) continue;
        const w = el.offsetWidth || 90;
        const clash = kept.some((k) => Math.abs(k.x - l.x) < (k.w + w) / 2 + 4 && Math.abs(k.y - l.y) < 26);
        const show = l.visible && !clash;
        if (show) kept.push({ x: l.x, y: l.y, w });
        el.style.transform = `translate3d(${l.x}px, ${l.y}px, 0) translate(-50%, -100%)`;
        el.style.opacity = show ? String(Math.min(1, 0.55 + l.front)) : "0";
        el.style.pointerEvents = show ? "auto" : "none";
        el.style.zIndex = String(Math.round(10 + l.front * 10));
      }
    };
    (async () => {
      try {
        const { createWorld } = await import("./worldScene");
        if (cancelled || !canvas.current) return;
        const h = await createWorld(canvas.current, buildings, days, { onLabels: place, onHover: setHover, onOpen: (slug) => navigate(`/subjects/${slug}`) }, { reduced: prefersReducedMotion(), small: window.innerWidth < 768 });
        if (cancelled) return h.dispose();
        handle.current = h;
        h.update(buildings, days);
        setReady(true);
      } catch {
        setFailed(true);
      }
    })();
    const io = new IntersectionObserver(([e]) => handle.current?.setActive(e.isIntersecting));
    if (wrap.current) io.observe(wrap.current);
    return () => {
      cancelled = true;
      io.disconnect();
      handle.current?.dispose();
      handle.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, key]);

  // Progress changes animate the buildings without rebuilding the scene
  useEffect(() => handle.current?.update(buildings, days), [buildings, days]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [full]);

  if (!buildings.length) return null;
  const hovered = rows.find((r) => r.slug === hover);
  const goalCard = goal ? (
    <div className="fx-glass pointer-events-auto max-w-[22rem] rounded-2xl p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Next floor</p>
      <p className="mt-1 text-[15px] font-medium leading-snug text-white">
        Take the {SHORT[goal.slug]} {BUILDING[goal.slug]} from {goal.progress}% to {goal.next}%
      </p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-white/65">
        About {Math.max(1, Math.ceil((goal.gap / 100) * goal.topics))} more {Math.ceil((goal.gap / 100) * goal.topics) === 1 ? "topic" : "topics"} at mastery. Practice questions build it fastest.
      </p>
      <Link to={`/subjects/${goal.slug}`} className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7ff3ff] hover:text-white">
        Build it now <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  ) : null;

  return (
    <section
      ref={wrap}
      aria-labelledby="world-title"
      className={cn(
        "lp-keep overflow-hidden border border-white/10 bg-[#050b1c] text-white shadow-[0_30px_80px_-40px_rgba(2,6,23,0.9)]",
        full ? "fixed inset-0 z-[90] rounded-none" : "relative rounded-[28px]",
      )}
    >
      <img src="/media/clouds.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-bottom opacity-80" loading="lazy" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_45%,rgba(59,130,246,0.25),rgba(5,11,28,0)_60%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#050b1c] to-transparent" />

      <div className={cn("relative", full ? "h-full" : "h-[400px] sm:h-[500px]")}>
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Your world: ${rows.map((r) => `${r.name} ${r.progress}% built`).join(", ")}. Drag to turn it, tap a building to open the subject.`}
          className={cn("absolute inset-0 h-full w-full cursor-grab touch-pan-y transition-opacity duration-1000 active:cursor-grabbing", ready ? "opacity-100" : "opacity-0")}
        />

        {/* Building labels */}
        <div className="pointer-events-none absolute inset-0">
          {rows.map((r) => (
            <button
              key={r.slug}
              ref={(el) => (labelEls.current[r.slug] = el)}
              type="button"
              onClick={() => navigate(`/subjects/${r.slug}`)}
              onMouseEnter={() => setHover(r.slug)}
              onMouseLeave={() => setHover(null)}
              className={cn("absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-[#050A18]/75 py-1 pl-1 pr-2.5 text-[11.5px] font-medium text-white opacity-0 backdrop-blur-md transition-[opacity,border-color] duration-300 hover:border-white/50", !ready && "hidden", hover === r.slug && "border-white/60")}
              style={{ pointerEvents: "none" }}
            >
              <span className="relative flex h-5 w-5 items-center justify-center">
                <svg viewBox="0 0 20 20" className="absolute inset-0 -rotate-90" aria-hidden>
                  <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" />
                  <circle cx="10" cy="10" r="8" fill="none" stroke={r.progress >= 100 ? "#fcd34d" : "#3fe9ff"} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${(r.progress / 100) * 50.3} 50.3`} />
                </svg>
              </span>
              {SHORT[r.slug]}
              <span className="tabular-nums text-white/60">{r.progress}%</span>
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
          <div className="pointer-events-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7ff3ff]">Your world · Level {level}</p>
            <h2 id="world-title" className="mt-1.5 max-w-[16rem] text-[20px] font-medium leading-tight tracking-[-0.025em] text-white sm:max-w-none sm:text-[28px]">
              Every subject you master builds it up.
            </h2>
            <div className="mt-3 hidden flex-wrap gap-2 text-[12px] text-white/85 sm:flex">
              <span className="fx-glass inline-flex h-7 items-center gap-1.5 rounded-full px-2.5">
                <Flame className="h-3.5 w-3.5 text-[#fdba74]" /> {days ? `${days}-day streak: more fireflies every day` : "Study today to light the fireflies"}
              </span>
              <span className="fx-glass inline-flex h-7 items-center gap-1.5 rounded-full px-2.5">
                <Sparkles className="h-3.5 w-3.5 text-[#7ff3ff]" /> {masteredTopics} {masteredTopics === 1 ? "topic" : "topics"} mastered
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFull((v) => !v)}
            className="fx-glass pointer-events-auto inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-medium text-white hover:bg-white/15"
            aria-label={full ? "Close the full view" : "Explore your world full screen"}
          >
            {full ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            <span className="hidden sm:inline">{full ? "Close" : "Explore"}</span>
          </button>
        </div>

        {/* Next floor */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6">
          {goal && <div className="hidden sm:block">{goalCard}</div>}
          {hovered && (
            <div className="fx-glass hidden rounded-2xl px-4 py-3 text-[12.5px] sm:block" aria-live="polite">
              <p className="font-semibold text-white">{hovered.name}</p>
              <p className="text-white/65">
                {hovered.progress}% built · {hovered.mastered} of {hovered.topics} topics mastered
              </p>
            </div>
          )}
        </div>

        {!ready && !failed && (
          <p aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] uppercase tracking-[0.2em] text-white/45">
            {near ? "Raising your world…" : ""}
          </p>
        )}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-[14px] text-white/70">
            Your world needs WebGL, which this browser has turned off. Your subjects are still on the Subjects page.
          </div>
        )}
      </div>
      {goal && !full && <div className="relative px-4 pb-4 sm:hidden">{goalCard}</div>}
    </section>
  );
};

export default MyWorld;
