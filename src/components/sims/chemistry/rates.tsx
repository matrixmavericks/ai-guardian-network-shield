import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Switch } from "../kit/controls";
import { TimeGraph } from "../kit/graph";
import { Plot, gauss, glow, label, roundRect, sphere, fmt, TAU, type Ctx } from "../kit/draw";

// Collision theory with real collisions: A + B → AB only when the energy of the
// collision (along the line between the centres) reaches the activation energy.
// Temperature, concentration and a catalyst change how often that happens.

type P = { n: number; T: number; Ea: number; cat: boolean };
const DEF: P = { n: 60, T: 300, Ea: 3.5, cat: false };
const R = 0.018;
const CAT = 0.45; // a catalyst route needs this fraction of the activation energy
type Pt = { x: number; y: number; vx: number; vy: number; k: "A" | "B" | "C" };
type S = { pts: Pt[]; t: number; flashes: { x: number; y: number; at: number; ok: boolean }[]; n0: number; half: number; done90: number };

/** kT in collision-energy units: 1 at 300 K */
const kT = (T: number) => T / 300;
const VS = 0.5; // speed scale on screen

function seed(p: P): S {
  const pts: Pt[] = [];
  const sd = Math.sqrt(kT(p.T)) * VS;
  for (let i = 0; i < p.n * 2; i++) pts.push({ x: R + Math.random() * (1.6 - 2 * R), y: R + Math.random() * (1 - 2 * R), vx: gauss() * sd, vy: gauss() * sd, k: i % 2 ? "B" : "A" });
  return { pts, t: 0, flashes: [], n0: p.n, half: NaN, done90: NaN };
}

