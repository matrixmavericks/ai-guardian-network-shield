import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { selectCls } from "@/components/subjects/kit";
import { themeFor } from "@/components/student/themes";
import { initialsOf, type TClass } from "./data";

/** Copies text and shows a tick for a moment. */
export const CopyButton: React.FC<{ text: string; label?: string; className?: string }> = ({ text, label = "Copy", className }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 1400);
        } catch {
          /* clipboard blocked: nothing to do */
        }
      }}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border border-lp-line px-2.5 text-[12px] font-medium text-lp-soft transition-colors hover:border-lp-sky/50 hover:text-white", className)}
    >
      {done ? <Check className="h-3.5 w-3.5 text-lp-green" /> : <Copy className="h-3.5 w-3.5" />} {done ? "Copied" : label}
    </button>
  );
};

export const PersonChip: React.FC<{ name: string; size?: number }> = ({ name, size = 36 }) => (
  <span
    className="lp-keep flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
    style={{ width: size, height: size, fontSize: size * 0.34, background: themeFor(name).gradient }}
  >
    {initialsOf(name)}
  </span>
);

export const ClassSelect: React.FC<{ classes: TClass[]; value: string; onChange: (v: string) => void; className?: string }> = ({ classes, value, onChange, className }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(selectCls, "w-full", className)} aria-label="Class">
    <option value="">Choose a class</option>
    {classes.map((c) => (
      <option key={c.id} value={c.id}>
        {c.name} · {c.subject}
      </option>
    ))}
  </select>
);

/** Standard header for teacher pages: eyebrow, title, one line and optional actions. */
export const PageHeader: React.FC<{ eyebrow: string; title: string; body?: string; actions?: React.ReactNode }> = ({ eyebrow, title, body, actions }) => (
  <header className="lp-fade mb-7 flex flex-wrap items-end justify-between gap-4" style={{ animationFillMode: "both" }}>
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">{eyebrow}</p>
      <h1 className="mt-1 text-[32px] font-semibold tracking-[-0.035em] text-white">{title}</h1>
      {body && <p className="mt-1 max-w-[640px] text-[14.5px] text-lp-soft">{body}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);
