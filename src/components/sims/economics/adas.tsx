import React, { useRef } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Btn } from "../kit/controls";
import { Plot, label, fmt, type Ctx } from "../kit/draw";

// Aggregate demand and aggregate supply. Demand shocks and policy shift AD;
// costs shift SRAS; productivity shifts LRAS. Neoclassical or Keynesian supply.

type P = { conf: number; rate: number; gov: number; tax: number; nx: number; cost: number; pot: number; model: "neo" | "keynes" };
const DEF: P = { conf: 0, rate: 4, gov: 0, tax: 0, nx: 0, cost: 0, pot: 0, model: "neo" };
const YF0 = 1000, A_SLOPE = 8, C_SLOPE = 0.05;

/** Total spending shift (in $bn of real GDP) from the demand-side settings */
export const adShift = (p: P) => p.conf + -25 * (p.rate - 4) + p.gov - 1.2 * p.tax + p.nx;
const Yf = (p: P) => YF0 + p.pot;
const adP = (p: P, Y: number, shift = adShift(p)) => 100 + (YF0 + shift - Y) / A_SLOPE;
/** Short-run aggregate supply (price level at each output) */
const asP = (p: P, Y: number, cost = p.cost) => {
  const yf = Yf(p);
  if (p.model === "neo") return 100 + cost + C_SLOPE * (Y - yf);
  // Keynesian: flat with spare capacity, rising as output nears full employment, vertical at it
  const y1 = yf - 250;
  if (Y <= y1) return 92 + cost;
  if (Y >= yf - 0.5) return Infinity;
  return 92 + cost + 3 * ((Y - y1) / (yf - Y));
};
export function equilibrium(p: P, shift = adShift(p), cost = p.cost) {
  let lo = Yf(p) - 700, hi = Yf(p) + (p.model === "neo" ? 700 : -0.6);
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (adP(p, m, shift) > asP(p, m, cost)) lo = m; else hi = m; }
  const Y = (lo + hi) / 2;
  return { Y, P: adP(p, Y, shift) };
}

