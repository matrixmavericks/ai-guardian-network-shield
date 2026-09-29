import React from "react";
import { compile, nice } from "../mathExpr";
import {
  AngleMark,
  GRID,
  INK,
  RightMark,
  SOFT,
  SideLabel,
  Svg,
  T,
  Ticks,
  add,
  centroid,
  deg,
  fitter,
  labelOf,
  mul,
  polar,
  rad,
  sub,
  unit,
  type Pt,
} from "./svg";

/* ================= Triangle ================= */

export type TriangleSpec = {
  kind: "triangle";
  a?: number;
  b?: number;
  c?: number;
  A?: number;
  B?: number;
  C?: number;
  vertices?: [string, string, string];
  /** labels for sides a (BC), b (CA), c (AB): "auto", a string like "x", or null to hide */
  sideLabels?: (string | boolean | null)[];
  angleLabels?: (string | boolean | null)[];
  unit?: string;
  ticks?: number[];
};

export type Solved = { a: number; b: number; c: number; A: number; B: number; C: number };

/** Solves a triangle from any valid three pieces (at least one side). Angles in degrees. */
export const solveTriangle = (s: Partial<Solved>): Solved | null => {
  const S: Record<string, number | undefined> = { a: s.a, b: s.b, c: s.c, A: s.A, B: s.B, C: s.C };
  const sides = ["a", "b", "c"].filter((k) => S[k] && S[k]! > 0);
  const angs = ["A", "B", "C"].filter((k) => S[k] && S[k]! > 0 && S[k]! < 180);
  if (!sides.length) return null;
  const cosRule = (x: number, y: number, angle: number) => Math.sqrt(x * x + y * y - 2 * x * y * Math.cos(rad(angle)));
  const angleFrom = (opp: number, x: number, y: number) => deg(Math.acos(Math.max(-1, Math.min(1, (x * x + y * y - opp * opp) / (2 * x * y)))));
  if (angs.length >= 2) {
    const sum = angs.reduce((t, k) => t + S[k]!, 0);
    const missing = ["A", "B", "C"].find((k) => !angs.includes(k));
    if (missing) S[missing] = 180 - sum;
    if (S.A! <= 0 || S.B! <= 0 || S.C! <= 0) return null;
    const known = sides[0];
    const k = S[known]! / Math.sin(rad(S[known.toUpperCase()]!));
    for (const x of ["a", "b", "c"]) if (!S[x]) S[x] = k * Math.sin(rad(S[x.toUpperCase()]!));
  } else if (sides.length === 3) {
    const { a, b, c } = S as Required<typeof S>;
    if (a! + b! <= c! || a! + c! <= b! || b! + c! <= a!) return null;
    S.A = angleFrom(a!, b!, c!);
    S.B = angleFrom(b!, a!, c!);
    S.C = 180 - S.A - S.B;
  } else if (sides.length === 2 && angs.length === 1) {
    const ang = angs[0];
    const opp = ang.toLowerCase();
    if (!S[opp]) {
      // included angle: cosine rule for the side opposite it
      const [x, y] = sides.map((k) => S[k]!);
      S[opp] = cosRule(x, y, S[ang]!);
      return solveTriangle({ a: S.a, b: S.b, c: S.c });
    }
    // SSA: sine rule for the angle opposite the other known side (acute solution)
    const other = sides.find((k) => k !== opp)!;
    const sinY = (S[other]! * Math.sin(rad(S[ang]!))) / S[opp]!;
    if (sinY > 1) return null;
    S[other.toUpperCase()] = deg(Math.asin(sinY));
    const third = ["A", "B", "C"].find((k) => !S[k])!;
    S[third] = 180 - S[ang]! - S[other.toUpperCase()]!;
    if (S[third]! <= 0) return null;
    S[third.toLowerCase()] = (S[opp]! / Math.sin(rad(S[ang]!))) * Math.sin(rad(S[third]!));
  } else return null;
  const out = S as unknown as Solved;
  return [out.a, out.b, out.c, out.A, out.B, out.C].every((v) => Number.isFinite(v) && v > 0) ? out : null;
};

