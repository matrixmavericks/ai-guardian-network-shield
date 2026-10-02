import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Switch } from "../kit/controls";
import { label, roundRect, fmt, TAU, type Ctx } from "../kit/draw";

// A DC circuit with a real cell (emf + internal resistance) and bulbs in series,
// in parallel, or both. Charge flows along the wires at a rate set by the current.

type Topo = "series" | "parallel" | "mixed";
type P = { topo: Topo; emf: number; r: number; R1: number; R2: number; R3: number; s: boolean; s2: boolean; s3: boolean; electrons: boolean };
const DEF: P = { topo: "series", emf: 6, r: 0.5, R1: 10, R2: 10, R3: 10, s: true, s2: true, s3: true, electrons: false };

type Sol = { I: number; Vt: number; Rext: number; b: Record<"1" | "2" | "3", { I: number; V: number; P: number; on: boolean }> };

export function solve(p: P): Sol {
  const par = (...rs: number[]) => { const g = rs.reduce((a, r) => a + 1 / r, 0); return g > 0 ? 1 / g : Infinity; };
  const off = { I: 0, V: 0, P: 0, on: false };
  let Rext = Infinity;
  if (p.topo === "series") Rext = p.R1 + p.R2;
  else if (p.topo === "parallel") Rext = par(...[p.s2 ? p.R1 : 0, p.s3 ? p.R2 : 0].filter(Boolean));
  else Rext = p.R1 + par(...[p.s2 ? p.R2 : 0, p.s3 ? p.R3 : 0].filter(Boolean));
  const I = p.s && isFinite(Rext) ? p.emf / (p.r + Rext) : 0;
  const Vt = p.emf - I * p.r;
  const mk = (i: number, R: number) => ({ I: i, V: i * R, P: i * i * R, on: i > 0 });
  if (p.topo === "series") return { I, Vt, Rext, b: { "1": mk(I, p.R1), "2": mk(I, p.R2), "3": off } };
  if (p.topo === "parallel") return { I, Vt, Rext, b: { "1": p.s2 ? mk(Vt / p.R1 * (I > 0 ? 1 : 0), p.R1) : off, "2": p.s3 ? mk(Vt / p.R2 * (I > 0 ? 1 : 0), p.R2) : off, "3": off } };
  const Vpar = Vt - I * p.R1;
  return { I, Vt, Rext, b: { "1": mk(I, p.R1), "2": p.s2 && I > 0 ? mk(Vpar / p.R2, p.R2) : off, "3": p.s3 && I > 0 ? mk(Vpar / p.R3, p.R3) : off } };
}

type Seg = { a: [number, number]; b: [number, number]; cur: "I" | "1" | "2" | "3" };
type Part = { kind: "cell" | "bulb" | "switch" | "ammeter"; id: string; x: number; y: number; v?: boolean };

/** Wires (in the direction conventional current flows) and parts, in 0–1 coordinates. */
function layout(topo: Topo): { segs: Seg[]; parts: Part[] } {
  const L = 0.1, R = 0.9, T = 0.18, B = 0.82;
  if (topo === "series") {
    return {
      segs: [
        { a: [L, 0.5], b: [L, T], cur: "I" }, { a: [L, T], b: [R, T], cur: "I" }, { a: [R, T], b: [R, B], cur: "I" },
        { a: [R, B], b: [L, B], cur: "I" }, { a: [L, B], b: [L, 0.5], cur: "I" },
      ],
      parts: [{ kind: "cell", id: "cell", x: L, y: 0.5, v: true }, { kind: "bulb", id: "1", x: 0.38, y: T }, { kind: "bulb", id: "2", x: R, y: 0.5, v: true }, { kind: "switch", id: "s", x: 0.62, y: B }, { kind: "ammeter", id: "A", x: 0.36, y: B }],
    };
  }
  const j1 = topo === "parallel" ? 0.5 : 0.6, j2 = topo === "parallel" ? 0.82 : 0.86;
  const b1 = topo === "parallel" ? "1" : "2", b2 = topo === "parallel" ? "2" : "3";
  return {
    segs: [
      { a: [L, 0.5], b: [L, T], cur: "I" }, { a: [L, T], b: [j1, T], cur: "I" }, { a: [j1, T], b: [j2, T], cur: b2 },
      { a: [j1, T], b: [j1, B], cur: b1 }, { a: [j2, T], b: [j2, B], cur: b2 },
      { a: [j2, B], b: [j1, B], cur: b2 }, { a: [j1, B], b: [L, B], cur: "I" }, { a: [L, B], b: [L, 0.5], cur: "I" },
    ],
    parts: [
      { kind: "cell", id: "cell", x: L, y: 0.5, v: true },
      ...(topo === "mixed" ? [{ kind: "bulb" as const, id: "1", x: 0.34, y: T }] : []),
      { kind: "bulb", id: b1, x: j1, y: 0.44, v: true }, { kind: "bulb", id: b2, x: j2, y: 0.44, v: true },
      { kind: "switch", id: "s2", x: j1, y: 0.67, v: true }, { kind: "switch", id: "s3", x: j2, y: 0.67, v: true },
      { kind: "switch", id: "s", x: 0.3, y: B }, { kind: "ammeter", id: "A", x: topo === "parallel" ? 0.3 : 0.48, y: topo === "parallel" ? T : B },
    ],
  };
}

