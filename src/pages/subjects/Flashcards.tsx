import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Layers, PartyPopper, RotateCcw, Shuffle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { findTopic, type Flashcard, type Subject } from "@/content/myp";
import { Bar, EmptyState, Ring, chip, ghostBtn } from "@/components/student/ui";
import { ToolHeader, primaryBtn, selectCls, shuffle } from "@/components/subjects/kit";
import { useStudy } from "@/components/subjects/store";

type Card = Flashcard & { topicId: string };

export const Flashcards: React.FC<{ subject: Subject }> = ({ subject }) => {
  const [params] = useSearchParams();
  const study = useStudy();
  const { state } = study;
  const [scope, setScope] = useState(params.get("topic") || "all");
  const [onlyLearning, setOnlyLearning] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [seed, setSeed] = useState(0);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [session, setSession] = useState<Record<string, boolean>>({});

  const all = useMemo<Card[]>(
    () => subject.units.flatMap((u) => u.topics.flatMap((t) => t.flashcards.map((f) => ({ ...f, topicId: t.id })))),
    [subject],
  );
  const inScope = all.filter((c) => scope === "all" || c.topicId === scope || subject.units.find((u) => u.id === scope)?.topics.some((t) => t.id === c.topicId));

  // The deck is fixed when it's built, so rating a card doesn't reshuffle it.
  const deck = useMemo(() => {
    const base = onlyLearning ? inScope.filter((c) => state.cards[c.id] !== true) : inScope;
    return shuffled ? shuffle(base) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, onlyLearning, shuffled, seed, subject]);

  useEffect(() => {
    setI(0);
    setFlipped(false);
    setSession({});
  }, [deck]);

  const card = deck[i];
  const done = deck.length > 0 && i >= deck.length;
  const known = inScope.filter((c) => state.cards[c.id] === true).length;

  const rate = (ok: boolean) => {
    if (!card) return;
    study.rateCard(card.id, ok);
    setSession((s) => ({ ...s, [card.id]: ok }));
    setFlipped(false);
    setI((n) => n + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("input, textarea, select")) return;
      if (done || !card) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") {
        setFlipped(false);
        setI((n) => Math.min(deck.length, n + 1));
      } else if (e.key === "ArrowLeft") {
        setFlipped(false);
        setI((n) => Math.max(0, n - 1));
      } else if (flipped && e.key === "1") rate(false);
      else if (flipped && e.key === "2") rate(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const stillLearning = deck.filter((c) => session[c.id] === false);

  return (
    <>
      <ToolHeader subject={subject} title="Flashcards" body="Flip a card, then rate yourself honestly. Cards you're still learning come back." icon={Layers} accent="#F472B6" />

      <div className="lp-fade mt-6 flex flex-wrap items-center gap-2" style={{ animationFillMode: "both" }}>
        <label className="min-w-[220px] flex-1 sm:flex-none">
          <span className="sr-only">Deck</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className={cn(selectCls, "w-full sm:w-[300px]")}>
            <option value="all">All topics ({all.length} cards)</option>
            {subject.units.map((u, ui) => (
              <optgroup key={u.id} label={`Unit ${ui + 1}: ${u.title}`}>
                <option value={u.id}>All of {u.title}</option>
                {u.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-pressed={onlyLearning}
          onClick={() => setOnlyLearning((v) => !v)}
          className={cn("h-10 rounded-xl border px-3 text-[13px] font-medium transition-colors", onlyLearning ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white")}
        >
          Still learning only
        </button>
        <button
          type="button"
          aria-pressed={shuffled}
          onClick={() => {
            setShuffled((v) => !v);
            setSeed((s) => s + 1);
          }}
          className={cn("inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-medium transition-colors", shuffled ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white")}
        >
          <Shuffle className="h-3.5 w-3.5" /> Shuffle
        </button>
        <span className="ml-auto text-[12.5px] text-lp-mute">
          <span className="font-medium text-lp-green">{known}</span>/{inScope.length} known
        </span>
      </div>

      <div className="mx-auto mt-6 max-w-[720px]">
        {deck.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-lp-line">
            <EmptyState
              icon={PartyPopper}
              title="Every card here is known"
              body="Turn off 'Still learning only' to review the whole deck."
              action={
                <button type="button" onClick={() => setOnlyLearning(false)} className={ghostBtn}>
                  Show all cards
                </button>
              }
            />
          </div>
        ) : done ? (
          <div className="lp-fade rounded-3xl border border-lp-line bg-lp-surface/70 p-7 text-center" style={{ animationFillMode: "both" }}>
            <Ring value={((deck.length - stillLearning.length) / deck.length) * 100} size={96} stroke={8} tone="green" label={`${deck.length - stillLearning.length}/${deck.length}`} className="mx-auto" />
            <p className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-white">Deck complete</p>
            <p className="mt-1 text-[14px] text-lp-soft">
              {stillLearning.length ? `${stillLearning.length} card${stillLearning.length === 1 ? "" : "s"} still need work.` : "You knew every card. Brilliant."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {stillLearning.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setOnlyLearning(true);
                    setSeed((s) => s + 1);
                  }}
                  className={primaryBtn}
                >
                  <RotateCcw className="h-4 w-4" /> Review the {stillLearning.length} again
                </button>
              )}
              <button type="button" onClick={() => setSeed((s) => s + 1)} className={ghostBtn}>
                Restart deck
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <Bar value={(i / deck.length) * 100} tone="green" />
              <span className="shrink-0 text-[12.5px] tabular-nums text-lp-mute">
                {i + 1}/{deck.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? "Show question" : "Show answer"}
              className="group block w-full text-left [perspective:1400px] focus-visible:outline-none"
            >
              <div
                className={cn(
                  "relative h-[300px] w-full transition-transform duration-500 [transform-style:preserve-3d] sm:h-[320px]",
                  flipped && "[transform:rotateY(180deg)]",
                )}
                style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
              >
                <div className="absolute inset-0 flex flex-col rounded-3xl border border-lp-line bg-gradient-to-br from-lp-raised to-lp-surface p-6 shadow-[0_30px_80px_-40px_rgba(59,130,246,0.6)] [backface-visibility:hidden] group-focus-visible:border-lp-sky sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className={chip}>{findTopic(subject, card.topicId)?.topic.title}</span>
                    {state.cards[card.id] !== undefined && (
                      <span className={cn("text-[11.5px] font-medium", state.cards[card.id] ? "text-lp-green" : "text-[#FBBF24]")}>
                        {state.cards[card.id] ? "Known" : "Still learning"}
                      </span>
                    )}
                  </div>
                  <p className="my-auto text-center text-[20px] font-medium leading-snug tracking-[-0.01em] text-white sm:text-[23px]">{card.front}</p>
                  <p className="text-center text-[12px] text-lp-mute">Tap or press space to flip</p>
                </div>
                <div className="absolute inset-0 flex flex-col rounded-3xl border border-lp-sky/30 bg-gradient-to-br from-[#10244A] to-lp-surface p-6 [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-8">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-sky">Answer</p>
                  <p className="my-auto text-center text-[18px] leading-relaxed text-white sm:text-[20px]">{card.back}</p>
                  <p className="text-center text-[12px] text-lp-mute">How did you do?</p>
                </div>
              </div>
            </button>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setFlipped(false);
                  setI((n) => Math.max(0, n - 1));
                }}
                disabled={i === 0}
                className={cn(ghostBtn, "w-10 px-0")}
                aria-label="Previous card"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              {flipped ? (
                <div className="flex flex-1 justify-center gap-2">
                  <button type="button" onClick={() => rate(false)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[14px] font-medium text-[#FDE68A] transition-colors hover:bg-[#FBBF24]/20 sm:max-w-[200px]">
                    <X className="h-4 w-4" /> Still learning
                  </button>
                  <button type="button" onClick={() => rate(true)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-lp-green/40 bg-lp-green/10 text-[14px] font-medium text-[#A7F3D0] transition-colors hover:bg-lp-green/20 sm:max-w-[200px]">
                    <Check className="h-4 w-4" /> Got it
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setFlipped(true)} className={cn(primaryBtn, "h-11 flex-1 sm:max-w-[260px]")}>
                  Show answer
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setFlipped(false);
                  setI((n) => Math.min(deck.length, n + 1));
                }}
                className={cn(ghostBtn, "w-10 px-0")}
                aria-label="Skip card"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 hidden text-center text-[12px] text-lp-mute sm:block">Space to flip · 1 still learning · 2 got it · ← → to move</p>
          </>
        )}
      </div>
    </>
  );
};
