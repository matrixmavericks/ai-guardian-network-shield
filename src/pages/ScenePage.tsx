import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Drama, RotateCcw, Target, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { GemOrb, SpaceShell } from "@/components/spaces/ui";
import { SpaceChat } from "@/components/spaces/SpaceChat";
import { getWorld, paletteVars, type WorldBundle } from "@/components/spaces/spaces";

const CHAR_COLORS = ["violet", "amber", "aqua", "rose"] as const;

/** Play a World's role-play scene: the characters, the brief, and a debrief at the end. */
const ScenePage: React.FC = () => {
  const { id = "", sceneId = "" } = useParams();
  const [bundle, setBundle] = useState<WorldBundle | null | undefined>(undefined);
  const [run, setRun] = useState(0);
  const [brief, setBrief] = useState(false);
  useEffect(() => { getWorld(id).then(setBundle, () => setBundle(null)); }, [id]);

  const scene = bundle?.scenes.find((s) => s.id === sceneId);
  if (bundle === undefined) return <SpaceShell><div className="m-auto h-24 w-24 animate-pulse rounded-full bg-lp-raised" /></SpaceShell>;
  if (!bundle || !scene) {
    return (
      <SpaceShell>
        <div className="m-auto max-w-[420px] p-6 text-center">
          <GemOrb color="slate" emoji="🎭" size="lg" />
          <p className="mt-4 text-[17px] font-semibold text-white">This scene isn't available</p>
          <Link to={bundle ? `/world/${bundle.world.id}?tab=scenes` : "/worlds"} className="mt-4 inline-flex text-[13.5px] text-lp-sky hover:underline">Back</Link>
        </div>
      </SpaceShell>
    );
  }
  const { world } = bundle;
  const lead = scene.characters[0];

  const briefing = (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lp-mute">The scene</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-lp-soft">{scene.setting}</p>
      </div>
      {scene.role && (
        <div className="rounded-2xl border border-lp-sky/30 bg-lp-blue/10 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-lp-sky"><UserRound className="h-3.5 w-3.5" /> You play</p>
          <p className="mt-1 text-[13.5px] text-white">{scene.role}</p>
        </div>
      )}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lp-mute">Characters</p>
        <ul className="mt-2 space-y-2.5">
          {scene.characters.map((c, i) => (
            <li key={i} className="flex gap-3">
              <GemOrb color={CHAR_COLORS[i % 4]} emoji={c.emoji || "🎭"} size="sm" />
              <span className="min-w-0"><span className="block text-[13.5px] font-medium text-white">{c.name}</span><span className="line-clamp-3 block text-[12px] leading-relaxed text-lp-mute">{c.persona}</span></span>
            </li>
          ))}
        </ul>
      </div>
      {scene.goals.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-lp-mute"><Target className="h-3.5 w-3.5" /> Show that you can</p>
          <ul className="mt-2 space-y-1.5">
            {scene.goals.map((g, i) => <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-lp-soft"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-lp-amber" />{g}</li>)}
          </ul>
          <p className="mt-2 text-[11.5px] text-lp-mute">When you're done, press "End and debrief" to see how you did.</p>
        </div>
      )}
    </div>
  );

  return (
    <SpaceShell>
      <div aria-hidden className="sp-cover pointer-events-none absolute inset-x-0 top-0 h-[260px] opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)]" style={paletteVars(world.color)} />
      <header className="sp-keep relative z-[1] flex h-16 shrink-0 items-center gap-3 px-3 sm:px-5">
        <Link to={`/world/${world.id}?tab=scenes`} aria-label="Back to the World" className="flex h-9 w-9 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex -space-x-2.5">{scene.characters.slice(0, 3).map((c, i) => <GemOrb key={i} color={CHAR_COLORS[i % 4]} emoji={c.emoji || "🎭"} size="xs" />)}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-white">{scene.title}</p>
          <p className="truncate text-[12px] text-white/70">{world.emoji} {world.title}</p>
        </div>
        <button type="button" onClick={() => setRun((r) => r + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/25 px-2.5 text-[13px] text-white/85 hover:bg-white/10"><RotateCcw className="h-4 w-4" /><span className="hidden sm:inline">Restart</span></button>
      </header>
      <div className="relative z-[1] flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Phones: the brief folds away above the chat */}
          <div className="px-3 lg:hidden">
            <button type="button" onClick={() => setBrief((b) => !b)} aria-expanded={brief} className="flex w-full items-center gap-2 rounded-2xl border border-lp-line bg-lp-surface/80 px-3 py-2 text-left text-[13px] text-lp-soft backdrop-blur">
              <Drama className="h-4 w-4 text-lp-sky" /> <span className="flex-1">Scene brief{scene.goals.length ? ` · ${scene.goals.length} goals` : ""}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", brief && "rotate-180")} />
            </button>
            {brief && <div className="lp-fade mt-2 max-h-[40vh] overflow-y-auto rounded-2xl border border-lp-line bg-lp-surface/90 p-4">{briefing}</div>}
          </div>
          <SpaceChat
            key={run}
            className="flex-1"
            mode="scene"
            worldId={world.id}
            sceneId={scene.id}
            title={scene.title}
            subject={world.subject}
            who={{ name: lead?.name ?? "Scene", emoji: lead?.emoji ?? "🎭", color: "violet" }}
            characters={scene.characters}
            placeholder={scene.role ? `Speak or act as ${scene.role.split(/[,.]/)[0].replace(/^(a|an|the)\s+/i, "the ").slice(0, 60)}…` : "What do you say or do?"}
            fabSafe
          />
        </div>
        <aside className="hidden w-[330px] shrink-0 overflow-y-auto border-l border-lp-line/60 bg-lp-surface/40 p-5 backdrop-blur lg:block">{briefing}</aside>
      </div>
    </SpaceShell>
  );
};

export default ScenePage;
