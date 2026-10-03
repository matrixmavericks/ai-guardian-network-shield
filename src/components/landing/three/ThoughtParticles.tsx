import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "../primitives";
import { hasWebGL, prefersReducedMotion, smoothstep, useNear, usePinnedProgress } from "./scroll";
import type { ParticlesHandle } from "./particlesScene";

// "The thinking takes shape": thousands of points that become a question
// mark, a book, a lightbulb, a brain and a graduation cap as you scroll.
// The shapes were sampled from Higgsfield text-to-3D models.

const STEPS = [
  { word: "A question", body: "It starts with something you don't know yet, typed in your own words." },
  { word: "Explore", body: "Refyn points you to the idea, not the answer: a hint, a source, a sharper question." },
  { word: "The click", body: "You work it out. That moment belongs to you, not to the AI." },
  { word: "Understanding", body: "Practice, flashcards and feedback make it stick, at your own pace." },
  { word: "Mastery", body: "Teachers see the growth, and your portfolio shows what you can do." },
];
const PER_SHAPE = 16384;

/** Holds each shape for a while and morphs in between. */
const morphFor = (p: number) => {
  const t = p * (STEPS.length - 1) * 1.08 - 0.04;
  const k = Math.max(0, Math.min(STEPS.length - 2, Math.floor(t)));
  return Math.min(STEPS.length - 1, k + smoothstep(0.3, 0.7, t - k));
};

const ThoughtParticles: React.FC = () => {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stepEls = useRef<(HTMLLIElement | null)[]>([]);
  const bar = useRef<HTMLDivElement>(null);
  const mobileWord = useRef<HTMLParagraphElement>(null);
  const mobileBody = useRef<HTMLParagraphElement>(null);
  const handle = useRef<ParticlesHandle | null>(null);
  const morph = useRef(0);
  const shown = useRef(-1);
  const near = useNear(section, "100% 0px");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!near || !canvas.current) return;
    if (!hasWebGL()) return setFailed(true);
    let cancelled = false;
    (async () => {
      try {
        const [mod, buf] = await Promise.all([import("./particlesScene"), fetch("/media/shapes.bin").then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))]);
        if (cancelled || !canvas.current) return;
        const small = window.innerWidth < 768;
        handle.current = mod.createParticles(canvas.current, new Int16Array(buf), PER_SHAPE, { count: small ? 12000 : PER_SHAPE, reduced: prefersReducedMotion() });
        handle.current.setMorph(morph.current);
      } catch {
        setFailed(true);
      }
    })();
    // Only draw while on screen
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
    const m = morphFor(p);
    morph.current = m;
    handle.current?.setMorph(m);
    const active = Math.round(m);
    if (bar.current) bar.current.style.transform = `scaleY(${p})`;
    if (active !== shown.current) {
      shown.current = active;
      stepEls.current.forEach((el, i) => el?.setAttribute("data-on", String(i === active)));
      if (mobileWord.current) mobileWord.current.textContent = STEPS[active].word;
      if (mobileBody.current) mobileBody.current.textContent = STEPS[active].body;
    }
  });

  const onPointer = (e: React.PointerEvent) => {
    const r = canvas.current?.getBoundingClientRect();
    if (!r) return;
    handle.current?.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1), e.pointerType === "mouse");
  };

  return (
    <section ref={section} id="journey" aria-labelledby="journey-title" className="relative h-[460vh] border-t border-lp-line bg-lp-bg">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_68%_50%,rgba(29,78,216,0.28),rgba(5,10,24,0)_60%)]" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(124,180,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(124,180,255,0.12)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
        />
        <canvas
          ref={canvas}
          aria-hidden
          onPointerMove={onPointer}
          onPointerLeave={() => handle.current?.setPointer(0, 0, false)}
          className="absolute inset-0 h-full w-full lg:left-[38%] lg:w-[62%]"
        />
        {failed && (
          <p aria-hidden className="absolute right-[18%] top-1/2 hidden -translate-y-1/2 text-[200px] font-light leading-none text-lp-sky/30 lg:block">?</p>
        )}

        <div className="pointer-events-none relative mx-auto flex h-full max-w-[1200px] flex-col justify-between px-5 py-20 sm:px-8 lg:justify-center">
          <div className="max-w-[26rem]">
            <Eyebrow>The thinking takes shape</Eyebrow>
            <h2 id="journey-title" className="mt-5 text-balance text-[34px] font-normal leading-[1] tracking-[-0.035em] text-lp-text sm:text-[44px] lg:text-[52px]">
              One question, five steps, <span className="text-lp-mute">all yours.</span>
            </h2>
          </div>

          {/* Desktop: the five steps, the current one lit */}
          <div className="relative mt-10 hidden lg:block">
            <div aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-lp-line">
              <div ref={bar} className="h-full w-full origin-top bg-gradient-to-b from-lp-sky to-lp-cyan" style={{ transform: "scaleY(0)" }} />
            </div>
            <ol className="space-y-6">
              {STEPS.map((s, i) => (
                <li
                  key={s.word}
                  ref={(el) => (stepEls.current[i] = el)}
                  data-on={i === 0}
                  className="group relative pl-8 opacity-40 transition-[opacity,transform] duration-500 data-[on=true]:translate-x-1 data-[on=true]:opacity-100"
                >
                  <span aria-hidden className="absolute left-0 top-[9px] h-[11px] w-[11px] rounded-full border border-lp-line bg-lp-bg transition-colors group-data-[on=true]:border-transparent group-data-[on=true]:bg-lp-cyan group-data-[on=true]:shadow-[0_0_14px_3px_rgba(63,233,255,0.6)]" />
                  <p className="text-[22px] font-medium tracking-[-0.02em] text-lp-text">
                    <span className="mr-3 text-[13px] tabular-nums text-lp-mute">0{i + 1}</span>
                    {s.word}
                  </p>
                  <p className="mt-1 max-w-[24rem] text-[14.5px] leading-relaxed text-lp-soft">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Phones: just the current step, under the shape */}
          <div className="lg:hidden" aria-hidden>
            <p ref={mobileWord} className="text-[28px] font-medium tracking-[-0.02em] text-white">
              {STEPS[0].word}
            </p>
            <p ref={mobileBody} className="mt-2 max-w-[22rem] text-[15px] leading-relaxed text-lp-soft">
              {STEPS[0].body}
            </p>
          </div>
          <ol className="sr-only">
            {STEPS.map((s) => (
              <li key={s.word}>
                {s.word}: {s.body}
              </li>
            ))}
          </ol>
        </div>
        <p aria-hidden className={cn("pointer-events-none absolute bottom-5 right-6 hidden text-[11px] uppercase tracking-[0.2em] text-lp-mute lg:block")}>Move your cursor through it</p>
      </div>
    </section>
  );
};

export default ThoughtParticles;