const switchOf = (id: string, p: P) => (id === "s" ? p.s : id === "s2" ? p.s2 : p.s3);

function draw(ctx: Ctx, w: number, h: number, p: P, sol: Sol, flow: Record<string, number>, t: SimTheme, time: number) {
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  bg.addColorStop(0, t.dark ? "#0e1a30" : "#f6f8fc"); bg.addColorStop(1, t.dark ? "#060b17" : "#e5ebf3");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // Faint breadboard grid
  ctx.fillStyle = t.dark ? "rgba(148,163,184,0.08)" : "rgba(15,23,42,0.06)";
  for (let x = 12; x < w; x += 24) for (let y = 12; y < h; y += 24) ctx.fillRect(x, y, 2, 2);
  const { segs, parts } = layout(p.topo);
  const X = (u: number) => 40 + u * (w - 80), Y = (v: number) => 20 + v * (h - 40);
  const cur = (k: Seg["cur"]) => (k === "I" ? sol.I : sol.b[k].I);
  // Wires
  for (const s of segs) {
    ctx.strokeStyle = t.dark ? "#b7791f" : "#b45309"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(X(s.a[0]), Y(s.a[1])); ctx.lineTo(X(s.b[0]), Y(s.b[1])); ctx.stroke();
    ctx.strokeStyle = t.dark ? "rgba(255,220,150,0.35)" : "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(s.a[0]), Y(s.a[1]) - 1); ctx.lineTo(X(s.b[0]), Y(s.b[1]) - 1); ctx.stroke();
  }
  // Moving charges: spacing fixed, speed ∝ current in that wire
  const gap = 22;
  for (const s of segs) {
    const i = cur(s.cur);
    if (i <= 0) continue;
    const ax = X(s.a[0]), ay = Y(s.a[1]), bx = X(s.b[0]), by = Y(s.b[1]);
    const len = Math.hypot(bx - ax, by - ay);
    const off = ((flow[s.cur] % gap) + gap) % gap;
    for (let d = off; d < len; d += gap) {
      const f = (p.electrons ? len - d : d) / len;
      const x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
      ctx.fillStyle = p.electrons ? (t.dark ? "#7dd3fc" : "#0284c7") : (t.dark ? "#fde68a" : "#d97706");
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
    }
  }
  // Parts
  // Parts grow with the stage
  const u = Math.max(0.85, Math.min(1.6, Math.min(w, h) / 520));
  for (const part of parts) {
    const x = X(part.x), y = Y(part.y);
    ctx.save();
    ctx.translate(x, y); ctx.scale(u, u); ctx.translate(-x, -y);
    if (part.kind === "cell") {
      // A cylindrical cell, + at the top
      const cw = 34, ch = 74;
      ctx.fillStyle = t.dark ? "#0b1324" : "#f1f5f9"; ctx.fillRect(x - 12, y - ch / 2 - 6, 24, ch + 12);
      const g = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
      g.addColorStop(0, "#1e293b"); g.addColorStop(0.35, "#475569"); g.addColorStop(1, "#0f172a");
      ctx.fillStyle = g; roundRect(ctx, x - cw / 2, y - ch / 2, cw, ch, 6); ctx.fill();
      const cap = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
      cap.addColorStop(0, "#b45309"); cap.addColorStop(0.4, "#f59e0b"); cap.addColorStop(1, "#92400e");
      ctx.fillStyle = cap; roundRect(ctx, x - cw / 2, y - ch / 2, cw, 22, 6); ctx.fill();
      ctx.fillStyle = "#cbd5e1"; ctx.fillRect(x - 6, y - ch / 2 - 6, 12, 6);
      label(ctx, "+", x, y - ch / 2 + 11, { color: "#1f2937", size: 15, weight: 800 });
      label(ctx, "−", x, y + ch / 2 - 12, { color: "#e2e8f0", size: 15, weight: 800 });
      label(ctx, `${fmt(p.emf, 1)} V`, x, y + 6, { color: "#e2e8f0", size: 11, weight: 700 });
      label(ctx, `r = ${fmt(p.r, 2)} Ω`, x + 30, y + ch / 2 + 16, { color: t.mute, size: 10.5, align: "left" });
    } else if (part.kind === "bulb") {
      const b = sol.b[part.id as "1" | "2" | "3"];
      const R = part.id === "1" ? p.R1 : part.id === "2" ? p.R2 : p.R3;
      const k = Math.min(1, b.P / 3);
      // Glow
      if (k > 0.002) {
        const gr = ctx.createRadialGradient(x, y, 4, x, y, 30 + 90 * Math.sqrt(k));
        gr.addColorStop(0, `rgba(255,214,120,${0.25 + 0.6 * Math.sqrt(k)})`);
        gr.addColorStop(1, "rgba(255,214,120,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 30 + 90 * Math.sqrt(k), 0, TAU); ctx.fill();
      }
      ctx.fillStyle = t.dark ? "#0b1324" : "#f1f5f9"; ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.fill();
      const glass = ctx.createRadialGradient(x - 6, y - 8, 2, x, y, 22);
      glass.addColorStop(0, `rgba(255,255,255,${0.35 + 0.5 * k})`); glass.addColorStop(1, k > 0.01 ? `rgba(255,190,90,${0.25 + 0.6 * k})` : "rgba(148,163,184,0.18)");
      ctx.fillStyle = glass; ctx.beginPath(); ctx.arc(x, y, 20, 0, TAU); ctx.fill();
      ctx.strokeStyle = t.dark ? "rgba(226,232,240,0.6)" : "rgba(51,65,85,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
      // Filament
      ctx.strokeStyle = k > 0.01 ? `rgb(255,${Math.round(120 + 135 * k)},${Math.round(40 + 160 * k)})` : (t.dark ? "#64748b" : "#475569");
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 9, y + 6);
      for (let i = 0; i <= 6; i++) ctx.lineTo(x - 9 + i * 3, y - 4 + (i % 2 ? -4 : 2));
      ctx.lineTo(x + 9, y + 6); ctx.stroke();
      // Labels beside vertical bulbs (inside the loop when on the right edge), above horizontal ones
      const right = part.v && part.x > 0.7;
      const tx = part.v ? (right ? x - 30 : x + 30) : x, ty = part.v ? y : y - 40;
      const al: CanvasTextAlign = part.v ? (right ? "right" : "left") : "center";
      label(ctx, `Bulb ${part.id} · ${R} Ω`, tx, ty - 8, { color: t.ink, size: 11.5, weight: 700, align: al, halo: true });
      label(ctx, `${fmt(b.V, 2)} V · ${fmt(b.I, 3)} A · ${fmt(b.P, 2)} W`, tx, ty + 8, { color: t.mute, size: 10.5, align: al, halo: true });
    } else if (part.kind === "switch") {
      const closed = switchOf(part.id, p);
      ctx.translate(x, y);
      if (part.v) ctx.rotate(Math.PI / 2);
      ctx.fillStyle = t.dark ? "#0b1324" : "#f1f5f9"; ctx.fillRect(-20, -8, 40, 16);
      ctx.fillStyle = t.dark ? "#cbd5e1" : "#334155";
      ctx.beginPath(); ctx.arc(-16, 0, 4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(16, 0, 4, 0, TAU); ctx.fill();
      ctx.strokeStyle = closed ? (t.dark ? "#e2e8f0" : "#0f172a") : t.c.red; ctx.lineWidth = 4; ctx.lineCap = "round";
      const ang = closed ? 0 : -0.55;
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-16 + 32 * Math.cos(ang), 32 * Math.sin(ang)); ctx.stroke();
      ctx.rotate(part.v ? -Math.PI / 2 : 0);
      label(ctx, closed ? "closed" : "open", part.v ? -34 : 0, part.v ? 0 : 22, { color: closed ? t.mute : t.c.red, size: 10.5, weight: 600, align: part.v ? "right" : "center" });
    } else if (part.kind === "ammeter") {
      ctx.fillStyle = t.dark ? "#0f172a" : "#ffffff"; ctx.strokeStyle = t.c.blue; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU); ctx.fill(); ctx.stroke();
      label(ctx, "A", x, y, { color: t.c.blue, size: 14, weight: 800 });
      label(ctx, `${fmt(sol.I, 3)} A`, x, y + (part.y > 0.5 ? 30 : -30), { color: t.c.blue, size: 12, weight: 700, halo: true });
    }
    ctx.restore();
  }
  void time;
  return { X, Y, parts };
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const p = { ...DEF, topo: "parallel" as Topo, R1: 8, R2: 16 };
  draw(ctx, w, h, p, solve(p), { I: 5, "1": 3, "2": 9, "3": 0 }, t, 0);
}