export const TriangleFigure: React.FC<{ spec: TriangleSpec; accent: string }> = ({ spec, accent }) => {
  const t = solveTriangle(spec);
  if (!t) throw new Error("These measurements don't make a triangle.");
  const names = spec.vertices ?? ["A", "B", "C"];
  // A at origin, B along the x-axis, C above
  let P: Pt[] = [
    [0, 0],
    [t.c, 0],
    [t.b * Math.cos(rad(t.A)), t.b * Math.sin(rad(t.A))],
  ];
  // Rotate so the longest side is the base
  const sides: [number, number, number][] = [
    [1, 2, t.a],
    [2, 0, t.b],
    [0, 1, t.c],
  ];
  const [i, j] = sides.sort((x, y) => y[2] - x[2])[0];
  const ang = Math.atan2(P[j][1] - P[i][1], P[j][0] - P[i][0]);
  P = P.map((p) => {
    const q = sub(p, P[i]);
    return [q[0] * Math.cos(-ang) - q[1] * Math.sin(-ang), q[0] * Math.sin(-ang) + q[1] * Math.cos(-ang)] as Pt;
  });
  const k = 3 - i - j;
  if (P[k][1] < 0) P = P.map((p) => [p[0], -p[1]] as Pt);
  const W = 420;
  const f = fitter(P, W, 46, 300);
  const Q = P.map(f.map);
  const cen = centroid(Q);
  const u = spec.unit ? ` ${spec.unit}` : "";
  const sideVals = [t.a, t.b, t.c];
  const angVals = [t.A, t.B, t.C];
  const sideLabels = spec.sideLabels ?? ["auto", "auto", "auto"];
  const angleLabels = spec.angleLabels ?? [null, null, null];
  const segs: [number, number][] = [
    [1, 2],
    [2, 0],
    [0, 1],
  ];
  return (
    <Svg w={W} h={f.h} title="Triangle">
      <polygon points={Q.map((p) => p.join(",")).join(" ")} fill={`${accent}14`} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      {segs.map(([x, y], n) => {
        const lab = labelOf(sideLabels[n], () => `${nice(sideVals[n], 1)}${u}`);
        return (
          <g key={n}>
            {lab && <SideLabel a={Q[x]} b={Q[y]} inside={cen} text={lab} />}
            {spec.ticks?.[n] ? <Ticks a={Q[x]} b={Q[y]} n={spec.ticks[n]} /> : null}
          </g>
        );
      })}
      {[0, 1, 2].map((v) => {
        const p = Q[(v + 1) % 3];
        const q = Q[(v + 2) % 3];
        const right = Math.abs(angVals[v] - 90) < 0.5;
        const lab = labelOf(angleLabels[v], () => `${nice(angVals[v], 1)}°`);
        return (
          <g key={v}>
            {right ? <RightMark v={Q[v]} p={p} q={q} /> : lab ? <AngleMark v={Q[v]} p={p} q={q} label={lab} color={accent} /> : null}
            {right && lab && lab !== "90°" && (
              <T x={Q[v][0] + unit(sub(cen, Q[v]))[0] * 30} y={Q[v][1] + unit(sub(cen, Q[v]))[1] * 30} size={12} color={accent}>
                {lab}
              </T>
            )}
          </g>
        );
      })}
      {Q.map((p, n) => {
        const o = add(p, mul(unit(sub(p, cen)), 16));
        return (
          <T key={n} x={o[0]} y={o[1]} weight={600} italic={false}>
            {names[n]}
          </T>
        );
      })}
    </Svg>
  );
};

/* ================= Polygon (custom or regular) ================= */

export type PolygonSpec = {
  kind: "polygon";
  points?: [number, number][];
  sides?: number;
  vertexLabels?: string[];
  sideLabels?: (string | null)[];
  angleLabels?: (string | null)[];
  rightAngles?: number[];
  ticks?: number[];
  shade?: boolean;
};

export const PolygonFigure: React.FC<{ spec: PolygonSpec; accent: string }> = ({ spec, accent }) => {
  let pts: Pt[] = spec.points?.map((p) => [Number(p[0]), Number(p[1])] as Pt) ?? [];
  if (!pts.length && spec.sides && spec.sides >= 3) {
    const n = Math.min(12, Math.round(spec.sides));
    pts = Array.from({ length: n }, (_, i) => polar(1, -90 - 180 / n + (360 / n) * i + (n % 2 ? 0 : 180 / n)));
  }
  if (pts.length < 3) throw new Error("A polygon needs at least three points.");
  const W = 420;
  const f = fitter(pts, W, 46, 300);
  const Q = pts.map(f.map);
  const cen = centroid(Q);
  const n = Q.length;
  return (
    <Svg w={W} h={f.h} title="Polygon">
      <polygon points={Q.map((p) => p.join(",")).join(" ")} fill={spec.shade === false ? "none" : `${accent}14`} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      {Q.map((p, i) => {
        const q = Q[(i + 1) % n];
        const lab = spec.sideLabels?.[i];
        return (
          <g key={`s${i}`}>
            {lab && <SideLabel a={p} b={q} inside={cen} text={lab} />}
            {spec.ticks?.[i] ? <Ticks a={p} b={q} n={spec.ticks[i]} /> : null}
          </g>
        );
      })}
      {Q.map((v, i) => {
        const prev = Q[(i - 1 + n) % n];
        const next = Q[(i + 1) % n];
        const lab = spec.angleLabels?.[i];
        return (
          <g key={`a${i}`}>
            {spec.rightAngles?.includes(i) ? <RightMark v={v} p={prev} q={next} /> : lab ? <AngleMark v={v} p={prev} q={next} label={lab} color={accent} /> : null}
            {spec.vertexLabels?.[i] && (
              <T x={add(v, mul(unit(sub(v, cen)), 16))[0]} y={add(v, mul(unit(sub(v, cen)), 16))[1]} weight={600}>
                {spec.vertexLabels[i]}
              </T>
            )}
          </g>
        );
      })}
    </Svg>
  );
};

