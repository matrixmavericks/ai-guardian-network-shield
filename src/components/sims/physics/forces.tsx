import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, advance, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Switch } from "../kit/controls";
import { TimeGraph } from "../kit/graph";
import { arrow, label, rad, roundRect, fmt, type Ctx } from "../kit/draw";

// A block on a slope: weight, normal reaction, static and kinetic friction and
// an applied push, with Newton's second law along the slope.

const g = 9.81;
const SURFACES = { ice: { name: "Ice", s: 0.1, k: 0.03 }, wood: { name: "Wood", s: 0.5, k: 0.3 }, rubber: { name: "Rubber", s: 1.0, k: 0.8 }, custom: { name: "Custom", s: 0.4, k: 0.3 } } as const;
type Surface = keyof typeof SURFACES;
type P = { a: number; m: number; F: number; surface: Surface; us: number; uk: number };
const DEF: P = { a: 25, m: 5, F: 0, surface: "custom", us: 0.4, uk: 0.3 };
const LEN = 10;
type S = { s: number; v: number; t: number; acc: number; fr: number; moving: boolean; still: number };

const mu = (p: P) => (p.surface === "custom" ? { s: p.us, k: Math.min(p.uk, p.us) } : SURFACES[p.surface]);

/** Forces along the slope (up = +) and the resulting acceleration. */
function forces(p: P, v: number) {
  const th = rad(p.a);
  const W = p.m * g, N = W * Math.cos(th), down = W * Math.sin(th);
  const { s: us, k: uk } = mu(p);
  const drive = p.F - down;
  if (Math.abs(v) < 1e-6) {
    if (Math.abs(drive) <= us * N) return { N, W, down, fr: -drive, a: 0, moving: false };
    const fr = -Math.sign(drive) * uk * N;
    return { N, W, down, fr, a: (drive + fr) / p.m, moving: true };
  }
  const fr = -Math.sign(v) * uk * N;
  return { N, W, down, fr, a: (drive + fr) / p.m, moving: true };
}
function step(st: S, p: P, h: number) {
  const f = forces(p, st.v);
  const v0 = st.v;
  let v = st.v + f.a * h;
  if (v0 !== 0 && Math.sign(v) !== Math.sign(v0)) v = 0; // friction stops it rather than reversing it
  st.s += ((v0 + v) / 2) * h;
  st.v = v;
  st.t += h;
  st.acc = f.a;
  st.fr = f.fr;
  st.moving = f.moving;
  // The floor and the top of the ramp stop the block
  if (st.s <= 0) { st.s = 0; if (st.v < 0) st.v = 0; if (st.acc < 0) { st.acc = 0; st.moving = false; } }
  if (st.s >= LEN) { st.s = LEN; if (st.v > 0) st.v = 0; if (st.acc > 0) { st.acc = 0; st.moving = false; } }
  st.still = Math.abs(st.v) < 1e-6 ? st.still + h : 0;
}

