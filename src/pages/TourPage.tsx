import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { useSmoothScroll } from "@/components/landing/useSmoothScroll";
import { Container, Eyebrow, GlowButton, QuietLink, SectionTitle, useReveal } from "@/components/landing/primitives";
import RoleCard from "@/components/demo/RoleCard";
import VideoWalkthrough from "@/components/demo/VideoWalkthrough";

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is the tour the real product?",
    a: "Yes. The interactive tour runs the same portal schools use, on sample data in your browser. The only difference is the AI: in the demo its replies are written in advance, while a real account answers anything in your subjects.",
  },
  {
    q: "Will Refyn just give students the answers?",
    a: "Not by default. Guided mode, which is on unless a student switches it off, helps them work things out with hints and questions. Ask it for the answer to an equation in the student tour and see for yourself.",
  },
  {
    q: "What does it cover?",
    a: "Refyn is built around the IB Middle Years Programme: every subject's topics with notes, practice, flashcards and exam-style questions, plus criteria-based marking. Many of the simulations go up to Diploma level too.",
  },
  {
    q: "How does marking work?",
    a: "Hand-ins arrive in one queue. Refyn can draft feedback and suggest a mark from the student's own work, in the tone you pick. You edit it and decide; nothing goes back to a student until you return it.",
  },
  {
    q: "Does it work on phones and tablets?",
    a: "Yes. Refyn works in any modern browser on laptops, tablets and phones, and the layout adapts to each.",
  },
  {
    q: "How much does it cost?",
    a: "Refyn has paid plans for individual students and teachers, and for whole schools. Choose Get started to see the options and request access.",
  },
];

const TourPage = () => {
  useReveal();
  useSmoothScroll();
  const { hash } = useLocation();

  useEffect(() => {
    document.title = "Guided tour · Refyn";
  }, []);

  // Links like /tour#videos land on that section
  useEffect(() => {
    if (!hash) return;
    const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => window.clearTimeout(t);
  }, [hash]);

  return (
    <div className="relative z-[1] min-h-screen overflow-x-clip bg-lp-bg font-ui text-lp-text antialiased selection:bg-lp-blue/40 selection:text-white">
      <LandingNav />
      <main>
        <section aria-labelledby="tour-title" className="relative pb-14 pt-36 sm:pt-44">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-24 h-[520px] w-[1000px] -translate-x-1/2 rounded-full opacity-70 blur-[130px]"
            style={{ background: "radial-gradient(closest-side, rgba(29,78,216,0.5), rgba(63,233,255,0.12), transparent)" }}
          />
          <Container className="relative text-center">
            <Eyebrow>Guided tour</Eyebrow>
            <h1
              id="tour-title"
              className="mx-auto mt-6 max-w-[14ch] text-balance text-[44px] font-normal leading-[0.96] tracking-[-0.045em] text-white sm:text-[66px] lg:text-[82px]"
            >
              See Refyn{" "}
              <span className="bg-gradient-to-r from-lp-sky via-[#A5CCFF] to-lp-cyan bg-clip-text text-transparent">in action.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[36rem] text-balance text-[17px] leading-[1.65] text-lp-soft">
              Take a hands-on tour of the real portal, with every step pointing at the real thing, or sit back and watch a walkthrough.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              <a href="#tours" className="inline-flex items-center gap-1.5 text-[15px] font-medium text-white transition-colors hover:text-lp-sky">
                Interactive tours <ChevronDown aria-hidden className="h-4 w-4" />
              </a>
              <a href="#videos" className="inline-flex items-center gap-1.5 text-[15px] font-medium text-white transition-colors hover:text-lp-sky">
                Video walkthroughs <ChevronDown aria-hidden className="h-4 w-4" />
              </a>
            </div>
          </Container>
        </section>

        <section id="tours" aria-labelledby="tours-title" className="scroll-mt-24 pb-24">
          <Container>
            <div className="lp-reveal mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-lp-sky">Interactive</p>
                <h2 id="tours-title" className="mt-2 text-[30px] font-normal tracking-[-0.035em] text-white sm:text-[38px]">
                  Click through it yourself
                </h2>
              </div>
              <p className="max-w-[26rem] text-[15px] leading-relaxed text-lp-soft">
                Each tour opens the real pages and points out what matters. Stop whenever you like and keep exploring.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <RoleCard role="student" variant="tour" />
              <RoleCard role="teacher" variant="tour" className="lg:[transition-delay:120ms]" />
            </div>
          </Container>
        </section>

        <section id="videos" aria-labelledby="videos-title" className="scroll-mt-24 border-t border-lp-line py-24">
          <Container>
            <div className="lp-reveal mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-lp-sky">Watch</p>
                <h2 id="videos-title" className="mt-2 text-[30px] font-normal tracking-[-0.035em] text-white sm:text-[38px]">
                  Video walkthroughs
                </h2>
              </div>
              <p className="max-w-[26rem] text-[15px] leading-relaxed text-lp-soft">
                Everything in a few minutes. Jump straight to the part you have a question about.
              </p>
            </div>
            <div className="lp-reveal">
              <VideoWalkthrough />
            </div>
          </Container>
        </section>

        <section aria-labelledby="faq-title" className="border-t border-lp-line py-24">
          <Container className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="lp-reveal">
              <SectionTitle id="faq-title" className="text-[34px] sm:text-[44px] lg:text-[52px]">
                Questions, answered.
              </SectionTitle>
              <p className="mt-5 max-w-[24rem] text-[15.5px] leading-relaxed text-lp-soft">
                Anything else? The walkthroughs cover the rest, or get in touch when you request access.
              </p>
            </div>
            <div className="lp-reveal divide-y divide-lp-line rounded-[24px] border border-lp-line bg-lp-surface/40">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="group px-5 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] font-medium text-white">
                    {q}
                    <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-lp-mute transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <p className="-mt-1 pb-5 text-[15px] leading-relaxed text-lp-soft">{a}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        <section className="border-t border-lp-line">
          <Container className="lp-reveal py-24 text-center">
            <h2 className="mx-auto max-w-[16ch] text-balance text-[40px] font-normal leading-[0.98] tracking-[-0.045em] text-white sm:text-[58px]">
              Ready when{" "}
              <span className="bg-gradient-to-r from-lp-sky via-[#A5CCFF] to-lp-cyan bg-clip-text text-transparent">you are.</span>
            </h2>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
              <GlowButton to="/register">
                Get started
                <ArrowRight aria-hidden className="h-4 w-4" />
              </GlowButton>
              <QuietLink to="/demo">
                Try the live demo
                <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </QuietLink>
            </div>
          </Container>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default TourPage;
