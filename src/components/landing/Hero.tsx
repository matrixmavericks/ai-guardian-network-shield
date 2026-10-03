import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import misLogo from "@/assets/photos/mis-logo.png";
import BoomerangVideoBg from "./BoomerangVideoBg";
import { BG_VIDEO } from "./media";
import { Container, GlowButton } from "./primitives";


const PilotBand = () => (
  <div className="relative overflow-hidden border-y border-lp-line bg-lp-deep">
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[100px]"
      style={{ background: "radial-gradient(closest-side, rgba(59,130,246,0.5), transparent)" }}
    />
    <Container className="lp-reveal relative flex flex-col items-center gap-8 py-12 text-center md:flex-row md:justify-between md:py-14 md:text-left">
      <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-lp-mute">Now piloting at</p>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
        {/* The logo has a white background, so it sits on its own white tile */}
        <div className="rounded-2xl bg-[#FFFFFF] px-4 py-3 shadow-[0_20px_50px_-20px_rgba(59,130,246,0.6)] ring-1 ring-white/20 transition-transform duration-500 hover:-rotate-1 hover:scale-[1.03]">
          <img src={misLogo} alt="Mahindra International School" width={239} height={151} className="h-20 w-auto md:h-24" />
        </div>
        <div>
          <p className="text-[72px] font-semibold leading-[0.85] tracking-[-0.05em] text-white md:text-[96px]">MIS</p>
          <p className="mt-3 text-[15px] text-lp-soft">Mahindra International School · Pune</p>
        </div>
      </div>
      <p className="max-w-[16rem] text-[14px] leading-relaxed text-lp-soft md:text-right">
        Our pilot school, running Refyn in IB Middle Years Programme classrooms.
      </p>
    </Container>
  </div>
);

const Hero = () => (
  <>
    <section className="relative min-h-[100svh] w-full overflow-hidden bg-lp-deep sm:min-h-[720px] lg:h-screen">
      {/* Keep the footage's original colors visible. */}
      <BoomerangVideoBg
        src={BG_VIDEO}
        className="absolute inset-0 h-full w-full"
        mediaClassName="contrast-[1.06] saturate-[1.25]"
      />
      {/* Just enough shade for the text at the top and the CTA at the bottom */}
      <div aria-hidden className="lp-video-shade absolute inset-0" />

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
          <GlowButton to="/register">
            Get started
            <ArrowRight aria-hidden className="h-4 w-4" />
          </GlowButton>
          <Link to="/tour" className="text-sm font-medium text-white transition-opacity hover:opacity-80">
            Know more.
          </Link>
        </div>
      </div>

      {/* Bottom-right tour link */}
      <Link
        to="/tour#videos"
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
