import React, { useRef, useState } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useLive, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Choice } from "../kit/controls";
import { Plot, label, roundRect, fmt, TAU, type Ctx } from "../kit/draw";

// Enzyme activity: rate = Vmax(T, pH) × [S] ⁄ (Km + [S]). Temperature speeds
// reactions until the enzyme denatures; pH works best near the optimum. The
// animation shows enzymes binding substrate, splitting it, and unfolding when hot.

const ENZ = {
  amylase: { name: "Amylase (saliva)", pH: 7, Tm: 44, sub: "starch", prod: "maltose" },
  pepsin: { name: "Pepsin (stomach)", pH: 2, Tm: 46, sub: "protein", prod: "peptides" },
  taq: { name: "Taq polymerase (hot-spring bacteria)", pH: 8, Tm: 88, sub: "DNA building blocks", prod: "DNA" },
} as const;
type Enz = keyof typeof ENZ;
type Vary = "temp" | "ph" | "sub";
type P = { enz: Enz; temp: number; ph: number; sub: number; amount: number; vary: Vary };
const DEF: P = { enz: "amylase", temp: 20, ph: 7, sub: 4, amount: 10, vary: "temp" };
const KM = 2;

/** Fraction of enzyme still folded (active) at temperature T */
export const folded = (e: Enz, T: number) => 1 / (1 + Math.exp((T - ENZ[e].Tm) / 2.2));
/** Relative rate (0–1 scale against the best possible) */
export function rate(p: Pick<P, "enz" | "temp" | "ph" | "sub" | "amount">, fold = folded(p.enz, p.temp)) {
  const kin = Math.pow(2, (p.temp - 37) / 10); // about doubles every 10 °C (Q10 ≈ 2)
  const phf = Math.exp(-(((p.ph - ENZ[p.enz].pH) / 1.6) ** 2));
  const sat = p.sub / (KM + p.sub);
  return kin * fold * phf * sat * (p.amount / 10);
}
const peakT = (e: Enz) => { let best = 0, bt = 0; for (let T = 0; T <= 100; T += 0.25) { const v = rate({ enz: e, temp: T, ph: ENZ[e].pH, sub: 100, amount: 10 }); if (v > best) { best = v; bt = T; } } return { T: bt, v: best }; };

type Mol = { x: number; y: number; vx: number; vy: number };
type Enzyme = Mol & { busy: number; bend: number; a: number };
// maxT: the hottest it has been since fresh enzyme was added (denaturing is permanent)
type S = { enz: Enzyme[]; sub: Mol[]; prod: (Mol & { age: number })[]; made: number; t: number; hist: [number, number][]; maxT: number };

const fresh = (p: P): S => ({
  enz: Array.from({ length: p.amount }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.04, vy: (Math.random() - 0.5) * 0.04, busy: 0, bend: 0, a: Math.random() * TAU })),
  sub: [], prod: [], made: 0, t: 0, hist: [], maxT: p.temp,
});

