import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Btn } from "../kit/controls";
import { Plot, label, roundRect, mix, TAU, type Ctx } from "../kit/draw";

// Experiments with chance: relative frequency against theoretical probability,
// and how it settles down as the number of trials grows.

type Exp = "coin" | "die" | "twodice" | "spinner";
type P = { exp: Exp; w1: number; w2: number; w3: number; focus: number };
const DEF: P = { exp: "die", w1: 1, w2: 1, w3: 1, focus: 6 };
const SPIN = [{ name: "Red", c: "#ef4444" }, { name: "Blue", c: "#3b82f6" }, { name: "Green", c: "#22c55e" }];

const outcomes = (p: P): { v: number; label: string; prob: number }[] => {
  if (p.exp === "coin") return [{ v: 0, label: "Heads", prob: 0.5 }, { v: 1, label: "Tails", prob: 0.5 }];
  if (p.exp === "die") return [1, 2, 3, 4, 5, 6].map((v) => ({ v, label: String(v), prob: 1 / 6 }));
  if (p.exp === "twodice") return Array.from({ length: 11 }, (_, i) => ({ v: i + 2, label: String(i + 2), prob: (6 - Math.abs(7 - (i + 2))) / 36 }));
  const tot = p.w1 + p.w2 + p.w3;
  return [p.w1, p.w2, p.w3].map((wt, i) => ({ v: i, label: SPIN[i].name, prob: wt / tot }));
};
function trial(p: P): { v: number; detail: number[] } {
  if (p.exp === "coin") { const v = Math.random() < 0.5 ? 0 : 1; return { v, detail: [v] }; }
  if (p.exp === "die") { const v = 1 + Math.floor(Math.random() * 6); return { v, detail: [v] }; }
  if (p.exp === "twodice") { const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6); return { v: a + b, detail: [a, b] }; }
  const tot = p.w1 + p.w2 + p.w3, r = Math.random() * tot;
  const v = r < p.w1 ? 0 : r < p.w1 + p.w2 ? 1 : 2;
  return { v, detail: [v, r / tot] };
}

type S = { counts: Map<number, number>; n: number; series: [number, number][]; last: { detail: number[]; at: number } | null };
const empty = (): S => ({ counts: new Map(), n: 0, series: [], last: null });
const focusOf = (p: P) => (p.exp === "coin" ? (p.focus === 1 ? 1 : 0) : p.exp === "die" ? Math.min(6, Math.max(1, p.focus)) : p.exp === "twodice" ? Math.min(12, Math.max(2, p.focus)) : Math.min(2, Math.max(0, p.focus)));

function pip(ctx: Ctx, x: number, y: number, s: number, v: number, t: SimTheme) {
  const g = ctx.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#dbe3ee");
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
  ctx.fillStyle = g; roundRect(ctx, x, y, s, s, s * 0.18); ctx.fill(); ctx.restore();
  const spots: Record<number, [number, number][]> = { 1: [[0.5, 0.5]], 2: [[0.27, 0.27], [0.73, 0.73]], 3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]], 4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]], 5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]], 6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]] };
  ctx.fillStyle = v === 1 ? "#dc2626" : "#0f172a";
  for (const [a, b] of spots[v] ?? []) { ctx.beginPath(); ctx.arc(x + a * s, y + b * s, s * 0.085, 0, TAU); ctx.fill(); }
  void t;
}

