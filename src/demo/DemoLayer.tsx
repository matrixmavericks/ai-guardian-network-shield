import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Compass, HelpCircle, ListOrdered, LogOut, Repeat, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { closeEmbed, demoEmbed, demoRole, demoTourStep, exitDemo, setDemoTourStep, startDemo, DEMO_USERS, type DemoRole } from "./session";
import { TOURS, tourSteps, type TourStep } from "./tours";
import type { HelpData } from "@/help/types";

// What sits on top of the portal during the live demo: a small "Live demo"
// control, the guided tour (a spotlight on part of a real page plus a card),
// and, inside the help centre, the mini demo for one question.

const other = (r: DemoRole): DemoRole => (r === "student" ? "teacher" : "student");
const ABOUT: Record<DemoRole, string> = {
  student: `You're ${DEMO_USERS.student.fullName.split(" ")[0]}, an MYP 5 student. Everything here is sample data, and nothing you do is saved.`,
  teacher: `You're ${DEMO_USERS.teacher.fullName.split(" ")[0]}, an MYP science teacher with three classes. Everything here is sample data, and nothing you do is saved.`,
};

const btn = "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-medium transition-colors";
const primary = cn(btn, "bg-[#3b82f6] text-white hover:bg-[#2f6fe0]");
const ghost = cn(btn, "border border-white/12 text-white/85 hover:bg-white/10 hover:text-white");

const visible = (el: Element | null): el is HTMLElement => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth;
};
/** A panel: a section, or a rounded, bordered box of a decent size. */
const isCard = (el: Element) => {
  const r = el.getBoundingClientRect();
  if (r.width < 220 || r.height < 90) return false;
  const c = typeof el.className === "string" ? el.className : "";
  return el.tagName === "SECTION" || (/rounded/.test(c) && /border/.test(c));
};

/** Finds a step's target (see tours.ts for the forms it takes). */
const findTarget = (spec: string): HTMLElement | null => {
  if (spec.startsWith("css:")) return [...document.querySelectorAll(spec.slice(4))].find(visible) ?? null;
  if (spec.startsWith("text:")) {
    const [text, mode] = spec.slice(5).split("|");
    const hit = [...document.querySelectorAll("h1, h2, h3, h4, p, span, button, a, label, li")]
      .filter((el) => !el.closest("[data-demo-tour]") && el.textContent?.trim() === text)
      .find(visible);
    if (!hit) return null;
    if (mode === "item") return (hit.closest("button, a, li") as HTMLElement | null) ?? hit;
    if (mode === "card") {
      let el = hit.parentElement;
      while (el && el !== document.body) {
        if (isCard(el)) return el;
        el = el.parentElement;
      }
    }
    return hit;
  }
  return [...document.querySelectorAll(`[data-tour="${spec}"]`)].find(visible) ?? null;
};

type Box = { top: number; left: number; width: number; height: number };
const sameBox = (a: Box | null, b: Box | null) =>
  !!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

/** Where the card goes: beside the spotlight if it fits, otherwise along an edge. */
function placeCard(box: Box | null, w: number, h: number, dock?: "left"): React.CSSProperties {
  const vw = window.innerWidth, vh = window.innerHeight, gap = 16, m = 12;
  // Phones: along whichever edge the spotlight isn't
  if (vw < 640) return box && box.top + box.height / 2 > vh / 2 ? { left: m, right: m, top: m } : { left: m, right: m, bottom: m };
  if (dock === "left" && vw >= 1200) return { left: 20, bottom: 20 };
  if (!box) return { left: Math.max(m, (vw - w) / 2), bottom: 28 };
  const cx = Math.min(vw - w - m, Math.max(m, box.left + box.width / 2 - w / 2));
  if (box.top + box.height + gap + h < vh - m) return { left: cx, top: box.top + box.height + gap };
  if (box.top - gap - h > m) return { left: cx, top: box.top - gap - h };
  const cy = Math.min(vh - h - m, Math.max(m, box.top + box.height / 2 - h / 2));
  if (box.left + box.width + gap + w < vw - m) return { left: box.left + box.width + gap, top: cy };
  if (box.left - gap - w > m) return { left: box.left - gap - w, top: cy };
  return { left: cx, bottom: 24 };
}

type Step = TourStep & { chapter?: number };

