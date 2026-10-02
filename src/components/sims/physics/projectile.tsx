import React, { useMemo, useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Switch, Btn } from "../kit/controls";
import { TimeGraph } from "../kit/graph";
import { arrow, label, mix, niceTicks, rad, sphere, fmt, type Ctx } from "../kit/draw";

// Projectile motion with optional quadratic air resistance, integrated with RK4.

const PLANETS = {
  earth: { name: "Earth", g: 9.81, rho: 1.2, sky: ["#1e5aa8", "#7fb3e6", "#d8ecfa"], ground: ["#4f8a3c", "#2f5d26"], hills: "#3f6f4a" },
  moon: { name: "Moon", g: 1.62, rho: 0, sky: ["#000000", "#05070d", "#0e1220"], ground: ["#9a9a9a", "#5f5f63"], hills: "#3a3b40" },
  mars: { name: "Mars", g: 3.71, rho: 0.02, sky: ["#8c4a2b", "#c98a5a", "#e8c39a"], ground: ["#a8512c", "#6e2f17"], hills: "#8a4528" },
  jupiter: { name: "Jupiter", g: 24.79, rho: 0.16, sky: ["#5b3a1e", "#a8784a", "#e3c08e"], ground: ["#8a6a4a", "#5a4430"], hills: "#7a5838" },
} as const;
type Planet = keyof typeof PLANETS;
const BALLS = {
  tennis: { name: "Tennis ball", m: 0.057, d: 0.067, cd: 0.55, color: "#c8e63c" },
  football: { name: "Football", m: 0.43, d: 0.22, cd: 0.25, color: "#f1f5f9" },
  pingpong: { name: "Table-tennis ball", m: 0.0027, d: 0.04, cd: 0.5, color: "#fb923c" },
  shot: { name: "Shot put", m: 7.26, d: 0.12, cd: 0.47, color: "#475569" },
} as const;
type Ball = keyof typeof BALLS;

type Pt = { t: number; x: number; y: number; vx: number; vy: number };
type P = { v: number; a: number; h: number; g: Planet; drag: boolean; ball: Ball; target: number };

/** The whole flight, sampled every 1/120 s (RK4 at 1/480 s). */
export function fly(p: P, withDrag = p.drag): Pt[] {
  const pl = PLANETS[p.g];
  const b = BALLS[p.ball];
  const k = withDrag && pl.rho > 0 ? (0.5 * pl.rho * b.cd * Math.PI * (b.d / 2) ** 2) / b.m : 0;
  const acc = (vx: number, vy: number) => { const s = Math.hypot(vx, vy); return [-k * s * vx, -pl.g - k * s * vy]; };
  let [x, y, vx, vy] = [0, p.h, p.v * Math.cos(rad(p.a)), p.v * Math.sin(rad(p.a))];
  const out: Pt[] = [{ t: 0, x, y, vx, vy }];
  const h = 1 / 480;
  let t = 0;
  for (let i = 0; i < 480 * 300; i++) {
    const [a1x, a1y] = acc(vx, vy);
    const [a2x, a2y] = acc(vx + (a1x * h) / 2, vy + (a1y * h) / 2);
    const [a3x, a3y] = acc(vx + (a2x * h) / 2, vy + (a2y * h) / 2);
    const [a4x, a4y] = acc(vx + a3x * h, vy + a3y * h);
    const nx = x + (h / 6) * (vx + 2 * (vx + (a1x * h) / 2) + 2 * (vx + (a2x * h) / 2) + (vx + a3x * h));
    const ny = y + (h / 6) * (vy + 2 * (vy + (a1y * h) / 2) + 2 * (vy + (a2y * h) / 2) + (vy + a3y * h));
    const nvx = vx + (h / 6) * (a1x + 2 * a2x + 2 * a3x + a4x);
    const nvy = vy + (h / 6) * (a1y + 2 * a2y + 2 * a3y + a4y);
    t += h;
    if (ny < 0 && t > 1e-6) {
      // Land exactly on the ground by interpolating the last step
      const f = y / (y - ny);
      out.push({ t: t - h + f * h, x: x + f * (nx - x), y: 0, vx: vx + f * (nvx - vx), vy: vy + f * (nvy - vy) });
      break;
    }
    [x, y, vx, vy] = [nx, ny, nvx, nvy];
    if (i % 4 === 3) out.push({ t, x, y, vx, vy });
  }
  return out;
}
const at = (path: Pt[], t: number): Pt => {
  if (t <= 0) return path[0];
  const last = path[path.length - 1];
  if (t >= last.t) return last;
  let lo = 0, hi = path.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (path[m].t <= t) lo = m; else hi = m; }
  const a = path[lo], b = path[hi], f = (t - a.t) / (b.t - a.t || 1);
  return { t, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, vx: a.vx + (b.vx - a.vx) * f, vy: a.vy + (b.vy - a.vy) * f };
};
const summary = (path: Pt[]) => ({ range: path[path.length - 1].x, time: path[path.length - 1].t, top: Math.max(...path.map((q) => q.y)) });

