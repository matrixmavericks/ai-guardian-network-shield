import React, { useMemo, useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Btn } from "../kit/controls";
import { Plot, label, roundRect, fmt, type Ctx } from "../kit/draw";

// A cohort-component population projection in 5-year steps: survival from a
// mortality schedule fitted to life expectancy, births from fertility, and net
// migration. Starting populations are illustrative (stable populations for
// typical rates), not data for real countries.

const G = 21; // 0–4 … 95–99, 100+
const AGES = Array.from({ length: G }, (_, i) => (i === G - 1 ? "100+" : `${i * 5}–${i * 5 + 4}`));
const START = {
  young: { name: "Young, fast-growing", tfr: 5, e0: 62, mig: 0, total: 40 },
  middle: { name: "Middle", tfr: 2.2, e0: 73, mig: 0, total: 60 },
  ageing: { name: "Ageing", tfr: 1.3, e0: 84, mig: 0, total: 50 },
} as const;
type Start = keyof typeof START;
type P = { start: Start; tfr: number; e0: number; mig: number };
const DEF: P = { start: "young", tfr: 5, e0: 62, mig: 0 };

const ASFR_SHAPE = [0.08, 0.22, 0.27, 0.22, 0.13, 0.06, 0.02]; // ages 15–19 … 45–49, sums to 1
const SRB = 1.05; // boys per girl at birth

/** Survival curve l(a) for ages 0..110 by quarter year, Gompertz hazard plus infant mortality. */
function lifeTable(A: number) {
  const h = 0.25, l: number[] = [1];
  for (let a = 0; a < 110; a += h) {
    const mu = 90 * A * Math.exp(-a / 2) + A * Math.exp(0.085 * a);
    l.push(l[l.length - 1] * Math.exp(-mu * h));
  }
  return l;
}
const e0Of = (l: number[]) => l.reduce((s, x) => s + x, 0) * 0.25;
/** Fit the Gompertz level so life expectancy at birth is e0. */
export function survival(e0: number) {
  let lo = Math.log(1e-7), hi = Math.log(0.05);
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (e0Of(lifeTable(Math.exp(m))) > e0) lo = m; else hi = m; }
  const l = lifeTable(Math.exp((lo + hi) / 2));
  // Person-years lived in each 5-year group (and the open 100+ group)
  const L = Array.from({ length: G }, (_, g) => { let s = 0; const end = g === G - 1 ? l.length : (g + 1) * 20; for (let i = g * 20; i < end; i++) s += l[i] * 0.25; return s; });
  return { L, l };
}

type Pop = { m: number[]; f: number[] }; // millions
const total = (p: Pop) => p.m.reduce((a, b) => a + b, 0) + p.f.reduce((a, b) => a + b, 0);

/** Stable population: every group ∝ L(a)·e^(−r·a), with r from the net reproduction rate. */
function stable(tfr: number, e0: number, size: number): Pop {
  const { L } = survival(e0);
  const nrr = (tfr / (1 + SRB)) * ASFR_SHAPE.reduce((s, w, i) => s + (w * L[3 + i]) / 5, 0);
  const r = Math.log(Math.max(0.05, nrr)) / 28;
  const raw = L.map((x, g) => x * Math.exp(-r * (g * 5 + 2.5)));
  const sum = raw.reduce((a, b) => a + b, 0);
  const share = raw.map((x) => (x / sum) * size);
  return { m: share.map((x) => (x * SRB) / (1 + SRB)), f: share.map((x) => x / (1 + SRB)) };
}

/** Five years forward. */
export function project(pop: Pop, p: Pick<P, "tfr" | "e0" | "mig">) {
  const { L } = survival(p.e0);
  const S = L.map((x, g) => (g < G - 2 ? L[g + 1] / x : 0));
  const sOpen = L[G - 1] / (L[G - 2] + L[G - 1]);
  const step = (arr: number[]) => {
    const out = new Array(G).fill(0);
    for (let g = 0; g < G - 2; g++) out[g + 1] = arr[g] * S[g];
    out[G - 1] = (arr[G - 2] + arr[G - 1]) * sOpen;
    return out;
  };
  const m = step(pop.m), f = step(pop.f);
  // Births over the 5 years from women 15–49 (average of start and end), surviving into 0–4
  let births = 0;
  ASFR_SHAPE.forEach((w, i) => { const women = (pop.f[3 + i] + f[3 + i]) / 2; births += women * ((p.tfr * w) / 5) * 5; });
  const toBaby = L[0] / 5;
  m[0] = (births * SRB) / (1 + SRB) * toBaby;
  f[0] = (births / (1 + SRB)) * toBaby;
  // Net migration (thousands a year) mostly aged 20–39
  const migW = [0, 0.05, 0.1, 0.12, 0.25, 0.22, 0.13, 0.07, 0.04, 0.02];
  const migTotal = (p.mig / 1000) * 5;
  migW.forEach((w, g) => { m[g] = Math.max(0, m[g] + (migTotal * w) / 2); f[g] = Math.max(0, f[g] + (migTotal * w) / 2); });
  const deaths = total(pop) + births + migTotal - (total({ m, f }));
  return { pop: { m, f }, births, deaths };
}

