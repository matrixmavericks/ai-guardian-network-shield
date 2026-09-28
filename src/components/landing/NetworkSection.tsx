import React from "react";
import { Container } from "./primitives";

const specs = [
  {
    title: "Network-level filtering",
    body: "Every AI request on the school network passes through the same policy, whatever the device or browser.",
  },
  {
    title: "Bypass prevention",
    body: "VPN, DNS and proxy workarounds are blocked, so the guardrails can't be switched off from a student's laptop.",
  },
  {
    title: "Role-based access",
    body: "Admins, teachers, students and parents each get their own dashboard, and see only what their role allows.",
  },
  {
    title: "Usage you can review",
    body: "AI use broken down by class and by student, so the conversations worth a second look don't get lost.",
  },
];

const Node: React.FC<{ label: string; sub?: string; accent?: boolean }> = ({ label, sub, accent }) => (
  <div
    className={
      accent
        ? "rounded-2xl border border-lp-pen/70 bg-[#1D1F24] px-5 py-4"
        : "rounded-2xl border border-lp-night-line px-5 py-4"
    }
  >
    <p className={accent ? "font-display text-[24px] leading-tight text-lp-paper" : "text-[15px] text-lp-paper"}>{label}</p>
    {sub && <p className="mt-1 text-[13px] text-lp-night-soft">{sub}</p>}
  </div>
);

const Connector = () => <div aria-hidden className="mx-auto h-7 w-px bg-lp-night-line" />;

const NetworkSection = () => (
  <section id="schools" aria-labelledby="schools-title" className="scroll-mt-16 bg-lp-night text-lp-paper">
    <Container className="grid grid-cols-1 gap-14 py-20 lg:grid-cols-12 lg:gap-16 lg:py-28">
      <div className="lp-reveal lg:col-span-6">
        <p className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-lp-night-soft">
          <span aria-hidden className="h-px w-6 bg-lp-pen" />
          For IT teams and school leaders
        </p>
        <h2
          id="schools-title"
          className="mt-5 text-balance font-display text-[38px] font-normal leading-[1.04] tracking-[-0.015em] sm:text-[48px] lg:text-[56px]"
        >
          It works on the network, <em className="text-lp-night-soft">not just inside one app.</em>
        </h2>
        <p className="mt-6 max-w-[34rem] text-[17px] leading-[1.65] text-lp-night-soft">
          Refyn sits on the school network, so the rules follow students across every device and browser, and the
          whole school runs on one policy instead of a patchwork of blocked sites.
        </p>

        <dl className="mt-12 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
          {specs.map((s) => (
            <div key={s.title} className="border-t border-lp-night-line py-5">
              <dt className="text-[15px] font-semibold text-lp-paper">{s.title}</dt>
              <dd className="mt-2 text-[14.5px] leading-[1.6] text-lp-night-soft">{s.body}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* A plain diagram of where Refyn sits */}
      <figure className="lp-reveal self-center lg:col-span-5 lg:col-start-8" aria-label="Where Refyn sits on the school network">
        <div className="grid grid-cols-3 gap-2 text-center text-[13px] text-lp-night-soft">
          {["Laptops", "Chromebooks", "Phones"].map((d) => (
            <span key={d} className="rounded-full border border-lp-night-line px-2 py-2">
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
        <figcaption className="mt-6 font-hand text-[22px] text-lp-night-soft">one policy, every device →</figcaption>
      </figure>
    </Container>
  </section>
);

export default NetworkSection;
