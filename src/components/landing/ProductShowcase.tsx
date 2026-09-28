import React, { useEffect, useRef, useState } from "react";
import { Check, FolderOpen, GraduationCap, Link2, MessageSquare, Route, Users, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import CardSwap, { Card } from "./CardSwap";
import { Container, Eyebrow, SectionTitle } from "./primitives";

const SWAP_DELAY = 4200;

/* ---------- Card faces ---------- */

const CardHead: React.FC<{ icon: React.ElementType; label: string; meta: string }> = ({ icon: Icon, label, meta }) => (
  <div className="flex items-center justify-between gap-3 border-b border-lp-line px-4 py-3 sm:px-5">
    <span className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-lp-text">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-lp-blue/15 text-lp-sky">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="truncate">{label}</span>
    </span>
    <span className="shrink-0 text-[11px] text-lp-mute">{meta}</span>
  </div>
);

const Body: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn("space-y-3 px-4 py-4 text-[13px] leading-relaxed sm:px-5 sm:text-[13.5px]", className)}>{children}</div>
);

const Bar: React.FC<{ value: number }> = ({ value }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-lp-line">
    <div className="h-full rounded-full bg-gradient-to-r from-lp-blue to-lp-cyan" style={{ width: `${value}%` }} />
  </div>
);

const GuidedFace = () => (
  <>
    <CardHead icon={MessageSquare} label="Kabir M. · Grade 10 History" meta="4:12 pm" />
    <Body>
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-lp-blue px-3 py-2 text-white">
        write a 500 word essay on the causes of WW1
      </p>
      <p className="max-w-[92%] rounded-2xl rounded-bl-md border border-lp-line bg-lp-bg/60 px-3 py-2 text-lp-text">
        Happy to help you write it. First, your argument: which cause mattered most?
      </p>
      <p className="ml-auto w-fit rounded-2xl rounded-br-md bg-lp-blue px-3 py-2 text-white">alliances i think</p>
      <span className="inline-flex rounded-full border border-lp-red/40 bg-lp-red/10 px-2.5 py-0.5 text-[11px] text-lp-red">
        Full essay request · redirected
      </span>
    </Body>
  </>
);

const modules = [
  { name: "Light and chlorophyll", note: "9/10", done: true },
  { name: "Light-dependent reactions", note: "7/10", done: true },
  { name: "The Calvin cycle", note: "8/10", done: true },
  { name: "Limiting factors", note: "Now", current: true },
];

const PathsFace = () => (
  <>
    <CardHead icon={Route} label="Photosynthesis · Grade 9" meta="Aanya's path" />
    <Body>
      <div className="flex items-center gap-3">
        <Bar value={60} />
        <span className="shrink-0 text-[11.5px] text-lp-soft">3 of 5</span>
      </div>
      <ul className="divide-y divide-lp-line">
        {modules.map((m) => (
          <li key={m.name} className="flex items-center gap-2.5 py-2">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                m.done ? "border-lp-green/60 bg-lp-green/15 text-lp-green" : "border-lp-sky",
              )}
            >
              {m.done ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-lp-sky" />}
            </span>
            <span className="min-w-0 flex-1 truncate text-lp-text">{m.name}</span>
            <span className={cn("text-[11.5px]", m.current ? "text-lp-sky" : "text-lp-mute")}>{m.note}</span>
          </li>
        ))}
      </ul>
    </Body>
  </>
);

const CapstoneFace = () => (
  <>
    <CardHead icon={GraduationCap} label="Capstone · Grade 9 Biology" meta="Tuesday" />
    <Body>
      <p className="text-[16px] font-medium leading-snug tracking-[-0.01em] text-lp-text sm:text-[18px]">
        Is the lake behind our school safe to swim in?
      </p>
      <p className="text-lp-mute">Aanya Shah</p>
      <p className="inline-flex items-center gap-1.5 rounded-full bg-lp-bg/60 px-2.5 py-1 text-[11.5px] text-lp-soft">
        <Link2 className="h-3 w-3" /> Submitted to “Unit 4: Ecosystems”
      </p>
      <dl className="divide-y divide-lp-line border-y border-lp-line">
        <div className="flex justify-between py-1.5">
          <dt className="text-lp-soft">Method</dt>
          <dd className="text-lp-green">Strong</dd>
        </div>
        <div className="flex justify-between py-1.5">
          <dt className="text-lp-soft">Use of evidence</dt>
          <dd className="text-[#FBBF24]">Developing</dd>
        </div>
      </dl>
    </Body>
  </>
);

