import React, { useEffect, useRef, useState } from "react";
import { GraduationCap, Play, School } from "lucide-react";
import type HlsType from "hls.js";
import { cn } from "@/lib/utils";
import { useNear } from "@/components/landing/three/scroll";

// The two recorded walkthroughs, with chapters you can jump between. They're
// streamed in short pieces (HLS, public/media/videos/<id>/hls) because the host
// doesn't answer byte-range requests, which seeking needs and Safari requires.

type Chapter = { at: number; title: string; sub: string };
type Video = { id: "students" | "teachers"; label: string; length: string; chapters: Chapter[] };

const VIDEOS: Video[] = [
  {
    id: "students",
    label: "For students",
    length: "4 min 40 s",
    chapters: [
      { at: 0, title: "Getting started", sub: "Signing in, your overview and search" },
      { at: 36, title: "Your AI tutor", sub: "Guided help that makes you think" },
      { at: 84, title: "My subjects", sub: "Choose your subjects and study by topic" },
      { at: 144, title: "Learning paths", sub: "Step-by-step routes through a topic" },
      { at: 176, title: "Classes and assignments", sub: "Join a class and see what's due" },
      { at: 192, title: "Grades", sub: "Marks and goals for every subject" },
      { at: 210, title: "Portfolio", sub: "Projects that show what you can do" },
      { at: 226, title: "Messages", sub: "Chat with your teachers and classmates" },
      { at: 236, title: "Refyn Intelligence", sub: "Replay your thinking and plan ahead" },
      { at: 266, title: "Your way", sub: "Light or dark, and your settings" },
    ],
  },
  {
    id: "teachers",
    label: "For teachers",
    length: "7 min",
    chapters: [
      { at: 0, title: "Your Studio", sub: "Where you land every morning" },
      { at: 32, title: "Printables", sub: "Worksheets, tests and exit tickets, ready to print" },
      { at: 122, title: "Diagram lab", sub: "Accurate diagrams from a description" },
      { at: 156, title: "Your toolkit", sub: "Subject tools like the lab procedure designer" },
      { at: 188, title: "Library", sub: "Everything you've made, searchable" },
      { at: 202, title: "Every subject", sub: "Ideas and tools for each subject" },
      { at: 254, title: "Your classes", sub: "Hand-in queue, check-ins and class pulse" },
      { at: 292, title: "Marking", sub: "Keyboard-fast marking with saved comments" },
      { at: 316, title: "Planning", sub: "A full week's plan in one go" },
      { at: 338, title: "Your students", sub: "Messages with students and colleagues" },
      { at: 350, title: "AI and insights", sub: "Ask Refyn anything" },
      { at: 406, title: "Tell us", sub: "Send feedback straight from your Studio" },
    ],
  },
];

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const VideoWalkthrough: React.FC<{ initial?: Video["id"] }> = ({ initial = "students" }) => {
  const [which, setWhich] = useState<Video["id"]>(initial);
  const video = VIDEOS.find((v) => v.id === which)!;
  const player = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const near = useNear(box, "60% 0px");
  const hls = useRef<HlsType | null>(null);
  const ready = useRef(false);
  const streaming = useRef(false);
  const pending = useRef<number | null>(null);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const active = video.chapters.reduce((a, c, i) => (time >= c.at ? i : a), 0);

  useEffect(() => {
    setTime(0);
    setStarted(false);
  }, [which]);

  // Keep the playing chapter in view in the list (without moving the page)
  useEffect(() => {
    const ol = list.current;
    const li = ol?.children[active] as HTMLElement | undefined;
    if (!ol || !li || !started) return;
    const top = li.offsetTop - ol.offsetTop;
    if (top < ol.scrollTop || top + li.offsetHeight > ol.scrollTop + ol.clientHeight) ol.scrollTo({ top: top - 8, behavior: "smooth" });
  }, [active, started]);

  /** Play from `at` (or from where it is). Stays synchronous when it can, so phones count it as the tap that started playback. */
  const start = (at: number | null) => {
    const v = player.current;
    if (!v) return;
    setStarted(true);
    if (at !== null) setTime(at);
    if (!ready.current) {
      pending.current = at ?? 0;
      return;
    }
    if (at !== null) v.currentTime = at;
    if (hls.current && !streaming.current) {
      streaming.current = true;
      hls.current.startLoad(at ?? v.currentTime);
    }
    void v.play().catch(() => {});
  };
  const play = () => start(null);
  const jump = (at: number) => start(at);

  // Get the stream ready once the player is close to the screen (just the playlist; pieces load on play)
  useEffect(() => {
    const v = player.current;
    if (!near || !v) return;
    let cancelled = false;
    const src = `/media/videos/${video.id}/hls/index.m3u8`;
    const go = () => {
      ready.current = true;
      if (pending.current !== null) {
        const at = pending.current;
        pending.current = null;
        start(at);
      }
    };
    (async () => {
      try {
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;
        if (Hls.isSupported()) {
          const h = new Hls({ autoStartLoad: false, maxBufferLength: 30 });
          hls.current = h;
          h.on(Hls.Events.MANIFEST_PARSED, go);
          h.loadSource(src);
          h.attachMedia(v);
          return;
        }
      } catch {
        /* fall back to the browser's own player */
      }
      if (cancelled) return;
      v.src = v.canPlayType("application/vnd.apple.mpegurl") ? src : `/media/videos/${video.id}.mp4`;
      go();
    })();
    return () => {
      cancelled = true;
      hls.current?.destroy();
      hls.current = null;
      ready.current = false;
      streaming.current = false;
      pending.current = null;
    };
  }, [near, video.id]);

  return (
    <div>
      <div role="tablist" aria-label="Walkthrough" className="inline-flex rounded-full border border-lp-line bg-lp-surface/60 p-1">
        {VIDEOS.map((v) => {
          const Icon = v.id === "students" ? GraduationCap : School;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={which === v.id}
              onClick={() => setWhich(v.id)}
              className={cn(
                "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[14px] font-medium transition-colors sm:px-4",
                which === v.id ? "bg-[#ffffff] text-[#0b1226]" : "text-lp-soft hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" /> {v.label}
              <span className={cn("hidden text-[12px] font-normal sm:inline", which === v.id ? "text-[#0b1226]/60" : "text-lp-mute")}>{v.length}</span>
            </button>
          );
        })}
      </div>

      <div ref={box} className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative self-start overflow-hidden rounded-[24px] border border-lp-line bg-[#060b18] shadow-[0_40px_120px_-50px_rgba(29,78,216,0.6)]">
          <video
            key={video.id}
            ref={player}
            className="block aspect-video w-full bg-black"
            poster={`/media/videos/${video.id}-poster.webp`}
            controls
            playsInline
            preload="metadata"
            onPlay={() => setStarted(true)}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          />
          {!started && (
            <button
              type="button"
              onClick={play}
              aria-label={`Play the walkthrough ${video.label.toLowerCase()}`}
              className="group absolute inset-0 flex items-center justify-center bg-gradient-to-t from-[#020617]/55 via-transparent to-transparent"
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#ffffff]/95 text-[#0b1226] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105">
                <Play className="ml-1 h-8 w-8 fill-current" />
              </span>
            </button>
          )}
        </div>

        <div className="rounded-[24px] border border-lp-line bg-lp-surface/50 p-2">
          <p className="px-3 pb-2 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-lp-mute">{video.chapters.length} chapters</p>
          <ol ref={list} data-lenis-prevent className="max-h-[360px] space-y-1 overflow-y-auto pr-1 lg:max-h-[392px] [scrollbar-width:thin]">
            {video.chapters.map((c, i) => {
              const end = video.chapters[i + 1]?.at;
              const progress = i === active && started && end ? Math.min(1, (time - c.at) / (end - c.at)) : i < active && started ? 1 : 0;
              return (
                <li key={c.at}>
                  <button
                    type="button"
                    onClick={() => jump(c.at)}
                    aria-current={started && i === active ? "true" : undefined}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors",
                      started && i === active ? "bg-white/[0.08]" : "hover:bg-white/[0.05]",
                    )}
                  >
                    <span className="relative h-[54px] w-[96px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0b1226]">
                      <img src={`/media/videos/${video.id}/${String(i + 1).padStart(2, "0")}.webp`} alt="" loading="lazy" className="h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
                        <span className="block h-full bg-[#7ff3ff] transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={cn("truncate text-[14px] font-medium", started && i === active ? "text-white" : "text-lp-text")}>{c.title}</span>
                        <span className="ml-auto shrink-0 text-[12px] tabular-nums text-lp-mute">{clock(c.at)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-lp-mute">{c.sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default VideoWalkthrough;