function step(s: S, p: P, h: number) {
  const W = 1.6;
  for (const q of s.pts) {
    q.x += q.vx * h; q.y += q.vy * h;
    const r = q.k === "C" ? R * 1.3 : R;
    if (q.x < r) { q.x = r; q.vx = Math.abs(q.vx); } if (q.x > W - r) { q.x = W - r; q.vx = -Math.abs(q.vx); }
    if (q.y < r) { q.y = r; q.vy = Math.abs(q.vy); } if (q.y > 1 - r) { q.y = 1 - r; q.vy = -Math.abs(q.vy); }
  }
  const Ea = p.Ea * (p.cat ? CAT : 1);
  const cell = 0.05, cols = Math.ceil(W / cell) + 1, grid = new Map<number, number[]>();
  s.pts.forEach((q, i) => { const k = Math.floor(q.y / cell) * cols + Math.floor(q.x / cell); const a = grid.get(k); if (a) a.push(i); else grid.set(k, [i]); });
  const gone = new Set<number>();
  const born: Pt[] = [];
  for (const [k, list] of grid) {
    const cx = k % cols, cy = Math.floor(k / cols);
    for (const dx of [0, 1]) for (const dy of [-1, 0, 1]) {
      if (dx === 0 && dy === -1) continue;
      const other = dx === 0 && dy === 0 ? list : grid.get((cy + dy) * cols + cx + dx);
      if (!other) continue;
      for (let a = 0; a < list.length; a++) for (let b = dx === 0 && dy === 0 ? a + 1 : 0; b < other.length; b++) {
        const i = list[a], j = other[b];
        if (gone.has(i) || gone.has(j)) continue;
        const A = s.pts[i], B = s.pts[j];
        const rA = A.k === "C" ? R * 1.3 : R, rB = B.k === "C" ? R * 1.3 : R;
        const ddx = B.x - A.x, ddy = B.y - A.y, d2 = ddx * ddx + ddy * ddy;
        if (d2 > (rA + rB) ** 2 || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = ddx / d, ny = ddy / d;
        const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
        if (rv >= 0) continue;
        // Energy of the collision along the line of centres (equal masses), in kT units at 300 K
        const E = (0.25 * rv * rv) / (VS * VS);
        if (((A.k === "A" && B.k === "B") || (A.k === "B" && B.k === "A"))) {
          if (E >= Ea) {
            gone.add(i); gone.add(j);
            born.push({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, vx: (A.vx + B.vx) / 2, vy: (A.vy + B.vy) / 2, k: "C" });
            s.flashes.push({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, at: s.t, ok: true });
            continue;
          }
          if (Math.random() < 0.15) s.flashes.push({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, at: s.t, ok: false });
        }
        A.vx += rv * nx; A.vy += rv * ny; B.vx -= rv * nx; B.vy -= rv * ny;
        const push = (rA + rB - d) / 2; A.x -= nx * push; A.y -= ny * push; B.x += nx * push; B.y += ny * push;
      }
    }
  }
  if (gone.size) s.pts = s.pts.filter((_, i) => !gone.has(i)).concat(born);
  // Thermostat: hold the temperature
  let ke = 0; for (const q of s.pts) ke += (q.k === "C" ? 2 : 1) * (q.vx * q.vx + q.vy * q.vy);
  const want = s.pts.length * 2 * kT(p.T) * VS * VS;
  if (ke > 0) { const f = Math.sqrt(1 + (want / ke - 1) * Math.min(1, h * 5)); for (const q of s.pts) { q.vx *= f; q.vy *= f; } }
  s.flashes = s.flashes.filter((f) => s.t - f.at < 0.6);
  s.t += h;
  const left = s.pts.filter((q) => q.k === "A").length;
  if (!isFinite(s.half) && left <= s.n0 / 2) s.half = s.t;
  if (!isFinite(s.done90) && left <= s.n0 * 0.1) s.done90 = s.t;
}

function draw(ctx: Ctx, w: number, h: number, p: P, s: S, t: SimTheme) {
  ctx.fillStyle = t.dark ? "#060b17" : "#f1f5fb"; ctx.fillRect(0, 0, w, h);
  const side = w > 640 ? Math.min(300, w * 0.38) : 0;
  const bw = w - side - 40, bh = Math.min(h - 100, bw / 1.6);
  const bx = 20, by = 84;
  const sc = bw / 1.6;
  ctx.fillStyle = t.dark ? "rgba(148,163,184,0.06)" : "rgba(15,23,42,0.04)"; roundRect(ctx, bx, by, bw, bh, 14); ctx.fill();
  ctx.strokeStyle = t.grid; ctx.lineWidth = 1.5; ctx.stroke();
  const X = (u: number) => bx + u * sc, Y = (v: number) => by + v * bh;
  for (const f of s.flashes) {
    const a = 1 - (s.t - f.at) / 0.6;
    if (f.ok) glow(ctx, X(f.x), Y(f.y), 26, "#fde047", 0.9 * a);
    else { ctx.strokeStyle = `rgba(148,163,184,${a * 0.6})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), 10 * (1.5 - a), 0, TAU); ctx.stroke(); }
  }
  for (const q of s.pts) {
    const rr = Math.max(4, (q.k === "C" ? R * 1.3 : R) * bh);
    if (q.k === "C") { sphere(ctx, X(q.x) - rr * 0.4, Y(q.y), rr * 0.75, "#3b82f6"); sphere(ctx, X(q.x) + rr * 0.4, Y(q.y), rr * 0.75, "#ef4444"); }
    else sphere(ctx, X(q.x), Y(q.y), rr, q.k === "A" ? "#3b82f6" : "#ef4444");
  }
  label(ctx, "A + B → AB", bx + 12, by + bh + 18, { color: t.mute, size: 11.5, align: "left" });
  if (!side) return;
  // Energy profile and distribution of collision energies
  const ex = w - side + 4, ew = side - 24;
  ctx.fillStyle = t.panel; roundRect(ctx, ex, by, ew, 170, 12); ctx.fill();
  label(ctx, "Energy profile", ex + 12, by + 16, { color: t.soft, size: 12, weight: 600, align: "left" });
  const ey0 = by + 150, peak = (Ea: number) => ey0 - 26 - Ea * 14;
  const path = (Ea: number, col: string, dash?: number[]) => {
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(ex + 14, ey0 - 26);
    ctx.bezierCurveTo(ex + ew * 0.35, ey0 - 26, ex + ew * 0.4, peak(Ea), ex + ew * 0.5, peak(Ea));
    ctx.bezierCurveTo(ex + ew * 0.6, peak(Ea), ex + ew * 0.65, ey0, ex + ew - 14, ey0);
    ctx.stroke(); ctx.setLineDash([]);
  };
  path(p.Ea, t.c.orange);
  if (p.cat) path(p.Ea * CAT, t.c.green, [6, 4]);
  label(ctx, "Ea", ex + ew * 0.5 + 8, (peak(p.Ea) + ey0 - 26) / 2, { color: t.c.orange, size: 12, weight: 700, align: "left" });
  if (p.cat) label(ctx, "with catalyst", ex + ew * 0.5, peak(p.Ea * CAT) + 14, { color: t.c.green, size: 10.5, weight: 600 });
  label(ctx, "reactants", ex + 40, ey0 - 14, { color: t.mute, size: 10.5 });
  label(ctx, "product", ex + ew - 40, ey0 + 10, { color: t.mute, size: 10.5 });
  const my = by + 186, mh = 180;
  ctx.fillStyle = t.panel; roundRect(ctx, ex, my, ew, mh, 12); ctx.fill();
  label(ctx, "Energy of collisions", ex + 12, my + 16, { color: t.soft, size: 12, weight: 600, align: "left" });
  const pl = new Plot(ex + 16, my + 30, ew - 30, mh - 56, 0, 10, 0, 0.75);
  const f = (E: number) => Math.exp(-E / kT(p.T)) / kT(p.T); // collision energies along the line of centres
  ctx.fillStyle = t.dark ? "rgba(253,224,71,0.35)" : "rgba(202,138,4,0.3)";
  const Eeff = p.Ea * (p.cat ? CAT : 1);
  ctx.beginPath(); ctx.moveTo(pl.X(Eeff), pl.Y(0)); for (let E = Eeff; E <= 10; E += 0.1) ctx.lineTo(pl.X(E), pl.Y(f(E))); ctx.lineTo(pl.X(10), pl.Y(0)); ctx.closePath(); ctx.fill();
  pl.fn(ctx, f, t.c.blue, 2.5);
  ctx.strokeStyle = t.c.orange; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pl.X(p.Ea), pl.y0); ctx.lineTo(pl.X(p.Ea), pl.y0 + pl.h); ctx.stroke();
  if (p.cat) { ctx.strokeStyle = t.c.green; ctx.beginPath(); ctx.moveTo(pl.X(Eeff), pl.y0); ctx.lineTo(pl.X(Eeff), pl.y0 + pl.h); ctx.stroke(); }
  ctx.setLineDash([]);
  label(ctx, `${(Math.exp(-Eeff / kT(p.T)) * 100).toFixed(2)}% have enough energy`, ex + ew - 12, my + mh - 12, { color: t.c.amber, size: 11, weight: 700, align: "right" });
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const p = { ...DEF, T: 450 };
  const s = seed(p);
  for (let i = 0; i < 150; i++) step(s, p, 0.02);
  draw(ctx, w * 1.25, h * 1.3, p, s, t);
}

export default function Rates() {
  const theme = useSimTheme();
  const [p, set] = useSimParams<P>(DEF, { n: [10, 120], T: [200, 700], Ea: [2, 8] });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const sim = useRef<S>(seed(p));
  const graph = useRef<number[][]>([]);
  const reset = (q: P = p) => { sim.current = seed(q); graph.current = []; };
  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const s = sim.current;
    if (running) {
      const n = Math.max(1, Math.ceil((dt * speed) / (1 / 120)));
      for (let i = 0; i < n; i++) step(s, p, (dt * speed) / n);
      const g = graph.current;
      if (!g.length || s.t - g[g.length - 1][0] > 0.2) { const a = s.pts.filter((q) => q.k === "A").length; g.push([s.t, (a / s.n0) * 100, ((s.n0 - a) / s.n0) * 100]); }
    }
    draw(ctx, w, h, p, s, theme);
  };
  const live = useLive(() => { const s = sim.current; const a = s.pts.filter((q) => q.k === "A").length; return { a, made: s.n0 - a, t: s.t, half: s.half, d90: s.done90, n0: s.n0 }; }, 6);
  const challenges = [
    { id: "hot", title: "Raise only the temperature until 90% has reacted within 20 s", detail: "No catalyst, starting amounts 60 + 60, Ea 3.5.", done: !p.cat && p.n === 60 && p.Ea === 3.5 && live.d90 <= 20 },
    { id: "cat", title: "At 300 K, use a catalyst to get 90% reacted within 20 s", detail: "Same amounts and Ea.", done: p.cat && p.T === 300 && p.n === 60 && p.Ea === 3.5 && live.d90 <= 20 },
    { id: "half", title: "Get a half-life under 5 seconds any way you like", detail: "Time for half of A to react. Reset (R) to start a new run.", done: live.half < 5 },
  ];

  return (
    <SimShell
      id="rates"
      running={running}
      onRun={setRunning}
      speed={speed}
      onSpeed={setSpeed}
      onReset={() => reset()}
      challenges={challenges}
      record={() => ({ "particles of each": p.n, "T (K)": p.T, Ea: p.Ea, catalyst: p.cat ? 1 : 0, "half-life (s)": +(isFinite(live.half) ? live.half : NaN).toFixed(2), "90% done (s)": +(isFinite(live.d90) ? live.d90 : NaN).toFixed(2) })}
      ask={() => `Rates of reaction simulation: ${p.n} particles each of A and B, ${p.T} K, activation energy ${p.Ea} (relative units), catalyst ${p.cat ? "on" : "off"}. After ${fmt(live.t, 1)} s, ${live.made} of ${live.n0} have reacted.${isFinite(live.half) ? ` Half-life ${fmt(live.half, 1)} s.` : ""}`}
      stage={<Stage label="Particles colliding and reacting" render={render} />}
      overlay={
        <Readouts>
          <Readout label="reacted" value={`${Math.round((live.made / Math.max(1, live.n0)) * 100)}%`} color={theme.c.violet} />
          <Readout label="time" value={live.t} unit="s" digits={1} />
          <Readout label="half-life" value={isFinite(live.half) ? fmt(live.half, 1) : "…"} unit={isFinite(live.half) ? "s" : ""} />
        </Readouts>
      }
      below={<TimeGraph title="Progress of the reaction" data={graph} yLabel="% of A" window={Math.max(20, Math.min(120, (isFinite(live.d90) ? live.d90 : live.t) + 5))} fixed={[0, 100]} series={[{ label: "A left", color: theme.c.blue }, { label: "AB made", color: theme.c.violet }]} />}
      controls={
        <>
          <Group title="Conditions">
            <Slider label="Temperature" value={p.T} min={200} max={700} step={10} unit="K" color={theme.c.red} onChange={(T) => { set({ T }); reset({ ...p, T }); }} />
            <Slider label="Concentration (particles of each)" value={p.n} min={10} max={120} step={5} onChange={(n) => { set({ n }); reset({ ...p, n }); }} />
            <Slider label="Activation energy" value={p.Ea} min={2} max={8} step={0.5} color={theme.c.orange} onChange={(Ea) => { set({ Ea }); reset({ ...p, Ea }); }} hint="In multiples of the average collision energy at 300 K." />
            <Switch label="Catalyst" color={theme.c.green} checked={p.cat} onChange={(cat) => { set({ cat }); reset({ ...p, cat }); }} hint="Gives a route with a lower activation energy; it isn't used up." />
          </Group>
        </>
      }
      learn={
        <>
          <H>Collision theory</H>
          <p>Particles react only when they collide, and only if the collision has at least the activation energy (Ea), the energy needed to start breaking bonds. Most collisions just bounce (grey rings); a few succeed (yellow flashes).</p>
          <H>What speeds a reaction up</H>
          <p><b>Concentration</b> (or pressure for gases): more particles in the same space, more frequent collisions.</p>
          <p><b>Temperature</b>: particles move faster, so they collide more often and, more importantly, a much larger share of collisions have energy above Ea. That is why a small rise in temperature can make a big difference.</p>
          <p><b>Surface area</b>: for solids, smaller pieces expose more particles to collisions.</p>
          <p><b>Catalyst</b>: provides a different pathway with a lower activation energy, so more collisions succeed. It is not used up.</p>
          <H>Energy distribution</H>
          <p>The shaded area under the curve is the share of collisions with enough energy. Raising the temperature spreads the curve to higher energies; a catalyst moves the Ea line left. Either way, the shaded area grows.</p>
          <Eq>rate ∝ (collision frequency) × (fraction with E ≥ Ea)</Eq>
          <Try>record the half-life at 300, 350, 400 and 450 K. Roughly how many times faster does it get every 50 K?</Try>
        </>
      }
    />
  );
}
