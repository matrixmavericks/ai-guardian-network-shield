// Canvas drawing helpers shared by every simulation.

export type Ctx = CanvasRenderingContext2D;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const TAU = Math.PI * 2;
export const deg = (r: number) => (r * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;

/** Mix two hex colours (t = 0 → a, 1 → b). */
export const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(lerp(v, y[i], t)).toString(16).padStart(2, "0")).join("")}`;
};
export const alpha = (hex: string, a: number) => `${hex}${Math.round(clamp(a, 0, 1) * 255).toString(16).padStart(2, "0")}`;

export const roundRect = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
};

/** An arrow from (x1,y1) to (x2,y2) with an optional label at its tip. */
export const arrow = (ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, o: { width?: number; head?: number; label?: string; dash?: number[]; labelColor?: string; font?: number } = {}) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 0.5) return;
  const w = o.width ?? 2.5;
  const head = Math.min(o.head ?? 10, len * 0.6);
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - Math.cos(a) * head * 0.8, y2 - Math.sin(a) * head * 0.8);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a - 0.42) * head, y2 - Math.sin(a - 0.42) * head);
  ctx.lineTo(x2 - Math.cos(a + 0.42) * head, y2 - Math.sin(a + 0.42) * head);
  ctx.closePath();
  ctx.fill();
  if (o.label) {
    const off = 14;
    label(ctx, o.label, x2 + Math.cos(a) * off, y2 + Math.sin(a) * off, { color: o.labelColor ?? color, size: o.font ?? 12, weight: 600, halo: true });
  }
  ctx.restore();
};

let haloColor = "rgba(5,10,24,0.85)";
let quiet = false;
/** Thumbnails draw without text, so the small pictures stay clean. */
export const setQuiet = (q: boolean) => { quiet = q; };
export const setHalo = (c: string) => { haloColor = c; };

export const label = (ctx: Ctx, text: string, x: number, y: number, o: { color?: string; size?: number; weight?: number; align?: CanvasTextAlign; base?: CanvasTextBaseline; halo?: boolean; font?: string } = {}) => {
  if (quiet) return;
  ctx.save();
  ctx.font = `${o.weight ?? 500} ${o.size ?? 12}px ${o.font ?? "Inter, ui-sans-serif, system-ui, sans-serif"}`;
  ctx.textAlign = o.align ?? "center";
  ctx.textBaseline = o.base ?? "middle";
  if (o.halo) {
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = haloColor;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = o.color ?? "#e2e8f0";
  ctx.fillText(text, x, y);
  ctx.restore();
};

/** A soft radial glow (additive in dark scenes). */
export const glow = (ctx: Ctx, x: number, y: number, r: number, color: string, strength = 0.6) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, alpha(color, strength));
  g.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
};

/** A shaded sphere (ball, bob, particle). */
export const sphere = (ctx: Ctx, x: number, y: number, r: number, color: string, o: { light?: string; shadow?: boolean } = {}) => {
  if (o.shadow) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = r * 0.8;
    ctx.shadowOffsetY = r * 0.3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, o.light ?? mix(color, "#ffffff", 0.65));
  g.addColorStop(0.45, color);
  g.addColorStop(1, mix(color, "#000000", 0.45));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
};

/** "Nice" tick values covering [min, max]. */
export const niceTicks = (min: number, max: number, count = 6) => {
  if (!isFinite(min) || !isFinite(max) || min === max) return [min];
  const span = max - min;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
};
export const fmt = (v: number, d = 2) => {
  if (!isFinite(v)) return "–";
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(2).replace("e+", "×10^").replace("e-", "×10^-");
  return Number(v.toFixed(d)).toLocaleString(undefined, { maximumFractionDigits: d });
};

/** Maps a data rectangle onto a screen rectangle, with axes, grid and ticks. */
export class Plot {
  constructor(public x0: number, public y0: number, public w: number, public h: number, public xmin: number, public xmax: number, public ymin: number, public ymax: number) {}
  X = (v: number) => this.x0 + ((v - this.xmin) / (this.xmax - this.xmin)) * this.w;
  Y = (v: number) => this.y0 + this.h - ((v - this.ymin) / (this.ymax - this.ymin)) * this.h;
  invX = (px: number) => this.xmin + ((px - this.x0) / this.w) * (this.xmax - this.xmin);
  invY = (py: number) => this.ymin + ((this.y0 + this.h - py) / this.h) * (this.ymax - this.ymin);
  axes(ctx: Ctx, t: { grid: string; axis: string; mute: string }, o: { xLabel?: string; yLabel?: string; xTicks?: number; yTicks?: number; xFmt?: (v: number) => string; yFmt?: (v: number) => string; origin?: boolean } = {}) {
    ctx.save();
    ctx.lineWidth = 1;
    const xt = niceTicks(this.xmin, this.xmax, o.xTicks ?? 6);
    const yt = niceTicks(this.ymin, this.ymax, o.yTicks ?? 5);
    ctx.strokeStyle = t.grid;
    ctx.beginPath();
    for (const v of xt) { const x = Math.round(this.X(v)) + 0.5; ctx.moveTo(x, this.y0); ctx.lineTo(x, this.y0 + this.h); }
    for (const v of yt) { const y = Math.round(this.Y(v)) + 0.5; ctx.moveTo(this.x0, y); ctx.lineTo(this.x0 + this.w, y); }
    ctx.stroke();
    ctx.strokeStyle = t.axis;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    const ax = o.origin && this.xmin < 0 && this.xmax > 0 ? this.X(0) : this.x0;
    const ay = o.origin && this.ymin < 0 && this.ymax > 0 ? this.Y(0) : this.y0 + this.h;
    ctx.moveTo(this.x0, ay); ctx.lineTo(this.x0 + this.w, ay);
    ctx.moveTo(ax, this.y0); ctx.lineTo(ax, this.y0 + this.h);
    ctx.stroke();
    const xf = o.xFmt ?? ((v: number) => fmt(v, 2));
    const yf = o.yFmt ?? ((v: number) => fmt(v, 2));
    for (const v of xt) label(ctx, xf(v), this.X(v), ay + 12, { color: t.mute, size: 10.5 });
    for (const v of yt) label(ctx, yf(v), ax - 6, this.Y(v), { color: t.mute, size: 10.5, align: "right" });
    if (o.xLabel) label(ctx, o.xLabel, this.x0 + this.w, ay + 26, { color: t.mute, size: 11, align: "right", weight: 600 });
    if (o.yLabel) label(ctx, o.yLabel, ax + 6, this.y0 - 10, { color: t.mute, size: 11, align: "left", weight: 600 });
    ctx.restore();
  }
  clip(ctx: Ctx) { ctx.beginPath(); ctx.rect(this.x0, this.y0, this.w, this.h); ctx.clip(); }
  /** y = f(x) across the plot, broken at gaps and asymptotes */
  fn(ctx: Ctx, f: (x: number) => number, color: string, width = 2.5, dash?: number[]) {
    ctx.save();
    this.clip(ctx);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    let pen = false;
    let prevY = 0;
    const n = Math.max(200, Math.round(this.w));
    for (let i = 0; i <= n; i++) {
      const x = this.xmin + ((this.xmax - this.xmin) * i) / n;
      const y = f(x);
      if (!isFinite(y)) { pen = false; continue; }
      const py = this.Y(y);
      if (pen && Math.abs(py - prevY) > this.h * 2) pen = false;
      if (pen) ctx.lineTo(this.X(x), py); else ctx.moveTo(this.X(x), py);
      pen = true;
      prevY = py;
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** Least-squares straight line through points. */
export const linearFit = (pts: [number, number][]) => {
  const n = pts.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y; }
  const d = n * sxx - sx * sx;
  if (Math.abs(d) < 1e-12) return null;
  const m = (n * sxy - sx * sy) / d;
  const c = (sy - m * sx) / n;
  const r = (n * sxy - sx * sy) / Math.sqrt(d * (n * syy - sy * sy) || 1);
  return { m, c, r2: r * r };
};

/** Gaussian random number (Box-Muller). */
export const gauss = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
};
