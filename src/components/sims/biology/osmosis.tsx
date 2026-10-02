import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice } from "../kit/controls";
import { TimeGraph } from "../kit/graph";
import { gauss, label, roundRect, sphere, fmt, TAU, type Ctx } from "../kit/draw";

// Water and solute particles either side of a membrane. In osmosis mode only
// water can pass; each side's level rises or falls with the water that crosses,
// until the extra height pushes back. In diffusion mode both can pass.

type Mode = "osmosis" | "diffusion";
type P = { mode: Mode; sL: number; sR: number; temp: number; pores: number };
const DEF: P = { mode: "osmosis", sL: 20, sR: 60, temp: 37, pores: 0.5 };

type Pt = { x: number; y: number; vx: number; vy: number; side: 0 | 1; kind: "w" | "s" };
type S = { pts: Pt[]; t: number; moved: number };
const WATER = 360; // water particles (split evenly at the start)
const DENSITY = WATER / 2 + 70; // particles per chamber at the starting level
const r = { w: 0.006, s: 0.016 };

/** Height of the liquid on one side (fraction of the tank), from what's in it */
const level = (s: S, side: 0 | 1) => {
  let n = 0;
  for (const q of s.pts) if (q.side === side) n += q.kind === "w" ? 1 : 2.2; // solute takes more room
  return Math.min(0.96, (0.62 * n) / DENSITY);
};

function seed(p: P): S {
  const pts: Pt[] = [];
  const sd = () => 0.22 * Math.sqrt((p.temp + 273) / 310);
  const add = (side: 0 | 1, kind: "w" | "s", n: number) => { for (let i = 0; i < n; i++) pts.push({ x: side * 0.5 + 0.03 + Math.random() * 0.44, y: 1 - Math.random() * 0.5, vx: gauss() * sd(), vy: gauss() * sd(), side, kind }); };
  // Both sides start at the same level: water fills whatever room the solute leaves
  const avg = (p.sL + p.sR) / 2;
  add(0, "w", Math.round(WATER / 2 + 2.2 * (avg - p.sL))); add(1, "w", Math.round(WATER / 2 + 2.2 * (avg - p.sR)));
  add(0, "s", p.sL); add(1, "s", p.sR);
  return { pts, t: 0, moved: 0 };
}

function step(s: S, p: P, h: number) {
  const lv = [level(s, 0), level(s, 1)];
  const speedScale = Math.sqrt((p.temp + 273) / 310);
  for (const q of s.pts) {
    // Keep each particle's speed near the temperature (gentle thermostat)
    const sp = Math.hypot(q.vx, q.vy), want = 0.3 * speedScale * (q.kind === "s" ? 0.6 : 1);
    if (sp > 0) { const f = 1 + (want / sp - 1) * 0.02; q.vx *= f; q.vy *= f; }
    q.x += q.vx * h; q.y += q.vy * h;
    const rr = r[q.kind];
    const top = 1 - lv[q.side];
    if (q.y < top + rr) { q.y = top + rr; q.vy = Math.abs(q.vy); }
    if (q.y > 1 - rr) { q.y = 1 - rr; q.vy = -Math.abs(q.vy); }
    // Walls, and the membrane in the middle (checked from whichever side the particle is on)
    const m0 = 0.5 - 0.006 - rr, m1 = 0.5 + 0.006 + rr;
    const canPass = q.kind === "w" || p.mode === "diffusion";
    const below = q.y > 1 - Math.min(lv[0], lv[1]); // only where both sides have liquid
    if (q.side === 0) {
      if (q.x < rr) { q.x = rr; q.vx = Math.abs(q.vx); }
      if (q.x > m0) {
        if (canPass && below && Math.random() < p.pores * (1 + 2.5 * (lv[0] - lv[1]))) { q.side = 1; q.x = m1 + 0.001; if (q.kind === "w") s.moved -= 1; }
        else { q.x = m0; q.vx = -Math.abs(q.vx); }
      }
    } else {
      if (q.x > 1 - rr) { q.x = 1 - rr; q.vx = -Math.abs(q.vx); }
      if (q.x < m1) {
        if (canPass && below && Math.random() < p.pores * (1 + 2.5 * (lv[1] - lv[0]))) { q.side = 0; q.x = m0 - 0.001; if (q.kind === "w") s.moved += 1; }
        else { q.x = m1; q.vx = Math.abs(q.vx); }
      }
    }
  }
  s.t += h;
}

