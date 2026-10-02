import React, { useMemo, useRef, useState } from "react";
import { Download, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Stage, themeNow, useSimTheme } from "./core";
import { Plot, fmt, label, linearFit, type Ctx } from "./draw";
import { Choice, Key } from "./controls";

// Live time graphs and the data table with a scatter plot and line of best fit.

export type Series = { label: string; color: string; dash?: boolean };

/**
 * A scrolling graph of values over time. `data.current` is a list of rows
 * [t, v1, v2, …] the simulation appends to.
 */
export const TimeGraph: React.FC<{ data: React.MutableRefObject<number[][]>; series: Series[]; yLabel: string; xLabel?: string; window?: number; fixed?: [number, number]; className?: string; title?: string }> = ({ data, series, yLabel, xLabel = "t / s", window = 10, fixed, className, title }) => {
  const range = useRef<[number, number]>(fixed ?? [-1, 1]);
  const theme = useSimTheme();
  return (
    <div className={cn("rounded-2xl border border-lp-line bg-lp-surface/70 p-3", className)}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        {title && <p className="text-[12.5px] font-medium text-white">{title}</p>}
        <Key items={series.map((s) => ({ label: s.label, color: s.color, dash: s.dash }))} />
      </div>
      <div className="h-[150px]">
        <Stage
          label={`${title ?? yLabel} against time`}
          render={(ctx, w, h) => {
            const t = themeNow();
            const rows = data.current;
            const tmax = rows.length ? rows[rows.length - 1][0] : 0;
            const t0 = Math.max(0, tmax - window);
            let lo = Infinity, hi = -Infinity;
            for (const r of rows) if (r[0] >= t0) for (let i = 1; i < r.length; i++) { if (isFinite(r[i])) { lo = Math.min(lo, r[i]); hi = Math.max(hi, r[i]); } }
            if (!fixed && isFinite(lo)) {
              const pad = Math.max((hi - lo) * 0.15, Math.abs(hi) * 0.05, 1e-6);
              const want: [number, number] = [lo - pad, hi + pad];
              // Grow at once, shrink slowly, so the axes don't jitter
              range.current = [want[0] < range.current[0] ? want[0] : range.current[0] + (want[0] - range.current[0]) * 0.03, want[1] > range.current[1] ? want[1] : range.current[1] + (want[1] - range.current[1]) * 0.03];
            }
            const [ymin, ymax] = fixed ?? range.current;
            const p = new Plot(44, 22, w - 56, h - 44, t0, Math.max(t0 + window, tmax), ymin, ymax);
            p.axes(ctx, t, { xLabel, yLabel, xTicks: 5, yTicks: 4, origin: true });
            ctx.save();
            p.clip(ctx);
            series.forEach((s, si) => {
              ctx.strokeStyle = s.color;
              ctx.lineWidth = 2;
              ctx.lineJoin = "round";
              if (s.dash) ctx.setLineDash([5, 4]); else ctx.setLineDash([]);
              ctx.beginPath();
              let pen = false;
              for (const r of rows) {
                if (r[0] < t0 - 0.1) continue;
                const v = r[si + 1];
                if (!isFinite(v)) { pen = false; continue; }
                if (pen) ctx.lineTo(p.X(r[0]), p.Y(v)); else ctx.moveTo(p.X(r[0]), p.Y(v));
                pen = true;
              }
              ctx.stroke();
            });
            ctx.restore();
            if (!rows.length) label(ctx, "Press play to start", w / 2, h / 2, { color: theme.mute, size: 12 });
          }}
        />
      </div>
    </div>
  );
};

/* ---------- Data table, scatter plot, line of best fit ---------- */

export type Row = Record<string, number>;
type Tf = "x" | "x²" | "√x" | "1/x" | "log x";
const TF: Record<Tf, (v: number) => number> = { x: (v) => v, "x²": (v) => v * v, "√x": (v) => Math.sqrt(v), "1/x": (v) => 1 / v, "log x": (v) => Math.log10(v) };
const TfChoice = Choice<Tf>;
const tfName = (tf: Tf, col: string) => (tf === "x" ? col : tf === "x²" ? `(${col})²` : tf === "√x" ? `√(${col})` : tf === "1/x" ? `1/(${col})` : `log(${col})`);

