import React from "react";
import { nice } from "../mathExpr";
import { GRID, INK, MUTE, SOFT, Svg, T, type Pt } from "./svg";

/* ================= Supply and demand (also AD/AS) ================= */

export type SupplyDemandSpec = {
  kind: "supplydemand";
  names?: { D?: string; S?: string };
  xLabel?: string;
  yLabel?: string;
  shifts?: { curve: "D" | "S"; dir: "left" | "right" | "up" | "down"; label?: string }[];
  /** per-unit tax (in price units, 0-4 works well) or subsidy, applied to supply */
  tax?: number;
  subsidy?: number;
  /** price control level on a 0-10 price scale */
  ceiling?: number;
  floor?: number;
  shade?: ("CS" | "PS" | "DWL" | "tax" | "subsidy")[];
  labelEquilibria?: boolean;
};

export const SupplyDemandFigure: React.FC<{ spec: SupplyDemandSpec; accent: string }> = ({ spec, accent }) => {
  const W = 440;
  const legendRows = Math.ceil((spec.shade?.length ?? 0) / 2);
  const H = 360 + legendRows * 18;
  const pad = { l: 58, r: 40, t: 22, b: 48 };
  const X = (q: number) => pad.l + (q / 10) * (W - pad.l - pad.r);
  const Y = (p: number) => 360 - pad.b - (p / 10) * (360 - pad.t - pad.b);
  // Linear curves: demand P = a - 0.8Q, supply P = c + 0.8Q
  let dA = 9;
  let sC = 1;
  const shiftAmt = 1.6;
  const dName = spec.names?.D ?? "D";
  const sName = spec.names?.S ?? "S";
  const baseD = { a: dA, name: dName };
  const baseS = { c: sC, name: sName };
  const extraD: { a: number; name: string }[] = [];
  const extraS: { c: number; name: string }[] = [];
  for (const sh of spec.shifts ?? []) {
    const outward = sh.dir === "right" || sh.dir === "up";
    if (sh.curve === "D") {
      dA = dA + (outward ? shiftAmt : -shiftAmt);
      extraD.push({ a: dA, name: sh.label ?? `${dName}${extraD.length + 2}` });
    } else {
      // for supply, "right"/"down" is an increase
      const increase = sh.dir === "right" || sh.dir === "down";
      sC = sC + (increase ? -shiftAmt : shiftAmt);
      extraS.push({ c: sC, name: sh.label ?? `${sName}${extraS.length + 2}` });
    }
  }
  const eq = (a: number, c: number) => {
    const q = (a - c) / 1.6;
    return { q, p: a - 0.8 * q };
  };
  const e1 = eq(baseD.a, baseS.c);
  const lastD = extraD.length ? extraD[extraD.length - 1].a : baseD.a;
  const lastS = extraS.length ? extraS[extraS.length - 1].c : baseS.c;
  const e2 = extraD.length || extraS.length ? eq(lastD, lastS) : null;

  const dLine = (a: number) => {
    const q1 = Math.max(0, (a - 10) / 0.8);
    const q2 = Math.min(10, a / 0.8);
    return [
      [X(q1), Y(a - 0.8 * q1)],
      [X(q2), Y(a - 0.8 * q2)],
    ] as Pt[];
  };
  const sLine = (c: number) => {
    const q1 = Math.max(0, -c / 0.8);
    const q2 = Math.min(10, (10 - c) / 0.8);
    return [
      [X(q1), Y(c + 0.8 * q1)],
      [X(q2), Y(c + 0.8 * q2)],
    ] as Pt[];
  };
  const shades: React.ReactNode[] = [];
  const poly = (pts: Pt[], color: string, key: string) => <polygon key={key} points={pts.map((p) => p.join(",")).join(" ")} fill={color} opacity={0.28} />;
  const E = e2 ?? e1;
  const Dnow = lastD;
  const Snow = lastS;
  const tax = spec.tax ?? 0;
  const sub = spec.subsidy ?? 0;
  let taxEq: { q: number; p: number } | null = null;
  if (tax > 0) taxEq = eq(Dnow, Snow + tax);
  if (sub > 0) taxEq = eq(Dnow, Snow - sub);
  const want = new Set(spec.shade ?? []);
  if (want.has("CS")) {
    const e = taxEq ?? E;
    shades.push(poly([[X(0), Y(Dnow)], [X(0), Y(e.p)], [X(e.q), Y(e.p)]], "#3B82F6", "cs"));
  }
  if (want.has("PS")) {
    const e = taxEq ?? E;
    const pProd = tax > 0 ? e.p - tax : sub > 0 ? e.p + sub : e.p;
    shades.push(poly([[X(0), Y(Math.max(0, Snow))], [X(0), Y(pProd)], [X(e.q), Y(pProd)]], "#10B981", "ps"));
  }
  if (want.has("tax") && taxEq && tax > 0) {
    shades.push(poly([[X(0), Y(taxEq.p)], [X(taxEq.q), Y(taxEq.p)], [X(taxEq.q), Y(taxEq.p - tax)], [X(0), Y(taxEq.p - tax)]], "#F59E0B", "tax"));
  }
  if (want.has("subsidy") && taxEq && sub > 0) {
    shades.push(poly([[X(0), Y(taxEq.p + sub)], [X(taxEq.q), Y(taxEq.p + sub)], [X(taxEq.q), Y(taxEq.p)], [X(0), Y(taxEq.p)]], "#F59E0B", "sub"));
  }
  if (want.has("DWL") && taxEq) {
    const pS = tax > 0 ? taxEq.p - tax : taxEq.p + sub;
    shades.push(poly([[X(taxEq.q), Y(taxEq.p)], [X(E.q), Y(E.p)], [X(taxEq.q), Y(pS)]], "#EF4444", "dwl"));
  }
  const guide = (e: { q: number; p: number }, pl: string, ql: string, key: string) => (
    <g key={key}>
      <polyline points={`${X(0)},${Y(e.p)} ${X(e.q)},${Y(e.p)} ${X(e.q)},${Y(0)}`} fill="none" stroke={SOFT} strokeWidth={1.1} strokeDasharray="4 4" />
      <circle cx={X(e.q)} cy={Y(e.p)} r={3.5} fill={INK} />
      <T x={X(0) - 8} y={Y(e.p)} size={12} anchor="end" weight={600}>
        {pl}
      </T>
      <T x={X(e.q)} y={Y(0) + 14} size={12} weight={600}>
        {ql}
      </T>
    </g>
  );
  const lineEl = (pts: Pt[], color: string, name: string, key: string, dashed = false) => (
    <g key={key}>
      <line x1={pts[0][0]} y1={pts[0][1]} x2={pts[1][0]} y2={pts[1][1]} stroke={color} strokeWidth={2.2} strokeDasharray={dashed ? "7 5" : undefined} />
      <T x={pts[1][0] + 6} y={pts[1][1]} size={12.5} anchor="start" color={color} weight={700}>
        {name}
      </T>
    </g>
  );
  const labelEq = spec.labelEquilibria !== false;
  return (
    <Svg w={W} h={H} title="Supply and demand diagram">
      {shades}
      <line x1={X(0)} y1={Y(0)} x2={X(10) + 12} y2={Y(0)} stroke={INK} strokeWidth={1.6} markerEnd="url(#arrow)" />
      <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(10) - 10} stroke={INK} strokeWidth={1.6} markerEnd="url(#arrow)" />
      <T x={X(10)} y={360 - 12} size={12} anchor="end" color={SOFT}>
        {spec.xLabel ?? "Quantity"}
      </T>
      <T x={X(0) + 6} y={pad.t - 8} size={12} anchor="start" color={SOFT}>
        {spec.yLabel ?? "Price"}
      </T>
      {lineEl(dLine(baseD.a), accent, baseD.name, "d1")}
      {lineEl(sLine(baseS.c), "#DC2626", baseS.name, "s1")}
      {extraD.map((d, i) => lineEl(dLine(d.a), accent, d.name, `dx${i}`, true))}
      {extraS.map((s, i) => lineEl(sLine(s.c), "#DC2626", s.name, `sx${i}`, true))}
      {tax > 0 && lineEl(sLine(Snow + tax), "#7C3AED", `${sName} + tax`, "tax")}
      {sub > 0 && lineEl(sLine(Snow - sub), "#7C3AED", `${sName} + subsidy`, "sub")}
      {labelEq && guide(e1, "P₁", "Q₁", "g1")}
      {labelEq && e2 && guide(e2, "P₂", "Q₂", "g2")}
      {labelEq && taxEq && !e2 && guide(taxEq, tax > 0 ? "Pc" : "Pc", "Q₂", "g3")}
      {labelEq && taxEq && tax > 0 && (
        <g>
          <line x1={X(0)} y1={Y(taxEq.p - tax)} x2={X(taxEq.q)} y2={Y(taxEq.p - tax)} stroke={SOFT} strokeWidth={1.1} strokeDasharray="4 4" />
          <T x={X(0) - 8} y={Y(taxEq.p - tax)} size={12} anchor="end" weight={600}>
            Pp
          </T>
        </g>
      )}
      {spec.ceiling !== undefined && (
        <g>
          <line x1={X(0)} y1={Y(spec.ceiling)} x2={X(10)} y2={Y(spec.ceiling)} stroke="#0F766E" strokeWidth={2} />
          <T x={X(10)} y={Y(spec.ceiling) - 12} size={12} anchor="end" color="#7C3AED" weight={700}>
            Price ceiling
          </T>
          {spec.ceiling < E.p && (
            <g>
              <line x1={X((spec.ceiling - Snow) / 0.8)} y1={Y(spec.ceiling) + 18} x2={X((Dnow - spec.ceiling) / 0.8)} y2={Y(spec.ceiling) + 18} stroke="#7C3AED" strokeWidth={1.3} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
              <T x={(X((spec.ceiling - Snow) / 0.8) + X((Dnow - spec.ceiling) / 0.8)) / 2} y={Y(spec.ceiling) + 32} size={11.5} color="#7C3AED">
                Shortage
              </T>
            </g>
          )}
        </g>
      )}
      {spec.floor !== undefined && (
        <g>
          <line x1={X(0)} y1={Y(spec.floor)} x2={X(10)} y2={Y(spec.floor)} stroke="#7C3AED" strokeWidth={2} />
          <T x={X(10)} y={Y(spec.floor) - 12} size={12} anchor="end" color="#7C3AED" weight={700}>
            Price floor
          </T>
          {spec.floor > E.p && (
            <g>
              <line x1={X((Dnow - spec.floor) / 0.8)} y1={Y(spec.floor) - 26} x2={X((spec.floor - Snow) / 0.8)} y2={Y(spec.floor) - 26} stroke="#7C3AED" strokeWidth={1.3} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
              <T x={(X((Dnow - spec.floor) / 0.8) + X((spec.floor - Snow) / 0.8)) / 2} y={Y(spec.floor) - 38} size={11.5} color="#7C3AED">
                Surplus
              </T>
            </g>
          )}
        </g>
      )}
      {want.size > 0 && (
        <g>
          {[...want].map((k, i) => {
            const col = k === "CS" ? "#3B82F6" : k === "PS" ? "#10B981" : k === "DWL" ? "#EF4444" : "#F59E0B";
            const name = k === "CS" ? "Consumer surplus" : k === "PS" ? "Producer surplus" : k === "DWL" ? "Deadweight loss" : k === "tax" ? "Tax revenue" : "Subsidy cost";
            return (
              <g key={k}>
                <rect x={pad.l + (i % 2) * 170} y={362 + Math.floor(i / 2) * 18} width={10} height={10} fill={col} opacity={0.45} />
                <T x={pad.l + 16 + (i % 2) * 170} y={367 + Math.floor(i / 2) * 18} size={11} anchor="start" color={SOFT}>
                  {name}
                </T>
              </g>
            );
          })}
        </g>
      )}
    </Svg>
  );
};

