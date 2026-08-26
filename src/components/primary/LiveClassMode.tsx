import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Eye, EyeOff,
  Minus, Plus, Trophy, Timer as TimerIcon,
} from "lucide-react";
import type { PrimaryGame } from "@/lib/mispPrimaryConfig";

export type BoardSlide = {
  kicker: string;
  headline: string;
  sub?: string;
  chips?: string[];
  /** hidden until the teacher reveals */
  reveal?: string;
  revealLabel?: string;
};

const DEFAULT_TEAMS = [
  { name: "Team Sun", emoji: "☀️" },
  { name: "Team Moon", emoji: "🌙" },
  { name: "Team Star", emoji: "⭐" },
];

/** Turn any generated game payload into a sequence of projector slides. */
export function buildBoardSlides(gameId: string, data: any): BoardSlide[] {
  if (!data) return [];
  try {
    switch (gameId) {
      case "word-wizard":
        return [
          {
            kicker: "Letter pool",
            headline: (data.letters || []).join("  "),
            sub: data.theme || "Build as many words as you can!",
          },
          ...(data.targetWords || []).map((w: string, i: number) => ({
            kicker: `Target word ${i + 1} of ${data.targetWords.length}`,
            headline: "How many letters?",
            sub: `${String(w).length} letters`,
            chips: data.letters || [],
            reveal: w,
            revealLabel: "The word",
          })),
          ...(data.bonusWord
            ? [{ kicker: "Bonus round", headline: "One wow-factor word…", reveal: data.bonusWord, revealLabel: "Bonus word" }]
            : []),
        ];
      case "number-ninja":
        return (data.missions || []).map((m: any, i: number) => ({
          kicker: `Mission ${i + 1} · ${m.level || ""}`,
          headline: m.question,
          sub: m.hint ? `Hint: ${m.hint}` : undefined,
          reveal: String(m.answer),
          revealLabel: "Answer",
        }));
      case "would-you-rather":
        return (data.prompts || []).map((p: any, i: number) => ({
          kicker: `Would you rather · ${i + 1}`,
          headline: `🅰️ ${p.a}`,
          sub: `🅱️ ${p.b}`,
          reveal: p.discussion,
          revealLabel: "Dig deeper",
        }));
      case "mystery-box":
        return [
          ...(data.clues || []).map((c: string, i: number) => ({
            kicker: `Clue ${i + 1} of ${data.clues.length}`,
            headline: c,
            sub: "What's in the box?",
          })),
          {
            kicker: "The big reveal",
            headline: "Ready?",
            reveal: `${data.answer}${data.celebration ? ` — ${data.celebration}` : ""}`,
            revealLabel: "It was",
          },
        ];
      case "kindness-quest":
        return (data.missions || []).map((m: any, i: number) => ({
          kicker: `Kindness mission ${i + 1}`,
          headline: m.title,
          sub: m.do,
          chips: m.learnerProfile ? [m.learnerProfile] : undefined,
          reveal: m.reflect,
          revealLabel: "Reflect",
        }));
      case "story-cubes":
        return [
          { kicker: "Character", headline: data.character },
          { kicker: "Setting", headline: data.setting },
          { kicker: "Object", headline: data.object },
          { kicker: "Problem", headline: data.problem },
          { kicker: "Twist", headline: data.twist },
          { kicker: "Feeling", headline: data.feeling },
          { kicker: "Your challenge", headline: data.challenge || "Write the story!" },
        ].filter((s) => !!s.headline);
      default:
        return [];
    }
  } catch {
    return [];
  }
}

interface Props {
  game: PrimaryGame;
  gameData: any;
  gradeBand: string;
  themeLabel?: string;
  onNewRound: () => void;
  onClose: () => void;
}