export const stats = (pop: Pop) => {
  const both = pop.m.map((x, g) => x + pop.f[g]);
  const T = both.reduce((a, b) => a + b, 0);
  const young = both[0] + both[1] + both[2], old = both.slice(13).reduce((a, b) => a + b, 0), work = T - young - old;
  let acc = 0, median = 0;
  for (let g = 0; g < G; g++) { if (acc + both[g] >= T / 2) { median = g * 5 + ((T / 2 - acc) / both[g]) * 5; break; } acc += both[g]; }
  return { T, dep: ((young + old) / work) * 100, median, young: (young / T) * 100, old: (old / T) * 100 };
};

type Hist = { year: number; T: number; cbr: number; cdr: number }[];

function draw(ctx: Ctx, w: number, h: number, pop: Pop, ghost: Pop, hist: Hist, t: SimTheme, year: number, top0 = 112) {
  ctx.fillStyle = t.dark ? "#08101f" : "#fbfcfe"; ctx.fillRect(0, 0, w, h);
  const chartW = w > 760 ? Math.min(320, w * 0.34) : 0;
  const pw = w - chartW - 40, top = top0, bot = top0 < 50 ? 10 : 36;
  const cx = 20 + pw / 2;
  const rowH = (h - top - bot) / G;
  const maxShare = Math.max(...pop.m, ...pop.f, ...ghost.m, ...ghost.f) / total(pop) * 100;
  const half = pw / 2 - 40;
  const sc = half / Math.max(2, Math.ceil(maxShare + 0.5));
  const T = total(pop);
  // Bars as % of the whole population
  for (let g = 0; g < G; g++) {
    const y = top + (G - 1 - g) * rowH;
    const mm = (pop.m[g] / T) * 100, ff = (pop.f[g] / T) * 100;
    const gm = ctx.createLinearGradient(cx - 30 - mm * sc, 0, cx - 30, 0);
    gm.addColorStop(0, t.dark ? "#1d4ed8" : "#60a5fa"); gm.addColorStop(1, t.dark ? "#60a5fa" : "#2563eb");
    ctx.fillStyle = gm; roundRect(ctx, cx - 30 - mm * sc, y + 1.5, mm * sc, rowH - 3, 3); ctx.fill();
    const gf = ctx.createLinearGradient(cx + 30, 0, cx + 30 + ff * sc, 0);
    gf.addColorStop(0, t.dark ? "#f472b6" : "#db2777"); gf.addColorStop(1, t.dark ? "#be185d" : "#f9a8d4");
    ctx.fillStyle = gf; roundRect(ctx, cx + 30, y + 1.5, ff * sc, rowH - 3, 3); ctx.fill();
    // Starting shape as an outline
    const T0 = total(ghost);
    ctx.strokeStyle = t.dark ? "rgba(226,232,240,0.55)" : "rgba(15,23,42,0.45)"; ctx.lineWidth = 1.2;
    ctx.strokeRect(cx - 30 - (ghost.m[g] / T0) * 100 * sc, y + 1.5, (ghost.m[g] / T0) * 100 * sc, rowH - 3);
    ctx.strokeRect(cx + 30, y + 1.5, (ghost.f[g] / T0) * 100 * sc, rowH - 3);
    if (rowH > 11 && (g % 2 === 0 || rowH > 18)) label(ctx, AGES[g], cx, y + rowH / 2, { color: t.mute, size: Math.min(11, rowH * 0.7) });
  }
  label(ctx, "Male", cx - 30 - half / 2, top - 14, { color: t.c.blue, size: 12.5, weight: 700 });
  label(ctx, "Female", cx + 30 + half / 2, top - 14, { color: t.c.pink, size: 12.5, weight: 700 });
  for (let k = 0; k <= Math.ceil(maxShare); k += Math.max(1, Math.ceil(maxShare / 4))) {
    label(ctx, `${k}%`, cx - 30 - k * sc, h - bot + 14, { color: t.mute, size: 10.5 });
    label(ctx, `${k}%`, cx + 30 + k * sc, h - bot + 14, { color: t.mute, size: 10.5 });
  }
  label(ctx, `${year}`, w - 20, 40, { color: t.ink, size: 26, weight: 700, align: "right" });
  // Population and vital rates over time
  if (chartW) {
    const x0 = w - chartW - 10;
    const years = hist.map((d) => d.year);
    const ymin = Math.min(...years, year), ymax = Math.max(ymin + 50, ...years);
    const tp = new Plot(x0 + 30, top + 6, chartW - 40, (h - top - bot) * 0.42, ymin, ymax, 0, Math.max(...hist.map((d) => d.T)) * 1.2);
    tp.axes(ctx, t, { yLabel: "population (millions)", xTicks: 3, yTicks: 3, xFmt: (v) => String(Math.round(v)) });
    ctx.strokeStyle = t.c.violet; ctx.lineWidth = 2.5; ctx.beginPath(); hist.forEach((d, i) => (i ? ctx.lineTo(tp.X(d.year), tp.Y(d.T)) : ctx.moveTo(tp.X(d.year), tp.Y(d.T)))); ctx.stroke();
    const rp = new Plot(x0 + 30, top + (h - top - bot) * 0.58, chartW - 40, (h - top - bot) * 0.38, ymin, ymax, 0, Math.max(20, ...hist.flatMap((d) => [d.cbr, d.cdr]).filter((v) => isFinite(v))) * 1.15);
    rp.axes(ctx, t, { yLabel: "per 1000 a year", xTicks: 3, yTicks: 3, xFmt: (v) => String(Math.round(v)) });
    const ln = (key: "cbr" | "cdr", col: string) => { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); hist.filter((d) => isFinite(d[key])).forEach((d, i) => (i ? ctx.lineTo(rp.X(d.year), rp.Y(d[key])) : ctx.moveTo(rp.X(d.year), rp.Y(d[key])))); ctx.stroke(); };
    ln("cbr", t.c.green); ln("cdr", t.c.red);
    label(ctx, "birth rate", rp.x0 + rp.w, rp.y0 + 8, { color: t.c.green, size: 11, weight: 700, align: "right" });
    label(ctx, "death rate", rp.x0 + rp.w, rp.y0 + 24, { color: t.c.red, size: 11, weight: 700, align: "right" });
  }
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const s = START.young;
  const pop = stable(s.tfr, s.e0, s.total);
  draw(ctx, w, h, pop, pop, [], t, 2025, 12);
}

