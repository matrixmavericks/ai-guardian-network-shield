import React, { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "./primitives";

const AUTO_ADVANCE_MS = 5500;

/* ---------- Light "paper" cards that sit on the blue panel ---------- */

const CardHead: React.FC<{ title: string; meta: React.ReactNode }> = ({ title, meta }) => (
  <div className="flex items-center justify-between gap-3 border-b border-[#E6EAF2] px-5 py-4 sm:px-6 sm:py-5">
    <span className="truncate text-[16px] font-semibold tracking-[-0.01em] text-[#141B2D] sm:text-[17px]">{title}</span>
    <span className="shrink-0 text-[13px] text-[#6B7489] sm:text-[14px]">{meta}</span>
  </div>
);

const Body: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn("px-5 py-4 text-[13.5px] leading-relaxed text-[#141B2D] sm:px-6 sm:py-5 sm:text-[14.5px]", className)}>
    {children}
  </div>
);

const LiveDot = () => (
  <span className="inline-flex items-center gap-1.5 font-medium text-[#3B5BDB]">
    <span className="h-2 w-2 rounded-full bg-[#3B5BDB]" />
    Live
  </span>
);

const Ring: React.FC<{ value: number }> = ({ value }) => {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0" aria-label={`${value}% complete`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#E6EAF2" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="#3B5BDB"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="32" dy="0.35em" textAnchor="middle" fill="#141B2D" fontSize="14" fontWeight="600">
        {value}%
      </text>
    </svg>
  );
};

const GuidedFace = () => (
  <>
    <CardHead title="Guided answers" meta={<LiveDot />} />
    <Body className="space-y-3">
      <p className="text-[12.5px] text-[#6B7489]">Kabir M. · Grade 10 History · 4:12 pm</p>
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#3B5BDB] px-3.5 py-2 text-white">
        write a 500 word essay on the causes of WW1
      </p>
      <p className="max-w-[90%] rounded-2xl rounded-bl-md bg-[#F1F3F9] px-3.5 py-2">
        Happy to help you write it. First, your argument: which cause mattered most?
      </p>
      <p className="ml-auto w-fit rounded-2xl rounded-br-md bg-[#3B5BDB] px-3.5 py-2 text-white">alliances i think</p>
      <span className="inline-flex rounded-full bg-[#FFF0F0] px-3 py-1 text-[12px] font-medium text-[#C92A2A]">
        Full essay request · redirected
      </span>
    </Body>
  </>
);

const PathsFace = () => (
  <>
    <CardHead title="Learning path" meta="Week 6" />
    <Body>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="leading-none">
            <span className="text-[40px] font-semibold tracking-[-0.04em]">3</span>
            <span className="ml-1 text-[20px] font-medium text-[#6B7489]">of 5</span>
          </p>
          <p className="mt-2 text-[#5B6479]">modules done in Photosynthesis</p>
        </div>
        <Ring value={60} />
      </div>
      <ul className="mt-4 space-y-1 border-t border-[#E6EAF2] pt-3">
        {["Light and chlorophyll", "The Calvin cycle"].map((m) => (
          <li key={m} className="flex items-center gap-3 py-1.5 text-[#5B6479]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3B5BDB] text-white">
              <Check className="h-3 w-3" />
            </span>
            <span className="line-through decoration-[#9AA3B8]">{m}</span>
          </li>
        ))}
        <li className="-mx-2 flex items-start gap-3 rounded-xl bg-[#EEF2FF] px-2 py-2">
          <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#3B5BDB]">
            <span className="h-2 w-2 rounded-full bg-[#3B5BDB]" />
          </span>
          <span>
            <span className="block font-semibold">Limiting factors</span>
            <span className="block text-[12.5px] font-medium text-[#3B5BDB]">Quiz Friday</span>
          </span>
        </li>
        <li className="flex items-center gap-3 py-1.5 text-[#9AA3B8]">
          <span className="h-5 w-5 rounded-full border-2 border-[#D5DAE6]" />
          Capstone: design an experiment
        </li>
      </ul>
    </Body>
  </>
);

const rubric: [string, string, string][] = [
  ["Research question", "Strong", "bg-[#E6FCF5] text-[#0B7A5A]"],
  ["Method", "Strong", "bg-[#E6FCF5] text-[#0B7A5A]"],
  ["Use of evidence", "Developing", "bg-[#FFF4E6] text-[#B35C00]"],
];

