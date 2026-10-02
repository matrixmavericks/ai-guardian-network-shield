import React, { useRef } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Choice, Switch } from "../kit/controls";
import { label, type Ctx, type Plot } from "../kit/draw";
import { coef, dot, fmtN, handle, paper, term } from "./paper";

// A straight line through two points you drag: gradient as rise over run,
// y-intercept, and parallel or perpendicular lines through a third point.

type P = { x1: number; y1: number; x2: number; y2: number; qx: number; qy: number; extra: "none" | "parallel" | "perpendicular"; tri: boolean; ref: boolean };
const DEF: P = { x1: -2, y1: -1, x2: 3, y2: 4, qx: 2, qy: -3, extra: "none", tri: true, ref: false };

const line = (p: P) => {
  const run = p.x2 - p.x1, rise = p.y2 - p.y1;
  if (Math.abs(run) < 1e-9) return { vertical: true as const, x: p.x1, rise, run };
  const m = rise / run;
  return { vertical: false as const, m, c: p.y1 - m * p.x1, rise, run };
};
const eq = (m: number, c: number) => (Math.abs(m) < 1e-9 ? `y = ${fmtN(c)}` : `y = ${coef(m)}x${term(c)}`);
const gcd = (a: number, b: number): number => (b < 1e-9 ? a : gcd(b, a % b));
const frac = (rise: number, run: number) => {
  // Coordinates snap to halves, so double them for whole numbers
  let r = Math.round(rise * 2), u = Math.round(run * 2);
  if (u < 0) { r = -r; u = -u; }
  const g = gcd(Math.abs(r), Math.abs(u)) || 1;
  r /= g; u /= g;
  return u === 1 ? `${r < 0 ? "−" : ""}${Math.abs(r)}` : `${r < 0 ? "−" : ""}${Math.abs(r)}/${u}`;
};

function draw(ctx: Ctx, w: number, h: number, p: P, t: SimTheme): Plot {
  const pl = paper(ctx, w, h, t, { cx: 0, cy: 0, span: 20 });
  const L = line(p);
  if (p.ref) { pl.fn(ctx, (x) => 2 * x + 1, t.mute, 2.5, [8, 6]); label(ctx, "y = 2x + 1", pl.X(2.6), pl.Y(6.2), { color: t.mute, size: 12, weight: 600, halo: true }); }
  if (L.vertical) {
    ctx.strokeStyle = t.c.blue; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(pl.X(L.x), pl.y0); ctx.lineTo(pl.X(L.x), pl.y0 + pl.h); ctx.stroke();
  } else {
    pl.fn(ctx, (x) => L.m * x + L.c, t.c.blue, 3.2);
    if (p.tri) {
      // Rise and run triangle between the two points
      ctx.strokeStyle = t.c.orange; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(pl.X(p.x1), pl.Y(p.y1)); ctx.lineTo(pl.X(p.x2), pl.Y(p.y1)); ctx.lineTo(pl.X(p.x2), pl.Y(p.y2)); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, `run ${fmtN(L.run)}`, (pl.X(p.x1) + pl.X(p.x2)) / 2, pl.Y(p.y1) + (L.rise >= 0 ? 16 : -16), { color: t.c.orange, size: 12, weight: 700, halo: true });
      label(ctx, `rise ${fmtN(L.rise)}`, pl.X(p.x2) + (L.run >= 0 ? 10 : -10), (pl.Y(p.y1) + pl.Y(p.y2)) / 2, { color: t.c.orange, size: 12, weight: 700, halo: true, align: L.run >= 0 ? "left" : "right" });
    }
    dot(ctx, pl.X(0), pl.Y(L.c), t.c.green, `(0, ${fmtN(L.c)})`, t, "left");
    if (Math.abs(L.m) > 1e-9) dot(ctx, pl.X(-L.c / L.m), pl.Y(0), t.c.red, `(${fmtN(-L.c / L.m)}, 0)`, t, "below");
    if (p.extra !== "none") {
      const m2 = p.extra === "parallel" ? L.m : Math.abs(L.m) < 1e-9 ? Infinity : -1 / L.m;
      if (isFinite(m2)) { const c2 = p.qy - m2 * p.qx; pl.fn(ctx, (x) => m2 * x + c2, t.c.violet, 2.8); label(ctx, eq(m2, c2), pl.X(p.qx) + 12, pl.Y(p.qy) + 22, { color: t.c.violet, size: 14, weight: 600, align: "left", halo: true, font: "Georgia, serif" }); }
      else { ctx.strokeStyle = t.c.violet; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(pl.X(p.qx), pl.y0); ctx.lineTo(pl.X(p.qx), pl.y0 + pl.h); ctx.stroke(); }
      handle(ctx, pl.X(p.qx), pl.Y(p.qy), t.c.violet);
    }
  }
  handle(ctx, pl.X(p.x1), pl.Y(p.y1), t.c.blue);
  handle(ctx, pl.X(p.x2), pl.Y(p.y2), t.c.blue);
  label(ctx, `A (${fmtN(p.x1)}, ${fmtN(p.y1)})`, pl.X(p.x1) - 12, pl.Y(p.y1) - 18, { color: t.ink, size: 12, weight: 600, align: "right", halo: true });
  label(ctx, `B (${fmtN(p.x2)}, ${fmtN(p.y2)})`, pl.X(p.x2) + 12, pl.Y(p.y2) - 18, { color: t.ink, size: 12, weight: 600, align: "left", halo: true });
  const text = L.vertical ? `x = ${fmtN(L.x)}` : eq(L.m, L.c);
  label(ctx, text, pl.x0 + 16, pl.y0 + pl.h - 22, { color: t.c.blue, size: 20, weight: 600, align: "left", halo: true, font: "Georgia, 'Times New Roman', serif" });
  return pl;
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  draw(ctx, w, h, { ...DEF }, t);
}