const counts = (s: S) => {
  const c = { w: [0, 0], s: [0, 0] };
  for (const q of s.pts) c[q.kind][q.side]++;
  return c;
};

function draw(ctx: Ctx, w: number, h: number, p: P, s: S, t: SimTheme, top = 92) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, t.dark ? "#0b1324" : "#f1f5fb"); bg.addColorStop(1, t.dark ? "#050a16" : "#e2e8f2");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const size = Math.min(w - (top < 50 ? 24 : 80), (h - top - 18) * 1.6);
  const x0 = (w - size) / 2, y0 = top, tw = size, th = h - y0 - (top < 50 ? 10 : 30);
  const X = (u: number) => x0 + u * tw, Y = (v: number) => y0 + v * th;
  const lv = [level(s, 0), level(s, 1)];
  // Liquid on each side
  for (const side of [0, 1] as const) {
    const g = ctx.createLinearGradient(0, Y(1 - lv[side]), 0, Y(1));
    g.addColorStop(0, t.dark ? "rgba(56,189,248,0.35)" : "rgba(14,165,233,0.25)"); g.addColorStop(1, t.dark ? "rgba(14,116,144,0.55)" : "rgba(14,116,144,0.35)");
    ctx.fillStyle = g; ctx.fillRect(X(side * 0.5 + (side ? 0.006 : 0)), Y(1 - lv[side]), tw * (0.5 - 0.006), th * lv[side]);
    ctx.strokeStyle = t.dark ? "rgba(186,230,253,0.7)" : "rgba(3,105,161,0.6)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(side * 0.5 + (side ? 0.006 : 0)), Y(1 - lv[side])); ctx.lineTo(X(side * 0.5 + 0.5 - (side ? 0 : 0.006)), Y(1 - lv[side])); ctx.stroke();
  }
  // Glass tank
  ctx.strokeStyle = t.dark ? "rgba(226,232,240,0.6)" : "rgba(51,65,85,0.6)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(0), Y(1)); ctx.lineTo(X(1), Y(1)); ctx.lineTo(X(1), Y(0)); ctx.stroke();
  // Membrane with pores
  ctx.fillStyle = p.mode === "osmosis" ? "#a78bfa" : "rgba(167,139,250,0.35)";
  for (let v = 0; v < 1; v += 0.03) ctx.fillRect(X(0.5) - 2, Y(v), 4, th * 0.03 * (1 - p.pores * 0.6));
  label(ctx, p.mode === "osmosis" ? "partially permeable membrane" : "membrane: everything can pass", X(0.5), Y(0) - 14, { color: t.c.violet, size: 11.5, weight: 700 });
  // Particles
  for (const q of s.pts) {
    if (q.kind === "w") { ctx.fillStyle = t.dark ? "#7dd3fc" : "#0284c7"; ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), Math.max(1.6, r.w * th), 0, TAU); ctx.fill(); }
    else sphere(ctx, X(q.x), Y(q.y), Math.max(3.5, r.s * th), "#f59e0b");
  }
  // Level difference marker
  const d = (lv[0] - lv[1]) * th;
  if (Math.abs(d) > 4) {
    const xm = X(lv[0] > lv[1] ? 0.04 : 0.96);
    ctx.strokeStyle = t.c.green; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xm, Y(1 - lv[0])); ctx.lineTo(xm, Y(1 - lv[1])); ctx.stroke();
    label(ctx, `${fmt(Math.abs(d) / th * 100, 0)} mm higher`, xm + (lv[0] > lv[1] ? 10 : -10), (Y(1 - lv[0]) + Y(1 - lv[1])) / 2, { color: t.c.green, size: 11.5, weight: 700, align: lv[0] > lv[1] ? "left" : "right", halo: true });
  }
  // Key
  ctx.fillStyle = t.panel; roundRect(ctx, w - 190, 16, 176, 50, 10); ctx.fill();
  ctx.fillStyle = t.dark ? "#7dd3fc" : "#0284c7"; ctx.beginPath(); ctx.arc(w - 174, 32, 3, 0, TAU); ctx.fill();
  label(ctx, "water molecule", w - 162, 32, { color: t.soft, size: 11.5, align: "left" });
  sphere(ctx, w - 174, 52, 5, "#f59e0b");
  label(ctx, "solute (e.g. sugar)", w - 162, 52, { color: t.soft, size: 11.5, align: "left" });
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const s = seed(DEF);
  for (let i = 0; i < 400; i++) step(s, DEF, 0.02);
  draw(ctx, w, h, DEF, s, t, 12);
}

