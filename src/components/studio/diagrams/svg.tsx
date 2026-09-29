import React from "react";

/** Diagrams are always drawn as ink on paper so they print well. */
export const INK = "#111827";
export const SOFT = "#4B5563";
export const MUTE = "#9CA3AF";
export const GRID = "#E5E7EB";
export const FONT = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';

export type Pt = [number, number];

export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
export const len = (a: Pt) => Math.hypot(a[0], a[1]);
export const unit = (a: Pt): Pt => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
export const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
export const rad = (deg: number) => (deg * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;
export const polar = (r: number, angleDeg: number): Pt => [r * Math.cos(rad(angleDeg)), r * Math.sin(rad(angleDeg))];

/** Fit points into a box of width w (keeping aspect) with padding; y is flipped so maths "up" is up. */
export const fitter = (pts: Pt[], w: number, pad: number, maxH = w * 0.9) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const k = Math.min((w - pad * 2) / spanX, (maxH - pad * 2) / spanY);
  const h = spanY * k + pad * 2;
  const offX = (w - spanX * k) / 2;
  return {
    h,
    k,
    map: (p: Pt): Pt => [offX + (p[0] - minX) * k, h - pad - (p[1] - minY) * k],
  };
};

export const Svg: React.FC<{ w: number; h: number; children: React.ReactNode; title?: string; className?: string }> = ({ w, h, children, title, className }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" className={className} role="img" aria-label={title} style={{ fontFamily: FONT, maxHeight: "100%" }}>
    {title && <title>{title}</title>}
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill={INK} />
      </marker>
      <marker id="arrow-soft" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill={SOFT} />
      </marker>
    </defs>
    {children}
  </svg>
);

/** Text with a white halo so labels stay readable over lines. */
export const T: React.FC<{
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  anchor?: "start" | "middle" | "end";
  weight?: number;
  color?: string;
  italic?: boolean;
  halo?: boolean;
}> = ({ x, y, children, size = 13, anchor = "middle", weight = 500, color = INK, italic, halo = true }) => (
  <text
    x={x}
    y={y}
    fontSize={size}
    textAnchor={anchor}
    dominantBaseline="middle"
    fontWeight={weight}
    fill={color}
    fontStyle={italic ? "italic" : undefined}
    stroke={halo ? "#FFFFFF" : undefined}
    strokeWidth={halo ? 4 : undefined}
    strokeLinejoin="round"
    paintOrder="stroke"
  >
    {children}
  </text>
);

/** Angle arc at vertex v between rays to p and q, with an optional label along the bisector. */
export const AngleMark: React.FC<{ v: Pt; p: Pt; q: Pt; r?: number; label?: string; color?: string; double?: boolean }> = ({ v, p, q, r = 18, label, color = INK, double }) => {
  const a1 = Math.atan2(p[1] - v[1], p[0] - v[0]);
  let a2 = Math.atan2(q[1] - v[1], q[0] - v[0]);
  let d = a2 - a1;
  while (d <= -Math.PI) d += 2 * Math.PI;
  while (d > Math.PI) d -= 2 * Math.PI;
  a2 = a1 + d;
  const arc = (rr: number) => {
    const s: Pt = [v[0] + rr * Math.cos(a1), v[1] + rr * Math.sin(a1)];
    const e: Pt = [v[0] + rr * Math.cos(a2), v[1] + rr * Math.sin(a2)];
    return `M${s[0]} ${s[1]} A${rr} ${rr} 0 0 ${d > 0 ? 1 : 0} ${e[0]} ${e[1]}`;
  };
  const bis = a1 + d / 2;
  const lr = r + 12 + (label && label.length > 3 ? 6 : 0);
  return (
    <g>
      <path d={arc(r)} fill="none" stroke={color} strokeWidth={1.4} />
      {double && <path d={arc(r + 4)} fill="none" stroke={color} strokeWidth={1.4} />}
      {label && (
        <T x={v[0] + lr * Math.cos(bis)} y={v[1] + lr * Math.sin(bis)} size={12} color={color}>
          {label}
        </T>
      )}
    </g>
  );
};

/** Small square marking a right angle at v between directions to p and q. */
export const RightMark: React.FC<{ v: Pt; p: Pt; q: Pt; s?: number; color?: string }> = ({ v, p, q, s = 11, color = INK }) => {
  const u1 = unit(sub(p, v));
  const u2 = unit(sub(q, v));
  const a = add(v, mul(u1, s));
  const b = add(add(v, mul(u1, s)), mul(u2, s));
  const c = add(v, mul(u2, s));
  return <path d={`M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${c[0]} ${c[1]}`} fill="none" stroke={color} strokeWidth={1.3} />;
};

/** Equal-length tick marks across a segment. */
export const Ticks: React.FC<{ a: Pt; b: Pt; n: number; color?: string }> = ({ a, b, n, color = INK }) => {
  const m = mid(a, b);
  const d = unit(sub(b, a));
  const nrm: Pt = [-d[1], d[0]];
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const c = add(m, mul(d, (i - (n - 1) / 2) * 5));
        const p1 = add(c, mul(nrm, 6));
        const p2 = add(c, mul(nrm, -6));
        return <line key={i} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke={color} strokeWidth={1.4} />;
      })}
    </g>
  );
};

/** Label for a side, pushed outward from `inside` (usually the shape's centroid). */
export const SideLabel: React.FC<{ a: Pt; b: Pt; inside: Pt; text: string; color?: string; gap?: number }> = ({ a, b, inside, text, color = INK, gap = 14 }) => {
  const m = mid(a, b);
  const d = unit(sub(b, a));
  let n: Pt = [-d[1], d[0]];
  if ((inside[0] - m[0]) * n[0] + (inside[1] - m[1]) * n[1] > 0) n = mul(n, -1);
  const p = add(m, mul(n, gap));
  return (
    <T x={p[0]} y={p[1]} size={13} color={color}>
      {text}
    </T>
  );
};

export const centroid = (pts: Pt[]): Pt => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

/** Converts "auto"/true/value into display text. */
export const labelOf = (v: unknown, auto: () => string): string | null => {
  if (v === undefined || v === null || v === false || v === "") return null;
  if (v === true || v === "auto") return auto();
  return String(v);
};
