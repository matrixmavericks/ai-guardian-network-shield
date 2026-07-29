import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck, Zap, GraduationCap, Activity } from "lucide-react";

const ROTATOR = [
  "AI Governance",
  "Learning Paths",
  "Student Portfolios",
  "Capstone Projects",
  "Adaptive Coaching",
];

const HeroSection = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % ROTATOR.length), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Ambient background layers */}
      <div className="pointer-events-none absolute inset-0">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(var(--foreground) / 0.06) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.06) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%)",
          }}
        />
        {/* Glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[880px] h-[520px] rounded-full blur-[140px] opacity-40"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.55), transparent 60%)" }}
        />
        <div className="absolute bottom-0 right-0 w-[520px] h-[320px] rounded-full blur-[120px] opacity-30"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.45), transparent 60%)" }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-20 pb-28 md:pt-28 md:pb-36">
        {/* Eyebrow */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Refyn OS v4 — Portfolios, Capstones & Adaptive Paths
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>

        {/* Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-bold tracking-tight text-foreground text-5xl sm:text-6xl md:text-7xl leading-[1.02]">
            The operating system
            <br className="hidden sm:block" /> for{" "}
            <span className="relative inline-block align-baseline">
              <span
                key={idx}
                className="inline-block bg-clip-text text-transparent animate-fade-in"
                style={{
                  backgroundImage:
                    "linear-gradient(120deg, hsl(var(--primary)), hsl(var(--accent)))",
                }}
              >
                {ROTATOR[idx]}
              </span>
            </span>
            <br className="hidden sm:block" />
            in every classroom.
          </h1>

          <p className="mt-7 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Refyn gives schools a single command surface for ethical AI, adaptive learning, and
            student portfolios — engineered for teachers, loved by students.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-7 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 w-full sm:w-auto">
                Start free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/tour">
              <Button size="lg" variant="outline" className="h-12 px-7 text-base border-border bg-card/40 backdrop-blur hover:bg-card w-full sm:w-auto">
                Watch guided tour
              </Button>
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> SOC-ready</span>
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Gemini 3 Flash</span>
            <span className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> IB · IGCSE · AP</span>
          </div>
        </div>

        {/* Product mockup */}
        <div className="relative mt-20 max-w-5xl mx-auto">
          {/* Floating badges */}
          <div className="hidden md:block absolute -left-6 top-16 z-20 animate-fade-in">
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-xl px-4 py-3 shadow-2xl">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Activity className="h-3 w-3 text-primary" /> Prompt integrity
              </div>
              <div className="text-2xl font-bold font-mono-tabular text-foreground">98.4%</div>
            </div>
          </div>
          <div className="hidden md:block absolute -right-4 top-40 z-20 animate-fade-in" style={{ animationDelay: "150ms" }}>
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-xl px-4 py-3 shadow-2xl">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Sparkles className="h-3 w-3 text-accent" /> Tokens saved
              </div>
              <div className="text-2xl font-bold font-mono-tabular text-foreground">+2.1M</div>
            </div>
          </div>

          {/* Main frame */}
          <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/40">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-warning/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-success/70" />
              </div>
              <div className="mx-auto text-xs text-muted-foreground font-mono">
                refyn.os / classroom · live
              </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-12 gap-4 p-5 bg-background/30">
              {/* Sidebar */}
              <div className="col-span-3 hidden md:flex flex-col gap-1.5">
                {["Overview", "Classes", "Learning Paths", "Portfolios", "Governance", "Insights"].map((s, i) => (
                  <div
                    key={s}
                    className={`text-xs px-3 py-2 rounded-md ${i === 2 ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground"}`}
                  >
                    {s}
                  </div>
                ))}
              </div>

              {/* Main */}
              <div className="col-span-12 md:col-span-9 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: "Active learners", v: "1,284", d: "+12%" },
                    { l: "Prompts today", v: "8,431", d: "+3.4%" },
                    { l: "Mastery lift", v: "+18pt", d: "vs baseline" },
                  ].map((k) => (
                    <div key={k.l} className="rounded-lg border border-border bg-card/70 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
                      <div className="mt-1 text-xl font-bold font-mono-tabular text-foreground">{k.v}</div>
                      <div className="text-[10px] text-success mt-0.5">{k.d}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-border bg-card/70 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-foreground">Live: Process Teaching Mode</div>
                    <span className="text-[10px] font-mono text-muted-foreground">ai-conditioner · 12ms</span>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-md bg-background/60 border border-border p-2.5">
                      <div className="text-[10px] font-mono text-muted-foreground mb-0.5">student</div>
                      <div className="text-sm text-foreground">What is 7x + 39x?</div>
                    </div>
                    <div className="rounded-md bg-primary/10 border-l-2 border-primary p-2.5">
                      <div className="text-[10px] font-mono text-primary mb-0.5">refyn · guided</div>
                      <div className="text-sm text-foreground leading-relaxed">
                        Great — start by spotting the like terms. Both share <span className="text-accent font-semibold">x</span>. Combine coefficients: (7+39). What do you get?
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sparkline row */}
                <div className="rounded-lg border border-border bg-card/70 p-3 flex items-end gap-1 h-16">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-primary/70"
                      style={{ height: `${20 + Math.sin(i / 2) * 25 + (i % 5) * 4}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="mt-20 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Trusted by educators across IB, IGCSE & US curricula
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4 opacity-70">
            {["Mahindra International", "Cambridge Prep", "Delhi Public", "Lincoln Academy", "St. Xavier's", "Riverside IB"].map((n) => (
              <span key={n} className="text-sm font-medium text-muted-foreground tracking-wide">
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
