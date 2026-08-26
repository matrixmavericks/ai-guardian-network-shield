import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Sparkles } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const CYCLE_DURATION = 10.8;
const CYCLE_WORDS = [
  "Governance",
  "Learning",
  "Teaching",
  "Play",
  "Intelligence",
  "Community",
];

const CinematicIntro: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cycleRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.scrollY > window.innerHeight) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        cardRef.current.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        cardRef.current.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".ci-hero-line", { autoAlpha: 0, y: 60, scale: 0.9, filter: "blur(20px)" });
      gsap.set(".ci-hero-accent", { autoAlpha: 0, y: 30, filter: "blur(16px)" });
      gsap.set(".ci-card", { y: window.innerHeight + 200, autoAlpha: 1 });
      gsap.set(".ci-cta", { autoAlpha: 1, scale: 0.92, filter: "blur(24px)" });

      const intro = gsap.timeline({ delay: 0.2 });
      intro
        .to(".ci-hero-line", { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 1.2, ease: "expo.out", stagger: 0.12 })
        .to(".ci-hero-accent", { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1, ease: "expo.out" }, "-=0.6");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=900",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      tl.to([".ci-hero-wrap", ".ci-grid"], { scale: 1.1, filter: "blur(16px)", opacity: 0, duration: 0.8, ease: "power2.inOut" }, 0)
        .to(".ci-card", { y: 0, duration: 0.8, ease: "power3.out" }, 0)
        .to(".ci-card", { width: "100%", height: "100%", borderRadius: "0px", duration: 0.6, ease: "power3.inOut" })
        .to(".ci-cta", { scale: 1, filter: "blur(0px)", duration: 0.7, ease: "expo.out" }, "-=0.4")
        .fromTo(".ci-sweep", { xPercent: -140 }, { xPercent: 140, duration: 0.8, ease: "power2.inOut" }, "-=0.6")
        .to(".ci-card", { y: -window.innerHeight - 300, duration: 0.8, ease: "power3.in" }, "+=0.2");
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-background">
      {/* Grid backdrop */}
      <div
        className="ci-grid absolute inset-0 pointer-events-none"
        style={{
          backgroundSize: "60px 60px",
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground) / 0.06) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.06) 1px, transparent 1px)",
          maskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
        }}
      />

      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/20 blur-[120px] pointer-events-none" />

      {/* Hero text */}
      <div className="ci-hero-wrap absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-10">
        <div className="ci-hero-line inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/40 backdrop-blur-sm mb-6">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-mono text-muted-foreground tracking-wider uppercase">Refyn OS · v3</span>
        </div>
        <h1 className="ci-hero-line text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground max-w-5xl leading-[1.05]">
          The operating system for
        </h1>
        <h2 className="ci-hero-accent text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-5xl leading-[1.1] mt-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          ethical AI in schools.
        </h2>

        {/* Cycling feature words */}
        <div
          ref={cycleRef}
          className="ci-hero-line relative mt-10 h-12 md:h-14 w-64 md:w-80 flex items-center justify-center overflow-hidden"
        >
          <style>{`
            @keyframes ci-cycle {
              0%, 16.66% { opacity: 0; transform: translateY(18px); filter: blur(8px); }
              20%, 30% { opacity: 1; transform: translateY(0); filter: blur(0px); }
              33.33%, 100% { opacity: 0; transform: translateY(-18px); filter: blur(8px); }
            }
          `}</style>
          {CYCLE_WORDS.map((word, i) => (
            <div
              key={word}
              className="absolute inset-0 flex items-center justify-center text-2xl md:text-4xl font-semibold tracking-tight"
              style={{
                color: "hsl(var(--primary))",
                opacity: 0,
                animation: `ci-cycle ${CYCLE_DURATION}s ease-in-out infinite`,
                animationDelay: `${i * (CYCLE_DURATION / CYCLE_WORDS.length)}s`,
              }}
            >
              {word}
            </div>
          ))}
        </div>
      </div>

      {/* Cinematic card — CTA only */}
      <div
        ref={cardRef}
        className="ci-card absolute bottom-0 left-1/2 -translate-x-1/2 overflow-hidden"
        style={{
          width: "85vw",
          height: "85vh",
          borderRadius: "40px",
          background: "linear-gradient(145deg, hsl(var(--primary) / 0.15) 0%, hsl(220 40% 5%) 100%)",
          boxShadow:
            "0 40px 100px -20px rgba(0,0,0,0.9), inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.8)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Mouse sheen */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              "radial-gradient(600px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.08), transparent 40%)",
            mixBlendMode: "screen",
          }}
        />

        <div
          className="ci-sweep absolute inset-y-0 -left-1/3 w-1/3 pointer-events-none z-10"
          style={{
            background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.12), transparent)",
            filter: "blur(12px)",
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none z-[5] opacity-[0.10]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 4px)",
          }}
        />

        {/* CTA */}
        <div className="ci-cta absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-30">
          <h2 className="text-4xl md:text-6xl font-bold text-white max-w-3xl leading-[1.05]">
            Ready to refine your classroom?
          </h2>
          <p className="mt-4 text-white/60 max-w-xl">
            Join the schools redefining AI in education with Refyn.
          </p>
          <div className="mt-8 flex gap-3">
            <a
              href="/signup"
              className="px-6 py-3 rounded-full font-semibold text-slate-900"
              style={{
                background: "linear-gradient(180deg, #fff, #f1f5f9)",
                boxShadow: "0 12px 24px -4px rgba(0,0,0,0.4)",
              }}
            >
              Get started
            </a>
            <a
              href="/tour"
              className="px-6 py-3 rounded-full font-semibold text-white border border-white/20 backdrop-blur-sm"
            >
              Watch the tour
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CinematicIntro;