const DEF: P = { v: 22, a: 45, h: 0, g: "earth", drag: false, ball: "tennis", target: 40 };

type View = { ox: number; gy: number; s: number };
const viewFor = (w: number, h: number, paths: Pt[][], p: P): View => {
  let W = Math.max(10, p.target + 6), Hh = Math.max(5, p.h + 2);
  for (const q of paths) { const s = summary(q); W = Math.max(W, s.range); Hh = Math.max(Hh, s.top); }
  const ox = 74, gy = h - 64;
  const s = Math.min((w - ox - 36) / (W * 1.06), (gy - 46) / (Hh * 1.12));
  return { ox, gy, s };
};

/** Sky, hills, ground with distance markers, the tower and the cannon. */
function scene(ctx: Ctx, w: number, h: number, v: View, p: P, t: SimTheme) {
  const pl = PLANETS[p.g];
  const sky = ctx.createLinearGradient(0, 0, 0, v.gy);
  sky.addColorStop(0, pl.sky[0]); sky.addColorStop(0.6, pl.sky[1]); sky.addColorStop(1, pl.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, v.gy);
  if (p.g === "moon") {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (let i = 0; i < 70; i++) { const x = (i * 97.3) % w, y = (i * 53.7) % (v.gy * 0.8); ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1); }
    sphere(ctx, w - 70, 60, 22, "#2b6cb0");
  } else {
    const sun = ctx.createRadialGradient(w - 90, 70, 0, w - 90, 70, 120);
    sun.addColorStop(0, "rgba(255,250,220,0.95)"); sun.addColorStop(0.15, "rgba(255,240,200,0.6)"); sun.addColorStop(1, "rgba(255,240,200,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(w - 220, 0, 220, 200);
  }
  // Two layers of hills
  for (const [k, amp, col] of [[0.004, 34, mix(pl.hills, pl.sky[2], 0.55)], [0.007, 22, pl.hills]] as const) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, v.gy);
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, v.gy - 18 - amp * (0.6 + 0.4 * Math.sin(x * k * 3.1 + amp)) * (0.7 + 0.3 * Math.sin(x * k)));
    ctx.lineTo(w, v.gy);
    ctx.fill();
  }
  const gr = ctx.createLinearGradient(0, v.gy, 0, h);
  gr.addColorStop(0, pl.ground[0]); gr.addColorStop(1, pl.ground[1]);
  ctx.fillStyle = gr;
  ctx.fillRect(0, v.gy, w, h - v.gy);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(0, v.gy, w, 2);
  // Distance markers
  const maxX = (w - v.ox) / v.s;
  for (const m of niceTicks(0, maxX, Math.max(3, Math.floor(w / 110)))) {
    const x = v.ox + m * v.s;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(x - 0.75, v.gy, 1.5, 9);
    label(ctx, `${fmt(m, 1)} m`, x, v.gy + 22, { color: "rgba(255,255,255,0.92)", size: 11, weight: 600 });
  }
  // Launch tower
  if (p.h > 0) {
    const top = v.gy - p.h * v.s;
    const tg = ctx.createLinearGradient(v.ox - 34, 0, v.ox + 10, 0);
    tg.addColorStop(0, "#5b5f6b"); tg.addColorStop(1, "#8b909c");
    ctx.fillStyle = tg;
    ctx.fillRect(v.ox - 34, top, 40, v.gy - top);
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    for (let y = top + 10; y < v.gy; y += 12) { ctx.beginPath(); ctx.moveTo(v.ox - 34, y); ctx.lineTo(v.ox + 6, y); ctx.stroke(); }
    label(ctx, `${fmt(p.h, 1)} m`, v.ox - 50, (top + v.gy) / 2, { color: "#ffffff", size: 11, weight: 600, halo: true, align: "right" });
  }
  void t;
}

