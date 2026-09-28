import React from "react";
import { ArrowRight } from "lucide-react";
import { Container, GlowButton, QuietLink } from "./primitives";

const ClosingCta = () => (
  <section aria-labelledby="cta-title" className="relative overflow-hidden border-t border-lp-line">
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-[120px]"
      style={{ background: "radial-gradient(closest-side, rgba(29,78,216,0.55), rgba(63,233,255,0.12), transparent)" }}
    />
    <Container className="lp-reveal relative py-28 text-center lg:py-36">
      <h2
        id="cta-title"
        className="mx-auto max-w-[14ch] text-balance text-[44px] font-normal leading-[0.95] tracking-[-0.045em] text-white sm:text-[64px] lg:text-[84px]"
      >
        Bring AI into class,{" "}
        <span className="bg-gradient-to-r from-lp-sky via-[#A5CCFF] to-lp-cyan bg-clip-text text-transparent">
          on your terms.
        </span>
      </h2>
      <p className="mx-auto mt-7 max-w-[30rem] text-balance text-[17px] leading-[1.65] text-lp-soft">
        Request access for your class or your whole school, or walk through the guided tour first.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
        <GlowButton to="/register">
          Get started
          <ArrowRight aria-hidden className="h-4 w-4" />
        </GlowButton>
        <QuietLink to="/tour">
          Take the guided tour
          <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </QuietLink>
      </div>
    </Container>
  </section>
);

export default ClosingCta;