function draw(ctx: Ctx, w: number, h: number, p: P, st: S, t: SimTheme, show: { comps: boolean; net: boolean; fbd?: boolean } = { comps: true, net: true }) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, t.dark ? "#0b1324" : "#eef3fa"); bg.addColorStop(1, t.dark ? "#070d1b" : "#e2e8f2");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const th = rad(p.a);
  const floor = h - 50;
  const x0 = 60, x1 = w - 60;
  const span = x1 - x0;
  const L = Math.min(span / Math.cos(th), (floor - 60) / Math.max(0.05, Math.sin(th)));
  const sc = L / LEN;
  // Ramp
  const top = { x: x0 + L * Math.cos(th), y: floor - L * Math.sin(th) };
  const wood = ctx.createLinearGradient(0, top.y, 0, floor);
  wood.addColorStop(0, t.dark ? "#7a5a3a" : "#c79a68"); wood.addColorStop(1, t.dark ? "#4a321e" : "#9a6f45");
  ctx.fillStyle = wood;
  ctx.beginPath(); ctx.moveTo(x0, floor); ctx.lineTo(top.x, top.y); ctx.lineTo(top.x, floor); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) { const y = floor - (floor - top.y) * (i / 10); ctx.beginPath(); ctx.moveTo(x0 + (floor - y) / Math.tan(th || 1e-6), y); ctx.lineTo(top.x, y); ctx.stroke(); }
  ctx.fillStyle = t.dark ? "#1e293b" : "#94a3b8"; ctx.fillRect(0, floor, w, h - floor);
  ctx.fillStyle = mu(p).s < 0.2 ? "rgba(186,230,253,0.8)" : mu(p).s > 0.8 ? "rgba(30,30,30,0.6)" : "rgba(255,255,255,0.15)";
  ctx.save(); ctx.translate(x0, floor); ctx.rotate(-th); ctx.fillRect(0, -3, L, 3); ctx.restore();
  // Angle arc
  ctx.strokeStyle = t.c.amber; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x0, floor, 46, -th, 0); ctx.stroke();
  label(ctx, `${p.a}°`, x0 + 62 * Math.cos(th / 2), floor - 62 * Math.sin(th / 2), { color: t.c.amber, size: 13, weight: 700, halo: true });
  // Block (a crate) on the slope
  const bw = 84, bh = 58;
  const cx = x0 + Math.cos(th) * (st.s * sc + bw / 2), cy = floor - Math.sin(th) * (st.s * sc + bw / 2);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-th);
  const cg = ctx.createLinearGradient(0, -bh, 0, 0);
  cg.addColorStop(0, "#d6a15a"); cg.addColorStop(1, "#a86f2c");
  ctx.fillStyle = cg; roundRect(ctx, -bw / 2, -bh, bw, bh, 4); ctx.fill();
  ctx.strokeStyle = "#7a4a18"; ctx.lineWidth = 2; ctx.strokeRect(-bw / 2 + 4, -bh + 4, bw - 8, bh - 8);
  ctx.beginPath(); ctx.moveTo(-bw / 2 + 4, -bh + 4); ctx.lineTo(bw / 2 - 4, -4); ctx.stroke();
  label(ctx, `${p.m} kg`, 0, -bh / 2, { color: "#2b1a08", size: 12, weight: 700 });
  ctx.restore();
  // Free-body diagram from the block's centre
  const f = forces(p, st.v);
  const mx = cx - Math.sin(th) * bh / 2, my = cy - Math.cos(th) * bh / 2;
  const k = 90 / Math.max(f.W, Math.abs(p.F), 1);
  const ux = Math.cos(th), uy = -Math.sin(th);   // up the slope
  const nx = -Math.sin(th), ny = -Math.cos(th);  // away from the surface
  const net = p.m * f.a;
  // Forces drawn on the block (to scale, colours match the diagram)
  const vec = (k2: number, ox: number, oy: number, labels: boolean) => {
    const lab = (s: string) => (labels ? s : undefined);
    if (show.comps) {
      arrow(ctx, ox, oy, ox - ux * f.down * k2, oy - uy * f.down * k2, t.c.red, { width: 1.5, dash: [5, 4], label: lab("mg sin θ"), font: 10.5 });
      arrow(ctx, ox, oy, ox - nx * f.N * k2, oy - ny * f.N * k2, t.c.red, { width: 1.5, dash: [5, 4], label: lab("mg cos θ"), font: 10.5 });
    }
    arrow(ctx, ox, oy, ox, oy + f.W * k2, t.c.red, { label: lab(`W ${fmt(f.W, 1)} N`), width: 3 });
    arrow(ctx, ox, oy, ox + nx * f.N * k2, oy + ny * f.N * k2, t.c.blue, { label: lab(`N ${fmt(f.N, 1)} N`), width: 3 });
    if (Math.abs(f.fr) > 0.01) arrow(ctx, ox, oy, ox + ux * f.fr * k2, oy + uy * f.fr * k2, t.c.orange, { label: lab(`friction ${fmt(Math.abs(f.fr), 1)} N`), width: 3 });
    if (Math.abs(p.F) > 0.01) arrow(ctx, ox, oy, ox + ux * p.F * k2, oy + uy * p.F * k2, t.c.green, { label: lab(`push ${fmt(Math.abs(p.F), 1)} N`), width: 3 });
  };
  vec(k, mx, my, false);
  // Free-body diagram panel
  if (show.fbd === false) return;
  // Top left, under the readouts: the space above the slope
  const fw = Math.min(250, w * 0.34), fh = 230, fx = 14, fy = 66;
  ctx.fillStyle = t.panel; ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
  roundRect(ctx, fx, fy, fw, fh, 14); ctx.fill(); ctx.stroke();
  label(ctx, "Free-body diagram", fx + 14, fy + 18, { color: t.soft, size: 12, weight: 600, align: "left" });
  const k2 = 72 / Math.max(f.W, Math.abs(p.F), 1);
  const cxf = fx + fw / 2, cyf = fy + fh / 2 + 4;
  ctx.fillStyle = "#c08a3e"; ctx.beginPath(); ctx.arc(cxf, cyf, 6, 0, Math.PI * 2); ctx.fill();
  vec(k2, cxf, cyf, true);
  if (show.net) label(ctx, Math.abs(net) > 0.01 ? `net force ${fmt(Math.abs(net), 1)} N ${net > 0 ? "up" : "down"} the slope` : "forces balanced: net force 0", fx + fw / 2, fy + fh - 14, { color: t.ink, size: 11.5, weight: 600 });
  label(ctx, f.moving ? (st.v === 0 && f.a !== 0 ? "starting to slide" : "sliding: kinetic friction") : "at rest: static friction", w - 16, 26, { color: f.moving ? t.c.orange : t.c.green, size: 12.5, weight: 600, align: "right" });
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  draw(ctx, w, h, { ...DEF, a: 30, F: 0 }, { s: 3.5, v: 0, t: 0, acc: 0, fr: 0, moving: false, still: 0 }, t, { comps: false, net: false, fbd: false });
}

