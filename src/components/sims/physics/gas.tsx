import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Switch } from "../kit/controls";
import { TimeGraph } from "../kit/graph";
import { Plot, gauss, label, roundRect, fmt, TAU, type Ctx } from "../kit/draw";

// An ideal gas as hard discs in a box with a piston. Pressure is measured from
// the momentum the particles give the walls; temperature from their kinetic energy.

const SPECIES = { helium: { name: "Helium", M: 4, color: "#38bdf8" }, nitrogen: { name: "Nitrogen", M: 28, color: "#a78bfa" }, xenon: { name: "Xenon", M: 131, color: "#f472b6" } } as const;
type Species = keyof typeof SPECIES;
type P = { N: number; T: number; V: number; gas: Species; thermo: boolean; collide: boolean };
const DEF: P = { N: 150, T: 300, V: 1, gas: "nitrogen", thermo: true, collide: true };

// Collision radius (box height = 1). Small, so the particles take up little of
// the box and the gas behaves ideally; they are drawn a little bigger.
const R = 0.004;
const DRAW_R = 0.009;
const VIS = 0.55;         // visual rms speed of nitrogen at 300 K, box-heights per second
const kOverM = (gas: Species) => ((VIS * VIS) / (2 * 300)) * (28 / SPECIES[gas].M); // 2D: <v²> = 2kT/m
const realVrms = (T: number, gas: Species) => Math.sqrt((3 * 8.314 * T) / (SPECIES[gas].M / 1000));
// Display pressure so the default set-up reads 100 kPa
const P_UNIT = 100 / ((150 * kOverM("nitrogen") * 300) / 1);

type Pt = { x: number; y: number; vx: number; vy: number };
type S = { pts: Pt[]; wall: number; wallTarget: number; impulse: number; pEMA: number; t: number; tKin: number };

const width = (V: number) => V; // box width in box-heights (box is 1 high), V in litres ↔ width

export function seed(p: P): S {
  const W = width(p.V);
  const sd = Math.sqrt(kOverM(p.gas) * p.T); // each velocity component ~ N(0, kT/m)
  const pts: Pt[] = [];
  for (let i = 0; i < p.N; i++) pts.push({ x: R + Math.random() * (W - 2 * R), y: R + Math.random() * (1 - 2 * R), vx: gauss() * sd, vy: gauss() * sd });
  return { pts, wall: W, wallTarget: W, impulse: 0, pEMA: (p.N * kOverM(p.gas) * p.T) / W, t: 0, tKin: p.T };
}
const kinT = (s: S, gas: Species) => s.pts.reduce((a, q) => a + q.vx * q.vx + q.vy * q.vy, 0) / (2 * s.pts.length * kOverM(gas));