/* ================= Circle theorems ================= */

export type CircleSpec = {
  kind: "circle";
  /** named points on the circumference at angles (degrees, 0 = right, anticlockwise) */
  points?: { name: string; angle: number }[];
  center?: string | boolean;
  /** segments between named points; "O" is the centre */
  segments?: [string, string][];
  tangents?: string[];
  angles?: { at: string; from: string; to: string; label?: string }[];
  radiusLabel?: string;
  shadeSector?: [string, string];
};

export const CircleFigure: React.FC<{ spec: CircleSpec; accent: string }> = ({ spec, accent }) => {
  const W = 400;
  const R = 130;
  const C: Pt = [W / 2, 175];
  const H = 350;
  const at = (angle: number): Pt => [C[0] + R * Math.cos(rad(angle)), C[1] - R * Math.sin(rad(angle))];
  const named: Record<string, Pt> = { O: C };
  for (const p of spec.points ?? []) named[p.name] = at(p.angle);
  const showO = spec.center !== false;
  const oName = typeof spec.center === "string" ? spec.center : "O";
  const get = (k: string) => named[k] ?? (k === oName ? C : undefined);
  let sector: React.ReactNode = null;
  if (spec.shadeSector) {
    const a = spec.points?.find((p) => p.name === spec.shadeSector![0]);
    const b = spec.points?.find((p) => p.name === spec.shadeSector![1]);
    if (a && b) {
      const pa = at(a.angle);
      const pb = at(b.angle);
      const sweep = (b.angle - a.angle + 360) % 360;
      sector = <path d={`M${C[0]} ${C[1]} L${pa[0]} ${pa[1]} A${R} ${R} 0 ${sweep > 180 ? 1 : 0} 0 ${pb[0]} ${pb[1]} Z`} fill={`${accent}22`} stroke="none" />;
    }
  }
  return (
    <Svg w={W} h={H} title="Circle">
      {sector}
      <circle cx={C[0]} cy={C[1]} r={R} fill="none" stroke={INK} strokeWidth={1.8} />
      {(spec.segments ?? []).map(([x, y], i) => {
        const p = get(x);
        const q = get(y);
        return p && q ? <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={INK} strokeWidth={1.6} /> : null;
      })}
      {(spec.tangents ?? []).map((name, i) => {
        const p = spec.points?.find((x) => x.name === name);
        if (!p) return null;
        const pt = at(p.angle);
        const d: Pt = [Math.sin(rad(p.angle)), Math.cos(rad(p.angle))];
        const a = add(pt, mul(d, 120));
        const b = add(pt, mul(d, -120));
        return (
          <g key={`t${i}`}>
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={INK} strokeWidth={1.6} />
            <RightMark v={pt} p={C} q={a} s={9} />
          </g>
        );
      })}
      {(spec.angles ?? []).map((m, i) => {
        const v = get(m.at);
        const p = get(m.from);
        const q = get(m.to);
        return v && p && q ? <AngleMark key={`m${i}`} v={v} p={p} q={q} r={m.at === oName ? 22 : 20} label={m.label} color={accent} /> : null;
      })}
      {spec.radiusLabel && (() => {
        const p = spec.points?.[0] ? at(spec.points[0].angle) : at(-30);
        if (!spec.segments?.some(([x, y]) => [x, y].includes(oName))) {
          return (
            <g>
              <line x1={C[0]} y1={C[1]} x2={p[0]} y2={p[1]} stroke={INK} strokeWidth={1.4} strokeDasharray="5 4" />
              <SideLabel a={C} b={p} inside={[C[0], C[1] + 60]} text={spec.radiusLabel} />
            </g>
          );
        }
        return <SideLabel a={C} b={p} inside={[C[0] - 40, C[1] + 60]} text={spec.radiusLabel} />;
      })()}
      {showO && (
        <g>
          <circle cx={C[0]} cy={C[1]} r={3} fill={INK} />
          <T x={C[0] + 12} y={C[1] + 12} weight={600}>
            {oName}
          </T>
        </g>
      )}
      {(spec.points ?? []).map((p) => {
        const q = at(p.angle);
        const o: Pt = [C[0] + (R + 16) * Math.cos(rad(p.angle)), C[1] - (R + 16) * Math.sin(rad(p.angle))];
        return (
          <g key={p.name}>
            <circle cx={q[0]} cy={q[1]} r={2.6} fill={INK} />
            <T x={o[0]} y={o[1]} weight={600}>
              {p.name}
            </T>
          </g>
        );
      })}
    </Svg>
  );
};

