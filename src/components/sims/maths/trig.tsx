import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Switch } from "../kit/controls";
import { label, rad, TAU, type Ctx } from "../kit/draw";

// The unit circle drives the graphs: as the point turns, its height is sin θ
// and its across-distance is cos θ, traced out against θ.

type P = { th: number; unit: "deg" | "rad"; sin: boolean; cos: boolean; tan: boolean };
const DEF: P = { th: 30, unit: "deg", sin: true, cos: true, tan: false };

const EXACT: Record<number, [string, string, string]> = {
  0: ["0", "1", "0"], 30: ["1/2", "√3/2", "1/√3"], 45: ["√2/2", "√2/2", "1"], 60: ["√3/2", "1/2", "√3"], 90: ["1", "0", "undefined"],
  120: ["√3/2", "−1/2", "−√3"], 135: ["√2/2", "−√2/2", "−1"], 150: ["1/2", "−√3/2", "−1/√3"], 180: ["0", "−1", "0"],
  210: ["−1/2", "−√3/2", "1/√3"], 225: ["−√2/2", "−√2/2", "1"], 240: ["−√3/2", "−1/2", "√3"], 270: ["−1", "0", "undefined"],
  300: ["−√3/2", "1/2", "−√3"], 315: ["−√2/2", "√2/2", "−1"], 330: ["−1/2", "√3/2", "−1/√3"], 360: ["0", "1", "0"],
};
const RAD: Record<number, string> = { 0: "0", 30: "π/6", 45: "π/4", 60: "π/3", 90: "π/2", 120: "2π/3", 135: "3π/4", 150: "5π/6", 180: "π", 210: "7π/6", 225: "5π/4", 240: "4π/3", 270: "3π/2", 300: "5π/3", 315: "7π/4", 330: "11π/6", 360: "2π" };
const angleText = (d: number, unit: P["unit"]) => (unit === "deg" ? `${Math.round(d * 10) / 10}°` : RAD[Math.round(d)] && Math.abs(d - Math.round(d)) < 1e-6 ? RAD[Math.round(d)] : `${(rad(d)).toFixed(3)}`);

function geom(w: number, h: number) {
  const left = Math.min(w * 0.42, h - 40);
  const R = left / 2 - 34;
  return { cx: 24 + left / 2, cy: h / 2, R, gx: 24 + left + 30, gw: w - left - 70 };
}

