import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  GraduationCap,
  Laptop,
  Lock,
  Network,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  Wifi,
  Heart,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Container, Eyebrow, SectionTitle, useSpotlight } from "./primitives";

/* ---------- The request flow ---------- */

const stages = [
  { icon: Laptop, label: "Student devices", sub: "Laptops, Chromebooks, phones" },
  { icon: Wifi, label: "School network", sub: "Wi-Fi and wired" },
  { icon: ShieldCheck, label: "Refyn policy layer", sub: "Guided mode · bypass blocking · roles", accent: true },
  { icon: Sparkles, label: "AI tools", sub: "Answers come back as guidance" },
];

type Decision = { id: number; who: string; request: string; outcome: string; tone: "sky" | "red" | "green" };

const decisions: Omit<Decision, "id">[] = [
  { who: "Grade 10", request: "“Write my essay on Macbeth”", outcome: "Outline first", tone: "sky" },
  { who: "Grade 9", request: "VPN connection attempt", outcome: "Blocked", tone: "red" },
  { who: "Grade 8", request: "“Explain photosynthesis simply”", outcome: "Allowed", tone: "green" },
  { who: "Grade 10", request: "“Just solve question 4”", outcome: "Worked example", tone: "sky" },
  { who: "Grade 7", request: "Custom DNS on a laptop", outcome: "Blocked", tone: "red" },
  { who: "Grade 9", request: "“Check my working on Q3”", outcome: "Allowed", tone: "green" },
];

const toneClass = {
  sky: "border-lp-sky/30 bg-lp-sky/10 text-lp-sky",
  red: "border-lp-red/30 bg-lp-red/10 text-lp-red",
  green: "border-lp-green/30 bg-lp-green/10 text-lp-green",
};

/** A small rolling log of policy decisions; the newest slides in at the top. */
const useDecisionLog = (size = 3, every = 2600) => {
  const counter = useRef(size);
  const [log, setLog] = useState<Decision[]>(() =>
    decisions.slice(0, size).map((d, i) => ({ ...d, id: i })).reverse(),
  );
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (ref.current) io.observe(ref.current);
    const t = window.setInterval(() => {
      if (!visible) return;
      const next = counter.current++;
      setLog((l) => [{ ...decisions[next % decisions.length], id: next }, ...l].slice(0, size));
    }, every);
    return () => {
      io.disconnect();
      window.clearInterval(t);
    };
  }, [size, every]);
  return { log, ref };
};

