import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useTeacherData } from "@/components/teacher/data";
import { COLORS, EMOJI_CHOICES, PALETTE, paletteVars, type SpaceColor, type Visibility } from "./spaces";

export const primary = "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-lp-blue px-4 text-[13.5px] font-medium text-white shadow-[0_8px_24px_-12px_rgba(59,130,246,0.9)] hover:bg-[#2F6FE0] disabled:opacity-50";
export const ghost = "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-lp-line px-3.5 text-[13.5px] text-lp-soft hover:border-lp-blue/50 hover:text-white disabled:opacity-50";
export const field = "w-full rounded-xl border border-lp-line bg-lp-deep/60 px-3 py-2.5 text-[14px] text-white outline-none placeholder:text-lp-mute focus:border-lp-sky/60 focus:ring-2 focus:ring-lp-blue/20";
export const label = "text-[12.5px] font-medium text-lp-soft";

const SIZES = { xs: "h-7 w-7 text-[14px]", sm: "h-10 w-10 text-[19px]", md: "h-14 w-14 text-[26px]", lg: "h-20 w-20 text-[38px]", xl: "h-28 w-28 text-[54px]", hero: "h-36 w-36 text-[68px] sm:h-44 sm:w-44 sm:text-[84px]" } as const;

/** A Gem's look: a slowly turning gradient sphere with its emoji. */
export const GemOrb: React.FC<{ color: SpaceColor; emoji: string; size?: keyof typeof SIZES; float?: boolean; live?: boolean; className?: string }> = ({ color, emoji, size = "md", float, live, className }) => (
  <span className={cn("inline-flex shrink-0", float && "sp-float", className)}>
    <span className={cn("sp-orb lp-keep flex items-center justify-center", SIZES[size], live && "sp-live sp-pulse")} style={paletteVars(color)} aria-hidden>
      <span className="select-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">{emoji}</span>
    </span>
  </span>
);

/** A World's planet with its ring. */
export const Planet: React.FC<{ color: SpaceColor; emoji: string; size: number; className?: string; style?: React.CSSProperties }> = ({ color, emoji, size, className, style }) => (
  <div className={cn("pointer-events-none absolute", className)} style={{ width: size, height: size, ...paletteVars(color), ...style }} aria-hidden>
    <div className="sp-planet inset-0 flex items-center justify-center" style={{ fontSize: size * 0.42 }}>
      <span className="drop-shadow-[0_3px_10px_rgba(0,0,0,0.4)]">{emoji}</span>
    </div>
    <div className="sp-ring" style={{ inset: `${-size * 0.32}px ${-size * 0.42}px` }} />
  </div>
);

export const ColorPicker: React.FC<{ value: SpaceColor; onChange: (c: SpaceColor) => void }> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
    {COLORS.map((c) => (
      <button
        key={c}
        type="button"
        role="radio"
        aria-checked={value === c}
        aria-label={PALETTE[c].label}
        title={PALETTE[c].label}
        onClick={() => onChange(c)}
        className={cn("lp-keep flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-lp-surface transition-transform hover:scale-110", value === c && "ring-2 ring-lp-sky")}
        style={{ background: `linear-gradient(135deg, ${PALETTE[c].b}, ${PALETTE[c].c})` }}
      >
        {value === c && <Check className="h-4 w-4 text-white drop-shadow" />}
      </button>
    ))}
  </div>
);

