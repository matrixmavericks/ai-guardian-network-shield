import { useEffect, useRef, useState } from "react";

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Calls `onProgress` as the page scrolls through a tall, pinned section: 0
 * when its top reaches the top of the viewport, 1 when its bottom reaches the
 * bottom. Driven by scroll and resize events (no idle loop), outside React so
 * the page never re-renders while scrolling, and skipped while the section is
 * far off screen.
 */
export const usePinnedProgress = (ref: React.RefObject<HTMLElement>, onProgress: (p: number, raw: number) => void) => {
  const cb = useRef(onProgress);
  cb.current = onProgress;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = Number.NaN;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Far away: nothing to do
      if (r.bottom < -vh || r.top > 2 * vh) return;
      const span = Math.max(1, r.height - vh);
      const raw = -r.top / span;
      if (raw === last) return;
      last = raw;
      cb.current(clamp01(raw), raw);
    };
    const force = () => {
      last = Number.NaN;
      update();
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", force);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", force);
    };
  }, [ref]);
};

/** True once the element has come within `margin` of the viewport (stays true). */
export const useNear = (ref: React.RefObject<HTMLElement>, margin = "150% 0px") => {
  const [near, setNear] = useState(false);
  // Pick up the element whenever it appears (components may render nothing until their data loads)
  const [el, setEl] = useState<HTMLElement | null>(null);
  // Runs after every render on purpose; it only sets state when the element changes, so it can't loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ref.current !== el) setEl(ref.current);
  });
  useEffect(() => {
    if (!el || near) return;
    if (!("IntersectionObserver" in window)) return setNear(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: margin });
    io.observe(el);
    // Also check on scroll, for jumps (anchor links) and browsers that delay observers
    const factor = parseFloat(margin) / 100 || 0;
    const check = () => {
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      if (r.top < vh * (1 + factor) && r.bottom > -vh * factor) setNear(true);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", check);
    };
  }, [el, margin, near]);
  return near;
};

/** Whether this browser can draw WebGL at all. */
export const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};
