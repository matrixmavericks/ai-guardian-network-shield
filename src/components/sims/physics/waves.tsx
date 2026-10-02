import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Switch } from "../kit/controls";
import { TimeGraph } from "../kit/graph";
import { arrow, label, sphere, fmt, TAU, type Ctx } from "../kit/draw";

// Waves on a 4 m string: travelling transverse and longitudinal waves, two
// pulses passing through each other, and standing waves with nodes and antinodes.

type Mode = "transverse" | "longitudinal" | "pulses" | "standing";
type P = { mode: Mode; A: number; f: number; v: number; n: number; a1: number; a2: number };
const DEF: P = { mode: "transverse", A: 3, f: 0.8, v: 2, n: 2, a1: 1, a2: 1 };
const LEN = 4; // metres

const pulse = (x: number, c: number, w = 0.35) => Math.exp(-(((x - c) / w) ** 2));

/** Displacement (cm) of the point at x (m) at time t. */
function disp(p: P, x: number, t: number): number {
  const lam = p.v / p.f;
  if (p.mode === "standing") {
    const fn = (p.n * p.v) / (2 * LEN);
    return 2 * p.A * 0.5 * Math.sin((p.n * Math.PI * x) / LEN) * Math.cos(TAU * fn * t);
  }
  if (p.mode === "pulses") {
    const c1 = -0.5 + p.v * 0.5 * t, c2 = LEN + 0.5 - p.v * 0.5 * t;
    return p.A * (p.a1 * pulse(x, c1) + p.a2 * pulse(x, c2));
  }
  if (x > p.v * t) return 0; // the wave hasn't reached here yet
  return p.A * Math.sin(TAU * (p.f * t - x / lam));
}
const parts = (p: P, x: number, t: number) => {
  const c1 = -0.5 + p.v * 0.5 * t, c2 = LEN + 0.5 - p.v * 0.5 * t;
  return [p.A * p.a1 * pulse(x, c1), p.A * p.a2 * pulse(x, c2)];
};