/* ================= Parallel lines and a transversal ================= */

export type ParallelSpec = {
  kind: "parallel";
  /** acute angle between the transversal and the parallel lines */
  angle?: number;
  /** positions p1..p4 at the upper crossing and q1..q4 at the lower one (1 top-left, 2 top-right, 3 bottom-left, 4 bottom-right) */
  labels?: Record<string, string>;
};

export const ParallelFigure: React.FC<{ spec: ParallelSpec; accent: string }> = ({ spec, accent }) => {
  const W = 420;
  const H = 280;
  const theta = Math.min(85, Math.max(25, spec.angle ?? 60));
  const y1 = 95;
  const y2 = 195;
  const dx = (y2 - y1) / Math.tan(rad(theta));
  const P: Pt = [W / 2 + dx / 2, y1];
  const Q: Pt = [W / 2 - dx / 2, y2];
  const dir = unit(sub(Q, P));
  const t1 = add(P, mul(dir, -80));
  const t2 = add(Q, mul(dir, 80));
  const arrowAt = (y: number) => (
    <g>
      <path d={`M${W - 70} ${y - 5} L${W - 62} ${y} L${W - 70} ${y + 5}`} fill="none" stroke={INK} strokeWidth={1.5} />
    </g>
  );
  const at = (c: Pt, pos: string) => {
    const up = mul(dir, -1);
    const down = dir;
    const left: Pt = [-1, 0];
    const right: Pt = [1, 0];
    const map: Record<string, [Pt, Pt]> = { "1": [left, up], "2": [up, right], "3": [down, left], "4": [right, down] };
    return map[pos];
  };
  return (
    <Svg w={W} h={H} title="Parallel lines and a transversal">
      <line x1={30} y1={y1} x2={W - 30} y2={y1} stroke={INK} strokeWidth={1.8} />
      <line x1={30} y1={y2} x2={W - 30} y2={y2} stroke={INK} strokeWidth={1.8} />
      {arrowAt(y1)}
      {arrowAt(y2)}
      <line x1={t1[0]} y1={t1[1]} x2={t2[0]} y2={t2[1]} stroke={INK} strokeWidth={1.8} />
      {Object.entries(spec.labels ?? {}).map(([k, text]) => {
        const c = k.startsWith("p") ? P : Q;
        const pair = at(c, k.slice(1));
        if (!pair) return null;
        return <AngleMark key={k} v={c} p={add(c, mul(pair[0], 40))} q={add(c, mul(pair[1], 40))} r={20} label={text} color={accent} />;
      })}
    </Svg>
  );
};

/* ================= 3D solids ================= */

export type SolidSpec = {
  kind: "solid";
  shape: "cuboid" | "cube" | "cylinder" | "cone" | "sphere" | "prism" | "pyramid" | "hemisphere";
  labels?: { length?: string; width?: string; height?: string; radius?: string; slant?: string };
};

