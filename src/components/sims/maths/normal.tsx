import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Switch, Btn } from "../kit/controls";
import { Plot, gauss, label, fmt, type Ctx } from "../kit/draw";
import { handle } from "./paper";

// The normal distribution: probability as area under the curve, z-scores,
// the 68–95–99.7 rule, and random samples drawn from it.

const CONTEXTS = {
  z: { name: "Standard (z)", mu: 0, sd: 1, unit: "" },
  heights: { name: "Heights", mu: 165, sd: 8, unit: "cm" },
  iq: { name: "IQ scores", mu: 100, sd: 15, unit: "" },
  marks: { name: "Exam marks", mu: 60, sd: 12, unit: "%" },
} as const;
type Ctxt = keyof typeof CONTEXTS;
type Mode = "between" | "below" | "above";
type P = { ctx: Ctxt; mode: Mode; a: number; b: number; rule: boolean };
const DEF: P = { ctx: "heights", mode: "between", a: 155, b: 175, rule: false };

/** erf, Abramowitz & Stegun 7.1.26 (error < 1.5×10⁻⁷) */
const erf = (x: number) => {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
};
export const Phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
const pdf = (x: number, mu: number, sd: number) => Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));

const prob = (p: P) => {
  const { mu, sd } = CONTEXTS[p.ctx];
  const za = (p.a - mu) / sd, zb = (p.b - mu) / sd;
  return p.mode === "below" ? Phi(zb) : p.mode === "above" ? 1 - Phi(za) : Math.max(0, Phi(zb) - Phi(za));
};

type S = { xs: number[] };

function draw(ctx: Ctx, w: number, h: number, p: P, s: S, t: SimTheme): Plot {
  ctx.fillStyle = t.dark ? "#08101f" : "#fbfcfe"; ctx.fillRect(0, 0, w, h);
  const { mu, sd, unit } = CONTEXTS[p.ctx];
  const peak = pdf(mu, mu, sd);
  const pl = new Plot(40, 70, w - 70, h - 150, mu - 4 * sd, mu + 4 * sd, 0, peak * 1.25);
  // Sample histogram behind the curve
  if (s.xs.length) {
    const bins = 32, bw = (8 * sd) / bins, counts = new Array(bins).fill(0);
    for (const x of s.xs) { const k = Math.floor((x - (mu - 4 * sd)) / bw); if (k >= 0 && k < bins) counts[k]++; }
    ctx.fillStyle = t.dark ? "rgba(148,163,184,0.25)" : "rgba(71,85,105,0.18)";
    counts.forEach((c, k) => { const d = c / (s.xs.length * bw); const x0 = pl.X(mu - 4 * sd + k * bw); ctx.fillRect(x0 + 1, pl.Y(d), pl.X(mu - 4 * sd + (k + 1) * bw) - x0 - 2, pl.Y(0) - pl.Y(d)); });
  }
  // 68–95–99.7 bands
  if (p.rule) {
    [[3, "rgba(167,139,250,0.10)"], [2, "rgba(167,139,250,0.16)"], [1, "rgba(167,139,250,0.24)"]].forEach(([k, col]) => {
      ctx.fillStyle = col as string;
      ctx.beginPath(); ctx.moveTo(pl.X(mu - (k as number) * sd), pl.Y(0));
      for (let i = 0; i <= 80; i++) { const x = mu - (k as number) * sd + (i / 80) * 2 * (k as number) * sd; ctx.lineTo(pl.X(x), pl.Y(pdf(x, mu, sd))); }
      ctx.lineTo(pl.X(mu + (k as number) * sd), pl.Y(0)); ctx.closePath(); ctx.fill();
    });
    [["68%", 0.55], ["95%", 0.2], ["99.7%", 0.05]].forEach(([txt, yy], i) => label(ctx, txt as string, pl.X(mu), pl.Y(peak * (yy as number)) + 4 - i * 0, { color: t.c.violet, size: 11.5, weight: 700, halo: true }));
  }
  // Shaded probability
  const lo = p.mode === "below" ? mu - 4.5 * sd : p.a, hi = p.mode === "above" ? mu + 4.5 * sd : p.b;
  if (hi > lo) {
    const g = ctx.createLinearGradient(0, pl.y0, 0, pl.Y(0));
    g.addColorStop(0, t.dark ? "rgba(96,165,250,0.75)" : "rgba(37,99,235,0.55)"); g.addColorStop(1, t.dark ? "rgba(96,165,250,0.25)" : "rgba(37,99,235,0.15)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(pl.X(Math.max(lo, pl.xmin)), pl.Y(0));
    for (let i = 0; i <= 160; i++) { const x = Math.max(lo, pl.xmin) + (i / 160) * (Math.min(hi, pl.xmax) - Math.max(lo, pl.xmin)); ctx.lineTo(pl.X(x), pl.Y(pdf(x, mu, sd))); }
    ctx.lineTo(pl.X(Math.min(hi, pl.xmax)), pl.Y(0)); ctx.closePath(); ctx.fill();
  }
  pl.fn(ctx, (x) => pdf(x, mu, sd), t.c.blue, 3);
  // Axis with values and z-scores
  ctx.strokeStyle = t.axis; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pl.x0, pl.Y(0)); ctx.lineTo(pl.x0 + pl.w, pl.Y(0)); ctx.stroke();
  for (let k = -3; k <= 3; k++) {
    const x = mu + k * sd;
    ctx.strokeStyle = t.axis; ctx.beginPath(); ctx.moveTo(pl.X(x), pl.Y(0)); ctx.lineTo(pl.X(x), pl.Y(0) + 6); ctx.stroke();
    label(ctx, `${fmt(x, 2)}${unit}`, pl.X(x), pl.Y(0) + 17, { color: t.soft, size: 11.5 });
    label(ctx, k === 0 ? "z = 0" : `${k > 0 ? "+" : "−"}${Math.abs(k)}σ`, pl.X(x), pl.Y(0) + 33, { color: t.mute, size: 10.5 });
  }
  // Draggable bounds
  const bound = (x: number, txt: string) => {
    ctx.strokeStyle = t.c.amber; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(pl.X(x), pl.Y(0)); ctx.lineTo(pl.X(x), pl.y0 - 4); ctx.stroke(); ctx.setLineDash([]);
    handle(ctx, pl.X(x), pl.y0 - 12, t.c.amber);
    label(ctx, txt, pl.X(x), pl.y0 - 34, { color: t.c.amber, size: 12, weight: 700, halo: true });
  };
  if (p.mode !== "below") bound(p.a, `${fmt(p.a, 2)} (z = ${fmt((p.a - mu) / sd, 2)})`);
  if (p.mode !== "above") bound(p.b, `${fmt(p.b, 2)} (z = ${fmt((p.b - mu) / sd, 2)})`);
  const pr = prob(p);
  label(ctx, `P = ${pr.toFixed(4)}`, pl.X(p.mode === "below" ? p.b - sd * 0.8 : p.mode === "above" ? p.a + sd * 0.8 : (p.a + p.b) / 2), pl.Y(peak * 0.35), { color: t.ink, size: 16, weight: 700, halo: true });
  return pl;
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  draw(ctx, w, h * 1.1, { ...DEF, rule: false }, { xs: [] }, t);
}

