import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, advance, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Switch } from "../kit/controls";
import { TimeGraph } from "../kit/graph";
import { arrow, deg, label, rad, roundRect, sphere, fmt, type Ctx } from "../kit/draw";

// A real (non-linear) pendulum, θ'' = −(g/L) sin θ − bθ', integrated with RK4,
// next to the small-angle prediction.

const G = { earth: 9.81, moon: 1.62, mars: 3.71, jupiter: 24.79 } as const;
type Planet = keyof typeof G;
type P = { L: number; a0: number; m: number; g: Planet; b: number; ghost: boolean };
const DEF: P = { L: 1, a0: 20, m: 1, g: "earth", b: 0, ghost: false };

type S = { th: number; w: number; t: number; e0: number; cross: number[]; ghost: number };
const fresh = (p: P): S => ({ th: rad(p.a0), w: 0, t: 0, e0: p.m * G[p.g] * p.L * (1 - Math.cos(rad(p.a0))), cross: [], ghost: rad(p.a0) });

function rk4(s: S, p: P, h: number) {
  const g = G[p.g];
  const f = (th: number, w: number) => -(g / p.L) * Math.sin(th) - p.b * w;
  const k1t = s.w, k1w = f(s.th, s.w);
  const k2t = s.w + (k1w * h) / 2, k2w = f(s.th + (k1t * h) / 2, s.w + (k1w * h) / 2);
  const k3t = s.w + (k2w * h) / 2, k3w = f(s.th + (k2t * h) / 2, s.w + (k2w * h) / 2);
  const k4t = s.w + k3w * h, k4w = f(s.th + k3t * h, s.w + k3w * h);
  const prev = s.th;
  s.th += (h / 6) * (k1t + 2 * k2t + 2 * k3t + k4t);
  s.w += (h / 6) * (k1w + 2 * k2w + 2 * k3w + k4w);
  s.t += h;
  // Crossing the lowest point moving the same way each time: one full period apart
  if (prev > 0 && s.th <= 0) s.cross.push(s.t - (h * s.th) / (s.th - prev));
  // Small-angle model: simple harmonic, same damping
  const w0 = Math.sqrt(g / p.L);
  s.ghost = rad(p.a0) * Math.exp((-p.b * s.t) / 2) * Math.cos(Math.sqrt(Math.max(0, w0 * w0 - (p.b * p.b) / 4)) * s.t);
}
const measured = (s: S) => {
  const c = s.cross;
  if (c.length < 2) return NaN;
  const n = Math.min(4, c.length - 1);
  return (c[c.length - 1] - c[c.length - 1 - n]) / n;
};
const energy = (s: S, p: P) => {
  const ke = 0.5 * p.m * (p.L * s.w) ** 2;
  const pe = p.m * G[p.g] * p.L * (1 - Math.cos(s.th));
  return { ke, pe, lost: Math.max(0, s.e0 - ke - pe), e0: s.e0 };
};