export default function Circuits() {
  const theme = useSimTheme();
  const [p, set] = useSimParams<P>(DEF, { topo: ["series", "parallel", "mixed"], emf: [1, 12], r: [0, 2], R1: [1, 50], R2: [1, 50], R3: [1, 50] });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const flow = useRef<Record<string, number>>({ I: 0, "1": 0, "2": 0, "3": 0 });
  const hit = useRef<{ parts: Part[]; X: (u: number) => number; Y: (v: number) => number } | null>(null);
  const sol = solve(p);

  const render = (ctx: Ctx, w: number, h: number, dt: number, time: number) => {
    if (running) {
      const k = 160 * dt * speed;
      flow.current.I += sol.I * k;
      for (const id of ["1", "2", "3"] as const) flow.current[id] += sol.b[id].I * k;
    }
    hit.current = draw(ctx, w, h, p, sol, flow.current, theme, time);
    label(ctx, "Click a switch to open or close it", w - 12, h - 12, { color: theme.mute, size: 11, align: "right" });
  };
  const onDown = (pt: { x: number; y: number }) => {
    const hc = hit.current;
    if (!hc) return false;
    for (const part of hc.parts) {
      if (part.kind !== "switch") continue;
      if (Math.hypot(pt.x - hc.X(part.x), pt.y - hc.Y(part.y)) < 26) {
        const k = part.id as "s" | "s2" | "s3";
        set({ [k]: !p[k] } as Partial<P>);
        return false;
      }
    }
    return false;
  };

  const Rext = sol.Rext;
  const challenges = [
    { id: "half", title: "Make the current from the cell exactly 0.50 A", detail: "±0.005 A. Any circuit.", done: Math.abs(sol.I - 0.5) <= 0.005 },
    { id: "series", title: "In series, make bulb 2 brighter than bulb 1", detail: "Same current through both. So what has to be different?", done: p.topo === "series" && p.s && sol.b["2"].P > sol.b["1"].P * 1.05 },
    { id: "parallel", title: "In parallel, make bulb 1 brighter than bulb 2", detail: "Same voltage across both this time. Compare with the series answer.", done: p.topo === "parallel" && sol.b["1"].P > sol.b["2"].P * 1.05 && sol.b["2"].on },
    { id: "maxp", title: "With r = 1 Ω or more, get the most power out of the cell into the bulbs", detail: "Within 5%. Hint: compare the bulbs' total resistance with r.", done: p.r >= 1 && isFinite(Rext) && Math.abs(Rext - p.r) / p.r <= 0.05 && sol.I > 0 },
  ];

  return (
    <SimShell
      id="circuits"
      running={running}
      onRun={setRunning}
      speed={speed}
      onSpeed={setSpeed}
      challenges={challenges}
      record={() => ({ "emf (V)": p.emf, "r (Ω)": p.r, "R external (Ω)": +(isFinite(Rext) ? Rext : NaN).toFixed(3), "I (A)": +sol.I.toFixed(4), "terminal V (V)": +sol.Vt.toFixed(4), "P bulb 1 (W)": +sol.b["1"].P.toFixed(4), "P bulb 2 (W)": +sol.b["2"].P.toFixed(4) })}
      ask={() => `${p.topo} circuit: cell emf ${p.emf} V with internal resistance ${p.r} Ω; bulbs ${p.R1} Ω, ${p.R2} Ω${p.topo === "mixed" ? `, ${p.R3} Ω` : ""}; main switch ${p.s ? "closed" : "open"}. Current from the cell ${fmt(sol.I, 3)} A, terminal voltage ${fmt(sol.Vt, 2)} V. Bulb readings: ${(["1", "2", "3"] as const).filter((k) => sol.b[k].on).map((k) => `bulb ${k} ${fmt(sol.b[k].V, 2)} V, ${fmt(sol.b[k].I, 3)} A, ${fmt(sol.b[k].P, 2)} W`).join("; ") || "all off"}.`}
      stage={<Stage label={`${p.topo} circuit`} render={render} onDown={onDown} cursor="pointer" />}
      overlay={
        <Readouts>
          <Readout label="current" value={sol.I} unit="A" digits={3} color={theme.c.blue} />
          <Readout label="terminal voltage" value={sol.Vt} unit="V" />
          <Readout label="external R" value={isFinite(Rext) && p.s ? Rext : "open"} unit={isFinite(Rext) && p.s ? "Ω" : ""} />
          <Readout label="power to bulbs" value={sol.I * sol.Vt} unit="W" color={theme.c.amber} />
        </Readouts>
      }
      controls={
        <>
          <Group title="Circuit">
            <Choice value={p.topo} onChange={(topo) => set({ topo })} options={[{ value: "series", label: "Series" }, { value: "parallel", label: "Parallel" }, { value: "mixed", label: "Both" }]} />
            <Slider label="Cell emf" value={p.emf} min={1} max={12} step={0.1} unit="V" onChange={(emf) => set({ emf })} />
            <Slider label="Internal resistance r" value={p.r} min={0} max={2} step={0.05} unit="Ω" onChange={(r) => set({ r })} />
          </Group>
          <Group title="Bulbs">
            <Slider label="Bulb 1" value={p.R1} min={1} max={50} step={0.5} unit="Ω" onChange={(R1) => set({ R1 })} />
            <Slider label="Bulb 2" value={p.R2} min={1} max={50} step={0.5} unit="Ω" onChange={(R2) => set({ R2 })} />
            {p.topo === "mixed" && <Slider label="Bulb 3" value={p.R3} min={1} max={50} step={0.5} unit="Ω" onChange={(R3) => set({ R3 })} />}
          </Group>
          <Group title="Switches">
            <Switch label="Main switch" checked={p.s} onChange={(s) => set({ s })} />
            {p.topo !== "series" && <Switch label={p.topo === "parallel" ? "Bulb 1 branch" : "Bulb 2 branch"} checked={p.s2} onChange={(s2) => set({ s2 })} />}
            {p.topo !== "series" && <Switch label={p.topo === "parallel" ? "Bulb 2 branch" : "Bulb 3 branch"} checked={p.s3} onChange={(s3) => set({ s3 })} />}
            <Switch label="Show electron flow" checked={p.electrons} onChange={(electrons) => set({ electrons })} hint={p.electrons ? "Electrons move from − to +, the opposite way to conventional current." : "Showing conventional current, from + to −."} />
          </Group>
        </>
      }
      learn={
        <>
          <H>Current, voltage, resistance</H>
          <Eq>V = I R &nbsp;&nbsp; P = I V = I² R = V² ⁄ R</Eq>
          <H>Series</H>
          <p>One path: the same current flows through every bulb. The cell's voltage is shared, and the bigger resistance gets the bigger share, so in series the higher-resistance bulb is brighter (P = I²R).</p>
          <Eq>R_total = R₁ + R₂</Eq>
          <H>Parallel</H>
          <p>Each branch gets the full voltage. Current splits, more through the smaller resistance, so in parallel the lower-resistance bulb is brighter (P = V²/R). Adding a branch lowers the total resistance and the cell supplies more current.</p>
          <Eq>1 ⁄ R_total = 1 ⁄ R₁ + 1 ⁄ R₂</Eq>
          <H>A real cell</H>
          <p>Some of the cell's energy is used up inside it, in its internal resistance r. The bigger the current, the more voltage is "lost" inside, so the terminal voltage drops.</p>
          <Eq>ε = I(R + r) &nbsp;&nbsp; V_terminal = ε − I r</Eq>
          <Try>in parallel, open one branch. What happens to the other bulb's brightness, and to the terminal voltage? (With r = 0, nothing; with r &gt; 0, it gets slightly brighter.)</Try>
        </>
      }
    />
  );
}