function cannon(ctx: Ctx, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-rad(angle));
  const g = ctx.createLinearGradient(0, -9, 0, 9);
  g.addColorStop(0, "#9aa3b2"); g.addColorStop(0.45, "#3b4252"); g.addColorStop(1, "#1f2430");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-10, -9); ctx.lineTo(40, -6.5); ctx.lineTo(40, 6.5); ctx.lineTo(-10, 9); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#151922";
  ctx.fillRect(38, -7.5, 5, 15);
  ctx.restore();
  // Wheel
  ctx.fillStyle = "#5b3a1e";
  ctx.beginPath(); ctx.arc(x, y + 6, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#2c1a0b"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#2c1a0b";
  ctx.beginPath(); ctx.arc(x, y + 6, 3, 0, Math.PI * 2); ctx.fill();
}

const GHOSTS = ["#f472b6", "#a78bfa", "#38bdf8", "#facc15"];

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const p = { ...DEF, target: 30 };
  const path = fly(p);
  const v = viewFor(w, h, [path], p);
  v.gy = h - 26; v.ox = 30;
  v.s = Math.min((w - 50) / summary(path).range, (v.gy - 20) / summary(path).top);
  scene(ctx, w, h, v, p, t);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  path.forEach((q, i) => (i ? ctx.lineTo(v.ox + q.x * v.s, v.gy - q.y * v.s) : ctx.moveTo(v.ox + q.x * v.s, v.gy - q.y * v.s)));
  ctx.stroke();
  ctx.setLineDash([]);
  const q = at(path, summary(path).time * 0.62);
  sphere(ctx, v.ox + q.x * v.s, v.gy - q.y * v.s, 7, BALLS.tennis.color, { shadow: true });
  cannon(ctx, v.ox, v.gy - 4, p.a);
}

