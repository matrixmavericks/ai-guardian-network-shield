import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Btn } from "../kit/controls";
import { TimeGraph } from "../kit/graph";
import { Plot, label, roundRect, fmt, TAU, type Ctx } from "../kit/draw";

// Rabbits and foxes: logistic growth for the prey, Lotka–Volterra predation.
// dR/dt = aR(1 − R/K) − bRF,  dF/dt = c·bRF − dF  (integrated with RK4)

type P = { a: number; K: number; b: number; c: number; d: number };
const DEF: P = { a: 0.8, K: 2500, b: 0.004, c: 0.12, d: 0.35 };
type S = { R: number; F: number; t: number; minF: number; maxR: number; animals: { x: number; y: number; vx: number; vy: number; fox: boolean }[] };

export function deriv(p: P, R: number, F: number): [number, number] {
  return [p.a * R * (1 - R / p.K) - p.b * R * F, p.c * p.b * R * F - p.d * F];
}
function rk4(s: S, p: P, h: number) {
  const [k1r, k1f] = deriv(p, s.R, s.F);
  const [k2r, k2f] = deriv(p, s.R + (h / 2) * k1r, s.F + (h / 2) * k1f);
  const [k3r, k3f] = deriv(p, s.R + (h / 2) * k2r, s.F + (h / 2) * k2f);
  const [k4r, k4f] = deriv(p, s.R + h * k3r, s.F + h * k3f);
  s.R = Math.max(0, s.R + (h / 6) * (k1r + 2 * k2r + 2 * k3r + k4r));
  s.F = Math.max(0, s.F + (h / 6) * (k1f + 2 * k2f + 2 * k3f + k4f));
  if (s.F < 0.5) s.F = 0; // a population can't come back from less than one animal
  if (s.R < 0.5) s.R = 0;
  s.t += h;
  s.minF = Math.min(s.minF, s.F);
  s.maxR = Math.max(s.maxR, s.R);
}
const fresh = (): S => ({ R: 400, F: 40, t: 0, minF: 40, maxR: 400, animals: [] });

function draw(ctx: Ctx, w: number, h: number, p: P, s: S, hist: number[][], t: SimTheme, dt: number) {
  // Meadow
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, t.dark ? "#14361f" : "#bbf7d0"); g.addColorStop(1, t.dark ? "#0a2414" : "#86efac");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = t.dark ? "rgba(74,222,128,0.12)" : "rgba(21,128,61,0.12)";
  for (let i = 0; i < 160; i++) { const x = (i * 83.7) % w, y = 70 + ((i * 47.3) % (h - 80)); ctx.fillRect(x, y, 2, 6); }
  // One icon per 10 rabbits and per 2 foxes
  const wantR = Math.min(120, Math.round(s.R / 10)), wantF = Math.min(60, Math.round(s.F / 2));
  const have = { r: s.animals.filter((a) => !a.fox).length, f: s.animals.filter((a) => a.fox).length };
  for (let i = have.r; i < wantR; i++) s.animals.push({ x: Math.random() * w, y: 80 + Math.random() * (h - 100), vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, fox: false });
  for (let i = have.f; i < wantF; i++) s.animals.push({ x: Math.random() * w, y: 80 + Math.random() * (h - 100), vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, fox: true });
  let dr = have.r - wantR, df = have.f - wantF;
  s.animals = s.animals.filter((a) => { if (!a.fox && dr > 0) { dr--; return false; } if (a.fox && df > 0) { df--; return false; } return true; });
  ctx.font = "20px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const a of s.animals) {
    a.vx += (Math.random() - 0.5) * 40 * dt; a.vy += (Math.random() - 0.5) * 40 * dt;
    a.x += a.vx * dt; a.y += a.vy * dt;
    if (a.x < 10 || a.x > w - 10) a.vx *= -1; if (a.y < 80 || a.y > h - 14) a.vy *= -1;
    a.x = Math.min(w - 10, Math.max(10, a.x)); a.y = Math.min(h - 14, Math.max(80, a.y));
    ctx.fillText(a.fox ? "🦊" : "🐇", a.x, a.y);
  }
  // Phase plot: foxes against rabbits
  const pw = Math.min(220, w * 0.3), ph = 160, px = w - pw - 14, py = h - ph - 14;
  ctx.fillStyle = t.panel; roundRect(ctx, px, py, pw, ph, 12); ctx.fill();
  const maxR = Math.max(100, ...hist.map((r) => r[1])) * 1.1, maxF = Math.max(20, ...hist.map((r) => r[2])) * 1.1;
  const pl = new Plot(px + 34, py + 12, pw - 46, ph - 40, 0, maxR, 0, maxF);
  pl.axes(ctx, t, { xLabel: "rabbits", yLabel: "foxes", xTicks: 2, yTicks: 2 });
  ctx.strokeStyle = t.c.violet; ctx.lineWidth = 1.5;
  ctx.beginPath(); hist.forEach((r, i) => (i ? ctx.lineTo(pl.X(r[1]), pl.Y(r[2])) : ctx.moveTo(pl.X(r[1]), pl.Y(r[2])))); ctx.stroke();
  ctx.fillStyle = t.c.violet; ctx.beginPath(); ctx.arc(pl.X(s.R), pl.Y(s.F), 4, 0, TAU); ctx.fill();
  label(ctx, `year ${Math.floor(s.t)}`, w - 16, 32, { color: t.ink, size: 20, weight: 700, align: "right" });
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const s = fresh();
  const hist: number[][] = [];
  for (let i = 0; i < 1500; i++) { rk4(s, DEF, 0.02); if (i % 10 === 0) hist.push([s.t, s.R, s.F]); }
  draw(ctx, w * 1.2, h * 1.15, DEF, s, hist, t, 0);
}

