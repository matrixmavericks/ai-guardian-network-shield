import React, { useMemo, useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Switch } from "../kit/controls";
import { arrow, glow, label, sphere, fmt, TAU, type Ctx } from "../kit/draw";

// A planet around a star under Newtonian gravity, integrated with velocity
// Verlet in AU and years (GM☉ = 4π² AU³/yr²).

const KMS = 4.7406; // km/s per AU/yr
type P = { M: number; r0: number; v0: number; sweep: boolean; vectors: boolean };
const DEF: P = { M: 1, r0: 1, v0: 25, sweep: true, vectors: true };
type S = { x: number; y: number; vx: number; vy: number; t: number; trail: { x: number; y: number; t: number }[]; angle: number; lastA: number; laps: number[]; gone: boolean };

const GM = (M: number) => 4 * Math.PI * Math.PI * M;
export const elements = (p: P) => {
  const mu = GM(p.M), v = p.v0 / KMS, r = p.r0;
  const eps = (v * v) / 2 - mu / r;
  const h = r * v;
  const e = Math.sqrt(Math.max(0, 1 + (2 * eps * h * h) / (mu * mu)));
  const a = eps < 0 ? -mu / (2 * eps) : Infinity;
  return { eps, e, a, T: eps < 0 ? Math.sqrt((a * a * a) / p.M) : Infinity, peri: a * (1 - e), apo: eps < 0 ? a * (1 + e) : Infinity, vc: Math.sqrt(mu / r) * KMS, vesc: Math.sqrt((2 * mu) / r) * KMS };
};
const fresh = (p: P): S => ({ x: p.r0, y: 0, vx: 0, vy: p.v0 / KMS, t: 0, trail: [], angle: 0, lastA: 0, laps: [], gone: false });

function step(s: S, p: P, h: number) {
  const mu = GM(p.M);
  const acc = (x: number, y: number) => { const r3 = Math.pow(x * x + y * y, 1.5); return [(-mu * x) / r3, (-mu * y) / r3]; };
  const [ax, ay] = acc(s.x, s.y);
  s.vx += (ax * h) / 2; s.vy += (ay * h) / 2;
  s.x += s.vx * h; s.y += s.vy * h;
  const [bx, by] = acc(s.x, s.y);
  s.vx += (bx * h) / 2; s.vy += (by * h) / 2;
  s.t += h;
  // Count laps by the angle swept
  const a = Math.atan2(s.y, s.x);
  let d = a - s.lastA;
  if (d < -Math.PI) d += TAU; else if (d > Math.PI) d -= TAU;
  s.angle += d; s.lastA = a;
  if (s.angle >= TAU * (s.laps.length + 1)) s.laps.push(s.t);
}

