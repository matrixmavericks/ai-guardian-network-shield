import React from "react";
import { Container, Eyebrow, SectionTitle } from "./primitives";

const steps = [
  {
    title: "Connect your school",
    body: "Refyn runs at the network level. Set your AI policies once, create classes, and invite teachers and students. Every device on the school network follows the same rules.",
  },
  {
    title: "Students learn with guardrails",
    body: "Requests for finished work become hints, questions and worked examples. Learning paths adapt to each student, with quizzes along the way and a capstone at the end.",
  },
  {
    title: "Work becomes a portfolio",
    body: "Students gather their best work into a themed portfolio and share it by link with parents, teachers or colleges.",
  },
];

const HowItWorks = () => (
  <section id="how" aria-labelledby="how-title" className="scroll-mt-16 bg-lp-band">
    <Container className="py-20 lg:py-28">
      <div className="lp-reveal max-w-[44rem]">
        <Eyebrow>How it works</Eyebrow>
        <SectionTitle id="how-title" className="mt-5">
          From the school network to a student's portfolio.
        </SectionTitle>
      </div>

      <ol className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8 lg:mt-16 lg:gap-12">
        {steps.map((s, i) => (
          <li key={s.title} className="lp-reveal border-t-2 border-lp-ink pt-6" style={{ transitionDelay: `${i * 90}ms` }}>
            <span className="font-display text-[44px] italic leading-none text-lp-pen">0{i + 1}</span>
            <h3 className="mt-5 font-display text-[28px] leading-[1.1] text-lp-ink">{s.title}</h3>
            <p className="mt-3 text-[16px] leading-[1.65] text-lp-soft">{s.body}</p>
          </li>
        ))}
      </ol>
    </Container>
  </section>
);

export default HowItWorks;
