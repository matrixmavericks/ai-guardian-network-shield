import React from "react";
import { nice } from "../mathExpr";
import { INK, SOFT, MUTE, Svg, T, add, mul, polar, rad, type Pt } from "./svg";

/* ================= Free-body diagram ================= */

export type FbdSpec = {
  kind: "fbd";
  object?: "box" | "ball" | "car" | "person";
  /** slope angle in degrees (0 = flat ground, omit for no surface) */
  incline?: number;
  surface?: boolean;
  /** angle in degrees: 0 = right, 90 = up, 180 = left, 270 = down; size is relative (default 1) */
  forces: { label: string; angle: number; size?: number }[];
};

export const FbdFigure: React.FC<{ spec: FbdSpec; accent: string }> = ({ spec, accent }) => {
  const W = 420;
  const H = 320;
  const inc = Math.max(0, Math.min(60, spec.incline ?? 0));
  const hasSurface = spec.surface !== false && (spec.incline !== undefined || !!spec.surface);
  const box = 30;
  const colors = [accent, "#DC2626", "#059669", "#7C3AED", "#D97706", "#0891B2"];
  // Wedge: bottom-left corner S0, slope rising to the right
  const S0: Pt = [40, 262];
  const slopeLen = 330;
  const d: Pt = [Math.cos(rad(inc)), -Math.sin(rad(inc))];
  const n: Pt = [-Math.sin(rad(inc)), -Math.cos(rad(inc))];
  const top: Pt = add(S0, mul(d, slopeLen));
  const foot = add(S0, mul(d, slopeLen * 0.5));
  const c: Pt = hasSurface ? add(foot, mul(n, box)) : [W / 2, H / 2];
  return (
    <Svg w={W} h={H} title="Free-body diagram">
      {hasSurface && inc > 0 && (
        <g>
          <polygon points={`${S0[0]},${S0[1]} ${top[0]},${top[1]} ${top[0]},${S0[1]}`} fill="#F3F4F6" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
          <path d={`M${S0[0] + 46} ${S0[1]} A46 46 0 0 0 ${S0[0] + 46 * Math.cos(rad(inc))} ${S0[1] - 46 * Math.sin(rad(inc))}`} fill="none" stroke={INK} strokeWidth={1.3} />
          <T x={S0[0] + 62 * Math.cos(rad(inc / 2))} y={S0[1] - 62 * Math.sin(rad(inc / 2))} size={12}>
            {`${nice(inc, 1)}°`}
          </T>
        </g>
      )}
      {hasSurface && inc === 0 && (
        <g>
          <line x1={40} y1={c[1] + box} x2={W - 40} y2={c[1] + box} stroke={INK} strokeWidth={1.8} />
          {Array.from({ length: 17 }).map((_, i) => (
            <line key={i} x1={50 + i * 20} y1={c[1] + box} x2={40 + i * 20} y2={c[1] + box + 10} stroke={MUTE} strokeWidth={1.1} />
          ))}
        </g>
      )}
      <g transform={`rotate(${-inc} ${c[0]} ${c[1]})`}>
        {spec.object === "ball" ? (
          <circle cx={c[0]} cy={c[1]} r={box} fill={`${accent}1A`} stroke={INK} strokeWidth={1.8} />
        ) : (
          <rect x={c[0] - box * 1.25} y={c[1] - box} width={box * 2.5} height={box * 2} rx={4} fill={`${accent}1A`} stroke={INK} strokeWidth={1.8} />
        )}
      </g>
      {spec.forces.map((f, i) => {
        const size = Math.max(0.35, Math.min(1.8, f.size ?? 1));
        const L = 45 + size * 50;
        const dir = polar(1, -f.angle);
        const end = add(c, mul(dir, L + box * 0.6));
        const lab = add(end, mul(dir, 16));
        const col = colors[i % colors.length];
        return (
          <g key={i}>
            <line x1={c[0]} y1={c[1]} x2={end[0]} y2={end[1]} stroke={col} strokeWidth={3} strokeLinecap="round" markerEnd="url(#arrow)" />
            <T x={lab[0]} y={lab[1]} size={13} color={col} weight={700}>
              {f.label}
            </T>
          </g>
        );
      })}
      <circle cx={c[0]} cy={c[1]} r={3.5} fill={INK} />
    </Svg>
  );
};

/* ================= Circuits ================= */

export type Comp = {
  type: "cell" | "battery" | "resistor" | "variable" | "bulb" | "switch" | "closed-switch" | "ammeter" | "voltmeter" | "motor" | "diode" | "led" | "ldr" | "thermistor" | "fuse" | "buzzer";
  label?: string;
};