const CapstoneFace = () => (
  <>
    <CardHead title="Capstone" meta="Submitted Tuesday" />
    <Body className="space-y-3">
      <p className="text-[18px] font-semibold leading-snug tracking-[-0.015em] sm:text-[20px]">
        Is the lake behind our school safe to swim in?
      </p>
      <p className="text-[#6B7489]">Aanya Shah · Grade 9 Biology</p>
      <p className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3 py-1 text-[12.5px] font-medium text-[#3B5BDB]">
        <Link2 className="h-3.5 w-3.5" /> Linked to Unit 4: Ecosystems
      </p>
      <dl className="divide-y divide-[#E6EAF2] border-y border-[#E6EAF2]">
        {rubric.map(([k, v, tone]) => (
          <div key={k} className="flex items-center justify-between py-2">
            <dt className="text-[#5B6479]">{k}</dt>
            <dd className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-medium", tone)}>{v}</dd>
          </div>
        ))}
      </dl>
    </Body>
  </>
);

const tiles: [string, string][] = [
  ["Lake study", "from-[#C5F6E0] to-[#96E0C6]"],
  ["Solar oven", "from-[#FFE3CC] to-[#FFC49B]"],
  ["Monsoon poems", "from-[#E5DBFF] to-[#C5B3FF]"],
];

const PortfolioFace = () => (
  <>
    <CardHead title="Portfolio" meta="Public link" />
    <Body className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[#0F5132] to-[#0E6E6E] px-4 py-4 text-white">
        <p className="text-[18px] font-semibold">Aanya Shah</p>
        <p className="text-[12.5px] text-white/75">Grade 9 · Science and design</p>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {tiles.map(([t, g]) => (
          <div key={t}>
            <div className={cn("aspect-[4/3] rounded-lg bg-gradient-to-br", g)} />
            <p className="mt-1.5 truncate text-[12px] text-[#5B6479]">{t}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {["#F4EFE6", "#1B2338", "#F6D3C4", "#2F6B55", "#C4B5F4", "#D4D4D4"].map((c, i) => (
          <span
            key={c}
            className={cn("h-5 w-5 rounded-full border border-black/10", i === 3 && "ring-2 ring-[#3B5BDB] ring-offset-2")}
            style={{ background: c }}
          />
        ))}
        <span className="ml-auto text-[12.5px] font-medium text-[#0B7A5A]">Link copied</span>
      </div>
    </Body>
  </>
);

const roster: [string, string, string, boolean][] = [
  ["AP", "Aarav P.", "Asked for a full essay, got an outline", true],
  ["MK", "Meera K.", "Checked a quotation", false],
  ["ZR", "Zoya R.", "Practised thesis statements", false],
];

const TeacherFace = () => (
  <>
    <CardHead title="Grade 10B · English" meta="This week" />
    <Body className="space-y-4">
      <div className="rounded-2xl bg-[#F1F3F9] p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium">Macbeth essay draft</span>
          <span className="text-[12.5px] text-[#6B7489]">18 of 26 in</span>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#FFFFFF]">
          <div className="h-full w-[69%] rounded-full bg-[#3B5BDB]" />
        </div>
      </div>
      <ul className="divide-y divide-[#E6EAF2]">
        {roster.map(([ini, name, note, flag]) => (
          <li key={name} className="flex items-center gap-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[11.5px] font-semibold text-[#3B5BDB]">
              {ini}
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{name}</span>
              <span className={cn("block truncate text-[12.5px]", flag ? "text-[#C92A2A]" : "text-[#6B7489]")}>{note}</span>
            </span>
          </li>
        ))}
      </ul>
    </Body>
  </>
);

const ParentFace = () => (
  <>
    <CardHead title="Weekly brief" meta="Sunday" />
    <Body className="space-y-3">
      <p className="text-[12.5px] font-medium uppercase tracking-[0.12em] text-[#6B7489]">For the Shah family</p>
      <p className="text-[16px] leading-snug sm:text-[17px]">
        Aanya finished two Biology modules this week and scored 9 out of 10 on her chlorophyll quiz.
      </p>
      <p className="text-[#5B6479]">She used AI 14 times, mostly to check her maths working. Nothing needed a second look.</p>
      <p className="text-[#5B6479]">Coming up: her capstone draft is due Friday. Ask her about the lake samples.</p>
    </Body>
  </>
);

const features = [
  {
    id: "guided",
    chip: "Guided answers",
    word: "question",
    blurb: "Requests for finished work come back as hints, questions and worked examples, so students still do the thinking.",
    Face: GuidedFace,
  },
  {
    id: "paths",
    chip: "Learning paths",
    word: "learner",
    blurb: "AI-built paths with modules, quizzes and a capstone, pitched at each student's level and adjusted as they go.",
    Face: PathsFace,
  },
  {
    id: "capstones",
    chip: "Capstones",
    word: "project",
    blurb: "A capstone goes straight into an assignment, so the learning path and the coursework stay connected.",
    Face: CapstoneFace,
  },
  {
    id: "portfolios",
    chip: "Portfolios",
    word: "portfolio",
    blurb: "Six themes and a public link, so parents, teachers and colleges can see a student's best work.",
    Face: PortfolioFace,
  },
  {
    id: "teachers",
    chip: "Teacher view",
    word: "teacher",
    blurb: "Classes, assignments, grading and resources in one place, with a clear view of how AI is being used.",
    Face: TeacherFace,
  },
  {
    id: "parents",
    chip: "Parent brief",
    word: "parent",
    blurb: "A plain-language summary of the week, instead of another dashboard to learn.",
    Face: ParentFace,
  },
];

// How many cards peek out behind the front one
const VISIBLE_BEHIND = 2;

const ProductShowcase = () => {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hold, setHold] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = features[active];
  const n = features.length;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Advance on a timer until the visitor picks a chip themselves
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!auto || hold || !inView || reduced) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % n), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [active, auto, hold, inView, n]);

  const choose = (i: number) => {
    setAuto(false);
    setActive(i);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + n) % n;
    choose(next);
    chipRefs.current[next]?.focus();
  };

  return (
    <section
      id="product"
      ref={sectionRef}
      aria-labelledby="product-title"
      className="relative scroll-mt-20 overflow-hidden border-t border-lp-line py-24 lg:py-32"
    >
      <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lp-reveal lg:col-span-5">
          <h2
            id="product-title"
            className="text-[46px] font-medium leading-[0.95] tracking-[-0.045em] text-white sm:text-[60px] lg:text-[58px] xl:text-[66px]"
          >
            Built for every
            <br />
            <em
              key={current.word}
              className="lp-fade inline-block bg-gradient-to-r from-lp-sky via-[#A5C8FF] to-lp-cyan bg-clip-text pb-[0.08em] pr-[0.12em] font-semibold italic text-transparent"
            >
              {current.word}.
            </em>
          </h2>
          <p key={current.id} className="lp-fade mt-6 max-w-[28rem] text-[17px] leading-[1.6] text-lp-soft sm:text-[18px]">
            {current.blurb}
          </p>

          <div role="tablist" aria-label="Parts of Refyn" onKeyDown={onKeyDown} className="mt-9 flex flex-wrap gap-2.5">
            {features.map((f, i) => {
              const selected = i === active;
              return (
                <button
                  key={f.id}
                  ref={(el) => (chipRefs.current[i] = el)}
                  role="tab"
                  id={`chip-${f.id}`}
                  aria-selected={selected}
                  aria-controls="product-stack"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => choose(i)}
                  className={cn(
                    "rounded-full border px-5 py-2.5 text-[15px] transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-sky",
                    selected
                      ? "border-white bg-[#FFFFFF] font-medium text-lp-bg shadow-[0_8px_30px_-10px_rgba(124,180,255,0.6)]"
                      : "border-white/15 text-lp-soft hover:border-white/35 hover:text-white",
                  )}
                >
                  {f.chip}
                </button>
              );
            })}
          </div>
        </div>

        {/* Blue panel that bleeds off the right edge on desktop */}
        <div
          className="lp-reveal relative lg:col-span-7 lg:mr-[calc(min(0px,(1200px-100vw)/2)-2rem)]"
          style={{ transitionDelay: "120ms" }}
          onMouseEnter={() => setHold(true)}
          onMouseLeave={() => setHold(false)}
        >
          <div
            id="product-stack"
            role="tabpanel"
            aria-labelledby={`chip-${current.id}`}
            className="relative h-[540px] overflow-hidden rounded-[32px] bg-gradient-to-br from-[#5173F0] via-[#4263EB] to-[#3451D1] shadow-[0_40px_120px_-40px_rgba(66,99,235,0.7)] sm:h-[600px] lg:h-[640px] lg:rounded-l-[40px] lg:rounded-r-none"
          >
            {/* Watermark word */}
            <p
              key={current.word}
              aria-hidden
              className="lp-fade pointer-events-none absolute -left-2 -top-6 select-none whitespace-nowrap text-[120px] font-bold italic leading-none tracking-[-0.06em] text-white/[0.12] sm:-top-8 sm:text-[180px] lg:left-6 lg:text-[210px]"
            >
              {current.word}
            </p>

            {/* Card stack: the front card, with the next ones fanned up and to the right */}
            <div className="absolute inset-x-0 bottom-0 top-[150px] [--dx:22px] [--dy:34px] [perspective:1400px] sm:top-[170px] sm:[--dx:90px] sm:[--dy:44px] lg:top-[190px] lg:[--dx:150px] lg:[--dy:52px]">
              {features.map((f, i) => {
                const slot = (i - active + n) % n;
                const shown = slot <= VISIBLE_BEHIND;
                const depth = shown ? slot : VISIBLE_BEHIND + 1;
                return (
                  <div
                    key={f.id}
                    aria-hidden={slot !== 0}
                    className={cn(
                      "absolute left-4 top-0 h-[370px] w-[calc(100%-2rem-2*var(--dx))] max-w-[480px] overflow-hidden rounded-[26px] transition-[transform,opacity,background-color,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:left-10 sm:h-[400px] lg:left-14 lg:h-[420px]",
                      slot === 0
                        ? "bg-[#FFFFFF] shadow-[0_40px_80px_-30px_rgba(15,23,42,0.55)]"
                        : "pointer-events-none bg-[#E9EDFB] shadow-[0_20px_50px_-30px_rgba(15,23,42,0.5)]",
                    )}
                    style={{
                      zIndex: 10 - slot,
                      opacity: shown ? 1 : 0,
                      transform: `translate3d(calc(var(--dx) * ${depth}), calc(var(--dy) * ${-depth}), ${-depth * 40}px) rotateY(${depth ? -4 : 0}deg)`,
                    }}
                  >
                    <div className={cn("transition-opacity duration-500", slot === 0 ? "opacity-100" : "opacity-70")}>
                      <f.Face />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default ProductShowcase;