/* ================= Production possibility curve ================= */

export type PpcSpec = {
  kind: "ppc";
  xLabel?: string;
  yLabel?: string;
  points?: { label: string; pos: "on" | "inside" | "outside"; t?: number }[];
  shift?: "out" | "in";
  linear?: boolean;
};

export const PpcFigure: React.FC<{ spec: PpcSpec; accent: string }> = ({ spec, accent }) => {
  const W = 420;
  const H = 340;
  const pad = { l: 50, r: 30, t: 24, b: 44 };
  const X = (v: number) => pad.l + v * (W - pad.l - pad.r);
  const Y = (v: number) => H - pad.b - v * (H - pad.t - pad.b);
  const curve = (r: number) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 60; i++) {
      const th = (i / 60) * (Math.PI / 2);
      const x = spec.linear ? (i / 60) * r : r * Math.sin(th);
      const y = spec.linear ? r - (i / 60) * r : r * Math.cos(th);
      pts.push([X(x), Y(y)]);
    }
    return pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  };
  const at = (r: number, t: number): Pt => (spec.linear ? [X(t * r), Y(r - t * r)] : [X(r * Math.sin(t * (Math.PI / 2))), Y(r * Math.cos(t * (Math.PI / 2)))]);
  const r1 = 0.72;
  const r2 = spec.shift === "out" ? 0.9 : spec.shift === "in" ? 0.55 : null;
  return (
    <Svg w={W} h={H} title="Production possibility curve">
      <line x1={X(0)} y1={Y(0)} x2={X(1) + 8} y2={Y(0)} stroke={INK} strokeWidth={1.6} markerEnd="url(#arrow)" />
      <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(1) - 8} stroke={INK} strokeWidth={1.6} markerEnd="url(#arrow)" />
      <path d={`${curve(r1)} L${X(0)} ${Y(0)} Z`} fill={`${accent}10`} stroke="none" />
      <path d={curve(r1)} fill="none" stroke={accent} strokeWidth={2.4} />
      <T x={at(r1, 0.5)[0] + 26} y={at(r1, 0.5)[1] - 8} size={12.5} color={accent} weight={700} anchor="start">
        PPC₁
      </T>
      {r2 && (
        <g>
          <path d={curve(r2)} fill="none" stroke="#DC2626" strokeWidth={2.2} strokeDasharray="7 5" />
          <T x={at(r2, 0.5)[0] + 22} y={at(r2, 0.5)[1] - 6} size={12.5} color="#DC2626" weight={700} anchor="start">
            PPC₂
          </T>
        </g>
      )}
      {(spec.points ?? []).map((p, i) => {
        const t = p.t ?? 0.25 + i * 0.22;
        const r = p.pos === "on" ? r1 : p.pos === "inside" ? r1 * 0.62 : r1 * 1.22;
        const q = at(r, Math.min(0.95, Math.max(0.05, t)));
        return (
          <g key={i}>
            <circle cx={q[0]} cy={q[1]} r={4.5} fill={INK} />
            <T x={q[0] + 10} y={q[1] - 10} size={12.5} anchor="start" weight={700}>
              {p.label}
            </T>
          </g>
        );
      })}
      <T x={X(1)} y={H - 14} size={12} anchor="end" color={SOFT}>
        {spec.xLabel ?? "Good X"}
      </T>
      <T x={X(0) + 6} y={pad.t - 10} size={12} anchor="start" color={SOFT}>
        {spec.yLabel ?? "Good Y"}
      </T>
    </Svg>
  );
};

