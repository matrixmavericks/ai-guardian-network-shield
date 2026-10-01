import React, { useMemo, useRef, useState } from "react";
import { LineChart, Maximize2, Minus, Plus, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GraphSpec } from "./blocks";
import { compile, type Compiled } from "./math";
import { Card, CardHead, ghost } from "./ui";

const W = 640;
const H = 400;
const COLORS = ["#60A5FA", "#F472B6", "#34D399", "#FBBF24", "#A78BFA", "#F87171"];

const niceStep = (span: number, target = 10) => {
  const raw = span / target;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
};
const fmtNum = (v: number) => (Math.abs(v) < 1e-9 ? "0" : Math.abs(v) >= 1e4 || Math.abs(v) < 1e-3 ? v.toExponential(1) : String(Math.round(v * 1000) / 1000));

export const Graph: React.FC<{ spec: GraphSpec }> = ({ spec }) => {
  const fns = useMemo(() => spec.functions.map((f) => {
    try { return { ...f, c: compile(f.expr) as Compiled | null, error: "" }; } catch (e) { return { ...f, c: null, error: (e as Error).message }; }
  }), [spec.functions]);
  const [params, setParams] = useState<Record<string, number>>(() => Object.fromEntries(Object.entries(spec.params).map(([k, v]) => [k, v[0]])));
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [table, setTable] = useState(false);

  // y range: given, or fitted to the curves at the starting parameters
  const fitY = (x: [number, number]): [number, number] => {
    const ys: number[] = [];
    for (const f of fns) {
      if (!f.c) continue;
      for (let i = 0; i <= 200; i++) {
        const v = f.c.fn({ ...params, x: x[0] + ((x[1] - x[0]) * i) / 200 });
        if (Number.isFinite(v)) ys.push(v);
      }
    }
    spec.points.forEach((p) => ys.push(p.y));
    if (!ys.length) return [-10, 10];
    ys.sort((a, b) => a - b);
    let lo = ys[Math.floor(ys.length * 0.03)], hi = ys[Math.ceil(ys.length * 0.97) - 1];
    if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.12;
    return [Math.min(lo - pad, 0 < lo ? -pad : lo - pad), Math.max(hi + pad, 0 > hi ? pad : hi + pad)];
  };
  const initial = useMemo(() => ({ x: spec.x, y: spec.y ?? fitY(spec.x) }), [spec]); // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setView] = useState(initial);
  const [hover, setHover] = useState<number | null>(null);
  const drag = useRef<{ px: number; py: number; view: typeof view } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const [x0, x1] = view.x;
  const [y0, y1] = view.y;
  const sx = (x: number) => ((x - x0) / (x1 - x0)) * W;
  const sy = (y: number) => H - ((y - y0) / (y1 - y0)) * H;
  const toData = (clientX: number, clientY: number) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: x0 + ((clientX - r.left) / r.width) * (x1 - x0), y: y1 - ((clientY - r.top) / r.height) * (y1 - y0), r };
  };

  const paths = useMemo(() => fns.map((f, i) => {
    if (!f.c || hidden.has(i)) return "";
    const n = 700;
    let d = "";
    let prev: number | null = null;
    const jump = (y1 - y0) * 2;
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n;
      const y = f.c.fn({ ...params, x });
      if (!Number.isFinite(y)) { prev = null; continue; }
      // Lift the pen across gaps and asymptotes (e.g. 1/x) instead of joining them
      const cmd = prev === null || Math.abs(y - prev) > jump ? " M" : " L";
      d += `${cmd}${sx(x).toFixed(1)},${sy(Math.max(y0 - jump, Math.min(y1 + jump, y))).toFixed(1)}`;
      prev = y;
    }
    return d;
  }), [fns, params, hidden, x0, x1, y0, y1]); // eslint-disable-line react-hooks/exhaustive-deps

  const xs = niceStep(x1 - x0);
  const ys = niceStep(y1 - y0, 8);
  const gridX: number[] = [];
  for (let v = Math.ceil(x0 / xs) * xs; v <= x1; v += xs) gridX.push(v);
  const gridY: number[] = [];
  for (let v = Math.ceil(y0 / ys) * ys; v <= y1; v += ys) gridY.push(v);
  const axisY = Math.min(H, Math.max(0, sy(0)));
  const axisX = Math.min(W, Math.max(0, sx(0)));

  const zoom = (f: number) => {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    setView({ x: [cx - ((x1 - x0) / 2) * f, cx + ((x1 - x0) / 2) * f], y: [cy - ((y1 - y0) / 2) * f, cy + ((y1 - y0) / 2) * f] });
  };

  const visible = fns.map((f, i) => ({ f, i })).filter(({ f, i }) => f.c && !hidden.has(i));
  const tableXs = useMemo(() => { const step = niceStep(x1 - x0, 8); const out: number[] = []; for (let v = Math.ceil(x0 / step) * step; v <= x1 && out.length < 12; v += step) out.push(Math.round(v * 1e6) / 1e6); return out; }, [x0, x1]);

  return (
    <Card>
      <CardHead icon={LineChart} kind="Graph" title={spec.title || fns.map((f) => f.label || `y = ${f.expr}`).join(", ")}>
        <button type="button" aria-label="Zoom in" onClick={() => zoom(0.7)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-lp-line text-lp-soft hover:text-white"><Plus className="h-4 w-4" /></button>
        <button type="button" aria-label="Zoom out" onClick={() => zoom(1.4)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-lp-line text-lp-soft hover:text-white"><Minus className="h-4 w-4" /></button>
        <button type="button" aria-label="Reset view" onClick={() => setView(initial)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-lp-line text-lp-soft hover:text-white"><Maximize2 className="h-3.5 w-3.5" /></button>
      </CardHead>

      <div className="relative mt-3 overflow-hidden rounded-xl border border-lp-line bg-lp-deep/70">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full cursor-crosshair touch-none select-none"
          onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, view }; }}
          onPointerMove={(e) => {
            const { x, r } = toData(e.clientX, e.clientY);
            if (drag.current) {
              const d = drag.current;
              const dx = ((e.clientX - d.px) / r.width) * (d.view.x[1] - d.view.x[0]);
              const dy = ((e.clientY - d.py) / r.height) * (d.view.y[1] - d.view.y[0]);
              setView({ x: [d.view.x[0] - dx, d.view.x[1] - dx], y: [d.view.y[0] + dy, d.view.y[1] + dy] });
            } else setHover(x);
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerLeave={() => { drag.current = null; setHover(null); }}
        >
          {gridX.map((v) => <line key={`gx${v}`} x1={sx(v)} x2={sx(v)} y1={0} y2={H} className="stroke-lp-line" strokeWidth={Math.abs(v) < 1e-9 ? 0 : 0.6} />)}
          {gridY.map((v) => <line key={`gy${v}`} y1={sy(v)} y2={sy(v)} x1={0} x2={W} className="stroke-lp-line" strokeWidth={Math.abs(v) < 1e-9 ? 0 : 0.6} />)}
          <line x1={0} x2={W} y1={axisY} y2={axisY} className="stroke-lp-mute" strokeWidth={1.2} />
          <line y1={0} y2={H} x1={axisX} x2={axisX} className="stroke-lp-mute" strokeWidth={1.2} />
          {gridX.filter((v) => Math.abs(v) > 1e-9).map((v) => <text key={`tx${v}`} x={sx(v)} y={Math.min(H - 4, axisY + 14)} textAnchor="middle" className="fill-lp-mute" fontSize={11}>{fmtNum(v)}</text>)}
          {gridY.filter((v) => Math.abs(v) > 1e-9).map((v) => <text key={`ty${v}`} x={Math.max(4, Math.min(W - 30, axisX + 5))} y={sy(v) + 4} className="fill-lp-mute" fontSize={11}>{fmtNum(v)}</text>)}
          {paths.map((d, i) => d && <path key={i} d={d} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />)}
          {spec.points.map((p, i) => (
            <g key={`p${i}`}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={4.5} className="fill-white stroke-lp-blue" strokeWidth={2} />
              {p.label && <text x={sx(p.x) + 8} y={sy(p.y) - 8} className="fill-lp-soft" fontSize={11.5}>{p.label} ({fmtNum(p.x)}, {fmtNum(p.y)})</text>}
            </g>
          ))}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={sx(hover)} x2={sx(hover)} y1={0} y2={H} className="stroke-lp-sky" strokeDasharray="4 4" strokeWidth={1} />
              {visible.map(({ f, i }) => { const y = f.c!.fn({ ...params, x: hover }); return Number.isFinite(y) && y >= y0 && y <= y1 ? <circle key={i} cx={sx(hover)} cy={sy(y)} r={4} fill={COLORS[i % COLORS.length]} /> : null; })}
            </g>
          )}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-lp-line bg-lp-deep/90 px-2.5 py-1.5 text-[12px] text-white backdrop-blur">
            <p className="text-lp-mute">x = {fmtNum(hover)}</p>
            {visible.map(({ f, i }) => { const y = f.c!.fn({ ...params, x: hover }); return <p key={i} style={{ color: COLORS[i % COLORS.length] }}>y = {Number.isFinite(y) ? fmtNum(y) : "undefined"}</p>; })}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {fns.map((f, i) => (
          <button key={i} type="button" onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(i)) n.delete(i); else n.add(i); return n; })} className={cn("flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12.5px]", f.error ? "border-rose-500/50 text-rose-300" : hidden.has(i) ? "border-lp-line text-lp-mute line-through" : "border-lp-line text-white")}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.error ? "transparent" : COLORS[i % COLORS.length] }} />
            {f.label || `y = ${f.expr}`}{f.error ? ` (can't plot: ${f.error})` : ""}
          </button>
        ))}
      </div>

      {Object.keys(spec.params).length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(spec.params).map(([k, [, lo, hi]]) => (
            <label key={k} className="block rounded-xl border border-lp-line px-3 py-2">
              <span className="flex items-center justify-between text-[12.5px]"><span className="font-medium text-white">{k}</span><span className="tabular-nums text-lp-sky">{fmtNum(params[k])}</span></span>
              <input type="range" min={lo} max={hi} step={niceStep(hi - lo, 100)} value={params[k]} onChange={(e) => setParams((p) => ({ ...p, [k]: Number(e.target.value) }))} className="mt-1 w-full accent-[#3B82F6]" />
            </label>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setTable((t) => !t)} className={cn(ghost, table && "border-lp-sky/50 text-white")}><Table2 className="h-4 w-4" /> Table of values</button>
        <span className="text-[11.5px] text-lp-mute">Drag to move · hover to trace</span>
      </div>
      {table && (
        <div className="mt-2 overflow-x-auto rounded-xl border border-lp-line">
          <table className="w-full text-[12.5px]">
            <thead><tr className="border-b border-lp-line text-lp-mute"><th className="px-3 py-1.5 text-left font-medium">x</th>{visible.map(({ f, i }) => <th key={i} className="px-3 py-1.5 text-left font-medium" style={{ color: COLORS[i % COLORS.length] }}>{f.label || f.expr}</th>)}</tr></thead>
            <tbody>{tableXs.map((x) => <tr key={x} className="border-b border-lp-line/60 last:border-0"><td className="px-3 py-1 tabular-nums text-lp-soft">{fmtNum(x)}</td>{visible.map(({ f, i }) => { const y = f.c!.fn({ ...params, x }); return <td key={i} className="px-3 py-1 tabular-nums text-white">{Number.isFinite(y) ? fmtNum(y) : "–"}</td>; })}</tr>)}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
