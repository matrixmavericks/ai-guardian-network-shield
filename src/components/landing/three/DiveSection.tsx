import React, { useEffect, useRef, useState } from "react";
import poster from "@/assets/landing/dive-poster.webp";
import { clamp01, prefersReducedMotion, smoothstep, useNear, usePinnedProgress } from "./scroll";

// "Inside a thought": a 20-second Higgsfield (Kling 3.0) fly-through, from a
// glowing book into a library of light and on into a galaxy of pages, played
// by the scroll bar. The video is shipped as 121 WebP frames so scrubbing is
// instant in every browser; frames load coarse-to-fine, and the canvas
// cross-fades between neighbours so it stays smooth while the rest arrive.

const FRAMES = 121;
const src = (set: "d" | "m", i: number) => `/media/dive/${set}/${String(i).padStart(3, "0")}.webp`;

/** 0, 120, 60, 30, 90, 15, … so the whole film is covered early, then refined. */
const loadOrder = () => {
  const out: number[] = [0, FRAMES - 1];
  const seen = new Set(out);
  for (let step = 64; step >= 1; step = Math.floor(step / 2)) {
    for (let i = step; i < FRAMES; i += step * 2)
      if (!seen.has(i)) {
        seen.add(i);
        out.push(i);
      }
    if (step === 1) break;
  }
  for (let i = 0; i < FRAMES; i++) if (!seen.has(i)) out.push(i);
  return out;
};

const LINES = [
  { from: 0.0, to: 0.22, eyebrow: "Inside a thought", title: "Every question starts small.", body: "One line typed late at night. A gap between what you know and what you need." },
  { from: 0.26, to: 0.47, title: "Refyn doesn't hand over the answer.", body: "Requests for finished work come back as hints, questions and worked examples." },
  { from: 0.51, to: 0.73, title: "It opens the way, one step at a time.", body: "Each step links to the next idea, so the path is something you walk, not something you copy." },
  { from: 0.77, to: 1.01, title: "The thinking stays yours.", body: "And your teacher can see the whole path, not just the final answer." },
];

const DiveSection: React.FC = () => {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const captions = useRef<(HTMLDivElement | null)[]>([]);
  const rail = useRef<HTMLDivElement>(null);
  const frames = useRef<(HTMLImageElement | null)[]>(Array(FRAMES).fill(null));
  const progress = useRef(0);
  const [loaded, setLoaded] = useState(0);
  const near = useNear(section, "120% 0px");
  const still = prefersReducedMotion();

  // Load frames once the section is close
  useEffect(() => {
    if (!near || still) return;
    const set: "d" | "m" = window.innerWidth * Math.min(2, window.devicePixelRatio || 1) > 1100 ? "d" : "m";
    let cancelled = false;
    let count = 0;
    const queue = loadOrder();
    const worker = async () => {
      while (queue.length && !cancelled) {
        const i = queue.shift()!;
        const img = new Image();
        img.decoding = "async";
        try {
          await new Promise<void>((ok, fail) => {
            img.onload = () => ok();
            img.onerror = () => fail();
            img.src = src(set, i);
          });
          // Start decoding now so drawing it later doesn't stall (not awaited: hidden tabs never finish)
          img.decode().catch(() => undefined);
          if (cancelled) return;
          frames.current[i] = img;
          count++;
          if (count % 8 === 0 || count === FRAMES) setLoaded(count);
        } catch {
          /* a missing frame is skipped; its neighbours cover for it */
        }
      }
    };
    Promise.all([worker(), worker(), worker(), worker()]);
    return () => {
      cancelled = true;
    };
  }, [near, still]);

  // Draw the frame for the current scroll position
  const draw = (p: number) => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const f = p * (FRAMES - 1);
    const lo = Math.floor(f), hi = Math.min(FRAMES - 1, lo + 1), mix = f - lo;
    // The nearest frames that have arrived
    const find = (i: number, dir: number) => {
      for (let k = i; k >= 0 && k < FRAMES; k += dir) if (frames.current[k]) return frames.current[k];
      return null;
    };
    const a = frames.current[lo] ?? find(lo, -1) ?? find(lo, 1);
    const b = frames.current[hi] ?? find(hi, 1) ?? a;
    if (!a) return;
    // Cover-fit with a slow push-in
    const zoom = 1.04 + p * 0.04;
    const ar = a.naturalWidth / a.naturalHeight;
    let dw = cv.width * zoom, dh = dw / ar;
    if (dh < cv.height * zoom) {
      dh = cv.height * zoom;
      dw = dh * ar;
    }
    const dx = (cv.width - dw) / 2, dy = (cv.height - dh) / 2;
    ctx.globalAlpha = 1;
    ctx.drawImage(a, dx, dy, dw, dh);
    if (b && b !== a && mix > 0.02) {
      ctx.globalAlpha = mix;
      ctx.drawImage(b, dx, dy, dw, dh);
      ctx.globalAlpha = 1;
    }
  };

  usePinnedProgress(section, (p) => {
    progress.current = p;
    draw(p);
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
    if (rail.current) rail.current.style.setProperty("--p", String(clamp01(p)));
  });

  // Redraw when more frames arrive or the window changes size
  useEffect(() => draw(progress.current), [loaded]);
  useEffect(() => {
    const on = () => draw(progress.current);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  if (still)
    return (
      <section aria-labelledby="dive-title" className="relative border-t border-lp-line bg-lp-deep">
        <div className="relative h-[70vh] min-h-[420px] overflow-hidden">
          <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-lp-bg via-lp-bg/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1200px] px-5 pb-12 sm:px-8">
            <h2 id="dive-title" className="text-[40px] font-normal leading-[1] tracking-[-0.04em] text-white sm:text-[60px]">
              The thinking stays yours.
            </h2>
            <p className="mt-4 max-w-[34rem] text-[17px] leading-relaxed text-white/80">{LINES.map((l) => l.title).join(" ")}</p>
          </div>
        </div>
      </section>
    );

  return (
    <section ref={section} id="inside" aria-labelledby="dive-title" className="relative h-[420vh] bg-lp-deep">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <img src={poster} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-[1.04] object-cover" />
        <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full" />
        {/* Blend into the page above and below, and keep the copy readable */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-lp-deep to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-lp-bg to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_55%,rgba(3,6,15,0.55),rgba(3,6,15,0)_60%)]" />

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
          <span className="absolute -left-[5px] h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-white shadow-[0_0_14px_4px_rgba(63,233,255,0.7)]" style={{ top: "calc(var(--p) * 100%)" }} />
        </div>
        {loaded < FRAMES && near && (
          <p aria-hidden className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.2em] text-white/40">
            Loading the dive · {Math.round((loaded / FRAMES) * 100)}%
          </p>
        )}
      </div>
    </section>
  );
};

export default DiveSection;