export default function Normal() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { ctx: Object.keys(CONTEXTS), mode: ["between", "below", "above"] });
  const sim = useRef<S>({ xs: [] });
  const plot = useRef<Plot | null>(null);
  const drag = useRef<"a" | "b" | null>(null);
  const { mu, sd, unit } = CONTEXTS[p.ctx];
  const render = (ctx: Ctx, w: number, h: number) => { plot.current = draw(ctx, w, h, p, sim.current, theme); };
  const onDown = (pt: { x: number; y: number }) => {
    const pl = plot.current;
    if (!pl) return false;
    const da = Math.abs(pt.x - pl.X(p.a)), db = Math.abs(pt.x - pl.X(p.b));
    if (pt.y > pl.y0 + pl.h + 10) return false;
    drag.current = p.mode === "below" ? (db < 30 ? "b" : null) : p.mode === "above" ? (da < 30 ? "a" : null) : da < db ? (da < 30 ? "a" : null) : db < 30 ? "b" : null;
    return !!drag.current;
  };
  const onMove = (pt: { x: number; y: number }, down: boolean) => {
    const pl = plot.current;
    if (!down || !drag.current || !pl) return;
    const step = sd / 20;
    const v = Math.round(pl.invX(pt.x) / step) * step;
    const x = +Math.max(mu - 4 * sd, Math.min(mu + 4 * sd, v)).toFixed(4);
    if (drag.current === "a") set({ a: Math.min(x, p.mode === "between" ? p.b : x) }); else set({ b: Math.max(x, p.mode === "between" ? p.a : x) });
  };
  const onUp = () => { drag.current = null; };
  const sample = (n: number) => { for (let i = 0; i < n; i++) sim.current.xs.push(mu + gauss() * sd); };
  const live = useLive(() => {
    const xs = sim.current.xs;
    const n = xs.length;
    const m = n ? xs.reduce((a, b) => a + b, 0) / n : NaN;
    const sdev = n > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) : NaN;
    return { n, m, sdev };
  }, 5);
  const pr = prob(p);

  const switchCtx = (c: Ctxt) => { const q = CONTEXTS[c]; sim.current.xs = []; set({ ctx: c, a: +(q.mu - 1.25 * q.sd).toFixed(3), b: +(q.mu + 1.25 * q.sd).toFixed(3) }); };
  const challenges = [
    { id: "68", title: "Shade the middle 68%", detail: "Between two values, symmetric about the mean. How many standard deviations is that?", done: p.mode === "between" && Math.abs(pr - 0.6827) < 0.005 && Math.abs((p.a + p.b) / 2 - mu) < sd * 0.03 },
    { id: "iq", title: "Find P(IQ > 130)", detail: "IQ scores, 'above' 130. That's 2 standard deviations above the mean.", done: p.ctx === "iq" && p.mode === "above" && Math.abs(p.a - 130) < 0.01 },
    { id: "90", title: "Find the height that 90% of people are below", detail: "Heights, 'below', move the bound until P = 0.90.", done: p.ctx === "heights" && p.mode === "below" && Math.abs(pr - 0.9) < 0.004 },
    { id: "sample", title: "Draw 1000 samples and compare their mean and SD with μ and σ", detail: "The grey histogram should take the shape of the curve.", done: live.n >= 1000 },
  ];

  return (
    <SimShell
      id="normal"
      challenges={challenges}
      onReset={() => { sim.current.xs = []; resetP(); }}
      record={() => ({ μ: mu, σ: sd, a: p.mode === "below" ? NaN : p.a, b: p.mode === "above" ? NaN : p.b, P: +pr.toFixed(5) })}
      ask={() => `Normal distribution (${CONTEXTS[p.ctx].name}) with mean ${mu}${unit} and standard deviation ${sd}${unit}. I'm finding P(${p.mode === "below" ? `X < ${p.b}` : p.mode === "above" ? `X > ${p.a}` : `${p.a} < X < ${p.b}`}) = ${pr.toFixed(4)}.${live.n ? ` I drew ${live.n} samples: mean ${fmt(live.m, 2)}, SD ${fmt(live.sdev, 2)}.` : ""}`}
      stage={<Stage label={`Normal distribution with mean ${mu} and standard deviation ${sd}`} render={render} onDown={onDown} onMove={onMove} onUp={onUp} cursor="ew-resize" />}
      overlay={
        <Readouts>
          <Readout label="probability" value={pr.toFixed(4)} color={theme.c.blue} big />
          <Readout label="as a percentage" value={`${(pr * 100).toFixed(2)}%`} />
          {live.n > 0 && <Readout label={`sample of ${live.n}`} value={`x̄ ${fmt(live.m, 2)} · s ${fmt(live.sdev, 2)}`} />}
        </Readouts>
      }
      controls={
        <>
          <Group title="Data">
            <Choice value={p.ctx} onChange={switchCtx} options={(Object.keys(CONTEXTS) as Ctxt[]).map((k) => ({ value: k, label: CONTEXTS[k].name }))} wrap />
            <p className="-mt-1 text-[12px] text-lp-mute">μ = {mu}{unit}, σ = {sd}{unit}</p>
          </Group>
          <Group title="Probability">
            <Choice value={p.mode} onChange={(mode) => set({ mode })} options={[{ value: "below", label: "Below" }, { value: "between", label: "Between" }, { value: "above", label: "Above" }]} />
            {p.mode !== "below" && <Slider label="Lower value a" value={p.a} min={mu - 4 * sd} max={mu + 4 * sd} step={sd / 20} digits={2} color={theme.c.amber} onChange={(a) => set({ a: +a.toFixed(4) })} />}
            {p.mode !== "above" && <Slider label="Upper value b" value={p.b} min={mu - 4 * sd} max={mu + 4 * sd} step={sd / 20} digits={2} color={theme.c.amber} onChange={(b) => set({ b: +b.toFixed(4) })} hint="Or drag the amber handles." />}
            <Switch label="68–95–99.7 rule" checked={p.rule} onChange={(rule) => set({ rule })} />
          </Group>
          <Group title="Random samples">
            <div className="grid grid-cols-3 gap-1.5">{[10, 100, 1000].map((n) => <Btn key={n} onClick={() => sample(n)}>+{n.toLocaleString()}</Btn>)}</div>
            <Btn onClick={() => { sim.current.xs = []; }}>Clear samples</Btn>
          </Group>
        </>
      }
      learn={
        <>
          <H>Probability is area</H>
          <p>For a continuous variable, the probability of landing in a range is the area under the curve over that range. The whole area is 1.</p>
          <H>z-scores</H>
          <Eq>z = (x − μ) ⁄ σ</Eq>
          <p>How many standard deviations a value is from the mean. Every normal distribution becomes the standard one (μ = 0, σ = 1) this way, which is why one table, or one calculator function, works for all of them.</p>
          <H>The 68–95–99.7 rule</H>
          <p>About 68% of values are within 1σ of the mean, 95% within 2σ and 99.7% within 3σ.</p>
          <H>Samples</H>
          <p>Real data only follows the curve roughly. A bigger sample's histogram looks more like the curve, and its mean and standard deviation get closer to μ and σ.</p>
          <Try>find P(X &lt; μ). Why is it exactly 0.5 for every normal distribution?</Try>
        </>
      }
    />
  );
}
