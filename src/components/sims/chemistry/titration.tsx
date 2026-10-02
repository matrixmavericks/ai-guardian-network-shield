import React, { useEffect, useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice, Btn } from "../kit/controls";
import { Plot, label, roundRect, mix, fmt, TAU, type Ctx } from "../kit/draw";

// Acid–base titration: 25.0 cm³ of acid in the flask, 0.100 mol dm⁻³ sodium
// hydroxide from the burette. pH from the exact charge balance (solved
// numerically), so strong and weak acids both come out right.

const ACIDS = { hcl: { name: "Hydrochloric acid (strong)", Ka: 1e8 }, ethanoic: { name: "Ethanoic acid (weak)", Ka: 1.74e-5 } } as const;
type Acid = keyof typeof ACIDS;
const IND = {
  phenol: { name: "Phenolphthalein", lo: 8.2, hi: 10, a: "#ffffff00", b: "#ec4899" },
  methyl: { name: "Methyl orange", lo: 3.1, hi: 4.4, a: "#ef4444", b: "#facc15" },
  btb: { name: "Bromothymol blue", lo: 6.0, hi: 7.6, a: "#facc15", b: "#2563eb" },
  universal: { name: "Universal indicator", lo: 0, hi: 14, a: "", b: "" },
} as const;
type Ind = keyof typeof IND;
type P = { acid: Acid; ca: number; ind: Ind };
const DEF: P = { acid: "hcl", ca: 0.1, ind: "phenol" };
const VA = 25, CB = 0.1, KW = 1e-14;

/** pH after adding vb cm³ of base */
export function pH(p: Pick<P, "acid" | "ca">, vb: number) {
  const V = (VA + vb) / 1000;
  const Ca = (p.ca * VA) / 1000 / V, Na = (CB * vb) / 1000 / V;
  const Ka = ACIDS[p.acid].Ka;
  // Charge balance: [H⁺] + [Na⁺] = [A⁻] + [OH⁻]; find log[H⁺] by bisection
  let lo = -15, hi = 1;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2, H = Math.pow(10, m);
    const f = H + Na - (Ca * Ka) / (Ka + H) - KW / H;
    if (f > 0) hi = m; else lo = m;
  }
  return -(lo + hi) / 2;
}
const UNIVERSAL = ["#dc2626", "#ea580c", "#f97316", "#f59e0b", "#facc15", "#a3e635", "#4ade80", "#22c55e", "#14b8a6", "#0ea5e9", "#3b82f6", "#4f46e5", "#7c3aed", "#6d28d9", "#581c87"];
export function colour(ind: Ind, ph: number) {
  if (ind === "universal") { const i = Math.max(0, Math.min(13.999, ph)); const k = Math.floor(i); return mix(UNIVERSAL[k], UNIVERSAL[k + 1], i - k); }
  const I = IND[ind];
  const f = Math.max(0, Math.min(1, (ph - I.lo) / (I.hi - I.lo)));
  if (ind === "phenol") return `rgba(236,72,153,${(f * 0.85).toFixed(3)})`;
  return mix(I.a, I.b, f);
}