export function step(s: S, p: P, h: number) {
  if (!(h > 0)) return; // a zero-length frame would make the pressure 0/0
  const W0 = s.wall;
  // Piston glides towards where it was dragged; its speed matters (it does work)
  const u = Math.max(-0.6, Math.min(0.6, (s.wallTarget - s.wall) * 6));
  s.wall += u * h;
  const W = s.wall;
  let imp = 0;
  for (const q of s.pts) {
    q.x += q.vx * h; q.y += q.vy * h;
    if (q.x < R) { q.x = 2 * R - q.x; imp += 2 * Math.abs(q.vx); q.vx = Math.abs(q.vx); }
    if (q.x > W - R) {
      // Bounce off a moving wall: reflect the velocity relative to it
      q.x = 2 * (W - R) - q.x;
      const rel = q.vx - u;
      if (rel > 0) { imp += 2 * rel; q.vx = u - rel; }
    }
    if (q.y < R) { q.y = 2 * R - q.y; imp += 2 * Math.abs(q.vy); q.vy = Math.abs(q.vy); }
    if (q.y > 1 - R) { q.y = 2 * (1 - R) - q.y; imp += 2 * Math.abs(q.vy); q.vy = -Math.abs(q.vy); }
  }
  if (p.collide) {
    // Elastic collisions between equal discs (simple grid)
    const cell = Math.max(4 * R, 0.02), cols = Math.ceil(W / cell) + 1, grid = new Map<number, number[]>();
    s.pts.forEach((q, i) => { const k = Math.floor(q.y / cell) * cols + Math.floor(q.x / cell); const a = grid.get(k); if (a) a.push(i); else grid.set(k, [i]); });
    for (const [k, list] of grid) {
      const cx = k % cols, cy = Math.floor(k / cols);
      for (const dx of [0, 1]) for (const dy of [-1, 0, 1]) {
        if (dx === 0 && dy === -1) continue;
        const other = dx === 0 && dy === 0 ? list : grid.get((cy + dy) * cols + cx + dx);
        if (!other) continue;
        for (let a = 0; a < list.length; a++) for (let b = dx === 0 && dy === 0 ? a + 1 : 0; b < other.length; b++) {
          const A = s.pts[list[a]], B = s.pts[other[b]];
          const ddx = B.x - A.x, ddy = B.y - A.y, d2 = ddx * ddx + ddy * ddy;
          if (d2 > 4 * R * R || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = ddx / d, ny = ddy / d;
          const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
          if (rv >= 0) continue;
          A.vx += rv * nx; A.vy += rv * ny; B.vx -= rv * nx; B.vy -= rv * ny;
          const push = (2 * R - d) / 2; A.x -= nx * push; A.y -= ny * push; B.x += nx * push; B.y += ny * push;
        }
      }
    }
  }
  // Thermostat: gently pull the kinetic temperature to the set value
  if (p.thermo) {
    const T = kinT(s, p.gas);
    if (T > 0) { const f = Math.sqrt(1 + (p.T / T - 1) * Math.min(1, h * 4)); for (const q of s.pts) { q.vx *= f; q.vy *= f; } }
  }
  s.impulse += imp;
  s.t += h;
  // Pressure = momentum per second per unit length of wall, smoothed over about 3 s
  const per = 2 * (W + 1);
  const inst = imp / h / per;
  s.pEMA += (inst - s.pEMA) * Math.min(1, h / 3);
  s.tKin += (kinT(s, p.gas) - s.tKin) * Math.min(1, h / 0.3);
  void W0;
}

function draw(ctx: Ctx, w: number, h: number, p: P, s: S, t: SimTheme, o: { hist: boolean }) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, t.dark ? "#0b1324" : "#eef2f8"); bg.addColorStop(1, t.dark ? "#050a16" : "#dfe6f0");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const histW = o.hist ? Math.min(260, w * 0.32) : 0;
  const boxH = h - 110, maxW = 1.6;
  const sc = Math.min(boxH, (w - histW - 120) / maxW);
  const ox = 40, oy = 40;
  const W = s.wall;
  // Heater glow under the box
  const heat = Math.min(1, s.tKin / 900);
  const hg = ctx.createLinearGradient(0, oy + sc, 0, oy + sc + 40);
  hg.addColorStop(0, `rgba(255,${Math.round(120 - 60 * heat)},40,${0.15 + 0.6 * heat})`); hg.addColorStop(1, "rgba(255,80,40,0)");
  ctx.fillStyle = hg; ctx.fillRect(ox, oy + sc, maxW * sc, 40);
  // Box (glass) and the piston
  ctx.fillStyle = t.dark ? "rgba(56,189,248,0.05)" : "rgba(14,116,144,0.05)";
  ctx.fillRect(ox, oy, W * sc, sc);
  ctx.strokeStyle = t.dark ? "#94a3b8" : "#475569"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(ox + maxW * sc + 30, oy); ctx.lineTo(ox, oy); ctx.lineTo(ox, oy + sc); ctx.lineTo(ox + maxW * sc + 30, oy + sc); ctx.stroke();
  const px = ox + W * sc;
  const pg = ctx.createLinearGradient(px, 0, px + 18, 0);
  pg.addColorStop(0, "#94a3b8"); pg.addColorStop(0.5, "#e2e8f0"); pg.addColorStop(1, "#64748b");
  ctx.fillStyle = pg; roundRect(ctx, px, oy + 2, 18, sc - 4, 3); ctx.fill();
  ctx.fillStyle = t.dark ? "#64748b" : "#94a3b8"; ctx.fillRect(px + 18, oy + sc / 2 - 5, maxW * sc + 40 - W * sc, 10);
  roundRect(ctx, ox + maxW * sc + 34, oy + sc / 2 - 26, 16, 52, 6); ctx.fill();
  label(ctx, "drag the piston", ox + maxW * sc + 42, oy + sc / 2 + 44, { color: t.mute, size: 10.5 });
  // Particles, coloured by speed
  const vr = Math.sqrt(2 * kOverM(p.gas) * 300);
  for (const q of s.pts) {
    const sp = Math.hypot(q.vx, q.vy) / vr;
    const hue = Math.max(0, 230 - sp * 120);
    ctx.fillStyle = `hsl(${hue}, 90%, ${t.dark ? 62 : 48}%)`;
    ctx.beginPath(); ctx.arc(ox + q.x * sc, oy + q.y * sc, Math.max(2.4, DRAW_R * sc), 0, TAU); ctx.fill();
  }
  label(ctx, `V = ${fmt(W, 2)} L`, ox + (W * sc) / 2, oy + sc + 20, { color: t.soft, size: 12, weight: 600 });
  // Speed histogram against the Maxwell–Boltzmann curve (2D)
  if (o.hist) {
    const hx = w - histW - 16, hy = 50, hh = Math.min(220, h - 120);
    const vmax = 3 * Math.sqrt(2 * kOverM(p.gas) * Math.max(50, s.tKin));
    const bins = 22, counts = new Array(bins).fill(0);
    for (const q of s.pts) { const b = Math.floor((Math.hypot(q.vx, q.vy) / vmax) * bins); if (b < bins) counts[b]++; }
    const pl = new Plot(hx + 10, hy, histW - 20, hh, 0, vmax, 0, Math.max(...counts, 1) * 1.25);
    const kT = kOverM(p.gas) * Math.max(1, s.tKin);
    const dv = vmax / bins;
    pl.axes(ctx, t, { xLabel: "speed", yLabel: "particles", xTicks: 3, yTicks: 3, xFmt: () => "" });
    counts.forEach((c, i) => { ctx.fillStyle = t.dark ? "rgba(96,165,250,0.6)" : "rgba(37,99,235,0.5)"; ctx.fillRect(pl.X(i * dv) + 1, pl.Y(c), pl.X(dv) - pl.X(0) - 2, pl.Y(0) - pl.Y(c)); });
    pl.fn(ctx, (v) => p.N * dv * (v / kT) * Math.exp((-v * v) / (2 * kT)), t.c.amber, 2.5);
    label(ctx, "Maxwell–Boltzmann", hx + histW - 12, hy + 10, { color: t.c.amber, size: 10.5, weight: 600, align: "right" });
  }
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const p = { ...DEF, N: 90 };
  draw(ctx, w * 1.3, h * 1.35, p, seed(p), t, { hist: false });
}

