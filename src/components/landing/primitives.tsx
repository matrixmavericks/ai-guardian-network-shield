import React, { useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const Container: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn("mx-auto w-full max-w-[1200px] px-5 sm:px-8", className)}>{children}</div>
);

export const Eyebrow: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <p
    className={cn(
      "inline-flex items-center gap-2 rounded-full border border-lp-line bg-lp-surface/60 px-3 py-1 text-[12px] font-medium tracking-wide text-lp-soft",
      className,
    )}
  >
    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lp-sky shadow-[0_0_10px_2px_rgba(124,180,255,0.6)]" />
    {children}
  </p>
);

export const SectionTitle: React.FC<{ id?: string; className?: string; children: React.ReactNode }> = ({
  id,
  className,
  children,
}) => (
  <h2
    id={id}
    className={cn(
      "text-balance text-[36px] font-normal leading-[1] tracking-[-0.035em] text-lp-text sm:text-[48px] lg:text-[60px]",
      className,
    )}
  >
    {children}
  </h2>
);

/** The glowing primary button. Renders a router link. */
export const GlowButton: React.FC<{ to: string; className?: string; children: React.ReactNode }> = ({
  to,
  className,
  children,
}) => (
  <Link
    to={to}
    className={cn(
      "lp-glow-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lp-sky",
      className,
    )}
  >
    <span aria-hidden className="lp-glow-btn__blob" />
    <span className="lp-glow-btn__inner">{children}</span>
  </Link>
);

export const QuietLink: React.FC<{ to: string; className?: string; children: React.ReactNode }> = ({
  to,
  className,
  children,
}) => (
  <Link
    to={to}
    className={cn(
      "group inline-flex items-center gap-1.5 text-[15px] font-medium text-lp-text transition-colors hover:text-lp-sky",
      className,
    )}
  >
    {children}
  </Link>
);

/** Mouse-move handler that feeds the `.lp-spot` radial highlight. */
export const useSpotlight = () =>
  useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, []);

/** Blur-fades `.lp-reveal` elements in as they scroll into view. */
export const useReveal = () => {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".lp-reveal"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
};