function draw(ctx: Ctx, w: number, h: number, p: P, t: number, th: SimTheme, show = { ruler: true, marker: true }) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, th.dark ? "#0a1426" : "#f1f5fb"); bg.addColorStop(1, th.dark ? "#050a17" : "#e3e9f3");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const x0 = 70, x1 = w - 40, mid = h * 0.47;
  const sx = (x1 - x0) / LEN;
  const sy = Math.min(16, (h * 0.32) / 6);
  const X = (x: number) => x0 + x * sx;
  const Y = (cm: number) => mid - cm * sy;
  // Equilibrium line
  ctx.strokeStyle = th.grid; ctx.setLineDash([4, 6]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke(); ctx.setLineDash([]);
  const lam = p.v / p.f;

  if (p.mode === "longitudinal") {
    // Particles in a column: each moves left-right about its rest position
    const cols = Math.round(LEN * 22), rows = 9;
    for (let i = 0; i <= cols; i++) {
      const xr = (i / cols) * LEN;
      const d = disp(p, xr, t) / 100; // cm → m
      const xx = X(xr + d * 6);
      // Crowding (compression) is where cos(phase) = 1, i.e. where dξ/dx is most negative
      const comp = Math.cos(TAU * (p.f * t - xr / lam)) * (xr <= p.v * t ? 1 : 0);
      for (let r = 0; r < rows; r++) {
        const yy = mid - 70 + (r * 140) / (rows - 1) + ((i * 7 + r * 3) % 5) - 2;
        ctx.fillStyle = comp > 0.5 ? th.c.cyan : comp < -0.5 ? (th.dark ? "#334155" : "#94a3b8") : th.c.blue;
        ctx.beginPath(); ctx.arc(xx, yy, 2.6, 0, TAU); ctx.fill();
      }
    }
    if (show.marker) {
      const xm = 1.5, xx = X(xm + (disp(p, xm, t) / 100) * 6);
      ctx.fillStyle = th.c.red; ctx.beginPath(); ctx.arc(xx, mid, 6, 0, TAU); ctx.fill();
      label(ctx, "one particle", xx, mid - 86, { color: th.c.red, size: 11, weight: 600, halo: true });
      ctx.strokeStyle = th.c.red; ctx.beginPath(); ctx.moveTo(xx, mid - 78); ctx.lineTo(xx, mid - 10); ctx.stroke();
    }
    // Label one compression and one rarefaction that are on the string
    const xc = (p.f * t - Math.floor(p.f * t)) * lam; // phase = whole number of cycles: a compression
    if (xc > 0.2 && xc < Math.min(LEN, p.v * t) - 0.2) label(ctx, "compression", X(xc), mid + 92, { color: th.c.cyan, size: 11, weight: 600 });
    const xrf = xc + lam / 2;
    if (xrf > 0.2 && xrf < Math.min(LEN, p.v * t) - 0.2) label(ctx, "rarefaction", X(xrf), mid + 92, { color: th.mute, size: 11, weight: 600 });
  } else {
    if (p.mode === "pulses") {
      for (const [k, col] of [[0, th.c.pink], [1, th.c.cyan]] as const) {
        ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
        ctx.beginPath();
        for (let i = 0; i <= 300; i++) { const x = (i / 300) * LEN; const y = Y(parts(p, x, t)[k]); if (i) ctx.lineTo(X(x), y); else ctx.moveTo(X(x), y); }
        ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (p.mode === "standing") {
      // Envelope, nodes and antinodes
      ctx.strokeStyle = th.dark ? "rgba(148,163,184,0.35)" : "rgba(51,65,85,0.3)"; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      for (const sgn of [1, -1]) { ctx.beginPath(); for (let i = 0; i <= 300; i++) { const x = (i / 300) * LEN; const y = Y(sgn * p.A * Math.sin((p.n * Math.PI * x) / LEN)); if (i) ctx.lineTo(X(x), y); else ctx.moveTo(X(x), y); } ctx.stroke(); }
      ctx.setLineDash([]);
      for (let k = 0; k <= p.n; k++) { const x = (k * LEN) / p.n; ctx.fillStyle = th.c.red; ctx.beginPath(); ctx.arc(X(x), mid, 5, 0, TAU); ctx.fill(); label(ctx, "N", X(x), mid + 18, { color: th.c.red, size: 11, weight: 700 }); }
      for (let k = 0; k < p.n; k++) { const x = ((k + 0.5) * LEN) / p.n; label(ctx, "A", X(x), mid - p.A * sy - 16, { color: th.c.green, size: 11, weight: 700 }); }
    }
    // The string, coloured by how far each bit is displaced
    const n = 320;
    for (let i = 0; i < n; i++) {
      const xa = (i / n) * LEN, xb = ((i + 1) / n) * LEN;
      const ya = disp(p, xa, t), yb = disp(p, xb, t);
      const k = Math.min(1, Math.abs(ya) / Math.max(0.5, p.A * (p.mode === "pulses" ? 2 : 1)));
      ctx.strokeStyle = `hsl(${200 - k * 170}, 90%, ${th.dark ? 62 : 45}%)`;
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(X(xa), Y(ya)); ctx.lineTo(X(xb), Y(yb)); ctx.stroke();
    }
    if (p.mode === "transverse") {
      for (let i = 0; i <= 32; i++) { const x = (i / 32) * LEN; sphere(ctx, X(x), Y(disp(p, x, t)), 3.6, th.dark ? "#cbd5e1" : "#64748b"); }
      if (show.marker) {
        const xm = 1.5, ym = Y(disp(p, xm, t));
        sphere(ctx, X(xm), ym, 7, "#ef4444");
        arrow(ctx, X(xm) + 18, mid - p.A * sy, X(xm) + 18, mid + p.A * sy, th.c.red, { width: 1.5, head: 7 });
        arrow(ctx, X(xm) + 18, mid + p.A * sy, X(xm) + 18, mid - p.A * sy, th.c.red, { width: 1.5, head: 7 });
        label(ctx, "moves up and down only", X(xm), ym - 22, { color: th.c.red, size: 11, weight: 600, halo: true });
        arrow(ctx, X(2.6), mid - p.A * sy - 34, X(3.4), mid - p.A * sy - 34, th.ink, { width: 2, label: "energy", font: 11 });
      }
      // Wavelength between two neighbouring crests
      if (lam < LEN * 0.95 && p.v * t > lam * 1.5) {
        const k = Math.floor(p.f * t - 0.25);
        let xc = (p.f * t - 0.25 - k) * lam;
        while (xc + lam > Math.min(LEN, p.v * t)) xc -= lam;
        if (xc >= 0) {
          const yb = mid - p.A * sy - 14;
          ctx.strokeStyle = th.c.amber; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(X(xc), yb + 6); ctx.lineTo(X(xc), yb - 6); ctx.moveTo(X(xc), yb); ctx.lineTo(X(xc + lam), yb); ctx.moveTo(X(xc + lam), yb + 6); ctx.lineTo(X(xc + lam), yb - 6); ctx.stroke();
          label(ctx, `λ = ${fmt(lam, 2)} m`, X(xc + lam / 2), yb - 12, { color: th.c.amber, size: 12, weight: 700, halo: true });
        }
      }
    }
  }
  // Source and fixed end
  if (p.mode === "transverse" || p.mode === "longitudinal") {
    const d = p.mode === "transverse" ? disp(p, 0, t) : 0;
    const dx = p.mode === "longitudinal" ? (disp(p, 0, t) / 100) * 6 * sx : 0;
    ctx.fillStyle = th.dark ? "#475569" : "#94a3b8";
    ctx.fillRect(x0 - 36 + dx, Y(d) - 22, 14, 44);
    label(ctx, "source", x0 - 29, mid + 52, { color: th.mute, size: 10.5 });
  } else {
    ctx.fillStyle = th.dark ? "#475569" : "#94a3b8";
    ctx.fillRect(x0 - 10, mid - 40, 8, 80); ctx.fillRect(x1 + 2, mid - 40, 8, 80);
  }
  // Ruler
  if (show.ruler) {
    const ry = h - 34;
    ctx.strokeStyle = th.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, ry); ctx.lineTo(x1, ry); ctx.stroke();
    for (let i = 0; i <= LEN * 10; i++) { const x = X(i / 10); ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + (i % 5 === 0 ? 8 : 4)); ctx.stroke(); if (i % 5 === 0) label(ctx, `${i / 10} m`, x, ry + 18, { color: th.mute, size: 10.5 }); }
  }
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  draw(ctx, w, h, { ...DEF, f: 1.2, A: 4 }, 6, t, { ruler: false, marker: false });
}

