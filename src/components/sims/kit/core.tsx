import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { setHalo, type Ctx } from "./draw";

// The canvas stage, theme colours, live readouts and shareable settings that
// every simulation is built on.

export type SimTheme = {
  dark: boolean;
  ink: string;
  soft: string;
  mute: string;
  grid: string;
  axis: string;
  halo: string;
  panel: string;
  c: { blue: string; orange: string; green: string; amber: string; red: string; violet: string; cyan: string; pink: string; slate: string };
};

const DARK: SimTheme = {
  dark: true, ink: "#e8eef8", soft: "#a5b4cb", mute: "#7d8ba6", grid: "rgba(148,163,184,0.12)", axis: "rgba(203,213,225,0.45)", halo: "rgba(5,10,24,0.85)", panel: "rgba(10,19,40,0.82)",
  c: { blue: "#60a5fa", orange: "#fb923c", green: "#34d399", amber: "#fbbf24", red: "#f87171", violet: "#a78bfa", cyan: "#22d3ee", pink: "#f472b6", slate: "#94a3b8" },
};
const LIGHT: SimTheme = {
  dark: false, ink: "#0f172a", soft: "#334155", mute: "#64748b", grid: "rgba(15,23,42,0.08)", axis: "rgba(15,23,42,0.45)", halo: "rgba(255,255,255,0.9)", panel: "rgba(255,255,255,0.9)",
  c: { blue: "#2563eb", orange: "#ea580c", green: "#059669", amber: "#b45309", red: "#dc2626", violet: "#7c3aed", cyan: "#0891b2", pink: "#db2777", slate: "#475569" },
};

const isLight = () => typeof document !== "undefined" && document.documentElement.classList.contains("lp-light");
export const themeNow = () => (isLight() ? LIGHT : DARK);

/** Canvas colours for the current app theme (follows the light/dark switch live). */
export function useSimTheme(): SimTheme {
  const [light, setLight] = useState(isLight);
  useEffect(() => {
    const mo = new MutationObserver(() => setLight(isLight()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return light ? LIGHT : DARK;
}

export function useLatest<T>(v: T) {
  const r = useRef(v);
  r.current = v;
  return r;
}

/** Re-render a few times a second with a value read from refs (readouts, tables). */
export function useLive<T>(get: () => T, hz = 10): T {
  const g = useLatest(get);
  const [v, setV] = useState<T>(get);
  useEffect(() => {
    const id = window.setInterval(() => setV(g.current()), 1000 / hz);
    return () => window.clearInterval(id);
  }, [hz, g]);
  return v;
}

export type Pointer = { x: number; y: number; id: number; type: string };

/**
 * A canvas that redraws every frame. `render` gets the context in CSS pixels
 * and the frame time step (seconds, capped so a background tab can't explode a simulation).
 */
export const Stage: React.FC<{
  render: (ctx: Ctx, w: number, h: number, dt: number, t: number) => void;
  label: string;
  className?: string;
  cursor?: string;
  onDown?: (p: Pointer) => boolean | void;
  onMove?: (p: Pointer, dragging: boolean) => void;
  onUp?: (p: Pointer) => void;
}> = ({ render, label, className, cursor, onDown, onMove, onUp }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fn = useLatest({ render, onDown, onMove, onUp });
  const theme = useSimTheme();
  useEffect(() => { setHalo(theme.halo); }, [theme]);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let size = { w: 0, h: 0, dpr: 1 };
    let visible = true;
    const resize = () => {
      const el = wrap.current!;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size = { w: el.clientWidth, h: el.clientHeight, dpr };
      cv.width = Math.max(1, Math.round(size.w * dpr));
      cv.height = Math.max(1, Math.round(size.h * dpr));
      cv.style.width = `${size.w}px`;
      cv.style.height = `${size.h}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap.current!);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(wrap.current!);
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (visible && !document.hidden && size.w > 0) {
        ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
        ctx.clearRect(0, 0, size.w, size.h);
        fn.current.render(ctx, size.w, size.h, dt, now / 1000);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [fn]);

  // Pointer input in canvas pixels; touch drags don't scroll the page
  const down = useRef<number | null>(null);
  const at = (e: React.PointerEvent): Pointer => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, id: e.pointerId, type: e.pointerType };
  };
  return (
    <div ref={wrap} className={cn("relative h-full w-full overflow-hidden", className)}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        className="absolute inset-0 block touch-none select-none"
        style={{ cursor }}
        onPointerDown={(e) => { if (fn.current.onDown?.(at(e)) !== false && fn.current.onDown) { down.current = e.pointerId; canvas.current!.setPointerCapture(e.pointerId); } }}
        onPointerMove={(e) => fn.current.onMove?.(at(e), down.current === e.pointerId)}
        onPointerUp={(e) => { if (down.current === e.pointerId) { down.current = null; fn.current.onUp?.(at(e)); } }}
        onPointerCancel={() => { down.current = null; }}
      />
    </div>
  );
};

type Val = number | string | boolean;

/**
 * Settings kept in the address bar, so a teacher can set a simulation up and
 * share or assign that exact set-up. Unknown or out-of-range values fall back to the defaults.
 */
export function useSimParams<T extends Record<string, Val>>(defaults: T, limits: Partial<Record<keyof T, [number, number] | readonly string[]>> = {}) {
  const [search, setSearch] = useSearchParams();
  const [p, setP] = useState<T>(() => {
    const out = { ...defaults };
    for (const k of Object.keys(defaults) as (keyof T & string)[]) {
      const raw = search.get(k);
      if (raw === null) continue;
      const d = defaults[k];
      const lim = limits[k];
      if (typeof d === "number") {
        const n = Number(raw);
        if (isFinite(n) && (!Array.isArray(lim) || typeof lim[0] !== "number" || (n >= (lim as [number, number])[0] && n <= (lim as [number, number])[1]))) (out as Record<string, Val>)[k] = n;
      } else if (typeof d === "boolean") (out as Record<string, Val>)[k] = raw === "1" || raw === "true";
      else if (!lim || (lim as readonly string[]).includes(raw)) (out as Record<string, Val>)[k] = raw;
    }
    return out;
  });
  const timer = useRef(0);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const next = new URLSearchParams(search);
      for (const [k, v] of Object.entries(p)) {
        if (v === defaults[k]) next.delete(k);
        else next.set(k, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
      }
      if (next.toString() !== search.toString()) setSearch(next, { replace: true });
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);
  const set = useCallback((patch: Partial<T>) => setP((o) => ({ ...o, ...patch })), []);
  const reset = useCallback(() => setP(defaults), [defaults]);
  return [p, set, reset] as const;
}

/** Fixed-step integration: calls `step(h)` enough times to cover `dt × speed`. */
export const advance = (dt: number, speed: number, h: number, step: (h: number) => void, maxSteps = 2000) => {
  let left = dt * speed;
  let n = 0;
  while (left > 1e-9 && n < maxSteps) {
    const s = Math.min(h, left);
    step(s);
    left -= s;
    n++;
  }
};

/** Memoised list of numbers 0..n-1 (for rendering loops in JSX). */
export const useRange = (n: number) => useMemo(() => Array.from({ length: n }, (_, i) => i), [n]);
