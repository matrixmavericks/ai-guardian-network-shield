import { useCallback, useSyncExternalStore } from "react";

/**
 * Light / dark appearance for the student portal.
 * The choice is kept per browser and applied as `lp-light` on <html>; the CSS in
 * src/index.css only reacts on pages that render the portal (`.lp-app`).
 * index.html applies the saved choice before first paint, so there is no flash.
 */
export type Appearance = "dark" | "light";

const KEY = "refyn-portal-appearance";
const listeners = new Set<() => void>();

const read = (): Appearance => {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

let current: Appearance = typeof window === "undefined" ? "dark" : read();

const apply = (mode: Appearance) => {
  document.documentElement.classList.toggle("lp-light", mode === "light");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", mode === "light" ? "#F4F7FC" : "#050A18");
};

export const setAppearance = (mode: Appearance) => {
  current = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* private mode: still switch for this visit */
  }
  apply(mode);
  listeners.forEach((l) => l());
};

if (typeof window !== "undefined") {
  apply(current);
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    current = read();
    apply(current);
    listeners.forEach((l) => l());
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useAppearance = () => {
  const mode = useSyncExternalStore(subscribe, () => current, () => "dark" as Appearance);
  const toggle = useCallback(() => setAppearance(current === "light" ? "dark" : "light"), []);
  return { mode, setMode: setAppearance, toggle };
};

/**
 * Accent colours given as hex (subject themes, status colours) are tuned for navy.
 * Use this for text so they darken enough to read on white in the light appearance;
 * in dark it resolves to the colour unchanged.
 */
export const tone = (color: string) => `color-mix(in oklab, ${color} calc(100% - var(--lp-tone, 0%)), #0B1226)`;