export default function Forces() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { a: [0, 60], m: [0.5, 20], F: [-150, 150], us: [0, 1.2], uk: [0, 1.2], surface: Object.keys(SURFACES) });
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [show, setShow] = useState({ comps: true, net: true });
  const st = useRef<S>({ s: 3, v: 0, t: 0, acc: 0, fr: 0, moving: false, still: 0 });
  const graph = useRef<number[][]>([]);
  const best = useRef({ startAngle: Infinity, constUp: 0 });
  const reset = () => { st.current = { s: 3, v: 0, t: 0, acc: 0, fr: 0, moving: false, still: 0 }; graph.current = []; best.current.constUp = 0; };

  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const s = st.current;
    if (running) {
      advance(dt, speed, 1 / 500, (hh) => step(s, p, hh));
      const gr = graph.current;
      if (!gr.length || s.t - gr[gr.length - 1][0] > 1 / 30) gr.push([s.t, s.v, s.acc]);
      if (s.v > 0.2 && Math.abs(s.acc) < 0.05) best.current.constUp += dt * speed; else best.current.constUp = 0;
      if (s.v < 0 && p.F === 0 && mu(p).s >= 0.39 && mu(p).s <= 0.41) best.current.startAngle = Math.min(best.current.startAngle, p.a);
    }
    draw(ctx, w, h, p, s, theme, show);
  };
  const live = useLive(() => ({ ...st.current, f: forces(p, st.current.v), constUp: best.current.constUp, startAngle: best.current.startAngle }), 10);
  const m = mu(p);
  const N = p.m * g * Math.cos(rad(p.a));
  const minHold = Math.max(0, p.m * g * Math.sin(rad(p.a)) - m.s * N);

  const challenges = [
    { id: "slip", title: "Find the angle where the block just starts to slide", detail: "No push, μs = 0.40 (Custom surface). Raise the angle 1° at a time and press play each time. Theory says tan θ = μs.", done: live.startAngle >= 21 && live.startAngle <= 23 },
    { id: "const", title: "Push it up the slope at a steady speed", detail: "Moving up with zero acceleration for 2 seconds. What does that say about the net force?", done: live.constUp >= 2 },
    { id: "two", title: "Make it slide down with an acceleration of 2.0 m/s²", detail: "Within ±0.05 m/s². Any angle, mass and surface.", done: live.moving && live.v < 0 && Math.abs(live.acc + 2) <= 0.05 },
    { id: "hold", title: "On a 40° slope, hold it still with the smallest push", detail: "Within 1 N of the minimum. Static friction helps you.", done: p.a >= 40 && !live.moving && p.F > 0 && Math.abs(p.F - minHold) <= 1 && running },
  ];

  return (
    <SimShell
      id="forces"
      running={running}
      onRun={(r) => { if (r && (st.current.s <= 0 || st.current.s >= LEN)) reset(); setRunning(r); }}
      onReset={() => { setRunning(false); reset(); }}
      speed={speed}
      onSpeed={setSpeed}
      challenges={challenges}
      record={() => ({ "angle (°)": p.a, "mass (kg)": p.m, "push (N)": p.F, "μs": m.s, "μk": m.k, "normal (N)": +N.toFixed(2), "friction (N)": +Math.abs(live.f.fr).toFixed(2), "a (m/s²)": +live.f.a.toFixed(3) })}
      ask={() => `Block of ${p.m} kg on a ${p.a}° slope, ${SURFACES[p.surface].name} surface (μs ${m.s}, μk ${m.k}), push ${p.F} N up the slope. Normal force ${fmt(N, 1)} N, friction ${fmt(Math.abs(live.f.fr), 1)} N, acceleration ${fmt(live.f.a, 2)} m/s² (positive = up the slope).`}
      stage={<Stage label={`Block of ${p.m} kilograms on a ${p.a} degree slope`} render={render} />}
      overlay={
        <Readouts>
          <Readout label="acceleration" value={live.f.a} unit="m/s²" />
          <Readout label="velocity" value={live.v} unit="m/s" color={theme.c.green} />
          <Readout label="friction" value={Math.abs(live.f.fr)} unit="N" color={theme.c.orange} />
          <Readout label="normal" value={N} unit="N" color={theme.c.blue} />
        </Readouts>
      }
      below={<TimeGraph title="Motion along the slope (up is positive)" data={graph} yLabel="value" window={8} series={[{ label: "velocity / m s⁻¹", color: theme.c.green }, { label: "acceleration / m s⁻²", color: theme.c.violet }]} />}
      controls={
        <>
          <Group title="Slope and block">
            <Slider label="Angle of slope" value={p.a} min={0} max={60} step={1} unit="°" onChange={(a) => { set({ a }); reset(); }} />
            <Slider label="Mass" value={p.m} min={0.5} max={20} step={0.5} unit="kg" onChange={(mm) => { set({ m: mm }); reset(); }} />
            <Slider label="Push up the slope" value={p.F} min={-150} max={150} step={1} unit="N" color={theme.c.green} onChange={(F) => set({ F })} hint="Negative pushes down the slope. You can change it while it moves." />
          </Group>
          <Group title="Surface">
            <Choice value={p.surface} onChange={(surface) => { set({ surface }); reset(); }} options={(Object.keys(SURFACES) as Surface[]).map((k) => ({ value: k, label: SURFACES[k].name }))} wrap />
            {p.surface === "custom" ? (
              <>
                <Slider label="Static friction μs" value={p.us} min={0} max={1.2} step={0.01} onChange={(us) => { set({ us, uk: Math.min(p.uk, us) }); reset(); }} />
                <Slider label="Kinetic friction μk" value={Math.min(p.uk, p.us)} min={0} max={1.2} step={0.01} onChange={(uk) => { set({ uk: Math.min(uk, p.us) }); reset(); }} hint="Kinetic friction is never more than static." />
              </>
            ) : <p className="text-[12px] text-lp-mute">μs = {m.s}, μk = {m.k}</p>}
          </Group>
          <Group title="Show">
            <Switch label="Components of the weight" checked={show.comps} onChange={(comps) => setShow({ ...show, comps })} />
            <Switch label="Net force" checked={show.net} onChange={(net) => setShow({ ...show, net })} />
            <button type="button" onClick={() => { resetP(); setRunning(false); reset(); }} className="text-[12.5px] text-lp-sky hover:underline">Default settings</button>
          </Group>
        </>
      }
      learn={
        <>
          <H>Split the weight along the slope</H>
          <p>The weight acts straight down. It is easier to work with two parts of it: one pulling the block down the slope and one pressing it into the surface.</p>
          <Eq>along the slope: mg sin θ &nbsp;&nbsp; into the slope: mg cos θ</Eq>
          <p>The surface pushes back with the normal reaction N = mg cos θ (when nothing else pushes into it), so the block doesn't sink in.</p>
          <H>Friction</H>
          <p>Static friction matches whatever force tries to move the block, up to a maximum μsN. Past that, the block slides and kinetic friction μkN acts against the motion, usually a bit smaller. That's why a block can stick and then suddenly slide.</p>
          <Eq>sliding starts when tan θ &gt; μs</Eq>
          <H>Newton's second law</H>
          <Eq>F_net = ma</Eq>
          <p>Add up the forces along the slope (take up as positive): push − mg sin θ ± friction. Balanced forces mean no acceleration: the block is either still or moving at a steady speed.</p>
          <Try>double the mass. Does the angle where it starts sliding change? (Weight and friction both double, so no.)</Try>
        </>
      }
    />
  );
}
