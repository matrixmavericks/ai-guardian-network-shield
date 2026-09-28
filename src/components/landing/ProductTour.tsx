import React, { useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container, Eyebrow, SectionTitle } from "./primitives";

/* ---------- Small building blocks for the panel mock-ups ---------- */

const PanelHeader: React.FC<{ title: string; meta: string }> = ({ title, meta }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-lp-line pb-4 text-[12px]">
    <span className="font-semibold uppercase tracking-[0.14em] text-lp-mute">{title}</span>
    <span className="text-lp-mute">{meta}</span>
  </div>
);

const Bubble: React.FC<{ from: "student" | "refyn"; children: React.ReactNode }> = ({ from, children }) =>
  from === "student" ? (
    <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-lp-band px-4 py-2.5 text-lp-ink">{children}</p>
  ) : (
    <p className="max-w-[88%] rounded-2xl rounded-bl-md border border-lp-line bg-lp-paper px-4 py-2.5 text-lp-ink">
      {children}
    </p>
  );

const Chip: React.FC<{ children: React.ReactNode; tone?: "moss" | "pen" | "plain" }> = ({ children, tone = "plain" }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px]",
      tone === "moss" && "border-lp-moss/30 text-lp-moss",
      tone === "pen" && "border-lp-pen/30 text-lp-pen",
      tone === "plain" && "border-lp-line text-lp-soft",
    )}
  >
    {children}
  </span>
);

const Bar: React.FC<{ value: number }> = ({ value }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-lp-band">
    <div className="h-full rounded-full bg-lp-moss" style={{ width: `${value}%` }} />
  </div>
);

/* ---------- Panels ---------- */

const GuidedPanel = () => (
  <>
    <PanelHeader title="Kabir M. · Grade 10 History" meta="Today, 4:12 pm" />
    <div className="mt-5 space-y-3 text-[15px] leading-relaxed">
      <Bubble from="student">write a 500 word essay on the causes of WW1</Bubble>
      <Bubble from="refyn">
        Happy to help you write it. First, your argument: which cause mattered most? Alliances, militarism, imperialism or
        nationalism?
      </Bubble>
      <Bubble from="student">alliances i think</Bubble>
      <Bubble from="refyn">
        Good. Give me one example of an alliance pulling a country into the war, and we'll build your first paragraph
        around it.
      </Bubble>
    </div>
    <div className="mt-6 flex flex-wrap gap-2">
      <Chip tone="pen">Full essay request · redirected</Chip>
      <Chip>Policy: essays start with an outline</Chip>
    </div>
  </>
);

const modules = [
  { name: "Light and chlorophyll", note: "Quiz 9/10", done: true },
  { name: "The light-dependent reactions", note: "Quiz 7/10", done: true },
  { name: "The Calvin cycle", note: "Quiz 8/10", done: true },
  { name: "Limiting factors", note: "In progress", current: true },
  { name: "Capstone: design your own experiment", note: "Locked" },
];

const PathsPanel = () => (
  <>
    <PanelHeader title="Photosynthesis · Grade 9 Biology" meta="Aanya's path" />
    <div className="mt-5 flex items-center gap-4">
      <Bar value={60} />
      <span className="shrink-0 text-[13px] text-lp-soft">3 of 5 modules</span>
    </div>
    <ol className="mt-5 divide-y divide-lp-line">
      {modules.map((m) => (
        <li key={m.name} className="flex items-center gap-3 py-3 text-[15px]">
          <span
            aria-hidden
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
              m.done && "border-lp-moss bg-lp-moss text-lp-paper",
              m.current && "border-lp-pen",
              !m.done && !m.current && "border-lp-line",
            )}
          >
            {m.done && <Check className="h-3.5 w-3.5" />}
            {m.current && <span className="h-2 w-2 rounded-full bg-lp-pen" />}
          </span>
          <span className={cn("flex-1", m.done || m.current ? "text-lp-ink" : "text-lp-mute")}>{m.name}</span>
          <span className="text-[13px] text-lp-mute">{m.note}</span>
        </li>
      ))}
    </ol>
    <p className="mt-4 rounded-xl bg-lp-paper px-4 py-3 text-[13.5px] text-lp-soft">
      After a tough quiz, the next module was pitched one level down, with two extra worked examples.
    </p>
  </>
);

const rubric = [
  { k: "Research question", v: "Strong" },
  { k: "Method", v: "Strong" },
  { k: "Use of evidence", v: "Developing" },
];

