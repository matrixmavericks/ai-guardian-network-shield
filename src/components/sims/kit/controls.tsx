import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { fmt } from "./draw";

// Controls for the simulation panel: sliders you can also type into, segmented
// choices, switches, and readouts.

export const Group: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <section className={cn("space-y-3.5", className)}>
    {title && <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-lp-mute">{title}</p>}
    {children}
  </section>
);

export const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  digits?: number;
  onChange: (v: number) => void;
  hint?: string;
  color?: string;
  disabled?: boolean;
}> = ({ label, value, min, max, step = 0.1, unit, digits, onChange, hint, color, disabled }) => {
  const d = digits ?? Math.max(0, -Math.floor(Math.log10(step)));
  const [text, setText] = useState(value.toFixed(d));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setText(value.toFixed(d)); }, [value, d, editing]);
  const pct = ((value - min) / (max - min)) * 100;
  const commit = () => {
    setEditing(false);
    const n = Number(text);
    if (isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n / step) * step)));
  };
  return (
    <div className={cn(disabled && "pointer-events-none opacity-45")}>
      <div className="flex items-center justify-between gap-2">
        <label className="flex min-w-0 items-center gap-1.5 text-[13px] text-lp-soft">
          {color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />}
          <span className="truncate">{label}</span>
        </label>
        <span className="flex items-baseline gap-1">
          <input
            value={text}
            onFocus={() => setEditing(true)}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            inputMode="decimal"
            aria-label={`${label} value`}
            className="w-[64px] rounded-md border border-transparent bg-transparent px-1 text-right text-[13.5px] font-semibold tabular-nums text-white outline-none hover:border-lp-line focus:border-lp-sky/60 focus:bg-lp-deep/60"
          />
          {unit && <span className="text-[12px] text-lp-mute">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="sim-range mt-1.5 w-full"
        style={{ "--p": `${pct}%`, "--c": color ?? "rgb(var(--lp-blue))" } as React.CSSProperties}
      />
      {hint && <p className="mt-1 text-[11.5px] leading-snug text-lp-mute">{hint}</p>}
    </div>
  );
};

export const Choice = <T extends string>({ label, value, options, onChange, wrap }: { label?: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; wrap?: boolean }) => (
  <div>
    {label && <p className="mb-1.5 text-[13px] text-lp-soft">{label}</p>}
    <div role="radiogroup" aria-label={label} className={cn("flex gap-1 rounded-xl border border-lp-line bg-lp-deep/50 p-1", wrap ? "flex-wrap" : "overflow-x-auto")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("min-h-8 flex-1 shrink-0 whitespace-nowrap rounded-lg px-2.5 text-[12.5px] transition-colors", value === o.value ? "bg-lp-blue text-white shadow" : "text-lp-soft hover:text-white")}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

export const Switch: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string; color?: string }> = ({ label, checked, onChange, hint, color }) => (
  <div>
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 text-left">
      <span className="flex items-center gap-1.5 text-[13px] text-lp-soft">{color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}{label}</span>
      <span className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-lp-blue" : "bg-lp-raised ring-1 ring-inset ring-lp-line")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-[#ffffff] shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
      </span>
    </button>
    {hint && <p className="mt-1 text-[11.5px] leading-snug text-lp-mute">{hint}</p>}
  </div>
);

/** A value shown on top of the stage. */
export const Readout: React.FC<{ label: string; value: number | string; unit?: string; digits?: number; color?: string; big?: boolean }> = ({ label, value, unit, digits = 2, color, big }) => (
  <div className="min-w-0 rounded-xl border border-lp-line/70 bg-lp-surface/80 px-2.5 py-1.5 shadow-sm backdrop-blur-md">
    <p className="flex items-center gap-1.5 truncate text-[10.5px] font-medium uppercase tracking-[0.1em] text-lp-mute">{color && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />}{label}</p>
    <p className={cn("truncate font-semibold tabular-nums text-white", big ? "text-[20px]" : "text-[15px]")}>
      {typeof value === "number" ? fmt(value, digits) : value}
      {unit && <span className="ml-0.5 text-[11px] font-normal text-lp-mute">{unit}</span>}
    </p>
  </div>
);

export const Readouts: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("sim-readouts pointer-events-none absolute left-3 top-3 z-[2] flex max-w-[calc(100%-24px)] flex-wrap gap-1.5", className)}>{children}</div>
);

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" }> = ({ tone = "ghost", className, ...p }) => (
  <button
    type="button"
    {...p}
    className={cn(
      "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] transition-colors disabled:opacity-45",
      tone === "primary" ? "bg-lp-blue font-medium text-white hover:bg-[#2F6FE0]" : "border border-lp-line text-lp-soft hover:border-lp-sky/50 hover:text-white",
      className,
    )}
  />
);

/** Small coloured key under a graph or stage. */
export const Key: React.FC<{ items: { label: string; color: string; dash?: boolean }[] }> = ({ items }) => (
  <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-lp-mute">
    {items.map((i) => (
      <li key={i.label} className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded" style={{ background: i.dash ? `repeating-linear-gradient(90deg, ${i.color} 0 4px, transparent 4px 7px)` : i.color }} />
        {i.label}
      </li>
    ))}
  </ul>
);