export default function Osmosis() {
  const theme = useSimTheme();
  const [p, set] = useSimParams<P>(DEF, { mode: ["osmosis", "diffusion"], sL: [0, 150], sR: [0, 150], temp: [0, 80], pores: [0.05, 1] });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const sim = useRef<S>(seed(p));
  const graph = useRef<number[][]>([]);
  const reset = (q: P = p) => { sim.current = seed(q); graph.current = []; };
  const change = (patch: Partial<P>) => { const q = { ...p, ...patch }; set(patch); reset(q); };

  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const s = sim.current;
    if (running) {
      const n = Math.max(1, Math.ceil((dt * speed) / 0.01));
      for (let i = 0; i < n; i++) step(s, p, (dt * speed) / n);
      const g = graph.current;
      if (!g.length || s.t - g[g.length - 1][0] > 0.2) { const c = counts(s); g.push([s.t, (level(s, 0) - level(s, 1)) * 100, ((c.s[0] - c.s[1]) / Math.max(1, c.s[0] + c.s[1])) * 100]); }
    }
    draw(ctx, w, h, p, s, theme);
  };
  const live = useLive(() => { const s = sim.current; const c = counts(s); return { c, dl: (level(s, 0) - level(s, 1)) * 100, t: s.t, moved: s.moved }; }, 6);
  const conc = (side: 0 | 1) => (live.c.s[side] / Math.max(1, live.c.w[side] + live.c.s[side])) * 100;
  const challenges = [
    { id: "left", title: "Make water move into the left side so its level rises 15 mm or more", detail: "Osmosis. Where does water go: towards more solute or less?", done: p.mode === "osmosis" && live.dl >= 15 },
    { id: "equal", title: "Set up the two sides so the levels don't change", detail: "Osmosis with equal solute both sides; run for 20 seconds.", done: p.mode === "osmosis" && p.sL === p.sR && live.t > 20 && Math.abs(live.dl) < 3 },
    { id: "even", title: "Diffusion: start with all the solute on the left and let it even out", detail: "Within 10% of each other. No solute on the right at the start.", done: p.mode === "diffusion" && p.sR === 0 && p.sL >= 40 && Math.abs(live.c.s[0] - live.c.s[1]) <= 0.1 * (live.c.s[0] + live.c.s[1]) },
    { id: "fast", title: "Make diffusion even out in under 15 seconds", detail: "What speeds particles up?", done: p.mode === "diffusion" && p.sR === 0 && p.sL >= 40 && live.t < 15 && Math.abs(live.c.s[0] - live.c.s[1]) <= 0.1 * (live.c.s[0] + live.c.s[1]) },
  ];

  return (
    <SimShell
      id="osmosis"
      running={running}
      onRun={setRunning}
      speed={speed}
      onSpeed={setSpeed}
      onReset={() => reset()}
      challenges={challenges}
      record={() => ({ "solute left": p.sL, "solute right": p.sR, "temperature (°C)": p.temp, "time (s)": +live.t.toFixed(1), "level difference (mm)": +live.dl.toFixed(1), "water moved left": live.moved })}
      ask={() => `${p.mode === "osmosis" ? "Osmosis" : "Diffusion"} simulation: ${p.sL} solute particles on the left, ${p.sR} on the right at the start, ${p.temp} °C, membrane permeability ${p.pores}. After ${fmt(live.t, 0)} s the left level is ${fmt(live.dl, 0)} mm ${live.dl >= 0 ? "higher" : "lower"} and ${live.moved} more water molecules have moved left than right.`}
      stage={<Stage label={`${p.mode} across a membrane`} render={render} />}
      overlay={
        <Readouts>
          <Readout label="solute left" value={`${fmt(conc(0), 1)}%`} color="#f59e0b" />
          <Readout label="solute right" value={`${fmt(conc(1), 1)}%`} color="#f59e0b" />
          {p.mode === "osmosis" && <Readout label="left level" value={`${live.dl >= 0 ? "+" : ""}${fmt(live.dl, 0)} mm`} color={theme.c.green} />}
          {p.mode === "osmosis" && <Readout label="net water moved left" value={String(live.moved)} color={theme.c.blue} />}
        </Readouts>
      }
      below={<TimeGraph title={p.mode === "osmosis" ? "Left level minus right level" : "Difference in solute between the sides"} data={graph} yLabel={p.mode === "osmosis" ? "mm" : "%"} window={40} series={p.mode === "osmosis" ? [{ label: "level difference", color: theme.c.green }] : [{ label: "level difference", color: theme.c.green }, { label: "solute difference", color: theme.c.amber }]} />}
      controls={
        <>
          <Group title="Process">
            <Choice value={p.mode} onChange={(mode) => change({ mode })} options={[{ value: "osmosis", label: "Osmosis" }, { value: "diffusion", label: "Diffusion" }]} />
          </Group>
          <Group title="Starting solute">
            <Slider label="Solute on the left" value={p.sL} min={0} max={150} step={5} color="#f59e0b" onChange={(sL) => change({ sL })} />
            <Slider label="Solute on the right" value={p.sR} min={0} max={150} step={5} color="#f59e0b" onChange={(sR) => change({ sR })} />
          </Group>
          <Group title="Conditions">
            <Slider label="Temperature" value={p.temp} min={0} max={80} step={1} unit="°C" onChange={(temp) => set({ temp })} />
            <Slider label="Membrane pores" value={p.pores} min={0.05} max={1} step={0.05} onChange={(pores) => set({ pores })} hint="How easily particles that can pass get through." />
          </Group>
        </>
      }
      learn={
        <>
          <H>Diffusion</H>
          <p>Particles move randomly. Where there are more of them, more move away than come back, so there is a net movement from a higher concentration to a lower one until they are evenly spread. No energy from the cell is needed (it is passive). Higher temperature, a steeper concentration gradient and a bigger surface area make it faster.</p>
          <H>Osmosis</H>
          <p>Osmosis is the diffusion of water across a partially permeable membrane: water passes, larger solute particles (like sugar) don't. Water moves from a dilute solution (more water, higher water potential) to a more concentrated one (less water).</p>
          <Eq>dilute solution → concentrated solution (water moves)</Eq>
          <p>Here, the side that gains water rises until the extra weight of liquid pushes water back as fast as osmosis brings it in.</p>
          <H>In cells</H>
          <p>A plant cell in pure water takes in water and becomes turgid (the wall stops it bursting). In a concentrated solution it loses water and becomes plasmolysed. An animal cell has no wall: in pure water it can burst, and in a concentrated solution it shrivels.</p>
          <Try>predict which way water moves with 30 solute on the left and 90 on the right, then test it.</Try>
        </>
      }
    />
  );
}