export default function Population() {
  const theme = useSimTheme();
  const [p, set] = useSimParams<P>(DEF, { start: Object.keys(START), tfr: [0.8, 7], e0: [45, 90], mig: [-300, 600] });
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const init = useMemo(() => { const s = START[p.start]; return stable(s.tfr, s.e0, s.total); }, [p.start]);
  const sim = useRef<{ pop: Pop; shown: Pop; year: number; hist: Hist; acc: number }>({ pop: init, shown: init, year: 2025, hist: [{ year: 2025, T: total(init), cbr: NaN, cdr: NaN }], acc: 0 });
  const restart = (s: Start) => { const st = START[s]; const pop = stable(st.tfr, st.e0, st.total); sim.current = { pop, shown: pop, year: 2025, hist: [{ year: 2025, T: total(pop), cbr: NaN, cdr: NaN }], acc: 0 }; };
  const stepOnce = () => {
    const s = sim.current;
    const r = project(s.pop, p);
    const T0 = total(s.pop), T1 = total(r.pop);
    s.pop = r.pop; s.year += 5;
    const avg = (T0 + T1) / 2;
    s.hist.push({ year: s.year, T: T1, cbr: (r.births / 5 / avg) * 1000, cdr: (r.deaths / 5 / avg) * 1000 });
  };
  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const s = sim.current;
    if (running) { s.acc += dt * speed; if (s.acc > 0.6) { s.acc = 0; stepOnce(); if (s.year >= 2225) setRunning(false); } }
    // Bars glide to their new lengths
    const k = Math.min(1, dt * 6);
    s.shown = { m: s.shown.m.map((x, g) => x + (s.pop.m[g] - x) * k), f: s.shown.f.map((x, g) => x + (s.pop.f[g] - x) * k) };
    draw(ctx, w, h, s.shown, init, s.hist, theme, s.year);
  };
  const live = useLive(() => { const s = sim.current; const st = stats(s.pop); const last = s.hist[s.hist.length - 1], prev = s.hist[s.hist.length - 2]; return { ...st, year: s.year, growth: prev ? (Math.pow(last.T / prev.T, 1 / 5) - 1) * 100 : NaN, cbr: last.cbr, cdr: last.cdr }; }, 6);

  const challenges = [
    { id: "stable", title: "Take the young country to a stable population", detail: "Growth between −0.1% and +0.1% a year, at least 25 years in. What fertility rate does that need?", done: p.start === "young" && live.year >= 2050 && Math.abs(live.growth) <= 0.1 },
    { id: "migrate", title: "Stop the ageing country shrinking without raising its fertility", detail: "Keep fertility at 1.5 or below.", done: p.start === "ageing" && p.tfr <= 1.5 && live.year > 2025 && live.growth >= 0 },
    { id: "dividend", title: "Give the young country a demographic dividend: dependency ratio below 45", detail: "Fewer children per worker. Lower fertility and wait.", done: p.start === "young" && live.dep < 45 },
    { id: "older", title: "Raise the young country's median age above 35", detail: "Which matters more here: fertility or life expectancy?", done: p.start === "young" && live.median > 35 },
  ];

  return (
    <SimShell
      id="population"
      running={running}
      onRun={setRunning}
      onStep={stepOnce}
      speed={speed}
      onSpeed={setSpeed}
      onReset={() => { setRunning(false); restart(p.start); }}
      challenges={challenges}
      record={() => ({ year: live.year, "TFR": p.tfr, "life expectancy": p.e0, "migration (k/yr)": p.mig, "population (m)": +live.T.toFixed(2), "growth (%/yr)": +live.growth.toFixed(3), "median age": +live.median.toFixed(1), "dependency ratio": +live.dep.toFixed(1) })}
      ask={() => `Population projection, starting from the ${START[p.start].name.toLowerCase()} example in 2025, now ${live.year}. Fertility ${p.tfr} children per woman, life expectancy ${p.e0} years, net migration ${p.mig} thousand a year. Population ${fmt(live.T, 1)} million, growing ${fmt(live.growth, 2)}% a year; median age ${fmt(live.median, 1)}; dependency ratio ${fmt(live.dep, 0)}; ${fmt(live.young, 0)}% under 15 and ${fmt(live.old, 0)}% 65 or over.`}
      stage={<Stage label="Population pyramid" render={render} />}
      overlay={
        <Readouts>
          <Readout label="population" value={`${fmt(live.T, 1)}m`} />
          <Readout label="growth" value={isFinite(live.growth) ? `${live.growth >= 0 ? "+" : ""}${fmt(live.growth, 2)}%/yr` : "–"} color={live.growth >= 0 ? theme.c.green : theme.c.red} />
          <Readout label="median age" value={fmt(live.median, 1)} />
          <Readout label="dependency ratio" value={fmt(live.dep, 0)} />
        </Readouts>
      }
      controls={
        <>
          <Group title="Starting population (illustrative)">
            <Choice value={p.start} onChange={(start) => { const s = START[start]; set({ start, tfr: s.tfr, e0: s.e0, mig: s.mig }); setRunning(false); restart(start); }} options={(Object.keys(START) as Start[]).map((k) => ({ value: k, label: START[k].name }))} wrap />
          </Group>
          <Group title="From now on">
            <Slider label="Fertility (children per woman)" value={p.tfr} min={0.8} max={7} step={0.1} color={theme.c.green} onChange={(tfr) => set({ tfr })} hint="About 2.1 replaces each generation." />
            <Slider label="Life expectancy at birth" value={p.e0} min={45} max={90} step={1} unit="yrs" color={theme.c.red} onChange={(e0) => set({ e0 })} />
            <Slider label="Net migration" value={p.mig} min={-300} max={600} step={10} unit="k/yr" color={theme.c.violet} onChange={(mig) => set({ mig })} hint="Mostly people aged 20–39." />
            <Btn onClick={stepOnce}>Step 5 years</Btn>
          </Group>
        </>
      }
      learn={
        <>
          <H>Reading a pyramid</H>
          <p>Each bar is a 5-year age group, men on the left and women on the right, as a percentage of the whole population. A wide base means many young people (high birth rates); a narrow base and wide top mean an ageing population. The outline is the starting shape.</p>
          <H>What changes a population</H>
          <Eq>change = births − deaths + net migration</Eq>
          <p>Natural increase is births minus deaths. Fertility of about 2.1 children per woman replaces each generation (a little over 2 because not every child reaches adulthood).</p>
          <H>Momentum</H>
          <p>Even after fertility drops to replacement level, a young population keeps growing for decades, because so many people are about to reach parenting age. An ageing population can shrink even with immigration unless fertility rises or migration is large.</p>
          <H>The demographic transition</H>
          <p>As countries develop, death rates fall first (better health care, food, water) while birth rates stay high: rapid growth. Later birth rates fall too (education, especially of girls, contraception, urban living), and growth slows. Some countries then fall below replacement.</p>
          <Eq>dependency ratio = (under 15 + 65 and over) ⁄ (15 to 64) × 100</Eq>
          <Try>set the young country's fertility to 2.1 and press play. How many years until the population stops growing?</Try>
        </>
      }
    />
  );
}
