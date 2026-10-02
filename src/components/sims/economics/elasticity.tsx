import React from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider } from "../kit/controls";
import { Plot, label, fmt, type Ctx } from "../kit/draw";

// Price elasticity of demand along a straight-line demand curve, and what a
// price change does to total revenue.

type P = { top: number; m: number; p1: number; p2: number };
const DEF: P = { top: 20, m: 0.1, p1: 14, p2: 16 };

export const calc = (p: P) => {
  const q = (pr: number) => Math.max(0, (p.top - pr) / p.m);
  const q1 = q(p.p1), q2 = q(p.p2);
  const mid = ((q2 - q1) / ((q1 + q2) / 2)) / ((p.p2 - p.p1) / ((p.p1 + p.p2) / 2));
  const point = q1 > 0 ? -(1 / p.m) * (p.p1 / q1) : -Infinity;
  return { q1, q2, tr1: p.p1 * q1, tr2: p.p2 * q2, mid, point };
};
const kind = (e: number) => (!isFinite(e) ? "–" : Math.abs(Math.abs(e) - 1) < 0.02 ? "unit elastic" : Math.abs(e) > 1 ? "elastic" : "inelastic");

function draw(ctx: Ctx, w: number, h: number, p: P, t: SimTheme) {
  ctx.fillStyle = t.dark ? "#08101f" : "#fbfcfe"; ctx.fillRect(0, 0, w, h);
  const c = calc(p);
  const qmax = p.top / p.m;
  const top = 84, split = (h - top) * 0.62;
  const pl = new Plot(64, top, w - 100, split - 50, 0, qmax * 1.05, 0, p.top * 1.08);
  pl.axes(ctx, t, { xLabel: "quantity", yLabel: "price ($)", xTicks: 6, yTicks: 5 });
  // Revenue rectangles: kept, gained and lost
  const [lo, hi] = p.p2 >= p.p1 ? [p.p1, p.p2] : [p.p2, p.p1];
  const qHi = p.p2 >= p.p1 ? c.q2 : c.q1, qLo = p.p2 >= p.p1 ? c.q1 : c.q2;
  ctx.fillStyle = t.dark ? "rgba(148,163,184,0.18)" : "rgba(71,85,105,0.12)";
  ctx.fillRect(pl.X(0), pl.Y(lo), pl.X(qHi) - pl.X(0), pl.Y(0) - pl.Y(lo));
  const priceGain = p.p2 >= p.p1;
  ctx.fillStyle = priceGain ? (t.dark ? "rgba(52,211,153,0.45)" : "rgba(5,150,105,0.3)") : (t.dark ? "rgba(248,113,113,0.45)" : "rgba(220,38,38,0.28)");
  ctx.fillRect(pl.X(0), pl.Y(hi), pl.X(qHi) - pl.X(0), pl.Y(lo) - pl.Y(hi));
  ctx.fillStyle = priceGain ? (t.dark ? "rgba(248,113,113,0.45)" : "rgba(220,38,38,0.28)") : (t.dark ? "rgba(52,211,153,0.45)" : "rgba(5,150,105,0.3)");
  ctx.fillRect(pl.X(qHi), pl.Y(lo), pl.X(qLo) - pl.X(qHi), pl.Y(0) - pl.Y(lo));
  label(ctx, priceGain ? "gained: higher price on units still sold" : "lost: lower price on units already sold", pl.X(qHi / 2), pl.Y((lo + hi) / 2), { color: priceGain ? t.c.green : t.c.red, size: 11, weight: 700, halo: true });
  if (Math.abs(qLo - qHi) > qmax * 0.06) label(ctx, priceGain ? "lost sales" : "extra sales", pl.X((qLo + qHi) / 2), pl.Y(lo / 2), { color: priceGain ? t.c.red : t.c.green, size: 11, weight: 700, halo: true });
  // Elastic / inelastic halves of the line
  pl.fn(ctx, (q) => (q <= qmax / 2 ? p.top - p.m * q : NaN), t.c.violet, 3.4);
  pl.fn(ctx, (q) => (q >= qmax / 2 ? p.top - p.m * q : NaN), t.c.cyan, 3.4);
  label(ctx, "elastic (|PED| > 1)", pl.X(qmax * 0.2) + 8, pl.Y(p.top - p.m * qmax * 0.2) - 16, { color: t.c.violet, size: 11.5, weight: 700, align: "left", halo: true });
  label(ctx, "inelastic (|PED| < 1)", pl.X(qmax * 0.8) + 8, pl.Y(p.top - p.m * qmax * 0.8) - 16, { color: t.c.cyan, size: 11.5, weight: 700, align: "left", halo: true });
  ctx.fillStyle = t.ink; ctx.beginPath(); ctx.arc(pl.X(qmax / 2), pl.Y(p.top / 2), 4, 0, Math.PI * 2); ctx.fill();
  label(ctx, "unit elastic", pl.X(qmax / 2) + 8, pl.Y(p.top / 2) + 4, { color: t.soft, size: 10.5, align: "left", halo: true });
  for (const [pr, q, col, nm] of [[p.p1, c.q1, t.c.blue, "A"], [p.p2, c.q2, t.c.orange, "B"]] as const) {
    ctx.strokeStyle = col; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(pl.x0, pl.Y(pr)); ctx.lineTo(pl.X(q), pl.Y(pr)); ctx.lineTo(pl.X(q), pl.Y(0)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(pl.X(q), pl.Y(pr), 7, 0, Math.PI * 2); ctx.fill();
    label(ctx, nm, pl.X(q) + 12, pl.Y(pr) - 10, { color: col, size: 13, weight: 800, halo: true });
  }
  // Total revenue against quantity
  const tp = new Plot(64, split + 14, w - 100, h - split - 50, 0, qmax * 1.05, 0, (p.top * qmax) / 4 * 1.15);
  tp.axes(ctx, t, { xLabel: "quantity", yLabel: "total revenue ($)", xTicks: 6, yTicks: 3 });
  tp.fn(ctx, (q) => (p.top - p.m * q) * q, t.c.green, 3);
  for (const [q, tr, col] of [[c.q1, c.tr1, t.c.blue], [c.q2, c.tr2, t.c.orange]] as const) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(tp.X(q), tp.Y(tr), 6, 0, Math.PI * 2); ctx.fill(); }
  label(ctx, "TR is greatest where |PED| = 1", tp.X(qmax / 2), tp.y0 + 8, { color: t.c.green, size: 11, weight: 600, halo: true });
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  draw(ctx, w * 1.15, h * 1.3, DEF, t);
}