function draw(ctx: Ctx, w: number, h: number, p: P, vb: number, drops: { y: number }[], t: SimTheme, curve: [number, number][]) {
  ctx.fillStyle = t.dark ? "#070c18" : "#f4f7fb"; ctx.fillRect(0, 0, w, h);
  const appW = Math.min(w * 0.42, 340);
  const bx = appW / 2 + 10;
  // Stand
  ctx.fillStyle = t.dark ? "#334155" : "#94a3b8"; ctx.fillRect(bx - 90, 70, 8, h - 110); ctx.fillRect(bx - 130, h - 44, 120, 10);
  ctx.fillRect(bx - 86, 150, 80, 6);
  // Burette: 50 cm³ scale, liquid level falls as base is added
  const bTop = 76, bLen = h * 0.46, bW = 22;
  const glass = ctx.createLinearGradient(bx - bW / 2, 0, bx + bW / 2, 0);
  glass.addColorStop(0, "rgba(226,232,240,0.25)"); glass.addColorStop(0.3, "rgba(255,255,255,0.45)"); glass.addColorStop(1, "rgba(148,163,184,0.2)");
  const level = bTop + (vb / 50) * bLen;
  ctx.fillStyle = t.dark ? "rgba(186,230,253,0.35)" : "rgba(125,211,252,0.45)"; ctx.fillRect(bx - bW / 2 + 2, level, bW - 4, bTop + bLen - level);
  ctx.fillStyle = glass; roundRect(ctx, bx - bW / 2, bTop, bW, bLen, 4); ctx.fill();
  ctx.strokeStyle = t.dark ? "rgba(226,232,240,0.6)" : "rgba(51,65,85,0.5)"; ctx.lineWidth = 1.2; ctx.stroke();
  for (let v = 0; v <= 50; v += 1) { const y = bTop + (v / 50) * bLen; ctx.strokeStyle = t.dark ? "rgba(226,232,240,0.6)" : "rgba(51,65,85,0.6)"; ctx.beginPath(); ctx.moveTo(bx - bW / 2, y); ctx.lineTo(bx - bW / 2 + (v % 5 === 0 ? 9 : 5), y); ctx.stroke(); if (v % 10 === 0) label(ctx, String(v), bx - bW / 2 - 6, y, { color: t.mute, size: 9.5, align: "right" }); }
  // Tap and tip
  const tipY = bTop + bLen;
  ctx.fillStyle = t.dark ? "#64748b" : "#475569"; ctx.fillRect(bx - 14, tipY + 2, 28, 7);
  ctx.strokeStyle = t.dark ? "rgba(226,232,240,0.6)" : "rgba(51,65,85,0.5)"; ctx.beginPath(); ctx.moveTo(bx - 3, tipY); ctx.lineTo(bx - 2, tipY + 30); ctx.lineTo(bx + 2, tipY + 30); ctx.lineTo(bx + 3, tipY); ctx.stroke();
  // Falling drops
  ctx.fillStyle = t.dark ? "rgba(186,230,253,0.9)" : "rgba(14,165,233,0.8)";
  for (const d of drops) { ctx.beginPath(); ctx.ellipse(bx, tipY + 34 + d.y, 3, 4.5, 0, 0, TAU); ctx.fill(); }
  // Conical flask with the coloured solution
  const fy = h - 50, fTop = fy - 130, neck = 22, base = 70;
  const ph = pH(p, vb);
  const col = colour(p.ind, ph);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(bx - neck / 2, fTop); ctx.lineTo(bx - neck / 2, fTop + 30); ctx.lineTo(bx - base, fy); ctx.lineTo(bx + base, fy); ctx.lineTo(bx + neck / 2, fTop + 30); ctx.lineTo(bx + neck / 2, fTop); ctx.closePath();
  ctx.fillStyle = t.dark ? "rgba(226,232,240,0.06)" : "rgba(255,255,255,0.6)"; ctx.fill();
  ctx.clip();
  const liquidTop = fy - 46 - vb * 0.5;
  ctx.fillStyle = t.dark ? "rgba(203,213,225,0.16)" : "rgba(203,213,225,0.35)"; ctx.fillRect(bx - base, liquidTop, base * 2, fy - liquidTop);
  ctx.fillStyle = col; ctx.fillRect(bx - base, liquidTop, base * 2, fy - liquidTop);
  ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(bx - base, liquidTop, base * 2, 3);
  ctx.restore();
  ctx.strokeStyle = t.dark ? "rgba(226,232,240,0.7)" : "rgba(51,65,85,0.6)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bx - neck / 2, fTop); ctx.lineTo(bx - neck / 2, fTop + 30); ctx.lineTo(bx - base, fy); ctx.lineTo(bx + base, fy); ctx.lineTo(bx + neck / 2, fTop + 30); ctx.lineTo(bx + neck / 2, fTop); ctx.stroke();
  // pH meter
  ctx.fillStyle = "#0f172a"; roundRect(ctx, bx + base - 10, fTop - 34, 74, 40, 8); ctx.fill();
  label(ctx, ph.toFixed(2), bx + base + 27, fTop - 14, { color: "#4ade80", size: 17, weight: 700, font: "ui-monospace, monospace" });
  label(ctx, "pH", bx + base + 27, fTop - 38, { color: t.mute, size: 10 });
  // Titration curve
  const gx = appW + 50, gw = w - gx - 24;
  if (gw < 160) return;
  const pl = new Plot(gx, 90, gw, h - 150, 0, 50, 0, 14);
  pl.axes(ctx, t, { xLabel: "volume of NaOH added (cm³)", yLabel: "pH", xTicks: 5, yTicks: 7 });
  const eq = (p.ca * VA) / CB;
  ctx.strokeStyle = t.grid; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(pl.X(eq), pl.y0); ctx.lineTo(pl.X(eq), pl.y0 + pl.h); ctx.stroke(); ctx.setLineDash([]);
  label(ctx, `equivalence ${fmt(eq, 2)} cm³`, pl.X(eq) + 6, pl.y0 + 12, { color: t.mute, size: 11, align: "left" });
  if (p.ind !== "universal") {
    const I = IND[p.ind];
    ctx.fillStyle = t.dark ? "rgba(236,72,153,0.12)" : "rgba(219,39,119,0.08)";
    ctx.fillRect(pl.x0, pl.Y(I.hi), pl.w, pl.Y(I.lo) - pl.Y(I.hi));
    label(ctx, `${I.name} changes colour`, pl.x0 + pl.w - 6, pl.Y(I.hi) - 8, { color: t.c.pink, size: 11, weight: 600, align: "right" });
  }
  pl.fn(ctx, (v) => pH(p, v), t.dark ? "rgba(148,163,184,0.35)" : "rgba(71,85,105,0.3)", 1.5, [5, 4]);
  ctx.strokeStyle = t.c.blue; ctx.lineWidth = 3;
  ctx.beginPath(); curve.forEach(([v, y], i) => (i ? ctx.lineTo(pl.X(v), pl.Y(y)) : ctx.moveTo(pl.X(v), pl.Y(y)))); ctx.stroke();
  ctx.fillStyle = t.c.blue; ctx.beginPath(); ctx.arc(pl.X(vb), pl.Y(ph), 6, 0, TAU); ctx.fill();
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const p = { ...DEF };
  const curve: [number, number][] = [];
  for (let v = 0; v <= 26; v += 0.25) curve.push([v, pH(p, v)]);
  draw(ctx, w * 1.15, h * 1.15, p, 26, [], t, curve);
}

