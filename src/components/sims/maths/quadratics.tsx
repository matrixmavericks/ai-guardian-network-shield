import React, { useRef } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider } from "../kit/controls";
import { label, roundRect, type Ctx, type Plot } from "../kit/draw";
import { coef, dot, fmtN, handle, paper, term } from "./paper";

// y = ax² + bx + c in standard, vertex and factored form, with vertex, axis of
// symmetry, roots, intercept and the discriminant. Drag the vertex to move it.

type P = { a: number; b: number; c: number };
const DEF: P = { a: 1, b: -4, c: 1 };

export const info = ({ a, b, c }: P) => {
  const xv = -b / (2 * a), yv = c - (b * b) / (4 * a);
  const D = b * b - 4 * a * c;
  const roots = D > 1e-9 ? [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].sort((x, y) => x - y) : Math.abs(D) <= 1e-9 ? [xv] : [];
  return { xv, yv, D, roots };
};
const standard = (p: P) => `y = ${coef(p.a)}x²${term(p.b, "x")}${term(p.c)}`;
const vertexForm = (p: P) => { const { xv, yv } = info(p); return `y = ${coef(p.a)}(x ${xv >= 0 ? "−" : "+"} ${fmtN(Math.abs(xv))})²${term(yv)}`; };
const factored = (p: P) => {
  const { roots } = info(p);
  if (!roots.length) return "no real factors (Δ < 0)";
  if (roots.length === 1) return `y = ${coef(p.a)}(x ${roots[0] >= 0 ? "−" : "+"} ${fmtN(Math.abs(roots[0]))})²`;
  return `y = ${coef(p.a)}${roots.map((r) => `(x ${r >= 0 ? "−" : "+"} ${fmtN(Math.abs(r))})`).join("")}`;
};

function draw(ctx: Ctx, w: number, h: number, p: P, t: SimTheme): Plot {
  const { xv, yv, D, roots } = info(p);
  const pl = paper(ctx, w, h, t, { cx: 0, cy: Math.max(-6, Math.min(6, yv / 2)), span: 18 });
  // Axis of symmetry
  ctx.strokeStyle = t.c.violet; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pl.X(xv), pl.y0); ctx.lineTo(pl.X(xv), pl.y0 + pl.h); ctx.stroke(); ctx.setLineDash([]);
  label(ctx, `x = ${fmtN(xv)}`, pl.X(xv) + 6, pl.y0 + 16, { color: t.c.violet, size: 11.5, weight: 600, align: "left", halo: true });
  pl.fn(ctx, (x) => p.a * x * x + p.b * x + p.c, t.c.blue, 3.2);
  dot(ctx, pl.X(0), pl.Y(p.c), t.c.green, `(0, ${fmtN(p.c)})`, t, "left");
  roots.forEach((r) => dot(ctx, pl.X(r), pl.Y(0), t.c.red, `(${fmtN(r)}, 0)`, t, "below"));
  handle(ctx, pl.X(xv), pl.Y(yv), t.c.pink);
  label(ctx, `vertex (${fmtN(xv)}, ${fmtN(yv)})`, pl.X(xv), pl.Y(yv) + (p.a > 0 ? 26 : -26), { color: t.c.pink, size: 12, weight: 700, halo: true });
  // The three forms
  const bw = Math.min(330, w - 28), bx = w - bw - 14, by = h - 118;
  ctx.fillStyle = t.panel; roundRect(ctx, bx, by, bw, 104, 14); ctx.fill();
  ctx.strokeStyle = t.grid; ctx.lineWidth = 1; ctx.stroke();
  const serif = "Georgia, 'Times New Roman', serif";
  [["standard", standard(p)], ["vertex", vertexForm(p)], ["factored", factored(p)]].forEach(([k, eq], i) => {
    label(ctx, k, bx + 14, by + 22 + i * 30, { color: t.mute, size: 11, align: "left" });
    label(ctx, eq, bx + 84, by + 22 + i * 30, { color: t.ink, size: 15, align: "left", font: serif });
  });
  void D;
  return pl;
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const pl = paper(ctx, w, h, t, { cx: 0, cy: 0, span: 12 });
  const q = { a: 1, b: -2, c: -3 };
  pl.fn(ctx, (x) => x * x - 2 * x - 3, t.c.blue, 3);
  info(q).roots.forEach((r) => dot(ctx, pl.X(r), pl.Y(0), t.c.red, null, t));
  dot(ctx, pl.X(1), pl.Y(-4), t.c.pink, null, t);
}