export default function Waves() {
  const theme = useSimTheme();
  const [p, set] = useSimParams<P>(DEF, { mode: ["transverse", "longitudinal", "pulses", "standing"], A: [0.5, 5], f: [0.1, 3], v: [0.5, 5], n: [1, 8], a1: [-1, 1], a2: [-1, 1] });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [show, setShow] = useState({ ruler: true, marker: true });
  const clock = useRef(0);
  const graph = useRef<number[][]>([]);
  const restart = () => { clock.current = 0; graph.current = []; };
  const change = (patch: Partial<P>) => { set(patch); restart(); };

  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    if (running) {
      clock.current += dt * speed;
      if (p.mode === "pulses" && clock.current * p.v * 0.5 > LEN + 2) clock.current = 0;
      const g = graph.current;
      const xm = p.mode === "standing" ? LEN / (2 * p.n) : 1.5;
      if (!g.length || clock.current - g[g.length - 1][0] > 1 / 40) g.push([clock.current, disp(p, xm, clock.current)]);
      if (g.length > 3000) g.splice(0, 1000);
    }
    draw(ctx, w, h, p, clock.current, theme, show);
  };
  const live = useLive(() => clock.current, 6);
  const lam = p.v / p.f;
  const fn = (p.n * p.v) / (2 * LEN);

  const challenges = [
    { id: "lam1", title: "Make the wavelength exactly 1.00 m", detail: "Use v = fλ. There's more than one way.", done: p.mode !== "standing" && p.mode !== "pulses" && Math.abs(lam - 1) < 0.005 },
    { id: "two", title: "Fit exactly two whole wavelengths on the 4 m string", detail: "Travelling wave, after it has reached the far end.", done: (p.mode === "transverse" || p.mode === "longitudinal") && Math.abs(lam - 2) < 0.005 && live * p.v >= LEN },
    { id: "nodes", title: "Make a standing wave with 5 nodes, counting both ends", detail: "Which harmonic is that? What is its frequency?", done: p.mode === "standing" && p.n === 4 },
    { id: "cancel", title: "Make two pulses cancel out completely as they pass", detail: "Destructive interference: the string goes flat for an instant.", done: p.mode === "pulses" && Math.abs(p.a1 + p.a2) < 0.01 && Math.abs(p.a1) > 0.2 },
  ];

  return (
    <SimShell
      id="waves"
      running={running}
      onRun={setRunning}
      onReset={() => { restart(); }}
      speed={speed}
      onSpeed={setSpeed}
      challenges={challenges}
      record={() => ({ "f (Hz)": p.f, "v (m/s)": p.v, "λ (m)": +lam.toFixed(4), "T (s)": +(1 / p.f).toFixed(4), "A (cm)": p.A })}
      ask={() => p.mode === "standing" ? `Standing wave on a 4 m string: harmonic n = ${p.n}, wave speed ${p.v} m/s, so f = ${fmt(fn, 3)} Hz and λ = ${fmt((2 * LEN) / p.n, 3)} m.` : p.mode === "pulses" ? `Two pulses meeting on a string, amplitudes ${p.a1} and ${p.a2} (relative), wave speed ${p.v} m/s.` : `${p.mode} wave: frequency ${p.f} Hz, wave speed ${p.v} m/s, amplitude ${p.A} cm, wavelength ${fmt(lam, 3)} m.`}
      stage={<Stage label={`${p.mode} wave on a string`} render={render} />}
      overlay={
        <Readouts>
          {p.mode === "standing" ? (
            <>
              <Readout label="harmonic" value={`n = ${p.n}`} />
              <Readout label="frequency" value={fn} unit="Hz" digits={3} />
              <Readout label="wavelength" value={(2 * LEN) / p.n} unit="m" digits={3} color={theme.c.amber} />
              <Readout label="nodes" value={String(p.n + 1)} />
            </>
          ) : (
            <>
              <Readout label="wavelength λ" value={lam} unit="m" digits={3} color={theme.c.amber} />
              <Readout label="frequency f" value={p.f} unit="Hz" />
              <Readout label="period T" value={1 / p.f} unit="s" digits={3} />
              <Readout label="speed v" value={p.v} unit="m/s" />
            </>
          )}
        </Readouts>
      }
      below={<TimeGraph title={p.mode === "standing" ? "Displacement at an antinode" : p.mode === "pulses" ? "Displacement at x = 1.5 m" : "Displacement of the red particle"} data={graph} yLabel="y / cm" window={6} series={[{ label: "displacement", color: theme.c.red }]} />}
      controls={
        <>
          <Group title="Wave">
            <Choice value={p.mode} onChange={(mode) => change({ mode })} options={[{ value: "transverse", label: "Transverse" }, { value: "longitudinal", label: "Longitudinal" }, { value: "pulses", label: "Two pulses" }, { value: "standing", label: "Standing" }]} wrap />
            <Slider label="Amplitude" value={p.A} min={0.5} max={5} step={0.1} unit="cm" onChange={(A) => change({ A })} />
            {p.mode !== "pulses" && p.mode !== "standing" && <Slider label="Frequency" value={p.f} min={0.1} max={3} step={0.05} unit="Hz" onChange={(f) => change({ f })} />}
            <Slider label="Wave speed" value={p.v} min={0.5} max={5} step={0.1} unit="m/s" onChange={(v) => change({ v })} hint="Set by the string: its tension and mass per metre." />
            {p.mode === "standing" && <Slider label="Harmonic" value={p.n} min={1} max={8} step={1} onChange={(n) => change({ n })} />}
            {p.mode === "pulses" && (
              <>
                <Slider label="Pulse from the left" value={p.a1} min={-1} max={1} step={0.05} color={theme.c.pink} onChange={(a1) => change({ a1 })} hint="Negative is upside down." />
                <Slider label="Pulse from the right" value={p.a2} min={-1} max={1} step={0.05} color={theme.c.cyan} onChange={(a2) => change({ a2 })} />
              </>
            )}
          </Group>
          <Group title="Show">
            <Switch label="Marked particle" checked={show.marker} onChange={(marker) => setShow({ ...show, marker })} />
            <Switch label="Ruler" checked={show.ruler} onChange={(ruler) => setShow({ ...show, ruler })} />
          </Group>
        </>
      }
      learn={
        <>
          <H>What a wave carries</H>
          <p>A wave transfers energy from place to place without transferring the material. Watch the red particle: it only moves up and down (transverse) or back and forth (longitudinal) about one spot, while the wave shape travels along.</p>
          <H>The wave equation</H>
          <Eq>v = f λ &nbsp;&nbsp;&nbsp; T = 1 ⁄ f</Eq>
          <p>The speed depends on the medium (here, the string). If you raise the frequency, the speed stays the same, so the wavelength gets shorter.</p>
          <H>Longitudinal waves</H>
          <p>In sound, particles move parallel to the direction the wave travels, making compressions (crowded) and rarefactions (spread out). One wavelength is the distance from one compression to the next.</p>
          <H>Superposition</H>
          <p>When two waves meet, the displacements add. Two crests make a bigger crest (constructive); a crest and a trough of the same size cancel (destructive). Then they carry on as if nothing happened.</p>
          <H>Standing waves</H>
          <p>A wave reflecting from the fixed ends overlaps with itself. Only some frequencies fit: those with a node at each end. Harmonic n has n half-wavelengths on the string.</p>
          <Eq>λₙ = 2L ⁄ n &nbsp;&nbsp; fₙ = n v ⁄ 2L</Eq>
          <Try>in Standing mode, double the wave speed. What happens to each harmonic's frequency and wavelength?</Try>
        </>
      }
    />
  );
}
