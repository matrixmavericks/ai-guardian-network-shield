import React, { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  className?: string;
  /** Extra classes for the <video>/<canvas> (e.g. a colour filter) */
  mediaClassName?: string;
};

// Frames are held in memory as canvases, so cap both size and count.
const MAX_WIDTH = 960;
const MAX_FRAMES = 150;

type Mode = "boomerang" | "loop" | "failed";

/**
 * Plays a video forward, captures its frames, then ping-pongs through them at
 * 30fps for a seamless loop. Falls back to a plain looping video on small
 * screens, with reduced motion, or when the host doesn't allow canvas capture
 * (CORS), and renders nothing if the video can't load at all.
 */
export default function BoomerangVideoBg({ src, className, mediaClassName = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLCanvasElement[]>([]);
  const [framesReady, setFramesReady] = useState(false);
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "loop";
    const small = window.matchMedia("(max-width: 767px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return small || reduced ? "loop" : "boomerang";
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video || mode !== "boomerang") return;

    const frames: HTMLCanvasElement[] = [];
    let capturing = true;
    let lastTime = -1;

    const finish = () => {
      if (!capturing) return;
      capturing = false;
      video.pause();
      if (frames.length > 1) {
        framesRef.current = frames;
        setFramesReady(true);
      } else {
        setMode("loop");
      }
    };

    const captureFrame = () => {
      if (!capturing || video.readyState < 2) return;
      if (video.currentTime === lastTime) return;
      lastTime = video.currentTime;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      const scale = Math.min(1, MAX_WIDTH / vw);
      const w = Math.round(vw * scale);
      const h = Math.round(vh * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      try {
        ctx.drawImage(video, 0, 0, w, h);
        ctx.getImageData(0, 0, 1, 1); // throws if the host didn't allow cross-origin capture
      } catch {
        capturing = false;
        setMode("loop");
        return;
      }
      frames.push(canvas);
      if (frames.length >= MAX_FRAMES) finish();
    };

    type VFCVideo = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
    };
    const vfcVideo = video as VFCVideo;
    const hasVFC = typeof vfcVideo.requestVideoFrameCallback === "function";

    let rafId = 0;
    const rafLoop = () => {
      captureFrame();
      if (capturing) rafId = requestAnimationFrame(rafLoop);
    };
    const vfcLoop = () => {
      captureFrame();
      if (capturing && vfcVideo.requestVideoFrameCallback) vfcVideo.requestVideoFrameCallback(vfcLoop);
    };

    const onLoaded = () => {
      video.play().catch(() => {});
      if (hasVFC) vfcVideo.requestVideoFrameCallback!(vfcLoop);
      else rafId = requestAnimationFrame(rafLoop);
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("ended", finish);
    if (video.readyState >= 1) onLoaded();

    return () => {
      capturing = false;
      cancelAnimationFrame(rafId);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("ended", finish);
    };
  }, [src, mode]);

  useEffect(() => {
    if (!framesReady) return;
    const canvas = displayCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    const frames = framesRef.current;
    if (!canvas || !ctx || frames.length === 0) return;

    canvas.width = frames[0].width;
    canvas.height = frames[0].height;

    let index = 0;
    let direction = 1;
    let last = performance.now();
    const interval = 1000 / 30;
    let rafId = 0;

    const render = (now: number) => {
      if (now - last >= interval) {
        last = now;
        ctx.drawImage(frames[index], 0, 0);
        index += direction;
        if (index >= frames.length - 1) {
          index = frames.length - 1;
          direction = -1;
        } else if (index <= 0) {
          index = 0;
          direction = 1;
        }
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [framesReady]);

  // Release captured frames on unmount
  useEffect(() => () => void (framesRef.current = []), []);

  if (mode === "failed") return null;

  return (
    <div className={className ?? "absolute inset-0 h-full w-full"}>
      <video
        key={mode}
        ref={videoRef}
        src={src}
        className={`h-full w-full object-cover ${mediaClassName}`}
        style={{ display: framesReady ? "none" : "block" }}
        muted
        playsInline
        autoPlay={mode === "loop"}
        loop={mode === "loop"}
        preload="auto"
        crossOrigin={mode === "boomerang" ? "anonymous" : undefined}
        onError={() => setMode((m) => (m === "boomerang" ? "loop" : "failed"))}
        aria-hidden
      />
      <canvas
        ref={displayCanvasRef}
        className={`h-full w-full object-cover ${mediaClassName}`}
        style={{ display: framesReady ? "block" : "none" }}
        aria-hidden
      />
    </div>
  );
}
