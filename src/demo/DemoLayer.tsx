import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Compass, LogOut, Repeat, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { demoRole, demoTourStep, exitDemo, setDemoTourStep, startDemo, DEMO_USERS, type DemoRole } from "./session";
import { TOURS, type TourStep } from "./tours";

// What sits on top of the portal during the live demo: a small "Live demo"
// control, and the guided tour (a spotlight on part of a real page plus a card).

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
const findTarget = (name: string) => [...document.querySelectorAll(`[data-tour="${name}"]`)].find(visible) ?? null;

type Box = { top: number; left: number; width: number; height: number };
const sameBox = (a: Box | null, b: Box | null) =>
  !!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

/** Where the card goes: beside the spotlight if it fits, otherwise along the bottom. */
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

const Tour: React.FC<{ role: DemoRole; step: number; setStep: (n: number | null) => void }> = ({ role, step, setStep }) => {
  const steps = TOURS[role];
  const done = step >= steps.length;
  const s: TourStep | undefined = steps[step];
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const card = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [dialog, setDialog] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });

  // Open the step's page once, when the step starts (they're free to wander after that)
  useEffect(() => {
    if (!s?.path) return;
    const target = s.path.split("?")[0];
    if (window.location.pathname !== target) navigate(s.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Find the step's target and follow it as the page moves
  useEffect(() => {
    setBox(null);
    if (!s?.target) return;
    let el: HTMLElement | null = null;
    let raf = 0;
    let scrolled = false;
    let last: Box | null = null;
    const started = performance.now();
    const tick = () => {
      if (!el || !el.isConnected || !visible(el)) el = findTarget(s.target!);
      if (el) {
        const r = el.getBoundingClientRect();
        if (!scrolled) {
          scrolled = true;
          if (r.top < 72 || r.bottom > window.innerHeight - 72) {
            el.scrollIntoView({ behavior: "smooth", block: r.height > window.innerHeight * 0.6 ? "start" : "center" });
          }
        }
        const next = { top: r.top, left: r.left, width: r.width, height: r.height };
        if (!sameBox(next, last)) {
          last = next;
          setBox(next);
        }
      } else if (performance.now() - started > 8000 && last === null) {
        return; // never showed up: the card stays on its own
      }
      setDialog(!!document.querySelector('[role="dialog"]:not([data-demo-tour]), [role="alertdialog"]'));
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
  }, [box, step]);

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

  return (
    <>
      {/* Dim everything except the spotlight. Box shadows don't catch clicks, so the page stays usable. */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-[85] rounded-[22px] transition-[top,left,width,height,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={
          hole && hole.width > 0 && hole.height > 0 && !dialog
            ? { ...hole, opacity: 1, boxShadow: "0 0 0 200vmax rgba(2,6,18,0.58), 0 0 0 2px rgba(127,243,255,0.85), 0 0 36px 4px rgba(127,243,255,0.28)" }
            : { top: vh / 2, left: vw / 2, width: 0, height: 0, opacity: dialog ? 0 : 1, boxShadow: "0 0 0 200vmax rgba(2,6,18,0.42)" }
        }
      />
      <div
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        data-demo-tour
        className="lp-keep fixed z-[90] w-auto max-w-none rounded-[22px] border border-white/12 bg-[rgba(9,15,34,0.94)] p-5 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-[top,left,bottom,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:w-[350px]"
        style={style}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7ff3ff]">
            <Compass className="h-3.5 w-3.5" /> {done ? "Tour complete" : `Tour · ${step + 1} of ${steps.length}`}
          </p>
          <button type="button" onClick={end} aria-label="End the tour" className="-m-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        {done ? (
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
                <button type="button" onClick={end} className={ghost}>Keep exploring</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 id="tour-title" className="mt-2 text-[18px] font-semibold tracking-[-0.02em]">{s.title}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-white/75">{s.body}</p>
            {s.hint && <p className="mt-2.5 rounded-xl border border-[#7ff3ff]/20 bg-[#7ff3ff]/[0.07] px-3 py-2 text-[13px] leading-snug text-[#c9fbff]">{s.hint}</p>}
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex gap-1" aria-hidden>
                {steps.map((_, i) => (
                  <span key={i} className={cn("h-1.5 rounded-full transition-all duration-300", i === step ? "w-5 bg-[#7ff3ff]" : i < step ? "w-1.5 bg-white/50" : "w-1.5 bg-white/20")} />
                ))}
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
  const { pathname } = useLocation();
  const panel = useRef<HTMLDivElement>(null);

  // Sit beside the portal sidebar rather than on top of it
  useEffect(() => {
    const place = () => {
      const side = document.querySelector("[data-legacy-dashboard-sidebar]");
      setLeft(visible(side) ? side.getBoundingClientRect().right + 16 : 16);
    };
    place();
    const t = window.setTimeout(place, 400);
    window.addEventListener("resize", place);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", place);
    };
  }, [pathname]);

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
        <div role="dialog" aria-label="Live demo" className="lp-fade absolute bottom-[calc(100%+10px)] left-0 w-[min(320px,calc(100vw-32px))] rounded-[20px] border border-white/12 bg-[rgba(9,15,34,0.95)] p-4 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7ff3ff]">Live demo · {role === "student" ? "Student" : "Teacher"}</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/75">{ABOUT[role]}</p>
          <div className="mt-3.5 grid gap-2">
            <button type="button" onClick={() => (setOpen(false), onTour())} className={primary}>
              <Compass className="h-4 w-4" /> Take the guided tour
            </button>
            <button type="button" onClick={() => startDemo(other(role))} className={ghost}>
              <Repeat className="h-3.5 w-3.5" /> Switch to the {other(role)} view
            </button>
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

const DemoLayer: React.FC = () => {
  const role = demoRole();
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
  return step === null ? <DemoControl role={role} onTour={() => setStep(0)} /> : <Tour role={role} step={step} setStep={setStep} />;
};

export default DemoLayer;
