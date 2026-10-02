import React, { useRef } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Switch, Btn } from "../kit/controls";
import { Plot, label, roundRect, fmt, type Ctx } from "../kit/draw";

// A competitive market with linear demand and supply. Shocks shift the curves
// (smoothly), and the government can tax, subsidise or fix prices.

type P = { dShift: number; sShift: number; tax: number; sub: number; ceil: boolean; ceilP: number; floor: boolean; floorP: number; welfare: boolean; event: string };
const DEF: P = { dShift: 0, sShift: 0, tax: 0, sub: 0, ceil: false, ceilP: 8, floor: false, floorP: 12, welfare: true, event: "" };

// Inverse curves: price as a function of quantity (thousands per week)
const D0 = { top: 20, slope: 0.1 }, S0 = { base: 2, slope: 0.08 };
const demandP = (q: number, shift: number) => D0.top - D0.slope * (q - shift);
const supplyP = (q: number, shift: number) => S0.base + S0.slope * (q - shift);
const demandQ = (p: number, shift: number) => (D0.top - p) / D0.slope + shift;
const supplyQ = (p: number, shift: number) => (p - S0.base) / S0.slope + shift;

export function solve(p: P, ds = p.dShift, ss = p.sShift) {
  const wedge = p.tax - p.sub; // what the government adds to the supply price
  const dTop = demandP(0, ds), sBase = supplyP(0, ss);
  const k = D0.slope + S0.slope;
  // Free market, and with the tax/subsidy wedge: demand price = supply price + wedge
  const Qe = Math.max(0, (dTop - sBase) / k);
  let Q = Math.max(0, (dTop - sBase - wedge) / k);
  let Pc = demandP(Q, ds), Pp = Pc - wedge;
  let shortage = 0, surplus = 0;
  if (p.ceil && p.ceilP < Pc) {
    Pc = p.ceilP; Pp = Pc - wedge;
    const qd = Math.max(0, demandQ(Pc, ds)), qs = Math.max(0, supplyQ(Pp, ss));
    shortage = Math.max(0, qd - qs); Q = Math.min(qd, qs);
  }
  if (p.floor && p.floorP > Pc) {
    Pc = p.floorP; Pp = Pc - wedge;
    const qd = Math.max(0, demandQ(Pc, ds)), qs = Math.max(0, supplyQ(Pp, ss));
    surplus = Math.max(0, qs - qd); Q = Math.min(qd, qs);
  }
  // Areas between straight lines, from 0 to Q
  const cs = (dTop - Pc) * Q - (D0.slope * Q * Q) / 2;
  const ps = (Pp - sBase) * Q - (S0.slope * Q * Q) / 2;
  const total = (q: number) => (dTop - sBase) * q - (k * q * q) / 2;
  const revenue = wedge * Q;
  const dwl = Math.max(0, total(Qe) - total(Q));
  return { Q, Pc, Pp, shortage, surplus, cs: Math.max(0, cs), ps: Math.max(0, ps), revenue, dwl, Qe, Pe: demandP(Qe, ds) };
}

const EVENTS: { id: string; label: string; text: string; d?: number; s?: number }[] = [
  { id: "income", label: "Incomes rise", text: "Wages are up across the country. Coffee is a normal good, so people buy more at every price.", d: 25 },
  { id: "health", label: "Health scare", text: "A widely shared study links coffee to poor sleep. Demand falls at every price.", d: -25 },
  { id: "tea", label: "Tea gets cheaper", text: "Tea, a substitute, falls in price. Some coffee drinkers switch.", d: -15 },
  { id: "frost", label: "Frost hits Brazil", text: "A frost destroys part of the harvest. Less is supplied at every price.", s: -30 },
  { id: "tech", label: "Better roasting machines", text: "New technology cuts costs, so firms supply more at every price.", s: 25 },
  { id: "wages", label: "Pickers' wages rise", text: "Higher costs of production: supply falls.", s: -18 },
];

type Anim = { d: number; s: number };

