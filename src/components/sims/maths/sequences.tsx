import React from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Switch } from "../kit/controls";
import { Plot, label, roundRect, fmt, type Ctx } from "../kit/draw";
import { fmtN } from "./paper";

// Arithmetic and geometric sequences as bars, with their running sums and,
// for a converging geometric series, the sum to infinity.

type P = { kind: "arith" | "geo"; u1: number; d: number; r: number; n: number; sums: boolean };
const DEF: P = { kind: "arith", u1: 2, d: 3, r: 0.5, n: 12, sums: true };

export const terms = (p: P) => Array.from({ length: p.n }, (_, i) => (p.kind === "arith" ? p.u1 + i * p.d : p.u1 * Math.pow(p.r, i)));
const partial = (u: number[]) => u.reduce<number[]>((a, x) => [...a, (a[a.length - 1] ?? 0) + x], []);
const sumInf = (p: P) => (p.kind === "geo" && Math.abs(p.r) < 1 ? p.u1 / (1 - p.r) : NaN);

function draw(ctx: Ctx, w: number, h: number, p: P, t: SimTheme) {
  ctx.fillStyle = t.dark ? "#08101f" : "#fbfcfe"; ctx.fillRect(0, 0, w, h);
  const u = terms(p), S = partial(u), inf = sumInf(p);
  const vals = [...u, ...(p.sums ? S : []), ...(isFinite(inf) && p.sums ? [inf] : []), 0];
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.12;
  const pl = new Plot(56, 76, w - 84, h - 130, 0.4, p.n + 0.6, lo - pad, hi + pad);
  pl.axes(ctx, t, { xLabel: "n", yLabel: "value", xTicks: Math.min(p.n, 12), yTicks: 5, xFmt: (v) => (Number.isInteger(v) && v >= 1 ? String(v) : ""), origin: true });
  const bw = Math.min(40, (pl.X(1) - pl.X(0)) * 0.6);
  u.forEach((v, i) => {
    const x = pl.X(i + 1) - bw / 2, y0 = pl.Y(0), y1 = pl.Y(v);
    const g = ctx.createLinearGradient(0, Math.min(y0, y1), 0, Math.max(y0, y1));
    g.addColorStop(0, v >= 0 ? t.c.blue : t.c.red); g.addColorStop(1, v >= 0 ? (t.dark ? "#1e3a8a" : "#93c5fd") : (t.dark ? "#7f1d1d" : "#fca5a5"));
    ctx.fillStyle = g; roundRect(ctx, x, Math.min(y0, y1), bw, Math.abs(y1 - y0), 4); ctx.fill();
    if (p.n <= 16) label(ctx, fmtN(v), pl.X(i + 1), y1 + (v >= 0 ? -10 : 12), { color: t.soft, size: 10.5, weight: 600, halo: true });
  });
  if (p.sums) {
    ctx.strokeStyle = t.c.amber; ctx.lineWidth = 2.5;
    ctx.beginPath(); S.forEach((v, i) => (i ? ctx.lineTo(pl.X(i + 1), pl.Y(v)) : ctx.moveTo(pl.X(i + 1), pl.Y(v)))); ctx.stroke();
    S.forEach((v, i) => { ctx.fillStyle = t.c.amber; ctx.beginPath(); ctx.arc(pl.X(i + 1), pl.Y(v), 4, 0, Math.PI * 2); ctx.fill(); });
    label(ctx, `S${p.n} = ${fmtN(S[S.length - 1], 3)}`, pl.X(p.n), pl.Y(S[S.length - 1]) - 16, { color: t.c.amber, size: 12, weight: 700, halo: true, align: "right" });
    if (isFinite(inf)) {
      ctx.strokeStyle = t.c.green; ctx.setLineDash([7, 5]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pl.x0, pl.Y(inf)); ctx.lineTo(pl.x0 + pl.w, pl.Y(inf)); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, `S∞ = ${fmtN(inf, 4)}`, pl.x0 + pl.w - 6, pl.Y(inf) - 12, { color: t.c.green, size: 12, weight: 700, align: "right", halo: true });
    }
  }
  const rule = p.kind === "arith" ? `uₙ = ${fmtN(p.u1)} + (n − 1)·${fmtN(p.d)}` : `uₙ = ${fmtN(p.u1)} · ${fmtN(p.r)}ⁿ⁻¹`;
  label(ctx, rule, 60, 40, { color: t.ink, size: 18, weight: 600, align: "left", font: "Georgia, 'Times New Roman', serif" });
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  draw(ctx, w, h, { ...DEF, kind: "geo", u1: 8, r: 0.6, n: 10 }, t);
}