export default function Gas() {
  const theme = useSimTheme();
  const [p, set] = useSimParams<P>(DEF, { N: [10, 400], T: [50, 1500], V: [0.3, 1.5], gas: Object.keys(SPECIES) });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [hist, setHist] = useState(true);
  const sim = useRef<S>(seed(p));
  const graph = useRef<number[][]>([]);
  const geo = useRef({ px: 0, oy: 0, sc: 1, ox: 0 });
  const dragging = useRef(false);
  const start = useRef({ T: p.T, V: p.V, N: p.N });
  const reseed = (q: P) => { sim.current = seed(q); graph.current = []; start.current = { T: q.T, V: q.V, N: q.N }; };

  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const s = sim.current;
    if (running) {
      const n = Math.max(1, Math.ceil((dt * speed) / (1 / 240)));
      for (let i = 0; i < n; i++) step(s, p, (dt * speed) / n);
      const g = graph.current;
      const ideal = (p.N * kOverM(p.gas) * s.tKin) / s.wall;
      if (!g.length || s.t - g[g.length - 1][0] > 1 / 15) g.push([s.t, s.pEMA * P_UNIT * kOverM("nitrogen") / kOverM(p.gas), ideal * P_UNIT * kOverM("nitrogen") / kOverM(p.gas)]);
      if (g.length > 2000) g.splice(0, 500);
    }
    const histW = hist ? Math.min(260, w * 0.32) : 0;
    const sc = Math.min(h - 110, (w - histW - 120) / 1.6);
    geo.current = { px: 40 + s.wall * sc, oy: 40, sc, ox: 40 };
    draw(ctx, w, h, p, s, theme, { hist });
  };
  const onDown = (pt: { x: number; y: number }) => {
    const g = geo.current;
    if (pt.x > g.px - 16 && pt.y > g.oy && pt.y < g.oy + g.sc) { dragging.current = true; return true; }
    return false;
  };
  const onMove = (pt: { x: number; y: number }, down: boolean) => {
    if (!down || !dragging.current) return;
    const g = geo.current;
    const W = Math.max(0.3, Math.min(1.5, (pt.x - g.ox) / g.sc));
    sim.current.wallTarget = W;
  };
  const onUp = () => { dragging.current = false; set({ V: Math.round(sim.current.wallTarget * 100) / 100 }); };

  // Pressure is the same whatever the gas, so display it on one scale
  const toKPa = (raw: number) => (raw * P_UNIT * kOverM("nitrogen")) / kOverM(p.gas);
  const live = useLive(() => { const s = sim.current; return { P: toKPa(s.pEMA), Pid: toKPa((p.N * kOverM(p.gas) * s.tKin) / s.wall), T: s.tKin, V: s.wall }; }, 6);

  const challenges = [
    { id: "boyle", title: "Reach 200 kPa by changing only the volume", detail: "Keep 150 particles at 300 K with the thermostat on.", done: p.thermo && p.N === 150 && p.T === 300 && Math.abs(live.P - 200) <= 10 },
    { id: "gay", title: "Reach 200 kPa by changing only the temperature", detail: "Keep 150 particles in 1.00 L.", done: p.thermo && p.N === 150 && Math.abs(live.V - 1) < 0.01 && Math.abs(live.P - 200) <= 10 },
    { id: "adiabatic", title: "Heat the gas above 450 K just by pushing the piston in", detail: "Turn the thermostat off first, with the temperature set to 300 K or less. Push quickly.", done: !p.thermo && p.T <= 300 && live.T > 450 },
  ];

  return (
    <SimShell
      id="gas"
      running={running}
      onRun={setRunning}
      onReset={() => reseed(p)}
      speed={speed}
      onSpeed={setSpeed}
      challenges={challenges}
      record={() => ({ N: p.N, "T (K)": +live.T.toFixed(1), "V (L)": +live.V.toFixed(3), "P measured (kPa)": +live.P.toFixed(1), "P ideal (kPa)": +live.Pid.toFixed(1), "1/V (L⁻¹)": +(1 / live.V).toFixed(4), "PV/T": +((live.P * live.V) / live.T).toFixed(4) })}
      ask={() => `Gas simulation: ${p.N} ${SPECIES[p.gas].name} particles, temperature ${fmt(live.T, 0)} K (thermostat ${p.thermo ? "on" : "off"}), volume ${fmt(live.V, 2)} L. Measured pressure ${fmt(live.P, 0)} kPa; ideal gas law gives ${fmt(live.Pid, 0)} kPa.`}
      stage={<Stage label={`${p.N} gas particles in a box`} render={render} onDown={onDown} onMove={onMove} onUp={onUp} cursor="ew-resize" />}
      overlay={
        <Readouts>
          <Readout label="pressure" value={live.P} unit="kPa" digits={0} color={theme.c.blue} />
          <Readout label="temperature" value={live.T} unit="K" digits={0} color={theme.c.orange} />
          <Readout label="volume" value={live.V} unit="L" />
          <Readout label="rms speed" value={realVrms(live.T, p.gas)} unit="m/s" digits={0} />
        </Readouts>
      }
      below={<TimeGraph title="Pressure" data={graph} yLabel="P / kPa" window={15} series={[{ label: "measured from collisions", color: theme.c.blue }, { label: "ideal gas law", color: theme.c.amber, dash: true }]} />}
      controls={
        <>
          <Group title="Gas">
            <Choice value={p.gas} onChange={(gas) => { const q = { ...p, gas }; set({ gas }); reseed(q); }} options={(Object.keys(SPECIES) as Species[]).map((k) => ({ value: k, label: SPECIES[k].name }))} />
            <Slider label="Particles" value={p.N} min={10} max={400} step={10} onChange={(N) => { const q = { ...p, N }; set({ N }); reseed({ ...q, V: sim.current.wall }); }} />
            <Slider label="Temperature" value={p.T} min={50} max={1500} step={10} unit="K" color={theme.c.orange} onChange={(T) => set({ T })} hint={p.thermo ? "The thermostat holds the gas at this temperature." : "Thermostat off: no heat in or out."} />
            <Slider label="Volume" value={p.V} min={0.3} max={1.5} step={0.01} unit="L" onChange={(V) => { set({ V }); sim.current.wallTarget = V; }} hint="Or drag the piston." />
          </Group>
          <Group title="Options">
            <Switch label="Thermostat" checked={p.thermo} onChange={(thermo) => set({ thermo })} />
            <Switch label="Particles collide with each other" checked={p.collide} onChange={(collide) => set({ collide })} hint="Collisions share energy out into the Maxwell–Boltzmann spread." />
            <Switch label="Speed distribution" checked={hist} onChange={setHist} />
          </Group>
        </>
      }
      learn={
        <>
          <H>Pressure from collisions</H>
          <p>Every time a particle bounces off a wall, its momentum changes and it pushes on the wall. Billions of these pushes every second add up to a steady force: pressure = force ÷ area.</p>
          <H>Temperature is average kinetic energy</H>
          <p>Hotter means faster particles on average (absolute temperature in kelvin is proportional to the mean kinetic energy). At 0 K they would stop. Heavier particles move more slowly at the same temperature, but hit harder, so the pressure is the same.</p>
          <H>The gas laws</H>
          <Eq>p V = n R T</Eq>
          <p>At constant temperature, halve the volume and the pressure doubles (Boyle's law, p ∝ 1/V). At constant volume, double the kelvin temperature and the pressure doubles. Plot p against 1/V in the Data tab: a straight line through the origin.</p>
          <H>Pushing the piston heats the gas</H>
          <p>A piston moving in hits particles like a bat, and they bounce off faster. With no heat leaving (thermostat off), the work done on the gas raises its temperature. Bike pumps get warm for this reason.</p>
          <Try>set 600 K, then switch from helium to xenon. Does the pressure change? Does the rms speed?</Try>
        </>
      }
    />
  );
}
