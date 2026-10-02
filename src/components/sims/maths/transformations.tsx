import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Slider, Choice, Switch } from "../kit/controls";
import { arrow, label, type Ctx, type Plot } from "../kit/draw";
import { coef, dot, fmtN, handle, paper, term } from "./paper";

// y = a·f(b(x − h)) + k for a family of parent functions, with key points
// mapped from the parent graph to the transformed one.

/** Brackets only when there is something inside to group */
const wrap = (s: string) => (s === "x" ? s : `(${s})`);
const BASES = {
  x2: { name: "x²", f: (x: number) => x * x, show: (s: string) => `${wrap(s)}²`, keys: [-2, -1, 0, 1, 2] },
  x3: { name: "x³", f: (x: number) => x * x * x, show: (s: string) => `${wrap(s)}³`, keys: [-1, 0, 1] },
  abs: { name: "|x|", f: (x: number) => Math.abs(x), show: (s: string) => `|${s}|`, keys: [-2, 0, 2] },
  sqrt: { name: "√x", f: (x: number) => (x >= 0 ? Math.sqrt(x) : NaN), show: (s: string) => (s === "x" ? "√x" : `√(${s})`), keys: [0, 1, 4] },
  recip: { name: "1/x", f: (x: number) => (Math.abs(x) < 1e-9 ? NaN : 1 / x), show: (s: string) => (s === "x" ? "1/x" : `1/(${s})`), keys: [-1, 1, 2] },
  sin: { name: "sin x", f: (x: number) => Math.sin(x), show: (s: string) => (s === "x" ? "sin x" : `sin(${s})`), keys: [0, Math.PI / 2, -Math.PI / 2] },
  exp: { name: "2ˣ", f: (x: number) => Math.pow(2, x), show: (s: string) => (s === "x" ? "2ˣ" : `2^(${s})`), keys: [0, 1, -1] },
} as const;
type Base = keyof typeof BASES;
type P = { base: Base; a: number; b: number; h: number; k: number; target: number };
const DEF: P = { base: "x2", a: 1, b: 1, h: 0, k: 0, target: 0 };

const TARGETS: (Omit<P, "target"> & { label: string })[] = [
  { label: "Target 1", base: "x2", a: -1, b: 1, h: 2, k: 3 },
  { label: "Target 2", base: "abs", a: 2, b: 1, h: -1, k: -4 },
  { label: "Target 3", base: "sin", a: 1, b: 2, h: 0, k: 1 },
  { label: "Target 4", base: "sqrt", a: -1, b: -1, h: 3, k: 2 },
];

const g = (p: Omit<P, "target">) => (x: number) => p.a * BASES[p.base].f(p.b * (x - p.h)) + p.k;
const inside = (p: Omit<P, "target">) => {
  const xh = p.h === 0 ? "x" : `x ${p.h > 0 ? "−" : "+"} ${fmtN(Math.abs(p.h))}`;
  if (p.b === 1) return xh;
  return p.h === 0 ? `${coef(p.b)}x` : `${coef(p.b)}(${xh})`;
};
export const equation = (p: Omit<P, "target">) => {
  const a = p.a === 1 ? "" : p.a === -1 ? "−" : fmtN(p.a);
  return `y = ${a}${BASES[p.base].show(inside(p))}${term(p.k)}`;
};
const same = (p: Omit<P, "target">, q: Omit<P, "target">) => p.base === q.base && [p.a - q.a, p.b - q.b, p.h - q.h, p.k - q.k].every((d) => Math.abs(d) < 0.051);

function draw(ctx: Ctx, w: number, h: number, p: P, t: SimTheme, o: { parent: boolean; keys: boolean; target: boolean }): Plot {
  const pl = paper(ctx, w, h, t, { cx: 0, cy: 0, span: 16 });
  const base = BASES[p.base];
  if (o.target && p.target > 0) {
    const tg = TARGETS[p.target - 1];
    ctx.globalAlpha = 0.45;
    pl.fn(ctx, g(tg), t.c.amber, 7);
    ctx.globalAlpha = 1;
    label(ctx, `${tg.label}: match this`, pl.x0 + pl.w - 12, pl.y0 + 20, { color: t.c.amber, size: 12, weight: 700, align: "right", halo: true });
  }
  if (o.parent) pl.fn(ctx, base.f, t.mute, 2, [6, 5]);
  pl.fn(ctx, g(p), t.c.blue, 3.2);
  // Key points: where each parent point lands
  if (o.keys) {
    for (const x0 of base.keys) {
      const y0 = base.f(x0);
      if (!isFinite(y0) || p.b === 0) continue;
      const x1 = x0 / p.b + p.h, y1 = p.a * y0 + p.k;
      if (o.parent) {
        arrow(ctx, pl.X(x0), pl.Y(y0), pl.X(x1), pl.Y(y1), t.c.violet, { width: 1.5, head: 8, dash: [4, 4] });
        dot(ctx, pl.X(x0), pl.Y(y0), t.mute, null, t);
      }
      dot(ctx, pl.X(x1), pl.Y(y1), t.c.blue, `(${fmtN(x1)}, ${fmtN(y1)})`, t, "right");
    }
  }
  // The anchor (h, k): where the parent's origin lands. Drag it to shift the graph
  handle(ctx, pl.X(p.h), pl.Y(p.k), t.c.pink);
  label(ctx, equation(p), pl.x0 + 14, pl.y0 + pl.h - 18, { color: t.ink, size: 17, weight: 600, align: "left", halo: true, font: "Georgia, 'Times New Roman', serif" });
  return pl;
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  draw(ctx, w, h, { ...DEF, a: -1, h: 1, k: 2 }, t, { parent: true, keys: false, target: false });
}

