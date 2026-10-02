import React, { useRef } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Switch } from "../kit/controls";
import { label, type Ctx, type Plot } from "../kit/draw";
import { dot, fmtN, handle, paper } from "./paper";

// Derivative as the limit of secant gradients, and the definite integral as
// the limit of Riemann sums, for a handful of functions with exact answers.

const FNS = {
  sq: { name: "x²", f: (x: number) => x * x, d: (x: number) => 2 * x, F: (x: number) => (x * x * x) / 3, view: { cx: 0.5, cy: 3, span: 9 } },
  cubic: { name: "x³ − 3x", f: (x: number) => x * x * x - 3 * x, d: (x: number) => 3 * x * x - 3, F: (x: number) => x ** 4 / 4 - 1.5 * x * x, view: { cx: 0, cy: 0, span: 9 } },
  sin: { name: "sin x", f: Math.sin, d: Math.cos, F: (x: number) => -Math.cos(x), view: { cx: 1.5, cy: 0, span: 13 } },
  exp: { name: "eˣ", f: Math.exp, d: Math.exp, F: Math.exp, view: { cx: 0, cy: 3, span: 8 } },
  sqrt: { name: "√x", f: (x: number) => (x >= 0 ? Math.sqrt(x) : NaN), d: (x: number) => (x > 0 ? 0.5 / Math.sqrt(x) : NaN), F: (x: number) => (x >= 0 ? (2 / 3) * x ** 1.5 : NaN), view: { cx: 3.5, cy: 1.5, span: 9 } },
} as const;
type Fn = keyof typeof FNS;
type Method = "left" | "right" | "mid" | "trap";
type P = { fn: Fn; mode: "deriv" | "integral"; a: number; h: number; trace: boolean; lo: number; hi: number; n: number; method: Method };
const DEF: P = { fn: "sq", mode: "deriv", a: 1, h: 1, trace: false, lo: 0, hi: 2, n: 6, method: "mid" };

export const riemann = (f: (x: number) => number, lo: number, hi: number, n: number, m: Method) => {
  const dx = (hi - lo) / n;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const x0 = lo + i * dx, x1 = x0 + dx;
    s += m === "left" ? f(x0) : m === "right" ? f(x1) : m === "mid" ? f((x0 + x1) / 2) : (f(x0) + f(x1)) / 2;
  }
  return s * dx;
};

function draw(ctx: Ctx, w: number, h: number, p: P, t: SimTheme): Plot {
  const F = FNS[p.fn];
  const pl = paper(ctx, w, h, t, F.view);
  if (p.mode === "deriv") {
    if (p.trace) { pl.fn(ctx, F.d, t.c.violet, 2.2, [6, 4]); label(ctx, `f′(x)`, pl.X(pl.xmax) - 30, pl.Y(F.d(pl.xmax - 0.6)) - 12, { color: t.c.violet, size: 12, weight: 700, halo: true }); }
    pl.fn(ctx, F.f, t.c.blue, 3.2);
    const a = p.a, b = p.a + p.h, fa = F.f(a), fb = F.f(b);
    const sec = (fb - fa) / p.h, tan = F.d(a);
    if (isFinite(sec)) {
      pl.fn(ctx, (x) => fa + sec * (x - a), t.c.orange, 2.2);
      ctx.strokeStyle = t.c.orange; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pl.X(a), pl.Y(fa)); ctx.lineTo(pl.X(b), pl.Y(fa)); ctx.lineTo(pl.X(b), pl.Y(fb)); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, `h = ${fmtN(p.h, 3)}`, (pl.X(a) + pl.X(b)) / 2, pl.Y(fa) + 14, { color: t.c.orange, size: 11.5, weight: 600, halo: true });
      dot(ctx, pl.X(b), pl.Y(fb), t.c.orange, null, t);
    }
    if (isFinite(tan)) pl.fn(ctx, (x) => fa + tan * (x - a), t.c.green, 2.6, [8, 5]);
    if (p.trace && isFinite(tan)) dot(ctx, pl.X(a), pl.Y(tan), t.c.violet, `(${fmtN(a)}, ${fmtN(tan, 3)})`, t, "right");
    handle(ctx, pl.X(a), pl.Y(fa), t.c.pink);
  } else {
    const lo = Math.min(p.lo, p.hi), hi = Math.max(p.lo, p.hi);
    const dx = (hi - lo) / p.n;
    for (let i = 0; i < p.n; i++) {
      const x0 = lo + i * dx, x1 = x0 + dx;
      const y0 = F.f(x0), y1 = F.f(x1);
      const hgt = p.method === "left" ? y0 : p.method === "right" ? y1 : p.method === "mid" ? F.f((x0 + x1) / 2) : 0;
      ctx.fillStyle = (p.method === "trap" ? (y0 + y1) / 2 : hgt) >= 0 ? (t.dark ? "rgba(96,165,250,0.35)" : "rgba(37,99,235,0.25)") : (t.dark ? "rgba(248,113,113,0.35)" : "rgba(220,38,38,0.22)");
      ctx.strokeStyle = t.c.blue; ctx.lineWidth = 1;
      ctx.beginPath();
      if (p.method === "trap") { ctx.moveTo(pl.X(x0), pl.Y(0)); ctx.lineTo(pl.X(x0), pl.Y(y0)); ctx.lineTo(pl.X(x1), pl.Y(y1)); ctx.lineTo(pl.X(x1), pl.Y(0)); }
      else ctx.rect(pl.X(x0), Math.min(pl.Y(0), pl.Y(hgt)), pl.X(x1) - pl.X(x0), Math.abs(pl.Y(hgt) - pl.Y(0)));
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    pl.fn(ctx, F.f, t.c.blue, 3.2);
    for (const [x, k] of [[p.lo, "lo"], [p.hi, "hi"]] as const) {
      ctx.strokeStyle = t.c.amber; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pl.X(x), pl.y0); ctx.lineTo(pl.X(x), pl.y0 + pl.h); ctx.stroke(); ctx.setLineDash([]);
      handle(ctx, pl.X(x), pl.Y(0), t.c.amber);
      label(ctx, `${k === "lo" ? "a" : "b"} = ${fmtN(x)}`, pl.X(x), pl.y0 + 16, { color: t.c.amber, size: 12, weight: 700, halo: true });
    }
  }
  label(ctx, `f(x) = ${F.name}`, pl.x0 + 14, pl.y0 + pl.h - 20, { color: t.c.blue, size: 18, weight: 600, align: "left", halo: true, font: "Georgia, 'Times New Roman', serif" });
  return pl;
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  draw(ctx, w, h, { ...DEF, mode: "integral", fn: "sin", lo: 0, hi: 3, n: 8 }, t);
}