export type CircuitSpec = {
  kind: "circuit";
  /** components along the top wire, left to right, before the parallel block */
  series?: Comp[];
  /** each branch is a list of components; drawn stacked between two junctions */
  parallel?: Comp[][];
  /** components along the top wire after the parallel block */
  after?: Comp[];
  /** power supply on the bottom wire (defaults to one cell) */
  source?: Comp[];
};

const SYM_W = 44;

/** Draws a component centred at (x, y), wire running horizontally. */
const Symbol: React.FC<{ c: Comp; x: number; y: number; accent: string }> = ({ c, x, y, accent }) => {
  const s = INK;
  const w = 1.8;
  const wireL = <line x1={x - SYM_W / 2} y1={y} x2={x - 14} y2={y} stroke={s} strokeWidth={w} />;
  const wireR = <line x1={x + 14} y1={y} x2={x + SYM_W / 2} y2={y} stroke={s} strokeWidth={w} />;
  const meter = (letter: string) => (
    <g>
      <line x1={x - SYM_W / 2} y1={y} x2={x - 12} y2={y} stroke={s} strokeWidth={w} />
      <line x1={x + 12} y1={y} x2={x + SYM_W / 2} y2={y} stroke={s} strokeWidth={w} />
      <circle cx={x} cy={y} r={12} fill="#FFFFFF" stroke={s} strokeWidth={w} />
      <text x={x} y={y + 0.5} fontSize={13} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill={s}>
        {letter}
      </text>
    </g>
  );
  let body: React.ReactNode;
  switch (c.type) {
    case "cell":
    case "battery": {
      const cells = c.type === "battery" ? [-6, 6] : [0];
      body = (
        <g>
          <line x1={x - SYM_W / 2} y1={y} x2={x - (c.type === "battery" ? 12 : 4)} y2={y} stroke={s} strokeWidth={w} />
          <line x1={x + (c.type === "battery" ? 12 : 4)} y1={y} x2={x + SYM_W / 2} y2={y} stroke={s} strokeWidth={w} />
          {cells.map((o) => (
            <g key={o}>
              <line x1={x + o - 4} y1={y - 13} x2={x + o - 4} y2={y + 13} stroke={s} strokeWidth={1.8} />
              <line x1={x + o + 4} y1={y - 7} x2={x + o + 4} y2={y + 7} stroke={s} strokeWidth={4} />
            </g>
          ))}
          {c.type === "battery" && <line x1={x - 2} y1={y} x2={x + 2} y2={y} stroke={s} strokeWidth={1.4} strokeDasharray="1 2" />}
        </g>
      );
      break;
    }
    case "resistor":
    case "variable":
    case "ldr":
    case "thermistor":
    case "fuse":
      body = (
        <g>
          {wireL}
          {wireR}
          <rect x={x - 14} y={y - 6} width={28} height={12} fill="#FFFFFF" stroke={s} strokeWidth={w} />
          {c.type === "fuse" && <line x1={x - 14} y1={y} x2={x + 14} y2={y} stroke={s} strokeWidth={1.4} />}
          {c.type === "variable" && <line x1={x - 14} y1={y + 12} x2={x + 16} y2={y - 14} stroke={s} strokeWidth={1.4} markerEnd="url(#arrow)" />}
          {c.type === "thermistor" && <polyline points={`${x - 16},${y + 12} ${x + 12},${y - 12} ${x + 18},${y - 12}`} fill="none" stroke={s} strokeWidth={1.4} />}
          {c.type === "ldr" && (
            <g>
              <circle cx={x} cy={y} r={17} fill="none" stroke={s} strokeWidth={1.4} />
              <line x1={x - 20} y1={y - 26} x2={x - 9} y2={y - 15} stroke={s} strokeWidth={1.3} markerEnd="url(#arrow)" />
              <line x1={x - 10} y1={y - 30} x2={x + 1} y2={y - 19} stroke={s} strokeWidth={1.3} markerEnd="url(#arrow)" />
            </g>
          )}
        </g>
      );
      break;
    case "bulb":
      body = (
        <g>
          <line x1={x - SYM_W / 2} y1={y} x2={x - 11} y2={y} stroke={s} strokeWidth={w} />
          <line x1={x + 11} y1={y} x2={x + SYM_W / 2} y2={y} stroke={s} strokeWidth={w} />
          <circle cx={x} cy={y} r={11} fill="#FFFFFF" stroke={s} strokeWidth={w} />
          <line x1={x - 7.8} y1={y - 7.8} x2={x + 7.8} y2={y + 7.8} stroke={s} strokeWidth={1.5} />
          <line x1={x - 7.8} y1={y + 7.8} x2={x + 7.8} y2={y - 7.8} stroke={s} strokeWidth={1.5} />
        </g>
      );
      break;
    case "switch":
    case "closed-switch":
      body = (
        <g>
          <line x1={x - SYM_W / 2} y1={y} x2={x - 12} y2={y} stroke={s} strokeWidth={w} />
          <line x1={x + 12} y1={y} x2={x + SYM_W / 2} y2={y} stroke={s} strokeWidth={w} />
          <circle cx={x - 12} cy={y} r={2.5} fill={s} />
          <circle cx={x + 12} cy={y} r={2.5} fill={s} />
          {c.type === "switch" ? <line x1={x - 12} y1={y} x2={x + 11} y2={y - 12} stroke={s} strokeWidth={w} /> : <line x1={x - 12} y1={y} x2={x + 12} y2={y} stroke={s} strokeWidth={w} />}
        </g>
      );
      break;
    case "ammeter":
      body = meter("A");
      break;
    case "voltmeter":
      body = meter("V");
      break;
    case "motor":
      body = meter("M");
      break;
    case "buzzer":
      body = (
        <g>
          {wireL}
          {wireR}
          <path d={`M${x - 12} ${y} L${x - 12} ${y - 12} A12 12 0 0 1 ${x + 12} ${y - 12} L${x + 12} ${y} Z`} fill="#FFFFFF" stroke={s} strokeWidth={w} />
        </g>
      );
      break;
    case "diode":
    case "led":
      body = (
        <g>
          {wireL}
          {wireR}
          <polygon points={`${x - 10},${y - 10} ${x - 10},${y + 10} ${x + 8},${y}`} fill="#FFFFFF" stroke={s} strokeWidth={w} />
          <line x1={x + 9} y1={y - 10} x2={x + 9} y2={y + 10} stroke={s} strokeWidth={w} />
          {c.type === "led" && (
            <g>
              <line x1={x} y1={y - 14} x2={x + 10} y2={y - 26} stroke={accent} strokeWidth={1.3} markerEnd="url(#arrow)" />
              <line x1={x + 8} y1={y - 12} x2={x + 18} y2={y - 24} stroke={accent} strokeWidth={1.3} markerEnd="url(#arrow)" />
            </g>
          )}
        </g>
      );
      break;
    default:
      body = <line x1={x - SYM_W / 2} y1={y} x2={x + SYM_W / 2} y2={y} stroke={s} strokeWidth={w} />;
  }
  return (
    <g>
      {body}
      {c.label && (
        <T x={x} y={y + 24} size={11.5} color={SOFT} weight={600}>
          {c.label}
        </T>
      )}
    </g>
  );
};

