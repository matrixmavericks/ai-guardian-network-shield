import React from "react";
import { Eye, Lock, Network, Users } from "lucide-react";
import { Container, Eyebrow, SectionTitle, useSpotlight } from "./primitives";

const specs = [
  {
    icon: Network,
    title: "Network-level filtering",
    body: "Every AI request on the school network passes through the same policy, whatever the device or browser.",
  },
  {
    icon: Lock,
    title: "Bypass prevention",
    body: "VPN, DNS and proxy workarounds are blocked, so the guardrails can't be switched off from a student's laptop.",
  },
  {
    icon: Users,
    title: "Role-based access",
    body: "Admins, teachers, students and parents each get their own dashboard, and see only what their role allows.",
  },
  {
    icon: Eye,
    title: "Usage you can review",
    body: "AI use broken down by class and by student, so the conversations worth a second look don't get lost.",
  },
];

const Node: React.FC<{ label: string; sub?: string; accent?: boolean }> = ({ label, sub, accent }) => (
  <div
    className={
      accent
        ? "rounded-2xl border border-lp-blue/60 bg-gradient-to-b from-lp-blue/20 to-lp-blue/5 px-5 py-4 shadow-[0_0_40px_-8px_rgba(59,130,246,0.6)]"
        : "rounded-2xl border border-lp-line bg-lp-surface/80 px-5 py-4"
    }
  >
    <p className={accent ? "text-[18px] font-semibold tracking-[-0.01em] text-white" : "text-[15px] text-lp-text"}>{label}</p>
    {sub && <p className="mt-1 text-[13px] text-lp-soft">{sub}</p>}
  </div>
);

const Connector = () => (
  <div aria-hidden className="lp-flow mx-auto h-10 w-px bg-gradient-to-b from-lp-line via-lp-blue/60 to-lp-line" />
);

const SpecCard: React.FC<{ spec: (typeof specs)[number] }> = ({ spec }) => {
  const onMove = useSpotlight();
  const Icon = spec.icon;
  return (
    <div
      onMouseMove={onMove}
      className="lp-spot h-full rounded-2xl border border-lp-line bg-lp-surface/60 p-5 transition-colors duration-300 hover:border-lp-blue/40"
    >
      <Icon className="h-5 w-5 text-lp-sky" />
      <h3 className="mt-4 text-[16px] font-medium text-lp-text">{spec.title}</h3>
      <p className="mt-2 text-[14px] leading-[1.6] text-lp-soft">{spec.body}</p>
    </div>
  );
};

const NetworkSection = () => (
  <section id="schools" aria-labelledby="schools-title" className="relative scroll-mt-20 overflow-hidden border-t border-lp-line bg-lp-deep">
    {/* Faint dot field behind the diagram */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-50"
      style={{
        backgroundImage: "radial-gradient(rgba(124,180,255,0.14) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: "radial-gradient(ellipse 60% 70% at 75% 50%, #000 20%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 75% 50%, #000 20%, transparent 75%)",
      }}
    />
    <Container className="relative grid grid-cols-1 gap-16 py-24 lg:grid-cols-12 lg:py-32">
      <div className="lg:col-span-7">
        <div className="lp-reveal">
          <Eyebrow>For IT teams and school leaders</Eyebrow>
          <SectionTitle id="schools-title" className="mt-6">
            It works on the network, <span className="text-lp-mute">not just inside one app.</span>
          </SectionTitle>
          <p className="mt-6 max-w-[34rem] text-[17px] leading-[1.65] text-lp-soft">
            Refyn sits on the school network, so the rules follow students across every device and browser, and the
            whole school runs on one policy instead of a patchwork of blocked sites.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {specs.map((s, i) => (
            <div key={s.title} className="lp-reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <SpecCard spec={s} />
            </div>
          ))}
        </div>
      </div>

      {/* Where Refyn sits, with requests flowing through it */}
      <figure className="lp-reveal self-center lg:col-span-5" aria-label="Where Refyn sits on the school network">
        <div className="grid grid-cols-3 gap-2 text-center text-[13px] text-lp-soft">
          {["Laptops", "Chromebooks", "Phones"].map((d) => (
            <span key={d} className="rounded-full border border-lp-line bg-lp-surface/80 px-2 py-2">
              {d}
            </span>
          ))}
        </div>
        <Connector />
        <Node label="School network" sub="Wi-Fi and wired, every classroom" />
        <Connector />
        <Node label="Refyn policy layer" sub="Guided mode · bypass blocking · roles" accent />
        <Connector />
        <Node label="The AI tools students use" sub="Answers come back as guidance" />
      </figure>
    </Container>
  </section>
);

export default NetworkSection;