function draw(ctx: Ctx, w: number, h: number, p: P, a: { shift: number; cost: number }, t: SimTheme) {
  ctx.fillStyle = t.dark ? "#08101f" : "#fbfcfe"; ctx.fillRect(0, 0, w, h);
  const pl = new Plot(70, 84, w - 110, h - 140, 600, 1400, 70, 140);
  pl.axes(ctx, t, { xLabel: "real GDP ($ billion)", yLabel: "average price level (index)", xTicks: 8, yTicks: 7 });
  const e = equilibrium(p, a.shift, a.cost);
  const yf = Yf(p);
  // Output gap
  if (Math.abs(e.Y - yf) > 2) {
    ctx.fillStyle = e.Y < yf ? (t.dark ? "rgba(248,113,113,0.14)" : "rgba(220,38,38,0.08)") : (t.dark ? "rgba(251,191,36,0.14)" : "rgba(180,83,9,0.08)");
    ctx.fillRect(pl.X(Math.min(e.Y, yf)), pl.y0, Math.abs(pl.X(yf) - pl.X(e.Y)), pl.h);
    label(ctx, e.Y < yf ? "recessionary gap" : "inflationary gap", pl.X((e.Y + yf) / 2), pl.y0 + 16, { color: e.Y < yf ? t.c.red : t.c.amber, size: 12, weight: 700, halo: true });
  }
  // Starting curves for comparison
  const start = { ...p, conf: 0, rate: 4, gov: 0, tax: 0, nx: 0, cost: 0, pot: 0 };
  if (Math.abs(a.shift) > 1) pl.fn(ctx, (Y) => adP(start, Y, 0), t.c.blue, 1.5, [5, 5]);
  if (Math.abs(a.cost) > 0.2 || p.pot) pl.fn(ctx, (Y) => asP(start, Y, 0), t.c.orange, 1.5, [5, 5]);
  pl.fn(ctx, (Y) => adP(p, Y, a.shift), t.c.blue, 3.2);
  pl.fn(ctx, (Y) => asP(p, Y, a.cost), t.c.orange, 3.2);
  ctx.strokeStyle = t.c.green; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(pl.X(yf), pl.y0); ctx.lineTo(pl.X(yf), pl.y0 + pl.h); ctx.stroke();
  label(ctx, "LRAS", pl.X(yf) + 6, pl.y0 + 40, { color: t.c.green, size: 13, weight: 800, align: "left", halo: true });
  label(ctx, "AD", pl.X(1330), pl.Y(adP(p, 1330, a.shift)) - 14, { color: t.c.blue, size: 13, weight: 800, halo: true });
  label(ctx, p.model === "neo" ? "SRAS" : "AS", pl.X(p.model === "neo" ? 1330 : 700), pl.Y(Math.min(136, asP(p, p.model === "neo" ? 1330 : 700, a.cost))) - 14, { color: t.c.orange, size: 13, weight: 800, halo: true });
  // Equilibrium
  ctx.strokeStyle = t.mute; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(pl.X(e.Y), pl.Y(70)); ctx.lineTo(pl.X(e.Y), pl.Y(e.P)); ctx.lineTo(pl.x0, pl.Y(e.P)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = t.ink; ctx.beginPath(); ctx.arc(pl.X(e.Y), pl.Y(e.P), 7, 0, Math.PI * 2); ctx.fill();
  label(ctx, fmt(e.P, 1), pl.x0 - 8, pl.Y(e.P), { color: t.ink, size: 11.5, weight: 700, align: "right", halo: true });
  label(ctx, fmt(e.Y, 0), pl.X(e.Y), pl.Y(70) + 26, { color: t.ink, size: 11.5, weight: 700, halo: true });
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const p = { ...DEF, conf: -80 };
  draw(ctx, w * 1.15, h * 1.2, p, { shift: adShift(p), cost: 0 }, t);
}

export default function Adas() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { conf: [-150, 150], rate: [0, 10], gov: [-150, 150], tax: [-60, 60], nx: [-100, 100], cost: [-15, 20], pot: [-100, 250], model: ["neo", "keynes"] });
  const anim = useRef({ shift: adShift(p), cost: p.cost });
  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const k = Math.min(1, dt * 5);
    anim.current.shift += (adShift(p) - anim.current.shift) * k;
    anim.current.cost += (p.cost - anim.current.cost) * k;
    draw(ctx, w, h, p, anim.current, theme);
  };
  const e = equilibrium(p);
  const gap = ((e.Y - Yf(p)) / Yf(p)) * 100;
  const unemp = Math.max(0.5, 5 - 0.5 * gap);
  // Wages and prices adjust in the long run (neoclassical): SRAS shifts until output = potential
  const selfCorrect = () => set({ cost: +Math.max(-15, Math.min(20, (YF0 + adShift(p) - Yf(p)) / A_SLOPE)).toFixed(2) });

  const challenges = [
    { id: "rec", title: "Create a recessionary gap of 5% or more", detail: "Which parts of aggregate demand could fall?", done: gap <= -5 },
    { id: "fiscal", title: "With consumer confidence at −80 or lower, close the gap with government spending", detail: "Output within 0.5% of potential. Leave the interest rate at 4%.", done: p.conf <= -80 && p.rate === 4 && p.gov > 0 && Math.abs(gap) < 0.5 },
    { id: "cost", title: "Cause cost-push inflation: prices up and output down", detail: "Leave demand alone.", done: adShift(p) === 0 && p.cost > 0 && e.P > 100.5 && gap < -0.5 },
    { id: "grow", title: "Grow without inflation: potential output up by 100 or more, price level within 1 of 100, no gap", detail: "Supply-side growth plus enough demand to use it.", done: p.pot >= 100 && Math.abs(e.P - 100) < 1 && Math.abs(gap) < 1 },
  ];

  return (
    <SimShell
      id="adas"
      challenges={challenges}
      onReset={() => resetP()}
      record={() => ({ "AD shift ($bn)": +adShift(p).toFixed(1), "cost shock": p.cost, "potential ($bn)": Yf(p), "real GDP ($bn)": +e.Y.toFixed(1), "price level": +e.P.toFixed(2), "output gap (%)": +gap.toFixed(2) })}
      ask={() => `AD/AS model (${p.model === "neo" ? "neoclassical" : "Keynesian"}): consumer confidence ${p.conf}, interest rate ${p.rate}%, government spending change ${p.gov}, tax change ${p.tax}, net exports change ${p.nx}, cost shock ${p.cost}, potential output ${Yf(p)}. Equilibrium real GDP $${fmt(e.Y, 0)}bn, price level ${fmt(e.P, 1)}, output gap ${fmt(gap, 1)}%.`}
      stage={<Stage label="AD/AS diagram" render={render} />}
      overlay={
        <Readouts>
          <Readout label="real GDP" value={`$${fmt(e.Y, 0)}bn`} />
          <Readout label="price level" value={fmt(e.P, 1)} />
          <Readout label="output gap" value={`${gap >= 0 ? "+" : ""}${fmt(gap, 1)}%`} color={Math.abs(gap) < 0.5 ? theme.c.green : gap < 0 ? theme.c.red : theme.c.amber} />
          <Readout label="unemployment (rough)" value={`${fmt(unemp, 1)}%`} />
        </Readouts>
      }
      controls={
        <>
          <Group title="Supply model">
            <Choice value={p.model} onChange={(model) => set({ model })} options={[{ value: "neo", label: "Neoclassical" }, { value: "keynes", label: "Keynesian" }]} />
          </Group>
          <Group title="Aggregate demand: C + I + G + (X − M)">
            <Slider label="Consumer confidence" value={p.conf} min={-150} max={150} step={5} color={theme.c.blue} onChange={(conf) => set({ conf })} />
            <Slider label="Interest rate (monetary policy)" value={p.rate} min={0} max={10} step={0.25} unit="%" color={theme.c.blue} onChange={(rate) => set({ rate })} hint="Lower rates encourage borrowing for investment and spending." />
            <Slider label="Government spending change" value={p.gov} min={-150} max={150} step={5} unit="bn" color={theme.c.blue} onChange={(gov) => set({ gov })} />
            <Slider label="Income tax change" value={p.tax} min={-60} max={60} step={5} unit="bn" color={theme.c.blue} onChange={(tax) => set({ tax })} />
            <Slider label="Net exports change" value={p.nx} min={-100} max={100} step={5} unit="bn" color={theme.c.blue} onChange={(nx) => set({ nx })} />
          </Group>
          <Group title="Supply">
            <Slider label="Costs of production (oil, wages)" value={p.cost} min={-15} max={20} step={0.5} color={theme.c.orange} onChange={(cost) => set({ cost })} />
            <Slider label="Potential output (productivity)" value={p.pot} min={-100} max={250} step={10} unit="bn" color={theme.c.green} onChange={(pot) => set({ pot })} />
            {p.model === "neo" && <Btn onClick={selfCorrect}>Let wages adjust (long run)</Btn>}
          </Group>
        </>
      }
      learn={
        <>
          <H>Aggregate demand</H>
          <Eq>AD = C + I + G + (X − M)</Eq>
          <p>Total planned spending on an economy's output at each price level. It slopes down: a higher price level makes exports dearer, reduces the real value of savings, and pushes up interest rates. Changes in any component (confidence, interest rates, government spending, taxes, exchange rates) shift it.</p>
          <H>Aggregate supply</H>
          <p>In the short run (SRAS), firms supply more at higher prices because some costs, like wages, are fixed for a while. Higher costs of production shift SRAS up (left). LRAS is vertical at potential output: what the economy can make with all its resources fully used. More or better resources shift it right.</p>
          <p>The Keynesian view has a flat section when there is lots of spare capacity (more demand raises output, not prices) that becomes steep near full employment.</p>
          <H>Gaps and policy</H>
          <p>Below potential is a recessionary (deflationary) gap with high unemployment; above it is an inflationary gap. Governments can use fiscal policy (spending, taxes) and central banks monetary policy (interest rates) to shift AD. Neoclassical economists argue that wages and prices adjust in the long run, closing gaps by themselves.</p>
          <Try>in the Keynesian model, raise government spending when output is very low, then again near full employment. Compare what happens to prices each time.</Try>
        </>
      }
    />
  );
}