export const CircuitFigure: React.FC<{ spec: CircuitSpec; accent: string }> = ({ spec, accent }) => {
  const series = spec.series ?? [];
  const after = spec.after ?? [];
  const branches = (spec.parallel ?? []).filter((b) => b.length);
  const source = spec.source?.length ? spec.source : [{ type: "cell" as const }];
  const gap = 70;
  const branchLen = Math.max(0, ...branches.map((b) => b.length));
  const blockW = branches.length ? Math.max(1, branchLen) * gap + 40 : 0;
  const topCount = series.length + after.length;
  const W = Math.max(360, 60 + topCount * gap + blockW + 40);
  const top = 50;
  const rowGap = 64;
  const blockH = branches.length ? (branches.length - 1) * rowGap : 0;
  const bottom = Math.max(top + 150, top + blockH + 90);
  const H = bottom + 50;
  const left = 30;
  const right = W - 30;
  const s = INK;
  const w = 1.8;

  // top wire layout
  const xsSeries = series.map((_, i) => left + 50 + i * gap);
  const blockStart = left + 50 + series.length * gap - gap / 2 + (series.length ? 10 : 0);
  const blockEnd = blockStart + blockW;
  const xsAfter = after.map((_, i) => blockEnd + gap / 2 + i * gap);
  const srcXs = source.map((_, i) => (left + right) / 2 + (i - (source.length - 1) / 2) * gap);

  const wires: React.ReactNode[] = [];
  const hw = (x1: number, x2: number, y: number, k: string) => (x2 > x1 ? wires.push(<line key={k} x1={x1} y1={y} x2={x2} y2={y} stroke={s} strokeWidth={w} />) : null);

  // top wire segments between components
  const stops: number[] = [left, ...xsSeries.flatMap((x) => [x - SYM_W / 2, x + SYM_W / 2])];
  if (branches.length) stops.push(blockStart, blockEnd);
  stops.push(...xsAfter.flatMap((x) => [x - SYM_W / 2, x + SYM_W / 2]), right);
  for (let i = 0; i < stops.length - 1; i += 2) hw(stops[i], stops[i + 1], top, `t${i}`);
  // sides
  wires.push(<line key="l" x1={left} y1={top} x2={left} y2={bottom} stroke={s} strokeWidth={w} />);
  wires.push(<line key="r" x1={right} y1={top} x2={right} y2={bottom} stroke={s} strokeWidth={w} />);
  // bottom wire around the source
  const bStops = [left, ...srcXs.flatMap((x) => [x - SYM_W / 2, x + SYM_W / 2]), right];
  for (let i = 0; i < bStops.length - 1; i += 2) hw(bStops[i], bStops[i + 1], bottom, `b${i}`);

  return (
    <Svg w={W} h={H} title="Circuit diagram">
      {wires}
      {series.map((c, i) => (
        <Symbol key={`s${i}`} c={c} x={xsSeries[i]} y={top} accent={accent} />
      ))}
      {after.map((c, i) => (
        <Symbol key={`a${i}`} c={c} x={xsAfter[i]} y={top} accent={accent} />
      ))}
      {branches.length > 0 && (
        <g>
          <line x1={blockStart} y1={top} x2={blockStart} y2={top + blockH} stroke={s} strokeWidth={w} />
          <line x1={blockEnd} y1={top} x2={blockEnd} y2={top + blockH} stroke={s} strokeWidth={w} />
          <circle cx={blockStart} cy={top} r={3.5} fill={s} />
          <circle cx={blockEnd} cy={top} r={3.5} fill={s} />
          {branches.map((b, bi) => {
            const y = top + bi * rowGap;
            const xs = b.map((_, i) => blockStart + (blockW / (b.length + 1)) * (i + 1));
            const st = [blockStart, ...xs.flatMap((x) => [x - SYM_W / 2, x + SYM_W / 2]), blockEnd];
            return (
              <g key={`br${bi}`}>
                {bi > 0 &&
                  st.map((_, i) =>
                    i % 2 === 0 && st[i + 1] > st[i] ? <line key={i} x1={st[i]} y1={y} x2={st[i + 1]} y2={y} stroke={s} strokeWidth={w} /> : null,
                  )}
                {bi === 0 &&
                  st.map((_, i) =>
                    i % 2 === 0 && st[i + 1] > st[i] ? <line key={i} x1={st[i]} y1={y} x2={st[i + 1]} y2={y} stroke={s} strokeWidth={w} /> : null,
                  )}
                {b.map((c, i) => (
                  <Symbol key={i} c={c} x={xs[i]} y={y} accent={accent} />
                ))}
              </g>
            );
          })}
        </g>
      )}
      {source.map((c, i) => (
        <Symbol key={`src${i}`} c={c} x={srcXs[i]} y={bottom} accent={accent} />
      ))}
    </Svg>
  );
};