function drawToy(ctx: Ctx, x: number, y: number, size: number, p: P, s: S, now: number, t: SimTheme) {
  const age = s.last ? now - s.last.at : 9;
  const spin = Math.max(0, 1 - age / 0.7);
  if (p.exp === "coin") {
    const v = s.last?.detail[0] ?? 0;
    const sx = Math.abs(Math.cos(spin * 9)) || 0.05;
    const r = size * 0.36;
    ctx.save(); ctx.translate(x, y - spin * 60 * Math.sin(spin * Math.PI)); ctx.scale(sx, 1);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, "#fff3c4"); g.addColorStop(0.6, "#e0a526"); g.addColorStop(1, "#8a5a10");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#7a4e0c"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, TAU); ctx.stroke();
    label(ctx, spin > 0.05 ? "" : v === 0 ? "H" : "T", 0, 2, { color: "#5a3a08", size: r * 0.9, weight: 800, font: "Georgia, serif" });
    ctx.restore();
    if (s.last && spin < 0.05) label(ctx, v === 0 ? "Heads" : "Tails", x, y + size * 0.48, { color: t.ink, size: 15, weight: 700 });
  } else if (p.exp === "die" || p.exp === "twodice") {
    const ds = p.exp === "die" ? [s.last?.detail[0] ?? 6] : [s.last?.detail[0] ?? 3, s.last?.detail[1] ?? 4];
    const sz = size * (p.exp === "die" ? 0.5 : 0.36);
    ds.forEach((v, i) => {
      const cx = x + (ds.length === 1 ? 0 : (i ? 1 : -1) * sz * 0.62);
      const shown = spin > 0.05 ? 1 + Math.floor(((now * 13 + i * 3) % 6)) : v;
      ctx.save(); ctx.translate(cx, y); ctx.rotate(spin * (i ? -4 : 5));
      pip(ctx, -sz / 2, -sz / 2, sz, shown, t); ctx.restore();
    });
    if (p.exp === "twodice" && s.last && spin < 0.05) label(ctx, `total ${ds[0] + ds[1]}`, x, y + size * 0.42, { color: t.ink, size: 15, weight: 700 });
  } else {
    const r = size * 0.4, tot = p.w1 + p.w2 + p.w3;
    let a0 = -Math.PI / 2;
    [p.w1, p.w2, p.w3].forEach((wt, i) => {
      const a1 = a0 + (wt / tot) * TAU;
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, mix(SPIN[i].c, "#ffffff", 0.25)); g.addColorStop(1, SPIN[i].c);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, a0, a1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
      a0 = a1;
    });
    const target = -Math.PI / 2 + (s.last?.detail[1] ?? 0.1) * TAU;
    const ang = target + spin * spin * 14;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = t.dark ? "#f8fafc" : "#0f172a";
    ctx.beginPath(); ctx.moveTo(r * 0.92, 0); ctx.lineTo(-r * 0.15, -7); ctx.lineTo(-r * 0.15, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#334155"; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill();
  }
}

