import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Shield, Sparkles, Brain, TrendingUp } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const CinematicIntro: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.scrollY > window.innerHeight * 1.5) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!mockupRef.current || !cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        cardRef.current.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        cardRef.current.style.setProperty("--my", `${e.clientY - rect.top}px`);
        const xVal = (e.clientX / window.innerWidth - 0.5) * 2;
        const yVal = (e.clientY / window.innerHeight - 0.5) * 2;
        gsap.to(mockupRef.current, {
          rotationY: xVal * 10,
          rotationX: -yVal * 10,
          ease: "power3.out",
          duration: 1.2,
        });
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
      gsap.set([".ci-left", ".ci-right", ".ci-mockup-wrap", ".ci-badge", ".ci-widget", ".ci-caption-1", ".ci-caption-2", ".ci-caption-3"], { autoAlpha: 0 });
      gsap.set(".ci-cta", { autoAlpha: 0, scale: 0.8, filter: "blur(30px)" });

      const intro = gsap.timeline({ delay: 0.2 });
      intro
        .to(".ci-hero-line", { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 1.6, ease: "expo.out" })
        .to(".ci-hero-accent", { clipPath: "inset(0 0% 0 0)", duration: 1.2, ease: "power4.inOut" }, "-=0.9");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=5500",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      tl.to([".ci-hero-wrap", ".ci-grid"], { scale: 1.15, filter: "blur(20px)", opacity: 0.2, duration: 2, ease: "power2.inOut" }, 0)
        .to(".ci-card", { y: 0, duration: 2, ease: "power3.inOut" }, 0)
        .to(".ci-card", { width: "100%", height: "100%", borderRadius: "0px", duration: 1.5, ease: "power3.inOut" })
        .fromTo(".ci-mockup-wrap",
          { y: 300, rotationX: 50, rotationY: -30, autoAlpha: 0, scale: 0.6 },
          { y: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, duration: 2.2, ease: "expo.out" }, "-=0.8")
        .fromTo(".ci-widget", { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.12, duration: 1.2, ease: "back.out(1.2)" }, "-=1.5")
        .to(".ci-ring", { strokeDashoffset: 60, duration: 2, ease: "power3.inOut" }, "-=1.2")
        .to(".ci-count", { innerHTML: 12847, snap: { innerHTML: 1 }, duration: 2, ease: "expo.out" }, "-=2")
        .fromTo(".ci-badge", { y: 80, autoAlpha: 0, scale: 0.7 }, { y: 0, autoAlpha: 1, scale: 1, stagger: 0.15, duration: 1.3, ease: "back.out(1.5)" }, "-=2")
        .fromTo(".ci-left", { x: -50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 1.4, ease: "power4.out" }, "-=1.4")
        .fromTo(".ci-right", { x: 50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 1.4, ease: "expo.out" }, "<")
        .fromTo(".ci-sweep", { xPercent: -140 }, { xPercent: 140, duration: 2.4, ease: "power2.inOut" }, "-=1.6")
        .fromTo(".ci-caption-1", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 }, "-=1.2")
        .to({}, { duration: 1 })
        .to(".ci-caption-1", { autoAlpha: 0, y: -20, duration: 0.6 })
        .fromTo(".ci-caption-2", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 }, "<0.2")
        .to({}, { duration: 1 })
        .to(".ci-caption-2", { autoAlpha: 0, y: -20, duration: 0.6 })
        .fromTo(".ci-caption-3", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 }, "<0.2")
        .to({}, { duration: 1.4 })
        .to(".ci-caption-3", { autoAlpha: 0, duration: 0.5 })
        .set(".ci-hero-wrap", { autoAlpha: 0 })
        .set(".ci-cta", { autoAlpha: 1 })
        .to({}, { duration: 1.2 })
        .to([".ci-mockup-wrap", ".ci-badge", ".ci-left", ".ci-right"], {
          scale: 0.9, y: -40, autoAlpha: 0, duration: 1.2, ease: "power3.in", stagger: 0.05,
        })
        .to(".ci-card", {
          width: isMobile ? "92vw" : "85vw",
          height: isMobile ? "92vh" : "85vh",
          borderRadius: isMobile ? "32px" : "40px",
          duration: 1.6,
          ease: "expo.inOut",
        }, "pull")
        .to(".ci-cta", { scale: 1, filter: "blur(0px)", duration: 1.6, ease: "expo.inOut" }, "pull")
        .to(".ci-card", { y: -window.innerHeight - 300, duration: 1.4, ease: "power3.in" });
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

      {/* Ambient glows */}
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

        {/* Left text */}
        <div className="ci-left absolute left-6 md:left-12 top-1/2 -translate-y-1/2 max-w-xs z-20">
          <div className="text-xs font-mono uppercase tracking-widest text-primary/80 mb-3">Live Governance</div>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Every prompt, refined.</h3>
          <p className="text-sm text-white/60 leading-relaxed">
            Process Teaching Mode rewrites shortcuts into guided learning — automatically.
          </p>
        </div>

        {/* Right stats */}
        <div className="ci-right absolute right-6 md:right-12 top-1/2 -translate-y-1/2 max-w-xs text-right z-20">
          <div className="text-6xl md:text-7xl font-bold bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
            <span className="ci-count">0</span>
          </div>
          <div className="text-xs font-mono uppercase tracking-widest text-white/60 mt-2">Prompts governed today</div>
        </div>

        {/* Center mockup */}
        <div className="ci-mockup-wrap absolute inset-0 flex items-center justify-center" style={{ perspective: "2000px" }}>
          <div
            ref={mockupRef}
            className="relative w-[280px] md:w-[340px] aspect-[9/19] rounded-[44px] p-3"
            style={{
              background: "#111",
              boxShadow:
                "inset 0 0 0 2px #52525B, inset 0 0 0 7px #000, 0 40px 80px -15px rgba(0,0,0,0.9)",
              transformStyle: "preserve-3d",
            }}
          >
            <div className="w-full h-full rounded-[32px] overflow-hidden relative" style={{ background: "linear-gradient(180deg, #0F172A 0%, #020617 100%)" }}>
              {/* Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30" />
              {/* Content */}
              <div className="p-5 pt-10 flex flex-col gap-3 h-full">
                <div className="ci-widget flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-white/40 uppercase">Class 9B · Physics</div>
                    <div className="text-white font-semibold text-sm">Today's session</div>
                  </div>
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                {/* Ring */}
                <div className="ci-widget flex-1 flex flex-col items-center justify-center rounded-2xl" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <svg width="140" height="140" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r="64" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                    <circle
                      className="ci-ring"
                      cx="70" cy="70" r="64" fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="402"
                      strokeDashoffset="402"
                      style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                    />
                  </svg>
                  <div className="-mt-24 text-3xl font-bold text-white">85%</div>
                  <div className="text-[10px] font-mono text-white/50 uppercase mt-16">Prompt Integrity</div>
                </div>
                <div className="ci-widget grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <Brain className="h-4 w-4 text-accent mb-1" />
                    <div className="text-xs text-white font-semibold">24</div>
                    <div className="text-[9px] text-white/40 uppercase font-mono">Learning paths</div>
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <TrendingUp className="h-4 w-4 text-primary mb-1" />
                    <div className="text-xs text-white font-semibold">+18%</div>
                    <div className="text-[9px] text-white/40 uppercase font-mono">Growth</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating badges */}
        <div className="ci-badge absolute top-16 right-8 md:right-24 rounded-2xl px-4 py-3 z-20"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01))",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
          }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-[10px] font-mono uppercase text-white/60">Live</div>
          </div>
          <div className="text-white text-sm font-semibold mt-1">Bypass blocked</div>
        </div>

        <div className="ci-badge absolute bottom-16 left-8 md:left-24 rounded-2xl px-4 py-3 z-20"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01))",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
          }}>
          <div className="text-[10px] font-mono uppercase text-white/60">Tokens saved</div>
          <div className="text-white text-lg font-bold mt-0.5">2.4M</div>
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
