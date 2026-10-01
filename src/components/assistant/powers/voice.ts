import { useCallback, useEffect, useRef, useState } from "react";

// Talk to Refyn (speech recognition) and have replies read aloud (speech
// synthesis). Both run in the browser; nothing extra is sent anywhere by us.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Recognition = any;

const Ctor = (): (new () => Recognition) | null => {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const canListen = () => !!Ctor();
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Dictation into the composer: final text is appended; interim text is shown live. */
export function useDictation(onText: (finalText: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  const stop = useCallback(() => { rec.current?.stop(); }, []);
  const start = useCallback(() => {
    const C = Ctor();
    if (!C || rec.current) return;
    const r = new C();
    r.lang = navigator.language || "en-GB";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) cb.current(res[0].transcript.trim());
        else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onend = () => { rec.current = null; setListening(false); setInterim(""); };
    r.onerror = () => { rec.current = null; setListening(false); setInterim(""); };
    rec.current = r;
    try { r.start(); setListening(true); } catch { rec.current = null; }
  }, []);
  useEffect(() => () => rec.current?.abort?.(), []);
  return { listening, interim, start, stop, supported: canListen() };
}

/** Markdown and blocks → something worth hearing. */
export const speakable = (md: string) =>
  md
    .replace(/<<<\s*(QUIZ|FLASHCARDS|GRAPH|CHART|PLAN|ACTION|FILE|DECK)\b[\s\S]*?(<<<\s*END\s*\w+\s*>>>|$)/gi, (_, k: string) => ` (${k.toLowerCase()} shown on screen) `)
    .replace(/```[\s\S]*?```/g, " (code shown on screen) ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|.*\|\s*$/gm, "")
    .replace(/[#*_`>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Read one reply aloud at a time; returns the id being read. */
export function useSpeaker() {
  const [speaking, setSpeaking] = useState<string | null>(null);
  const stop = useCallback(() => { if (canSpeak()) window.speechSynthesis.cancel(); setSpeaking(null); }, []);
  const speak = useCallback((id: string, md: string) => {
    if (!canSpeak()) return;
    window.speechSynthesis.cancel();
    const text = speakable(md);
    if (!text) return;
    // Long replies are read in sentence-sized chunks (some browsers stop after ~15 s otherwise)
    const parts = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
    const chunks: string[] = [];
    for (const p of parts) { if (chunks.length && (chunks[chunks.length - 1] + p).length < 220) chunks[chunks.length - 1] += p; else chunks.push(p); }
    chunks.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(c);
      u.lang = navigator.language || "en-GB";
      u.rate = 1.02;
      if (i === chunks.length - 1) u.onend = () => setSpeaking((s) => (s === id ? null : s));
      window.speechSynthesis.speak(u);
    });
    setSpeaking(id);
  }, []);
  useEffect(() => () => { if (canSpeak()) window.speechSynthesis.cancel(); }, []);
  return { speaking, speak, stop, supported: canSpeak() };
}