export default function Elasticity() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { top: [10, 30], m: [0.04, 0.4], p1: [0.5, 30], p2: [0.5, 30] });
  const c = calc(p);
  const dTR = c.tr2 - c.tr1;
  const challenges = [
    { id: "up", title: "Find a price rise that increases total revenue", detail: "Where on the line must you be?", done: p.p2 > p.p1 && dTR > 0.5 },
    { id: "down", title: "Find a price cut that increases total revenue", detail: "And where must you be now?", done: p.p2 < p.p1 && dTR > 0.5 },
    { id: "max", title: "Set price A where total revenue is as large as possible", detail: "Watch the green curve.", done: Math.abs(p.p1 - p.top / 2) < 0.06 },
    { id: "unit", title: "Make the midpoint PED between −1.02 and −0.98", detail: "Choose two prices either side of the middle.", done: Math.abs(c.mid + 1) <= 0.02 && Math.abs(p.p2 - p.p1) > 0.5 },
  ];
  return (
    <SimShell
      id="elasticity"
      challenges={challenges}
      onReset={() => resetP()}
      record={() => ({ "P₁": p.p1, "Q₁": +c.q1.toFixed(2), "P₂": p.p2, "Q₂": +c.q2.toFixed(2), "PED (midpoint)": +c.mid.toFixed(4), "TR₁": +c.tr1.toFixed(2), "TR₂": +c.tr2.toFixed(2) })}
      ask={() => `Demand P = ${p.top} − ${p.m}Q. Price changes from $${p.p1} (Q = ${fmt(c.q1, 1)}) to $${p.p2} (Q = ${fmt(c.q2, 1)}). Midpoint PED ${fmt(c.mid, 3)} (${kind(c.mid)}); total revenue goes from $${fmt(c.tr1, 1)} to $${fmt(c.tr2, 1)}.`}
      stage={<Stage label="Demand curve with total revenue" render={(ctx, w, h) => draw(ctx, w, h, p, theme)} />}
      overlay={
        <Readouts>
          <Readout label="PED (midpoint)" value={isFinite(c.mid) ? fmt(c.mid, 3) : "–"} color={theme.c.violet} />
          <Readout label="so demand is" value={kind(c.mid)} />
          <Readout label="change in TR" value={`${dTR >= 0 ? "+" : "−"}$${fmt(Math.abs(dTR), 1)}`} color={dTR >= 0 ? theme.c.green : theme.c.red} />
        </Readouts>
      }
      controls={
        <>
          <Group title="Price change">
            <Slider label="Price A (before)" value={p.p1} min={0.5} max={Math.max(1, p.top - 0.5)} step={0.1} unit="$" color={theme.c.blue} onChange={(p1) => set({ p1 })} />
            <Slider label="Price B (after)" value={p.p2} min={0.5} max={Math.max(1, p.top - 0.5)} step={0.1} unit="$" color={theme.c.orange} onChange={(p2) => set({ p2 })} />
          </Group>
          <Group title="Demand curve P = a − bQ">
            <Slider label="Highest price a" value={p.top} min={10} max={30} step={1} unit="$" onChange={(top) => set({ top, p1: Math.min(p.p1, top - 0.5), p2: Math.min(p.p2, top - 0.5) })} />
            <Slider label="Steepness b" value={p.m} min={0.04} max={0.4} step={0.01} onChange={(m) => set({ m })} hint="Steepness changes the quantities, but not which half is elastic. Elasticity isn't the same as slope." />
          </Group>
        </>
      }
      learn={
        <>
          <H>How much does quantity respond to price?</H>
          <Eq>PED = % change in quantity demanded ⁄ % change in price</Eq>
          <p>PED is negative for normal demand (price up, quantity down). Economists usually talk about its size: above 1 is elastic (quantity changes proportionally more than price), below 1 is inelastic.</p>
          <p>Using the midpoint (average) as the base for each percentage gives the same answer whichever way the price moves.</p>
          <H>Elasticity changes along a straight line</H>
          <p>At high prices and low quantities, a $1 change is a small percentage of the price but a big percentage of the quantity: elastic. Lower down it's the other way round. Exactly halfway, |PED| = 1.</p>
          <H>Total revenue</H>
          <Eq>TR = price × quantity</Eq>
          <p>If demand is elastic, cutting the price raises revenue. If it is inelastic, raising the price raises revenue. That's why firms selling necessities with few substitutes (petrol, medicines) can raise prices more easily.</p>
          <Try>predict whether a 10% price rise raises or lowers revenue at A = $15, then at A = $5.</Try>
        </>
      }
    />
  );
}