const PortfolioFace = () => (
  <>
    <CardHead icon={FolderOpen} label="Portfolio · Forest theme" meta="Public link" />
    <Body>
      <div className="rounded-xl bg-gradient-to-br from-[#0F3B2E] to-[#0E3A44] px-4 py-3.5">
        <p className="text-[16px] font-medium text-white">Aanya Shah</p>
        <p className="text-[11.5px] text-[#A7D7C5]">Grade 9 · Science and design</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["#1E3A8A", "#7C2D12", "#4C1D95"].map((c, i) => (
          <div key={c}>
            <div className="aspect-[4/3] rounded-md" style={{ background: `linear-gradient(135deg, ${c}, #0A1328)` }} />
            <p className="mt-1 truncate text-[11px] text-lp-soft">{["Lake study", "Solar oven", "Monsoon poems"][i]}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        {["#F4EFE6", "#1B2338", "#F6D3C4", "#2F6B55", "#C4B5F4", "#D4D4D4"].map((c, i) => (
          <span
            key={c}
            className={cn("h-4 w-4 rounded-full border border-white/20", i === 3 && "ring-2 ring-lp-sky ring-offset-2 ring-offset-lp-surface")}
            style={{ background: c }}
          />
        ))}
        <span className="ml-auto text-[11px] text-lp-green">Link copied</span>
      </div>
    </Body>
  </>
);

const roster = [
  { name: "Aarav P.", n: 6, note: "Essay → outline", flag: true },
  { name: "Meera K.", n: 2, note: "Checked a quote" },
  { name: "Zoya R.", n: 9, note: "Thesis practice" },
];

const TeacherFace = () => (
  <>
    <CardHead icon={Users} label="Grade 10B · English" meta="This week" />
    <Body>
      <div className="rounded-xl bg-lp-bg/60 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lp-text">Macbeth essay draft</span>
          <span className="text-[11.5px] text-lp-mute">18 / 26</span>
        </div>
        <div className="mt-2">
          <Bar value={69} />
        </div>
      </div>
      <ul className="divide-y divide-lp-line">
        {roster.map((r) => (
          <li key={r.name} className="flex items-center gap-2 py-2">
            <span className="w-16 shrink-0 text-lp-text sm:w-20">{r.name}</span>
            <span className="w-6 shrink-0 tabular-nums text-lp-mute">{r.n}</span>
            <span className={cn("min-w-0 flex-1 truncate text-right", r.flag ? "text-lp-red" : "text-lp-soft")}>{r.note}</span>
          </li>
        ))}
      </ul>
    </Body>
  </>
);

const ParentFace = () => (
  <>
    <CardHead icon={Mail} label="Weekly brief · the Shah family" meta="Sunday" />
    <Body className="space-y-2.5 text-[13.5px] text-lp-text sm:text-[14.5px]">
      <p>Aanya finished two Biology modules and scored 9/10 on her chlorophyll quiz.</p>
      <p className="text-lp-soft">She used AI 14 times, mostly to check her maths working. Nothing needed a second look.</p>
      <p className="text-lp-soft">Coming up: capstone draft due Friday. Ask her about the lake samples.</p>
    </Body>
  </>
);

const features = [
  { title: "Guided answers", body: "Requests for finished work become hints, questions and worked examples.", icon: MessageSquare, Face: GuidedFace },
  { title: "Learning paths", body: "AI-built modules and quizzes, pitched at each student's level.", icon: Route, Face: PathsFace },
  { title: "Capstones", body: "Submitted straight into an assignment, so paths and coursework connect.", icon: GraduationCap, Face: CapstoneFace },
  { title: "Portfolios", body: "Six themes and a public link anyone can open.", icon: FolderOpen, Face: PortfolioFace },
  { title: "Teacher view", body: "Classes, grading and a clear view of how AI is being used.", icon: Users, Face: TeacherFace },
  { title: "Parent brief", body: "A plain-language summary of the week, not another dashboard.", icon: Mail, Face: ParentFace },
];

/** Card size and spacing that fit the column at any width. */
const useStackSize = (ref: React.RefObject<HTMLDivElement>) => {
  const [size, setSize] = useState({ w: 420, h: 340, dx: 30, dy: 32 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const cw = entry.contentRect.width;
      const narrow = cw < 520;
      const dx = narrow ? 12 : 30;
      const dy = narrow ? 16 : 32;
      const w = Math.round(Math.min(440, cw - dx * 5 - 8));
      setSize({ w, h: narrow ? 330 : Math.round(w * 0.8), dx, dy });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
};

const ProductShowcase = () => {
  const [active, setActive] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(true);
  const stackRef = useRef<HTMLDivElement>(null);
  const size = useStackSize(stackRef);

  // The progress bar only runs while the stack is on screen and not hovered
  useEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      setPaused(!entry.isIntersecting);
      if (entry.isIntersecting) setCycle((c) => c + 1);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="product" aria-labelledby="product-title" className="relative scroll-mt-20 overflow-hidden border-t border-lp-line">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 bottom-0 h-[560px] w-[560px] rounded-full opacity-35 blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(63,233,255,0.35), transparent 65%)" }}
      />
      <Container className="relative grid grid-cols-1 items-center gap-14 py-24 lg:grid-cols-12 lg:gap-12 lg:py-32">
        <div className="lg:col-span-5">
          <div className="lp-reveal">
            <Eyebrow>Inside Refyn</Eyebrow>
            <SectionTitle id="product-title" className="mt-6 lg:text-[48px]">
              What students, teachers and parents actually see.
            </SectionTitle>
          </div>

          <ul className="lp-reveal mt-10 space-y-1.5" style={{ transitionDelay: "120ms" }}>
            {features.map((f, i) => {
              const isActive = i === active;
              const Icon = f.icon;
              return (
                <li
                  key={f.title}
                  aria-current={isActive || undefined}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border px-4 py-3 transition-all duration-500",
                    isActive ? "border-lp-blue/40 bg-lp-surface" : "border-transparent",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-lp-sky" : "text-lp-mute")} />
                    <span className={cn("text-[15.5px] font-medium transition-colors", isActive ? "text-white" : "text-lp-soft")}>
                      {f.title}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "grid transition-all duration-500",
                      isActive ? "mt-1 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <p className="overflow-hidden pl-7 text-[14px] leading-relaxed text-lp-soft">{f.body}</p>
                  </div>
                  {isActive && (
                    <span
                      key={`${active}-${cycle}`}
                      aria-hidden
                      className="lp-progress absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-lp-blue to-lp-cyan"
                      style={{ animationDuration: `${SWAP_DELAY}ms`, animationPlayState: paused ? "paused" : "running" }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div
          ref={stackRef}
          className="lp-reveal relative flex min-h-[460px] items-end justify-start pt-24 sm:min-h-[560px] lg:col-span-7 lg:pl-6 lg:pt-40"
        >
          {/* Same box as the CardSwap container, so hover pauses both the stack and the progress bar */}
          <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => {
              setPaused(false);
              setCycle((c) => c + 1);
            }}
          >
            <CardSwap
              width={size.w}
              height={size.h}
              cardDistance={size.dx}
              verticalDistance={size.dy}
              delay={SWAP_DELAY}
              pauseOnHover
              skewAmount={4}
              onFrontChange={setActive}
            >
              {features.map((f) => (
                <Card key={f.title} className="overflow-hidden bg-gradient-to-b from-lp-raised to-lp-surface">
                  <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-lp-sky/50 to-transparent" />
                  <f.Face />
                </Card>
              ))}
            </CardSwap>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default ProductShowcase;
