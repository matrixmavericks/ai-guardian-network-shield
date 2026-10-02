import type { SimTheme } from "../kit/core";
import { Plot, label, niceTicks, type Ctx } from "../kit/draw";

// Graph paper with equal scales on both axes, shared by the maths simulations.

export type View = { cx: number; cy: number; span: number };

/** A plot covering the stage, `span` units wide, centred on (cx, cy), same scale both ways. */
export function paper(ctx: Ctx, w: number, h: number, t: SimTheme, v: View, o: { top?: number; bottom?: number; left?: number; right?: number } = {}) {
  const l = o.left ?? 0, r = o.right ?? 0, tp = o.top ?? 0, b = o.bottom ?? 0;
  const pw = w - l - r, ph = h - tp - b;
  const unit = pw / v.span;
  const xr = v.span / 2, yr = ph / unit / 2;
  const p = new Plot(l, tp, pw, ph, v.cx - xr, v.cx + xr, v.cy - yr, v.cy + yr);
  ctx.fillStyle = t.dark ? "#08101f" : "#fbfcfe";
  ctx.fillRect(l, tp, pw, ph);
  // Minor and major grid
  const step = niceTicks(0, v.span, 10)[1] || 1;
  const minor = step / (step >= 1 && Number.isInteger(step) && step <= 2 ? step : 5);
  ctx.lineWidth = 1;
  for (const [s, col] of [[minor, t.dark ? "rgba(148,163,184,0.06)" : "rgba(15,23,42,0.04)"], [step, t.dark ? "rgba(148,163,184,0.14)" : "rgba(15,23,42,0.09)"]] as const) {
    ctx.strokeStyle = col;
    ctx.beginPath();
    for (let x = Math.ceil(p.xmin / s) * s; x <= p.xmax; x += s) { const X = Math.round(p.X(x)) + 0.5; ctx.moveTo(X, tp); ctx.lineTo(X, tp + ph); }
    for (let y = Math.ceil(p.ymin / s) * s; y <= p.ymax; y += s) { const Y = Math.round(p.Y(y)) + 0.5; ctx.moveTo(l, Y); ctx.lineTo(l + pw, Y); }
    ctx.stroke();
  }
  // Axes with ticks
  const ax = Math.min(Math.max(p.X(0), l), l + pw), ay = Math.min(Math.max(p.Y(0), tp), tp + ph);
  ctx.strokeStyle = t.axis; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(l, ay); ctx.lineTo(l + pw, ay); ctx.moveTo(ax, tp); ctx.lineTo(ax, tp + ph); ctx.stroke();
  for (let x = Math.ceil(p.xmin / step) * step; x <= p.xmax; x += step) {
    if (Math.abs(x) < step / 2) continue;
    label(ctx, fmtN(x), p.X(x), Math.min(ay + 12, tp + ph - 8), { color: t.mute, size: 10.5 });
  }
  for (let y = Math.ceil(p.ymin / step) * step; y <= p.ymax; y += step) {
    if (Math.abs(y) < step / 2) continue;
    label(ctx, fmtN(y), Math.max(ax - 6, l + 14), p.Y(y), { color: t.mute, size: 10.5, align: "right" });
  }
  label(ctx, "x", l + pw - 10, ay - 10, { color: t.mute, size: 12, weight: 600, font: "Georgia, serif" });
  label(ctx, "y", ax + 10, tp + 12, { color: t.mute, size: 12, weight: 600, font: "Georgia, serif" });
  return p;
}

/** 3 → "3", 2.5 → "2.5", −0.333… → "−0.33" (true minus sign). */
export const fmtN = (v: number, d = 2) => {
  if (!isFinite(v)) return "∞";
  const r = Math.round(v * 10 ** d) / 10 ** d;
  const s = Math.abs(r).toString();
  return (r < 0 ? "−" : "") + s;
};
/** "+ 3" / "− 3" for building equations; empty when zero. */
export const term = (v: number, suffix = "", d = 2) => (Math.abs(v) < 1e-9 ? "" : ` ${v < 0 ? "−" : "+"} ${fmtN(Math.abs(v), d)}${suffix}`);
/** Coefficient in front of a variable: 1 → "", −1 → "−", 2 → "2". */
export const coef = (v: number, d = 2) => (Math.abs(v - 1) < 1e-9 ? "" : Math.abs(v + 1) < 1e-9 ? "−" : fmtN(v, d));

/** A point the learner can drag. */
export function handle(ctx: Ctx, x: number, y: number, color: string, active = false) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.18;
  ctx.beginPath(); ctx.arc(x, y, active ? 18 : 14, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

/** A labelled point (vertex, root, intercept). */
export function dot(ctx: Ctx, x: number, y: number, color: string, text: string | null, t: SimTheme, dir: "above" | "below" | "right" | "left" = "above") {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = t.dark ? "#08101f" : "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
  if (!text) return;
  const [dx, dy, al] = dir === "above" ? [0, -16, "center"] : dir === "below" ? [0, 18, "center"] : dir === "right" ? [10, 0, "left"] : [-10, 0, "right"];
  label(ctx, text, x + dx, y + dy, { color, size: 12, weight: 600, align: al as CanvasTextAlign, halo: true });
}