/* ================= Charts ================= */

export type ChartSpec = {
  kind: "chart";
  type?: "bar" | "line" | "pie";
  labels: string[];
  series: { name: string; values: number[] }[];
  xLabel?: string;
  yLabel?: string;
  /** empty axes for students to plot the data themselves */
  blank?: boolean;
};

const PALETTE = ["#2563EB", "#DC2626", "#059669", "#D97706", "#7C3AED", "#0891B2"];

const niceMax = (v: number) => {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
};

export const ChartFigure: React.FC<{ spec: ChartSpec; accent: string }> = ({ spec, accent }) => {
  const W = 460;
  const H = 320;
  const labels = spec.labels ?? [];
  const series = (spec.series ?? []).map((s) => ({ ...s, values: s.values.map(Number) }));
  const colors = [accent, ...PALETTE.filter((c) => c !== accent)];
  if (spec.type === "pie") {
    const vals = series[0]?.values ?? [];
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = 150;
    const cy = H / 2;
    const r = 110;
    let a0 = -Math.PI / 2;
    return (
      <Svg w={W} h={H} title="Pie chart">
        {vals.map((v, i) => {
          const a1 = a0 + (v / total) * Math.PI * 2;
          const p0: Pt = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
          const p1: Pt = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const midA = (a0 + a1) / 2;
          const el = (
            <g key={i}>
              <path d={`M${cx} ${cy} L${p0[0]} ${p0[1]} A${r} ${r} 0 ${large} 1 ${p1[0]} ${p1[1]} Z`} fill={spec.blank ? "#FFFFFF" : colors[i % colors.length]} stroke="#FFFFFF" strokeWidth={2} />
              {!spec.blank && v / total > 0.06 && (
                <T x={cx + r * 0.62 * Math.cos(midA)} y={cy + r * 0.62 * Math.sin(midA)} size={11.5} color="#FFFFFF" halo={false} weight={700}>
                  {`${Math.round((v / total) * 100)}%`}
                </T>
              )}
            </g>
          );
          a0 = a1;
          return el;
        })}
        {spec.blank && <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth={1.6} />}
        {labels.map((l, i) => (
          <g key={l + i}>
            <rect x={290} y={60 + i * 24} width={12} height={12} rx={2} fill={spec.blank ? "#FFFFFF" : colors[i % colors.length]} stroke={spec.blank ? INK : "none"} />
            <T x={310} y={66 + i * 24} size={12} anchor="start">
              {`${l}${spec.blank ? "" : ` (${nice(vals[i] ?? 0, 1)})`}`}
            </T>
          </g>
        ))}
      </Svg>
    );
  }
  const pad = { l: 50, r: 16, t: 20, b: 58 };
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const rawMin = Math.min(0, ...series.flatMap((s) => s.values));
  const min = rawMin < 0 ? -niceMax(-rawMin) : 0;
  const X0 = pad.l;
  const X1 = W - pad.r;
  const Y = (v: number) => H - pad.b - ((v - min) / (max - min)) * (H - pad.t - pad.b);
  const n = Math.max(1, labels.length);
  const band = (X1 - X0) / n;
  const rawStep = (max - min) / 5;
  const p10 = 10 ** Math.floor(Math.log10(rawStep));
  const m10 = rawStep / p10;
  const step = (m10 <= 1 ? 1 : m10 <= 2 ? 2 : m10 <= 5 ? 5 : 10) * p10;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return (
    <Svg w={W} h={H} title={spec.type === "line" ? "Line graph" : "Bar chart"}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X0} y1={Y(t)} x2={X1} y2={Y(t)} stroke={GRID} />
          <T x={X0 - 6} y={Y(t)} size={10.5} anchor="end" color={SOFT} halo={false}>
            {nice(t, 1)}
          </T>
        </g>
      ))}
      <line x1={X0} y1={Y(0)} x2={X1} y2={Y(0)} stroke={INK} strokeWidth={1.4} />
      <line x1={X0} y1={Y(0)} x2={X0} y2={pad.t - 6} stroke={INK} strokeWidth={1.4} />
      {!spec.blank &&
        (spec.type === "line"
          ? series.map((s, si) => (
              <g key={si}>
                <polyline points={s.values.map((v, i) => `${X0 + band * (i + 0.5)},${Y(v)}`).join(" ")} fill="none" stroke={colors[si % colors.length]} strokeWidth={2.2} />
                {s.values.map((v, i) => (
                  <circle key={i} cx={X0 + band * (i + 0.5)} cy={Y(v)} r={3.5} fill={colors[si % colors.length]} />
                ))}
              </g>
            ))
          : series.map((s, si) =>
              s.values.map((v, i) => {
                const bw = (band * 0.7) / series.length;
                const x = X0 + band * i + band * 0.15 + bw * si;
                return <rect key={`${si}-${i}`} x={x} y={Math.min(Y(v), Y(0))} width={bw - 2} height={Math.abs(Y(0) - Y(v))} rx={2} fill={colors[si % colors.length]} />;
              }),
            ))}
      {labels.map((l, i) => (
        <T key={l + i} x={X0 + band * (i + 0.5)} y={Y(min) + 14} size={10.5} color={SOFT} halo={false}>
          {l.length > 10 ? `${l.slice(0, 9)}…` : l}
        </T>
      ))}
      {spec.xLabel && (
        <T x={(X0 + X1) / 2} y={H - 14} size={12} color={SOFT} halo={false}>
          {spec.xLabel}
        </T>
      )}
      {spec.yLabel && (
        <text x={14} y={(pad.t + Y(0)) / 2} fontSize={12} fill={SOFT} textAnchor="middle" transform={`rotate(-90 14 ${(pad.t + Y(0)) / 2})`}>
          {spec.yLabel}
        </text>
      )}
      {series.length > 1 &&
        series.map((s, i) => (
          <g key={s.name}>
            <rect x={X0 + 8 + i * 110} y={pad.t - 14} width={10} height={10} rx={2} fill={colors[i % colors.length]} />
            <T x={X0 + 22 + i * 110} y={pad.t - 9} size={11} anchor="start" halo={false}>
              {s.name}
            </T>
          </g>
        ))}
    </Svg>
  );
};