export default function Transformations() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { base: Object.keys(BASES), a: [-4, 4], b: [-4, 4], h: [-6, 6], k: [-6, 6], target: [0, TARGETS.length] });
  const [show, setShow] = useState({ parent: true, keys: true });
  const plot = useRef<Plot | null>(null);
  const drag = useRef(false);
  const render = (ctx: Ctx, w: number, h: number) => { plot.current = draw(ctx, w, h, p, theme, { ...show, target: true }); };
  const onDown = (pt: { x: number; y: number }) => {
    const pl = plot.current;
    if (pl && Math.hypot(pt.x - pl.X(p.h), pt.y - pl.Y(p.k)) < 28) { drag.current = true; return true; }
    return false;
  };
  const onMove = (pt: { x: number; y: number }, down: boolean) => {
    const pl = plot.current;
    if (!down || !drag.current || !pl) return;
    const r = (v: number) => Math.round(v * 2) / 2;
    set({ h: Math.max(-6, Math.min(6, r(pl.invX(pt.x)))), k: Math.max(-6, Math.min(6, r(pl.invY(pt.y)))) });
  };
  const onUp = () => { drag.current = false; };

  const tg = p.target ? TARGETS[p.target - 1] : null;
  const challenges = TARGETS.map((x, i) => ({ id: `t${i + 1}`, title: `Match ${x.label}`, detail: `Choose the target in Controls, then transform the graph onto it.`, done: same(p, x) }));
  const b = p.b === 0 ? 0.1 : p.b;

  return (
    <SimShell
      id="transformations"
      challenges={challenges}
      onReset={() => resetP()}
      ask={() => `I'm transforming y = ${BASES[p.base].name} into ${equation(p)} (a = ${p.a}, b = ${p.b}, h = ${p.h}, k = ${p.k}).${tg ? ` I'm trying to match a target graph.` : ""}`}
      stage={<Stage label={`Graph of ${equation(p)}`} render={render} onDown={onDown} onMove={onMove} onUp={onUp} cursor="crosshair" />}
      controls={
        <>
          <Group title="Parent function">
            <Choice value={p.base} onChange={(base) => set({ base })} options={(Object.keys(BASES) as Base[]).map((k) => ({ value: k, label: BASES[k].name }))} wrap />
          </Group>
          <Group title="y = a · f(b(x − h)) + k">
            <Slider label="a: vertical stretch" value={p.a} min={-4} max={4} step={0.1} color={theme.c.blue} onChange={(a) => set({ a })} hint="Negative reflects in the x-axis." />
            <Slider label="b: horizontal stretch" value={b} min={-4} max={4} step={0.1} color={theme.c.violet} onChange={(v) => set({ b: Math.abs(v) < 0.05 ? 0.1 : v })} hint="Factor 1/b. Negative reflects in the y-axis." />
            <Slider label="h: shift right" value={p.h} min={-6} max={6} step={0.1} color={theme.c.pink} onChange={(h) => set({ h })} />
            <Slider label="k: shift up" value={p.k} min={-6} max={6} step={0.1} color={theme.c.pink} onChange={(k) => set({ k })} hint="Or drag the pink point." />
          </Group>
          <Group title="Practise">
            <Choice value={String(p.target)} onChange={(v) => set({ target: Number(v) })} options={[{ value: "0", label: "Free" }, ...TARGETS.map((x, i) => ({ value: String(i + 1), label: x.label.replace("Target ", "T") }))]} />
            <Switch label="Parent graph" checked={show.parent} onChange={(parent) => setShow({ ...show, parent })} />
            <Switch label="Key points and where they move" checked={show.keys} onChange={(keys) => setShow({ ...show, keys })} />
          </Group>
        </>
      }
      learn={
        <>
          <H>Four moves</H>
          <Eq>y = a · f(b(x − h)) + k</Eq>
          <p><b>k</b> moves the graph up by k. <b>h</b> moves it right by h (the sign looks backwards because it's inside the bracket: x − 3 shifts right 3).</p>
          <p><b>a</b> stretches vertically by a factor of a; if a is negative it also reflects in the x-axis. <b>b</b> squashes horizontally by a factor of 1/b; if b is negative it reflects in the y-axis.</p>
          <H>Follow a point</H>
          <p>The parent point (x, y) moves to (x ⁄ b + h, a·y + k). The purple arrows show this for the key points.</p>
          <H>Order matters</H>
          <p>Inside the bracket (horizontal changes) acts on x before f; outside (vertical changes) acts on the output after f. Do the stretches before the shifts.</p>
          <Try>for y = sin x, compare b = 2 with a = 2. One changes the period, the other the amplitude. Which is which?</Try>
        </>
      }
    />
  );
}
