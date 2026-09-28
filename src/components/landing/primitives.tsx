import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LandingPhoto, photoSrcSet, photoUrl } from "./photos";

export const btnPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lp-ink px-6 text-[15px] font-medium text-lp-paper transition-colors hover:bg-[#2B2E35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-pen";

export const btnQuiet =
  "inline-flex items-center gap-1.5 text-[15px] font-medium text-lp-ink underline decoration-lp-line decoration-2 underline-offset-[6px] transition-colors hover:decoration-lp-pen focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lp-pen";

export const Container: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn("mx-auto w-full max-w-[1200px] px-5 sm:px-8", className)}>{children}</div>
);

export const Eyebrow: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <p className={cn("flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-lp-mute", className)}>
    <span aria-hidden className="h-px w-6 bg-lp-pen" />
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
      "text-balance font-display text-[38px] font-normal leading-[1.04] tracking-[-0.015em] text-lp-ink sm:text-[48px] lg:text-[56px]",
      className,
    )}
  >
    {children}
  </h2>
);

/** A photo that degrades to a warm paper block if the image can't load. */
export const Photo: React.FC<{
  photo: LandingPhoto;
  className?: string;
  sizes?: string;
  priority?: boolean;
}> = ({ photo, className, sizes = "(min-width: 1024px) 40vw, 100vw", priority }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-lp-band", className)}>
      {!failed && (
        <img
          src={photoUrl(photo.src, 1200)}
          srcSet={photoSrcSet(photo.src, [640, 960, 1400])}
          sizes={sizes}
          alt={photo.alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: photo.position }}
        />
      )}
      {/* Soft inner edge so photos sit on the paper instead of floating above it */}
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(23,25,30,0.08)]" />
    </div>
  );
};

/** Fades `.lp-reveal` elements in as they scroll into view. */
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