function draw(ctx: Ctx, w: number, h: number, p: P, s: S, t: SimTheme, o: { forces?: boolean; trail?: { x: number; y: number }[]; top?: number; bars?: boolean } = {}) {
  // Wall, beam and scale
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, t.dark ? "#0b1324" : "#eef2f8"); bg.addColorStop(1, t.dark ? "#060b17" : "#dfe6f0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const px = o.bars === false ? w / 2 : w * 0.42, py = o.top ?? 96;
  const maxLen = Math.min(h - py - 60, w * 0.5);
  const s2 = maxLen / Math.max(1.2, p.L);
  const len = p.L * s2;
  const beam = ctx.createLinearGradient(0, py - 26, 0, py);
  beam.addColorStop(0, "#8a5a32"); beam.addColorStop(1, "#5a3a20");
  ctx.fillStyle = beam;
  roundRect(ctx, px - 150, py - 26, 300, 20, 4);
  ctx.fill();
  ctx.fillStyle = "#9aa3b2";
  ctx.fillRect(px - 6, py - 8, 12, 10);
  // Protractor arc and angle
  ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + len + 30); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = t.dark ? "rgba(148,163,184,0.25)" : "rgba(15,23,42,0.15)";
  ctx.beginPath(); ctx.arc(px, py, len, Math.PI / 2 - rad(Math.min(175, Math.abs(p.a0) + 5)), Math.PI / 2 + rad(Math.min(175, Math.abs(p.a0) + 5))); ctx.stroke();
  for (let d = -80; d <= 80; d += 10) {
    const a = Math.PI / 2 + rad(d);
    const r1 = len - 6, r2 = len + (d % 30 === 0 ? 8 : 4);
    ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1); ctx.lineTo(px + Math.cos(a) * r2, py + Math.sin(a) * r2); ctx.stroke();
  }
  // Trail
  if (o.trail && o.trail.length > 1) {
    for (let i = 1; i < o.trail.length; i++) {
      ctx.strokeStyle = t.dark ? `rgba(251,191,36,${(i / o.trail.length) * 0.5})` : `rgba(180,83,9,${(i / o.trail.length) * 0.45})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(o.trail[i - 1].x, o.trail[i - 1].y); ctx.lineTo(o.trail[i].x, o.trail[i].y); ctx.stroke();
    }
  }
  const r = 12 + 8 * Math.cbrt(p.m);
  // Small-angle ghost
  if (p.ghost) {
    const gx = px + Math.sin(s.ghost) * len, gy = py + Math.cos(s.ghost) * len;
    ctx.strokeStyle = t.dark ? "rgba(167,139,250,0.5)" : "rgba(124,58,237,0.45)"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(gx, gy); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.45; sphere(ctx, gx, gy, r, "#8b5cf6"); ctx.globalAlpha = 1;
  }
  const bx = px + Math.sin(s.th) * len, by = py + Math.cos(s.th) * len;
  ctx.strokeStyle = t.dark ? "#cbd5e1" : "#334155"; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
  sphere(ctx, px, py, 5, "#94a3b8");
  sphere(ctx, bx, by, r, "#c08a2d", { shadow: true, light: "#fff3c4" });
  // Angle label
  label(ctx, `${fmt(deg(s.th), 1)}°`, px + Math.sin(s.th / 2) * 46, py + Math.cos(s.th / 2) * 46, { color: t.c.amber, size: 12, weight: 700, halo: true });
  if (o.forces) {
    const k = 26;
    arrow(ctx, bx, by, bx, by + k * 1.6, t.c.red, { label: "W", width: 2.5 });
    const tension = G[p.g] * Math.cos(s.th) + p.L * s.w * s.w; // per unit mass
    const tl = (tension / G[p.g]) * k * 1.6;
    arrow(ctx, bx, by, bx - Math.sin(s.th) * tl, by - Math.cos(s.th) * tl, t.c.blue, { label: "T", width: 2.5 });
    const v = s.w * p.L;
    arrow(ctx, bx, by, bx + Math.cos(s.th) * v * 30, by - Math.sin(s.th) * v * 30, t.c.green, { label: "v", width: 2.5 });
  }
  // Energy bars
  if (o.bars === false) return;
  const e = energy(s, p);
  const bxl = w - 150, base = h - 54, full = Math.min(220, h - 180);
  label(ctx, "Energy", bxl + 54, base - full - 18, { color: t.soft, size: 12, weight: 600 });
  const bars: [string, number, string][] = [["KE", e.ke, t.c.green], ["GPE", e.pe, t.c.blue], ["lost", e.lost, t.c.orange]];
  bars.forEach(([name, val, col], i) => {
    const x = bxl + i * 38;
    ctx.fillStyle = t.dark ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.06)";
    roundRect(ctx, x, base - full, 26, full, 6); ctx.fill();
    const hh = e.e0 > 0 ? (val / e.e0) * full : 0;
    ctx.fillStyle = col;
    roundRect(ctx, x, base - hh, 26, Math.max(0, hh), 6); ctx.fill();
    label(ctx, name, x + 13, base + 14, { color: t.mute, size: 11 });
    label(ctx, `${val < 5e-4 ? "0" : fmt(val, val < 1 ? 3 : 2)} J`, x + 13, base + 28, { color: col, size: 10, weight: 600 });
  });
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const s = fresh({ ...DEF, a0: 32 });
  const trail = Array.from({ length: 24 }, (_, i) => { const a = ((32 - i * 2.4) * Math.PI) / 180; const len = Math.min(h - 20 - 30, w * 0.5) / 1.2; return { x: w / 2 + Math.sin(a) * len, y: 20 + Math.cos(a) * len }; }).reverse();
  draw(ctx, w, h, { ...DEF, a0: 32, L: 1 }, s, t, { top: 20, bars: false, trail });
}

export default function Pendulum() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { L: [0.1, 3], a0: [-170, 170], m: [0.1, 5], b: [0, 1], g: Object.keys(G) });
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [forces, setForces] = useState(false);
  const sim = useRef<S>(fresh(p));
  const trail = useRef<{ x: number; y: number }[]>([]);
  const graph = useRef<number[][]>([]);
  const dragging = useRef(false);
  const geo = useRef({ px: 0, py: 0, len: 1 });
  const reset = (q: P = p) => { sim.current = fresh(q); trail.current = []; graph.current = []; };
  const change = (patch: Partial<P>) => { const q = { ...p, ...patch }; set(patch); setRunning(false); reset(q); };

  const live = useLive(() => {
    const s = sim.current;
    return { th: deg(s.th), w: s.w, t: s.t, T: measured(s), e: energy(s, p) };
  }, 10);
  const Tpred = 2 * Math.PI * Math.sqrt(p.L / G[p.g]);

  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const s = sim.current;
    if (running && !dragging.current) {
      advance(dt, speed, 1 / 1000, (hh) => rk4(s, p, hh));
      const g = graph.current;
      if (!g.length || s.t - g[g.length - 1][0] > 1 / 40) g.push(p.ghost ? [s.t, deg(s.th), deg(s.ghost)] : [s.t, deg(s.th)]);
      if (g.length > 4000) g.splice(0, g.length - 4000);
    }
    const px = w * 0.42, py = 96;
    const len = p.L * (Math.min(h - py - 60, w * 0.5) / Math.max(1.2, p.L));
    geo.current = { px, py, len };
    const bx = px + Math.sin(s.th) * len, by = py + Math.cos(s.th) * len;
    if (running) { trail.current.push({ x: bx, y: by }); if (trail.current.length > 50) trail.current.shift(); }
    draw(ctx, w, h, p, s, theme, { forces, trail: trail.current });
    if (!running && s.t === 0) label(ctx, "Drag the bob to choose where it starts", w * 0.42, h - 18, { color: theme.mute, size: 12 });
  };

  const onDown = (pt: { x: number; y: number }) => {
    const { px, py, len } = geo.current;
    const s = sim.current;
    const bx = px + Math.sin(s.th) * len, by = py + Math.cos(s.th) * len;
    if (Math.hypot(pt.x - bx, pt.y - by) < 40) { dragging.current = true; setRunning(false); return true; }
    return false;
  };
  const onMove = (pt: { x: number; y: number }, down: boolean) => {
    if (!down || !dragging.current) return;
    const { px, py } = geo.current;
    const a = Math.round(deg(Math.atan2(pt.x - px, pt.y - py)));
    const a0 = Math.max(-170, Math.min(170, a));
    set({ a0 });
    reset({ ...p, a0 });
  };
  const onUp = () => { dragging.current = false; };

  const err = isFinite(live.T) ? (live.T / Tpred - 1) * 100 : NaN;
  const challenges = [
    { id: "seconds", title: "Build a seconds pendulum: period 2.00 s on Earth", detail: "Within ±0.02 s, measured by the simulation.", done: p.g === "earth" && Math.abs(live.T - 2) <= 0.02 },
    { id: "big", title: "Find a swing where the small-angle formula is more than 5% out", detail: "Compare the measured period with 2π√(L/g).", done: p.b === 0 && err > 5 },
    { id: "moon", title: "On the Moon, match a 1 m Earth pendulum (2.01 s)", detail: "Work out the length first: L = gT² ⁄ 4π².", done: p.g === "moon" && Math.abs(live.T - 2.006) <= 0.03 },
    { id: "damp", title: "Add damping so it loses half its energy within 10 s", detail: "Watch the orange bar.", done: p.b > 0 && live.t <= 10 && live.e.lost >= live.e.e0 * 0.5 && live.e.e0 > 0 },
  ];

  return (
    <SimShell
      id="pendulum"
      running={running}
      onRun={(r) => setRunning(r)}
      onReset={() => { setRunning(false); reset(); }}
      speed={speed}
      onSpeed={setSpeed}
      challenges={challenges}
      record={() => ({ "L (m)": p.L, "θ₀ (°)": p.a0, "m (kg)": p.m, "g (m/s²)": G[p.g], "T measured (s)": +(isFinite(live.T) ? live.T : NaN).toFixed(4), "T² (s²)": +(isFinite(live.T) ? live.T ** 2 : NaN).toFixed(4), "2π√(L/g) (s)": +Tpred.toFixed(4) })}
      ask={() => `Pendulum: length ${p.L} m, released from ${p.a0}°, mass ${p.m} kg, g = ${G[p.g]} m/s², damping ${p.b} s⁻¹. Measured period ${isFinite(live.T) ? fmt(live.T, 3) + " s" : "not measured yet"}; small-angle prediction ${fmt(Tpred, 3)} s.`}
      stage={<Stage label={`Pendulum of length ${p.L} metres swinging`} render={render} onDown={onDown} onMove={onMove} onUp={onUp} cursor="grab" />}
      overlay={
        <Readouts>
          <Readout label="angle" value={live.th} unit="°" digits={1} color={theme.c.amber} />
          <Readout label="period (measured)" value={isFinite(live.T) ? live.T : "…"} unit={isFinite(live.T) ? "s" : ""} digits={3} />
          <Readout label="2π√(L/g)" value={Tpred} unit="s" digits={3} color={theme.c.violet} />
          {isFinite(err) && <Readout label="difference" value={`${err >= 0 ? "+" : ""}${err.toFixed(1)}%`} />}
        </Readouts>
      }
      below={<TimeGraph title="Angle against time" data={graph} yLabel="θ / °" window={Math.max(6, Tpred * 3)} series={[{ label: "real pendulum", color: theme.c.amber }, ...(p.ghost ? [{ label: "small-angle model", color: theme.c.violet, dash: true }] : [])]} />}
      controls={
        <>
          <Group title="Pendulum">
            <Slider label="Length" value={p.L} min={0.1} max={3} step={0.01} unit="m" onChange={(L) => change({ L })} />
            <Slider label="Release angle" value={p.a0} min={-170} max={170} step={1} unit="°" onChange={(a0) => change({ a0 })} />
            <Slider label="Mass" value={p.m} min={0.1} max={5} step={0.1} unit="kg" onChange={(m) => change({ m })} hint="Watch the period when you change this." />
            <Slider label="Damping" value={p.b} min={0} max={1} step={0.01} unit="s⁻¹" onChange={(b) => change({ b })} hint="Air resistance and friction at the pivot." />
          </Group>
          <Group title="Gravity">
            <Choice value={p.g} onChange={(g) => change({ g })} options={(Object.keys(G) as Planet[]).map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }))} wrap />
            <p className="-mt-2 text-[11.5px] text-lp-mute">g = {G[p.g]} m/s²</p>
          </Group>
          <Group title="Show">
            <Switch label="Small-angle model" color={theme.c.violet} checked={p.ghost} onChange={(ghost) => { set({ ghost }); graph.current = []; }} hint="A ghost that obeys T = 2π√(L/g) exactly." />
            <Switch label="Forces and velocity" checked={forces} onChange={setForces} />
            <button type="button" onClick={() => { resetP(); setRunning(false); reset(DEF); }} className="text-[12.5px] text-lp-sky hover:underline">Default settings</button>
          </Group>
        </>
      }
      learn={
        <>
          <H>Why it swings</H>
          <p>When the bob is pulled aside, part of its weight (mg sin θ) pulls it back towards the middle. That restoring force always points towards the lowest point and is bigger the further out it is, so the bob overshoots, stops, and comes back: an oscillation.</p>
          <H>The period</H>
          <p>For small swings, sin θ ≈ θ (in radians), the restoring force is proportional to the displacement, and the motion is simple harmonic. Then</p>
          <Eq>T = 2π √(L ⁄ g)</Eq>
          <p>The period depends only on the length and on g. The mass and (for small swings) the amplitude don't matter. For big swings the real pendulum is slower than this formula: at 60° it takes about 7% longer.</p>
          <H>Energy</H>
          <p>Energy moves back and forth between gravitational potential energy (highest at the ends) and kinetic energy (highest at the bottom). Without damping the total stays the same. With damping some is transferred to the surroundings as thermal energy each swing, and the amplitude decays.</p>
          <Eq>mgh = ½mv² &nbsp;→&nbsp; v_max = √(2gL(1 − cos θ₀))</Eq>
          <Try>record the period for five lengths, then plot T² against L in the Data tab. The gradient should be 4π²/g. Use it to measure g.</Try>
        </>
      }
    />
  );
}
