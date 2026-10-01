import React from "react";
import { BarChart3, Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartSpec } from "./blocks";
import { Card, CardHead, download, ghost, safeName } from "./ui";

const COLORS = ["#60A5FA", "#34D399", "#F472B6", "#FBBF24", "#A78BFA"];
// Theme colours (they switch with light mode)
const tick = { fill: "rgb(var(--lp-mute))", fontSize: 12 };
const tooltip = { contentStyle: { background: "rgb(var(--lp-deep))", border: "1px solid rgb(var(--lp-line))", borderRadius: 12, fontSize: 12.5, color: "rgb(var(--lp-text))" }, itemStyle: { color: "inherit" }, labelStyle: { color: "inherit" } };

export const Chart: React.FC<{ spec: ChartSpec }> = ({ spec }) => {
  const rows = spec.labels.map((label, i) => Object.fromEntries([["label", label], ...spec.series.map((s) => [s.name, s.data[i] ?? 0])]));
  const fmt = (v: number) => `${Math.round(v * 100) / 100}${spec.unit}`;
  const csv = [["", ...spec.series.map((s) => s.name)], ...spec.labels.map((l, i) => [l, ...spec.series.map((s) => String(s.data[i] ?? ""))])]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");

  return (
    <Card>
      <CardHead icon={BarChart3} kind="Chart" title={spec.title || "Chart"}>
        <button type="button" onClick={() => download(`${safeName(spec.title || "chart")}.csv`, "﻿" + csv, "text/csv;charset=utf-8")} className={ghost}><Download className="h-4 w-4" /> Data</button>
      </CardHead>
      <div className="mt-3 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === "pie" ? (
            <PieChart>
              <Pie data={rows.map((r) => ({ name: r.label, value: r[spec.series[0].name] as number }))} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="80%" paddingAngle={2} stroke="none" label={(e: { name: string; value: number }) => `${e.name}: ${fmt(e.value)}`}>
                {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip {...tooltip} formatter={(v: number) => fmt(v)} />
            </PieChart>
          ) : spec.type === "line" ? (
            <LineChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="label" tick={tick} />
              <YAxis tick={tick} />
              <Tooltip {...tooltip} formatter={(v: number) => fmt(v)} />
              {spec.series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {spec.series.map((s, i) => <Line key={s.name} type="monotone" dataKey={s.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ r: 3 }} />)}
            </LineChart>
          ) : (
            <BarChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
              <XAxis dataKey="label" tick={tick} />
              <YAxis tick={tick} />
              <Tooltip {...tooltip} cursor={{ fill: "rgba(96,165,250,0.08)" }} formatter={(v: number) => fmt(v)} />
              {spec.series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {spec.series.map((s, i) => <Bar key={s.name} dataKey={s.name} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} maxBarSize={56} />)}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