/* ================= Thin lens ray diagram ================= */

export type LensSpec = {
  kind: "lens";
  lens?: "converging" | "diverging";
  /** focal length and object distance in cm (positive numbers) */
  f: number;
  u: number;
  objectHeight?: number;
  showImage?: boolean;
  labels?: boolean;
};

export const LensFigure: React.FC<{ spec: LensSpec; accent: string }> = ({ spec, accent }) => {
  const conv = spec.lens !== "diverging";
  const f = Math.abs(Number(spec.f) || 10) * (conv ? 1 : -1);
  const u = Math.abs(Number(spec.u) || 25);
  const h = Math.abs(Number(spec.objectHeight) || 4);
  if (conv && Math.abs(u - f) < 1e-6) throw new Error("Object at the focal point: the rays leave parallel and no image forms.");
  const v = (u * f) / (u - f); // real is positive (image on the far side)
  const m = -v / u;
  const hi = m * h;
  const W = 520;
  const H = 300;
  const span = Math.max(u, Math.abs(v), Math.abs(f) * 2.2) * 1.15;
  const k = (W / 2 - 30) / span;
  const cx = W / 2;
  const cy = H / 2;
  const X = (x: number) => cx + x * k;
  const ky = Math.min(k, (H / 2 - 30) / Math.max(h, Math.abs(hi), 1));
  const Y = (y: number) => cy - y * ky;
  const obj: Pt = [X(-u), Y(h)];
  const img: Pt = [X(v), Y(hi)];
  const virtual = v < 0;
  const ray = (pts: Pt[], dashed = false, color = accent, key = "") => (
    <polyline key={key} points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={1.6} strokeDasharray={dashed ? "5 4" : undefined} />
  );
  const extend = (a: Pt, b: Pt, toX: number): Pt => {
    const t = (toX - a[0]) / (b[0] - a[0] || 1e-9);
    return [toX, a[1] + t * (b[1] - a[1])];
  };
  const rays: React.ReactNode[] = [];
  // 1. parallel to axis, then refracts through (or away from) the far focal point
  const p1: Pt = [X(0), obj[1]];
  const F2: Pt = [X(f), Y(0)];
  const after1 = extend(p1, F2, W - 10);
  const after1b = conv ? after1 : extend(p1, [2 * p1[0] - F2[0], 2 * p1[1] - F2[1]], W - 10);
  rays.push(ray([obj, p1, conv ? after1 : after1b], false, accent, "r1"));
  // 2. through the optical centre
  const c: Pt = [X(0), Y(0)];
  rays.push(ray([obj, extend(obj, c, W - 10)], false, "#DC2626", "r2"));
  // 3. towards the near focal point, then parallel (converging only)
  if (conv && u > f) {
    const F1: Pt = [X(-f), Y(0)];
    const hit = extend(obj, F1, X(0));
    rays.push(ray([obj, hit, [W - 10, hit[1]]], false, "#059669", "r3"));
  }
  if (virtual) {
    rays.push(ray([p1, img], true, accent, "v1"));
    rays.push(ray([c, img], true, "#DC2626", "v2"));
  }
  const arrowObj = (p: Pt, dashed = false, color = INK) => <line x1={p[0]} y1={cy} x2={p[0]} y2={p[1]} stroke={color} strokeWidth={2.4} markerEnd="url(#arrow)" strokeDasharray={dashed ? "5 4" : undefined} />;
  return (
    <Svg w={W} h={H} title="Ray diagram">
      <line x1={10} y1={cy} x2={W - 10} y2={cy} stroke={SOFT} strokeWidth={1.2} />
      {conv ? (
        <path d={`M${cx} ${cy - 118} Q${cx + 16} ${cy} ${cx} ${cy + 118} Q${cx - 16} ${cy} ${cx} ${cy - 118}`} fill={`${accent}14`} stroke={INK} strokeWidth={1.6} />
      ) : (
        <path d={`M${cx - 10} ${cy - 118} L${cx + 10} ${cy - 118} Q${cx + 2} ${cy} ${cx + 10} ${cy + 118} L${cx - 10} ${cy + 118} Q${cx - 2} ${cy} ${cx - 10} ${cy - 118}`} fill={`${accent}14`} stroke={INK} strokeWidth={1.6} />
      )}
      {[-2, -1, 1, 2].map((n) => {
        const x = X(n * Math.abs(f));
        if (x < 12 || x > W - 12) return null;
        return (
          <g key={n}>
            <circle cx={x} cy={cy} r={3} fill={INK} />
            <T x={x} y={cy + 15} size={11.5} color={SOFT}>
              {Math.abs(n) === 2 ? "2F" : "F"}
            </T>
          </g>
        );
      })}
      {rays}
      {arrowObj(obj)}
      <T x={obj[0]} y={obj[1] - 14} size={12} weight={600}>
        Object
      </T>
      {spec.showImage !== false && Number.isFinite(v) && img[0] > 0 && img[0] < W && (
        <g>
          {arrowObj(img, virtual, virtual ? SOFT : INK)}
          <T x={img[0]} y={img[1] + (hi < 0 ? 16 : -14)} size={12} weight={600} color={virtual ? SOFT : INK}>
            {virtual ? "Virtual image" : "Image"}
          </T>
        </g>
      )}
      {spec.labels !== false && (
        <T x={14} y={18} size={11.5} anchor="start" color={SOFT} halo={false}>
          {`f = ${nice(Math.abs(f), 1)} cm · u = ${nice(u, 1)} cm · v = ${Number.isFinite(v) ? nice(v, 1) : "∞"} cm · m = ${nice(m, 2)}`}
        </T>
      )}
    </Svg>
  );
};