const Stage: React.FC<{ stage: (typeof stages)[number] }> = ({ stage }) => {
  const Icon = stage.icon;
  return (
    <div
      className={cn(
        "relative flex min-w-0 items-center gap-3 rounded-2xl border px-4 py-3.5 lg:flex-col lg:items-start lg:gap-4 lg:px-5 lg:py-5",
        stage.accent
          ? "border-lp-blue/60 bg-gradient-to-b from-lp-blue/25 to-lp-blue/5 shadow-[0_0_50px_-10px_rgba(59,130,246,0.7)]"
          : "border-lp-line bg-lp-surface/80",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          stage.accent ? "bg-lp-blue text-white" : "bg-lp-raised text-lp-sky",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className={cn("block text-[15px] font-medium", stage.accent ? "text-white" : "text-lp-text")}>{stage.label}</span>
        <span className="block text-[12.5px] text-lp-soft">{stage.sub}</span>
      </span>
      {stage.accent && (
        <span className="absolute right-3 top-3 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lp-sky opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-lp-sky" />
        </span>
      )}
    </div>
  );
};

const FlowCard = () => {
  const { log, ref } = useDecisionLog();
  return (
    <div
      ref={ref}
      className="lp-reveal overflow-hidden rounded-3xl border border-lp-line bg-gradient-to-b from-lp-surface to-lp-bg/60"
    >
      <div className="flex flex-col p-5 sm:p-7 lg:flex-row lg:items-stretch">
        {stages.map((s, i) => (
          <React.Fragment key={s.label}>
            <div className="lg:w-[20%] lg:shrink-0">
              <Stage stage={s} />
            </div>
            {i < stages.length - 1 && (
              <>
                <div aria-hidden className="lp-flow mx-auto h-7 w-px bg-gradient-to-b from-lp-line via-lp-blue/60 to-lp-line lg:hidden" />
                <div
                  aria-hidden
                  className="lp-flow-x hidden h-px flex-1 self-center bg-gradient-to-r from-lp-line via-lp-blue/60 to-lp-line lg:block"
                  style={{ ["--flow-delay" as string]: `${i * 0.35}s` }}
                />
              </>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="border-t border-lp-line bg-lp-deep/40 px-5 py-5 sm:px-7">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">Policy decisions · live</p>
          <span className="flex items-center gap-1.5 text-[12px] text-lp-green">
            <span className="h-1.5 w-1.5 rounded-full bg-lp-green shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
            Enforcing
          </span>
        </div>
        <ul className="space-y-2" aria-live="off">
          {log.map((d, i) => (
            <li
              key={d.id}
              className={cn(
                "lp-fade flex items-center gap-3 rounded-xl border border-lp-line bg-lp-surface/60 px-3.5 py-2.5 text-[13.5px] transition-opacity duration-500",
                i === 0 ? "opacity-100" : i === 1 ? "opacity-70" : "opacity-40",
              )}
            >
              <span className="hidden w-16 shrink-0 text-[12px] text-lp-mute sm:block">{d.who}</span>
              <span className="min-w-0 flex-1 truncate text-lp-text">{d.request}</span>
              <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-lp-mute" />
              <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-[12px] font-medium", toneClass[d.tone])}>
                {d.outcome}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/* ---------- Feature cards, each with a small visual ---------- */

const FeatureCard: React.FC<{
  icon: React.ElementType;
  title: string;
  body: string;
  delay: number;
  children: React.ReactNode;
}> = ({ icon: Icon, title, body, delay, children }) => {
  const onMove = useSpotlight();
  return (
    <div className="lp-reveal" style={{ transitionDelay: `${delay}ms` }}>
      <div
        onMouseMove={onMove}
        className="lp-spot group flex h-full flex-col rounded-3xl border border-lp-line bg-lp-surface/70 p-6 transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-lp-blue/40"
      >
        <div className="min-h-[132px]">{children}</div>
        <div className="mt-6 flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-lp-sky" />
          <h3 className="text-[16px] font-medium text-lp-text">{title}</h3>
        </div>
        <p className="mt-2 text-[14px] leading-[1.6] text-lp-soft">{body}</p>
      </div>
    </div>
  );
};

const FilteringVisual = () => (
  <ul className="space-y-2">
    {["Laptop", "Chromebook", "Phone"].map((d) => (
      <li key={d} className="flex items-center justify-between rounded-xl border border-lp-line bg-lp-bg/50 px-3 py-2 text-[13px]">
        <span className="text-lp-text">{d}</span>
        <span className="flex items-center gap-1 text-[12px] text-lp-green">
          <Check className="h-3.5 w-3.5" /> Same policy
        </span>
      </li>
    ))}
  </ul>
);

const BypassVisual = () => (
  <ul className="space-y-2">
    {["VPN tunnel", "Custom DNS", "Web proxy"].map((d) => (
      <li key={d} className="flex items-center justify-between rounded-xl border border-lp-line bg-lp-bg/50 px-3 py-2 text-[13px]">
        <span className="lp-strike text-lp-mute">{d}</span>
        <span className="rounded-full border border-lp-red/30 bg-lp-red/10 px-2 py-0.5 text-[11.5px] font-medium text-lp-red">Blocked</span>
      </li>
    ))}
  </ul>
);

const roles = [
  { icon: UserCog, role: "Admin", sees: "Whole school" },
  { icon: BookOpen, role: "Teacher", sees: "Their classes" },
  { icon: GraduationCap, role: "Student", sees: "Their own work" },
  { icon: Heart, role: "Parent", sees: "Their child" },
];

const RolesVisual = () => (
  <ul className="grid grid-cols-2 gap-2">
    {roles.map(({ icon: Icon, role, sees }) => (
      <li key={role} className="rounded-xl border border-lp-line bg-lp-bg/50 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[13px] text-lp-text">
          <Icon className="h-3.5 w-3.5 text-lp-sky" />
          {role}
        </span>
        <span className="mt-0.5 block text-[11.5px] text-lp-mute">{sees}</span>
      </li>
    ))}
  </ul>
);

const usage = [
  { cls: "10B", n: 42 },
  { cls: "9A", n: 31 },
  { cls: "8C", n: 18 },
  { cls: "10A", n: 12 },
];

const UsageVisual = () => (
  <div>
    <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-lp-mute">AI sessions this week</p>
    <ul className="space-y-2.5">
      {usage.map((u, i) => (
        <li key={u.cls} className="flex items-center gap-3 text-[12.5px]">
          <span className="w-8 shrink-0 text-lp-soft">{u.cls}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-lp-line">
            <span
              className="lp-grow block h-full rounded-full bg-gradient-to-r from-lp-blue to-lp-cyan"
              style={{ width: `${(u.n / usage[0].n) * 100}%`, transitionDelay: `${300 + i * 120}ms` }}
            />
          </span>
          <span className="w-6 shrink-0 text-right tabular-nums text-lp-mute">{u.n}</span>
        </li>
      ))}
    </ul>
  </div>
);

const NetworkSection = () => (
  <section id="schools" aria-labelledby="schools-title" className="relative scroll-mt-20 overflow-hidden border-t border-lp-line bg-lp-deep">
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-40 h-[480px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-[130px]"
      style={{ background: "radial-gradient(closest-side, rgba(59,130,246,0.5), transparent)" }}
    />
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-50"
      style={{
        backgroundImage: "radial-gradient(rgba(124,180,255,0.12) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: "radial-gradient(ellipse 70% 50% at 50% 35%, #000 20%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 50% at 50% 35%, #000 20%, transparent 75%)",
      }}
    />
    <Container className="relative py-24 lg:py-32">
      <div className="lp-reveal grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Eyebrow>For IT teams and school leaders</Eyebrow>
          <SectionTitle id="schools-title" className="mt-6">
            It works on the network, <span className="text-lp-mute">not just inside one app.</span>
          </SectionTitle>
        </div>
        <p className="max-w-[28rem] text-[17px] leading-[1.65] text-lp-soft lg:col-span-5">
          Every AI request on the school network passes through one policy, so the rules follow students across every
          device and browser.
        </p>
      </div>

      <div className="mt-12 lg:mt-14">
        <FlowCard />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <FeatureCard icon={Network} title="Network-level filtering" body="One policy for every device and browser on the school network." delay={0}>
          <FilteringVisual />
        </FeatureCard>
        <FeatureCard icon={Lock} title="Bypass prevention" body="VPN, DNS and proxy workarounds are blocked, so the guardrails stay on." delay={80}>
          <BypassVisual />
        </FeatureCard>
        <FeatureCard icon={Users} title="Role-based access" body="Everyone gets their own dashboard, and sees only what their role allows." delay={160}>
          <RolesVisual />
        </FeatureCard>
        <FeatureCard icon={BarChart3} title="Usage you can review" body="AI use by class and by student, so the conversations worth a look don't get lost." delay={240}>
          <UsageVisual />
        </FeatureCard>
      </div>
    </Container>
  </section>
);

export default NetworkSection;
