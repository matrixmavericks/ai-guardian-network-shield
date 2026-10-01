import React, { useState } from "react";
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table2, LineChart as LineIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MYP, type Letter, type MypGroup } from "@/lib/myp";
import type { Series } from "./data";

// Criterion levels over tasks: one line per criterion on a single 0–8 axis.
// Colours follow the criterion (A is always slot 1), validated for both themes
// (index.css --crit-*); end-of-line labels and the table view carry identity too.

export const CRIT_COLOR: Record<Letter, string> = { A: "var(--crit-a)", B: "var(--crit-b)", C: "var(--crit-c)", D: "var(--crit-d)" };

const short = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

type TipProps = { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string; criteria: Letter[]; group: MypGroup };
const Tip: React.FC<TipProps> = ({ active, payload, label, criteria, group }) => {
  if (!active || !payload?.length) return null;
  const v = Object.fromEntries(payload.map((p) => [p.dataKey, p.value]));
  return (
    <div className="lp-chrome rounded-xl border border-lp-line bg-lp-deep px-3 py-2 text-[12.5px] shadow-xl">
      <p className="mb-1 max-w-[240px] font-medium text-white">{label}</p>
      {criteria.filter((l) => typeof v[l] === "number").map((l) => (
        <p key={l} className="flex items-center gap-2 text-lp-soft">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: CRIT_COLOR[l] }} />
          <span className="min-w-0 flex-1 truncate">{l} · {MYP[group].criteria[l].name}</span>
          <span className="tabular-nums font-semibold text-white">{v[l]}</span>
        </p>
      ))}
    </div>
  );
};

export const TrendChart: React.FC<{ data: Series[]; criteria: Letter[]; group: MypGroup; title: string; caption?: string }> = ({ data, criteria, group, title, caption }) => {
  const [table, setTable] = useState(false);
  const last = data.length - 1;
  // Criteria that end on (nearly) the same level get their labels stacked, not overlapped
  const ends = criteria.filter((l) => typeof data[last]?.[l] === "number").sort((a, b) => (data[last][b] as number) - (data[last][a] as number));
  const dy: Partial<Record<Letter, number>> = {};
  ends.forEach((l, i) => { const prev = ends[i - 1]; dy[l] = prev !== undefined && Math.abs((data[last][prev] as number) - (data[last][l] as number)) < 0.6 ? (dy[prev] ?? 0) + 13 : 0; });
  return (
    <figure className="rounded-2xl border border-lp-line bg-lp-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <figcaption className="min-w-0 flex-1">
          <p className="text-[14.5px] font-medium text-white">{title}</p>
          {caption && <p className="mt-0.5 text-[12.5px] text-lp-mute">{caption}</p>}
        </figcaption>
        <div className="flex rounded-lg border border-lp-line p-0.5 text-[12px]">
          <button type="button" aria-pressed={!table} onClick={() => setTable(false)} className={cn("flex items-center gap-1 rounded-md px-2 py-1", !table ? "bg-lp-blue/20 text-white" : "text-lp-mute hover:text-white")}><LineIcon className="h-3.5 w-3.5" /> Chart</button>
          <button type="button" aria-pressed={table} onClick={() => setTable(true)} className={cn("flex items-center gap-1 rounded-md px-2 py-1", table ? "bg-lp-blue/20 text-white" : "text-lp-mute hover:text-white")}><Table2 className="h-3.5 w-3.5" /> Table</button>
        </div>
      </div>
      {/* Legend: always shown for two or more criteria */}
      {criteria.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-lp-soft">
          {criteria.map((l) => <li key={l} className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full" style={{ background: CRIT_COLOR[l] }} />{l} · {MYP[group].criteria[l].name}</li>)}
        </ul>
      )}
      {table ? (
        <div className="mt-3 overflow-x-auto rounded-xl border border-lp-line">
          <table className="w-full text-[12.5px]">
            <thead><tr className="border-b border-lp-line text-left text-lp-mute"><th className="px-3 py-2 font-medium">Task</th>{criteria.map((l) => <th key={l} className="px-3 py-2 text-center font-medium">{l}</th>)}</tr></thead>
            <tbody className="divide-y divide-lp-line">
              {data.map((d) => <tr key={d.taskId}><td className="px-3 py-2 text-white">{d.label}</td>{criteria.map((l) => <td key={l} className="px-3 py-2 text-center tabular-nums text-lp-soft">{d[l] ?? "–"}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-3 h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 44, bottom: 4, left: -18 }}>
              <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
              <XAxis dataKey="label" tickFormatter={(v: string) => short(v)} tick={{ fill: "rgb(var(--lp-mute))", fontSize: 11.5 }} tickLine={false} axisLine={{ stroke: "var(--viz-axis)" }} interval="preserveStartEnd" minTickGap={18} />
              <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} tick={{ fill: "rgb(var(--lp-mute))", fontSize: 11.5 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<Tip criteria={criteria} group={group} />} cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1 }} isAnimationActive={false} />
              {criteria.map((l) => (
                <Line key={l} type="linear" dataKey={l} stroke={CRIT_COLOR[l]} strokeWidth={2} connectNulls isAnimationActive={false}
                  dot={{ r: 4, fill: CRIT_COLOR[l], stroke: "rgb(var(--lp-surface))", strokeWidth: 2 }} activeDot={{ r: 6, stroke: "rgb(var(--lp-surface))", strokeWidth: 2 }}>
                  {/* Direct label at the line's end, in text ink (the colour is beside it) */}
                  <LabelList dataKey={l} content={(p: { index?: number; x?: number | string; y?: number | string; value?: number | string }) => (p.index === last && p.value !== undefined && p.value !== null
                    ? <text x={Number(p.x) + 9} y={Number(p.y) + 4 + (dy[l] ?? 0)} fontSize={11.5} fontWeight={600} fill="rgb(var(--lp-text))">{l} {p.value}</text>
                    : null)} />
                </Line>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
};
