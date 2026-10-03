import React from "react";
import { Sparkles } from "lucide-react";
import studentAi from "@/assets/landing/why-ai-essay.webp";
import { Container, Eyebrow, SectionTitle, useSpotlight } from "./primitives";

const rewrites = [
  {
    asked: "Write my essay on Macbeth.",
    reply: "Let's outline your argument first. Is Macbeth driven more by ambition, or by fear?",
  },
  {
    asked: "Just solve question 4 for me.",
    reply: "Here's a similar problem worked through step by step. Now try yours, and I'll check your working.",
  },
  {
    asked: "Summarise chapter 6.",
    reply: "Tell me the three moments you remember most, and we'll fill in the gaps together.",
  },
];

/** The core idea in one card: the answer, crossed out and turned into a question. */
const GuidedCard = () => {
  const onMove = useSpotlight();
  return (
    <figure
      onMouseMove={onMove}
      className="lp-spot lp-reveal rounded-3xl border border-lp-line bg-gradient-to-b from-lp-raised to-lp-surface p-6 shadow-[0_40px_100px_-40px_rgba(29,78,216,0.55)] sm:p-7"
    >
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-lp-mute">
        <span>Grade 8 · Algebra</span>
        <span className="flex items-center gap-1.5 text-lp-green">
          <span aria-hidden className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lp-green opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lp-green" />
          </span>
          Guided mode
        </span>
      </div>

      <div className="mt-6 space-y-3 text-[15px] leading-relaxed">
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-lp-blue px-4 py-2.5 text-white">
          can you just give me the answer to 7x + 39x
        </p>
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-lp-mute">
            <span className="lp-strike">The answer is 46x.</span>
          </p>
          <span className="shrink-0 rounded-full border border-lp-red/40 bg-lp-red/10 px-2.5 py-0.5 text-[11.5px] font-medium text-lp-red">
            Rewritten by Refyn
          </span>
        </div>
        <p className="max-w-[92%] rounded-2xl rounded-bl-md border border-lp-line bg-lp-bg/60 px-4 py-2.5 text-lp-text">
          <Sparkles aria-hidden className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px text-lp-cyan" />
          Both terms have an <em>x</em>, so they're like terms. What do you get when you add 7 and 39?
        </p>
      </div>

      <figcaption className="mt-6 border-t border-lp-line pt-4 text-[12.5px] text-lp-mute">
        Ms. Rao sees this thread in her class feed.
      </figcaption>
    </figure>
  );
};

const WhySection = () => (
  <section id="why" aria-labelledby="why-title" className="relative scroll-mt-20 overflow-hidden">
    <div
      aria-hidden
      className="pointer-events-none absolute -right-40 top-20 h-[520px] w-[520px] rounded-full opacity-40 blur-[120px]"
      style={{ background: "radial-gradient(circle, rgba(59,130,246,0.45), transparent 65%)" }}
    />
    <Container className="relative grid grid-cols-1 gap-14 py-24 lg:grid-cols-12 lg:gap-16 lg:py-32">
      <div className="lg:col-span-7">
        <div className="lp-reveal">
          <Eyebrow>Why Refyn</Eyebrow>
          <SectionTitle id="why-title" className="mt-6">
            Banning AI didn't work. <span className="text-lp-mute">Ignoring it won't either.</span>
          </SectionTitle>
          <p className="mt-6 max-w-[36rem] text-[17px] leading-[1.65] text-lp-soft">
            Every student now carries a homework machine in their pocket. Block it and the use goes underground; allow
            it unchecked and the essay gets written while the learning doesn't. Refyn takes a third path: keep AI in the
            classroom, and change what it's for.
          </p>
        </div>

        <ul className="mt-12 border-b border-lp-line">
          {rewrites.map((r, i) => (
            <li
              key={r.asked}
              className="lp-reveal group grid grid-cols-1 gap-3 border-t border-lp-line py-6 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-8"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">A student asks</p>
                <p className="mt-2 text-[16px] text-lp-mute">
                  <span className="lp-strike">“{r.asked}”</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-sky">Refyn replies</p>
                <p className="mt-2 text-[19px] leading-[1.4] tracking-[-0.015em] text-lp-text transition-colors group-hover:text-white">
                  “{r.reply}”
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-28">
          {/* Before: a student asking ChatGPT. After: the same kind of request, guided. */}
          <figure className="lp-reveal group relative overflow-hidden rounded-3xl border border-lp-line">
            <img
              src={studentAi}
              alt="Illustration: late at night, a chatbot writes a whole essay on a student's laptop"
              width={1344}
              height={752}
              loading="lazy"
              className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-lp-bg/80 via-lp-bg/10 to-transparent" />
            <figcaption className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-[12px] font-medium text-white backdrop-blur-md">
              Without Refyn: the AI writes it for them
            </figcaption>
          </figure>
          <div className="relative -mt-16 px-4 sm:-mt-20 sm:px-8 lg:-ml-10 lg:-mt-12 lg:mr-6 lg:px-0">
            <GuidedCard />
          </div>
        </div>
      </div>
    </Container>
  </section>
);

export default WhySection;