function step(s: S, p: P, h: number) {
  const target = Math.round(p.sub * 8);
  while (s.sub.length < target) s.sub.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.08, vy: (Math.random() - 0.5) * 0.08 });
  while (s.sub.length > target) s.sub.pop();
  const heat = Math.sqrt((p.temp + 273) / 310);
  // Random jostling (Brownian motion), faster when hotter
  const move = (m: Mol, k: number) => { m.vx += (Math.random() - 0.5) * 1.6 * heat * h * k; m.vy += (Math.random() - 0.5) * 1.6 * heat * h * k; m.vx *= 1 - 0.6 * h; m.vy *= 1 - 0.6 * h; const sp = Math.hypot(m.vx, m.vy), cap = 0.12 * k * heat; if (sp > cap) { m.vx *= cap / sp; m.vy *= cap / sp; } m.x += m.vx * h; m.y += m.vy * h; if (m.x < 0.03 || m.x > 0.97) m.vx *= -1; if (m.y < 0.05 || m.y > 0.95) m.vy *= -1; m.x = Math.min(0.97, Math.max(0.03, m.x)); m.y = Math.min(0.95, Math.max(0.05, m.y)); };
  s.maxT = Math.max(s.maxT, p.temp);
  const fold = folded(p.enz, s.maxT);
  const phf = Math.exp(-(((p.ph - ENZ[p.enz].pH) / 1.6) ** 2));
  const turnover = 1.4 * Math.pow(2, (p.temp - 37) / 10); // reactions per second for a working enzyme
  s.enz.forEach((e, i) => {
    move(e, 3);
    e.a += h * 0.6;
    // A fixed share of the enzymes is unfolded at this temperature (they bend out of shape)
    const dead = i / s.enz.length >= fold;
    e.bend += ((dead ? 1 : 0) - e.bend) * Math.min(1, h * 3);
    if (e.busy > 0) {
      e.busy -= h;
      if (e.busy <= 0) { s.made++; for (let k = 0; k < 2; k++) s.prod.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, age: 0 }); }
      return;
    }
    if (dead || !s.sub.length) return;
    // Bind a nearby substrate if the active site fits (pH changes its shape too)
    for (let k = 0; k < s.sub.length; k++) {
      const m = s.sub[k];
      if (Math.hypot(m.x - e.x, m.y - e.y) < 0.065 && Math.random() < phf) { s.sub.splice(k, 1); e.busy = 1 / turnover; break; }
    }
  });
  s.sub.forEach((m) => move(m, 4));
  s.prod.forEach((m) => { move(m, 5); m.age += h; });
  s.prod = s.prod.filter((m) => m.age < 4);
  s.t += h;
}

function enzymeShape(ctx: Ctx, x: number, y: number, r: number, a: number, bend: number, busy: boolean, t: SimTheme) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  // A blob with a notch (the active site). Denatured: the notch closes up and the shape warps
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const th = (i / 40) * TAU;
    const notch = Math.max(0, Math.cos(th)) ** 8 * (1 - bend);
    const warp = 1 + bend * 0.25 * Math.sin(th * 3 + a * 2);
    const rr = r * warp * (1 - 0.55 * notch);
    if (i) ctx.lineTo(Math.cos(th) * rr, Math.sin(th) * rr); else ctx.moveTo(Math.cos(th) * rr, Math.sin(th) * rr);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
  const base = bend > 0.5 ? "#94a3b8" : "#22c55e";
  g.addColorStop(0, bend > 0.5 ? "#e2e8f0" : "#bbf7d0"); g.addColorStop(1, base);
  ctx.fillStyle = g; ctx.fill();
  if (busy) { ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(r * 0.62, 0, r * 0.3, 0, TAU); ctx.fill(); }
  ctx.restore();
  void t;
}