function draw(ctx: Ctx, w: number, h: number, p: P, a: Anim, t: SimTheme) {
  ctx.fillStyle = t.dark ? "#08101f" : "#fbfcfe"; ctx.fillRect(0, 0, w, h);
  const pl = new Plot(64, 84, w - 100, h - 140, 0, 260, 0, 24);
  pl.axes(ctx, t, { xLabel: "quantity (thousand kg a week)", yLabel: "price ($ per kg)", xTicks: 6, yTicks: 6 });
  const r = solve(p, a.d, a.s);
  const wedge = p.tax - p.sub;
  // Welfare areas
  if (p.welfare && r.Q > 0) {
    const poly = (pts: [number, number][], col: string) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(pl.X(x), pl.Y(y)) : ctx.moveTo(pl.X(x), pl.Y(y)))); ctx.closePath(); ctx.fill(); };
    poly([[0, demandP(0, a.d)], [r.Q, demandP(r.Q, a.d)], [r.Q, r.Pc], [0, r.Pc]], t.dark ? "rgba(96,165,250,0.28)" : "rgba(37,99,235,0.18)");
    poly([[0, r.Pp], [r.Q, r.Pp], [r.Q, supplyP(r.Q, a.s)], [0, supplyP(0, a.s)]], t.dark ? "rgba(251,146,60,0.28)" : "rgba(234,88,12,0.18)");
    if (Math.abs(wedge) > 1e-9) poly([[0, r.Pc], [r.Q, r.Pc], [r.Q, r.Pp], [0, r.Pp]], wedge > 0 ? (t.dark ? "rgba(52,211,153,0.3)" : "rgba(5,150,105,0.2)") : (t.dark ? "rgba(244,114,182,0.25)" : "rgba(219,39,119,0.15)"));
    if (r.dwl > 0.01) {
      // Between the quantity traded and the free-market quantity, under demand and over supply
      poly([[r.Q, demandP(r.Q, a.d)], [r.Q, supplyP(r.Q, a.s)], [r.Qe, r.Pe]], t.dark ? "rgba(248,113,113,0.45)" : "rgba(220,38,38,0.3)");
      label(ctx, "deadweight loss", pl.X((r.Q + r.Qe) / 2) + 26, pl.Y(r.Pe), { color: t.c.red, size: 11, weight: 700, halo: true, align: "left" });
    }
    label(ctx, "consumer surplus", pl.X(r.Q * 0.25), pl.Y((demandP(0, a.d) + r.Pc) / 2 + 0.6), { color: t.c.blue, size: 11, weight: 700, halo: true });
    label(ctx, "producer surplus", pl.X(r.Q * 0.25), pl.Y((r.Pp + supplyP(0, a.s)) / 2 - 0.4), { color: t.c.orange, size: 11, weight: 700, halo: true });
  }
  // Original curves (faint) and current ones
  if (Math.abs(a.d) > 0.5) pl.fn(ctx, (q) => demandP(q, 0), t.c.blue, 1.5, [5, 5]);
  if (Math.abs(a.s) > 0.5 || Math.abs(wedge) > 1e-9) pl.fn(ctx, (q) => supplyP(q, 0), t.c.orange, 1.5, [5, 5]);
  pl.fn(ctx, (q) => demandP(q, a.d), t.c.blue, 3.2);
  pl.fn(ctx, (q) => supplyP(q, a.s), t.c.orange, 3.2);
  if (Math.abs(wedge) > 1e-9) { pl.fn(ctx, (q) => supplyP(q, a.s) + wedge, t.c.green, 2.6); label(ctx, wedge > 0 ? "S + tax" : "S − subsidy", pl.X(225), pl.Y(supplyP(225, a.s) + wedge) - 12, { color: t.c.green, size: 12, weight: 700, halo: true }); }
  label(ctx, "D", pl.X(Math.min(250, demandQ(1.5, a.d))), pl.Y(1.5) - 12, { color: t.c.blue, size: 15, weight: 800, halo: true });
  label(ctx, "S", pl.X(Math.min(240, supplyQ(22.5, a.s))) + 12, pl.Y(Math.min(22.5, supplyP(240, a.s))), { color: t.c.orange, size: 15, weight: 800, halo: true });
  // Price controls
  const ctrl = (price: number, col: string, text: string) => { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(pl.x0, pl.Y(price)); ctx.lineTo(pl.x0 + pl.w, pl.Y(price)); ctx.stroke(); label(ctx, text, pl.x0 + pl.w - 4, pl.Y(price) - 11, { color: col, size: 12, weight: 700, align: "right", halo: true }); };
  if (p.ceil) ctrl(p.ceilP, t.c.violet, `maximum price $${fmt(p.ceilP, 2)}`);
  if (p.floor) ctrl(p.floorP, t.c.pink, `minimum price $${fmt(p.floorP, 2)}`);
  if (r.shortage > 0.01 || r.surplus > 0.01) {
    const q1 = r.shortage > 0 ? supplyQ(r.Pc - wedge, a.s) : demandQ(r.Pc, a.d), q2 = r.shortage > 0 ? demandQ(r.Pc, a.d) : supplyQ(r.Pc - wedge, a.s);
    const y = pl.Y(r.Pc) + 22;
    ctx.strokeStyle = t.c.red; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pl.X(q1), y - 6); ctx.lineTo(pl.X(q1), y + 6); ctx.moveTo(pl.X(q1), y); ctx.lineTo(pl.X(q2), y); ctx.moveTo(pl.X(q2), y - 6); ctx.lineTo(pl.X(q2), y + 6); ctx.stroke();
    label(ctx, `${r.shortage > 0 ? "shortage" : "surplus"} ${fmt(r.shortage || r.surplus, 1)}k`, pl.X((q1 + q2) / 2), y + 14, { color: t.c.red, size: 12, weight: 700, halo: true });
  }
  // Equilibrium
  ctx.strokeStyle = t.mute; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(pl.X(r.Q), pl.Y(0)); ctx.lineTo(pl.X(r.Q), pl.Y(r.Pc)); ctx.lineTo(pl.x0, pl.Y(r.Pc)); ctx.stroke();
  if (Math.abs(wedge) > 1e-9) { ctx.beginPath(); ctx.moveTo(pl.X(r.Q), pl.Y(r.Pp)); ctx.lineTo(pl.x0, pl.Y(r.Pp)); ctx.stroke(); }
  ctx.setLineDash([]);
  const g = ctx.createRadialGradient(pl.X(r.Q), pl.Y(r.Pc), 0, pl.X(r.Q), pl.Y(r.Pc), 22);
  g.addColorStop(0, "rgba(255,255,255,0.6)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pl.X(r.Q), pl.Y(r.Pc), 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = t.ink; ctx.beginPath(); ctx.arc(pl.X(r.Q), pl.Y(r.Pc), 6, 0, Math.PI * 2); ctx.fill();
  label(ctx, `$${fmt(r.Pc, 2)}`, pl.x0 - 8, pl.Y(r.Pc), { color: t.ink, size: 11.5, weight: 700, align: "right", halo: true });
  label(ctx, `${fmt(r.Q, 1)}k`, pl.X(r.Q), pl.Y(0) + 26, { color: t.ink, size: 11.5, weight: 700, halo: true });
  // News headline
  const ev = EVENTS.find((e) => e.id === p.event);
  if (ev) {
    const bw = Math.min(420, w - 120);
    ctx.fillStyle = t.panel; roundRect(ctx, w - bw - 18, 16, bw, 54, 12); ctx.fill();
    label(ctx, `NEWS · ${ev.label}`, w - bw - 4, 32, { color: t.c.amber, size: 11, weight: 800, align: "left" });
    label(ctx, ev.text.length > 70 ? ev.text.slice(0, 68) + "…" : ev.text, w - bw - 4, 52, { color: t.soft, size: 11.5, align: "left" });
  }
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  draw(ctx, w * 1.15, h * 1.2, { ...DEF, tax: 3, event: "" }, { d: 0, s: 0 }, t);
}

