import React from "react";
import { ArrowRight, Check, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpotlight } from "@/components/landing/primitives";
import { startDemo, type DemoRole } from "@/demo/session";
import { ROLE_INFO } from "@/demo/roles";
import { TOURS } from "@/demo/tours";

/** One side of the live demo: a real screenshot, what you'll try, and the two ways in. */
const RoleCard: React.FC<{ role: DemoRole; variant?: "demo" | "tour"; className?: string }> = ({ role, variant = "demo", className }) => {
  const info = ROLE_INFO[role];
  const spot = useSpotlight();
  const steps = TOURS[role];

  return (
    <article
      onMouseMove={spot}
      className={cn("lp-reveal lp-spot group relative flex flex-col overflow-hidden rounded-[28px] border border-lp-line bg-lp-surface/60 p-2.5 sm:p-3", className)}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] border border-white/10 bg-[#081028]">
        <img
          src={info.image}
          alt={`The ${info.label.toLowerCase()} side of the Refyn live demo`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-left-top transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.035]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050a18]/80 via-transparent to-transparent" />
        <span className="fx-glass absolute bottom-3.5 left-3.5 rounded-full px-3 py-1 text-[12.5px] text-white/90">{info.who}</span>
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-6 sm:px-5 sm:pb-5">
        <h2 className="text-[30px] font-normal leading-none tracking-[-0.035em] text-white sm:text-[36px]">{info.label}</h2>
        <p className="mt-3 max-w-[34rem] text-[15.5px] leading-[1.6] text-lp-soft">{info.blurb}</p>

        {variant === "demo" ? (
          <ul className="mt-5 space-y-2.5">
            {info.points.map((p) => (
              <li key={p} className="flex gap-2.5 text-[14.5px] leading-snug text-lp-text">
                <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-lp-cyan" /> {p}
              </li>
            ))}
          </ul>
        ) : (
          <ol className="mt-5 grid gap-x-5 gap-y-2 sm:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-2.5 text-[14px] leading-snug text-lp-text">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-lp-line text-[11px] tabular-nums text-lp-sky">{i + 1}</span>
                {s.title}
              </li>
            ))}
          </ol>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-7">
          <button type="button" onClick={() => startDemo(role, { tour: true })} className="lp-glow-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lp-sky">
            <span aria-hidden className="lp-glow-btn__blob" />
            <span className="lp-glow-btn__inner">
              <Compass aria-hidden className="h-4 w-4" />
              {variant === "tour" ? `Start the ${info.label.toLowerCase()} tour` : "Take the guided tour"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => startDemo(role)}
            className="group/link inline-flex items-center gap-1.5 text-[15px] font-medium text-lp-text transition-colors hover:text-lp-sky"
          >
            Explore on your own
            <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default RoleCard;