export default function Ecosystem() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { a: [0.1, 2], K: [200, 3000], b: [0.001, 0.02], c: [0.02, 0.5], d: [0.05, 1.5] });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const sim = useRef<S>(fresh());
  const graph = useRef<number[][]>([]);
  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const s = sim.current;
    if (running) {
      let left = dt * speed * 2; // years per second
      while (left > 0) { const hh = Math.min(0.02, left); rk4(s, p, hh); left -= hh; }
      const g = graph.current;
      if (!g.length || s.t - g[g.length - 1][0] > 0.1) g.push([s.t, s.R, s.F]);
      if (g.length > 3000) g.splice(0, 500);
    }
    draw(ctx, w, h, p, s, graph.current.slice(-400), theme, running ? dt : 0);
  };
  const live = useLive(() => { const g = graph.current.slice(-200); const rs = g.map((r) => r[1]); const mean = rs.reduce((a, b) => a + b, 0) / Math.max(1, rs.length); const sd = Math.sqrt(rs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rs.length)); return { R: sim.current.R, F: sim.current.F, t: sim.current.t, steady: rs.length > 150 && mean > 1 && sd / mean < 0.01, minF: sim.current.minF, maxR: sim.current.maxR, meanF: g.reduce((a, r) => a + r[2], 0) / Math.max(1, g.length) }; }, 6);
  const event = (k: "disease" | "cull" | "foxes") => { const s = sim.current; if (k === "disease") s.F *= 0.3; else if (k === "cull") s.R *= 0.4; else s.F += 20; s.minF = Math.min(s.minF, s.F); };
  // Equilibrium (coexistence) point, when it exists
  const Rstar = p.d / (p.c * p.b), Fstar = (p.a / p.b) * (1 - Rstar / p.K);
  const challenges = [
    { id: "extinct", title: "Make the foxes die out", detail: "Which change starves them? Then watch the rabbits.", done: live.F === 0 && live.t > 2 },
    { id: "boom", title: "Get a rabbit boom: more than 2800 rabbits at once", detail: "What limits how many rabbits there can be?", done: live.maxR > 2800 },
    { id: "many", title: "Keep both species alive for 100 years with at least 200 foxes on average", detail: "Over the most recent stretch of time. The foxes need more food or live longer.", done: live.t >= 100 && live.minF > 0 && live.meanF >= 200 },
  ];

  return (
    <SimShell
      id="ecosystem"
      running={running}
      onRun={setRunning}
      speed={speed}
      onSpeed={setSpeed}
      onReset={() => { sim.current = fresh(); graph.current = []; }}
      challenges={challenges}
      record={() => ({ year: +live.t.toFixed(1), rabbits: Math.round(live.R), foxes: Math.round(live.F), "rabbit growth a": p.a, "carrying capacity K": p.K, "hunting b": p.b, "fox efficiency c": p.c, "fox death d": p.d })}
      ask={() => `Predator–prey model: rabbit growth ${p.a} a year, carrying capacity ${p.K}, hunting rate ${p.b}, fox efficiency ${p.c}, fox death rate ${p.d}. After ${fmt(live.t, 0)} years: ${Math.round(live.R)} rabbits and ${Math.round(live.F)} foxes.${Fstar > 0 ? ` The populations would balance at about ${Math.round(Rstar)} rabbits and ${Math.round(Fstar)} foxes.` : " Foxes can't survive on these settings."}`}
      stage={<Stage label="Rabbits and foxes in a meadow" render={render} />}
      overlay={
        <Readouts>
          <Readout label="rabbits" value={String(Math.round(live.R))} color="#a16207" />
          <Readout label="foxes" value={String(Math.round(live.F))} color="#ea580c" />
        </Readouts>
      }
      below={<TimeGraph title="Populations" data={graph} yLabel="number" window={40} series={[{ label: "rabbits", color: theme.c.amber }, { label: "foxes", color: theme.c.red }]} />}
      controls={
        <>
          <Group title="Rabbits (prey)">
            <Slider label="Birth rate" value={p.a} min={0.1} max={2} step={0.05} unit="/yr" color={theme.c.amber} onChange={(a) => set({ a })} />
            <Slider label="Carrying capacity" value={p.K} min={200} max={3000} step={50} color={theme.c.amber} onChange={(K) => set({ K })} hint="How many rabbits the grass can feed." />
          </Group>
          <Group title="Foxes (predators)">
            <Slider label="Hunting success" value={p.b} min={0.001} max={0.02} step={0.0005} digits={4} color={theme.c.red} onChange={(b) => set({ b })} />
            <Slider label="Food to new foxes" value={p.c} min={0.02} max={0.5} step={0.01} color={theme.c.red} onChange={(c) => set({ c })} />
            <Slider label="Death rate" value={p.d} min={0.05} max={1.5} step={0.05} unit="/yr" color={theme.c.red} onChange={(d) => set({ d })} />
          </Group>
          <Group title="Events">
            <div className="grid grid-cols-1 gap-1.5">
              <Btn onClick={() => event("disease")}>Disease kills 70% of foxes</Btn>
              <Btn onClick={() => event("cull")}>Farmers cull 60% of rabbits</Btn>
              <Btn onClick={() => event("foxes")}>Release 20 foxes</Btn>
              <Btn onClick={() => resetP()}>Default settings</Btn>
            </div>
          </Group>
        </>
      }
      learn={
        <>
          <H>Linked populations</H>
          <p>More rabbits mean more food for foxes, so foxes increase. More foxes eat more rabbits, so rabbits fall. Then foxes go hungry and fall, and rabbits recover. The predator peak comes after the prey peak.</p>
          <Eq>dR/dt = aR(1 − R/K) − bRF &nbsp;&nbsp; dF/dt = c·bRF − dF</Eq>
          <p>The first part of the rabbit equation is logistic growth: fast when there are few, levelling off at the carrying capacity K. The bRF terms are meetings between rabbits and foxes that end in a meal.</p>
          <H>The phase plot</H>
          <p>Plotting foxes against rabbits turns the cycles into a loop. A spiral inwards means the cycles are dying down towards a balance point; a closed loop means they repeat.</p>
          <H>Real ecosystems</H>
          <p>Real food webs have many species, disease, weather and migration, so cycles are messier. The classic example is the Canada lynx and snowshoe hare, whose numbers rose and fell about every 10 years in fur-trading records.</p>
          <Try>predict what happens to the foxes, then the rabbits, after a disease kills 70% of the foxes. Then test it.</Try>
        </>
      }
    />
  );
}
