import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Scene } from "./scenes";

type Make = (w: number, h: number, dpr: number) => Scene;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * A decorative animated canvas. It never takes pointer input (so touch
 * scrolling still works over it), pauses when off screen or in a hidden tab,
 * rebuilds its scene when resized and draws a single still frame when the
 * person prefers reduced motion.
 */
export const Ambient: React.FC<{ make: Make; className?: string; maxDpr?: number; fps?: number; start?: number }> = ({ make, className, maxDpr = 1.5, fps = 60, start = 6 }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = wrap.current!, cv = canvas.current!;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let scene: Scene | null = null;
    let size = { w: 0, h: 0, dpr: 1 };
    let raf = 0, last = 0, t = start, visible = true;
    const still = reducedMotion();

    const build = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h || (scene && w === size.w && h === size.h)) return;
      const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
      size = { w, h, dpr };
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      try {
        scene = make(w, h, dpr);
      } catch {
        scene = null;
      }
      paint(1 / 60);
    };
    const paint = (dt: number) => {
      if (!scene) return;
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, size.w, size.h);
      scene.draw(ctx, t, dt);
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || still) return;
      const gap = now - last;
      if (gap < 1000 / fps - 2) return;
      const dt = Math.min(0.05, last ? gap / 1000 : 1 / 60);
      last = now;
      t += dt;
      paint(dt);
    };

    build();
    let pending = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(pending);
      pending = window.setTimeout(build, 120);
    });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(el);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(pending);
      ro.disconnect();
      io.disconnect();
    };
  }, [make, maxDpr, fps, start]);

  return (
    <div ref={wrap} aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <canvas ref={canvas} className="absolute inset-0 block" />
    </div>
  );
};

/** One still frame of a scene, for pickers. */
export const SceneStill: React.FC<{ make: Make; className?: string; t?: number }> = ({ make, className, t = 9 }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvas.current!;
    const r = cv.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * dpr;
    cv.height = h * dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    try {
      const s = make(w, h, dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // A few frames so moving parts settle into place
      for (let i = 0; i < 4; i++) {
        ctx.clearRect(0, 0, w, h);
        s.draw(ctx, t + i / 30, 1 / 30);
      }
    } catch {
      /* decoration only */
    }
  }, [make, t]);
  return <canvas ref={canvas} aria-hidden className={cn("block h-full w-full", className)} />;
};
