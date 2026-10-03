import { useEffect } from "react";
import "lenis/dist/lenis.css";
import { prefersReducedMotion } from "./three/scroll";

/**
 * Weighted, smoothed wheel scrolling for the public pages, so the scroll-driven
 * scenes glide instead of stepping. Mouse and trackpad only: touch scrolling,
 * keyboard scrolling and reduced-motion settings stay native.
 */
export const useSmoothScroll = () => {
  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia?.("(pointer: fine)").matches) return;
    let lenis: { destroy: () => void } | null = null;
    let cancelled = false;
    import("lenis")
      .then(({ default: Lenis }) => {
        if (cancelled) return;
        lenis = new Lenis({ lerp: 0.11, autoRaf: true, anchors: { offset: -88 }, allowNestedScroll: true });
      })
      .catch(() => {
        /* native scrolling it is */
      });
    return () => {
      cancelled = true;
      lenis?.destroy();
    };
  }, []);
};