function draw(ctx: Ctx, w: number, h: number, p: P, s: S, t: SimTheme, view: number, o: { sweep: boolean; vectors: boolean; stars: { x: number; y: number; r: number }[] }) {
  ctx.fillStyle = "#03060f"; ctx.fillRect(0, 0, w, h);
  for (const st of o.stars) { ctx.fillStyle = `rgba(255,255,255,${0.25 + st.r * 0.4})`; ctx.fillRect(st.x * w, st.y * h, st.r, st.r); }
  const cx = w / 2, cy = h / 2, sc = (Math.min(w, h) / 2 - 30) / view;
  const X = (x: number) => cx + x * sc, Y = (y: number) => cy - y * sc;
  // 1 AU reference
  ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.setLineDash([3, 6]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  if (sc > 18) label(ctx, "1 AU (Earth's orbit)", cx + sc * 0.72, cy - sc * 0.72 - 8, { color: "rgba(148,163,184,0.7)", size: 10.5 });
  // Equal-time sectors (Kepler's second law)
  const el = elements(p);
  if (o.sweep && isFinite(el.T) && s.trail.length > 2) {
    const dt = el.T / 12;
    let start = 0;
    let k0 = Math.floor(s.trail[0].t / dt);
    for (let i = 1; i < s.trail.length; i++) {
      const k = Math.floor(s.trail[i].t / dt);
      if (k !== k0 || i === s.trail.length - 1) {
        ctx.fillStyle = k0 % 2 ? "rgba(96,165,250,0.16)" : "rgba(251,191,36,0.16)";
        ctx.beginPath(); ctx.moveTo(cx, cy);
        for (let j = start; j <= i; j++) ctx.lineTo(X(s.trail[j].x), Y(s.trail[j].y));
        ctx.closePath(); ctx.fill();
        start = i;
        k0 = k;
      }
    }
  }
  // Trail
  for (let i = 1; i < s.trail.length; i++) {
    ctx.strokeStyle = `rgba(125,211,252,${0.15 + 0.75 * (i / s.trail.length)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(s.trail[i - 1].x), Y(s.trail[i - 1].y)); ctx.lineTo(X(s.trail[i].x), Y(s.trail[i].y)); ctx.stroke();
  }
  // Star
  const sr = 10 + 7 * Math.pow(p.M, 0.8);
  glow(ctx, cx, cy, sr * 5, "#ffd27a", 0.45);
  glow(ctx, cx, cy, sr * 2, "#fff1c1", 0.7);
  sphere(ctx, cx, cy, sr, "#ffcf5a", { light: "#fffbe8" });
  // Planet
  const px = X(s.x), py = Y(s.y);
  glow(ctx, px, py, 18, "#60a5fa", 0.5);
  sphere(ctx, px, py, 7, "#3b82f6", { light: "#bfdbfe" });
  if (o.vectors && !s.gone) {
    const r = Math.hypot(s.x, s.y);
    const g = GM(p.M) / (r * r);
    arrow(ctx, px, py, px + s.vx * 6, py - s.vy * 6, "#4ade80", { label: "v", width: 2.5 });
    const fl = Math.min(70, g * 2.2);
    arrow(ctx, px, py, px - (s.x / r) * fl, py + (s.y / r) * fl, "#f87171", { label: "F", width: 2.5 });
  }
  if (s.gone) label(ctx, "Escaped: it never comes back", w / 2, 26, { color: "#fde68a", size: 13, weight: 700 });
  void t;
}

const STARS = Array.from({ length: 160 }, (_, i) => ({ x: ((i * 9301 + 49297) % 233280) / 233280, y: ((i * 4891 + 1231) % 104729) / 104729, r: (i % 5) / 3 + 0.6 }));

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const p = { ...DEF, v0: 24 };
  const s = fresh(p);
  for (let i = 0; i < 1400; i++) { step(s, p, 0.0006); if (i % 6 === 0) s.trail.push({ x: s.x, y: s.y, t: s.t }); }
  draw(ctx, w, h, p, s, t, 1.25, { sweep: true, vectors: false, stars: STARS });
}

export default function Orbits() {
  const theme = useSimTheme();
  const [p, set] = useSimParams<P>(DEF, { M: [0.2, 3], r0: [0.3, 3], v0: [3, 90] });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const sim = useRef<S>(fresh(p));
  const el = useMemo(() => elements(p), [p]);
  const view = isFinite(el.apo) ? Math.min(12, Math.max(el.apo, p.r0) * 1.15) : Math.min(12, p.r0 * 3);
  const reset = (q: P = p) => { sim.current = fresh(q); };
  const change = (patch: Partial<P>) => { set(patch); reset({ ...p, ...patch }); };

  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const s = sim.current;
    if (running && !s.gone) {
      // 0.5 years of orbit per second at 1×, in small steps (smaller near the star)
      let left = dt * speed * 0.5;
      while (left > 0) {
        const r = Math.hypot(s.x, s.y);
        const hh = Math.min(left, Math.max(1e-5, 0.002 * Math.pow(r, 1.5) / Math.sqrt(p.M)));
        step(s, p, hh);
        left -= hh;
      }
      const tr = s.trail;
      if (!tr.length || Math.hypot(s.x - tr[tr.length - 1].x, s.y - tr[tr.length - 1].y) > view / 300) tr.push({ x: s.x, y: s.y, t: s.t });
      const keep = isFinite(el.T) ? el.T * 1.02 : 4;
      while (tr.length > 2 && s.t - tr[0].t > keep) tr.shift();
      if (Math.hypot(s.x, s.y) > view * 1.6 && el.eps >= 0) s.gone = true;
    }
    draw(ctx, w, h, p, sim.current, theme, view, { sweep: p.sweep, vectors: p.vectors, stars: STARS });
  };
  const live = useLive(() => { const s = sim.current; return { r: Math.hypot(s.x, s.y), v: Math.hypot(s.vx, s.vy) * KMS, t: s.t, T: s.laps.length ? s.laps[0] : NaN }; }, 8);

  const challenges = [
    { id: "circle", title: "Make a circular orbit at 1 AU", detail: "Eccentricity below 0.02 around a 1 M☉ star. What speed is that?", done: Math.abs(p.r0 - 1) < 0.01 && Math.abs(p.M - 1) < 0.01 && el.e < 0.02 },
    { id: "escape", title: "Escape from the star", detail: "Give it just enough speed to leave for ever.", done: el.eps >= 0 },
    { id: "two", title: "Make an orbit with a period of 2.00 years", detail: "Around a 1 M☉ star, ±0.05 years. Use Kepler's third law.", done: Math.abs(p.M - 1) < 0.01 && Math.abs(el.T - 2) <= 0.05 },
    { id: "ecc", title: "Make an ellipse with eccentricity 0.6 or more", detail: "Then watch where it moves fastest.", done: el.e >= 0.6 && el.eps < 0 },
  ];

  return (
    <SimShell
      id="orbits"
      running={running}
      onRun={setRunning}
      onReset={() => reset()}
      speed={speed}
      onSpeed={setSpeed}
      challenges={challenges}
      record={() => ({ "M (M☉)": p.M, "r₀ (AU)": p.r0, "v₀ (km/s)": p.v0, "a (AU)": +(isFinite(el.a) ? el.a : NaN).toFixed(4), "e": +el.e.toFixed(4), "T (yr)": +(isFinite(el.T) ? el.T : NaN).toFixed(4), "T²": +(isFinite(el.T) ? el.T ** 2 : NaN).toFixed(4), "a³": +(isFinite(el.a) ? el.a ** 3 : NaN).toFixed(4) })}
      ask={() => `Orbit simulation: star of ${p.M} solar masses; planet starts ${p.r0} AU away moving sideways at ${p.v0} km/s (circular speed there ${fmt(el.vc, 1)} km/s, escape speed ${fmt(el.vesc, 1)} km/s). ${el.eps < 0 ? `It is bound: semi-major axis ${fmt(el.a, 3)} AU, eccentricity ${fmt(el.e, 3)}, period ${fmt(el.T, 3)} years.` : "It is unbound and escapes."}`}
      stage={<Stage label="A planet orbiting a star" render={render} />}
      overlay={
        <Readouts>
          <Readout label="distance" value={live.r} unit="AU" />
          <Readout label="speed" value={live.v} unit="km/s" digits={1} color="#4ade80" />
          <Readout label="eccentricity" value={el.e} digits={3} />
          <Readout label="period" value={isFinite(el.T) ? el.T : "unbound"} unit={isFinite(el.T) ? "yr" : ""} digits={3} />
          <Readout label="time" value={live.t} unit="yr" />
        </Readouts>
      }
      controls={
        <>
          <Group title="Star">
            <Slider label="Mass of the star" value={p.M} min={0.2} max={3} step={0.05} unit="M☉" onChange={(M) => change({ M })} />
          </Group>
          <Group title="Planet at the start">
            <Slider label="Distance" value={p.r0} min={0.3} max={3} step={0.01} unit="AU" onChange={(r0) => change({ r0 })} />
            <Slider label="Sideways speed" value={p.v0} min={3} max={90} step={0.1} unit="km/s" onChange={(v0) => change({ v0 })} hint={`Circular orbit here: ${fmt(el.vc, 1)} km/s. Escape speed: ${fmt(el.vesc, 1)} km/s.`} />
          </Group>
          <Group title="Show">
            <Switch label="Equal-time sectors" checked={p.sweep} onChange={(sweep) => set({ sweep })} hint="Each coloured slice takes the same time (1/12 of an orbit)." />
            <Switch label="Velocity and force" checked={p.vectors} onChange={(vectors) => set({ vectors })} />
          </Group>
        </>
      }
      learn={
        <>
          <H>Falling and missing</H>
          <p>Gravity always pulls the planet straight towards the star. Its sideways speed carries it past, so it keeps falling without ever hitting: that's an orbit. Too slow and it swings in close; too fast and it escapes.</p>
          <Eq>F = G M m ⁄ r²</Eq>
          <H>Circular orbit and escape</H>
          <Eq>v_circular = √(GM ⁄ r) &nbsp;&nbsp; v_escape = √(2GM ⁄ r)</Eq>
          <p>Escape speed is √2 times the circular speed. At or above it, the total energy (kinetic + gravitational potential) is zero or more, and the planet never returns.</p>
          <H>Kepler's laws</H>
          <p>1. Orbits are ellipses with the star at one focus. 2. A line from the star sweeps out equal areas in equal times, so the planet moves fastest when closest. 3. The square of the period is proportional to the cube of the orbit's size:</p>
          <Eq>T² = a³ ⁄ M &nbsp; (T in years, a in AU, M in solar masses)</Eq>
          <Try>record a few orbits, then plot T² against a³ in the Data tab. What is the gradient for a 1 M☉ star?</Try>
        </>
      }
    />
  );
}
