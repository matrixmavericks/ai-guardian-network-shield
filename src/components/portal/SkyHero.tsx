import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Ambient } from "@/components/focus/Ambient";
import { makeSky } from "./sky";

/** Glass buttons and chips that sit on the sky. */
export const skyBtn =
  "fx-glass inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-[14px] font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70";
export const skyChip = "fx-glass inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-white/90";

/**
 * The dashboard greeting on a live sky that follows the time of day where
 * the person is. Text stays white in both appearances.
 */
const SkyHero: React.FC<{
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  summary?: React.ReactNode;
  chips?: React.ReactNode;
  actions?: React.ReactNode;
  /** Pin the time (hours, 0-24); the device clock is used otherwise */
  hour?: number;
  className?: string;
}> = ({ eyebrow, title, summary, chips, actions, hour, className }) => {
  const make = useMemo(() => makeSky(hour), [hour]);
  return (
    <header
      className={cn(
        "sky-hero lp-keep lp-fade relative flex min-h-[230px] flex-col justify-end overflow-hidden rounded-[28px] border border-white/10 bg-[#0a1530] shadow-[0_30px_80px_-40px_rgba(2,6,23,0.9)] sm:min-h-[260px]",
        className,
      )}
    >
      <Ambient make={make} fps={30} />
      <div className="relative z-[1] flex flex-wrap items-end justify-between gap-6 px-6 pb-7 pt-10 sm:px-9 sm:pb-9">
        <div className="min-w-0 max-w-[44rem]">
          <p className="text-[12.5px] font-medium text-white/75">{eyebrow}</p>
          <h1 className="mt-2 text-[34px] font-normal leading-[1.02] tracking-[-0.045em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.35)] sm:text-[46px]">{title}</h1>
          {summary && <p className="mt-3 max-w-[40rem] text-[15px] leading-relaxed text-white/85">{summary}</p>}
          {chips && <div className="mt-4 flex flex-wrap items-center gap-2">{chips}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
    </header>
  );
};

export default SkyHero;
