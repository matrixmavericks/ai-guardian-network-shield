import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Switch } from "../kit/controls";
import { arrow, label, roundRect, fmt, TAU, type Ctx } from "../kit/draw";

// Cross-sections of plate boundaries that move with time: spreading ridges with
// magnetic stripes, subduction with a volcanic arc, continental collision, and a
// transform fault seen from above that sticks and slips.

type Kind = "divergent" | "subduction" | "collision" | "transform";
type P = { kind: Kind; speed: number; labels: boolean };
const DEF: P = { kind: "divergent", speed: 5, labels: true };
const KINDS: Record<Kind, { name: string; example: string }> = {
  divergent: { name: "Divergent", example: "Mid-Atlantic Ridge, Iceland" },
  subduction: { name: "Ocean–continent", example: "Andes, Japan" },
  collision: { name: "Continent–continent", example: "Himalayas" },
  transform: { name: "Transform", example: "San Andreas Fault" },
};

// Magnetic polarity flips (millions of years ago): a fixed, irregular history
const GAPS = [0.78, 1.8, 1.02, 1.6, 0.9, 1.3, 1.5, 0.8, 1.3, 1.4, 0.7, 1.5, 1.4, 1.3, 0.8, 1.7];
/** Field polarity at simulation time τ (million years; negative is before the run), with irregular flips */
const polarity = (tau: number) => { let x = tau + 60, n = 0, i = 0; while (x > 0) { x -= GAPS[i % GAPS.length]; i++; n++; } return n % 2 === 0; };

type Quake = { x: number; y: number; at: number; big?: number };

const sky = (ctx: Ctx, w: number, top: number) => {
  const g = ctx.createLinearGradient(0, 0, 0, top);
  g.addColorStop(0, "#0b2447"); g.addColorStop(1, "#5b8cc8");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, top);
};
const mantle = (ctx: Ctx, w: number, h: number, y0: number, t: number, cells: number[]) => {
  const g = ctx.createLinearGradient(0, y0, 0, h);
  g.addColorStop(0, "#c2410c"); g.addColorStop(1, "#7c2d12");
  ctx.fillStyle = g; ctx.fillRect(0, y0, w, h - y0);
  // Convection: slow circular currents
  for (const cx of cells) {
    const r = Math.min(110, (h - y0) * 0.38);
    const cy = y0 + (h - y0) * 0.55;
    ctx.strokeStyle = "rgba(254,215,170,0.35)"; ctx.lineWidth = 2; ctx.setLineDash([8, 10]); ctx.lineDashOffset = -t * 6;
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.4, r * 0.6, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
  }
};

