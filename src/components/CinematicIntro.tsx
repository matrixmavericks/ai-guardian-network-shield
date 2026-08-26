import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Shield, Sparkles, Brain, Users, BookOpen, LineChart, Gamepad2 } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const FEATURES = [
  {
    n: "01",
    icon: Shield,
    label: "Governance",
    title: "Every prompt, intercepted.",
    body: "Shortcut requests are rewritten into guided, step-by-step learning before the answer ever appears.",
    stat: "12,847",
    statLabel: "Prompts governed today",
  },
  {
    n: "02",
    icon: Brain,
    label: "Learning paths",
    title: "AI that builds the route.",
    body: "Adaptive learning paths generated per student, with gap detection and coaching that syncs to insights.",
    stat: "24",
    statLabel: "Paths per class",
  },
  {
    n: "03",
    icon: BookOpen,
    label: "Teacher studio",
    title: "Tailored to every teacher.",
    body: "Subject AI labs, IB standards auto-mapping, PYP unit generators and rubric-grade reports in one place.",
    stat: "12",
    statLabel: "Planning tools",
  },
  {
    n: "04",
    icon: Gamepad2,
    label: "Primary playground",
    title: "Learning that feels like play.",
    body: "Cast games to the board, capture learner-profile evidence, and generate a full PYP week in one tap.",
    stat: "6",
    statLabel: "Live classroom games",
  },
  {
    n: "05",
    icon: LineChart,
    label: "Pilot intelligence",
    title: "Proof leadership can read.",
    body: "Live health scores, token economy tracking and executive briefings — exportable as a board-ready report.",
    stat: "+18%",
    statLabel: "Measured growth",
  },
  {
    n: "06",
    icon: Users,
    label: "Whole community",
    title: "Students, teachers, parents.",
    body: "One governed layer across every role, with scoped visibility and school-level AI policy control.",
    stat: "4",
    statLabel: "Connected roles",
  },
];

const CinematicIntro: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.scrollY > window.innerHeight * 1.5) return;
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
    const isMobile = window.innerWidth < 768;
    const ctx = gsap.context(() => {
      gsap.set(".ci-hero-line", { autoAlpha: 0, y: 60, scale: 0.9, filter: "blur(20px)" });
      gsap.set(".ci-hero-accent", { autoAlpha: 0, clipPath: "inset(0 100% 0 0)" });
      gsap.set(".ci-card", { y: window.innerHeight + 200, autoAlpha: 1 });
      gsap.set(".ci-feature", { autoAlpha: 0 });
      gsap.set(".ci-cta", { autoAlpha: 0, scale: 0.9, filter: "blur(24px)" });

      const intro = gsap.timeline({ delay: 0.2 });
      intro
        .to(".ci-hero-line", { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 1.4, ease: "expo.out" })
        .to(".ci-hero-accent", { clipPath: "inset(0 0% 0 0)", duration: 1.1, ease: "power4.inOut" }, "-=0.8");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=3200",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      tl.to([".ci-hero-wrap", ".ci-grid"], { scale: 1.12, filter: "blur(18px)", opacity: 0.15, duration: 1.4, ease: "power2.inOut" }, 0)
        .to(".ci-card", { y: 0, duration: 1.4, ease: "power3.inOut" }, 0)
        .to(".ci-card", { width: "100%", height: "100%", borderRadius: "0px", duration: 1, ease: "power3.inOut" })
        .set(".ci-hero-wrap", { autoAlpha: 0 })
        .fromTo(".ci-sweep", { xPercent: -140 }, { xPercent: 140, duration: 1.6, ease: "power2.inOut" }, "-=0.8");

      // Cycle each feature panel
      FEATURES.forEach((_, i) => {
        const sel = `.ci-feature-${i}`;
        tl.fromTo(
          sel,
          { autoAlpha: 0, y: 40, filter: "blur(14px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "expo.out" }
        )
          .fromTo(`${sel} .ci-f-line`, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.5, ease: "power3.out" }, "-=0.45")
          .to({}, { duration: 0.9 })
          .to(sel, { autoAlpha: 0, y: -40, filter: "blur(14px)", duration: 0.6, ease: "power2.in" });
      });

      tl.set(".ci-cta", { autoAlpha: 1 })
        .to(".ci-card", {
          width: isMobile ? "92vw" : "85vw",
          height: isMobile ? "92vh" : "85vh",
          borderRadius: isMobile ? "32px" : "40px",
          duration: 1.2,
          ease: "expo.inOut",
        }, "pull")
        .to(".ci-cta", { scale: 1, filter: "blur(0px)", duration: 1.2, ease: "expo.inOut" }, "pull")
        .to(".ci-card", { y: -window.innerHeight - 300, duration: 1.1, ease: "power3.in" });
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
          The operating system for{" "}
          <span className="ci-hero-accent inline-block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            ethical AI in schools.
          </span>
        </h1>
        <p className="ci-hero-line mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
          Scroll to see how Refyn transforms learning.
        </p>
      </div>

      {/* Cinematic card */}
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

        <div className="ci-sweep absolute inset-y-0 -left-1/3 w-1/3 pointer-events-none z-10"
          style={{
            background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.12), transparent)",
            filter: "blur(12px)",
          }}
        />

        <div className="absolute inset-0 pointer-events-none z-[5] opacity-[0.10]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 4px)" }}
        />

        {/* Feature cycle */}
        <div className="absolute inset-0 z-20">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.n}
                className={`ci-feature ci-feature-${i} absolute inset-0 flex flex-col items-center justify-center px-8 text-center`}
              >
                <div className="ci-f-line inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/70">
                    {f.n} · {f.label}
                  </span>
                </div>
                <h3 className="ci-f-line text-4xl md:text-6xl font-bold text-white max-w-4xl leading-[1.05]">
                  {f.title}
                </h3>
                <p className="ci-f-line mt-5 text-base md:text-lg text-white/60 max-w-2xl leading-relaxed">
                  {f.body}
                </p>
                <div className="ci-f-line mt-10 flex flex-col items-center">
                  <div className="text-5xl md:text-6xl font-bold bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
                    {f.stat}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50 mt-2">
                    {f.statLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA (revealed at end) */}
        <div className="ci-cta absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-30">
          <h2 className="text-4xl md:text-6xl font-bold text-white max-w-3xl leading-[1.05]">
            Ready to refine your classroom?
          </h2>
          <p className="mt-4 text-white/60 max-w-xl">
            Join the schools redefining AI in education with Refyn.
          </p>
          <div className="mt-8 flex gap-3">
            <a href="/signup" className="px-6 py-3 rounded-full font-semibold text-slate-900"
              style={{ background: "linear-gradient(180deg, #fff, #f1f5f9)", boxShadow: "0 12px 24px -4px rgba(0,0,0,0.4)" }}>
              Get started
            </a>
            <a href="/tour" className="px-6 py-3 rounded-full font-semibold text-white border border-white/20 backdrop-blur-sm">
              Watch the tour
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CinematicIntro;