export default function Calculus() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { fn: Object.keys(FNS), mode: ["deriv", "integral"], a: [-6, 8], h: [0.001, 3], lo: [-6, 8], hi: [-6, 8], n: [1, 200], method: ["left", "right", "mid", "trap"] });
  const plot = useRef<Plot | null>(null);
  const drag = useRef<"a" | "lo" | "hi" | null>(null);
  const F = FNS[p.fn];
  const render = (ctx: Ctx, w: number, h: number) => { plot.current = draw(ctx, w, h, p, theme); };
  const onDown = (pt: { x: number; y: number }) => {
    const pl = plot.current;
    if (!pl) return false;
    if (p.mode === "deriv") drag.current = Math.hypot(pt.x - pl.X(p.a), pt.y - pl.Y(F.f(p.a))) < 30 ? "a" : null;
    else { const dl = Math.abs(pt.x - pl.X(p.lo)), dh = Math.abs(pt.x - pl.X(p.hi)); drag.current = Math.min(dl, dh) < 26 ? (dl < dh ? "lo" : "hi") : null; }
    return !!drag.current;
  };
  const onMove = (pt: { x: number; y: number }, down: boolean) => {
    const pl = plot.current;
    if (!down || !drag.current || !pl) return;
    const x = Math.round(pl.invX(pt.x) * 20) / 20;
    set({ [drag.current]: Math.max(-6, Math.min(8, x)) } as Partial<P>);
  };
  const onUp = () => { drag.current = null; };

  const sec = (F.f(p.a + p.h) - F.f(p.a)) / p.h, der = F.d(p.a);
  const lo = Math.min(p.lo, p.hi), hi = Math.max(p.lo, p.hi);
  const approx = riemann(F.f, lo, hi, p.n, p.method), exact = F.F(hi) - F.F(lo);
  const challenges = [
    { id: "flat", title: "Find a point where x³ − 3x has zero gradient", detail: "Derivative mode. Turn on the f′(x) graph to help.", done: p.fn === "cubic" && p.mode === "deriv" && Math.abs(der) < 0.02 },
    { id: "close", title: "For x² at x = 1, get the secant within 0.01 of the true gradient", detail: "Shrink h. What number is the secant heading for?", done: p.fn === "sq" && p.mode === "deriv" && Math.abs(p.a - 1) < 1e-9 && Math.abs(sec - der) <= 0.01 },
    { id: "mid", title: "Estimate the area under x² from 0 to 2 to within 0.01 with the midpoint rule", detail: "The exact area is 8/3.", done: p.fn === "sq" && p.mode === "integral" && p.method === "mid" && Math.abs(lo) < 1e-9 && Math.abs(hi - 2) < 1e-9 && Math.abs(approx - exact) <= 0.01 },
    { id: "zero", title: "Find an interval where the integral of sin x is 0", detail: "Area above the axis counts positive, below counts negative.", done: p.fn === "sin" && p.mode === "integral" && hi - lo > 1 && Math.abs(exact) < 0.01 },
  ];

  return (
    <SimShell
      id="calculus"
      challenges={challenges}
      onReset={() => resetP()}
      record={() => (p.mode === "deriv" ? { a: p.a, h: p.h, "secant gradient": +sec.toFixed(6), "f′(a)": +der.toFixed(6) } : { a: lo, b: hi, n: p.n, estimate: +approx.toFixed(6), exact: +exact.toFixed(6), error: +(approx - exact).toFixed(6) })}
      ask={() => p.mode === "deriv" ? `f(x) = ${F.name}. At x = ${p.a}, the secant to x + ${p.h} has gradient ${fmtN(sec, 4)}; the derivative there is ${fmtN(der, 4)}.` : `f(x) = ${F.name}, integral from ${lo} to ${hi}. ${p.method} Riemann sum with ${p.n} strips: ${fmtN(approx, 5)}; exact value ${fmtN(exact, 5)}.`}
      stage={<Stage label={`Graph of ${F.name}`} render={render} onDown={onDown} onMove={onMove} onUp={onUp} cursor="crosshair" />}
      overlay={
        <Readouts>
          {p.mode === "deriv" ? (
            <>
              <Readout label="secant gradient" value={isFinite(sec) ? fmtN(sec, 4) : "–"} color={theme.c.orange} />
              <Readout label="f′(a), tangent" value={isFinite(der) ? fmtN(der, 4) : "–"} color={theme.c.green} />
              <Readout label="difference" value={isFinite(sec - der) ? fmtN(sec - der, 4) : "–"} />
            </>
          ) : (
            <>
              <Readout label={`${p.method === "trap" ? "trapezium" : p.method} sum`} value={fmtN(approx, 5)} color={theme.c.blue} />
              <Readout label="exact integral" value={fmtN(exact, 5)} color={theme.c.green} />
              <Readout label="error" value={fmtN(approx - exact, 5)} />
            </>
          )}
        </Readouts>
      }
      controls={
        <>
          <Group title="Function">
            <Choice value={p.fn} onChange={(fn) => set({ fn })} options={(Object.keys(FNS) as Fn[]).map((k) => ({ value: k, label: FNS[k].name }))} wrap />
            <Choice value={p.mode} onChange={(mode) => set({ mode })} options={[{ value: "deriv", label: "Gradient" }, { value: "integral", label: "Area" }]} />
          </Group>
          {p.mode === "deriv" ? (
            <Group title="Secant to tangent">
              <Slider label="Point x = a" value={p.a} min={-6} max={8} step={0.05} color={theme.c.pink} onChange={(a) => set({ a })} hint="Or drag the pink point along the curve." />
              <Slider label="Gap h" value={p.h} min={0.001} max={3} step={0.001} digits={3} color={theme.c.orange} onChange={(h) => set({ h })} />
              <Switch label="Graph of f′(x)" color={theme.c.violet} checked={p.trace} onChange={(trace) => set({ trace })} />
            </Group>
          ) : (
            <Group title="Riemann sum">
              <Slider label="From a" value={p.lo} min={-6} max={8} step={0.05} color={theme.c.amber} onChange={(lo2) => set({ lo: lo2 })} />
              <Slider label="To b" value={p.hi} min={-6} max={8} step={0.05} color={theme.c.amber} onChange={(hi2) => set({ hi: hi2 })} />
              <Slider label="Strips n" value={p.n} min={1} max={200} step={1} onChange={(n) => set({ n })} />
              <Choice value={p.method} onChange={(method) => set({ method })} options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }, { value: "mid", label: "Mid" }, { value: "trap", label: "Trapezium" }]} wrap />
            </Group>
          )}
        </>
      }
      learn={
        <>
          <H>The derivative is a limit</H>
          <p>The gradient of a curve at a point is the gradient of its tangent there. Take a second point a distance h away: the line through both (a secant) has gradient</p>
          <Eq>(f(a + h) − f(a)) ⁄ h</Eq>
          <p>As h shrinks towards 0, the secant swings onto the tangent, and its gradient approaches f′(a).</p>
          <Eq>f′(a) = lim (h→0) (f(a + h) − f(a)) ⁄ h</Eq>
          <p>For x², the secant gradient is exactly 2a + h, so the limit is 2a.</p>
          <H>The integral is a limit too</H>
          <p>Cover the area with n thin strips and add up their areas. More strips, smaller error. The exact area is the limit, found with an antiderivative:</p>
          <Eq>∫ₐᵇ f(x) dx = F(b) − F(a), where F′ = f</Eq>
          <p>Area below the x-axis counts as negative.</p>
          <Try>for x² from 0 to 2, compare the error of left, right, midpoint and trapezium sums with 10 strips. Which is best, and which over- or under-estimates?</Try>
        </>
      }
    />
  );
}