export default function Linear() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { x1: [-10, 10], y1: [-10, 10], x2: [-10, 10], y2: [-10, 10], qx: [-10, 10], qy: [-10, 10], extra: ["none", "parallel", "perpendicular"] });
  const plot = useRef<Plot | null>(null);
  const drag = useRef<"a" | "b" | "q" | null>(null);
  const L = line(p);
  const render = (ctx: Ctx, w: number, h: number) => { plot.current = draw(ctx, w, h, p, theme); };
  const onDown = (pt: { x: number; y: number }) => {
    const pl = plot.current;
    if (!pl) return false;
    const near = (x: number, y: number) => Math.hypot(pt.x - pl.X(x), pt.y - pl.Y(y)) < 26;
    drag.current = near(p.x1, p.y1) ? "a" : near(p.x2, p.y2) ? "b" : p.extra !== "none" && near(p.qx, p.qy) ? "q" : null;
    return !!drag.current;
  };
  const onMove = (pt: { x: number; y: number }, down: boolean) => {
    const pl = plot.current;
    if (!down || !drag.current || !pl) return;
    const r = (v: number) => Math.max(-10, Math.min(10, Math.round(v * 2) / 2));
    const x = r(pl.invX(pt.x)), y = r(pl.invY(pt.y));
    if (drag.current === "a") { if (x !== p.x2 || y !== p.y2) set({ x1: x, y1: y }); }
    else if (drag.current === "b") { if (x !== p.x1 || y !== p.y1) set({ x2: x, y2: y }); }
    else set({ qx: x, qy: y });
  };
  const onUp = () => { drag.current = null; };

  const is = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const challenges = [
    { id: "half", title: "Make y = −½x + 3", detail: "Gradient −½, crossing the y-axis at 3. Drag A and B.", done: !L.vertical && is(L.m, -0.5) && is(L.c, 3) },
    { id: "through", title: "Draw the line through (1, 2) and (4, 8)", detail: "Then read its equation. What do you notice about c?", done: !L.vertical && is(L.m, 2) && is(L.c, 0) },
    { id: "perp", title: "Make a line perpendicular to y = 2x + 1", detail: "Turn on the grey reference line. Gradients multiply to −1.", done: !L.vertical && is(L.m * 2, -1) },
    { id: "flat", title: "Make the horizontal line through (−3, 4)", detail: "What is its gradient?", done: !L.vertical && is(L.m, 0) && is(L.c, 4) },
  ];

  return (
    <SimShell
      id="linear"
      challenges={challenges}
      onReset={() => resetP()}
      record={() => ({ x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, m: L.vertical ? NaN : +L.m.toFixed(4), c: L.vertical ? NaN : +L.c.toFixed(4) })}
      ask={() => `Straight line through A(${p.x1}, ${p.y1}) and B(${p.x2}, ${p.y2}): ${L.vertical ? `x = ${p.x1} (vertical)` : `gradient ${fmtN(L.m, 3)}, ${eq(L.m, L.c)}`}.`}
      stage={<Stage label={L.vertical ? `Vertical line x = ${p.x1}` : `Line ${eq(L.m, L.c)}`} render={render} onDown={onDown} onMove={onMove} onUp={onUp} cursor="crosshair" />}
      overlay={
        <Readouts>
          <Readout label="gradient m" value={L.vertical ? "undefined" : `${frac(L.rise, L.run)}${Number.isInteger(L.m * 1) ? "" : ` ≈ ${fmtN(L.m, 3)}`}`} color={theme.c.orange} />
          <Readout label="y-intercept c" value={L.vertical ? "none" : fmtN(L.c, 3)} color={theme.c.green} />
          <Readout label="angle with x-axis" value={L.vertical ? "90" : fmtN((Math.atan(L.m) * 180) / Math.PI, 1)} unit="°" />
        </Readouts>
      }
      controls={
        <>
          <Group title="The line">
            <p className="text-[13px] leading-relaxed text-lp-soft">Drag points A and B. They snap to the nearest half square.</p>
            <Switch label="Rise and run triangle" checked={p.tri} onChange={(tri) => set({ tri })} />
            <Switch label="Reference line y = 2x + 1" checked={p.ref} onChange={(ref) => set({ ref })} />
          </Group>
          <Group title="Another line through a point">
            <Choice value={p.extra} onChange={(extra) => set({ extra })} options={[{ value: "none", label: "None" }, { value: "parallel", label: "Parallel" }, { value: "perpendicular", label: "Perpendicular" }]} />
            {p.extra !== "none" && <p className="text-[12px] text-lp-mute">Drag the purple point to move it.</p>}
          </Group>
        </>
      }
      learn={
        <>
          <H>Gradient</H>
          <Eq>m = rise ⁄ run = (y₂ − y₁) ⁄ (x₂ − x₁)</Eq>
          <p>How much y goes up for each 1 across. Positive slopes up to the right, negative slopes down, zero is flat, and a vertical line has no gradient (you'd divide by zero).</p>
          <H>Equation of a line</H>
          <Eq>y = mx + c</Eq>
          <p>c is where the line crosses the y-axis (x = 0). To find it from a point, substitute: c = y₁ − m·x₁.</p>
          <H>Parallel and perpendicular</H>
          <p>Parallel lines have the same gradient. Perpendicular lines have gradients that multiply to −1: m₂ = −1 ⁄ m₁ (flip and change the sign).</p>
          <Try>drag B so the line gets steeper and steeper. What happens to m as it nears vertical?</Try>
        </>
      }
    />
  );
}
