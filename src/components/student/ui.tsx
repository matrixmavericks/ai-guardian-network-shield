import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useSpotlight } from "@/components/landing/primitives";

/** A card surface with the cursor spotlight from the landing page. */
export const Panel: React.FC<{
  className?: string;
  children: React.ReactNode;
  delay?: number;
  as?: "div" | "section";
}> = ({ className, children, delay = 0, as: Tag = "section" }) => {
  const onMove = useSpotlight();
  return (
    <Tag
      onMouseMove={onMove}
      className={cn(
        "lp-spot lp-fade rounded-3xl border border-lp-line bg-gradient-to-b from-lp-surface to-lp-surface/60 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]",
        className,
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
    </Tag>
  );
};

export const PanelHead: React.FC<{
  title: string;
  meta?: React.ReactNode;
  icon?: React.ElementType;
  className?: string;
}> = ({ title, meta, icon: Icon, className }) => (
  <div className={cn("flex items-center justify-between gap-3", className)}>
    <h2 className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.01em] text-white">
      {Icon && <Icon className="h-4 w-4 text-lp-sky" />}
      {title}
    </h2>
    {meta && <div className="shrink-0 text-[12.5px] text-lp-mute">{meta}</div>}
  </div>
);

/** Counts smoothly from the current value to `target` whenever it changes. */
export const useCountUp = (target: number, duration = 900) => {
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (target - from) * eased);
      current.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
};

/** Circular progress ring; the arc sweeps in on mount. */
export const Ring: React.FC<{
  value: number;
  size?: number;
  stroke?: number;
  label?: React.ReactNode;
  className?: string;
  tone?: "blue" | "green" | "amber" | "red";
}> = ({ value, size = 72, stroke = 7, label, className, tone = "blue" }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const gradId = useRef(`ring-${Math.random().toString(36).slice(2)}`).current;
  const stops: Record<string, [string, string]> = {
    blue: ["#3B82F6", "#3FE9FF"],
    green: ["#10B981", "#34D399"],
    amber: ["#F59E0B", "#FBBF24"],
    red: ["#EF4444", "#F2706A"],
  };
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={stops[tone][0]} />
            <stop offset="100%" stopColor={stops[tone][1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--lp-line))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      {label !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center text-[14px] font-semibold tabular-nums text-white">{label}</div>
      )}
    </div>
  );
};

export const Bar: React.FC<{ value: number; className?: string; tone?: "blue" | "green" | "amber" | "red"; delay?: number }> = ({
  value,
  className,
  tone = "blue",
  delay = 0,
}) => {
  const fills = {
    blue: "from-lp-blue to-lp-cyan",
    green: "from-[#10B981] to-lp-green",
    amber: "from-[#F59E0B] to-[#FBBF24]",
    red: "from-[#EF4444] to-lp-red",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-lp-line", className)}>
      <div
        className={cn("lp-bar-in h-full rounded-full bg-gradient-to-r", fills[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, animationDelay: `${delay}ms` }}
      />
    </div>
  );
};

/** Colour and letter for a percentage grade (same thresholds as before). */
export const gradeTone = (pct: number): "green" | "blue" | "amber" | "red" =>
  pct >= 80 ? (pct >= 90 ? "green" : "blue") : pct >= 60 ? "amber" : "red";
export const gradeLabel = (pct: number) => (pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F");
export const gradeText = {
  green: "text-lp-green",
  blue: "text-lp-sky",
  amber: "text-[#FBBF24]",
  red: "text-lp-red",
};

export const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon: Icon, title, body, action, className }) => (
  <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-lp-line bg-lp-raised text-lp-sky">
      <Icon className="h-5 w-5" />
    </span>
    <p className="mt-4 text-[15px] font-medium text-white">{title}</p>
    {body && <p className="mt-1 max-w-[26rem] text-[13.5px] leading-relaxed text-lp-mute">{body}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ghostBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 text-[13.5px] font-medium text-white transition-all hover:border-white/25 hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-sky";

export const chip =
  "inline-flex items-center gap-1 rounded-full border border-lp-line bg-lp-raised/70 px-2.5 py-0.5 text-[11.5px] font-medium text-lp-soft";