/* ================= Climate graph ================= */

export type ClimateSpec = { kind: "climate"; place?: string; temp: number[]; rain: number[]; blank?: boolean };

export const ClimateFigure: React.FC<{ spec: ClimateSpec; accent: string }> = ({ spec }) => {
  const W = 460;
  const H = 320;
  const pad = { l: 46, r: 46, t: 30, b: 40 };
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const temp = (spec.temp ?? []).map(Number).slice(0, 12);
  const rain = (spec.rain ?? []).map(Number).slice(0, 12);
  const rMax = niceMax(Math.max(50, ...rain));
  const tMin = Math.min(0, Math.floor(Math.min(...temp, 0) / 10) * 10);
  const tMax = Math.max(40, Math.ceil(Math.max(...temp, 0) / 10) * 10);
  const X0 = pad.l;
  const X1 = W - pad.r;
  const band = (X1 - X0) / 12;
  const Yr = (v: number) => H - pad.b - (v / rMax) * (H - pad.t - pad.b);
  const Yt = (v: number) => H - pad.b - ((v - tMin) / (tMax - tMin)) * (H - pad.t - pad.b);
  return (
    <Svg w={W} h={H} title="Climate graph">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={X0} y1={Yr(rMax * f)} x2={X1} y2={Yr(rMax * f)} stroke={GRID} />
          <T x={X1 + 6} y={Yr(rMax * f)} size={10} anchor="start" color="#2563EB" halo={false}>
            {nice(rMax * f, 0)}
          </T>
          <T x={X0 - 6} y={Yr(rMax * f)} size={10} anchor="end" color="#DC2626" halo={false}>
            {nice(tMin + (tMax - tMin) * f, 0)}
          </T>
        </g>
      ))}
      {!spec.blank && rain.map((v, i) => <rect key={i} x={X0 + band * i + 3} y={Yr(v)} width={band - 6} height={Yr(0) - Yr(v)} fill="#3B82F6" opacity={0.75} rx={1.5} />)}
      {!spec.blank && temp.length > 1 && <polyline points={temp.map((v, i) => `${X0 + band * (i + 0.5)},${Yt(v)}`).join(" ")} fill="none" stroke="#DC2626" strokeWidth={2.4} />}
      {!spec.blank && temp.map((v, i) => <circle key={`t${i}`} cx={X0 + band * (i + 0.5)} cy={Yt(v)} r={3} fill="#DC2626" />)}
      <line x1={X0} y1={Yr(0)} x2={X1} y2={Yr(0)} stroke={INK} strokeWidth={1.4} />
      <line x1={X0} y1={Yr(0)} x2={X0} y2={pad.t} stroke={INK} strokeWidth={1.4} />
      <line x1={X1} y1={Yr(0)} x2={X1} y2={pad.t} stroke={INK} strokeWidth={1.4} />
      {months.map((m, i) => (
        <T key={i} x={X0 + band * (i + 0.5)} y={Yr(0) + 14} size={11} color={SOFT} halo={false}>
          {m}
        </T>
      ))}
      <T x={X0} y={14} size={11} anchor="start" color="#DC2626" halo={false}>
        Temperature (°C)
      </T>
      <T x={X1} y={14} size={11} anchor="end" color="#2563EB" halo={false}>
        Rainfall (mm)
      </T>
      {spec.place && (
        <T x={(X0 + X1) / 2} y={14} size={12} weight={700} halo={false}>
          {spec.place}
        </T>
      )}
    </Svg>
  );
};