export default function Sequences() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { kind: ["arith", "geo"], u1: [-10, 10], d: [-5, 5], r: [-2, 2], n: [1, 30] });
  const u = terms(p), S = partial(u), inf = sumInf(p);
  const last = u[u.length - 1], Sn = S[S.length - 1];
  const eq = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const challenges = [
    { id: "a10", title: "Arithmetic: first term 5 and 10th term 50", detail: "u₁₀ = u₁ + 9d. Show exactly 10 terms.", done: p.kind === "arith" && eq(p.u1, 5) && p.n === 10 && eq(last, 50) },
    { id: "eight", title: "Geometric with first term 4 that adds up to 8 for ever", detail: "S∞ = u₁ ⁄ (1 − r).", done: p.kind === "geo" && eq(p.u1, 4) && eq(inf, 8) },
    { id: "thousand", title: "Starting at 1 and doubling, show terms up to the first one over 1000", detail: "How many terms is that?", done: p.kind === "geo" && eq(p.u1, 1) && eq(p.r, 2) && last > 1000 && u[u.length - 2] <= 1000 },
    { id: "zero", title: "An arithmetic sequence of 20 terms that adds up to 0", detail: "Sₙ = n⁄2 (2u₁ + (n − 1)d). Not all zeros!", done: p.kind === "arith" && p.n === 20 && Math.abs(Sn) < 1e-9 && !eq(p.d, 0) },
  ];

  return (
    <SimShell
      id="sequences"
      challenges={challenges}
      onReset={() => resetP()}
      record={() => ({ n: p.n, "u₁": p.u1, [p.kind === "arith" ? "d" : "r"]: p.kind === "arith" ? p.d : p.r, "uₙ": +last.toFixed(4), "Sₙ": +Sn.toFixed(4) })}
      ask={() => `${p.kind === "arith" ? `Arithmetic sequence with u₁ = ${p.u1}, d = ${p.d}` : `Geometric sequence with u₁ = ${p.u1}, r = ${p.r}`}, ${p.n} terms: u${p.n} = ${fmt(last, 4)}, S${p.n} = ${fmt(Sn, 4)}${isFinite(inf) ? `, sum to infinity ${fmt(inf, 4)}` : ""}.`}
      stage={<Stage label={`${p.kind === "arith" ? "Arithmetic" : "Geometric"} sequence`} render={(ctx, w, h) => draw(ctx, w, h, p, theme)} />}
      overlay={
        <Readouts className="!left-auto right-3">
          <Readout label={`u${p.n}`} value={fmtN(last, 4)} color={theme.c.blue} />
          <Readout label={`S${p.n}`} value={fmtN(Sn, 4)} color={theme.c.amber} />
          {isFinite(inf) && <Readout label="S∞" value={fmtN(inf, 4)} color={theme.c.green} />}
        </Readouts>
      }
      controls={
        <>
          <Group title="Sequence">
            <Choice value={p.kind} onChange={(kind) => set({ kind })} options={[{ value: "arith", label: "Arithmetic (+ d)" }, { value: "geo", label: "Geometric (× r)" }]} />
            <Slider label="First term u₁" value={p.u1} min={-10} max={10} step={0.5} onChange={(u1) => set({ u1 })} />
            {p.kind === "arith" ? <Slider label="Common difference d" value={p.d} min={-5} max={5} step={0.5} onChange={(d) => set({ d })} /> : <Slider label="Common ratio r" value={p.r} min={-2} max={2} step={0.05} onChange={(r) => set({ r })} hint={Math.abs(p.r) < 1 ? "|r| < 1: the series converges." : "|r| ≥ 1: the sum grows without limit."} />}
            <Slider label="Number of terms n" value={p.n} min={1} max={30} step={1} onChange={(n) => set({ n })} />
            <Switch label="Running sum Sₙ" checked={p.sums} onChange={(sums) => set({ sums })} />
          </Group>
        </>
      }
      learn={
        <>
          <H>Arithmetic: add the same each time</H>
          <Eq>uₙ = u₁ + (n − 1)d</Eq>
          <Eq>Sₙ = n⁄2 · (2u₁ + (n − 1)d) = n⁄2 · (u₁ + uₙ)</Eq>
          <p>The bars grow in a straight line. Gauss's trick: pair the first and last terms; every pair has the same total.</p>
          <H>Geometric: multiply by the same each time</H>
          <Eq>uₙ = u₁ · rⁿ⁻¹ &nbsp;&nbsp; Sₙ = u₁(1 − rⁿ) ⁄ (1 − r)</Eq>
          <p>With r &gt; 1 the terms explode (exponential growth). With 0 &lt; r &lt; 1 they shrink towards 0, and the sum creeps up towards a limit:</p>
          <Eq>S∞ = u₁ ⁄ (1 − r), when |r| &lt; 1</Eq>
          <p>A negative r makes the terms alternate in sign.</p>
          <Try>set u₁ = 1 and r = 0.5. The sum gets as close to 2 as you like, but never passes it. Why?</Try>
        </>
      }
    />
  );
}