export const DataPanel: React.FC<{ rows: Row[]; onClear: () => void; onRemove: (i: number) => void; fileName: string }> = ({ rows, onClear, onRemove, fileName }) => {
  const cols = useMemo(() => [...new Set(rows.flatMap((r) => Object.keys(r)))], [rows]);
  const [xc, setX] = useState<string>("");
  const [yc, setY] = useState<string>("");
  const [xt, setXt] = useState<Tf>("x");
  const [yt, setYt] = useState<Tf>("x");
  const xKey = cols.includes(xc) ? xc : cols[0] ?? "";
  const yKey = cols.includes(yc) ? yc : cols[1] ?? cols[0] ?? "";
  const pts = rows.map((r) => [TF[xt](r[xKey]), TF[yt](r[yKey])] as [number, number]).filter(([a, b]) => isFinite(a) && isFinite(b));
  const fit = linearFit(pts);

  const csv = () => {
    const lines = [cols.join(","), ...rows.map((r) => cols.map((c) => (r[c] ?? "")).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-lp-line p-5 text-center">
        <p className="text-[14px] font-medium text-white">No measurements yet</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-lp-mute">Press <span className="font-medium text-lp-soft">Record</span> to save the current values as a row. Change one variable at a time, record a few rows, then plot them here and find the line of best fit.</p>
      </div>
    );
  }
  const tfOpts = (Object.keys(TF) as Tf[]).map((v) => ({ value: v, label: v }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[12px] text-lp-mute">x axis
          <select value={xKey} onChange={(e) => setX(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-lp-line bg-lp-deep/60 px-2 text-[13px] text-white outline-none">{cols.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="text-[12px] text-lp-mute">y axis
          <select value={yKey} onChange={(e) => setY(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-lp-line bg-lp-deep/60 px-2 text-[13px] text-white outline-none">{cols.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TfChoice value={xt} onChange={setXt} options={tfOpts} wrap />
        <TfChoice value={yt} onChange={setYt} options={tfOpts} wrap />
      </div>
      <div className="h-[200px] rounded-xl border border-lp-line bg-lp-deep/40">
        <Stage
          label={`Scatter plot of ${tfName(yt, yKey)} against ${tfName(xt, xKey)}`}
          render={(ctx: Ctx, w, h) => {
            const t = themeNow();
            if (!pts.length) return;
            let [x0, x1, y0, y1] = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))];
            x0 = Math.min(0, x0); y0 = Math.min(0, y0);
            if (x1 === x0) x1 = x0 + 1;
            if (y1 === y0) y1 = y0 + 1;
            const p = new Plot(46, 14, w - 60, h - 40, x0, x1 + (x1 - x0) * 0.08, y0, y1 + (y1 - y0) * 0.1);
            p.axes(ctx, t, { xLabel: tfName(xt, xKey), yLabel: tfName(yt, yKey), xTicks: 4, yTicks: 4 });
            if (fit && pts.length >= 2) p.fn(ctx, (x) => fit.m * x + fit.c, t.c.orange, 2, [6, 4]);
            for (const [a, b] of pts) {
              ctx.fillStyle = t.c.blue;
              ctx.beginPath();
              ctx.arc(p.X(a), p.Y(b), 4.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }}
        />
      </div>
      {fit && pts.length >= 2 && (
        <p className="rounded-xl bg-lp-raised/70 px-3 py-2 text-[12.5px] text-lp-soft">
          Best fit: <span className="font-semibold text-white">{tfName(yt, yKey)} = {fmt(fit.m, 4)} × {tfName(xt, xKey)} {fit.c >= 0 ? "+" : "−"} {fmt(Math.abs(fit.c), 4)}</span>
          <span className="ml-2 text-lp-mute">r² = {fit.r2.toFixed(4)}</span>
        </p>
      )}
      <div className="max-h-[220px] overflow-auto rounded-xl border border-lp-line">
        <table className="w-full text-[12px] tabular-nums">
          <thead className="sticky top-0 bg-lp-raised text-lp-mute"><tr><th className="px-2 py-1.5 text-left font-medium">#</th>{cols.map((c) => <th key={c} className="whitespace-nowrap px-2 py-1.5 text-right font-medium">{c}</th>)}<th /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-lp-line">
                <td className="px-2 py-1 text-lp-mute">{i + 1}</td>
                {cols.map((c) => <td key={c} className="px-2 py-1 text-right text-white">{r[c] === undefined ? "" : fmt(r[c], 3)}</td>)}
                <td className="px-1 text-right"><button type="button" onClick={() => onRemove(i)} aria-label={`Remove row ${i + 1}`} className="text-lp-mute hover:text-white"><X className="h-3.5 w-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={csv} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:text-white"><Download className="h-4 w-4" /> CSV</button>
        <button type="button" onClick={onClear} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] text-lp-mute hover:text-lp-red"><Trash2 className="h-4 w-4" /> Clear</button>
      </div>
    </div>
  );
};