/* ================= Timeline ================= */

export type TimelineSpec = { kind: "timeline"; events: { year: number | string; label: string }[] };

export const TimelineFigure: React.FC<{ spec: TimelineSpec; accent: string }> = ({ spec, accent }) => {
  const W = 520;
  const events = (spec.events ?? []).slice(0, 10);
  const H = 230;
  const y = H / 2;
  const nums = events.map((e) => Number(String(e.year).replace(/[^\d.-]/g, "")));
  const numeric = nums.every((v) => Number.isFinite(v)) && new Set(nums).size > 1;
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const scaled = (i: number) => 40 + ((nums[i] - lo) / (hi - lo)) * (W - 80);
  const sorted = numeric ? [...nums].sort((a, b) => a - b) : [];
  const tight = numeric && sorted.some((v, i) => i > 0 && ((v - sorted[i - 1]) / (hi - lo)) * (W - 80) < 64);
  const x = (i: number) => (numeric && !tight ? scaled(i) : 40 + (i / Math.max(1, events.length - 1)) * (W - 80));
  const wrap = (s: string) => {
    const words = s.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > 16) {
        lines.push(cur.trim());
        cur = w;
      } else cur += ` ${w}`;
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines.slice(0, 3);
  };
  return (
    <Svg w={W} h={H} title="Timeline">
      <line x1={20} y1={y} x2={W - 20} y2={y} stroke={INK} strokeWidth={2} markerEnd="url(#arrow)" />
      {events.map((e, i) => {
        const up = i % 2 === 0;
        const lines = wrap(e.label);
        return (
          <g key={i}>
            <line x1={x(i)} y1={y} x2={x(i)} y2={up ? y - 26 : y + 26} stroke={MUTE} strokeWidth={1.2} />
            <circle cx={x(i)} cy={y} r={5} fill={accent} stroke="#FFFFFF" strokeWidth={2} />
            <T x={x(i)} y={up ? y - 34 - lines.length * 13 : y + 38} size={12} weight={700} color={accent}>
              {String(e.year)}
            </T>
            {lines.map((l, j) => (
              <T key={j} x={x(i)} y={up ? y - 32 - (lines.length - 1 - j) * 13 : y + 53 + j * 13} size={11} color={SOFT}>
                {l}
              </T>
            ))}
          </g>
        );
      })}
    </Svg>
  );
};

