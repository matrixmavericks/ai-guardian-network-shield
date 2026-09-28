import React from "react";
import { photos } from "./photos";
import { Container, Eyebrow, Photo, SectionTitle } from "./primitives";

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

const WhySection = () => (
  <section aria-labelledby="why-title">
    <Container className="grid grid-cols-1 gap-12 py-20 lg:grid-cols-12 lg:gap-16 lg:py-28">
      <div className="lp-reveal lg:col-span-5">
        <Photo
          photo={photos.classroom}
          sizes="(min-width: 1024px) 420px, 100vw"
          className="aspect-[4/3] rounded-[22px] lg:sticky lg:top-24 lg:aspect-[4/5]"
        />
      </div>

      <div className="lg:col-span-7">
        <div className="lp-reveal">
          <Eyebrow>Why Refyn</Eyebrow>
          <SectionTitle id="why-title" className="mt-5">
            Banning AI didn't work. <em className="text-lp-soft">Ignoring it won't either.</em>
          </SectionTitle>
          <p className="mt-6 max-w-[36rem] text-[17px] leading-[1.65] text-lp-soft">
            Every student now carries a homework machine in their pocket. Block it and the use goes underground; allow
            it unchecked and the essay gets written while the learning doesn't. Refyn takes a third path: keep AI in the
            classroom, and change what it's for.
          </p>
        </div>

        <ul className="mt-12 border-b border-lp-line">
          {rewrites.map((r) => (
            <li key={r.asked} className="lp-reveal grid gap-3 border-t border-lp-line py-6 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lp-mute">A student asks</p>
                <p className="mt-2 text-[17px] text-lp-mute">
                  <span className="line-through decoration-lp-pen decoration-2">“{r.asked}”</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lp-moss">Refyn replies</p>
                <p className="mt-2 font-display text-[23px] leading-[1.3] text-lp-ink">“{r.reply}”</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  </section>
);

export default WhySection;
