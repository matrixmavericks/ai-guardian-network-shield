import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUBJECTS, type SimMeta } from "./registry";
import { themeNow, useSimTheme } from "./kit/core";
import { setHalo, setQuiet } from "./kit/draw";

/** A still from the simulation itself, drawn when it scrolls into view. */
export const SimThumb: React.FC<{ meta: SimMeta; className?: string }> = ({ meta, className }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const theme = useSimTheme();
  useEffect(() => {
    const cv = canvas.current!;
    let done = false;
    const draw = () => meta.load().then((m) => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      const ctx = cv.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = themeNow();
      setHalo(t.halo);
      setQuiet(true);
      try { m.thumb(ctx, r.width, r.height, t); } catch { /* a still is decoration only */ } finally { setQuiet(false); }
    });
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !done) { done = true; draw(); } }, { rootMargin: "200px" });
    io.observe(cv);
    return () => io.disconnect();
  }, [meta, theme]);
  return <canvas ref={canvas} aria-hidden className={cn("block h-full w-full", className)} />;
};

/** Compact cards for a topic page or the Studio. */
export const SimStrip: React.FC<{ sims: SimMeta[]; className?: string }> = ({ sims, className }) => (
  <div className={cn("grid gap-3", className)} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
    {sims.map((s) => (
      <Link key={s.id} to={`/sims/${s.id}`} className="group overflow-hidden rounded-2xl border border-lp-line bg-lp-deep/40 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-lp-sky/50">
        <div className="h-[110px] overflow-hidden border-b border-lp-line bg-lp-deep"><SimThumb meta={s} className="transition-transform duration-700 group-hover:scale-[1.04]" /></div>
        <div className="p-3">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: SUBJECTS[s.subject].color }}>Simulation</p>
          <p className="mt-0.5 flex items-center justify-between gap-2 text-[14px] font-semibold text-white">{s.title}<ArrowRight className="h-4 w-4 shrink-0 text-lp-sky opacity-0 transition-opacity group-hover:opacity-100" /></p>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-lp-mute">{s.tagline}</p>
        </div>
      </Link>
    ))}
  </div>
);
