import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Container } from "./primitives";

const anchors = [
  { href: "#how", label: "How it works" },
  { href: "#product", label: "Inside Refyn" },
  { href: "#schools", label: "For IT teams" },
  { href: "#stories", label: "Stories" },
];

export const Wordmark: React.FC<{ className?: string }> = ({ className }) => (
  <span className={cn("font-display text-[28px] leading-none tracking-[-0.01em]", className)}>
    Refyn<span className="text-lp-pen">.</span>
  </span>
);

const LandingNav = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-lp-paper/90 backdrop-blur-md transition-colors",
        scrolled ? "border-lp-line" : "border-transparent",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link to="/" aria-label="Refyn home" className="text-lp-ink">
          <Wordmark />
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-8 lg:flex">
          {anchors.map((a) => (
            <a key={a.href} href={a.href} className="text-[14px] text-lp-soft transition-colors hover:text-lp-ink">
              {a.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/login" className="px-2 text-[14px] font-medium text-lp-soft transition-colors hover:text-lp-ink">
            Log in
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-10 items-center rounded-full bg-lp-ink px-5 text-[14px] font-medium text-lp-paper transition-colors hover:bg-[#2B2E35]"
          >
            Get started
          </Link>
        </div>
      </Container>
    </header>
  );
};

export default LandingNav;
