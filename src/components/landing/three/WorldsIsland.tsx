import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow, QuietLink } from "../primitives";
import { clamp01, hasWebGL, prefersReducedMotion, useNear } from "./scroll";
import type { HotspotPos, IslandHandle, ScreenSpot } from "./islandScene";

// "Every subject is a world": a floating island you can turn, whose landmarks
// open the parts of Refyn they stand for. Hotspot positions were picked on the
// model itself (observatory dome, library tower, bridge, waterfall, crystals).

type Spot = HotspotPos & { label: string; title: string; body: string };

const SPOTS: Spot[] = [
  { id: "sims", at: [0.17, 0.55, 0.36], label: "Simulations", title: "A lab for every idea", body: "29 interactive simulations for physics, maths, economics, geography, biology and chemistry. Change one thing and watch what happens." },
  { id: "worlds", at: [-0.36, 0.8, -0.13], label: "Worlds & Gems", title: "A world for every unit", body: "Notes, flashcards, a guide that knows the unit and role-play scenes, all in one place your class can share." },
  { id: "guided", at: [-0.07, 0.24, -0.06], label: "Guided mode", title: "A bridge, not a shortcut", body: "Requests for finished work come back as hints, questions and worked examples, so students cross the gap themselves." },
  { id: "focus", at: [0.24, -0.22, -0.59], label: "Focus room", title: "Somewhere calm to work", body: "Living scenes, ambient sound and a timer that keeps running while you study anywhere in Refyn." },
  { id: "brain", at: [-0.02, -0.95, -0.01], label: "Brain", title: "Everything you know, connected", body: "Every note and chat linked into one map of ideas, so you can see how your subjects fit together." },
];

