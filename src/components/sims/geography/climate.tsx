import React, { useMemo, useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Switch } from "../kit/controls";
import { Plot, arrow, glow, label, roundRect, fmt, TAU, type Ctx } from "../kit/draw";

// A simple two-layer energy-balance climate model, 1850–2100. CO₂ follows a
// smooth fit to the historical rise, then one of three pathways. It is a
// teaching model: it shows the mechanisms, not a forecast.

type Scen = "low" | "mid" | "high";
type P = { scen: Scen; ecs: number; aerosols: boolean; feedbacks: boolean };
const DEF: P = { scen: "mid", ecs: 3, aerosols: true, feedbacks: true };
const SCEN: Record<Scen, { name: string; text: string; color: string }> = {
  low: { name: "Net zero by 2050", text: "Emissions fall fast and reach net zero around 2050.", color: "#34d399" },
  mid: { name: "Current policies", text: "Emissions level off and decline slowly.", color: "#fbbf24" },
  high: { name: "High emissions", text: "Emissions keep rising all century.", color: "#f87171" },
};

/** CO₂ (ppm): historical fit to 2025, then the pathway's rate of change */
export function co2(year: number, s: Scen) {
  if (year <= 2025) return 280 + 145 * Math.pow(Math.max(0, year - 1850) / 175, 3.3);
  const y = year - 2025;
  if (s === "high") return 425 + 2.6 * y + 0.04 * y * y;
  if (s === "mid") return 425 + 2.6 * y - 0.0125 * y * y;
  // low: rate falls from 2.5 to 0 by 2050, then −0.4 ppm/yr
  return y <= 25 ? 425 + 2.5 * y - 0.05 * y * y : 425 + 31.25 - 0.4 * (y - 25);
}
const aerosol = (year: number, s: Scen) => {
  const hist = -0.9 * Math.min(1, Math.pow(Math.max(0, year - 1850) / 175, 2));
  if (year <= 2025) return hist;
  const end = s === "low" ? -0.2 : s === "mid" ? -0.6 : -0.9;
  return -0.9 + (end + 0.9) * Math.min(1, (year - 2025) / 50);
};

export type Point = { year: number; co2: number; F: number; T: number };
export function run(p: P): Point[] {
  const lambda = p.feedbacks ? 3.7 / p.ecs : 3.3; // W m⁻² K⁻¹ (Planck response alone without feedbacks)
  const Cs = 8, Cd = 100, gamma = 0.7;
  let T = 0, Td = 0;
  const out: Point[] = [];
  const h = 0.1;
  for (let year = 1850; year <= 2100 + 1e-9; year += h) {
    const c = co2(year, p.scen);
    const F = 1.25 * 5.35 * Math.log(c / 280) + (p.aerosols ? aerosol(year, p.scen) : 0);
    const dT = (F - lambda * T - gamma * (T - Td)) / Cs, dTd = (gamma * (T - Td)) / Cd;
    T += dT * h; Td += dTd * h;
    if (Math.abs(year - Math.round(year)) < h / 2) out.push({ year: Math.round(year), co2: c, F, T });
  }
  return out;
}

