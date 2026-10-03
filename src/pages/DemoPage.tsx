import React, { useEffect } from "react";
import { ArrowRight, MousePointerClick, PlayCircle, ShieldCheck, Timer } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { useSmoothScroll } from "@/components/landing/useSmoothScroll";
import { Container, Eyebrow, QuietLink, useReveal } from "@/components/landing/primitives";
import RoleCard from "@/components/demo/RoleCard";

const FACTS = [
  { icon: MousePointerClick, title: "The real portal", body: "The same pages your school would use, not a video or a mock-up." },
  { icon: ShieldCheck, title: "Nothing is saved", body: "It runs on sample data in your browser and resets when you close the tab." },
  { icon: Timer, title: "About five minutes", body: "Follow a guided tour, or wander off and click anything you like." },
];

const DemoPage = () => {
  useReveal();
  useSmoothScroll();
  useEffect(() => {
    document.title = "Live demo · Refyn";
  }, []);

  return (
    <div className="relative z-[1] min-h-screen overflow-x-clip bg-lp-bg font-ui text-lp-text antialiased selection:bg-lp-blue/40 selection:text-white">
      <LandingNav />
      <main>
        <section aria-labelledby="demo-title" className="relative pb-14 pt-36 sm:pt-44">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-24 h-[520px] w-[1000px] -translate-x-1/2 rounded-full opacity-70 blur-[130px]"
            style={{ background: "radial-gradient(closest-side, rgba(29,78,216,0.5), rgba(63,233,255,0.12), transparent)" }}
          />
          <Container className="relative text-center">
            <Eyebrow>Live demo · no sign-up</Eyebrow>
            <h1
              id="demo-title"
              className="mx-auto mt-6 max-w-[15ch] text-balance text-[44px] font-normal leading-[0.96] tracking-[-0.045em] text-white sm:text-[66px] lg:text-[82px]"
            >
              Try the real Refyn,{" "}
              <span className="bg-gradient-to-r from-lp-sky via-[#A5CCFF] to-lp-cyan bg-clip-text text-transparent">right now.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[36rem] text-balance text-[17px] leading-[1.65] text-lp-soft">
              Pick a side and you're in: the full portal, running on sample data. Ask the AI, open a simulation, mark some work.
            </p>
          </Container>
        </section>

        <section aria-label="Choose a side" className="relative pb-16">
          <Container>
            <div className="grid gap-6 lg:grid-cols-2">
              <RoleCard role="student" />
              <RoleCard role="teacher" className="lg:[transition-delay:120ms]" />
            </div>

            <ul className="lp-reveal mt-10 grid gap-4 sm:grid-cols-3">
              {FACTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="rounded-3xl border border-lp-line bg-lp-surface/40 p-5">
                  <Icon aria-hidden className="h-5 w-5 text-lp-sky" />
                  <p className="mt-3 text-[15px] font-medium text-white">{title}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-lp-soft">{body}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        <section className="border-t border-lp-line">
          <Container className="lp-reveal flex flex-col items-start justify-between gap-6 py-14 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-lp-line bg-lp-surface/60">
                <PlayCircle aria-hidden className="h-6 w-6 text-lp-cyan" />
              </span>
              <div>
                <p className="text-[20px] font-medium tracking-[-0.02em] text-white">Rather watch first?</p>
                <p className="mt-0.5 text-[15px] text-lp-soft">Short walkthroughs for students and teachers, with chapters.</p>
              </div>
            </div>
            <QuietLink to="/tour#videos">
              Watch the walkthroughs
              <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </QuietLink>
          </Container>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default DemoPage;
