import React, { useEffect, useState } from "react";
import { BookMarked, Check, Download, Layers, RotateCcw, Shuffle, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlashSpec } from "./blocks";
import { Card, CardHead, chip, download, ghost, primary, safeName, useSaved } from "./ui";

type Saved = { queue: number[]; known: number[] };

const fresh = (n: number): Saved => ({ queue: [...Array(n).keys()], known: [] });

export const Flashcards: React.FC<{ spec: FlashSpec; storeKey: string; onSave?: (title: string, markdown: string) => void; onAsk?: (prompt: string) => void }> = ({ spec, storeKey, onSave, onAsk }) => {
  const n = spec.cards.length;
  const [saved, setSaved] = useSaved<Saved>(storeKey, fresh(n));
  const [flipped, setFlipped] = useState(false);
  const [history, setHistory] = useState<Saved[]>([]);
  const { queue, known } = saved;
  const current = queue[0];
  const card = current !== undefined ? spec.cards[current] : null;
  useEffect(() => setFlipped(false), [current]);

  const push = (next: Saved) => { setHistory((h) => [...h.slice(-20), saved]); setSaved(next); };
  const gotIt = () => push({ queue: queue.slice(1), known: [...known, current] });
  // "Again" puts the card back a few places later, so it comes round soon but not at once
  const again = () => { const rest = queue.slice(1); const at = Math.min(rest.length, 3); push({ queue: [...rest.slice(0, at), current, ...rest.slice(at)], known }); };
  const shuffle = () => push({ queue: [...queue].sort(() => Math.random() - 0.5), known });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card || (e.target as HTMLElement)?.closest("input, textarea, [contenteditable]")) return;
      const box = document.getElementById(`fc-${storeKey}`);
      if (!box || !box.matches(":hover, :focus-within")) return;
      if (e.key === " ") { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === "ArrowRight" && flipped) gotIt();
      else if (e.key === "ArrowLeft" && flipped) again();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const markdown = `# ${spec.title}\n\n${spec.cards.map((c) => `**${c.front}**  \n${c.back}`).join("\n\n")}\n`;
  const csv = spec.cards.map((c) => [c.front, c.back].map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\r\n");

  return (
    <Card>
      <CardHead icon={Layers} kind="Flashcards" title={spec.title}>
        <span className={chip}><Check className="h-3 w-3 text-emerald-400" /> {known.length}/{n}</span>
      </CardHead>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-lp-line"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${(known.length / n) * 100}%` }} /></div>

      {card ? (
        <div id={`fc-${storeKey}`} tabIndex={-1} className="mt-4 outline-none">
          <button type="button" onClick={() => setFlipped((f) => !f)} aria-label={flipped ? "Show the front" : "Show the answer"} className="group block w-full [perspective:1200px]">
            <div className={cn("relative h-48 w-full transition-transform duration-500 [transform-style:preserve-3d] sm:h-52", flipped && "[transform:rotateY(180deg)]")}>
              <div className="lp-keep absolute inset-0 flex flex-col items-center justify-center rounded-2xl p-6 text-center text-white [backface-visibility:hidden]" style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #3B5BDB 60%, #6D8BFF 100%)" }}>
                <p className="text-[20px] font-semibold leading-snug sm:text-[22px]">{card.front}</p>
                <p className="absolute bottom-3 text-[11px] text-white/70">Click or press space to flip</p>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-2xl border border-lp-sky/40 bg-lp-deep p-6 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-lp-sky">{card.front}</p>
                <p className="mt-2 text-[15.5px] leading-relaxed text-white">{card.back}</p>
              </div>
            </div>
          </button>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-lp-mute">{queue.length} left{flipped ? " · ← again, → got it" : ""}</p>
            <div className="flex gap-2">
              {history.length > 0 && <button type="button" aria-label="Undo" onClick={() => { setSaved(history[history.length - 1]); setHistory((h) => h.slice(0, -1)); }} className={ghost}><Undo2 className="h-4 w-4" /></button>}
              {flipped ? (
                <>
                  <button type="button" onClick={again} className="flex h-9 items-center gap-2 rounded-xl border border-amber-500/50 px-3 text-[13px] text-amber-300 hover:bg-amber-500/10"><RotateCcw className="h-4 w-4" /> Again</button>
                  <button type="button" onClick={gotIt} className="flex h-9 items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 text-[13px] font-medium text-emerald-300 hover:bg-emerald-500/25"><Check className="h-4 w-4" /> Got it</button>
                </>
              ) : (
                <button type="button" onClick={() => setFlipped(true)} className={primary}>Show answer</button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
          <p className="text-[16px] font-medium text-white">You know all {n} cards.</p>
          <p className="mt-1 text-[13px] text-lp-soft">Come back tomorrow and go through them again: spacing it out is what makes it stick.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => push(fresh(n))} className={primary}><RotateCcw className="h-4 w-4" /> Practise again</button>
            {onAsk && <button type="button" onClick={() => onAsk(`Quiz me on the flashcards "${spec.title}" with questions that make me apply them, not just recall them.`)} className={ghost}>Test me on these</button>}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-lp-line pt-3">
        <button type="button" onClick={shuffle} disabled={queue.length < 2} className={ghost}><Shuffle className="h-4 w-4" /> Shuffle</button>
        {onSave && <button type="button" onClick={() => onSave(spec.title, markdown)} className={ghost}><BookMarked className="h-4 w-4" /> Save to notebook</button>}
        <button type="button" onClick={() => download(`${safeName(spec.title)}.csv`, "﻿" + csv, "text/csv;charset=utf-8")} className={ghost} title="Import into Anki or Quizlet"><Download className="h-4 w-4" /> CSV for Anki/Quizlet</button>
      </div>
    </Card>
  );
};
