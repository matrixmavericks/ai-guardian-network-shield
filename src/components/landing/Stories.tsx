import React from "react";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container, Eyebrow, SectionTitle, useSpotlight } from "./primitives";

const testimonials = [
  {
    quote:
      "AI Conditioner transformed how our students interact with AI. The portfolio feature lets them showcase their learning journey beautifully.",
    author: "Dr. Sarah Hamilton",
    role: "Principal, Westlake High School",
  },
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

const StoryCard: React.FC<{ t: (typeof testimonials)[number]; featured?: boolean }> = ({ t, featured }) => {
  const onMove = useSpotlight();
  return (
    <figure
      onMouseMove={onMove}
      className={cn(
        "lp-spot flex h-full flex-col justify-between rounded-3xl border border-lp-line bg-lp-surface/70 p-7 transition-colors duration-300 hover:border-lp-blue/40 sm:p-8",
        featured && "bg-gradient-to-br from-lp-raised to-lp-surface",
      )}
    >
      <div>
        <Quote aria-hidden className="h-6 w-6 text-lp-sky" />
        <blockquote
          className={cn(
            "mt-5 tracking-[-0.02em] text-lp-text",
            featured ? "max-w-[46rem] text-[24px] leading-[1.3] sm:text-[32px]" : "text-[18px] leading-[1.45]",
          )}
        >
          <p>“{t.quote}”</p>
        </blockquote>
      </div>
      <figcaption className="mt-8 flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lp-blue to-[#1E3A8A] text-[14px] font-semibold text-white"
        >
          {initials(t.author)}
        </span>
        <span>
          <span className="block text-[15px] font-medium text-lp-text">{t.author}</span>
          <span className="block text-[13.5px] text-lp-mute">{t.role}</span>
        </span>
      </figcaption>
    </figure>
  );
};

const Stories = () => (
  <section id="stories" aria-labelledby="stories-title" className="relative scroll-mt-20 border-t border-lp-line">
    <Container className="py-24 lg:py-32">
      <div className="lp-reveal max-w-[44rem]">
        <Eyebrow>From the schools using it</Eyebrow>
        <SectionTitle id="stories-title" className="mt-6">
          Teachers noticed the difference first.
        </SectionTitle>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lp-reveal lg:col-span-12">
          <StoryCard t={testimonials[0]} featured />
        </div>
        {testimonials.slice(1).map((t, i) => (
          <div key={t.author} className="lp-reveal lg:col-span-6" style={{ transitionDelay: `${(i + 1) * 90}ms` }}>
            <StoryCard t={t} />
          </div>
        ))}
      </div>
    </Container>
  </section>
);

export default Stories;
