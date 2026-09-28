import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import BoomerangVideoBg from "./BoomerangVideoBg";
import { GlowButton } from "./primitives";

// Hosted by the template this hero came from. Put your own copy on a CDN you
// control (or in /public) so the hero never depends on someone else's bucket.
const BG_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_131941_d136af49-e243-493a-be14-6ff3f24e09e6.mp4";

const schools = ["Mahindra International", "Cambridge Prep", "Delhi Public", "Lincoln Academy", "St. Xavier's", "Riverside IB"];

const TrustMarquee = () => (
  <div className="relative border-y border-lp-line bg-lp-deep/60">
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-5 py-6 sm:px-8 md:flex-row md:items-center md:gap-10">
      <p className="shrink-0 text-[12px] font-medium uppercase tracking-[0.18em] text-lp-mute">
        Trusted across IB, IGCSE &amp; US curricula
      </p>
      <div className="lp-marquee relative min-w-0 flex-1 overflow-hidden">
        <ul className="lp-marquee__track flex w-max items-center">
          {[...schools, ...schools].map((s, i) => (
            <li
              key={`${s}-${i}`}
              aria-hidden={i >= schools.length}
              className="flex items-center gap-3 whitespace-nowrap px-6 text-[17px] font-medium tracking-[-0.01em] text-lp-soft transition-colors hover:text-white"
            >
              <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-lp-blue/70" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const Hero = () => (
  <>
    <section className="relative min-h-[100svh] w-full overflow-hidden bg-lp-deep sm:min-h-[720px] lg:h-screen">
      {/* Video, pushed into a blue duotone so it always matches the palette */}
      <BoomerangVideoBg
        src={BG_VIDEO}
        className="absolute inset-0 h-full w-full"
        mediaClassName="grayscale contrast-[1.15] brightness-[0.85]"
      />
      <div aria-hidden className="absolute inset-0 bg-[#1D4ED8] mix-blend-color" />
      <div aria-hidden className="absolute inset-0 bg-[#0B1A45] mix-blend-multiply" />
      {/* Fallback glow + legibility gradients */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 30%, rgba(59,130,246,0.28), transparent 70%), linear-gradient(180deg, rgba(3,6,15,0.55) 0%, rgba(3,6,15,0.15) 35%, rgba(3,6,15,0.35) 65%, #03060F 100%)",
        }}
      />

      {/* Hero copy */}
      <div className="relative z-10 flex flex-col items-center px-4 pb-72 pt-32 text-center sm:px-6 sm:pt-36 md:pt-40 lg:pb-0">
        <p className="lp-reveal inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] font-medium text-lp-soft backdrop-blur-md">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lp-cyan shadow-[0_0_10px_2px_rgba(63,233,255,0.6)]" />
          Ethical AI for schools
        </p>
        <h1
          className="lp-reveal mt-7 max-w-5xl text-[2.6rem] font-normal leading-[0.95] tracking-[-0.045em] text-white sm:text-6xl md:text-7xl lg:text-[5.25rem] xl:text-[5.75rem]"
          style={{ transitionDelay: "80ms" }}
        >
          AI that teaches the thinking,{" "}
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-lp-sky via-[#A5CCFF] to-lp-cyan bg-clip-text text-transparent">
            not the answer.
          </span>
        </h1>
        <p
          className="lp-reveal mt-6 max-w-md px-2 text-[15px] leading-relaxed text-lp-soft sm:mt-8 sm:text-base md:text-lg"
          style={{ transitionDelay: "160ms" }}
        >
          Refyn turns “just give me the answer” into a guided lesson, and shows teachers how AI is really used in every
          class.
        </p>
      </div>

      {/* Bottom-left CTA block */}
      <div className="absolute bottom-6 left-4 right-4 z-10 max-w-sm sm:bottom-8 sm:left-6 sm:right-auto md:bottom-10 md:left-10">
        <div className="mb-3 flex items-center gap-2 text-white">
          <Sparkles className="h-4 w-4 text-lp-cyan" />
          <span className="text-sm font-semibold">Guided Mode</span>
        </div>
        <p className="mb-6 max-w-xs text-[13px] leading-relaxed text-lp-soft">
          Students keep using AI. Refyn makes sure they still do the thinking: requests for finished work come back as
          hints, questions and worked examples.
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <GlowButton to="/signup">
            Get started free
            <ArrowRight aria-hidden className="h-4 w-4" />
          </GlowButton>
          <Link to="/tour" className="text-sm font-medium text-white transition-opacity hover:opacity-80">
            Know more.
          </Link>
        </div>
      </div>

      {/* Bottom-right tour link */}
      <Link
        to="/tour"
        className="group absolute bottom-8 right-6 z-10 hidden items-center gap-2 text-sm text-white/90 sm:flex md:bottom-10 md:right-10"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-all group-hover:scale-110 group-hover:bg-white/25">
          <Play className="ml-0.5 h-3 w-3 fill-white text-white" />
        </span>
        <span className="font-medium">Watch the guided tour</span>
      </Link>
    </section>
    <TrustMarquee />
  </>
);

export default Hero;