export default function Quadratics() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { a: [-3, 3], b: [-10, 10], c: [-10, 10] });
  const plot = useRef<Plot | null>(null);
  const drag = useRef(false);
  const q = info(p);
  const render = (ctx: Ctx, w: number, h: number) => { plot.current = draw(ctx, w, h, p, theme); };
  const onDown = (pt: { x: number; y: number }) => {
    const pl = plot.current;
    if (pl && Math.hypot(pt.x - pl.X(q.xv), pt.y - pl.Y(q.yv)) < 28) { drag.current = true; return true; }
    return false;
  };
  const onMove = (pt: { x: number; y: number }, down: boolean) => {
    const pl = plot.current;
    if (!down || !drag.current || !pl) return;
    const r = (v: number) => Math.round(v * 2) / 2;
    const xv = r(pl.invX(pt.x)), yv = r(pl.invY(pt.y));
    // Keep a, move the vertex: b = −2a·xv, c = a·xv² + yv
    set({ b: Math.max(-10, Math.min(10, +(-2 * p.a * xv).toFixed(2))), c: Math.max(-10, Math.min(10, +(p.a * xv * xv + yv).toFixed(2))) });
  };
  const onUp = () => { drag.current = false; };

  const near = (x: number, y: number) => Math.abs(x - y) < 0.06;
  const challenges = [
    { id: "one", title: "Make a parabola that touches the x-axis at one point", detail: "Discriminant exactly 0.", done: Math.abs(q.D) < 0.02 },
    { id: "roots", title: "Put the roots at x = −1 and x = 3", detail: "Any value of a.", done: q.roots.length === 2 && near(q.roots[0], -1) && near(q.roots[1], 3) },
    { id: "vertex", title: "Vertex at (2, −5), opening downwards", detail: "Then read off the vertex form.", done: p.a < 0 && near(q.xv, 2) && near(q.yv, -5) },
    { id: "none", title: "No real roots, but crossing the y-axis at 4", detail: "What does that need the discriminant to be?", done: q.D < 0 && near(p.c, 4) },
  ];

  const disc = q.D > 1e-9 ? "two real roots" : Math.abs(q.D) <= 1e-9 ? "one repeated root" : "no real roots";
  return (
    <SimShell
      id="quadratics"
      challenges={challenges}
      onReset={() => resetP()}
      record={() => ({ a: p.a, b: p.b, c: p.c, "Δ": +q.D.toFixed(3), "vertex x": +q.xv.toFixed(3), "vertex y": +q.yv.toFixed(3) })}
      ask={() => `Quadratic ${standard(p)}, which is ${vertexForm(p)}${q.roots.length ? ` and ${factored(p)}` : ""}. Discriminant ${fmtN(q.D)} (${disc}).`}
      stage={<Stage label={`Graph of ${standard(p)}`} render={render} onDown={onDown} onMove={onMove} onUp={onUp} cursor="crosshair" />}
      overlay={
        <Readouts>
          <Readout label="discriminant b² − 4ac" value={q.D} digits={2} color={q.D > 1e-9 ? theme.c.green : Math.abs(q.D) <= 1e-9 ? theme.c.amber : theme.c.red} />
          <Readout label="so" value={disc} />
        </Readouts>
      }
      controls={
        <>
          <Group title="y = ax² + bx + c">
            <Slider label="a" value={p.a} min={-3} max={3} step={0.1} onChange={(a) => set({ a: Math.abs(a) < 0.05 ? 0.1 : a })} hint="Not 0, or it isn't a quadratic." />
            <Slider label="b" value={p.b} min={-10} max={10} step={0.1} onChange={(b) => set({ b })} />
            <Slider label="c" value={p.c} min={-10} max={10} step={0.1} onChange={(c) => set({ c })} hint="Or drag the pink vertex." />
          </Group>
        </>
      }
      learn={
        <>
          <H>Three forms, one curve</H>
          <Eq>y = ax² + bx + c &nbsp;(c is the y-intercept)</Eq>
          <Eq>y = a(x − h)² + k &nbsp;(vertex (h, k))</Eq>
          <Eq>y = a(x − p)(x − q) &nbsp;(roots p and q)</Eq>
          <p>a decides the shape: positive opens up (a minimum), negative opens down (a maximum); bigger |a| is narrower.</p>
          <H>Completing the square</H>
          <p>x² − 2x − 3 = (x − 1)² − 1 − 3 = (x − 1)² − 4, so the vertex is (1, −4). In general the vertex is at x = −b ⁄ 2a, which is also the axis of symmetry.</p>
          <H>The quadratic formula and the discriminant</H>
          <Eq>x = (−b ± √(b² − 4ac)) ⁄ 2a</Eq>
          <p>Δ = b² − 4ac: positive gives two roots, zero gives one (the vertex is on the x-axis), negative gives none.</p>
          <Try>keep b and c fixed and slide a from positive to negative. When does the number of roots change?</Try>
        </>
      }
    />
  );
}