export default function Titration() {
  const theme = useSimTheme();
  const [p, set] = useSimParams<P>(DEF, { acid: ["hcl", "ethanoic"], ca: [0.05, 0.2], ind: ["phenol", "methyl", "btb", "universal"] });
  const [running, setRunning] = useState(false);
  const [rate, setRate] = useState(1); // cm³ per second while the tap is open
  const sim = useRef({ vb: 0, drops: [] as { y: number; v: number }[], curve: [[0, pH(p, 0)]] as [number, number][], minVforChange: NaN });
  const add = (dv: number) => {
    const s = sim.current;
    s.vb = Math.min(50, +(s.vb + dv).toFixed(3));
    s.drops.push({ y: 0, v: 0 });
    const last = s.curve[s.curve.length - 1];
    if (!last || s.vb - last[0] >= 0.05) s.curve.push([s.vb, pH(p, s.vb)]);
    // When the indicator first changes (half way through its range)
    if (p.ind !== "universal" && !isFinite(s.minVforChange) && pH(p, s.vb) >= (IND[p.ind].lo + IND[p.ind].hi) / 2) s.minVforChange = s.vb;
  };
  const reset = () => { sim.current = { vb: 0, drops: [], curve: [[0, pH(p, 0)]], minVforChange: NaN }; setRunning(false); };
  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const s = sim.current;
    if (running) { add(rate * dt); if (s.vb >= 50) setRunning(false); }
    s.drops.forEach((d) => { d.v += 900 * dt; d.y += d.v * dt; });
    s.drops = s.drops.filter((d) => d.y < 70).slice(-12);
    draw(ctx, w, h, p, s.vb, s.drops, theme, s.curve);
  };
  const live = useLive(() => ({ vb: sim.current.vb, change: sim.current.minVforChange }), 10);
  const ph = pH(p, live.vb);
  const eq = (p.ca * VA) / CB;
  const pKa = -Math.log10(ACIDS.ethanoic.Ka);
  // A new acid or indicator means a fresh flask
  useEffect(() => { reset(); }, [p.acid, p.ca, p.ind]); // eslint-disable-line react-hooks/exhaustive-deps

  const challenges = [
    { id: "end", title: "Find the end point with phenolphthalein to within 0.10 cm³", detail: "Hydrochloric acid. Slow down near the end: the first permanent pink is the end point.", done: p.acid === "hcl" && p.ind === "phenol" && Math.abs(live.vb - eq) <= 0.1 && ph >= 8.2 },
    { id: "bad", title: "Show why methyl orange is a poor choice for ethanoic acid", detail: "Watch where it changes colour compared with the equivalence point.", done: p.acid === "ethanoic" && p.ind === "methyl" && isFinite(live.change) && live.change < eq - 5 },
    { id: "pka", title: "Find the pKa of ethanoic acid from the curve", detail: "At half the equivalence volume, pH = pKa. Stop there.", done: p.acid === "ethanoic" && Math.abs(live.vb - eq / 2) <= 0.3 && Math.abs(ph - pKa) < 0.1 },
    { id: "over", title: "Overshoot: take the pH above 12", detail: "Then work out how much base was in excess.", done: ph > 12 },
  ];

  return (
    <SimShell
      id="titration"
      running={running}
      onRun={setRunning}
      onReset={reset}
      challenges={challenges}
      record={() => ({ "NaOH added (cm³)": +live.vb.toFixed(2), pH: +ph.toFixed(3) })}
      ask={() => `Titration: 25.0 cm³ of ${p.ca} mol/dm³ ${ACIDS[p.acid].name.split(" (")[0].toLowerCase()} with 0.100 mol/dm³ NaOH, ${IND[p.ind].name}. I've added ${fmt(live.vb, 2)} cm³ and the pH is ${ph.toFixed(2)}. The equivalence point is at ${fmt(eq, 2)} cm³.`}
      stage={<Stage label="Titration with a burette and conical flask" render={render} />}
      overlay={
        <Readouts>
          <Readout label="NaOH added" value={`${live.vb.toFixed(2)} cm³`} />
          <Readout label="pH" value={ph.toFixed(2)} color="#4ade80" />
        </Readouts>
      }
      controls={
        <>
          <Group title="In the flask: 25.0 cm³ of acid">
            <Choice value={p.acid} onChange={(acid) => set({ acid })} options={(Object.keys(ACIDS) as Acid[]).map((k) => ({ value: k, label: ACIDS[k].name }))} wrap />
            <Slider label="Acid concentration" value={p.ca} min={0.05} max={0.2} step={0.01} unit="mol/dm³" onChange={(ca) => set({ ca })} />
            <Choice label="Indicator" value={p.ind} onChange={(ind) => set({ ind })} options={(Object.keys(IND) as Ind[]).map((k) => ({ value: k, label: IND[k].name }))} wrap />
          </Group>
          <Group title="Burette: 0.100 mol/dm³ NaOH">
            <div className="grid grid-cols-3 gap-1.5">
              <Btn onClick={() => add(0.05)}>1 drop</Btn>
              <Btn onClick={() => add(0.5)}>0.5 cm³</Btn>
              <Btn onClick={() => add(5)}>5 cm³</Btn>
            </div>
            <Slider label="Flow with the tap open (Play)" value={rate} min={0.1} max={4} step={0.1} unit="cm³/s" onChange={setRate} />
            <Btn onClick={reset}>Refill and start again</Btn>
          </Group>
        </>
      }
      learn={
        <>
          <H>Neutralisation</H>
          <Eq>acid + base → salt + water &nbsp;&nbsp; H⁺ + OH⁻ → H₂O</Eq>
          <p>At the equivalence point the acid and base have exactly reacted: moles of NaOH added = moles of acid in the flask.</p>
          <Eq>moles = concentration × volume (in dm³)</Eq>
          <H>The shape of the curve</H>
          <p>The pH barely changes at first, then rises very steeply near the equivalence point: one drop can change it by several units. For a strong acid with a strong base the equivalence point is at pH 7. For a weak acid it is above 7, because the salt formed (sodium ethanoate) is slightly alkaline.</p>
          <H>Choosing an indicator</H>
          <p>An indicator changes colour over a pH range. It must change within the steep part of the curve. Phenolphthalein (8.2–10) suits both strong and weak acids with sodium hydroxide; methyl orange (3.1–4.4) changes far too early for a weak acid.</p>
          <H>Buffers and pKa</H>
          <p>Halfway to equivalence in a weak-acid titration, there are equal amounts of the acid and its salt, so pH = pKa (4.76 for ethanoic acid). The flat region around it is a buffer: it resists changes in pH.</p>
          <Try>with 0.10 mol/dm³ HCl, where is the end point? Now double the acid concentration. Predict the new end point before you titrate.</Try>
        </>
      }
    />
  );
}