export default function Projectile() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { v: [1, 80], a: [0, 90], h: [0, 60], target: [5, 400], g: Object.keys(PLANETS), ball: Object.keys(BALLS) });
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [show, setShow] = useState({ vectors: true, dots: true, ideal: true });
  const path = useMemo(() => fly(p), [p]);
  const ideal = useMemo(() => (p.drag && PLANETS[p.g].rho > 0 ? fly(p, false) : null), [p]);
  const sum = useMemo(() => summary(path), [path]);
  // Angle that gives the greatest range for these settings (for the challenge)
  const best = useMemo(() => {
    if (!p.drag) return { a: 45, r: 0 };
    let bestA = 45, bestR = 0;
    for (let a = 5; a <= 85; a += 1) { const r = summary(fly({ ...p, a })).range; if (r > bestR) { bestR = r; bestA = a; } }
    return { a: bestA, r: bestR };
  }, [p.v, p.h, p.g, p.drag, p.ball]); // eslint-disable-line react-hooks/exhaustive-deps

  const sim = useRef({ t: 0, landed: false, ghosts: [] as { path: Pt[]; color: string }[], last: null as null | { range: number; angle: number; drag: boolean; planet: Planet; speed: number; ball: Ball } });
  const graph = useRef<number[][]>([]);
  const view = useRef<View>({ ox: 74, gy: 300, s: 10 });
  const drag = useRef<"angle" | "target" | null>(null);

  const launch = () => { sim.current.t = 0; sim.current.landed = false; graph.current = []; setRunning(true); };
  const reset = () => { setRunning(false); sim.current.t = 0; sim.current.landed = false; graph.current = []; };
  const run = (r: boolean) => { if (r && (sim.current.landed || sim.current.t === 0)) launch(); else setRunning(r); };

  const live = useLive(() => ({ ...at(path, sim.current.t), landed: sim.current.landed, last: sim.current.last }), 12);
  const flying = running || (sim.current.t > 0 && !sim.current.landed);
  const cur = live;

  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const s = sim.current;
    const v = viewFor(w, h, [path, ...(ideal && show.ideal ? [ideal] : [])], p);
    view.current = v;
    if (running) {
      s.t = Math.min(sum.time, s.t + dt * speed);
      const q = at(path, s.t);
      const g = graph.current;
      if (!g.length || s.t - g[g.length - 1][0] > 1 / 30) g.push([s.t, q.vx, q.vy]);
      if (s.t >= sum.time && !s.landed) {
        s.landed = true;
        s.ghosts = [{ path, color: GHOSTS[s.ghosts.length % GHOSTS.length] }, ...s.ghosts].slice(0, 4);
        s.last = { range: sum.range, angle: p.a, drag: p.drag, planet: p.g, speed: p.v, ball: p.ball };
        setRunning(false);
      }
    }
    scene(ctx, w, h, v, p, theme);
    const X = (x: number) => v.ox + x * v.s, Y = (y: number) => v.gy - y * v.s;
    // Target
    const tx = X(p.target);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(tx, v.gy + 2, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
    for (const [r, c] of [[20, "#ef4444"], [14, "#f8fafc"], [8, "#ef4444"]] as const) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(tx, v.gy, r, r * 0.22, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, v.gy); ctx.lineTo(tx, v.gy - 46); ctx.stroke();
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(tx, v.gy - 46); ctx.lineTo(tx + 20, v.gy - 40); ctx.lineTo(tx, v.gy - 34); ctx.fill();
    label(ctx, `target ${fmt(p.target, 1)} m`, tx, v.gy - 56, { color: "#ffffff", size: 11, weight: 600, halo: true });
    // Earlier flights
    for (const gst of s.ghosts) {
      ctx.strokeStyle = gst.color; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
      ctx.beginPath(); gst.path.forEach((q, i) => (i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y)))); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Without air resistance, for comparison
    if (ideal && show.ideal) {
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ideal.forEach((q, i) => (i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y)))); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, "no air resistance", X(summary(ideal).range), Y(0) - 14, { color: "#ffffff", size: 10.5, halo: true, align: "right" });
    }
    // Planned path (faint) and the flight so far (bright)
    ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.setLineDash([2, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath(); path.forEach((q, i) => (i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y)))); ctx.stroke(); ctx.setLineDash([]);
    if (s.t > 0) {
      ctx.strokeStyle = "#fde047"; ctx.lineWidth = 3; ctx.shadowColor = "rgba(253,224,71,0.7)"; ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < path.length && path[i].t <= s.t; i++) { const q = path[i]; if (i) ctx.lineTo(X(q.x), Y(q.y)); else ctx.moveTo(X(q.x), Y(q.y)); }
      const q = at(path, s.t); ctx.lineTo(X(q.x), Y(q.y));
      ctx.stroke(); ctx.shadowBlur = 0;
      if (show.dots) {
        // Equal time intervals: the spacing shows what the velocity is doing
        const step = sum.time > 6 ? 1 : sum.time > 2.4 ? 0.5 : 0.25;
        for (let tt = step; tt < s.t; tt += step) { const d = at(path, tt); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(X(d.x), Y(d.y), 3, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    // Maximum height and landing markers once known
    if (s.landed || s.t > 0) {
      const topQ = path.reduce((a, b) => (b.y > a.y ? b : a));
      if (s.t >= topQ.t) {
        ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(topQ.x), Y(topQ.y)); ctx.lineTo(X(topQ.x), Y(0)); ctx.stroke(); ctx.setLineDash([]);
        label(ctx, `max ${fmt(topQ.y, 2)} m`, X(topQ.x), Y(topQ.y) - 14, { color: "#ffffff", size: 11, weight: 600, halo: true });
      }
    }
    if (s.landed) label(ctx, `${fmt(sum.range, 2)} m`, X(sum.range), v.gy - 18, { color: "#fde047", size: 13, weight: 700, halo: true });
    // Cannon and ball
    const cy = Y(p.h) - 4;
    cannon(ctx, v.ox, cy, p.a);
    const q = at(path, s.t);
    const br = Math.max(5, Math.min(10, BALLS[p.ball].d * v.s));
    if (s.t > 0 || !running) sphere(ctx, X(q.x), Y(q.y) - (s.t === 0 ? 0 : 0), br, BALLS[p.ball].color, { shadow: true });
    if (show.vectors && s.t > 0 && !s.landed) {
      const k = 70 / Math.max(5, p.v);
      arrow(ctx, X(q.x), Y(q.y), X(q.x) + q.vx * k, Y(q.y), "#60a5fa", { width: 2.5, label: "vₓ", font: 12 });
      arrow(ctx, X(q.x), Y(q.y), X(q.x), Y(q.y) - q.vy * k, "#f87171", { width: 2.5, label: "vᵧ", font: 12 });
      arrow(ctx, X(q.x), Y(q.y), X(q.x) + q.vx * k, Y(q.y) - q.vy * k, "#4ade80", { width: 3, label: "v", font: 13 });
    }
    if (s.t === 0 && !running) label(ctx, "Drag the cannon to aim · drag the target to move it", w / 2, 24, { color: "#ffffff", size: 12, halo: true });
  };

  const onDown = (pt: { x: number; y: number }) => {
    const v = view.current;
    const cy = v.gy - p.h * v.s - 4;
    if (Math.hypot(pt.x - v.ox, pt.y - cy) < 70 && pt.x >= v.ox - 30) { drag.current = "angle"; return true; }
    if (Math.abs(pt.x - (v.ox + p.target * v.s)) < 30 && pt.y > v.gy - 70 && pt.y < v.gy + 20) { drag.current = "target"; return true; }
    drag.current = null;
    return false;
  };
  const onMove = (pt: { x: number; y: number }, down: boolean) => {
    if (!down || !drag.current) return;
    const v = view.current;
    if (drag.current === "angle") {
      const a = Math.round((Math.atan2(v.gy - p.h * v.s - 4 - pt.y, pt.x - v.ox) * 180) / Math.PI);
      set({ a: Math.max(0, Math.min(90, a)) });
    } else set({ target: Math.max(5, Math.min(400, Math.round(((pt.x - v.ox) / v.s) * 2) / 2)) });
    if (!running) reset();
  };

  const last = live.last;
  const challenges = [
    { id: "hit", title: "Hit the target", detail: "Land within 1 m of the target's centre.", done: !!last && Math.abs(last.range - p.target) <= 1 },
    { id: "steep", title: "Land at 30 m with an angle above 60°", detail: "Then find a second, lower angle that lands in the same place. What do the two angles add up to?", done: !!last && last.angle > 60 && Math.abs(last.range - 30) <= 0.5 && !last.drag },
    { id: "drag", title: "With air resistance on, find the angle for the greatest range", detail: "On Earth with a tennis ball. It isn't 45°.", done: !!last && last.drag && last.planet === "earth" && p.drag && last.angle === p.a && Math.abs(last.angle - best.a) <= 1 },
    { id: "moon", title: "Throw 100 m on the Moon at 15 m/s or less", detail: "Work out the angle and speed before you launch.", done: !!last && last.planet === "moon" && last.speed <= 15 && last.range >= 100 },
  ];

  const pl = PLANETS[p.g];
  return (
    <SimShell
      id="projectile"
      running={running}
      onRun={run}
      onReset={reset}
      speed={speed}
      onSpeed={setSpeed}
      challenges={challenges}
      record={() => ({ "angle (°)": p.a, "speed (m/s)": p.v, "height (m)": p.h, "range (m)": +sum.range.toFixed(3), "max height (m)": +sum.top.toFixed(3), "time (s)": +sum.time.toFixed(3) })}
      ask={() => `Settings: launch speed ${p.v} m/s at ${p.a}°, from ${p.h} m, on ${pl.name} (g = ${pl.g} m/s²), ${p.drag ? `air resistance ON with a ${BALLS[p.ball].name}` : "no air resistance"}. Result: range ${fmt(sum.range, 2)} m, max height ${fmt(sum.top, 2)} m, flight time ${fmt(sum.time, 2)} s.`}
      stage={<Stage label={`Projectile launched at ${p.v} metres per second, ${p.a} degrees`} render={render} onDown={onDown} onMove={onMove} cursor="crosshair" />}
      overlay={
        <Readouts>
          <Readout label="time" value={cur.t} unit="s" />
          <Readout label="x" value={cur.x} unit="m" />
          <Readout label="y" value={cur.y} unit="m" />
          <Readout label="speed" value={Math.hypot(cur.vx, cur.vy)} unit="m/s" color="#4ade80" />
          {!flying && <Readout label="range" value={sum.range} unit="m" color="#fde047" />}
          {!flying && <Readout label="max height" value={sum.top} unit="m" />}
          {!flying && <Readout label="flight time" value={sum.time} unit="s" />}
        </Readouts>
      }
      below={<TimeGraph title="Velocity components" data={graph} yLabel="v / m s⁻¹" window={Math.max(2, Math.ceil(sum.time))} series={[{ label: "vₓ (horizontal)", color: theme.c.blue }, { label: "vᵧ (vertical)", color: theme.c.red }]} />}
      controls={
        <>
          <Group title="Launch">
            <Slider label="Launch speed" value={p.v} min={1} max={80} step={0.5} unit="m/s" onChange={(v) => { set({ v }); reset(); }} />
            <Slider label="Angle" value={p.a} min={0} max={90} step={1} unit="°" onChange={(a) => { set({ a }); reset(); }} />
            <Slider label="Launch height" value={p.h} min={0} max={60} step={0.5} unit="m" onChange={(h) => { set({ h }); reset(); }} />
            <Slider label="Target distance" value={p.target} min={5} max={400} step={0.5} unit="m" onChange={(target) => set({ target })} />
          </Group>
          <Group title="World">
            <Choice label="Planet" value={p.g} onChange={(g) => { set({ g }); reset(); }} options={(Object.keys(PLANETS) as Planet[]).map((k) => ({ value: k, label: PLANETS[k].name }))} wrap />
            <p className="-mt-2 text-[11.5px] text-lp-mute">g = {pl.g} m/s²{p.g === "jupiter" ? " (as if Jupiter had a surface)" : ""}{p.g === "moon" ? ". No air, so no air resistance." : ""}</p>
            <Switch label="Air resistance" checked={p.drag} onChange={(drag) => { set({ drag }); reset(); }} hint={p.drag ? `Drag force ½ρC_dAv², air density ${pl.rho} kg/m³` : "Off: only gravity acts after launch."} />
            {p.drag && <Choice label="Object" value={p.ball} onChange={(ball) => { set({ ball }); reset(); }} options={(Object.keys(BALLS) as Ball[]).map((k) => ({ value: k, label: BALLS[k].name }))} wrap />}
          </Group>
          <Group title="Show">
            <Switch label="Velocity vectors" checked={show.vectors} onChange={(vectors) => setShow({ ...show, vectors })} />
            <Switch label="Equal-time dots" checked={show.dots} onChange={(dots) => setShow({ ...show, dots })} hint="A dot every fixed interval of time." />
            {p.drag && <Switch label="Path without air resistance" checked={show.ideal} onChange={(ideal) => setShow({ ...show, ideal })} />}
            <div className="flex gap-2"><Btn onClick={() => { sim.current.ghosts = []; }}>Clear old paths</Btn><Btn onClick={() => { resetP(); reset(); }}>Default settings</Btn></div>
          </Group>
        </>
      }
      learn={
        <>
          <H>Two motions at once</H>
          <p>After launch, the only force (without air) is gravity, straight down. So the horizontal velocity never changes, while the vertical velocity changes by g every second. The equal-time dots are evenly spaced sideways but bunch up near the top.</p>
          <Eq>vₓ = v cos θ &nbsp;&nbsp; vᵧ = v sin θ − g t</Eq>
          <Eq>x = v cos θ · t &nbsp;&nbsp; y = h + v sin θ · t − ½ g t²</Eq>
          <H>Useful results (launched from the ground, no air)</H>
          <Eq>max height = (v sin θ)² ⁄ 2g</Eq>
          <Eq>range = v² sin 2θ ⁄ g</Eq>
          <p>sin 2θ is largest when 2θ = 90°, so 45° gives the greatest range. Angles that add up to 90° (like 30° and 60°) give the same range, because sin 2θ is the same for both.</p>
          <H>Air resistance</H>
          <p>Drag acts against the velocity and grows with speed squared (F = ½ρC_dAv²). It shortens the range and makes the path lopsided: the way down is steeper than the way up. Light, wide objects (a table-tennis ball) are affected far more than heavy, compact ones (a shot put), and the best angle drops below 45°.</p>
          <Try>double the launch speed. Does the range double? (Without air it goes up four times, because range ∝ v².)</Try>
        </>
      }
    />
  );
}