function draw(ctx: Ctx, w: number, h: number, p: P, s: S, now: number, t: SimTheme) {
  ctx.fillStyle = t.dark ? "#08101f" : "#fbfcfe"; ctx.fillRect(0, 0, w, h);
  const outs = outcomes(p);
  const toyW = Math.min(w * 0.34, 300);
  // Felt table for the toy
  const tg = ctx.createRadialGradient(toyW / 2 + 10, h * 0.45, 20, toyW / 2 + 10, h * 0.45, toyW);
  tg.addColorStop(0, t.dark ? "#14532d" : "#bbf7d0"); tg.addColorStop(1, t.dark ? "#052e16" : "#86efac");
  ctx.fillStyle = tg; roundRect(ctx, 12, 70, toyW, h - 90, 20); ctx.fill();
  drawToy(ctx, 12 + toyW / 2, 70 + (h - 90) * 0.45, toyW, p, s, now, t);
  // Bars: relative frequency against probability
  const gx = toyW + 50, gw = w - gx - 20;
  const top = 104; // below the readouts
  const barH = (h - top - 20) * 0.5;
  const maxP = Math.max(...outs.map((o) => Math.max(o.prob, (s.counts.get(o.v) ?? 0) / Math.max(1, s.n))));
  const pl = new Plot(gx, top, gw, barH - 30, 0, outs.length, 0, Math.min(1, maxP * 1.25 + 0.02));
  pl.axes(ctx, t, { yLabel: "relative frequency", yTicks: 4, xTicks: 1, xFmt: () => "" });
  const bw = (pl.X(1) - pl.X(0)) * 0.62;
  const fv = focusOf(p);
  outs.forEach((o, i) => {
    const rf = (s.counts.get(o.v) ?? 0) / Math.max(1, s.n);
    const x = pl.X(i + 0.5) - bw / 2;
    const col = p.exp === "spinner" ? SPIN[o.v].c : o.v === fv ? t.c.amber : t.c.blue;
    ctx.fillStyle = col; ctx.globalAlpha = o.v === fv || p.exp === "spinner" ? 0.95 : 0.6;
    roundRect(ctx, x, pl.Y(rf), bw, Math.max(0, pl.Y(0) - pl.Y(rf)), 4); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x - 4, pl.Y(o.prob)); ctx.lineTo(x + bw + 4, pl.Y(o.prob)); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, o.label, pl.X(i + 0.5), pl.Y(0) + 13, { color: o.v === fv ? t.c.amber : t.mute, size: outs.length > 8 ? 10.5 : 12, weight: o.v === fv ? 700 : 500 });
  });
  label(ctx, "bars: your results · dashes: probability", gx + gw, top - 14, { color: t.mute, size: 11, align: "right" });
  // Running relative frequency of the chosen outcome (log scale in trials)
  const fo = outs.find((o) => o.v === fv)!;
  const ly0 = top + barH + 16, lh = h - ly0 - 36;
  const nmax = Math.max(10, s.n);
  const lp = new Plot(gx, ly0, gw, lh, 0, Math.log10(nmax), 0, Math.min(1, Math.max(fo.prob * 2.2, 0.3)));
  // ±2 standard errors band around p
  ctx.save();
  lp.clip(ctx);
  ctx.fillStyle = t.dark ? "rgba(251,191,36,0.10)" : "rgba(180,83,9,0.08)";
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) { const lx = (i / 60) * Math.log10(nmax); const n = Math.pow(10, lx); const e = 2 * Math.sqrt((fo.prob * (1 - fo.prob)) / n); ctx.lineTo(lp.X(lx), lp.Y(Math.min(lp.ymax, fo.prob + e))); }
  for (let i = 60; i >= 0; i--) { const lx = (i / 60) * Math.log10(nmax); const n = Math.pow(10, lx); const e = 2 * Math.sqrt((fo.prob * (1 - fo.prob)) / n); ctx.lineTo(lp.X(lx), lp.Y(Math.max(0, fo.prob - e))); }
  ctx.closePath(); ctx.fill();
  ctx.restore();
  lp.axes(ctx, t, { xLabel: "number of trials", yLabel: `relative frequency of ${fo.label}`, xTicks: 4, yTicks: 3, xFmt: (v) => (Number.isInteger(v) ? Math.pow(10, v).toLocaleString() : "") });
  ctx.strokeStyle = t.c.amber; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(lp.x0, lp.Y(fo.prob)); ctx.lineTo(lp.x0 + lp.w, lp.Y(fo.prob)); ctx.stroke(); ctx.setLineDash([]);
  ctx.save();
  lp.clip(ctx);
  ctx.strokeStyle = t.c.blue; ctx.lineWidth = 2;
  ctx.beginPath();
  s.series.forEach(([n, rf], i) => { const X = lp.X(Math.log10(n)), Y = lp.Y(rf); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
  ctx.stroke();
  ctx.restore();
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const p = { ...DEF, exp: "twodice" as Exp, focus: 7 };
  const s = empty();
  for (let i = 0; i < 600; i++) { const r = trial(p); s.counts.set(r.v, (s.counts.get(r.v) ?? 0) + 1); s.n++; }
  s.last = { detail: [3, 4], at: -10 };
  draw(ctx, w * 1.4, h * 1.4, p, s, 0, t);
}

export default function Probability() {
  const theme = useSimTheme();
  const [p, set] = useSimParams<P>(DEF, { exp: ["coin", "die", "twodice", "spinner"], w1: [1, 10], w2: [1, 10], w3: [1, 10], focus: [0, 12] });
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const sim = useRef<S>(empty());
  const clock = useRef(0);
  const carry = useRef(0);
  const fv = focusOf(p);

  const run = (k: number) => {
    const s = sim.current;
    for (let i = 0; i < k; i++) {
      const r = trial(p);
      s.counts.set(r.v, (s.counts.get(r.v) ?? 0) + 1);
      s.n++;
      if (i === k - 1) s.last = { detail: r.detail, at: k === 1 ? clock.current : clock.current - 1 };
      // Keep about 400 points spread evenly on a log scale
      const last = s.series[s.series.length - 1];
      if (!last || Math.log10(s.n) - Math.log10(last[0]) > 0.008 || s.n < 50) s.series.push([s.n, (s.counts.get(fv) ?? 0) / s.n]);
    }
    s.series[s.series.length - 1] = [s.n, (s.counts.get(fv) ?? 0) / s.n];
  };
  const clear = () => { sim.current = empty(); };
  const change = (patch: Partial<P>) => { set(patch); clear(); };

  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    clock.current += dt;
    if (running) { carry.current += dt * speed * 20; const k = Math.floor(carry.current); if (k) { carry.current -= k; run(k); } }
    draw(ctx, w, h, p, sim.current, clock.current, theme);
  };
  const live = useLive(() => { const s = sim.current; return { n: s.n, c: s.counts.get(fv) ?? 0 }; }, 8);
  const outs = outcomes(p);
  const fo = outs.find((o) => o.v === fv)!;
  const rf = live.n ? live.c / live.n : NaN;

  const tot = p.w1 + p.w2 + p.w3;
  const challenges = [
    { id: "six", title: "Roll a die 1000 times or more and get the six within 0.02 of 1/6", detail: "Track the 6. Usually it lands close; sometimes it doesn't.", done: p.exp === "die" && fv === 6 && live.n >= 1000 && Math.abs(rf - 1 / 6) <= 0.02 },
    { id: "seven", title: "With two dice, track the total you think is most likely, over 300 or more throws", detail: "Pick it under 'Outcome to track' before you throw.", done: p.exp === "twodice" && fv === 7 && live.n >= 300 },
    { id: "spinner", title: "Design a spinner where blue has probability exactly 0.5", detail: "Use the sector sizes.", done: p.exp === "spinner" && Math.abs(p.w2 / tot - 0.5) < 1e-9 },
    { id: "lucky", title: "Flip a coin exactly 10 times and get heads 8 or more times", detail: "Clear and try again. Small samples can be far from ½.", done: p.exp === "coin" && live.n === 10 && fv === 0 && live.c >= 8 },
  ];

  return (
    <SimShell
      id="probability"
      running={running}
      onRun={setRunning}
      speed={speed}
      onSpeed={setSpeed}
      onReset={clear}
      challenges={challenges}
      record={() => ({ trials: live.n, [`count of ${fo.label}`]: live.c, "relative frequency": +(rf || 0).toFixed(4), probability: +fo.prob.toFixed(4) })}
      ask={() => `Chance experiment: ${p.exp === "twodice" ? "total of two dice" : p.exp === "spinner" ? `spinner with sectors ${p.w1}:${p.w2}:${p.w3} (red:blue:green)` : p.exp}. After ${live.n} trials, ${fo.label} came up ${live.c} times (relative frequency ${isFinite(rf) ? rf.toFixed(3) : "–"}); the theoretical probability is ${fo.prob.toFixed(3)}.`}
      stage={<Stage label="Chance experiment" render={render} />}
      overlay={
        <Readouts>
          <Readout label="trials" value={live.n.toLocaleString()} />
          <Readout label={`${fo.label}`} value={`${live.c}`} color={theme.c.amber} />
          <Readout label="relative frequency" value={isFinite(rf) ? rf.toFixed(3) : "–"} color={theme.c.blue} />
          <Readout label="probability" value={fo.prob.toFixed(3)} />
        </Readouts>
      }
      controls={
        <>
          <Group title="Experiment">
            <Choice value={p.exp} onChange={(exp) => change({ exp, focus: exp === "coin" ? 0 : exp === "die" ? 6 : exp === "twodice" ? 7 : 1 })} options={[{ value: "coin", label: "Coin" }, { value: "die", label: "Die" }, { value: "twodice", label: "Two dice" }, { value: "spinner", label: "Spinner" }]} wrap />
            {p.exp === "spinner" && (
              <>
                <Slider label="Red sector" value={p.w1} min={1} max={10} step={1} color={SPIN[0].c} onChange={(w1) => change({ w1 })} />
                <Slider label="Blue sector" value={p.w2} min={1} max={10} step={1} color={SPIN[1].c} onChange={(w2) => change({ w2 })} />
                <Slider label="Green sector" value={p.w3} min={1} max={10} step={1} color={SPIN[2].c} onChange={(w3) => change({ w3 })} />
              </>
            )}
            <label className="block text-[13px] text-lp-soft">Outcome to track
              <select value={fv} onChange={(e) => change({ focus: Number(e.target.value) })} className="mt-1.5 h-10 w-full rounded-xl border border-lp-line bg-lp-deep/60 px-3 text-[14px] text-white outline-none">
                {outs.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </label>
          </Group>
          <Group title="Run trials">
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 10, 100, 1000].map((k) => <Btn key={k} onClick={() => run(k)}>{k.toLocaleString()}</Btn>)}
            </div>
            <p className="text-[11.5px] text-lp-mute">Or press Play for a steady stream (20 a second at 1×).</p>
            <Btn onClick={clear}>Clear results</Btn>
          </Group>
        </>
      }
      learn={
        <>
          <H>Theory and experiment</H>
          <Eq>P(event) = favourable outcomes ⁄ total equally likely outcomes</Eq>
          <Eq>relative frequency = times it happened ⁄ number of trials</Eq>
          <p>Relative frequency is an estimate of probability. With a few trials it can be way off; with many it settles down near the true value. This is the law of large numbers. The shaded band shows where it will usually be (about 95% of the time).</p>
          <H>Two dice</H>
          <p>There are 36 equally likely pairs. A total of 7 can happen 6 ways (1+6, 2+5, 3+4, 4+3, 5+2, 6+1), so P(7) = 6/36 = 1/6, the most likely total. A total of 2 can only happen 1 way.</p>
          <H>Expected frequency</H>
          <Eq>expected number = P(event) × number of trials</Eq>
          <Try>before you roll a die 600 times, write how many sixes you expect. How close did you get? Try again: is it the same?</Try>
        </>
      }
    />
  );
}