const CapstonePanel = () => (
  <>
    <PanelHeader title="Capstone · Grade 9 Biology" meta="Submitted Tuesday" />
    <h4 className="mt-5 font-display text-[26px] leading-[1.15] text-lp-ink">
      Is the lake behind our school safe to swim in?
    </h4>
    <p className="mt-1 text-[14px] text-lp-soft">Aanya Shah</p>
    <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-lp-paper px-3 py-1.5 text-[13px] text-lp-soft">
      <Link2 aria-hidden className="h-3.5 w-3.5" />
      Submitted to “Unit 4: Ecosystems” assignment
    </p>
    <dl className="mt-5 divide-y divide-lp-line border-y border-lp-line">
      {rubric.map((r) => (
        <div key={r.k} className="flex items-center justify-between py-2.5 text-[14.5px]">
          <dt className="text-lp-soft">{r.k}</dt>
          <dd className={r.v === "Strong" ? "text-lp-moss" : "text-lp-pen"}>{r.v}</dd>
        </div>
      ))}
    </dl>
    <p className="mt-5 rotate-[-1.5deg] font-hand text-[24px] leading-[1.15] text-lp-pen">
      Lovely sampling method. Now compare it with last year's readings! <span className="whitespace-nowrap">— Mr. D'Souza</span>
    </p>
  </>
);

const themes = [
  { name: "Default", color: "#F4EFE6" },
  { name: "Midnight", color: "#1B2338" },
  { name: "Sunset", color: "#F6D3C4" },
  { name: "Forest", color: "#CFE7DA" },
  { name: "Lavender", color: "#E1DAF3" },
  { name: "Minimal", color: "#EDEDEB" },
];

const projects = [
  { t: "Lake water study", c: "#CFE7DA" },
  { t: "Solar oven build", c: "#F6D3C4" },
  { t: "Monsoon poems", c: "#E1DAF3" },
];

const PortfolioPanel = () => (
  <>
    <div className="overflow-hidden rounded-2xl border border-lp-line">
      <div className="bg-gradient-to-br from-[#D5ECDF] to-[#CBE7E4] px-5 py-6">
        <p className="font-display text-[28px] leading-none text-lp-ink">Aanya Shah</p>
        <p className="mt-2 text-[13px] text-lp-soft">Grade 9 · Science and design</p>
      </div>
      <div className="grid grid-cols-3 gap-2 bg-lp-card p-3">
        {projects.map((p) => (
          <div key={p.t} className="rounded-lg p-2.5">
            <div className="aspect-[16/10] rounded-md" style={{ background: p.c }} />
            <p className="mt-2 text-[12.5px] leading-snug text-lp-ink">{p.t}</p>
          </div>
        ))}
      </div>
    </div>

    <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.14em] text-lp-mute">Theme</p>
    <ul className="mt-3 flex flex-wrap gap-2">
      {themes.map((t) => (
        <li
          key={t.name}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px]",
            t.name === "Forest" ? "border-lp-ink text-lp-ink" : "border-lp-line text-lp-soft",
          )}
        >
          <span aria-hidden className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: t.color }} />
          {t.name}
        </li>
      ))}
    </ul>

    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-lp-paper px-4 py-3 text-[13.5px]">
      <span className="flex items-center gap-2 text-lp-soft">
        <Link2 aria-hidden className="h-4 w-4" />
        Public link: anyone with it can view
      </span>
      <span className="font-medium text-lp-moss">Link copied</span>
    </div>
  </>
);

const roster = [
  { name: "Aarav P.", sessions: 6, note: "Asked for a full essay, got an outline", flag: true },
  { name: "Meera K.", sessions: 2, note: "Checked a quotation" },
  { name: "Zoya R.", sessions: 9, note: "Practised thesis statements" },
  { name: "Ishaan T.", sessions: 0, note: "No AI use" },
];

