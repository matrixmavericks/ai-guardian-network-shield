import React from "react";
import { photos } from "./photos";
import { Container, Eyebrow, Photo } from "./primitives";

const featured = {
  quote:
    "AI Conditioner transformed how our students interact with AI. The portfolio feature lets them showcase their learning journey beautifully.",
  author: "Dr. Sarah Hamilton",
  role: "Principal, Westlake High School",
};

const more = [
  {
    quote:
      "Students love customizing their portfolio themes. The shared links make it easy for parents and colleges to see their best work.",
    author: "Michael Chen",
    role: "IT Director, Lincoln School District",
  },
  {
    quote:
      "The capstone-to-assignment submission flow saved us hours. Students connect their learning paths directly to coursework now.",
    author: "Prof. Robert Martinez",
    role: "Educational Technology Coordinator",
  },
];

const initials = (name: string) =>
  name
    .replace(/^(Dr|Prof|Mr|Ms|Mrs)\.\s*/, "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

const Attribution: React.FC<{ author: string; role: string }> = ({ author, role }) => (
  <figcaption className="flex items-center gap-3">
    <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lp-band font-display text-[18px] text-lp-ink">
      {initials(author)}
    </span>
    <span>
      <span className="block text-[15px] font-semibold text-lp-ink">{author}</span>
      <span className="block text-[13.5px] text-lp-mute">{role}</span>
    </span>
  </figcaption>
);

const Stories = () => (
  <section id="stories" aria-labelledby="stories-title" className="scroll-mt-16">
    <Container className="py-20 lg:py-28">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lp-reveal lg:col-span-7">
          <h2 id="stories-title" className="sr-only">Stories from schools</h2>
          <Eyebrow>From the schools using it</Eyebrow>
          <figure className="mt-10">
            <span aria-hidden className="block h-12 font-display text-[96px] leading-[0.9] text-lp-pen">
              “
            </span>
            <blockquote className="font-display text-[30px] leading-[1.2] tracking-[-0.01em] text-lp-ink sm:text-[38px] lg:text-[44px]">
              <p>{featured.quote}</p>
            </blockquote>
            <div className="mt-10">
              <Attribution author={featured.author} role={featured.role} />
            </div>
          </figure>
        </div>
        <div className="lp-reveal lg:col-span-5">
          <Photo photo={photos.studyGroup} sizes="(min-width: 1024px) 420px, 100vw" className="aspect-[4/3] rounded-[22px] lg:aspect-[4/5]" />
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 lg:mt-20">
        {more.map((t) => (
          <figure key={t.author} className="lp-reveal border-t border-lp-line pt-8">
            <blockquote className="font-display text-[23px] leading-[1.35] text-lp-ink">
              <p>“{t.quote}”</p>
            </blockquote>
            <div className="mt-6">
              <Attribution author={t.author} role={t.role} />
            </div>
          </figure>
        ))}
      </div>
    </Container>
  </section>
);

export default Stories;
