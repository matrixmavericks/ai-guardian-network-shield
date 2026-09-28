import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { photos } from "./photos";
import { Container, Eyebrow, Photo, btnPrimary, btnQuiet } from "./primitives";

const schools = ["Mahindra International", "Cambridge Prep", "Delhi Public", "Lincoln Academy", "St. Xavier's", "Riverside IB"];

/** The core idea in one card: a request for the answer, crossed out and turned into a question. */
const GuidedCard: React.FC<{ className?: string }> = ({ className }) => (
  <figure
    className={`rounded-[18px] border border-lp-line bg-lp-card p-5 shadow-[0_1px_0_rgba(23,25,30,0.04),0_24px_48px_-24px_rgba(23,25,30,0.35)] ${className ?? ""}`}
  >
    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-lp-mute">
      <span>Grade 8 · Algebra</span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lp-moss" />
        Guided mode
      </span>
    </div>

    <div className="mt-4 space-y-3 text-[14.5px] leading-relaxed">
      <p className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-md bg-lp-band px-3.5 py-2.5 text-lp-ink">
        can you just give me the answer to 7x + 39x
      </p>

      <div className="relative pr-24">
        <p className="text-lp-mute">
          <span className="line-through decoration-lp-pen decoration-2">The answer is 46x.</span>
        </p>
        <span aria-hidden className="absolute -top-2 right-0 rotate-[-5deg] font-hand text-[23px] leading-none text-lp-pen">
          try it first!
        </span>
      </div>

      <p className="max-w-[94%] rounded-2xl rounded-bl-md border border-lp-line bg-lp-paper px-3.5 py-2.5 text-lp-ink">
        Both terms have an <em>x</em>, so they're like terms. What do you get when you add 7 and 39?
      </p>
    </div>

    <figcaption className="mt-4 border-t border-lp-line pt-3 text-[12.5px] text-lp-mute">
      Ms. Rao sees this thread in her class feed.
    </figcaption>
  </figure>
);

const Hero = () => (
  <section className="relative">
    <Container className="grid grid-cols-1 items-center gap-y-14 pb-16 pt-10 sm:pt-14 lg:grid-cols-12 lg:gap-x-12 lg:pb-24 lg:pt-16">
      <div className="lg:col-span-7">
        <Eyebrow>Ethical AI for schools</Eyebrow>

        <h1 className="mt-6 font-display text-[52px] font-normal leading-[0.98] tracking-[-0.02em] text-lp-ink sm:text-[64px] lg:text-[76px] xl:text-[84px]">
          AI that teaches
          <br />
          the{" "}
          <span className="relative inline-block italic">
            thinking
            <svg
              aria-hidden
              viewBox="0 0 220 16"
              preserveAspectRatio="none"
              className="absolute -bottom-[0.06em] left-[-2%] h-[0.2em] w-[104%] overflow-visible text-lp-pen"
            >
              <path
                d="M3 11 C 52 4, 128 1, 217 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                pathLength={1}
                className="lp-draw"
              />
            </svg>
          </span>
          ,
          <br />
          not the answer.
        </h1>

        <p className="mt-8 max-w-[34rem] text-[18px] leading-[1.6] text-lp-soft">
          When a student asks AI to do the work, Refyn turns the request into a guided lesson. Teachers see how AI is
          used in every class, and students keep the learning, with a portfolio to show for it.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
          <Link to="/signup" className={btnPrimary}>
            Get started free
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link to="/tour" className={btnQuiet}>
            Take the guided tour
          </Link>
        </div>
      </div>

      <div className="relative lg:col-span-5">
        <Photo
          photo={photos.hero}
          priority
          sizes="(min-width: 1024px) 460px, 100vw"
          className="aspect-[4/3] rounded-[22px] sm:aspect-[5/4] lg:aspect-[4/5]"
        />
        <GuidedCard className="relative mx-3 -mt-20 sm:mx-auto sm:w-[380px] lg:absolute lg:-left-24 lg:bottom-8 lg:mx-0 lg:mt-0 lg:w-[350px]" />
      </div>
    </Container>

    <div className="border-y border-lp-line">
      <Container className="py-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-lp-mute">
          Trusted by educators across IB, IGCSE &amp; US curricula
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2 lg:justify-between">
          {schools.map((s) => (
            <li key={s} className="font-display text-[21px] italic text-lp-soft lg:text-[24px]">
              {s}
            </li>
          ))}
        </ul>
      </Container>
    </div>
  </section>
);

export default Hero;