const LiveClassMode: React.FC<Props> = ({ game, gameData, gradeBand, themeLabel, onNewRound, onClose }) => {
  const slides = useMemo(() => buildBoardSlides(game.id, gameData), [game.id, gameData]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [scores, setScores] = useState<number[]>([0, 0, 0]);
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<number | null>(null);

  const slide = slides[index];

  useEffect(() => setRevealed(false), [index]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, Math.max(slides.length - 1, 0)));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      if (e.key === " ") {
        e.preventDefault();
        setRevealed((r) => !r);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, slides.length]);

  const bump = (i: number, delta: number) =>
    setScores((s) => s.map((v, idx) => (idx === i ? Math.max(0, v + delta) : v)));

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const leader = scores.indexOf(Math.max(...scores));
  const hasLeader = Math.max(...scores) > 0;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col animate-fade-in">
      {/* Ambient */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 20% 0%, hsl(var(--primary) / 0.18), transparent 70%), radial-gradient(60% 50% at 85% 100%, hsl(var(--accent) / 0.18), transparent 70%)",
        }}
      />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-6 py-4 border-b bg-card/60 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl">{game.emoji}</span>
          <div className="min-w-0">
            <p className="font-bold text-lg truncate">{game.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              Live Class Mode · {gradeBand}{themeLabel ? ` · ${themeLabel}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background/70">
            <TimerIcon className="h-4 w-4 text-primary" />
            <span className="font-mono text-lg font-bold tabular-nums">{mmss}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setRunning((r) => !r)}>
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setRunning(false); setSeconds(60); }}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8 text-center overflow-y-auto">
        {!slide ? (
          <div className="text-center">
            <p className="text-2xl font-bold">This round isn't board-ready yet.</p>
            <Button className="mt-4" onClick={onNewRound}>Generate a new round</Button>
          </div>
        ) : (
          <div key={index} className="max-w-5xl w-full animate-scale-in">
            <Badge variant="outline" className="mb-6 text-sm uppercase tracking-[0.2em] px-4 py-1.5">
              {slide.kicker}
            </Badge>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight text-foreground">
              {slide.headline}
            </h2>
            {slide.sub && (
              <p className="mt-6 text-xl md:text-3xl text-muted-foreground font-medium">{slide.sub}</p>
            )}
            {slide.chips && slide.chips.length > 0 && (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {slide.chips.map((c, i) => (
                  <div
                    key={i}
                    className="min-w-14 h-14 px-4 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center shadow-lg"
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
            {slide.reveal && (
              <div className="mt-10">
                {revealed ? (
                  <div className="inline-block rounded-3xl border-2 border-primary/40 bg-primary/10 px-8 py-6 animate-scale-in">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      {slide.revealLabel || "Reveal"}
                    </p>
                    <p className="text-3xl md:text-5xl font-extrabold">{slide.reveal}</p>
                  </div>
                ) : (
                  <Button size="lg" variant="outline" className="text-lg h-14 px-8" onClick={() => setRevealed(true)}>
                    <Eye className="h-5 w-5 mr-2" /> Reveal {slide.revealLabel?.toLowerCase() || ""}
                  </Button>
                )}
                {revealed && (
                  <div className="mt-3">
                    <Button size="sm" variant="ghost" onClick={() => setRevealed(false)}>
                      <EyeOff className="h-4 w-4 mr-1" /> Hide
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom: teams + nav */}
      <div className="relative border-t bg-card/60 backdrop-blur px-6 py-4">
        <div className="flex flex-col lg:flex-row items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {DEFAULT_TEAMS.map((t, i) => (
              <div
                key={t.name}
                className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2 transition-all ${
                  hasLeader && leader === i ? "border-primary bg-primary/10 scale-105" : "bg-background/70"
                }`}
              >
                <span className="text-xl">{t.emoji}</span>
                <div className="text-left">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground leading-none">{t.name}</p>
                  <p className="text-2xl font-extrabold leading-tight tabular-nums">{scores[i]}</p>
                </div>
                <div className="flex flex-col gap-1 ml-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => bump(i, 1)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => bump(i, -1)}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {hasLeader && (
              <Badge className="gap-1"><Trophy className="h-3.5 w-3.5" /> {DEFAULT_TEAMS[leader].name} leads</Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <span className="text-sm font-mono text-muted-foreground tabular-nums">
              {slides.length ? index + 1 : 0} / {slides.length}
            </span>
            {index < slides.length - 1 ? (
              <Button onClick={() => setIndex((i) => i + 1)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={onNewRound}>🎲 New round</Button>
            )}
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          Tip: ← → to move · Space to reveal · Esc to exit
        </p>
      </div>
    </div>
  );
};

export default LiveClassMode;
