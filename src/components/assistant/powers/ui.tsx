import React, { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Shared look for the interactive cards in chat replies.

export const primary = "flex h-9 items-center gap-2 rounded-xl bg-lp-blue px-3.5 text-[13px] font-medium text-white hover:bg-[#2F6FE0] disabled:opacity-50";
export const ghost = "flex h-9 items-center gap-2 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:border-lp-blue/50 hover:text-white disabled:opacity-50";
export const chip = "inline-flex items-center gap-1 rounded-full border border-lp-line px-2 py-0.5 text-[11.5px] text-lp-mute";
export const field = "w-full rounded-xl border border-lp-line bg-lp-deep/60 px-3 py-2 text-[14px] text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60";

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("my-4 rounded-2xl border border-lp-line bg-lp-surface p-4 sm:p-5", className)}>{children}</div>
);

export const CardHead: React.FC<{ icon: React.ElementType; kind: string; title: string; children?: React.ReactNode }> = ({ icon: Icon, kind, title, children }) => (
  <div className="flex flex-wrap items-center gap-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lp-blue/15 text-lp-sky"><Icon className="h-[18px] w-[18px]" /></span>
    <div className="min-w-0 flex-1">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-lp-sky">{kind}</p>
      <p className="truncate text-[15px] font-medium text-white">{title}</p>
    </div>
    {children && <div className="flex flex-wrap items-center gap-1.5">{children}</div>}
  </div>
);

/** State kept in this browser per block (quiz answers, plan ticks), so it survives reloads. */
export function useSaved<T>(key: string, initial: T): [T, (v: T) => void] {
  const storage = `refyn:block:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storage);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(storage, JSON.stringify(value)); } catch { /* storage unavailable */ }
  }, [storage, value]);
  return [value, useCallback((v: T) => setValue(v), [])];
}

export const download = (name: string, content: string | Blob, type = "text/plain;charset=utf-8") => {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").trim().slice(0, 80) || "Refyn";
