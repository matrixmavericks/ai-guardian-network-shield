import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Orbit } from "lucide-react";
import { cn } from "@/lib/utils";
import { classStats, studentRows, type TeacherData } from "@/components/teacher/data";
import { hasWebGL, prefersReducedMotion, useNear } from "@/components/landing/three/scroll";
import type { GalaxyHandle, GalaxyHover, GalaxyLabel, GalaxyPlanet } from "./galaxyScene";

// "Your classes" as a galaxy on the teacher dashboard: a planet per class, a
// moon per student, coloured by who needs a check-in.

const DAY = 86_400_000;

const ClassGalaxy: React.FC<{ data: TeacherData }> = ({ data }) => {
  const navigate = useNavigate();
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labelEls = useRef<Record<string, HTMLDivElement | null>>({});
  const handle = useRef<GalaxyHandle | null>(null);
  const near = useNear(wrap, "60% 0px");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tip, setTip] = useState<{ h: GalaxyHover; x: number; y: number }>({ h: null, x: 0, y: 0 });

  const planets: GalaxyPlanet[] = useMemo(() => {
    const now = Date.now();
    const stats = classStats(data);
    const rows = studentRows(data);
    return stats.slice(0, 6).map((s) => ({
      id: s.cls.id,
      name: s.cls.name,
      subject: s.cls.subject ?? "",
      handIn: s.handIn,
      toMark: s.toMark,
      moons: rows
        .filter((r) => r.classIds.includes(s.cls.id))
        .map((r) => {
          const since = r.lastHandIn ? (now - new Date(r.lastHandIn).getTime()) / DAY : 30;
          return {
            id: r.student.id,
            name: r.student.name,
            status: r.risk >= 3 ? ("risk" as const) : r.risk >= 1.5 ? ("watch" as const) : ("ok" as const),
            activity: Math.max(0.15, Math.min(1, 1 - since / 21)),
            note: r.reasons.length ? r.reasons.map((x) => x.text).join(" · ") : "On track",
          };
        }),
    }));
  }, [data]);
  const key = planets.map((p) => `${p.id}:${p.moons.map((m) => m.id + m.status).join("")}`).join("|");
  const counts = useMemo(() => {
    const all = planets.flatMap((p) => p.moons);
    return { ok: all.filter((m) => m.status === "ok").length, watch: all.filter((m) => m.status === "watch").length, risk: all.filter((m) => m.status === "risk").length };
  }, [planets]);

  useEffect(() => {
    if (!near || !canvas.current || !planets.length) return;
    if (!hasWebGL()) return setFailed(true);
    let cancelled = false;
    const place = (labels: Record<string, GalaxyLabel>) => {
      for (const [id, l] of Object.entries(labels)) {
        const el = labelEls.current[id];
        if (el) el.style.transform = `translate3d(${l.x}px, ${l.y}px, 0) translate(-50%, -100%)`;
      }
    };
    (async () => {
      try {
        const { createGalaxy } = await import("./galaxyScene");
        if (cancelled || !canvas.current) return;
        handle.current = createGalaxy(
          canvas.current,
          planets,
          {
            onHover: (h, x, y) => setTip({ h, x, y }),
            onOpen: (h) => {
              if (h?.kind === "moon") navigate(`/grades?student=${h.moon.id}`);
              else if (h?.kind === "planet") navigate(`/class/${h.planet.id}`);
            },
            onLabels: place,
          },
          { reduced: prefersReducedMotion(), small: window.innerWidth < 768 },
        );
        setReady(true);
      } catch {
        setFailed(true);
      }
    })();
    const io = new IntersectionObserver(([e]) => handle.current?.setActive(e.isIntersecting));
    if (wrap.current) io.observe(wrap.current);
    return () => {
      cancelled = true;
      io.disconnect();
      handle.current?.dispose();
      handle.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, key]);

  if (!planets.length) return null;

  return (
    <section ref={wrap} aria-labelledby="galaxy-title" className="lp-keep relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(ellipse_at_50%_30%,#0e1d44,#03060f_70%)] text-white">
      <div className="relative h-[640px] sm:h-[460px]">
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Your classes as planets with students as moons: ${counts.ok} on track, ${counts.watch} worth a look, ${counts.risk} who need a check-in.`}
          className={cn("absolute inset-0 h-full w-full transition-opacity duration-1000", ready ? "opacity-100" : "opacity-0")}
        />
        <div className="pointer-events-none absolute inset-0">
          {planets.map((p) => (
            <div key={p.id} ref={(el) => (labelEls.current[p.id] = el)} className={cn("absolute left-0 top-0 text-center", !ready && "hidden")}>
              <p className="whitespace-nowrap text-[13px] font-semibold text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.8)]">{p.name}</p>
              <p className="hidden whitespace-nowrap text-[11px] text-white/60 [text-shadow:0_1px_10px_rgba(0,0,0,0.8)] sm:block">
                {p.moons.length} students{p.handIn !== null ? ` · ${Math.round(p.handIn)}% handed in` : ""}
                {p.toMark ? ` · ${p.toMark} to mark` : ""}
              </p>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7ff3ff]">
              <Orbit className="h-3.5 w-3.5" /> Class galaxy
            </p>
            <h2 id="galaxy-title" className="mt-1.5 text-[22px] font-medium tracking-[-0.025em] sm:text-[26px]">
              Every class, every student, at a glance.
            </h2>
          </div>
          <ul className="fx-glass flex flex-wrap items-center gap-3 rounded-full px-3.5 py-1.5 text-[12px] text-white/85">
            <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#34d399]" /> {counts.ok} on track</li>
            <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#fbbf24]" /> {counts.watch} worth a look</li>
            <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f2706a]" /> {counts.risk} need a check-in</li>
          </ul>
        </div>
        <p className="pointer-events-none absolute inset-x-4 bottom-4 hidden text-center text-[11.5px] text-white/50 sm:block">The ring around each planet fills with its hand-in rate. Click a moon to open that student.</p>

        {tip.h && (
          <div className="fx-glass pointer-events-none absolute z-20 max-w-[16rem] rounded-xl px-3 py-2 text-[12.5px]" style={{ left: Math.min(tip.x + 14, (canvas.current?.clientWidth ?? 600) - 260), top: tip.y + 14 }}>
            {tip.h.kind === "moon" ? (
              <>
                <p className="font-semibold">{tip.h.moon.name}</p>
                <p className="text-white/65">{tip.h.planet.name}</p>
                <p className="mt-1 text-white/85">{tip.h.moon.note}</p>
              </>
            ) : (
              <>
                <p className="font-semibold">{tip.h.planet.name}</p>
                <p className="text-white/65">
                  {tip.h.planet.moons.length} students · {tip.h.planet.toMark} to mark
                </p>
                <p className="mt-1 text-white/85">Click to open the class</p>
              </>
            )}
          </div>
        )}
        {!ready && !failed && <p aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] uppercase tracking-[0.2em] text-white/45">{near ? "Charting your classes…" : ""}</p>}
        {failed && <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-[14px] text-white/70">The class galaxy needs WebGL, which this browser has turned off.</div>}
      </div>
    </section>
  );
};

export default ClassGalaxy;
