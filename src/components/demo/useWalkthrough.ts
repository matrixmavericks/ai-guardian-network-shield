import { useCallback, useEffect, useRef } from "react";
import type HlsType from "hls.js";

export type WalkthroughId = "students" | "teachers";

/**
 * Streams one of the recorded walkthroughs into a <video> once `enabled`.
 * They're cut into short pieces (HLS, public/media/videos/<id>/hls) because
 * the host doesn't answer byte-range requests, which MP4 seeking needs and
 * Safari requires. Browsers that play HLS themselves (Safari, iOS, Android)
 * get it directly; the rest use hls.js; the MP4 is the last resort.
 *
 * Returns `start(at)`: play from `at` seconds (or from where it is). It stays
 * synchronous when the stream is ready, so phones count it as the tap that
 * started playback; otherwise it plays as soon as the stream is ready.
 */
export function useWalkthrough(video: React.RefObject<HTMLVideoElement>, id: WalkthroughId, enabled: boolean) {
  const hls = useRef<HlsType | null>(null);
  const ready = useRef(false);
  const streaming = useRef(false);
  const pending = useRef<number | null>(null);

  const start = useCallback(
    (at: number | null) => {
      const v = video.current;
      if (!v) return;
      if (!ready.current) {
        pending.current = at ?? 0;
        return;
      }
      if (at !== null) {
        if (v.readyState >= 1) v.currentTime = at;
        else v.addEventListener("loadedmetadata", () => (v.currentTime = at), { once: true });
      }
      if (hls.current && !streaming.current) {
        streaming.current = true;
        hls.current.startLoad(at ?? v.currentTime);
      }
      void v.play().catch(() => {});
    },
    [video],
  );

  useEffect(() => {
    const v = video.current;
    if (!enabled || !v) return;
    let cancelled = false;
    const src = `/media/videos/${id}/hls/index.m3u8`;
    const go = () => {
      ready.current = true;
      if (pending.current !== null) {
        const at = pending.current;
        pending.current = null;
        start(at);
      }
    };
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = src;
      go();
    } else {
      (async () => {
        try {
          const { default: Hls } = await import("hls.js");
          if (cancelled) return;
          if (Hls.isSupported()) {
            // Needed where hls.js runs on Apple's ManagedMediaSource
            v.disableRemotePlayback = true;
            const h = new Hls({ autoStartLoad: false, maxBufferLength: 30 });
            hls.current = h;
            h.on(Hls.Events.MANIFEST_PARSED, go);
            h.loadSource(src);
            h.attachMedia(v);
            return;
          }
        } catch {
          /* fall back to the MP4 */
        }
        if (cancelled) return;
        v.src = `/media/videos/${id}.mp4`;
        go();
      })();
    }
    return () => {
      cancelled = true;
      hls.current?.destroy();
      hls.current = null;
      ready.current = false;
      streaming.current = false;
      pending.current = null;
    };
  }, [enabled, id, video, start]);

  return start;
}