function divergent(ctx: Ctx, w: number, h: number, p: P, t: number, quakes: Quake[], th: SimTheme) {
  // Scaled to the stage: sky, sea (0–6 km deep), crust, lithosphere that thickens with age, mantle
  const sea = h * 0.14, mid = w / 2, kmPx = w / 1600; // the section is 1600 km wide
  sky(ctx, w, sea);
  const vy = (km: number) => sea + km * ((h * 0.26) / 6);
  const depth = (age: number) => 2.5 + 0.35 * Math.sqrt(age); // km below sea level: older is colder and sinks
  const crustT = h * 0.05;
  const lithT = (age: number) => h * 0.03 + h * 0.16 * Math.sqrt(Math.min(age, 30) / 30);
  const speedKmPerMyr = p.speed * 10; // cm/yr → km per million years
  const mantleTop = vy(depth(30)) + crustT + h * 0.19;
  mantle(ctx, w, h, sea + h * 0.2, t, [mid - w * 0.27, mid + w * 0.27]);
  const water = ctx.createLinearGradient(0, sea, 0, vy(6));
  water.addColorStop(0, "#1e6fb8"); water.addColorStop(1, "#0b2a5c");
  for (let x = 0; x < w; x += 2) {
    const km = Math.abs(x - mid) / kmPx;
    const age = km / speedKmPerMyr;
    const formed = age <= t;
    const a = formed ? age : t + age; // crust older than the run keeps ageing
    const floor = vy(depth(a));
    ctx.fillStyle = water; ctx.fillRect(x, sea, 2, floor - sea);
    // Crust: stripes record the field when it formed (dark normal, light reversed)
    // Rock here formed at time (now − age) and keeps the field direction of that moment
    ctx.fillStyle = polarity(t - age) ? "#1f2937" : "#a8b0bd";
    void formed;
    ctx.fillRect(x, floor, 2, crustT);
    ctx.fillStyle = "#57534e";
    ctx.fillRect(x, floor + crustT, 2, lithT(a));
  }
  void mantleTop;
  // Magma chamber and rising melt under the ridge
  const ridgeBase = vy(depth(0)) + crustT;
  const glowG = ctx.createRadialGradient(mid, ridgeBase + 20, 4, mid, ridgeBase + 20, h * 0.16);
  glowG.addColorStop(0, "rgba(254,240,138,0.95)"); glowG.addColorStop(0.35, "rgba(249,115,22,0.7)"); glowG.addColorStop(1, "rgba(249,115,22,0)");
  ctx.fillStyle = glowG; ctx.beginPath(); ctx.arc(mid, ridgeBase + 20, h * 0.16, 0, TAU); ctx.fill();
  ctx.fillStyle = "#fb923c";
  for (let i = 0; i < 7; i++) { const yy = ridgeBase + h * 0.18 - ((t * 60 + i * 26) % (h * 0.2)); ctx.beginPath(); ctx.arc(mid + Math.sin(i * 2.3 + t * 2) * 8, yy, 4.5, 0, TAU); ctx.fill(); }
  arrow(ctx, mid - 50, vy(4.6), mid - 170, vy(4.6), "#f8fafc", { width: 3 });
  arrow(ctx, mid + 50, vy(4.6), mid + 170, vy(4.6), "#f8fafc", { width: 3 });
  for (const q of quakes) { const al = Math.max(0, 1 - (t - q.at) / 1.5); if (al <= 0) continue; ctx.fillStyle = `rgba(250,204,21,${al})`; ctx.beginPath(); ctx.arc(q.x, ridgeBase - crustT * 0.4 + (q.y % 10), 5, 0, TAU); ctx.fill(); }
  if (p.labels) {
    label(ctx, "mid-ocean ridge", mid, vy(depth(0)) - 14, { color: "#ffffff", size: 12, weight: 700, halo: true });
    label(ctx, "new oceanic crust forms here", mid, ridgeBase + h * 0.2, { color: "#fef3c7", size: 11.5, weight: 600, halo: true });
    label(ctx, "ocean", 90, vy(1.2), { color: "#bfdbfe", size: 12, weight: 600, halo: true });
    label(ctx, "lithosphere (rigid plate)", 120, vy(depth(30)) + crustT + h * 0.08, { color: "#e7e5e4", size: 11.5, weight: 600, halo: true });
    label(ctx, "asthenosphere (hot, slowly flowing mantle)", w / 2, h - 46, { color: "#fed7aa", size: 11.5, weight: 600, halo: true });
    label(ctx, "magnetic stripes: dark = normal field, light = reversed", w / 2, h - 22, { color: "#fde68a", size: 11.5, weight: 600, halo: true });
  }
  void th;
}

