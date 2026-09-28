import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import BoomerangVideoBg from "./BoomerangVideoBg";
import { Container, GlowButton } from "./primitives";

// Hosted by the template this hero came from. Put your own copy on a CDN you
// control (or in /public) so the hero never depends on someone else's bucket.
const BG_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_131941_d136af49-e243-493a-be14-6ff3f24e09e6.mp4";

// Drop the school's logo here (transparent PNG or SVG); until then the name shows.
const MIS_LOGO = "/schools/mis-logo.png";

const PilotBand = () => {
  const [logoOk, setLogoOk] = useState(true);
  return (
    <div className="relative border-y border-lp-line bg-lp-deep">
      <Container className="lp-reveal flex flex-col items-center gap-8 py-12 text-center md:flex-row md:justify-between md:py-14 md:text-left">
        <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-lp-mute">Now piloting at</p>
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
          {logoOk && (
            <img
              src={MIS_LOGO}
              alt="Mahindra International School logo"
              onError={() => setLogoOk(false)}
              className="h-20 w-auto object-contain md:h-24"
            />
          )}
          <div>
            <p className="text-[72px] font-semibold leading-[0.85] tracking-[-0.05em] text-white md:text-[96px]">MIS</p>
            <p className="mt-3 text-[15px] text-lp-soft">Mahindra International School, Pune</p>
          </div>
        </div>
        <p className="max-w-[16rem] text-[14px] leading-relaxed text-lp-soft md:text-right">
          Our pilot school, running Refyn in IB Middle Years Programme classrooms.
        </p>
      </Container>
    </div>
  );
};

const Hero = () => (
  <>
    <section className="relative min-h-[100svh] w-full overflow-hidden bg-lp-deep sm:min-h-[720px] lg:h-screen">
      {/* Video, shifted to blue but kept bright enough to read as footage */}
      <BoomerangVideoBg
        src={BG_VIDEO}
        className="absolute inset-0 h-full w-full"
        mediaClassName="grayscale contrast-[1.1] brightness-[1.15]"
      />
      <div aria-hidden className="absolute inset-0 bg-[#2563EB] opacity-80 mix-blend-color" />
      <div aria-hidden className="absolute inset-0 bg-[#0B1A45] opacity-25 mix-blend-multiply" />
      {/* Just enough shade for the text at the top and the CTA at the bottom */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 32% at 50% 36%, rgba(5,12,40,0.55), transparent 75%), linear-gradient(180deg, rgba(3,6,15,0.6) 0%, rgba(3,6,15,0.15) 30%, rgba(3,6,15,0) 55%, rgba(3,6,15,0.45) 85%, #03060F 100%)",
        }}
      />

      {/* Hero copy */}
      <div className="relative z-10 flex flex-col items-center px-4 pb-72 pt-32 text-center sm:px-6 sm:pt-36 md:pt-40 lg:pb-0">
        <p className="lp-reveal inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[12.5px] font-medium text-white/90 backdrop-blur-md">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lp-cyan shadow-[0_0_10px_2px_rgba(63,233,255,0.6)]" />
          Ethical AI for schools
        </p>
        <h1
          className="lp-reveal mt-7 max-w-5xl text-[2.6rem] font-normal leading-[0.95] tracking-[-0.045em] text-white [text-shadow:0_2px_30px_rgba(3,6,15,0.35)] sm:text-6xl md:text-7xl lg:text-[5.25rem] xl:text-[5.75rem]"
          style={{ transitionDelay: "80ms" }}
        >
          AI that teaches the thinking,{" "}
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-[#93C5FD] via-[#BFDBFE] to-lp-cyan bg-clip-text text-transparent [filter:drop-shadow(0_2px_24px_rgba(3,6,15,0.45))]">
            not the answer.
          </span>
        </h1>
        <p
          className="lp-reveal mt-6 max-w-md px-2 text-[15px] leading-relaxed text-white/80 sm:mt-8 sm:text-base md:text-lg"
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
        <p className="mb-6 max-w-xs text-[13px] leading-relaxed text-white/75">
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
    <PilotBand />
  </>
);

export default Hero;
