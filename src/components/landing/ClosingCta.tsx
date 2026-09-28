import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container, btnPrimary, btnQuiet } from "./primitives";

const ClosingCta = () => (
  <section aria-labelledby="cta-title" className="bg-lp-band">
    <Container className="lp-reveal py-20 text-center lg:py-28">
      <h2
        id="cta-title"
        className="mx-auto max-w-[16ch] font-display text-[42px] font-normal leading-[1.02] tracking-[-0.02em] text-lp-ink sm:text-[56px] lg:text-[72px]"
      >
        Bring AI into class, <em>on your terms.</em>
      </h2>
      <p className="mx-auto mt-6 max-w-[32rem] text-balance text-[17px] leading-[1.65] text-lp-soft">
        Start free and set up your first class, or walk through the guided tour first.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
        <Link to="/signup" className={btnPrimary}>
          Get started free
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
        <Link to="/tour" className={btnQuiet}>
          Take the guided tour
        </Link>
      </div>
    </Container>
  </section>
);

export default ClosingCta;