/* ================= Population pyramid ================= */

export type PyramidSpec = { kind: "pyramid"; place?: string; groups: string[]; male: number[]; female: number[] };

export const PyramidFigure: React.FC<{ spec: PyramidSpec; accent: string }> = ({ spec }) => {
  const W = 460;
  const groups = spec.groups ?? [];
  const rowH = 16;
  const H = groups.length * rowH + 70;
  const cx = W / 2;
  const max = Math.max(1, ...(spec.male ?? []).map(Number), ...(spec.female ?? []).map(Number));
  const k = (W / 2 - 60) / max;
  return (
    <Svg w={W} h={H} title="Population pyramid">
      {spec.place && (
        <T x={cx} y={14} size={12} weight={700} halo={false}>
          {spec.place}
        </T>
      )}
      <T x={cx - 60} y={34} size={11} color="#2563EB" halo={false}>
        Male
      </T>
      <T x={cx + 60} y={34} size={11} color="#DB2777" halo={false}>
        Female
      </T>
      {groups.map((g, i) => {
        const y = H - 30 - (i + 1) * rowH;
        const m = Number(spec.male?.[i] ?? 0);
        const f = Number(spec.female?.[i] ?? 0);
        return (
          <g key={g}>
            <rect x={cx - 22 - m * k} y={y} width={m * k} height={rowH - 3} fill="#3B82F6" opacity={0.8} />
            <rect x={cx + 22} y={y} width={f * k} height={rowH - 3} fill="#EC4899" opacity={0.8} />
            <T x={cx} y={y + rowH / 2 - 1} size={9.5} color={SOFT} halo={false}>
              {g}
            </T>
          </g>
        );
      })}
      <line x1={30} y1={H - 28} x2={W - 30} y2={H - 28} stroke={INK} strokeWidth={1.2} />
      <T x={cx} y={H - 12} size={10.5} color={SOFT} halo={false}>
        % of population
      </T>
    </Svg>
  );
};