function draw(ctx: Ctx, w: number, h: number, p: P, t: SimTheme) {
  ctx.fillStyle = t.dark ? "#08101f" : "#fbfcfe"; ctx.fillRect(0, 0, w, h);
  const { cx, cy, R, gx, gw } = geom(w, h);
  const th = rad(p.th), s = Math.sin(th), c = Math.cos(th);
  // Circle, axes and special angles
  ctx.strokeStyle = t.axis; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx - R - 18, cy); ctx.lineTo(cx + R + 18, cy); ctx.moveTo(cx, cy - R - 18); ctx.lineTo(cx, cy + R + 18); ctx.stroke();
  ctx.strokeStyle = t.dark ? "rgba(148,163,184,0.5)" : "rgba(15,23,42,0.35)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  for (const d of Object.keys(RAD).map(Number)) {
    const a = rad(d);
    ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - 6), cy - Math.sin(a) * (R - 6)); ctx.lineTo(cx + Math.cos(a) * (R + 6), cy - Math.sin(a) * (R + 6)); ctx.stroke();
  }
  // Quadrant signs: All, Sin, Tan, Cos positive
  const q = [["A", 1, -1], ["S", -1, -1], ["T", -1, 1], ["C", 1, 1]] as const;
  const quad = Math.floor((((p.th % 360) + 360) % 360) / 90);
  q.forEach(([k, sx, sy], i) => label(ctx, k, cx + sx * R * 0.72, cy + sy * R * 0.72, { color: i === quad ? t.c.amber : t.mute, size: i === quad ? 20 : 15, weight: 700 }));
  // Angle arc
  ctx.strokeStyle = t.c.amber; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, -th, th > 0); ctx.stroke();
  const px = cx + c * R, py = cy - s * R;
  // tan: where the radius line meets the tangent at (1, 0)
  if (p.tan && Math.abs(c) > 0.02) {
    const ty = cy - (s / c) * R;
    ctx.strokeStyle = t.c.green; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx + R, cy - R * 2.2); ctx.lineTo(cx + R, cy + R * 2.2); ctx.stroke();
    ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R, ty); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = t.c.green; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + R, cy); ctx.lineTo(cx + R, ty); ctx.stroke();
    label(ctx, "tan θ", cx + R + 8, (cy + ty) / 2, { color: t.c.green, size: 12, weight: 700, align: "left", halo: true });
  }
  ctx.strokeStyle = t.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
  if (p.cos) { ctx.strokeStyle = t.c.blue; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy); ctx.stroke(); label(ctx, "cos θ", (cx + px) / 2, cy + (s >= 0 ? 16 : -16), { color: t.c.blue, size: 12, weight: 700, halo: true }); }
  if (p.sin) { ctx.strokeStyle = t.c.red; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke(); label(ctx, "sin θ", px + (c >= 0 ? 10 : -10), (cy + py) / 2, { color: t.c.red, size: 12, weight: 700, halo: true, align: c >= 0 ? "left" : "right" }); }
  ctx.fillStyle = t.c.pink; ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
  label(ctx, `(${c.toFixed(2)}, ${s.toFixed(2)})`, px + (c >= 0 ? 14 : -14), py + (s >= 0 ? -16 : 16), { color: t.ink, size: 12, weight: 600, align: c >= 0 ? "left" : "right", halo: true });
  // Graphs against θ, 0 to 360°
  if (gw > 120) {
    const X = (d: number) => gx + (d / 360) * gw, Y = (v: number) => cy - v * R;
    ctx.strokeStyle = t.axis; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(gx, cy); ctx.lineTo(gx + gw + 10, cy); ctx.moveTo(gx, cy - R - 10); ctx.lineTo(gx, cy + R + 10); ctx.stroke();
    for (const d of [90, 180, 270, 360]) { ctx.strokeStyle = t.grid; ctx.beginPath(); ctx.moveTo(X(d), cy - R); ctx.lineTo(X(d), cy + R); ctx.stroke(); label(ctx, p.unit === "deg" ? `${d}°` : RAD[d], X(d), cy + R + 18, { color: t.mute, size: 11 }); }
    for (const v of [1, -1]) { ctx.strokeStyle = t.grid; ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke(); label(ctx, String(v).replace("-", "−"), gx - 8, Y(v), { color: t.mute, size: 11, align: "right" }); }
    const curve = (f: (d: number) => number, col: string, upto: number, width: number, alphaV: number) => {
      ctx.strokeStyle = col; ctx.lineWidth = width; ctx.globalAlpha = alphaV;
      ctx.beginPath();
      let pen = false;
      for (let d = 0; d <= upto; d += 1) { const v = f(d); if (!isFinite(v) || Math.abs(v) > 2.4) { pen = false; continue; } if (pen) ctx.lineTo(X(d), Y(v)); else ctx.moveTo(X(d), Y(v)); pen = true; }
      ctx.stroke(); ctx.globalAlpha = 1;
    };
    const d0 = ((p.th % 360) + 360) % 360;
    if (p.sin) { curve((d) => Math.sin(rad(d)), t.c.red, 360, 1.5, 0.3); curve((d) => Math.sin(rad(d)), t.c.red, d0, 3, 1); }
    if (p.cos) { curve((d) => Math.cos(rad(d)), t.c.blue, 360, 1.5, 0.3); curve((d) => Math.cos(rad(d)), t.c.blue, d0, 3, 1); }
    if (p.tan) { curve((d) => Math.tan(rad(d)), t.c.green, 360, 1.5, 0.3); curve((d) => Math.tan(rad(d)), t.c.green, d0, 2.5, 1); }
    // Link the circle to the graph
    if (p.sin) {
      ctx.strokeStyle = t.c.red; ctx.globalAlpha = 0.5; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(X(d0), Y(s)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillStyle = t.c.red; ctx.beginPath(); ctx.arc(X(d0), Y(s), 5.5, 0, TAU); ctx.fill();
    }
    if (p.cos) { ctx.fillStyle = t.c.blue; ctx.beginPath(); ctx.arc(X(d0), Y(c), 5.5, 0, TAU); ctx.fill(); }
    label(ctx, "θ", gx + gw + 16, cy, { color: t.mute, size: 13, weight: 600, font: "Georgia, serif" });
  }
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  ctx.fillStyle = t.dark ? "#08101f" : "#fbfcfe"; ctx.fillRect(0, 0, w, h);
  const R = h * 0.36, cx = R + 18, cy = h / 2, th = rad(130);
  const px = cx + Math.cos(th) * R, py = cy - Math.sin(th) * R;
  ctx.strokeStyle = t.axis; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx - R - 8, cy); ctx.lineTo(w - 10, cy); ctx.moveTo(cx, cy - R - 8); ctx.lineTo(cx, cy + R + 8); ctx.stroke();
  ctx.strokeStyle = t.dark ? "rgba(148,163,184,0.55)" : "rgba(15,23,42,0.35)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = t.c.blue; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy); ctx.stroke();
  ctx.strokeStyle = t.c.red; ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();
  ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
  const gx = cx + R + 22, gw = w - gx - 12;
  ctx.strokeStyle = t.c.red; ctx.lineWidth = 3; ctx.beginPath();
  for (let d = 0; d <= 360; d += 3) { const x = gx + (d / 360) * gw, y = cy - Math.sin(rad(d)) * R; if (d) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.stroke();
  ctx.strokeStyle = t.c.blue; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.beginPath();
  for (let d = 0; d <= 360; d += 3) { const x = gx + (d / 360) * gw, y = cy - Math.cos(rad(d)) * R; if (d) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.stroke(); ctx.globalAlpha = 1;
  ctx.strokeStyle = t.c.red; ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(gx + (130 / 360) * gw, py); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = t.c.pink; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = t.c.red; ctx.beginPath(); ctx.arc(gx + (130 / 360) * gw, py, 4.5, 0, Math.PI * 2); ctx.fill();
}

export default function Trig() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { th: [0, 360], unit: ["deg", "rad"] });
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const angle = useRef(p.th);
  angle.current = running ? angle.current : p.th;
  const drag = useRef(false);
  const size = useRef({ w: 1, h: 1 });

  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    size.current = { w, h };
    if (running) { angle.current = (angle.current + 30 * dt * speed) % 360; }
    draw(ctx, w, h, { ...p, th: running ? angle.current : p.th }, theme);
  };
  const live = useLive(() => (running ? angle.current : p.th), 10);
  const toAngle = (pt: { x: number; y: number }) => {
    const { cx, cy } = geom(size.current.w, size.current.h);
    let d = (Math.atan2(cy - pt.y, pt.x - cx) * 180) / Math.PI;
    if (d < 0) d += 360;
    // Snap to special angles when close
    const special = Object.keys(RAD).map(Number).find((s) => Math.abs(s - d) < 2.5);
    return special ?? Math.round(d);
  };
  const onDown = (pt: { x: number; y: number }) => {
    const { cx, cy, R } = geom(size.current.w, size.current.h);
    const r = Math.hypot(pt.x - cx, pt.y - cy);
    if (r > R * 0.4 && r < R + 30) { drag.current = true; setRunning(false); set({ th: toAngle(pt) }); return true; }
    return false;
  };
  const onMove = (pt: { x: number; y: number }, down: boolean) => { if (down && drag.current) set({ th: toAngle(pt) }); };
  const onUp = () => { drag.current = false; };

  const d = Math.round(live * 10) / 10;
  const s = Math.sin(rad(d)), c = Math.cos(rad(d));
  const ex = EXACT[Math.round(d)] && Math.abs(d - Math.round(d)) < 1e-6 ? EXACT[Math.round(d)] : null;
  const at = (x: number) => !running && Math.abs(p.th - x) < 0.5;
  const challenges = [
    { id: "half", title: "Find another angle with sin θ = 1/2", detail: "Not 30°. Use the symmetry of the circle.", done: at(150) },
    { id: "equal", title: "Find where sin θ = cos θ in the third quadrant", detail: "Both negative there.", done: at(225) },
    { id: "tan", title: "Find an angle between 90° and 180° with tan θ = −1", detail: "Turn on tan θ.", done: at(135) },
    { id: "cos", title: "Make cos θ = −1", detail: "Where is the point?", done: at(180) },
  ];

  return (
    <SimShell
      id="trig"
      running={running}
      onRun={(r) => { if (!r) set({ th: Math.round(angle.current) }); else angle.current = p.th; setRunning(r); }}
      speed={speed}
      onSpeed={setSpeed}
      onReset={() => { setRunning(false); resetP(); }}
      challenges={challenges}
      record={() => ({ "θ (°)": d, "θ (rad)": +rad(d).toFixed(4), "sin θ": +s.toFixed(4), "cos θ": +c.toFixed(4), "tan θ": Math.abs(c) < 1e-9 ? NaN : +(s / c).toFixed(4) })}
      ask={() => `Unit circle at θ = ${d}° (${rad(d).toFixed(3)} rad): sin θ = ${s.toFixed(3)}, cos θ = ${c.toFixed(3)}${Math.abs(c) > 1e-9 ? `, tan θ = ${(s / c).toFixed(3)}` : ", tan θ undefined"}.`}
      stage={<Stage label={`Unit circle at ${d} degrees`} render={render} onDown={onDown} onMove={onMove} onUp={onUp} cursor="grab" />}
      overlay={
        <Readouts>
          <Readout label="θ" value={angleText(d, p.unit)} color={theme.c.amber} />
          <Readout label="sin θ" value={ex ? `${ex[0]}${ex[0].includes("√") ? ` ≈ ${s.toFixed(3)}` : ""}` : s.toFixed(3)} color={theme.c.red} />
          <Readout label="cos θ" value={ex ? `${ex[1]}${ex[1].includes("√") ? ` ≈ ${c.toFixed(3)}` : ""}` : c.toFixed(3)} color={theme.c.blue} />
          <Readout label="tan θ" value={ex ? ex[2] : Math.abs(c) < 1e-9 ? "undefined" : (s / c).toFixed(3)} color={theme.c.green} />
        </Readouts>
      }
      controls={
        <>
          <Group title="Angle">
            <Slider label="θ" value={p.th} min={0} max={360} step={1} unit="°" onChange={(th) => { setRunning(false); set({ th }); }} hint="Or drag the pink point round the circle. It snaps to the special angles." />
            <Choice label="Show angles in" value={p.unit} onChange={(unit) => set({ unit })} options={[{ value: "deg", label: "Degrees" }, { value: "rad", label: "Radians" }]} />
          </Group>
          <Group title="Show">
            <Switch label="sin θ" color={theme.c.red} checked={p.sin} onChange={(sin) => set({ sin })} />
            <Switch label="cos θ" color={theme.c.blue} checked={p.cos} onChange={(cos) => set({ cos })} />
            <Switch label="tan θ" color={theme.c.green} checked={p.tan} onChange={(tan) => set({ tan })} />
          </Group>
        </>
      }
      learn={
        <>
          <H>Definitions that work for every angle</H>
          <p>Take a circle of radius 1 and turn a radius anticlockwise by θ from the positive x-axis. The point it reaches is (cos θ, sin θ).</p>
          <Eq>x = cos θ &nbsp;&nbsp; y = sin θ &nbsp;&nbsp; tan θ = sin θ ⁄ cos θ</Eq>
          <p>For acute angles this matches SOH CAH TOA in the right-angled triangle inside the circle, with hypotenuse 1.</p>
          <H>Signs: All Students Take Coffee</H>
          <p>First quadrant: all positive. Second: only sin. Third: only tan. Fourth: only cos.</p>
          <H>Symmetry</H>
          <Eq>sin(180° − θ) = sin θ &nbsp;&nbsp; cos(360° − θ) = cos θ</Eq>
          <Eq>sin² θ + cos² θ = 1</Eq>
          <p>The last one is Pythagoras on the triangle with hypotenuse 1.</p>
          <H>Radians</H>
          <p>A full turn is 2π radians (360°), so 180° = π. One radian is the angle where the arc length equals the radius.</p>
          <Try>press play and watch the sine graph grow. Where is it steepest, and what is the point on the circle doing there?</Try>
        </>
      }
    />
  );
}