function draw(ctx: Ctx, w: number, h: number, p: P, data: Point[], year: number, t: SimTheme) {
  ctx.fillStyle = "#020617"; ctx.fillRect(0, 0, w, h);
  const now = data[Math.max(0, Math.min(data.length - 1, Math.round(year) - 1850))];
  // Earth, sunlight in and heat out
  const leftW = Math.min(w * 0.38, 360);
  const ex = leftW * 0.52, ey = h * 0.55, R = Math.min(leftW * 0.32, h * 0.26);
  for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + (i % 5) * 0.1})`; ctx.fillRect((i * 97) % leftW, (i * 53) % h, 1.2, 1.2); }
  const haze = Math.min(1, (now.co2 - 280) / 600);
  glow(ctx, ex, ey, R * 1.45, haze > 0.3 ? "#fb923c" : "#60a5fa", 0.25 + 0.35 * haze);
  const ocean = ctx.createRadialGradient(ex - R * 0.35, ey - R * 0.35, R * 0.1, ex, ey, R);
  ocean.addColorStop(0, "#60a5fa"); ocean.addColorStop(0.6, "#1d4ed8"); ocean.addColorStop(1, "#0b1a4a");
  ctx.fillStyle = ocean; ctx.beginPath(); ctx.arc(ex, ey, R, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, R, 0, TAU); ctx.clip();
  ctx.fillStyle = "#3f8f4a";
  for (const [dx, dy, rr] of [[-0.3, -0.1, 0.32], [0.25, 0.15, 0.28], [0.05, -0.45, 0.2], [-0.15, 0.4, 0.18]]) { ctx.beginPath(); ctx.ellipse(ex + dx * R, ey + dy * R, rr * R, rr * R * 0.7, dx, 0, TAU); ctx.fill(); }
  // Polar ice shrinks as it warms (illustrative)
  const ice = Math.max(0.05, 0.28 - now.T * 0.05);
  ctx.fillStyle = "#f1f5f9"; ctx.beginPath(); ctx.ellipse(ex, ey - R, R * (ice * 2.4), R * ice, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(ex, ey + R, R * (ice * 2.6), R * ice * 1.1, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = `rgba(147,197,253,${0.4 + 0.4 * haze})`; ctx.lineWidth = 6 + 10 * haze;
  ctx.beginPath(); ctx.arc(ex, ey, R + 8 + 6 * haze, 0, TAU); ctx.stroke();
  // Arrows: sunlight in, infrared out (some returned by the greenhouse layer)
  for (let i = 0; i < 3; i++) arrow(ctx, ex - R - 70 + i * 10, ey - R - 50 + i * 26, ex - R * 0.55 + i * 6, ey - R * 0.45 + i * 18, "#fde047", { width: 3 });
  const out = Math.max(0.25, 1 - haze * 0.8);
  arrow(ctx, ex + R * 0.5, ey - R * 0.6, ex + R * 0.5 + 70 * out, ey - R * 0.6 - 70 * out, "#f87171", { width: 3 });
  arrow(ctx, ex + R * 0.75, ey - R * 0.95, ex + R * 0.95, ey - R * 1.05, "#f87171", { width: 3 });
  arrow(ctx, ex + R * 0.95, ey - R * 1.05, ex + R * 0.8, ey - R * 0.8, "#fb923c", { width: 2.5, dash: [4, 3] });
  label(ctx, "sunlight", Math.max(36, ex - R - 40), ey - R - 64, { color: "#fde047", size: 11, weight: 700 });
  label(ctx, "heat escaping to space", ex + R * 0.6, ey - R - 54, { color: "#fca5a5", size: 11, weight: 700 });
  // Thermometer
  const tx = 26, ty0 = h - 50, th = h * 0.42;
  ctx.fillStyle = "rgba(255,255,255,0.15)"; roundRect(ctx, tx - 7, ty0 - th, 14, th, 7); ctx.fill();
  const lvl = Math.max(0, Math.min(1, now.T / 5));
  const col = now.T < 1.5 ? "#fbbf24" : now.T < 2 ? "#fb923c" : "#ef4444";
  ctx.fillStyle = col; roundRect(ctx, tx - 5, ty0 - th * lvl, 10, th * lvl, 5); ctx.fill();
  ctx.beginPath(); ctx.arc(tx, ty0 + 8, 12, 0, TAU); ctx.fill();
  label(ctx, `+${fmt(now.T, 2)} °C`, tx + 18, ty0 - th * lvl, { color: col, size: 13, weight: 800, align: "left" });
  // Charts
  const cx0 = leftW + 30, cw = w - cx0 - 24;
  const top = 76, gh = (h - top - 70) / 2;
  const ymax = Math.max(1100, ...data.map((d) => d.co2));
  const cp = new Plot(cx0 + 20, top, cw - 20, gh - 20, 1850, 2100, 250, Math.min(ymax, 1200));
  const dark = { ...t, grid: "rgba(148,163,184,0.12)", axis: "rgba(203,213,225,0.45)", mute: "#94a3b8" };
  cp.axes(ctx, dark, { yLabel: "CO₂ (ppm)", xTicks: 5, yTicks: 4, xFmt: (v) => String(Math.round(v)) });
  const series = (pl: Plot, key: "co2" | "T", color: string) => {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color; ctx.globalAlpha = 0.25; ctx.beginPath(); data.forEach((d, i) => (i ? ctx.lineTo(pl.X(d.year), pl.Y(d[key])) : ctx.moveTo(pl.X(d.year), pl.Y(d[key])))); ctx.stroke();
    ctx.globalAlpha = 1; ctx.beginPath(); data.filter((d) => d.year <= year).forEach((d, i) => (i ? ctx.lineTo(pl.X(d.year), pl.Y(d[key])) : ctx.moveTo(pl.X(d.year), pl.Y(d[key])))); ctx.stroke();
  };
  ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cp.X(1850), cp.Y(560)); ctx.lineTo(cp.X(2100), cp.Y(560)); ctx.stroke(); ctx.setLineDash([]);
  label(ctx, "double pre-industrial (560)", cp.X(1855), cp.Y(560) - 9, { color: "#cbd5e1", size: 10.5, align: "left" });
  series(cp, "co2", SCEN[p.scen].color);
  const tp = new Plot(cx0 + 20, top + gh + 24, cw - 20, gh - 20, 1850, 2100, -0.5, Math.max(4.5, ...data.map((d) => d.T + 0.3)));
  tp.axes(ctx, dark, { yLabel: "warming since 1850 (°C)", xTicks: 5, yTicks: 4, xFmt: (v) => String(Math.round(v)), origin: true });
  for (const [v, txt, c] of [[1.5, "1.5 °C", "#fbbf24"], [2, "2 °C", "#ef4444"]] as const) {
    ctx.strokeStyle = c; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tp.x0, tp.Y(v)); ctx.lineTo(tp.x0 + tp.w, tp.Y(v)); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, `Paris limit ${txt}`, tp.x0 + 6, tp.Y(v) - 9, { color: c, size: 10.5, weight: 700, align: "left" });
  }
  series(tp, "T", "#f97316");
  // Year marker
  for (const pl of [cp, tp]) { ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pl.X(year), pl.y0); ctx.lineTo(pl.X(year), pl.y0 + pl.h); ctx.stroke(); }
  label(ctx, String(Math.round(year)), w - 24, 36, { color: "#f8fafc", size: 26, weight: 700, align: "right" });
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  draw(ctx, w * 1.25, h * 1.2, DEF, run(DEF), 2060, t);
}

export default function Climate() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { scen: ["low", "mid", "high"], ecs: [1.5, 4.5] });
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const data = useMemo(() => run(p), [p]);
  const year = useRef(2025);
  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    if (running) { year.current = Math.min(2100, year.current + dt * speed * 12); if (year.current >= 2100) setRunning(false); }
    draw(ctx, w, h, p, data, year.current, theme);
  };
  const y = useLive(() => Math.round(year.current), 8);
  const now = data[y - 1850];
  const end = data[data.length - 1];
  const doubling = data.find((d) => d.co2 >= 560);
  const challenges = [
    { id: "two", title: "Reach 2100 with less than 2 °C of warming", detail: "Which pathway, and does climate sensitivity matter?", done: y >= 2100 && end.T < 2 && p.ecs >= 3 && p.feedbacks },
    { id: "double", title: "Watch CO₂ pass double the pre-industrial level", detail: "Play a pathway until it crosses 560 ppm. Which ones never do?", done: !!doubling && y >= doubling.year },
    { id: "feedback", title: "Compare the high pathway in 2100 with feedbacks on and off", detail: "Run to 2100 with feedbacks off. How much do they add?", done: p.scen === "high" && !p.feedbacks && y >= 2100 },
    { id: "aerosol", title: "Find out how much air pollution has been hiding", detail: "Turn aerosols off and look at warming in 2025.", done: !p.aerosols && y >= 2025 },
  ];

  return (
    <SimShell
      id="climate"
      running={running}
      onRun={(r) => { if (r && year.current >= 2100) year.current = 1850; setRunning(r); }}
      speed={speed}
      onSpeed={setSpeed}
      onReset={() => { setRunning(false); year.current = 2025; resetP(); }}
      challenges={challenges}
      record={() => ({ year: y, "CO₂ (ppm)": +now.co2.toFixed(1), "forcing (W/m²)": +now.F.toFixed(3), "warming (°C)": +now.T.toFixed(3), sensitivity: p.ecs })}
      ask={() => `Climate model, ${SCEN[p.scen].name} pathway, climate sensitivity ${p.ecs} °C per doubling of CO₂, feedbacks ${p.feedbacks ? "on" : "off"}, aerosol cooling ${p.aerosols ? "on" : "off"}. In ${y}: CO₂ ${fmt(now.co2, 0)} ppm, warming ${fmt(now.T, 2)} °C. By 2100: CO₂ ${fmt(end.co2, 0)} ppm, warming ${fmt(end.T, 2)} °C.`}
      stage={<Stage label="Climate model of the Earth" render={render} />}
      overlay={
        <Readouts>
          <Readout label="CO₂" value={`${fmt(now.co2, 0)} ppm`} />
          <Readout label="extra energy" value={`${fmt(now.F, 2)} W/m²`} />
          <Readout label="warming" value={`+${fmt(now.T, 2)} °C`} color="#f97316" />
          <Readout label="2100" value={`+${fmt(end.T, 2)} °C`} color={SCEN[p.scen].color} />
        </Readouts>
      }
      controls={
        <>
          <Group title="Emissions pathway">
            <Choice value={p.scen} onChange={(scen) => set({ scen })} options={(Object.keys(SCEN) as Scen[]).map((k) => ({ value: k, label: SCEN[k].name }))} wrap />
            <p className="-mt-1 text-[12px] text-lp-mute">{SCEN[p.scen].text}</p>
          </Group>
          <Group title="The climate system">
            <Slider label="Climate sensitivity" value={p.ecs} min={1.5} max={4.5} step={0.1} unit="°C" onChange={(ecs) => set({ ecs })} hint="Long-run warming from doubling CO₂. Best estimate about 3 °C." />
            <Switch label="Feedbacks (water vapour, ice, clouds)" checked={p.feedbacks} onChange={(feedbacks) => set({ feedbacks })} hint="Off: only the direct warming from CO₂, about 1.1 °C per doubling." />
            <Switch label="Aerosols (air pollution)" checked={p.aerosols} onChange={(aerosols) => set({ aerosols })} hint="Tiny particles reflect sunlight and cool the planet a little." />
          </Group>
          <Group title="Time">
            <Slider label="Year" value={y} min={1850} max={2100} step={1} onChange={(v) => { setRunning(false); year.current = v; }} />
          </Group>
        </>
      }
      learn={
        <>
          <H>The greenhouse effect</H>
          <p>Sunlight warms the surface, which gives off infrared radiation. Greenhouse gases (CO₂, methane, water vapour) absorb some of it and send part back down, so the surface is warmer than it would be. More CO₂ means less heat escapes until the planet warms enough to balance again.</p>
          <H>Forcing and response</H>
          <Eq>extra energy ≈ 5.35 × ln(CO₂ ⁄ 280) W/m² (for CO₂)</Eq>
          <p>Each doubling of CO₂ adds about the same extra energy. The oceans take decades to warm, so temperature keeps rising for a while even when CO₂ levels off.</p>
          <H>Feedbacks</H>
          <p>Warmer air holds more water vapour (another greenhouse gas); melting ice exposes darker sea and land that absorb more sunlight. These roughly triple the direct warming from CO₂. Clouds are the most uncertain part.</p>
          <H>About this model</H>
          <p>It has two layers (surface and deep ocean), smooth CO₂ pathways and simple aerosol and other-gas terms. Real climate models divide the planet into millions of boxes; this one shows why warming happens and what controls it, not exact future values.</p>
          <Try>switch to Net zero and play to 2100. Why doesn't the temperature fall straight away when CO₂ stops rising?</Try>
        </>
      }
    />
  );
}
