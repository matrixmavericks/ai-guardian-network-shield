import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { clamp01, hasWebGL, prefersReducedMotion, smoothstep, useNear, usePinnedProgress } from "./scroll";
import type { DiveHandle } from "./diveScene";

// "Inside a thought": a live 3D fly-through driven by the scroll bar. A
// glowing book (a Higgsfield 3D model), a dive into its page, a tunnel of
// books joined by firing links, a path of light lit one step at a time, and a
// galaxy of books at the end. The captions tell the story alongside.

const LINES = [
  { from: 0.0, to: 0.22, eyebrow: "Inside a thought", title: "Every question starts small.", body: "One line typed late at night. A gap between what you know and what you need." },
  { from: 0.3, to: 0.5, title: "Refyn doesn't hand over the answer.", body: "Requests for finished work come back as hints, questions and worked examples." },
  { from: 0.53, to: 0.76, title: "It opens the way, one step at a time.", body: "Each step links to the next idea, so the path is something you walk, not something you copy." },
  { from: 0.81, to: 1.01, title: "The thinking stays yours.", body: "And your teacher can see the whole path, not just the final answer." },
];

const DiveSection: React.FC = () => {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const captions = useRef<(HTMLDivElement | null)[]>([]);
  const rail = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const handle = useRef<DiveHandle | null>(null);
  const progress = useRef(0);
  const near = useNear(section, "120% 0px");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!near || !canvas.current) return;
    if (!hasWebGL()) return setFailed(true);
    let cancelled = false;
    (async () => {
      try {
        const { createDive } = await import("./diveScene");
        if (cancelled || !canvas.current) return;
        const h = await createDive(canvas.current, { small: window.innerWidth < 768, reduced: prefersReducedMotion() });
        if (cancelled) return h.dispose();
        handle.current = h;
        h.setProgress(progress.current);
        setReady(true);
      } catch {
        setFailed(true);
      }
    })();
    const io = new IntersectionObserver(([e]) => handle.current?.setActive(e.isIntersecting));
    if (section.current) io.observe(section.current);
    return () => {
      cancelled = true;
      io.disconnect();
      handle.current?.dispose();
      handle.current = null;
    };
  }, [near]);

  usePinnedProgress(section, (p) => {
    progress.current = p;
    handle.current?.setProgress(p);
    LINES.forEach((l, i) => {
      const el = captions.current[i];
      if (!el) return;
      // The first line is there from the start and the last one stays to the end
      const fadeIn = i === 0 ? 1 : smoothstep(l.from, l.from + 0.05, p);
      const fadeOut = i === LINES.length - 1 ? 1 : 1 - smoothstep(l.to - 0.05, l.to, p);
      const o = Math.min(fadeIn, fadeOut);
      el.style.opacity = String(o);
      el.style.transform = `translate3d(0, ${(1 - o) * (p < l.from + 0.05 ? 24 : -24)}px, 0)`;
      el.style.filter = `blur(${(1 - o) * 8}px)`;
      el.style.visibility = o < 0.01 ? "hidden" : "visible";
    });
    // A burst of light as the camera passes into the page
    if (flash.current) flash.current.style.opacity = String(Math.exp(-Math.pow((p - 0.272) / 0.022, 2)));
    if (rail.current) rail.current.style.setProperty("--p", String(clamp01(p)));
  });

  return (
    <section ref={section} id="inside" aria-labelledby="dive-title" className="relative h-[420vh] bg-[#03060f]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,#0b1d3f,#03060f_70%)]" />
        <canvas ref={canvas} aria-hidden className={cn("absolute inset-0 h-full w-full transition-opacity duration-1000", ready ? "opacity-100" : "opacity-0")} />
        <div ref={flash} aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,#ffffff,#9fe8ff_35%,rgba(59,130,246,0.6)_70%)] opacity-0" />
        {/* Blend into the page above and below, and keep the copy readable */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-lp-deep to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-lp-bg to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_50%,rgba(3,6,15,0.6),rgba(3,6,15,0)_55%)]" />

        <h2 id="dive-title" className="sr-only">
          Inside a thought: {LINES.map((l) => l.title).join(" ")}
        </h2>
        <div className="absolute inset-0 mx-auto flex max-w-[1200px] items-center px-5 sm:px-8">
          <div className="relative h-[46vh] w-full max-w-[40rem]">
            {LINES.map((l, i) => (
              <div key={l.title} className="absolute inset-x-0 top-1/2 -translate-y-1/2">
                <div
                  ref={(el) => (captions.current[i] = el)}
                  aria-hidden
                  className="will-change-[opacity,transform,filter]"
                  style={{ opacity: i === 0 ? 1 : 0, visibility: i === 0 ? "visible" : "hidden" }}
                >
                  {l.eyebrow && (
                    <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-medium tracking-wide text-white/85 backdrop-blur-md">
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lp-cyan shadow-[0_0_10px_2px_rgba(63,233,255,0.6)]" />
                      {l.eyebrow}
                    </p>
                  )}
                  <p className="text-balance text-[40px] font-normal leading-[0.98] tracking-[-0.045em] text-white [text-shadow:0_2px_40px_rgba(3,6,15,0.6)] sm:text-[60px] lg:text-[76px]">
                    {l.title}
                  </p>
                  <p className="mt-5 max-w-[30rem] text-[16px] leading-relaxed text-white/80 [text-shadow:0_1px_20px_rgba(3,6,15,0.8)] sm:text-[18px]">{l.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Where you are in the dive */}
        <div ref={rail} aria-hidden className="absolute right-5 top-1/2 hidden h-[38vh] w-px -translate-y-1/2 bg-white/15 sm:block md:right-10" style={{ ["--p" as string]: 0 }}>
          <div className="absolute inset-x-0 top-0 origin-top bg-gradient-to-b from-lp-sky to-lp-cyan" style={{ height: "100%", transform: "scaleY(var(--p))" }} />
          {LINES.map((l) => (
            <span key={l.title} className="absolute -left-[3px] h-[7px] w-[7px] rounded-full border border-white/40 bg-lp-deep" style={{ top: `${l.from * 100}%` }} />
          ))}
          <span className="absolute -left-[5px] h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-[#ffffff] shadow-[0_0_14px_4px_rgba(63,233,255,0.7)]" style={{ top: "calc(var(--p) * 100%)" }} />
        </div>
        {!ready && !failed && near && (
          <p aria-hidden className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.2em] text-white/40">
            Opening the book…
          </p>
        )}
      </div>
    </section>
  );
};

export default DiveSection;
