import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Switch } from "../kit/controls";
import { label, sphere, fmt, TAU, type Ctx } from "../kit/draw";

// A ripple tank: two point sources make circular waves; where they overlap the
// surface shows interference. Drawn as a shaded water surface, computed per pixel.

type P = { d: number; lam: number; phase: number; lines: boolean; px: number; py: number };
const DEF: P = { d: 6, lam: 1.5, phase: 0, lines: false, px: 22, py: 14 };
// 30 cm wide; the depth follows the stage shape so circles stay circles
const TANK = { w: 30, h: 20 };
const fitTank = (w: number, h: number) => { TANK.h = (TANK.w * h) / w; };
const V = 6; // wave speed, cm/s
const SY = 3.6; // how far the sources sit from the top edge, cm (clear of the readouts)

type Field = { cols: number; rows: number; r1: Float32Array; r2: Float32Array; a1: Float32Array; a2: Float32Array; img: ImageData; off: HTMLCanvasElement; key: string };

const lut = (dark: boolean) => {
  const out = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    // Deep water → bright crest
    const [r, g, b] = dark
      ? [10 + 140 * t ** 2.2, 40 + 190 * t ** 1.4, 70 + 175 * t ** 0.8]
      : [40 + 200 * t ** 1.8, 110 + 140 * t ** 1.2, 170 + 85 * t ** 0.6];
    out[i * 3] = r; out[i * 3 + 1] = g; out[i * 3 + 2] = b;
  }
  return out;
};
const LUT = { dark: lut(true), light: lut(false) };

function makeField(w: number, h: number, p: P): Field {
  const cols = Math.max(80, Math.min(260, Math.round(w / 3.2)));
  const rows = Math.round((cols * h) / w);
  const n = cols * rows;
  const r1 = new Float32Array(n), r2 = new Float32Array(n), a1 = new Float32Array(n), a2 = new Float32Array(n);
  const s1 = { x: TANK.w / 2 - p.d / 2, y: SY }, s2 = { x: TANK.w / 2 + p.d / 2, y: SY };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = ((i + 0.5) / cols) * TANK.w, y = ((j + 0.5) / rows) * TANK.h;
    const k = j * cols + i;
    r1[k] = Math.hypot(x - s1.x, y - s1.y); r2[k] = Math.hypot(x - s2.x, y - s2.y);
    a1[k] = 1 / Math.sqrt(1 + r1[k] / 2); a2[k] = 1 / Math.sqrt(1 + r2[k] / 2);
  }
  const off = document.createElement("canvas");
  off.width = cols; off.height = rows;
  return { cols, rows, r1, r2, a1, a2, img: new ImageData(cols, rows), off, key: `${cols}x${rows}:${p.d}:${TANK.h.toFixed(3)}` };
}

function paint(ctx: Ctx, w: number, h: number, f: Field, p: P, t: number, dark: boolean) {
  const k = TAU / p.lam, om = (TAU * V) / p.lam, ph = (p.phase * Math.PI) / 180;
  const front = V * t;
  const lt = dark ? LUT.dark : LUT.light;
  const data = f.img.data;
  const { cols, rows } = f;
  const hs = new Float32Array(cols * rows);
  for (let i = 0; i < hs.length; i++) {
    let v = 0;
    if (f.r1[i] < front) v += f.a1[i] * Math.sin(k * f.r1[i] - om * t);
    if (f.r2[i] < front) v += f.a2[i] * Math.sin(k * f.r2[i] - om * t + ph);
    hs[i] = v;
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const q = j * cols + i;
    // Light from the top left: brighten slopes facing it
    const gx = hs[q + (i < cols - 1 ? 1 : 0)] - hs[q - (i > 0 ? 1 : 0)];
    const gy = hs[q + (j < rows - 1 ? cols : 0)] - hs[q - (j > 0 ? cols : 0)];
    const shade = 0.5 + hs[q] * 0.28 - (gx + gy) * 0.55;
    const c = Math.max(0, Math.min(255, Math.round(shade * 255))) * 3;
    const o = q * 4;
    data[o] = lt[c]; data[o + 1] = lt[c + 1]; data[o + 2] = lt[c + 2]; data[o + 3] = 255;
  }
  f.off.getContext("2d")!.putImageData(f.img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(f.off, 0, 0, w, h);
}

const toPx = (w: number, h: number) => ({ X: (x: number) => (x / TANK.w) * w, Y: (y: number) => (y / TANK.h) * h, cmX: (px: number) => (px / w) * TANK.w, cmY: (py: number) => (py / h) * TANK.h });

/** Lines where path difference is constant: hyperbolas with the sources as foci. */
function hyperbola(ctx: Ctx, w: number, h: number, p: P, diff: number) {
  const { X, Y } = toPx(w, h);
  const c = p.d / 2, a = Math.abs(diff) / 2;
  if (a >= c) return;
  const b = Math.sqrt(c * c - a * a);
  const sgn = diff > 0 ? 1 : -1; // nearer source 2 → right side (r1 − r2 > 0)
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const yy = (i / 120) * TANK.h * 1.2;
    const x = sgn * a * Math.sqrt(1 + (yy * yy) / (b * b));
    const px = X(TANK.w / 2 + x), py = Y(SY + yy);
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.stroke();
}

const probeInfo = (p: P) => {
  const r1 = Math.hypot(p.px - (TANK.w / 2 - p.d / 2), p.py - SY), r2 = Math.hypot(p.px - (TANK.w / 2 + p.d / 2), p.py - SY);
  const diff = (r1 - r2) / p.lam + p.phase / 360;
  const frac = Math.abs(diff - Math.round(diff));
  return { r1, r2, diffL: (r1 - r2) / p.lam, kind: frac < 0.12 ? "constructive" : frac > 0.38 ? "destructive" : "in between" };
};

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const p = { ...DEF, d: 5, lam: 1.4 };
  fitTank(w, h);
  const f = makeField(w, h, p);
  paint(ctx, w, h, f, p, 9, t.dark);
  const { X, Y } = toPx(w, h);
  sphere(ctx, X(TANK.w / 2 - p.d / 2), Y(SY), 4, "#e2e8f0");
  sphere(ctx, X(TANK.w / 2 + p.d / 2), Y(SY), 4, "#e2e8f0");
}

