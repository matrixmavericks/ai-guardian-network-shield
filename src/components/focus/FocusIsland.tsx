import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Pause, Play, RotateCcw, Square, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { sceneById } from "./scenes";
import { clock, focus, isLive, planOf, useFocus, useLeft } from "./store";

/**
 * A floating "island" at the top of every portal page while a focus session
 * (or its sound) is running, so the timer is never more than a glance away.
 * Hover or focus it to see what you're working on and more controls.
 */
const FocusIsland: React.FC = () => {
  const s = useFocus();
  const left = useLeft(s);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (pathname === "/focus" || !isLive(s)) return null;

  const sc = sceneById(s.scene);
  const tint = sc.tint;
  const plan = planOf(s.plan);
  const session = s.status !== "idle";
  const p = s.status === "done" ? 1 : s.total ? 1 - left / s.total : 0;
  const label =
    s.status === "done" ? "Time's up" : !session ? "Sound" : s.status === "paused" ? "Paused" : s.phase === "break" ? "Break" : plan.kind === "single" ? "Timer" : "Focus";
  const r = 15, c = 2 * Math.PI * r;
  const go = () => navigate("/focus");
  const end = () => {
    focus.reset();
    focus.toggleSound(false);
  };

  return createPortal(
    <div className="pointer-events-none fixed left-1/2 top-[max(10px,env(safe-area-inset-top))] z-[70] -translate-x-1/2 font-ui">
      <div
        className="lp-keep fx-island-in pointer-events-auto"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
      >
        <div
          role="status"
          aria-label={session ? `${label}: ${clock(left)} left` : `${sc.name} sound playing`}
          className={cn(
            "fx-island flex items-center gap-2 rounded-full bg-[#05080f]/90 py-1.5 pl-1.5 pr-2 text-white ring-1 ring-white/10 backdrop-blur-xl",
            s.status === "done" ? "shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_18px_50px_-12px_rgba(0,0,0,0.75)]" : "shadow-[0_18px_50px_-12px_rgba(0,0,0,0.75)]",
          )}
          style={{ boxShadow: s.status === "done" ? `0 0 0 2px ${tint}88, 0 18px 50px -12px rgba(0,0,0,0.75)` : undefined }}
        >
          <button type="button" onClick={go} aria-label="Open the Focus room" className="relative h-9 w-9 shrink-0 rounded-full">
            <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full" aria-hidden>
              <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2.4" />
              {session && (
                <circle cx="18" cy="18" r={r} fill="none" stroke={tint} strokeWidth="2.4" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 18 18)" style={{ transition: "stroke-dasharray 0.3s linear" }} />
              )}
            </svg>
            <span
              className={cn("absolute inset-[7px] rounded-full", s.status === "running" && "fx-pulse")}
              style={{ background: `radial-gradient(circle at 35% 30%, #ffffff, ${tint} 55%, ${tint}55)`, ["--c" as string]: `${tint}66` }}
            />
          </button>
          <button type="button" onClick={go} className="min-w-[64px] text-left" tabIndex={-1}>
            {session ? (
              <span className="block text-[15px] font-semibold leading-none tabular-nums tracking-[-0.01em]">{s.status === "done" ? "0:00" : clock(left)}</span>
            ) : (
              <span className="fx-eq flex h-[15px] items-end gap-[2px]" style={{ color: tint }}>
                <span />
                <span />
                <span />
              </span>
            )}
            <span className="mt-1 block text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-white/55">{label}</span>
          </button>

          <div className={cn("flex items-center gap-1 overflow-hidden transition-[max-width,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", open ? "max-w-[340px] opacity-100" : "max-w-0 opacity-0")}>
            {s.intent && <span className="mx-1 max-w-[180px] truncate text-[12.5px] text-white/75">{s.intent}</span>}
            <button
              type="button"
              onClick={() => focus.toggleSound()}
              aria-label={s.soundOn ? "Mute" : "Play sound"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            >
              {s.soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button type="button" onClick={end} aria-label="End session" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          </div>

          {session &&
            (s.status === "done" ? (
              <button type="button" onClick={focus.start} aria-label="Start again" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#0b1226]" style={{ background: tint }}>
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={focus.toggle}
                aria-label={s.status === "running" ? "Pause" : "Resume"}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                {s.status === "running" ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
              </button>
            ))}
          {!session && (
            <button type="button" onClick={() => focus.toggleSound(false)} aria-label="Stop sound" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default FocusIsland;