function subduction(ctx: Ctx, w: number, h: number, p: P, t: number, quakes: Quake[]) {
  const sea = h * 0.26, trench = w * 0.42, ang = 0.6;
  const floorY = sea + h * 0.11, slabT = h * 0.07;
  sky(ctx, w, sea);
  mantle(ctx, w, h, floorY + slabT * 0.6, t, [w * 0.22, w * 0.72]);
  const water = ctx.createLinearGradient(0, sea, 0, floorY + 20);
  water.addColorStop(0, "#1e6fb8"); water.addColorStop(1, "#0b2a5c");
  ctx.fillStyle = water; ctx.fillRect(0, sea, trench + 60, floorY + 20 - sea);
  const L = Math.hypot(w, h) * 1.2;
  const slabTop = (s: number): [number, number] => (s <= 0 ? [trench + s, floorY + 10] : [trench + Math.cos(ang) * s, floorY + 10 + Math.sin(ang) * s]);
  // Oceanic plate bending down into the mantle
  const nx = -Math.sin(ang) * slabT, ny = Math.cos(ang) * slabT;
  ctx.fillStyle = "#3f3f46";
  ctx.beginPath(); ctx.moveTo(0, floorY);
  for (let s = -trench; s <= L; s += 20) { const [x, y] = slabTop(s); ctx.lineTo(x, y); }
  for (let s = L; s >= 0; s -= 20) { const [x, y] = slabTop(s); ctx.lineTo(x + nx, y + ny); }
  ctx.lineTo(trench, floorY + 10 + slabT); ctx.lineTo(0, floorY + slabT); ctx.closePath(); ctx.fill();
  // Moving bands show the plate heading into the trench
  const step = 50, shift = (t * p.speed * 6) % step;
  for (let s = -trench - step + shift; s < L; s += step) {
    const [x, y] = slabTop(s); const [x2, y2] = slabTop(s + 14);
    const n1 = s <= 0 ? [0, slabT] : [nx, ny], n2 = s + 14 <= 0 ? [0, slabT] : [nx, ny];
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.lineTo(x2 + n2[0], y2 + n2[1]); ctx.lineTo(x + n1[0], y + n1[1]); ctx.closePath(); ctx.fill();
  }
  // Continent with a growing volcano
  const vx = trench + w * 0.24, grow = Math.min(1, t / 6), land = sea - h * 0.03;
  const cont = ctx.createLinearGradient(0, land - h * 0.12, 0, floorY + h * 0.2);
  cont.addColorStop(0, "#a16207"); cont.addColorStop(1, "#57534e");
  ctx.fillStyle = cont;
  ctx.beginPath(); ctx.moveTo(trench + 16, floorY + 8); ctx.quadraticCurveTo(trench + w * 0.08, sea, trench + w * 0.14, land);
  ctx.lineTo(vx - w * 0.06, land); ctx.lineTo(vx - 10, land - h * 0.13 * grow); ctx.lineTo(vx + 10, land - h * 0.13 * grow); ctx.lineTo(vx + w * 0.06, land);
  ctx.lineTo(w, land); ctx.lineTo(w, floorY + h * 0.18);
  const [bx, by] = slabTop((w - trench) / Math.cos(ang));
  ctx.lineTo(Math.min(w, bx), Math.min(by, floorY + h * 0.18)); ctx.lineTo(trench + 16, floorY + 8); ctx.closePath(); ctx.fill();
  // Melt from the slab rising to the volcano
  const [mx, my] = slabTop((vx - trench) / Math.cos(ang));
  ctx.strokeStyle = "rgba(249,115,22,0.9)"; ctx.lineWidth = 5; ctx.setLineDash([7, 7]); ctx.lineDashOffset = -t * 20;
  ctx.beginPath(); ctx.moveTo(mx, my - 6); ctx.bezierCurveTo(mx - 24, my - h * 0.1, vx + 18, land + h * 0.06, vx, land - h * 0.13 * grow); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
  if (grow > 0.5 && Math.sin(t * 3) > 0.5) for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(148,163,184,${0.45 - i * 0.05})`; ctx.beginPath(); ctx.arc(vx + i * 9, land - h * 0.13 * grow - 14 - i * 12, 10 + i * 3, 0, TAU); ctx.fill(); }
  arrow(ctx, w * 0.06, floorY - h * 0.04, w * 0.06 + 110, floorY - h * 0.04, "#f8fafc", { width: 3 });
  // Earthquakes along the top of the slab, deeper further inland
  for (const q of quakes) { const al = Math.max(0, 1 - (t - q.at) / 1.5); if (al <= 0) continue; const d = ((q.x * 7919) % 1000) / 1000; const [qx, qy] = slabTop(d * L * 0.45); ctx.fillStyle = `rgba(250,204,21,${al})`; ctx.beginPath(); ctx.arc(qx + nx * 0.3, qy + ny * 0.3, 5, 0, TAU); ctx.fill(); }
  if (p.labels) {
    label(ctx, "oceanic plate (dense)", w * 0.18, floorY + slabT * 0.5, { color: "#e2e8f0", size: 12, weight: 700, halo: true });
    label(ctx, "continental plate (less dense)", w * 0.8, land + h * 0.06, { color: "#fef3c7", size: 12, weight: 700, halo: true });
    label(ctx, "deep trench", trench - 8, floorY + 34, { color: "#ffffff", size: 11.5, weight: 600, halo: true, align: "right" });
    label(ctx, "volcano", vx, land - h * 0.13 * grow - 16, { color: "#fecaca", size: 12, weight: 700, halo: true });
    label(ctx, "the slab sinks; earthquakes (yellow) get deeper inland", w * 0.55, h - 22, { color: "#fde68a", size: 11.5, weight: 600, halo: true });
  }
}

function collision(ctx: Ctx, w: number, h: number, p: P, t: number, quakes: Quake[]) {
  const ground = h * 0.5, mid = w / 2, crustT = h * 0.2;
  sky(ctx, w, ground);
  mantle(ctx, w, h, ground + crustT * 0.8, t, [w * 0.22, w * 0.78]);
  const height = Math.min(h * 0.32, t * p.speed * 12);
  const root = height * 1.1;
  const bump = (x: number) => { const d = (x - mid) / (w * 0.2); return Math.exp(-d * d); };
  const COLORS = ["#a16207", "#92400e", "#b45309", "#78350f", "#a8a29e", "#57534e"];
  for (let layer = 0; layer < 6; layer++) {
    const yTop = ground + (layer * crustT) / 6;
    ctx.fillStyle = COLORS[layer];
    ctx.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const b = bump(x);
      const fold = Math.sin(x * 0.05 + layer) * 12 * b * Math.min(1, t / 3);
      const y = yTop - height * b * (1 - layer * 0.1) + fold;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    for (let x = w; x >= 0; x -= 6) ctx.lineTo(x, ground + crustT + root * bump(x));
    ctx.closePath(); ctx.fill();
  }
  if (height > h * 0.15) { ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.moveTo(mid - 46, ground - height + 40); ctx.quadraticCurveTo(mid, ground - height - 10, mid + 46, ground - height + 40); ctx.closePath(); ctx.fill(); }
  arrow(ctx, w * 0.06, ground + crustT * 0.45, w * 0.06 + 120, ground + crustT * 0.45, "#f8fafc", { width: 3 });
  arrow(ctx, w * 0.94, ground + crustT * 0.45, w * 0.94 - 120, ground + crustT * 0.45, "#f8fafc", { width: 3 });
  for (const q of quakes) { const al = Math.max(0, 1 - (t - q.at) / 1.5); if (al <= 0) continue; ctx.fillStyle = `rgba(250,204,21,${al})`; ctx.beginPath(); ctx.arc(q.x, ground + ((q.y * 13) % (crustT * 0.9)), 5, 0, TAU); ctx.fill(); }
  if (p.labels) {
    label(ctx, "fold mountains", mid, ground - height - 22, { color: "#ffffff", size: 13, weight: 700, halo: true });
    label(ctx, "the crust thickens into a deep root", mid, ground + crustT + root + 22, { color: "#fde68a", size: 11.5, weight: 600, halo: true });
    label(ctx, "continental crust", w * 0.14, ground - 16, { color: "#fef3c7", size: 12, weight: 700, halo: true });
    label(ctx, "neither plate is dense enough to sink, so there are no volcanoes", mid, h - 22, { color: "#fde68a", size: 11.5, weight: 600, halo: true });
  }
}

function transform(ctx: Ctx, w: number, h: number, p: P, years: number, slipAt: number[]) {
  // Seen from above: the fault runs up the middle and the two plates slide past each other
  const mid = w / 2;
  const locked = years - (slipAt[slipAt.length - 1] ?? 0);
  const interval = 600 / p.speed;
  const strain = Math.min(1, locked / interval);
  const slip = slipAt.length * 4; // metres released so far (about 4 m per big earthquake)
  const pxM = 5;
  const off = (side: number) => side * -((slip * pxM) / 2); // left plate moves up the page, right moves down
  const bend = (x: number, side: number) => { const d = Math.abs(x - mid) / (w * 0.22); return side * -strain * 26 * Math.exp(-d * d); };
  // Patchwork fields that ride on each plate
  const FIELD = ["#4d7c3f", "#5b8c48", "#6b9a4f", "#8a9a4b", "#a3a35a", "#55803f"];
  for (const side of [-1, 1]) {
    ctx.save(); ctx.beginPath(); ctx.rect(side < 0 ? 0 : mid, 0, mid, h); ctx.clip();
    ctx.fillStyle = "#3f6b34"; ctx.fillRect(side < 0 ? 0 : mid, 0, mid, h);
    const o = off(side);
    const rowShift = ((o % 80) + 80) % 80;
    const rowBase = Math.floor(o / 80);
    for (let r = -3; r < Math.ceil(h / 80) + 3; r++) for (let c = 0; c < 5; c++) {
      const x0 = (side < 0 ? 0 : mid) + c * (mid / 5), y0 = r * 80 + rowShift - 80;
      ctx.fillStyle = FIELD[Math.abs(((r - rowBase) * 7 + c * 3 + (side < 0 ? 0 : 2)) % FIELD.length)];
      ctx.fillRect(x0 + 2, y0 + 2, mid / 5 - 4, 76);
    }
    ctx.restore();
  }
  // A road and a stream cross the fault: offset by past quakes, bent by stored strain
  const feature = (y0: number, color: string, width: number, wave: number) => {
    for (const side of [-1, 1]) {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
      ctx.beginPath();
      const xs = side < 0 ? [0, mid] : [mid, w];
      for (let x = xs[0]; x <= xs[1]; x += 6) {
        const y = y0 + off(side) + bend(x, side) + Math.sin(x * 0.02) * wave;
        if (x === xs[0]) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  };
  feature(h * 0.42, "#374151", 16, 0);
  feature(h * 0.68, "#3b82f6", 8, 10);
  ctx.strokeStyle = "#7c2d12"; ctx.lineWidth = 4;
  ctx.beginPath(); for (let y = 0; y <= h; y += 10) ctx.lineTo(mid + Math.sin(y * 0.05) * 3, y); ctx.stroke();
  arrow(ctx, mid - w * 0.22, h * 0.86, mid - w * 0.22, h * 0.86 - 90, "#f8fafc", { width: 4 });
  arrow(ctx, mid + w * 0.22, h * 0.2, mid + w * 0.22, h * 0.2 + 90, "#f8fafc", { width: 4 });
  const since = years - (slipAt[slipAt.length - 1] ?? -99);
  if (since < 6) for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(250,204,21,${Math.max(0, 0.85 - since / 6 - i * 0.2)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mid, h * 0.5, 30 + since * 40 + i * 30, 0, TAU); ctx.stroke(); }
  if (since < 3) label(ctx, "Earthquake! About 4 m of slip", mid, h * 0.12, { color: "#fef08a", size: 16, weight: 800, halo: true });
  ctx.fillStyle = "rgba(2,6,23,0.7)"; roundRect(ctx, 16, h - 78, 240, 62, 12); ctx.fill();
  label(ctx, `stored strain: ${Math.round(strain * 100)}%`, 28, h - 58, { color: strain > 0.8 ? "#fca5a5" : "#e2e8f0", size: 12, weight: 700, align: "left" });
  ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillRect(28, h - 42, 210, 8);
  ctx.fillStyle = strain > 0.8 ? "#ef4444" : "#fbbf24"; ctx.fillRect(28, h - 42, 210 * strain, 8);
  if (p.labels) {
    label(ctx, "Pacific plate", mid - w * 0.22, h * 0.3, { color: "#ffffff", size: 13, weight: 700, halo: true });
    label(ctx, "North American plate", mid + w * 0.22, h * 0.8, { color: "#ffffff", size: 13, weight: 700, halo: true });
    label(ctx, "road", 40, h * 0.42 + off(-1) - 18, { color: "#ffffff", size: 11, weight: 600, halo: true, align: "left" });
    label(ctx, "stream", 40, h * 0.68 + off(-1) - 18, { color: "#bfdbfe", size: 11, weight: 600, halo: true, align: "left" });
  }
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  subduction(ctx, w, h, { ...DEF, kind: "subduction", labels: false }, 8, []);
  void t;
}

export default function Tectonics() {
  const theme = useSimTheme();
  const [p, set] = useSimParams<P>(DEF, { kind: ["divergent", "subduction", "collision", "transform"], speed: [1, 10] });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const sim = useRef({ t: 0, years: 0, quakes: [] as Quake[], slips: [] as number[], next: 0.4 });
  const size = useRef({ w: 800, h: 500 });
  const reset = () => { sim.current = { t: 0, years: 0, quakes: [], slips: [], next: 0.4 }; };

  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const s = sim.current;
    size.current = { w, h };
    if (running) {
      if (p.kind === "transform") {
        s.years += dt * speed * 20;
        // Stick-slip: a big quake releases the strain built over ~150 years (faster plates, sooner)
        const interval = 600 / p.speed;
        if (s.years - (s.slips[s.slips.length - 1] ?? 0) > interval) s.slips.push(s.years);
      } else {
        s.t += dt * speed * 1.5; // million years
        if (s.t > s.next) {
          s.next = s.t + 0.25 + Math.random() * 0.5;
          const mid = w / 2;
          if (p.kind === "divergent") s.quakes.push({ x: mid + (Math.random() - 0.5) * 60, y: 230 + Math.random() * 40, at: s.t });
          else if (p.kind === "subduction") { const d = Math.random() * 420; s.quakes.push({ x: w * 0.45 + Math.cos(0.6) * d, y: 90 + 92 + Math.sin(0.6) * d + (Math.random() - 0.5) * 16, at: s.t }); }
          else s.quakes.push({ x: mid + (Math.random() - 0.5) * 240, y: h * 0.42 + 20 + Math.random() * 120, at: s.t });
          s.quakes = s.quakes.filter((q) => s.t - q.at < 2);
        }
      }
    }
    if (p.kind === "divergent") divergent(ctx, w, h, p, s.t, s.quakes, theme);
    else if (p.kind === "subduction") subduction(ctx, w, h, p, s.t, s.quakes);
    else if (p.kind === "collision") collision(ctx, w, h, p, s.t, s.quakes);
    else transform(ctx, w, h, p, s.years, s.slips);
  };
  const live = useLive(() => ({ t: sim.current.t, years: sim.current.years, slips: sim.current.slips.length }), 6);
  const dist = p.kind === "transform" ? (p.speed * live.years) / 100 : p.speed * 10 * live.t; // m, or km
  const challenges = [
    { id: "wide", title: "Widen an ocean by 1000 km at a divergent boundary", detail: "Each side moves at the plate speed, so the ocean grows twice as fast.", done: p.kind === "divergent" && 2 * dist >= 1000 },
    { id: "novolc", title: "Find the convergent boundary with no volcanoes", detail: "Why does no magma rise there?", done: p.kind === "collision" && live.t > 2 },
    { id: "quake", title: "Watch a transform fault release its strain in a big earthquake", detail: "How long did the strain build up for?", done: p.kind === "transform" && live.slips >= 1 },
    { id: "stripes", title: "Make the stripe pattern at the ridge wider by changing the plate speed", detail: "Faster spreading means each magnetic period covers more seafloor.", done: p.kind === "divergent" && p.speed >= 8 && live.t > 5 },
  ];

  return (
    <SimShell
      id="tectonics"
      running={running}
      onRun={setRunning}
      speed={speed}
      onSpeed={setSpeed}
      onReset={reset}
      challenges={challenges}
      record={() => (p.kind === "transform" ? { "speed (cm/yr)": p.speed, years: Math.round(live.years), "earthquakes": live.slips, "movement (m)": +dist.toFixed(1) } : { "speed (cm/yr)": p.speed, "time (million years)": +live.t.toFixed(2), "each plate moved (km)": +dist.toFixed(0) })}
      ask={() => `${KINDS[p.kind].name} plate boundary (like ${KINDS[p.kind].example}), plates moving ${p.speed} cm a year. ${p.kind === "transform" ? `After ${Math.round(live.years)} years, ${live.slips} big earthquake(s) have released the built-up strain.` : `After ${fmt(live.t, 1)} million years each plate has moved about ${fmt(dist, 0)} km.`}`}
      stage={<Stage label={`${KINDS[p.kind].name} plate boundary`} render={render} />}
      overlay={
        <Readouts>
          <Readout label="boundary" value={KINDS[p.kind].name} />
          <Readout label="plate speed" value={`${p.speed} cm/yr`} />
          {p.kind === "transform" ? <Readout label="time" value={`${Math.round(live.years)} years`} /> : <Readout label="time" value={`${fmt(live.t, 1)} million yrs`} />}
          <Readout label="each plate moved" value={p.kind === "transform" ? `${fmt(dist, 1)} m` : `${fmt(dist, 0)} km`} color="#fbbf24" />
        </Readouts>
      }
      controls={
        <>
          <Group title="Boundary">
            <Choice value={p.kind} onChange={(kind) => { set({ kind }); reset(); }} options={(Object.keys(KINDS) as Kind[]).map((k) => ({ value: k, label: KINDS[k].name }))} wrap />
            <p className="-mt-1 text-[12px] text-lp-mute">Like the {KINDS[p.kind].example}.</p>
            <Slider label="Plate speed" value={p.speed} min={1} max={10} step={0.5} unit="cm/yr" onChange={(sp) => set({ speed: sp })} hint="About as fast as fingernails grow." />
            <Switch label="Labels" checked={p.labels} onChange={(labels) => set({ labels })} />
          </Group>
        </>
      }
      learn={
        <>
          <H>Why plates move</H>
          <p>The lithosphere (crust plus the rigid top of the mantle) is broken into plates that ride on the hotter, softer asthenosphere. Convection in the mantle, the pull of sinking slabs and the push at ridges move them a few centimetres a year.</p>
          <H>Divergent</H>
          <p>Plates move apart, magma rises and cools into new oceanic crust. As it cools it records Earth's magnetic field, which flips every so often, leaving matching stripes either side of the ridge: the evidence that convinced scientists of seafloor spreading. Older crust is colder and sits deeper.</p>
          <H>Convergent</H>
          <p>Where oceanic meets continental crust, the denser oceanic plate sinks (subduction), making a deep trench, earthquakes that get deeper inland, and a chain of explosive volcanoes where water from the slab melts the mantle above. Where two continents meet, neither sinks: the crust crumples into fold mountains with earthquakes but few volcanoes.</p>
          <H>Transform</H>
          <p>Plates slide past each other. Friction locks the fault, the rocks bend and store energy for decades or centuries, then slip suddenly in an earthquake. Crust is neither made nor destroyed.</p>
          <Eq>distance = speed × time &nbsp; (5 cm/yr × 1 million years = 50 km)</Eq>
          <Try>at 5 cm a year, how long does it take to open an ocean as wide as the Atlantic (about 5000 km)?</Try>
        </>
      }
    />
  );
}