const WorldsIsland: React.FC = () => {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const spotEls = useRef<Record<string, HTMLButtonElement | null>>({});
  const handle = useRef<IslandHandle | null>(null);
  const near = useNear(section, "80% 0px");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!near || !canvas.current) return;
    if (!hasWebGL()) return setFailed(true);
    let cancelled = false;
    const place = (screen: Record<string, ScreenSpot>) => {
      for (const s of SPOTS) {
        const el = spotEls.current[s.id], p = screen[s.id];
        if (!el || !p) continue;
        el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        el.style.opacity = p.visible ? "1" : "0";
        el.style.pointerEvents = p.visible ? "auto" : "none";
      }
    };
    (async () => {
      try {
        const { createIsland } = await import("./islandScene");
        if (cancelled || !canvas.current) return;
        const debug = new URLSearchParams(window.location.search).has("islanddebug");
        const h = await createIsland(canvas.current, "/media/island.glb", SPOTS, place, { reduced: debug || prefersReducedMotion(), angle: debug ? 0 : undefined });
        if (debug) (window as unknown as { __island: IslandHandle }).__island = h;
        if (cancelled) return h.dispose();
        handle.current = h;
        setReady(true);
      } catch {
        setFailed(true);
      }
    })();
    // Rise out of the clouds as the section scrolls in; draw only while visible
    const onScroll = () => {
      const r = section.current?.getBoundingClientRect();
      if (r) handle.current?.setEntry(clamp01((window.innerHeight - r.top) / (window.innerHeight * 0.85)));
    };
    const io = new IntersectionObserver(([e]) => handle.current?.setActive(e.isIntersecting));
    if (section.current) io.observe(section.current);
    window.addEventListener("scroll", onScroll, { passive: true });
    const tick = window.setInterval(onScroll, 250);
    return () => {
      cancelled = true;
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.clearInterval(tick);
      handle.current?.dispose();
      handle.current = null;
    };
  }, [near]);

  useEffect(() => handle.current?.focus(focus), [focus]);

  const current = SPOTS.find((s) => s.id === focus);

  return (
    <section ref={section} id="worlds" aria-labelledby="worlds-title" className="relative overflow-hidden border-t border-lp-line bg-lp-deep">
      <img src="/media/clouds.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-bottom opacity-90" loading="lazy" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-lp-deep to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-lp-bg to-transparent" />

      <div className="relative mx-auto grid min-h-[100svh] max-w-[1200px] grid-cols-1 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:py-24">
        <div className="relative z-10 lg:col-span-5">
          <Eyebrow>Spaces in Refyn</Eyebrow>
          <h2 id="worlds-title" className="mt-5 text-balance text-[36px] font-normal leading-[1] tracking-[-0.035em] text-white sm:text-[48px] lg:text-[58px]">
            Every subject is a world. <span className="text-white/55">Go and explore it.</span>
          </h2>
          <p className="mt-5 max-w-[28rem] text-[16.5px] leading-[1.65] text-white/75">
            Turn the island and tap a light. Each landmark is a part of Refyn students and teachers use every day.
          </p>

          <div className="mt-8 hidden min-h-[184px] lg:block" aria-live="polite">
            <InfoCard spot={current} onClose={() => setFocus(null)} />
          </div>
        </div>

        {/* The island (the canvas spans the whole section so clouds can drift past) */}
        <div className="relative h-[62vh] min-h-[420px] lg:col-span-7 lg:h-auto" />
      </div>

      <canvas
        ref={canvas}
        aria-label="A floating island with an observatory, a library tower, a bridge and a waterfall. Drag to turn it."
        role="img"
        onPointerDown={() => setTouched(true)}
        className={cn(
          "absolute inset-0 h-full w-full cursor-grab touch-pan-y transition-opacity duration-1000 active:cursor-grabbing",
          ready ? "opacity-100" : "opacity-0",
        )}
      />
      <div className="pointer-events-none absolute inset-0">
        {SPOTS.map((s) => (
          <button
            key={s.id}
            ref={(el) => (spotEls.current[s.id] = el)}
            type="button"
            onClick={() => setFocus((f) => (f === s.id ? null : s.id))}
            aria-pressed={focus === s.id}
            aria-label={`${s.label}: ${s.title}`}
            className={cn("group absolute left-0 top-0 flex items-center gap-2 opacity-0 transition-opacity duration-300", !ready && "hidden")}
            style={{ pointerEvents: "none" }}
          >
            <span className="relative -ml-[9px] -mt-[9px] flex h-[18px] w-[18px] items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-lp-cyan/40 [animation-duration:2.4s]" />
              <span className={cn("relative h-[10px] w-[10px] rounded-full bg-[#ffffff] shadow-[0_0_14px_4px_rgba(63,233,255,0.75)] transition-transform group-hover:scale-125", focus === s.id && "scale-125 bg-lp-cyan")} />
            </span>
            <span className={cn("-mt-[9px] whitespace-nowrap rounded-full border border-white/20 bg-[#050A18]/70 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-md transition-colors group-hover:border-lp-cyan/60", focus === s.id && "border-lp-cyan/70")}>
              {s.label}
            </span>
          </button>
        ))}
      </div>

      {/* Phones: the card sits under the island */}
      <div className="relative z-10 mx-auto -mt-10 max-w-[1200px] px-5 pb-16 sm:px-8 lg:hidden" aria-live="polite">
        <InfoCard spot={current} onClose={() => setFocus(null)} />
      </div>

      {ready && !touched && (
        <p aria-hidden className="pointer-events-none absolute bottom-8 right-8 hidden items-center gap-2 text-[12px] text-white/60 lg:flex">
          <Hand className="h-4 w-4" /> Drag to turn the island
        </p>
      )}
      {!ready && !failed && near && (
        <p aria-hidden className="absolute right-[30%] top-1/2 hidden text-[12px] uppercase tracking-[0.2em] text-white/40 lg:block">Raising the island…</p>
      )}
    </section>
  );
};

const InfoCard: React.FC<{ spot?: Spot; onClose: () => void }> = ({ spot, onClose }) => (
  <div className="rounded-3xl border border-white/15 bg-[#050A18]/65 p-6 backdrop-blur-xl">
    {spot ? (
      <div key={spot.id} className="lp-fade">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-cyan">{spot.label}</p>
        <p className="mt-2 text-[22px] font-medium tracking-[-0.02em] text-white">{spot.title}</p>
        <p className="mt-2 text-[14.5px] leading-relaxed text-white/75">{spot.body}</p>
        <div className="mt-4 flex items-center gap-5">
          <QuietLink to="/tour" className="text-white">
            See it in the tour <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </QuietLink>
          <button type="button" onClick={onClose} className="text-[13px] text-white/55 hover:text-white">
            Back to the island
          </button>
        </div>
      </div>
    ) : (
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">Five landmarks</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {SPOTS.map((s) => (
            <li key={s.id} className="rounded-full border border-white/15 px-3 py-1 text-[13px] text-white/80">
              {s.label}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13.5px] text-white/60">Tap a glowing light on the island to see what it does.</p>
      </div>
    )}
  </div>
);

export default WorldsIsland;