export default function Interference() {
  const theme = useSimTheme();
  const [p, set] = useSimParams<P>(DEF, { d: [1, 14], lam: [0.6, 4], phase: [0, 180], px: [0, 30], py: [0, 60] });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [screen, setScreen] = useState(true);
  const clock = useRef(0);
  const field = useRef<Field | null>(null);
  const size = useRef({ w: 1, h: 1 });

  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    if (running) clock.current += dt * speed;
    size.current = { w, h };
    fitTank(w, h);
    const cols = Math.max(80, Math.min(260, Math.round(w / 3.2)));
    const key = `${cols}x${Math.round((cols * h) / w)}:${p.d}:${TANK.h.toFixed(3)}`;
    if (!field.current || field.current.key !== key) field.current = makeField(w, h, p);
    paint(ctx, w, h, field.current, p, clock.current, theme.dark);
    const { X, Y } = toPx(w, h);
    // Nodal (and central antinodal) lines
    if (p.lines) {
      ctx.lineWidth = 1.5;
      for (let n = -12; n <= 12; n++) {
        const node = (n + 0.5 - p.phase / 360) * p.lam;
        ctx.strokeStyle = "rgba(248,113,113,0.85)"; ctx.setLineDash([6, 5]);
        hyperbola(ctx, w, h, p, node);
        const anti = (n - p.phase / 360) * p.lam;
        ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.setLineDash([2, 5]);
        if (Math.abs(anti) < 1e-9) { ctx.beginPath(); ctx.moveTo(X(TANK.w / 2), Y(SY)); ctx.lineTo(X(TANK.w / 2), h); ctx.stroke(); } else hyperbola(ctx, w, h, p, anti);
      }
      ctx.setLineDash([]);
    }
    // Sources (dippers)
    for (const sx of [TANK.w / 2 - p.d / 2, TANK.w / 2 + p.d / 2]) {
      const bob = Math.sin((TAU * V * clock.current) / p.lam) * 2;
      sphere(ctx, X(sx), Y(SY) + bob, 7, "#e2e8f0", { shadow: true });
    }
    // Brightness along the far edge, like a screen
    if (screen) {
      const k = TAU / p.lam, ph = (p.phase * Math.PI) / 180;
      ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = (i / 200) * TANK.w, y = TANK.h - 0.5;
        const r1 = Math.hypot(x - (TANK.w / 2 - p.d / 2), y - SY), r2 = Math.hypot(x - (TANK.w / 2 + p.d / 2), y - SY);
        const a1 = 1 / Math.sqrt(1 + r1 / 2), a2 = 1 / Math.sqrt(1 + r2 / 2);
        const re = a1 * Math.cos(k * r1) + a2 * Math.cos(k * r2 + ph), im = a1 * Math.sin(k * r1) + a2 * Math.sin(k * r2 + ph);
        const amp = Math.hypot(re, im) / (a1 + a2);
        const px = X(x), py = h - 6 - amp * 46;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.stroke();
      label(ctx, "wave amplitude along the far edge", w - 10, h - 62, { color: "#fde68a", size: 11, weight: 600, align: "right", halo: true });
    }
    // Detector
    const pi = probeInfo(p);
    const s1x = X(TANK.w / 2 - p.d / 2), s2x = X(TANK.w / 2 + p.d / 2), sy = Y(SY), qx = X(p.px), qy = Y(p.py);
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(s1x, sy); ctx.lineTo(qx, qy); ctx.moveTo(s2x, sy); ctx.lineTo(qx, qy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = pi.kind === "constructive" ? "#4ade80" : pi.kind === "destructive" ? "#f87171" : "#fbbf24";
    ctx.beginPath(); ctx.arc(qx, qy, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
    label(ctx, "detector · drag me", qx, qy + 22, { color: "#ffffff", size: 11, weight: 600, halo: true });
  };

  const drag = useRef(false);
  const onDown = (pt: { x: number; y: number }) => {
    const { X, Y } = toPx(size.current.w, size.current.h);
    if (Math.hypot(pt.x - X(p.px), pt.y - Y(p.py)) < 30) { drag.current = true; return true; }
    return false;
  };
  const onMove = (pt: { x: number; y: number }, down: boolean) => {
    if (!down || !drag.current) return;
    const { cmX, cmY } = toPx(size.current.w, size.current.h);
    set({ px: Math.round(Math.max(0.5, Math.min(TANK.w - 0.5, cmX(pt.x))) * 10) / 10, py: Math.round(Math.max(SY + 1, Math.min(TANK.h - 0.5, cmY(pt.y))) * 10) / 10 });
  };
  const onUp = () => { drag.current = false; };

  const pi = probeInfo(p);
  const maxima = 2 * Math.floor(p.d / p.lam + 1e-9) + 1;
  const challenges = [
    { id: "dest", title: "Put the detector where the water stays still", detail: "Path difference of half a wavelength (or 1½, 2½…). In phase sources.", done: p.phase === 0 && pi.kind === "destructive" },
    { id: "five", title: "Make exactly 5 lines of maximum disturbance", detail: "Count the bright ridges spreading out. Change d or λ.", done: p.phase === 0 && maxima === 5 },
    { id: "anti", title: "Make the centre line go still", detail: "Put the detector on the centre line and make it destructive.", done: Math.abs(p.px - TANK.w / 2) < 0.3 && pi.kind === "destructive" },
  ];

  return (
    <SimShell
      id="interference"
      running={running}
      onRun={setRunning}
      onReset={() => { clock.current = 0; }}
      speed={speed}
      onSpeed={setSpeed}
      challenges={challenges}
      record={() => ({ "d (cm)": p.d, "λ (cm)": p.lam, "path difference (λ)": +pi.diffL.toFixed(3), "detector x (cm)": p.px, "detector y (cm)": p.py })}
      ask={() => `Ripple tank: two sources ${p.d} cm apart, wavelength ${p.lam} cm, sources ${p.phase === 0 ? "in phase" : "in antiphase"}. The detector is ${fmt(pi.r1, 2)} cm and ${fmt(pi.r2, 2)} cm from the sources: path difference ${fmt(pi.diffL, 2)} λ, so ${pi.kind} interference.`}
      stage={<Stage label="Ripple tank with two wave sources" render={render} onDown={onDown} onMove={onMove} onUp={onUp} cursor="pointer" />}
      overlay={
        <Readouts>
          <Readout label="path difference" value={pi.diffL} unit="λ" digits={2} />
          <Readout label="at the detector" value={pi.kind} color={pi.kind === "constructive" ? "#4ade80" : pi.kind === "destructive" ? "#f87171" : "#fbbf24"} />
          <Readout label="maxima" value={String(maxima)} />
        </Readouts>
      }
      controls={
        <>
          <Group title="Sources">
            <Slider label="Separation d" value={p.d} min={1} max={14} step={0.1} unit="cm" onChange={(d) => { set({ d }); clock.current = 0; }} />
            <Slider label="Wavelength λ" value={p.lam} min={0.6} max={4} step={0.05} unit="cm" onChange={(lam) => set({ lam })} hint={`Frequency ${fmt(V / p.lam, 2)} Hz at a wave speed of ${V} cm/s.`} />
            <Choice label="Sources move" value={String(p.phase)} onChange={(v) => set({ phase: Number(v) })} options={[{ value: "0", label: "In phase" }, { value: "180", label: "In antiphase" }]} />
          </Group>
          <Group title="Show">
            <Switch label="Nodal and antinodal lines" checked={p.lines} onChange={(lines) => set({ lines })} hint="Red: still water. White: biggest waves." />
            <Switch label="Amplitude along the far edge" checked={screen} onChange={setScreen} />
          </Group>
        </>
      }
      learn={
        <>
          <H>Two sources, one pattern</H>
          <p>Each dipper makes circular waves. Where they overlap, the displacements add (superposition). Some places always get crest-on-crest and trough-on-trough (big waves); others always get crest-on-trough (still water).</p>
          <H>Path difference decides it</H>
          <p>For sources in phase, compare the distances r₁ and r₂ from the two sources:</p>
          <Eq>r₁ − r₂ = nλ → constructive</Eq>
          <Eq>r₁ − r₂ = (n + ½)λ → destructive</Eq>
          <p>Points with the same path difference lie on curves (hyperbolas) spreading out from between the sources. That's why the still lines fan out.</p>
          <H>Spacing of the pattern</H>
          <p>Moving the sources further apart, or using a shorter wavelength, packs more lines in. Far away, the angle to the n-th bright line follows d sin θ = nλ, the same rule as for light through two slits (Young's experiment).</p>
          <Try>switch the sources to antiphase. What happens to the centre line, and why?</Try>
        </>
      }
    />
  );
}