/** Emoji button with a small grid of choices (or type your own). */
export const EmojiPicker: React.FC<{ value: string; onChange: (e: string) => void; color: SpaceColor }> = ({ value, onChange, color }) => {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open) return;
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, left: Math.max(12, Math.min(r.left, window.innerWidth - 300)) });
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <>
      <button ref={btn} type="button" onClick={() => setOpen((o) => !o)} aria-label="Choose an emoji" aria-expanded={open} className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-lp-sky">
        <GemOrb color={color} emoji={value || "✨"} size="lg" />
      </button>
      {open && createPortal(
        <div className="lp-chrome fixed inset-0 z-[80]" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="lp-pop lp-fade absolute w-[288px] rounded-2xl border border-lp-line bg-lp-surface p-3 shadow-2xl" style={pos}>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CHOICES.map((e) => (
                <button key={e} type="button" onClick={() => { onChange(e); setOpen(false); }} className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-[18px] hover:bg-lp-raised", value === e && "bg-lp-blue/20")}>{e}</button>
              ))}
            </div>
            <input
              aria-label="Or type any emoji"
              placeholder="Or type any emoji"
              maxLength={8}
              onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) { onChange(v); setOpen(false); } } }}
              className={cn(field, "mt-2 h-9 py-1.5 text-[13px]")}
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

/** Teachers: keep it private or share with classes they teach. */
export const ShareControl: React.FC<{ visibility: Visibility; classIds: string[]; onChange: (v: Visibility, ids: string[]) => void; what: string }> = ({ visibility, classIds, onChange, what }) => {
  const { data } = useTeacherData();
  if (!data.classes.length) return null;
  const toggle = (id: string) => {
    const next = classIds.includes(id) ? classIds.filter((c) => c !== id) : [...classIds, id];
    onChange(next.length ? "classes" : "private", next);
  };
  return (
    <div>
      <p className={label}>Who can use this {what}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange("private", [])} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px]", visibility === "private" ? "border-lp-sky/60 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white")}>
          <Lock className="h-3.5 w-3.5" /> Just me
        </button>
        {data.classes.map((c) => {
          const on = visibility === "classes" && classIds.includes(c.id);
          return (
            <button key={c.id} type="button" aria-pressed={on} onClick={() => toggle(c.id)} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px]", on ? "border-lp-sky/60 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white")}>
              {on ? <Check className="h-3.5 w-3.5 text-lp-sky" /> : <Users className="h-3.5 w-3.5" />} {c.name}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11.5px] text-lp-mute">{visibility === "classes" ? `Students in ${classIds.length === 1 ? "that class" : "those classes"} can use it. Only you can edit it.` : "Private: only you can see it."}</p>
    </div>
  );
};

/** Full-height page (chats and the Brain): the sidebar plus a content area that doesn't scroll as a whole. */
export const SpaceShell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className="lp-chrome flex h-[100dvh] bg-lp-bg">
    <DashboardSidebar />
    <main className={cn("lp-app relative z-[1] flex min-w-0 flex-1 flex-col overflow-hidden bg-lp-bg font-ui antialiased selection:bg-lp-blue/40 selection:text-white", className)}>{children}</main>
  </div>
);

/** Big page heading used on the Spaces pages. */
export const SpaceHeader: React.FC<{ kicker: string; title: string; text: string; children?: React.ReactNode }> = ({ kicker, title, text, children }) => (
  <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0 max-w-[720px]">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">{kicker}</p>
      <h1 className="mt-1.5 text-[32px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[40px]">{title}</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-lp-soft">{text}</p>
    </div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </header>
);

export const Tabs = <T extends string>({ value, onChange, tabs, className }: { value: T; onChange: (t: T) => void; tabs: { id: T; label: string; count?: number; icon?: React.ElementType }[]; className?: string }) => (
  <div role="tablist" className={cn("flex gap-1 overflow-x-auto rounded-2xl border border-lp-line bg-lp-surface/60 p-1", className)}>
    {tabs.map((t) => (
      <button
        key={t.id}
        role="tab"
        type="button"
        aria-selected={value === t.id}
        onClick={() => onChange(t.id)}
        className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] transition-colors", value === t.id ? "bg-lp-blue text-white shadow" : "text-lp-soft hover:text-white")}
      >
        {t.icon && <t.icon className="h-4 w-4" />}
        {t.label}
        {typeof t.count === "number" && <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", value === t.id ? "bg-white/20" : "bg-lp-raised text-lp-mute")}>{t.count}</span>}
      </button>
    ))}
  </div>
);