export default function Market() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { dShift: [-60, 60], sShift: [-60, 60], tax: [0, 8], sub: [0, 8], ceilP: [1, 24], floorP: [1, 24], event: ["", ...EVENTS.map((e) => e.id)] });
  const anim = useRef<Anim>({ d: p.dShift, s: p.sShift });
  const render = (ctx: Ctx, w: number, h: number, dt: number) => {
    const k = Math.min(1, dt * 5);
    anim.current.d += (p.dShift - anim.current.d) * k;
    anim.current.s += (p.sShift - anim.current.s) * k;
    draw(ctx, w, h, p, anim.current, theme);
  };
  const r = solve(p);
  const challenges = [
    { id: "price", title: "Raise the market price to $12 or more by shifting demand only", detail: "No supply changes, no government.", done: p.sShift === 0 && p.tax === 0 && p.sub === 0 && !p.ceil && !p.floor && r.Pc >= 12 },
    { id: "tax", title: "Put a $3 tax on each kg. Who pays more of it?", detail: "Compare how far the price buyers pay rises with how far sellers' price falls.", done: p.tax === 3 && p.sub === 0 },
    { id: "short", title: "Create a shortage of at least 30 thousand kg with a maximum price", detail: "A ceiling only matters below the equilibrium price.", done: p.ceil && r.shortage >= 30 },
    { id: "cheap", title: "Make the price fall and the quantity rise", detail: "Which curve has to move, and which way?", done: r.Pc < 9.9 && r.Q > 100.5 && p.tax === 0 && p.sub === 0 && !p.ceil && !p.floor },
  ];
  const ev = EVENTS.find((e) => e.id === p.event);

  return (
    <SimShell
      id="market"
      challenges={challenges}
      onReset={() => resetP()}
      record={() => ({ "demand shift": p.dShift, "supply shift": p.sShift, "tax ($)": p.tax, "subsidy ($)": p.sub, "price paid ($)": +r.Pc.toFixed(3), "price received ($)": +r.Pp.toFixed(3), "quantity (k)": +r.Q.toFixed(2), "CS ($k)": +r.cs.toFixed(1), "PS ($k)": +r.ps.toFixed(1), "DWL ($k)": +r.dwl.toFixed(1) })}
      ask={() => `Coffee market: demand shifted by ${p.dShift}k, supply shifted by ${p.sShift}k${ev ? ` (event: ${ev.label})` : ""}; tax $${p.tax}/kg, subsidy $${p.sub}/kg${p.ceil ? `, maximum price $${p.ceilP}` : ""}${p.floor ? `, minimum price $${p.floorP}` : ""}. Outcome: buyers pay $${fmt(r.Pc, 2)}, sellers get $${fmt(r.Pp, 2)}, quantity ${fmt(r.Q, 1)}k${r.shortage ? `, shortage ${fmt(r.shortage, 1)}k` : ""}${r.surplus ? `, surplus ${fmt(r.surplus, 1)}k` : ""}. Consumer surplus $${fmt(r.cs, 0)}k, producer surplus $${fmt(r.ps, 0)}k, deadweight loss $${fmt(r.dwl, 0)}k.`}
      stage={<Stage label="Supply and demand diagram" render={render} />}
      overlay={
        <Readouts>
          <Readout label="price buyers pay" value={`$${fmt(r.Pc, 2)}`} color={theme.c.blue} />
          {Math.abs(p.tax - p.sub) > 1e-9 && <Readout label="price sellers get" value={`$${fmt(r.Pp, 2)}`} color={theme.c.orange} />}
          <Readout label="quantity" value={`${fmt(r.Q, 1)}k`} />
          {p.tax > 0 && <Readout label="tax revenue" value={`$${fmt(r.revenue, 0)}k`} color={theme.c.green} />}
          {p.sub > 0 && <Readout label="subsidy cost" value={`$${fmt(-r.revenue, 0)}k`} color={theme.c.pink} />}
          {r.dwl > 0.05 && <Readout label="deadweight loss" value={`$${fmt(r.dwl, 0)}k`} color={theme.c.red} />}
        </Readouts>
      }
      controls={
        <>
          <Group title="News: what just happened?">
            <div className="grid grid-cols-2 gap-1.5">
              {EVENTS.map((e) => <Btn key={e.id} className={p.event === e.id ? "border-lp-sky/60 bg-lp-blue/15 text-white" : ""} onClick={() => set({ event: e.id, dShift: e.d !== undefined ? Math.max(-60, Math.min(60, p.dShift + e.d)) : p.dShift, sShift: e.s !== undefined ? Math.max(-60, Math.min(60, p.sShift + e.s)) : p.sShift })}>{e.label}</Btn>)}
            </div>
            <p className="text-[11.5px] text-lp-mute">Each one shifts a curve. Predict which way before you click.</p>
          </Group>
          <Group title="Shift the curves">
            <Slider label="Demand" value={p.dShift} min={-60} max={60} step={1} unit="k" color={theme.c.blue} onChange={(dShift) => set({ dShift, event: "" })} hint="Right = more wanted at every price." />
            <Slider label="Supply" value={p.sShift} min={-60} max={60} step={1} unit="k" color={theme.c.orange} onChange={(sShift) => set({ sShift, event: "" })} />
          </Group>
          <Group title="Government">
            <Slider label="Tax per kg" value={p.tax} min={0} max={8} step={0.5} unit="$" color={theme.c.green} onChange={(tax) => set({ tax })} />
            <Slider label="Subsidy per kg" value={p.sub} min={0} max={8} step={0.5} unit="$" color={theme.c.pink} onChange={(sub) => set({ sub })} />
            <Switch label="Maximum price (ceiling)" color={theme.c.violet} checked={p.ceil} onChange={(ceil) => set({ ceil })} />
            {p.ceil && <Slider label="Ceiling" value={p.ceilP} min={1} max={24} step={0.5} unit="$" onChange={(ceilP) => set({ ceilP })} />}
            <Switch label="Minimum price (floor)" color={theme.c.pink} checked={p.floor} onChange={(floor) => set({ floor })} />
            {p.floor && <Slider label="Floor" value={p.floorP} min={1} max={24} step={0.5} unit="$" onChange={(floorP) => set({ floorP })} />}
            <Switch label="Show surplus areas" checked={p.welfare} onChange={(welfare) => set({ welfare })} />
          </Group>
        </>
      }
      learn={
        <>
          <H>Demand and supply</H>
          <p>Demand slopes down: at lower prices people want more. Supply slopes up: at higher prices firms want to sell more. Where they cross is the equilibrium: the price at which the amount people want equals the amount firms offer.</p>
          <H>Moving along versus shifting</H>
          <p>A change in the good's own price moves along a curve. Anything else shifts the whole curve: for demand, incomes, tastes, prices of substitutes and complements, expectations; for supply, costs of production, technology, the number of firms, weather, taxes and subsidies.</p>
          <H>Taxes and subsidies</H>
          <p>A tax per unit shifts supply up by the tax. Buyers pay more, sellers receive less, and less is traded. The burden falls more on whichever side is less responsive (more inelastic). The government's revenue is the tax × quantity; the deadweight loss is the trade that no longer happens.</p>
          <H>Price controls</H>
          <p>A maximum price below equilibrium causes a shortage (queues, rationing, black markets). A minimum price above equilibrium causes a surplus.</p>
          <Eq>consumer surplus + producer surplus + tax revenue + DWL = the original total surplus</Eq>
          <Try>predict what happens to price and quantity if demand and supply both shift right. Is the price change certain? Is the quantity change?</Try>
        </>
      }
    />
  );
}