function draw(ctx: Ctx, w: number, h: number, p: P, s: S, t: SimTheme) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, t.dark ? "#0b1324" : "#f1f5fb"); bg.addColorStop(1, t.dark ? "#050a16" : "#e2e8f2");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const wide = w > 640;
  const boxW = wide ? w * 0.55 : w - 32, boxH = wide ? h - 110 : h * 0.55;
  const bx = 16, by = 84;
  // Test tube contents
  const liquid = ctx.createLinearGradient(0, by, 0, by + boxH);
  liquid.addColorStop(0, t.dark ? "rgba(56,189,248,0.08)" : "rgba(14,165,233,0.06)"); liquid.addColorStop(1, t.dark ? "rgba(56,189,248,0.18)" : "rgba(14,165,233,0.14)");
  ctx.fillStyle = liquid; roundRect(ctx, bx, by, boxW, boxH, 18); ctx.fill();
  ctx.strokeStyle = t.grid; ctx.lineWidth = 1.5; ctx.stroke();
  const X = (u: number) => bx + u * boxW, Y = (v: number) => by + v * boxH;
  const er = Math.max(11, Math.min(20, boxW / 32));
  for (const m of s.sub) { ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(X(m.x), Y(m.y), er * 0.3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(X(m.x) + er * 0.42, Y(m.y), er * 0.3, 0, TAU); ctx.fill(); }
  for (const m of s.prod) { ctx.globalAlpha = Math.max(0, 1 - m.age / 4); ctx.fillStyle = "#f472b6"; ctx.beginPath(); ctx.arc(X(m.x), Y(m.y), er * 0.28, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  for (const e of s.enz) enzymeShape(ctx, X(e.x), Y(e.y), er, e.a, e.bend, e.busy > 0, t);
  label(ctx, `${ENZ[p.enz].sub} + enzyme → ${ENZ[p.enz].prod}`, bx + boxW / 2, by + boxH + 16, { color: t.mute, size: 11.5 });
  // Rate curve against the chosen variable
  const gx = wide ? bx + boxW + 40 : 50, gy = wide ? by + 10 : by + boxH + 50, gw = wide ? w - gx - 24 : w - 80, gh = wide ? h - by - 70 : h - gy - 40;
  const range = p.vary === "temp" ? [0, 100] : p.vary === "ph" ? [0, 14] : [0, 20];
  const f = (x: number) => rate({ ...p, [p.vary === "temp" ? "temp" : p.vary === "ph" ? "ph" : "sub"]: x } as P);
  let top = 0; for (let x = range[0]; x <= range[1]; x += (range[1] - range[0]) / 200) top = Math.max(top, f(x));
  const pl = new Plot(gx + 10, gy, gw - 10, gh, range[0], range[1], 0, Math.max(0.2, top * 1.2));
  pl.axes(ctx, t, { xLabel: p.vary === "temp" ? "temperature (°C)" : p.vary === "ph" ? "pH" : "substrate concentration", yLabel: "rate of reaction", xTicks: 5, yTicks: 4 });
  pl.fn(ctx, f, t.c.green, 3);
  const cur = p.vary === "temp" ? p.temp : p.vary === "ph" ? p.ph : p.sub;
  const now = rate(p, folded(p.enz, s.maxT));
  ctx.fillStyle = t.c.amber; ctx.beginPath(); ctx.arc(pl.X(cur), pl.Y(now), 7, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
  if (p.vary === "temp") label(ctx, "denatures", pl.X(Math.min(98, ENZ[p.enz].Tm + 6)), pl.Y(top * 0.5), { color: t.c.red, size: 11, weight: 700, align: "left", halo: true });
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  const p = { ...DEF, temp: 37, amount: 8 };
  const s = fresh(p);
  for (let i = 0; i < 200; i++) step(s, p, 0.02);
  draw(ctx, w * 1.5, h * 1.25, p, s, t);
}

export default function Enzymes() {
  const theme = useSimTheme();
  const [p, set] = useSimParams<P>(DEF, { enz: Object.keys(ENZ), temp: [0, 100], ph: [0, 14], sub: [0, 20], amount: [2, 24], vary: ["temp", "ph", "sub"] });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const sim = useRef<S>(fresh(p));
  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const s = sim.current;
    if (s.enz.length !== p.amount) sim.current = fresh(p);
    if (running) { const n = Math.max(1, Math.ceil((dt * speed) / 0.02)); for (let i = 0; i < n; i++) step(sim.current, p, (dt * speed) / n); }
    draw(ctx, w, h, p, sim.current, theme);
  };
  const live = useLive(() => ({ made: sim.current.made, t: sim.current.t, maxT: Math.max(sim.current.maxT, p.temp) }), 6);
  const active = folded(p.enz, live.maxT);
  const r = rate(p, active);
  const pk = peakT(p.enz);
  const challenges = [
    { id: "opt", title: "Find amylase's optimum temperature", detail: "Within 2 °C of the fastest rate, at its best pH.", done: p.enz === "amylase" && Math.abs(p.temp - pk.T) <= 2 && Math.abs(p.ph - 7) < 0.5 },
    { id: "dead", title: "Denature at least 90% of the enzyme", detail: "Watch the shapes change. Does cooling it down again help?", done: active <= 0.1 },
    { id: "pepsin", title: "Find the pH where pepsin works best", detail: "Within 0.5 of its optimum.", done: p.enz === "pepsin" && Math.abs(p.ph - 2) <= 0.5 },
    { id: "sat", title: "Add substrate until adding more barely helps", detail: "Get within 10% of the fastest possible rate at these conditions.", done: p.sub / (KM + p.sub) >= 0.9 },
  ];

  return (
    <SimShell
      id="enzymes"
      running={running}
      onRun={setRunning}
      speed={speed}
      onSpeed={setSpeed}
      onReset={() => { sim.current = fresh(p); }}
      challenges={challenges}
      record={() => ({ "temperature (°C)": p.temp, pH: p.ph, substrate: p.sub, enzyme: p.amount, "rate (relative)": +r.toFixed(4), "% active": +(active * 100).toFixed(1) })}
      ask={() => `Enzyme simulation: ${ENZ[p.enz].name} at ${p.temp} °C and pH ${p.ph}, substrate concentration ${p.sub}, ${p.amount} enzyme molecules. Relative rate ${fmt(r, 3)}; ${fmt(active * 100, 0)}% of the enzyme is still folded (the hottest it has been is ${fmt(live.maxT, 0)} °C). Its optimum pH is ${ENZ[p.enz].pH}.`}
      stage={<Stage label="Enzymes and substrate" render={render} />}
      overlay={
        <Readouts>
          <Readout label="rate" value={fmt(r, 3)} color={theme.c.green} />
          <Readout label="active enzyme" value={`${fmt(active * 100, 0)}%`} color={active < 0.5 ? theme.c.red : theme.c.green} />
          <Readout label="product made" value={String(live.made)} color="#f472b6" />
        </Readouts>
      }
      controls={
        <>
          <Group title="Enzyme">
            <Choice value={p.enz} onChange={(enz) => { set({ enz, ph: ENZ[enz].pH }); sim.current = fresh({ ...p, enz }); }} options={(Object.keys(ENZ) as Enz[]).map((k) => ({ value: k, label: ENZ[k].name.split(" (")[0] }))} />
            <p className="-mt-1 text-[12px] text-lp-mute">{ENZ[p.enz].name}: breaks down {ENZ[p.enz].sub}.</p>
          </Group>
          <Group title="Conditions">
            <Slider label="Temperature" value={p.temp} min={0} max={100} step={1} unit="°C" color={theme.c.red} onChange={(temp) => set({ temp })} hint="Denatured enzyme stays denatured. Reset (R) adds fresh enzyme." />
            <Slider label="pH" value={p.ph} min={0} max={14} step={0.1} color={theme.c.violet} onChange={(ph) => set({ ph })} />
            <Slider label="Substrate concentration" value={p.sub} min={0} max={20} step={0.5} color={theme.c.amber} onChange={(sub) => set({ sub })} />
            <Slider label="Enzyme molecules" value={p.amount} min={2} max={24} step={1} color={theme.c.green} onChange={(amount) => set({ amount })} />
          </Group>
          <Group title="Graph">
            <Choice label="Rate against" value={p.vary} onChange={(vary) => set({ vary })} options={[{ value: "temp", label: "Temperature" }, { value: "ph", label: "pH" }, { value: "sub", label: "Substrate" }]} />
          </Group>
        </>
      }
      learn={
        <>
          <H>Lock and key (and induced fit)</H>
          <p>An enzyme is a protein folded into a precise shape. Its active site fits its substrate, which binds to form an enzyme–substrate complex; the reaction happens, the products leave, and the enzyme is free to work again. It isn't used up.</p>
          <H>Temperature</H>
          <p>Warmer means faster-moving molecules and more frequent, more energetic collisions, so the rate rises (roughly doubling every 10 °C). Too hot, and the bonds holding the protein's shape break: it denatures, the active site no longer fits, and activity falls fast. Denaturing is permanent.</p>
          <H>pH</H>
          <p>Each enzyme has an optimum pH. Away from it, charges in the active site change, the substrate fits less well, and an extreme pH can denature it. Pepsin works in the acid stomach (about pH 2); amylase in saliva and the small intestine (about pH 7).</p>
          <H>Substrate concentration</H>
          <Eq>rate = V_max × [S] ⁄ (K_m + [S])</Eq>
          <p>More substrate means more collisions, until every active site is busy: then the enzyme is saturated and only more enzyme will speed things up.</p>
          <Try>heat amylase to 70 °C, then cool it back to 37 °C. Does the rate come back? Why not?</Try>
        </>
      }
    />
  );
}