export const SolidFigure: React.FC<{ spec: SolidSpec; accent: string }> = ({ spec, accent }) => {
  const W = 400;
  const H = 300;
  const L = spec.labels ?? {};
  const fill = `${accent}14`;
  const dash = "5 4";
  const line = (a: Pt, b: Pt, hidden = false) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={hidden ? SOFT : INK} strokeWidth={hidden ? 1.2 : 1.7} strokeDasharray={hidden ? dash : undefined} />;
  const shape = spec.shape === "cube" ? "cuboid" : spec.shape;
  if (shape === "cuboid" || shape === "prism") {
    const x0 = 90;
    const y0 = 230;
    const w = shape === "prism" ? 180 : 190;
    const h = 120;
    const d: Pt = [60, -50];
    if (shape === "cuboid") {
      const A: Pt = [x0, y0];
      const B: Pt = [x0 + w, y0];
      const C: Pt = [x0 + w, y0 - h];
      const D: Pt = [x0, y0 - h];
      const [A2, B2, C2, D2] = [A, B, C, D].map((p) => add(p, d));
      return (
        <Svg w={W} h={H} title="Cuboid">
          <polygon points={[A, B, C, D].map((p) => p.join(",")).join(" ")} fill={fill} />
          <polygon points={[D, C, C2, D2].map((p) => p.join(",")).join(" ")} fill={`${accent}0A`} />
          <polygon points={[B, B2, C2, C].map((p) => p.join(",")).join(" ")} fill={`${accent}1F`} />
          {line(A, B)}
          {line(B, C)}
          {line(C, D)}
          {line(D, A)}
          {line(B, B2)}
          {line(C, C2)}
          {line(D, D2)}
          {line(D2, C2)}
          {line(C2, B2)}
          {line(A, A2, true)}
          {line(A2, B2, true)}
          {line(A2, D2, true)}
          {L.length && <SideLabel a={A} b={B} inside={[x0 + w / 2, y0 - 50]} text={L.length} />}
          {L.height && <SideLabel a={B} b={C} inside={[x0 + w / 2, y0 - 50]} text={L.height} gap={spec.labels?.width ? 14 : 16} />}
          {L.width && <SideLabel a={B} b={B2} inside={[x0 + w / 2, y0 - 50]} text={L.width} />}
        </Svg>
      );
    }
    // triangular prism
    const A: Pt = [x0, y0];
    const B: Pt = [x0 + w, y0];
    const C: Pt = [x0 + w / 2, y0 - h];
    const [A2, B2, C2] = [A, B, C].map((p) => add(p, d));
    return (
      <Svg w={W} h={H} title="Triangular prism">
        <polygon points={[A, B, C].map((p) => p.join(",")).join(" ")} fill={fill} />
        <polygon points={[B, B2, C2, C].map((p) => p.join(",")).join(" ")} fill={`${accent}1F`} />
        {line(A, B)}
        {line(B, C)}
        {line(C, A)}
        {line(B, B2)}
        {line(C, C2)}
        {line(B2, C2)}
        {line(A, A2, true)}
        {line(A2, B2, true)}
        {line(A2, C2, true)}
        {L.length && <SideLabel a={B} b={B2} inside={[x0 + w / 2, y0 - 40]} text={L.length} />}
        {L.width && <SideLabel a={A} b={B} inside={[x0 + w / 2, y0 - 40]} text={L.width} />}
        {L.height && (
          <g>
            {line(C, [C[0], y0], true)}
            <RightMark v={[C[0], y0]} p={B} q={C} s={9} />
            <T x={C[0] + 16} y={(C[1] + y0) / 2}>
              {L.height}
            </T>
          </g>
        )}
      </Svg>
    );
  }
  const cx = W / 2;
  const rx = 90;
  const ry = 24;
  if (shape === "cylinder") {
    const top = 70;
    const bot = 230;
    return (
      <Svg w={W} h={H} title="Cylinder">
        <path d={`M${cx - rx} ${top} L${cx - rx} ${bot} A${rx} ${ry} 0 0 0 ${cx + rx} ${bot} L${cx + rx} ${top}`} fill={fill} stroke={INK} strokeWidth={1.7} />
        <ellipse cx={cx} cy={top} rx={rx} ry={ry} fill={`${accent}1F`} stroke={INK} strokeWidth={1.7} />
        <path d={`M${cx - rx} ${bot} A${rx} ${ry} 0 0 1 ${cx + rx} ${bot}`} fill="none" stroke={SOFT} strokeWidth={1.2} strokeDasharray={dash} />
        {L.radius && (
          <g>
            <line x1={cx} y1={top} x2={cx + rx} y2={top} stroke={INK} strokeWidth={1.3} />
            <circle cx={cx} cy={top} r={2.5} fill={INK} />
            <T x={cx + rx / 2} y={top - 12}>
              {L.radius}
            </T>
          </g>
        )}
        {L.height && (
          <T x={cx + rx + 26} y={(top + bot) / 2} anchor="start">
            {L.height}
          </T>
        )}
      </Svg>
    );
  }
  if (shape === "cone" || shape === "pyramid") {
    const apex: Pt = [cx, 50];
    const bot = 235;
    if (shape === "pyramid") {
      const A: Pt = [cx - 110, bot];
      const B: Pt = [cx + 70, bot];
      const C: Pt = [cx + 120, bot - 50];
      const D: Pt = [cx - 60, bot - 50];
      const base: Pt = [cx + 5, bot - 25];
      return (
        <Svg w={W} h={H} title="Square-based pyramid">
          <polygon points={[A, B, apex].map((p) => p.join(",")).join(" ")} fill={fill} />
          <polygon points={[B, C, apex].map((p) => p.join(",")).join(" ")} fill={`${accent}1F`} />
          {line(A, B)}
          {line(B, C)}
          {line(A, apex)}
          {line(B, apex)}
          {line(C, apex)}
          {line(C, D, true)}
          {line(D, A, true)}
          {line(D, apex, true)}
          {L.height && (
            <g>
              {line(apex, base, true)}
              <T x={apex[0] + 14} y={(apex[1] + base[1]) / 2} anchor="start">
                {L.height}
              </T>
            </g>
          )}
          {L.length && <SideLabel a={A} b={B} inside={apex} text={L.length} />}
          {L.width && <SideLabel a={B} b={C} inside={[cx - 40, bot - 25]} text={L.width} />}
        </Svg>
      );
    }
    return (
      <Svg w={W} h={H} title="Cone">
        <path d={`M${apex[0]} ${apex[1]} L${cx - rx} ${bot} A${rx} ${ry} 0 0 0 ${cx + rx} ${bot} Z`} fill={fill} stroke={INK} strokeWidth={1.7} strokeLinejoin="round" />
        <path d={`M${cx - rx} ${bot} A${rx} ${ry} 0 0 1 ${cx + rx} ${bot}`} fill="none" stroke={SOFT} strokeWidth={1.2} strokeDasharray={dash} />
        {L.height && (
          <g>
            {line(apex, [cx, bot], true)}
            <RightMark v={[cx, bot]} p={apex} q={[cx + rx, bot]} s={9} />
            <T x={cx - 14} y={(apex[1] + bot) / 2} anchor="end">
              {L.height}
            </T>
          </g>
        )}
        {L.radius && (
          <g>
            <line x1={cx} y1={bot} x2={cx + rx} y2={bot} stroke={INK} strokeWidth={1.3} />
            <T x={cx + rx / 2} y={bot + 16}>
              {L.radius}
            </T>
          </g>
        )}
        {L.slant && <SideLabel a={apex} b={[cx + rx, bot]} inside={[cx, bot - 60]} text={L.slant} />}
      </Svg>
    );
  }
  // sphere / hemisphere
  const cy = shape === "hemisphere" ? 200 : 150;
  const r = 110;
  return (
    <Svg w={W} h={H} title={shape === "hemisphere" ? "Hemisphere" : "Sphere"}>
      {shape === "hemisphere" ? (
        <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} A${r} 26 0 0 1 ${cx - r} ${cy}`} fill={fill} stroke={INK} strokeWidth={1.7} />
      ) : (
        <circle cx={cx} cy={cy} r={r} fill={fill} stroke={INK} strokeWidth={1.7} />
      )}
      {shape === "hemisphere" ? (
        <path d={`M${cx - r} ${cy} A${r} 26 0 0 0 ${cx + r} ${cy}`} fill="none" stroke={INK} strokeWidth={1.4} />
      ) : (
        <>
          <path d={`M${cx - r} ${cy} A${r} 26 0 0 0 ${cx + r} ${cy}`} fill="none" stroke={INK} strokeWidth={1.3} />
          <path d={`M${cx - r} ${cy} A${r} 26 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={SOFT} strokeWidth={1.1} strokeDasharray={dash} />
        </>
      )}
      <circle cx={cx} cy={cy} r={2.5} fill={INK} />
      <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke={INK} strokeWidth={1.3} />
      {L.radius && (
        <T x={cx + r / 2} y={cy - 12}>
          {L.radius}
        </T>
      )}
    </Svg>
  );
};

