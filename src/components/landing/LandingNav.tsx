import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogIn, Menu, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#why", label: "Why Refyn" },
  { href: "#how", label: "How it works" },
  { href: "#product", label: "Platform" },
  { href: "#schools", label: "For IT" },
];

export const Wordmark: React.FC<{ className?: string }> = ({ className }) => (
  <span className={cn("inline-flex items-baseline text-[22px] font-semibold tracking-[-0.03em] sm:text-2xl", className)}>
    Refyn
    <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-lp-sky shadow-[0_0_10px_2px_rgba(124,180,255,0.7)]" />
  </span>
);

/** Tracks which section is in the middle of the viewport. */
const useActiveSection = (ids: string[]) => {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const inView = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? inView.add(e.target.id) : inView.delete(e.target.id)));
        setActive(ids.find((id) => inView.has(id)) ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);
  return active;
};

const sectionIds = navLinks.map((l) => l.href.slice(1));

const LandingNav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(sectionIds);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <nav
        aria-label="Main"
        className={cn(
          "fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 py-4 transition-all duration-500 sm:px-6 md:px-10",
          scrolled ? "bg-lp-bg/70 py-3 backdrop-blur-xl sm:py-3" : "sm:py-6",
        )}
      >
        <Link to="/" aria-label="Refyn home" className="relative z-50 text-lp-text">
          <Wordmark />
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-white/15 bg-[#0A1328]/55 py-1 pl-5 pr-1 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md lg:flex">
          {navLinks.map((link) => {
            const isActive = active === link.href.slice(1);
            return (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-3 py-2 text-sm transition-colors",
                  isActive ? "font-semibold text-white" : "font-medium text-lp-soft hover:text-white",
                )}
              >
                {link.label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-lp-sky to-transparent transition-opacity duration-300",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
              </a>
            );
          })}
          <Link
            to="/tour"
            className="ml-2 rounded-full bg-lp-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2F6FE0]"
          >
            Try it live
          </Link>
        </div>

        <div className="relative z-50 flex items-center gap-3 text-lp-text sm:gap-6">
          <Link to="/signup" className="hidden items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80 sm:flex">
            <UserPlus className="h-4 w-4" />
            Sign up
          </Link>
          <Link to="/login" className="hidden items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80 sm:flex">
            <LogIn className="h-4 w-4" />
            Log in
          </Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white backdrop-blur-md transition-all duration-300 hover:bg-white/[0.12] lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <Menu
              className={cn(
                "absolute h-5 w-5 transition-all duration-300",
                menuOpen ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100",
              )}
            />
            <X
              className={cn(
                "absolute h-5 w-5 transition-all duration-300",
                menuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0",
              )}
            />
          </button>
        </div>
      </nav>

      {/* Mobile menu backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity duration-300 lg:hidden",
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMenuOpen(false)}
      >
        <div className="absolute inset-0 bg-lp-deep/60 backdrop-blur-sm" />
      </div>

      {/* Mobile menu drawer */}
      <div
        id="mobile-menu"
        aria-hidden={!menuOpen}
        className={cn(
          "fixed bottom-0 right-0 top-0 z-40 w-[85%] max-w-sm border-l border-lp-line bg-lp-surface/95 shadow-2xl backdrop-blur-xl transition-[transform,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          menuOpen ? "translate-x-0" : "invisible translate-x-full",
        )}
      >
        <div className="flex h-full flex-col px-8 pb-8 pt-24">
          <div className="flex flex-col gap-1">
            {navLinks.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "border-b border-white/10 py-4 text-2xl font-semibold tracking-[-0.02em] text-lp-text transition-all duration-500",
                  menuOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0",
                )}
                style={{ transitionDelay: menuOpen ? `${150 + i * 70}ms` : "0ms" }}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div
            className={cn(
              "mt-8 flex flex-col gap-4 transition-all duration-500",
              menuOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0",
            )}
            style={{ transitionDelay: menuOpen ? "400ms" : "0ms" }}
          >
            <Link to="/signup" className="flex items-center gap-2 text-sm font-medium text-lp-soft sm:hidden">
              <UserPlus className="h-4 w-4" />
              Sign up
            </Link>
            <Link to="/login" className="flex items-center gap-2 text-sm font-medium text-lp-soft sm:hidden">
              <LogIn className="h-4 w-4" />
              Log in
            </Link>
            <Link
              to="/tour"
              className="mt-2 rounded-full bg-lp-blue px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#2F6FE0]"
            >
              Try it live
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default LandingNav;
