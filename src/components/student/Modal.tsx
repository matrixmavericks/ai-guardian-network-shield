import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Navy dialog used across the student portal (bottom sheet on phones). */
export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}> = ({ open, onClose, title, description, children, footer, width = "max-w-[520px]" }) => {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus(), 40);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="lp-app fixed inset-0 z-50 flex items-end justify-center bg-lp-deep/75 font-ui backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn("lp-fade flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-lp-line bg-lp-surface shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] sm:rounded-3xl", width)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-lp-line px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-white">{title}</h2>
            {description && <div className="mt-1 text-[13.5px] leading-relaxed text-lp-mute">{description}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lp-mute hover:bg-white/[0.06] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-lp-line bg-lp-deep/40 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
};

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({ label, hint, children, className }) => (
  <label className={cn("block", className)}>
    <span className="text-[12.5px] font-medium text-lp-soft">{label}</span>
    <div className="mt-1.5">{children}</div>
    {hint && <span className="mt-1 block text-[11.5px] text-lp-mute">{hint}</span>}
  </label>
);

export const inputCls =
  "w-full rounded-xl border border-lp-line bg-lp-deep/70 px-3 py-2.5 text-[14px] text-white placeholder:text-lp-mute [color-scheme:dark] focus:border-lp-sky/60 focus:outline-none focus:ring-2 focus:ring-lp-blue/20";