/* ================= Number line ================= */

export type NumberLineSpec = {
  kind: "numberline";
  min: number;
  max: number;
  step?: number;
  points?: { value: number; label?: string; open?: boolean }[];
  intervals?: { from: number; to: number; openFrom?: boolean; openTo?: boolean }[];
  hideNumbers?: boolean;
};

export const NumberLineFigure: React.FC<{ spec: NumberLineSpec; accent: string }> = ({ spec, accent }) => {
  const W = 460;
  const H = 110;
  const min = Number(spec.min);
  const max = Number(spec.max);
  if (!(max > min)) throw new Error("Number line needs min < max.");
  const step = spec.step && spec.step > 0 ? spec.step : Math.max(1, Math.round((max - min) / 10));
  const x = (v: number) => 30 + ((v - min) / (max - min)) * (W - 60);
  const y = 60;
  const ticks: number[] = [];
  for (let v = min; v <= max + 1e-9 && ticks.length < 60; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return (
    <Svg w={W} h={H} title="Number line">
      <line x1={12} y1={y} x2={W - 12} y2={y} stroke={INK} strokeWidth={1.6} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      {ticks.map((v) => (
        <g key={v}>
          <line x1={x(v)} y1={y - 7} x2={x(v)} y2={y + 7} stroke={INK} strokeWidth={1.3} />
          {!spec.hideNumbers && (
            <T x={x(v)} y={y + 22} size={12} halo={false}>
              {nice(v)}
            </T>
          )}
        </g>
      ))}
      {(spec.intervals ?? []).map((iv, i) => (
        <g key={i}>
          <line x1={x(iv.from)} y1={y - 16} x2={x(iv.to)} y2={y - 16} stroke={accent} strokeWidth={3} />
          {[
            [iv.from, iv.openFrom],
            [iv.to, iv.openTo],
          ].map(([v, open], j) => (
            <circle key={j} cx={x(v as number)} cy={y - 16} r={5} fill={open ? "#FFFFFF" : accent} stroke={accent} strokeWidth={2} />
          ))}
        </g>
      ))}
      {(spec.points ?? []).map((p, i) => (
        <g key={`p${i}`}>
          <circle cx={x(p.value)} cy={y} r={5} fill={p.open ? "#FFFFFF" : accent} stroke={accent} strokeWidth={2} />
          {p.label && (
            <T x={x(p.value)} y={y - 20} size={12} color={accent} weight={600}>
              {p.label}
            </T>
          )}
        </g>
      ))}
    </Svg>
  );
};

/* ================= Graph of functions / motion graphs ================= */

export type GraphSpec = {
  kind: "graph";
  x?: [number, number];
  y?: [number, number];
  functions?: { expr: string; label?: string; domain?: [number, number]; dashed?: boolean }[];
  points?: { x: number; y: number; label?: string; open?: boolean }[];
  segments?: { from: [number, number]; to: [number, number]; dashed?: boolean; label?: string }[];
  xLabel?: string;
  yLabel?: string;
  grid?: boolean;
  /** empty axes/grid for students to draw on */
  blank?: boolean;
  xStep?: number;
  yStep?: number;
};

const niceStep = (span: number) => {
  const raw = span / 10;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
};

export const GraphFigure: React.FC<{ spec: GraphSpec; accent: string }> = ({ spec, accent }) => {
  const W = 440;
  const H = 360;
  const pad = { l: 44, r: 18, t: 18, b: 40 };
  const [x0, x1] = spec.x ?? [-5, 5];
  const [y0, y1] = spec.y ?? [-5, 5];
  if (!(x1 > x0 && y1 > y0)) throw new Error("Graph needs increasing x and y ranges.");
  const sx = (v: number) => pad.l + ((v - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const sy = (v: number) => H - pad.b - ((v - y0) / (y1 - y0)) * (H - pad.t - pad.b);
  const xs = spec.xStep ?? niceStep(x1 - x0);
  const ys = spec.yStep ?? niceStep(y1 - y0);
  const gx: number[] = [];
  for (let v = Math.ceil(x0 / xs) * xs; v <= x1 + 1e-9; v += xs) gx.push(Math.round(v * 1e6) / 1e6);
  const gy: number[] = [];
  for (let v = Math.ceil(y0 / ys) * ys; v <= y1 + 1e-9; v += ys) gy.push(Math.round(v * 1e6) / 1e6);
  const axX = y0 <= 0 && y1 >= 0 ? sy(0) : sy(y0);
  const axY = x0 <= 0 && x1 >= 0 ? sx(0) : sx(x0);
  const colors = [accent, "#DC2626", "#059669", "#7C3AED"];

  const curves = spec.blank
    ? []
    : (spec.functions ?? []).map((fn, i) => {
        const f = compile(fn.expr);
        if (!f) return { d: "", label: fn.label ?? fn.expr, color: colors[i % colors.length], end: null as Pt | null, dashed: fn.dashed };
        const [a, b] = fn.domain ?? [x0, x1];
        const N = 400;
        let d = "";
        let pen = false;
        let last: Pt | null = null;
        for (let k = 0; k <= N; k++) {
          const xv = a + ((b - a) * k) / N;
          const yv = f(xv);
          const ok = Number.isFinite(yv) && yv >= y0 - (y1 - y0) && yv <= y1 + (y1 - y0);
          if (!ok) {
            pen = false;
            continue;
          }
          const p: Pt = [sx(xv), sy(Math.max(y0 - 1e-3, Math.min(y1 + 1e-3, yv)))];
          if (last && Math.abs(p[1] - last[1]) > H) pen = false;
          d += `${pen ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)} `;
          pen = yv >= y0 && yv <= y1;
          if (yv >= y0 && yv <= y1) last = p;
        }
        return { d, label: fn.label ?? `y = ${fn.expr.replace(/^y\s*=\s*/, "").replace(/\*/g, "").replace(/\^2/g, "²").replace(/\^3/g, "³").replace(/-/g, " − ").replace(/\+/g, " + ").replace(/\s+/g, " ").trim()}`, color: colors[i % colors.length], end: last, dashed: fn.dashed };
      });

  return (
    <Svg w={W} h={H} title="Graph">
      <defs>
        <clipPath id="plot">
          <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} />
        </clipPath>
      </defs>
      {spec.grid !== false && (
        <g>
          {gx.map((v) => (
            <line key={`gx${v}`} x1={sx(v)} y1={pad.t} x2={sx(v)} y2={H - pad.b} stroke={GRID} strokeWidth={1} />
          ))}
          {gy.map((v) => (
            <line key={`gy${v}`} x1={pad.l} y1={sy(v)} x2={W - pad.r} y2={sy(v)} stroke={GRID} strokeWidth={1} />
          ))}
        </g>
      )}
      <line x1={pad.l - 4} y1={axX} x2={W - pad.r + 6} y2={axX} stroke={INK} strokeWidth={1.4} markerEnd="url(#arrow)" />
      <line x1={axY} y1={H - pad.b + 4} x2={axY} y2={pad.t - 6} stroke={INK} strokeWidth={1.4} markerEnd="url(#arrow)" />
      {gx.map((v) =>
        v === 0 && x0 < 0 ? null : (
          <T key={`lx${v}`} x={sx(v)} y={axX + 13} size={10.5} color={SOFT} halo>
            {nice(v)}
          </T>
        ),
      )}
      {gy.map((v) =>
        v === 0 && y0 < 0 ? null : (
          <T key={`ly${v}`} x={axY - 7} y={sy(v)} size={10.5} color={SOFT} anchor="end" halo>
            {nice(v)}
          </T>
        ),
      )}
      {x0 < 0 && y0 < 0 && (
        <T x={axY - 7} y={axX + 12} size={10.5} color={SOFT} anchor="end">
          0
        </T>
      )}
      <g clipPath="url(#plot)">
        {curves.map((c, i) => (
          <path key={i} d={c.d} fill="none" stroke={c.color} strokeWidth={2.2} strokeDasharray={c.dashed ? "7 5" : undefined} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {!spec.blank &&
          (spec.segments ?? []).map((s, i) => (
            <line key={`s${i}`} x1={sx(s.from[0])} y1={sy(s.from[1])} x2={sx(s.to[0])} y2={sy(s.to[1])} stroke={colors[0]} strokeWidth={2.2} strokeDasharray={s.dashed ? "6 5" : undefined} strokeLinecap="round" />
          ))}
      </g>
      {curves.length > 0 && (
        <g>
          <rect x={pad.l + 8} y={pad.t + 6} width={Math.max(...curves.map((c) => c.label.length)) * 6.6 + 40} height={curves.length * 18 + 8} rx={6} fill="#FFFFFF" stroke={GRID} />
          {curves.map((c, i) => (
            <g key={`cl${i}`}>
              <line x1={pad.l + 16} y1={pad.t + 19 + i * 18} x2={pad.l + 34} y2={pad.t + 19 + i * 18} stroke={c.color} strokeWidth={2.4} strokeDasharray={c.dashed ? "5 4" : undefined} />
              <T x={pad.l + 40} y={pad.t + 19 + i * 18} size={11.5} anchor="start" color={INK} halo={false}>
                {c.label}
              </T>
            </g>
          ))}
        </g>
      )}
      {!spec.blank &&
        (spec.segments ?? []).map((s, i) =>
          s.label ? (
            <T key={`sl${i}`} x={(sx(s.from[0]) + sx(s.to[0])) / 2} y={(sy(s.from[1]) + sy(s.to[1])) / 2 - 12} size={12} color={colors[0]} weight={600}>
              {s.label}
            </T>
          ) : null,
        )}
      {!spec.blank &&
        (spec.points ?? []).map((p, i) => (
          <g key={`p${i}`}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={4} fill={p.open ? "#FFFFFF" : INK} stroke={INK} strokeWidth={1.6} />
            {p.label && (
              <T x={sx(p.x) + 8} y={sy(p.y) - 12} size={12} anchor="start" weight={600}>
                {p.label}
              </T>
            )}
          </g>
        ))}
      {spec.xLabel && (
        <T x={W - pad.r} y={H - 12} size={12} anchor="end" color={SOFT}>
          {spec.xLabel}
        </T>
      )}
      {spec.yLabel && (
        <T x={pad.l + 6} y={pad.t - 4} size={12} anchor="start" color={SOFT}>
          {spec.yLabel}
        </T>
      )}
    </Svg>
  );
};