/** A spotlight and a card that walk through `steps`; `finale` is shown after the last one. */
const Walkthrough: React.FC<{
  steps: Step[];
  chapters?: string[];
  step: number;
  setStep: (n: number | null) => void;
  finale: React.ReactNode;
  label: string;
}> = ({ steps, chapters, step, setStep, finale, label }) => {
  const done = step >= steps.length;
  const s: Step | undefined = steps[step];
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const card = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [state, setState] = useState<"none" | "looking" | "found" | "missing">("none");
  const [dialog, setDialog] = useState(false);
  const [menu, setMenu] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });

  // Open the step's page once, when the step starts (they're free to wander after that)
  useEffect(() => {
    setMenu(false);
    if (!s?.path) return;
    const target = s.path.split("?")[0];
    if (window.location.pathname !== target) navigate(s.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Find the step's target and follow it as the page moves
  useEffect(() => {
    setBox(null);
    if (!s?.target) {
      setState("none");
      return;
    }
    setState("looking");
    let el: HTMLElement | null = null;
    let raf = 0;
    let scrolled = false;
    let settled = 0;
    let foundAt = 0;
    let last: Box | null = null;
    let frame = 0;
    const started = performance.now();
    const tick = () => {
      // Look again every half second: pages settle (and panels grow) after they first render
      if (!el || !el.isConnected || !visible(el)) el = findTarget(s.target!);
      else if (++frame % 30 === 0) el = findTarget(s.target!) ?? el;
      if (frame === 0) frame = 1;
      if (el) {
        const r = el.getBoundingClientRect();
        if (!scrolled) {
          scrolled = true;
          foundAt = performance.now();
          setState("found");
        }
        // Bring it into view, and check again while the page settles (things above it can still be loading)
        const vh = window.innerHeight;
        const tall = r.height > vh * 0.6;
        const out = tall ? r.top < 56 || r.top > vh * 0.4 : r.top < 56 || r.bottom > vh - 56;
        if (out && settled < 4 && performance.now() - foundAt < 3000 && frame % 20 === 0) {
          settled++;
          el.scrollIntoView({ behavior: settled === 1 ? "smooth" : "auto", block: tall ? "start" : "center" });
        }
        const next = { top: r.top, left: r.left, width: r.width, height: r.height };
        if (!sameBox(next, last)) {
          last = next;
          setBox(next);
        }
      } else if (performance.now() - started > 8000 && last === null) {
        setState("missing");
        return; // never showed up: the card stays on its own
      }
      // A real dialog on top (e.g. the command palette): step out of its way
      setDialog([...document.querySelectorAll('[role="dialog"]:not([data-demo-tour]):not([data-demo-menu]):not([aria-hidden="true"]), [role="alertdialog"]')].some(visible));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [s?.target, step, pathname]);

  useLayoutEffect(() => {
    const el = card.current;
    if (!el) return;
    const apply = () => setStyle(placeCard(box, el.offsetWidth, el.offsetHeight, s?.dock));
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [box, step, s?.dock, menu]);

  const next = useCallback(() => setStep(step + 1), [step, setStep]);
  const back = useCallback(() => setStep(Math.max(0, step - 1)), [step, setStep]);
  const end = useCallback(() => setStep(null), [setStep]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "Escape") end();
      else if (e.key === "ArrowRight" && !done) next();
      else if (e.key === "ArrowLeft" && step > 0) back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, end, done, step]);

  const pad = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const hole = box && {
    top: Math.max(4, box.top - pad),
    left: Math.max(4, box.left - pad),
    width: Math.min(vw - 8, box.left + box.width + pad) - Math.max(4, box.left - pad),
    height: Math.min(vh - 8, box.top + box.height + pad) - Math.max(4, box.top - pad),
  };
  const lit = !!hole && hole.width > 0 && hole.height > 0 && !dialog;
  const chapter = s?.chapter ?? 0;
  const inChapter = chapters ? steps.filter((x) => x.chapter === chapter) : steps;
  const posInChapter = chapters && s ? inChapter.indexOf(s) : step;

  return (
    <>
      {/* Dim everything except the spotlight. Box shadows don't catch clicks, so the page stays usable. */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-[85] rounded-[22px] transition-[top,left,width,height,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={
          lit
            ? { ...hole, opacity: 1, boxShadow: "0 0 0 200vmax rgba(2,6,18,0.58), 0 0 0 2px rgba(127,243,255,0.85), 0 0 36px 4px rgba(127,243,255,0.28)" }
            : { top: vh / 2, left: vw / 2, width: 0, height: 0, opacity: 0, boxShadow: "0 0 0 200vmax rgba(2,6,18,0.42)" }
        }
      />
      <div
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        data-demo-tour
        data-target-state={state}
        className="lp-keep fixed z-[90] w-auto max-w-none rounded-[22px] border border-white/12 bg-[rgba(9,15,34,0.95)] p-5 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-[top,left,bottom,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:w-[360px]"
        style={style}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7ff3ff]">
            <Compass className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{done ? `${label} complete` : chapters ? `${chapters[chapter]} · ${posInChapter + 1}/${inChapter.length}` : `${label} · ${step + 1} of ${steps.length}`}</span>
          </p>
          <div className="-m-1.5 flex shrink-0 items-center">
            {chapters && (
              <button
                type="button"
                onClick={() => setMenu((v) => !v)}
                aria-expanded={menu}
                aria-label="Chapters"
                className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white", menu && "bg-white/10 text-white")}
              >
                <ListOrdered className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={end} aria-label="End the tour" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {menu && chapters ? (
          <ol data-demo-menu className="mt-3 max-h-[min(60vh,420px)] space-y-1 overflow-y-auto" aria-label="Jump to a chapter">
            {chapters.map((title, ci) => {
              const firstStep = steps.findIndex((x) => x.chapter === ci);
              const count = steps.filter((x) => x.chapter === ci).length;
              const current = !done && ci === chapter;
              const passed = done || ci < chapter;
              return (
                <li key={title}>
                  <button
                    type="button"
                    onClick={() => setStep(firstStep)}
                    className={cn("flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition-colors", current ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/[0.06]")}
                  >
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] tabular-nums", passed ? "bg-[#7ff3ff]/20 text-[#7ff3ff]" : current ? "bg-[#3b82f6] text-white" : "border border-white/15 text-white/60")}>
                      {passed ? <Check className="h-3.5 w-3.5" /> : ci + 1}
                    </span>
                    <span className="flex-1">{title}</span>
                    <span className="text-[11.5px] text-white/45">{count}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : done || !s ? (
          finale
        ) : (
          <>
            <h2 id="tour-title" className="mt-2 text-[18px] font-semibold tracking-[-0.02em]">{s.title}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-white/75">{s.body}</p>
            {s.hint && <p className="mt-2.5 rounded-xl border border-[#7ff3ff]/20 bg-[#7ff3ff]/[0.07] px-3 py-2 text-[13px] leading-snug text-[#c9fbff]">{s.hint}</p>}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
                <div className="h-full rounded-full bg-[#7ff3ff] transition-[width] duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
              </div>
              <div className="flex gap-2">
                {step > 0 && (
                  <button type="button" onClick={back} className={ghost} aria-label="Previous step">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <button type="button" onClick={next} className={primary}>
                  {step === steps.length - 1 ? "Finish" : "Next"} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

const DemoControl: React.FC<{ role: DemoRole; onTour: () => void }> = ({ role, onTour }) => {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(16);
  const panel = useRef<HTMLDivElement>(null);

  // Sit beside the portal sidebar rather than on top of it (it can appear late, as pages load)
  useEffect(() => {
    const place = () => {
      const side = document.querySelector("[data-legacy-dashboard-sidebar]");
      setLeft(visible(side) ? side.getBoundingClientRect().right + 16 : 16);
    };
    place();
    const t = window.setInterval(place, 1000);
    window.addEventListener("resize", place);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("resize", place);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => panel.current && !panel.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={panel} className="lp-keep fixed bottom-5 z-[80] font-ui" style={{ left }}>
      {open && (
        <div role="dialog" aria-label="Live demo" data-demo-menu className="lp-fade absolute bottom-[calc(100%+10px)] left-0 w-[min(320px,calc(100vw-32px))] rounded-[20px] border border-white/12 bg-[rgba(9,15,34,0.95)] p-4 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7ff3ff]">Live demo · {role === "student" ? "Student" : "Teacher"}</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/75">{ABOUT[role]}</p>
          <div className="mt-3.5 grid gap-2">
            <button type="button" onClick={() => (setOpen(false), onTour())} className={primary}>
              <Compass className="h-4 w-4" /> Take the guided tour
            </button>
            <button type="button" onClick={() => startDemo(other(role))} className={ghost}>
              <Repeat className="h-3.5 w-3.5" /> Switch to the {other(role)} view
            </button>
            <Link to="/help" onClick={() => setOpen(false)} className={ghost}>
              <HelpCircle className="h-3.5 w-3.5" /> Questions? Help centre
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <a href="/register" onClick={(e) => (e.preventDefault(), exitDemo("/register"))} className={ghost}>
                <Sparkles className="h-3.5 w-3.5" /> Get started
              </a>
              <button type="button" onClick={() => exitDemo()} className={ghost}>
                <LogOut className="h-3.5 w-3.5" /> Exit demo
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-full border border-white/12 bg-[rgba(9,15,34,0.88)] pl-3 pr-4 text-[13px] font-medium text-white shadow-[0_14px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-colors hover:border-[#7ff3ff]/40"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34d399] opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#34d399]" />
        </span>
        Live demo
      </button>
    </div>
  );
};

/** The full tour for this role, in chapters. */
const RoleTour: React.FC<{ role: DemoRole; step: number; setStep: (n: number | null) => void }> = ({ role, step, setStep }) => (
  <Walkthrough
    steps={tourSteps(role)}
    chapters={TOURS[role].map((c) => c.title)}
    step={step}
    setStep={setStep}
    label="Tour"
    finale={
      <>
        <h2 id="tour-title" className="mt-2 text-[18px] font-semibold tracking-[-0.02em]">That's the tour</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/75">
          Everything you've seen works on sample data, so keep exploring as long as you like. When you're ready, set Refyn up for your school.
        </p>
        <div className="mt-4 grid gap-2">
          <a href="/register" onClick={(e) => (e.preventDefault(), exitDemo("/register"))} className={primary}>
            <Sparkles className="h-4 w-4" /> Get started with Refyn
          </a>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => startDemo(other(role), { tour: true })} className={ghost}>
              <Repeat className="h-3.5 w-3.5" /> {other(role) === "teacher" ? "Teacher tour" : "Student tour"}
            </button>
            <button type="button" onClick={() => setStep(null)} className={ghost}>
              Keep exploring
            </button>
          </div>
        </div>
      </>
    }
  />
);

/** One help question, shown as a short walkthrough inside the help centre. */
const MiniTour: React.FC<{ mini: string }> = ({ mini }) => {
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [step, setStep] = useState<number | null>(0);
  const [title, setTitle] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/help/faq.json")
      .then((r) => r.json() as Promise<HelpData>)
      .then((data) => {
        const item = data.categories.flatMap((c) => c.items).find((i) => i.id === mini);
        if (live && item?.demo) {
          setSteps(item.demo.steps);
          setTitle(item.q);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [mini]);

  if (!steps) return null;
  if (step === null) {
    return (
      <div className="lp-keep fixed bottom-4 left-1/2 z-[90] flex -translate-x-1/2 gap-1.5 rounded-full border border-white/12 bg-[rgba(9,15,34,0.92)] p-1.5 text-white shadow-[0_14px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <button type="button" onClick={() => setStep(0)} className={cn(ghost, "h-8 rounded-full border-0")}>
          <Repeat className="h-3.5 w-3.5" /> Show me again
        </button>
        <a href="/demo" target="_top" className={cn(primary, "h-8 rounded-full")}>
          Open the full demo
        </a>
      </div>
    );
  }
  return (
    <Walkthrough
      steps={steps}
      step={step}
      setStep={setStep}
      label="Show me"
      finale={
        <>
          <h2 id="tour-title" className="mt-2 text-[18px] font-semibold tracking-[-0.02em]">Now try it yourself</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/75">
            This is the real Refyn on sample data, so click around{title ? ` and see “${title}” for yourself` : ""}.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setStep(null)} className={primary}>
              Explore
            </button>
            <button type="button" onClick={closeEmbed} className={ghost}>
              Back to help
            </button>
          </div>
        </>
      }
    />
  );
};

const DemoLayer: React.FC = () => {
  const role = demoRole();
  const embed = demoEmbed();
  const [step, setStepState] = useState<number | null>(demoTourStep);
  const setStep = useCallback((n: number | null) => {
    setDemoTourStep(n);
    setStepState(n);
  }, []);
  const { pathname } = useLocation();

  // Signing up for real leaves the demo first
  useEffect(() => {
    if (pathname === "/register" || pathname === "/signup") exitDemo(pathname);
  }, [pathname]);

  if (!role) return null;
  if (embed) return embed.mini ? <MiniTour mini={embed.mini} /> : null;
  return step === null ? <DemoControl role={role} onTour={() => setStep(0)} /> : <RoleTour role={role} step={step} setStep={setStep} />;
};

export default DemoLayer;
