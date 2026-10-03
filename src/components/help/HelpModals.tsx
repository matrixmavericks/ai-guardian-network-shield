import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Play, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWalkthrough } from "@/components/demo/useWalkthrough";
import type { HelpItem } from "@/help/types";

// The help centre's two pop-ups: a clip from a walkthrough video, and a mini
// demo (the real portal in a frame, with a short walkthrough for one question).

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const Shell: React.FC<{ title: string; label: string; onClose: () => void; wide?: boolean; children: React.ReactNode; actions?: React.ReactNode }> = ({
  title,
  label,
  onClose,
  wide,
  children,
  actions,
}) => {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      data-lenis-prevent
      className="lp-keep fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/80 p-0 backdrop-blur-md sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={cn("lp-fade flex h-full w-full flex-col overflow-hidden border-white/10 bg-[#070d1d] text-white shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] sm:h-auto sm:max-h-full sm:rounded-[24px] sm:border", wide ? "sm:w-[min(1240px,100%)]" : "sm:w-[min(960px,100%)]")}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <p className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{title}</p>
          {actions}
          <button ref={close} type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

/** A clip from one of the walkthroughs: plays from `from` and stops at `to`. */
export const ClipModal: React.FC<{ item: HelpItem; onClose: () => void }> = ({ item, onClose }) => {
  const clip = item.video!;
  const video = useRef<HTMLVideoElement>(null);
  const start = useWalkthrough(video, clip.id, true);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [free, setFree] = useState(false);

  // Try to start straight away; phones may want a tap first
  useEffect(() => {
    start(clip.from);
  }, [start, clip.from]);

  return (
    <Shell
      title={item.q}
      label={`Video: ${item.q}`}
      onClose={onClose}
      actions={<span className="hidden shrink-0 text-[12.5px] text-white/50 sm:inline">{clip.id === "students" ? "Student" : "Teacher"} walkthrough · {clock(clip.from)}–{clock(clip.to)}</span>}
    >
      <div className="relative flex flex-1 items-center bg-black">
        <video
          ref={video}
          className="block aspect-video w-full bg-black"
          poster={`/media/videos/${clip.id}-poster.webp`}
          controls
          playsInline
          preload="metadata"
          onPlaying={() => {
            setPlaying(true);
            setEnded(false);
          }}
          onTimeUpdate={(e) => {
            if (!free && e.currentTarget.currentTime >= clip.to) {
              e.currentTarget.pause();
              setEnded(true);
            }
          }}
        />
        {(!playing || ended) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-t from-[#020617]/80 via-[#020617]/30 to-transparent">
            {ended ? (
              <>
                <p className="text-[15px] font-medium">That's the part about this question.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => (setEnded(false), start(clip.from))} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-[14px] hover:bg-white/10">
                    <RotateCcw className="h-4 w-4" /> Replay
                  </button>
                  <button type="button" onClick={() => (setFree(true), setEnded(false), start(null))} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3b82f6] px-4 text-[14px] font-medium hover:bg-[#2f6fe0]">
                    <Play className="h-4 w-4" /> Keep watching
                  </button>
                </div>
              </>
            ) : (
              <button type="button" onClick={() => start(clip.from)} aria-label="Play the clip" className="flex h-20 w-20 items-center justify-center rounded-full bg-[#ffffff]/95 text-[#0b1226] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] transition-transform hover:scale-105">
                <Play className="ml-1 h-8 w-8 fill-current" />
              </button>
            )}
          </div>
        )}
      </div>
      <p className="border-t border-white/10 px-4 py-3 text-[13.5px] leading-relaxed text-white/70 sm:px-5">{item.a.replace(/\*\*/g, "")}</p>
    </Shell>
  );
};

const VW = 1280;
const VH = 800;

/** The real portal in demo mode, framed, with a short walkthrough for one question. */
export const MiniDemoModal: React.FC<{ item: HelpItem; onClose: () => void }> = ({ item, onClose }) => {
  const demo = item.demo!;
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const src = `${demo.path}${demo.path.includes("?") ? "&" : "?"}embed=${demo.role}&mini=${encodeURIComponent(item.id)}`;

  // On wide screens show the desktop app scaled down; on phones, the phone layout at full size
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      if (window.innerWidth < 900) return setScale(null);
      const w = el.clientWidth;
      const h = Math.max(320, window.innerHeight - 150);
      setScale(Math.min(w / VW, h / VH, 1));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "refyn-mini-close") onClose();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onClose]);

  return (
    <Shell
      title={item.q}
      label={`Mini demo: ${item.q}`}
      onClose={onClose}
      wide
      actions={
        <a href="/demo" className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-white/12 px-3 py-1.5 text-[12.5px] text-white/80 hover:bg-white/10 sm:inline-flex">
          Full demo <ExternalLink className="h-3.5 w-3.5" />
        </a>
      }
    >
      <div ref={box} className="relative flex flex-1 justify-center overflow-hidden bg-[#050a18]">
        <div className="relative" style={scale ? { width: VW * scale, height: VH * scale } : { width: "100%", height: "100%" }}>
          <iframe
            title={`Refyn demo: ${item.q}`}
            src={src}
            onLoad={() => window.setTimeout(() => setLoaded(true), 600)}
            className="absolute left-0 top-0 border-0 bg-[#050a18]"
            style={scale ? { width: VW, height: VH, transform: `scale(${scale})`, transformOrigin: "0 0" } : { width: "100%", height: "100%" }}
          />
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-[13.5px] text-white/60">
              <Loader2 className="h-5 w-5 animate-spin text-[#7ff3ff]" /> Opening the demo…
            </div>
          )}
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-2.5 text-[12.5px] text-white/50 sm:px-5">The real Refyn on sample data. Click anything; nothing is saved.</p>
    </Shell>
  );
};
