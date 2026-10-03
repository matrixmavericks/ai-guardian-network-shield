import React from "react";
import network from "@/assets/landing/icon-network.webp";
import guardrails from "@/assets/landing/icon-guardrails.webp";
import portfolio from "@/assets/landing/icon-portfolio.webp";
import { Container, Eyebrow, SectionTitle, useSpotlight } from "./primitives";

const steps = [
  {
    icon: network,
    title: "Connect your school",
    body: "Refyn runs at the network level. Set your AI policies once, create classes, and invite teachers and students. Every device on the school network follows the same rules.",
  },
  {
    icon: guardrails,
    title: "Students learn with guardrails",
    body: "Requests for finished work become hints, questions and worked examples. Learning paths adapt to each student, with quizzes along the way and a capstone at the end.",
  },
  {
    icon: portfolio,
    title: "Work becomes a portfolio",
    body: "Students gather their best work into a themed portfolio and share it by link with parents, teachers or colleges.",
  },
];

const StepCard: React.FC<{ step: (typeof steps)[number]; index: number }> = ({ step, index }) => {
  const onMove = useSpotlight();
  return (
    <li className="lp-reveal" style={{ transitionDelay: `${index * 90}ms` }}>
      <div
        onMouseMove={onMove}
        className="lp-spot group relative h-full rounded-3xl border border-lp-line bg-lp-surface/70 p-7 transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-lp-blue/40"
      >
        <div className="flex items-start justify-between">
          {/* Generated glass icon on black: "screen" drops the black so only the light shows */}
          <img
            src={step.icon}
            alt=""
            width={440}
            height={440}
            loading="lazy"
            className="-ml-4 -mt-4 h-28 w-28 mix-blend-screen transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105"
          />
          <span className="text-[13px] font-medium tabular-nums text-lp-mute">0{index + 1}</span>
        </div>
        <h3 className="mt-4 text-[22px] font-medium tracking-[-0.02em] text-lp-text">{step.title}</h3>
        <p className="mt-3 text-[15px] leading-[1.65] text-lp-soft">{step.body}</p>
      </div>
    </li>
  );
};

const HowItWorks = () => (
  <section id="how" aria-labelledby="how-title" className="relative scroll-mt-20 border-t border-lp-line bg-lp-deep/50">
    <Container className="py-24 lg:py-32">
      <div className="lp-reveal max-w-[46rem]">
        <Eyebrow>How it works</Eyebrow>
        <SectionTitle id="how-title" className="mt-6">
          From the school network to a student's portfolio.
        </SectionTitle>
      </div>

      <div className="relative mt-14 lg:mt-16">
        {/* A thin beam running behind the cards on desktop */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-[76px] hidden h-px bg-gradient-to-r from-transparent via-lp-blue/60 to-transparent md:block"
        />
        <ol className="relative grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6">
          {steps.map((s, i) => (
            <StepCard key={s.title} step={s} index={i} />
          ))}
        </ol>
      </div>
    </Container>
  </section>
);

export default HowItWorks;