const TeacherPanel = () => (
  <>
    <PanelHeader title="Grade 10B · English" meta="This week" />
    <div className="mt-5 rounded-xl bg-lp-paper p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px] font-medium text-lp-ink">Macbeth essay draft</p>
        <p className="text-[13px] text-lp-soft">18 of 26 submitted · due Friday</p>
      </div>
      <div className="mt-3">
        <Bar value={69} />
      </div>
    </div>
    <table className="mt-5 w-full text-left text-[14px]">
      <thead>
        <tr className="text-[11px] uppercase tracking-[0.14em] text-lp-mute">
          <th scope="col" className="pb-2 font-semibold">Student</th>
          <th scope="col" className="pb-2 text-right font-semibold sm:text-left">AI use</th>
          <th scope="col" className="hidden pb-2 font-semibold sm:table-cell">Most recent</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-lp-line border-t border-lp-line">
        {roster.map((r) => (
          <tr key={r.name}>
            <td className="py-3 text-lp-ink">{r.name}</td>
            <td className="py-3 text-right tabular-nums text-lp-soft sm:text-left">{r.sessions}</td>
            <td className={cn("hidden py-3 sm:table-cell", r.flag ? "text-lp-pen" : "text-lp-soft")}>{r.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </>
);

const ParentPanel = () => (
  <>
    <PanelHeader title="Weekly brief · the Shah family" meta="Sunday" />
    <div className="mt-6 space-y-4 font-display text-[21px] leading-[1.4] text-lp-ink">
      <p>Aanya finished two Biology modules this week and scored 9 out of 10 on her quiz about light and chlorophyll.</p>
      <p>She used AI 14 times, mostly to check her working in maths. Nothing needed a second look.</p>
      <p>
        Coming up: her capstone draft is due Friday. Ask her about the lake samples, she's proud of them.
      </p>
    </div>
    <p className="mt-6 border-t border-lp-line pt-4 text-[13px] text-lp-mute">From Aanya's teachers, sent by Refyn</p>
  </>
);

/* ---------- Tabs ---------- */

const tabs = [
  {
    id: "guided",
    label: "Guided answers",
    who: "Students",
    blurb: "Requests for finished work are rewritten into hints, questions and worked examples, so students still do the thinking.",
    Panel: GuidedPanel,
  },
  {
    id: "paths",
    label: "Learning paths",
    who: "Students",
    blurb: "AI-built paths with modules, quizzes and a capstone, pitched at each student's level and adjusted as they go.",
    Panel: PathsPanel,
  },
  {
    id: "capstones",
    label: "Capstones",
    who: "Students and teachers",
    blurb: "A capstone can be submitted straight into an assignment, so the learning path and the coursework stay connected.",
    Panel: CapstonePanel,
  },
  {
    id: "portfolios",
    label: "Portfolios",
    who: "Students",
    blurb: "Six themes, from Midnight to Forest, and a public link that works for anyone the student shares it with.",
    Panel: PortfolioPanel,
  },
  {
    id: "teachers",
    label: "Teacher view",
    who: "Teachers",
    blurb: "Classes, assignments, groups, grading and resources in one place, with a clear view of how AI is being used.",
    Panel: TeacherPanel,
  },
  {
    id: "parents",
    label: "Parent brief",
    who: "Parents",
    blurb: "Parents get a plain-language summary of the week instead of another dashboard to learn.",
    Panel: ParentPanel,
  },
];

const ProductTour = () => {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = tabs[active];

  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next: number | null = null;
    if (e.key in keys) next = (active + keys[e.key] + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="product" aria-labelledby="product-title" className="scroll-mt-16">
      <Container className="py-20 lg:py-28">
        <div className="lp-reveal max-w-[46rem]">
          <Eyebrow>Inside Refyn</Eyebrow>
          <SectionTitle id="product-title" className="mt-5">
            What students, teachers and parents actually see.
          </SectionTitle>
          <p className="mt-6 max-w-[36rem] text-[17px] leading-[1.65] text-lp-soft">
            Six parts of one platform, sharing the same classes and the same rules.
          </p>
        </div>

        <div className="lp-reveal mt-12 grid grid-cols-1 gap-8 lg:mt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <div>
            <div
              role="tablist"
              aria-label="Parts of Refyn"
              aria-orientation="vertical"
              onKeyDown={onKeyDown}
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-t lg:border-lp-line lg:px-0"
            >
              {tabs.map((t, i) => {
                const selected = i === active;
                return (
                  <button
                    key={t.id}
                    ref={(el) => (tabRefs.current[i] = el)}
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={selected}
                    aria-controls="product-panel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(i)}
                    className={cn(
                      "group shrink-0 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-pen",
                      // mobile: chips
                      "rounded-full border px-4 py-2 text-[14px] lg:rounded-none lg:border-0 lg:border-b lg:border-lp-line lg:px-0 lg:py-5",
                      selected
                        ? "border-lp-ink bg-lp-ink text-lp-paper lg:bg-transparent lg:text-lp-ink"
                        : "border-lp-line text-lp-soft hover:text-lp-ink",
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-4">
                      <span className="lg:font-display lg:text-[26px] lg:leading-tight">{t.label}</span>
                      <span className={cn("hidden text-[12px] lg:inline", selected ? "text-lp-pen" : "text-lp-mute")}>
                        {t.who}
                      </span>
                    </span>
                    {selected && (
                      <span className="mt-2 hidden max-w-[28rem] text-[15px] leading-[1.6] text-lp-soft lg:block">{t.blurb}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-5 text-[15px] leading-[1.6] text-lp-soft lg:hidden">{current.blurb}</p>
          </div>

          <div
            role="tabpanel"
            id="product-panel"
            aria-labelledby={`tab-${current.id}`}
            className="min-h-[460px] rounded-[22px] lg:min-h-[540px] border border-lp-line bg-lp-card p-5 shadow-[0_1px_0_rgba(23,25,30,0.04),0_30px_60px_-36px_rgba(23,25,30,0.35)] sm:p-7"
          >
            <div key={current.id} className="lp-fade">
              <current.Panel />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default ProductTour;
