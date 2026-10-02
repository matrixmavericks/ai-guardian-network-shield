import React, { useRef } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Slider, Switch, Btn } from "../kit/controls";
import { Plot, label, fmt, type Ctx } from "../kit/draw";
import { handle } from "../maths/paper";

// A production possibility curve for consumer goods and capital goods.
// Choose a point; see its opportunity cost; let years pass and watch how the
// choice between consumption and investment changes future growth.

type P = { A: number; B: number; x: number; y: number; straight: boolean; year: number; A0: number; B0: number };
const DEF: P = { A: 100, B: 80, x: 60, y: 64, straight: false, year: 0, A0: 100, B0: 80 };

const k = (p: P) => (p.straight ? 1 : 2);
/** Capital goods possible when making x consumer goods */
export const yOn = (p: Pick<P, "A" | "B" | "straight">, x: number) => (x >= p.A ? 0 : p.B * Math.pow(1 - Math.pow(x / p.A, p.straight ? 1 : 2), 1 / (p.straight ? 1 : 2)));
const where = (p: P) => {
  const v = Math.pow(p.x / p.A, k(p)) + Math.pow(p.y / p.B, k(p));
  return v < 0.97 ? "inside" : v > 1.03 ? "outside" : "on";
};

function draw(ctx: Ctx, w: number, h: number, p: P, t: SimTheme): Plot {
  ctx.fillStyle = t.dark ? "#08101f" : "#fbfcfe"; ctx.fillRect(0, 0, w, h);
  const mx = Math.max(140, p.A * 1.25), my = Math.max(110, p.B * 1.25);
  const pl = new Plot(70, 84, w - 110, h - 140, 0, mx, 0, my);
  pl.axes(ctx, t, { xLabel: "consumer goods (millions)", yLabel: "capital goods: machines (millions)", xTicks: 6, yTicks: 5 });
  const curve = (A: number, B: number) => (x: number) => (x > A ? NaN : yOn({ A, B, straight: p.straight }, x));
  // Attainable area
  ctx.fillStyle = t.dark ? "rgba(96,165,250,0.10)" : "rgba(37,99,235,0.07)";
  ctx.beginPath(); ctx.moveTo(pl.X(0), pl.Y(0));
  for (let i = 0; i <= 120; i++) { const x = (i / 120) * p.A; ctx.lineTo(pl.X(x), pl.Y(yOn(p, x))); }
  ctx.closePath(); ctx.fill();
  if (p.A !== p.A0 || p.B !== p.B0) { pl.fn(ctx, curve(p.A0, p.B0), t.mute, 2, [6, 5]); label(ctx, "year 0", pl.X(p.A0) - 4, pl.Y(0) - 12, { color: t.mute, size: 11, align: "right" }); }
  pl.fn(ctx, curve(p.A, p.B), t.c.blue, 3.4);
  // Opportunity cost staircase: each extra 10 consumer goods costs this many machines
  const step = p.A / 6;
  for (let i = 0; i < 6; i++) {
    const x0 = i * step, x1 = x0 + step, y0 = yOn(p, x0), y1 = yOn(p, x1);
    ctx.strokeStyle = t.c.orange; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(pl.X(x0), pl.Y(y0)); ctx.lineTo(pl.X(x1), pl.Y(y0)); ctx.lineTo(pl.X(x1), pl.Y(y1)); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, `−${fmt(y0 - y1, 1)}`, pl.X(x1) + 4, pl.Y((y0 + y1) / 2), { color: t.c.orange, size: 10.5, weight: 700, align: "left", halo: true });
  }
  // The chosen point
  const wh = where(p);
  const col = wh === "on" ? t.c.green : wh === "inside" ? t.c.amber : t.c.red;
  ctx.strokeStyle = col; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(pl.X(p.x), pl.Y(0)); ctx.lineTo(pl.X(p.x), pl.Y(p.y)); ctx.lineTo(pl.X(0), pl.Y(p.y)); ctx.stroke(); ctx.setLineDash([]);
  handle(ctx, pl.X(p.x), pl.Y(p.y), col, true);
  const text = wh === "on" ? "efficient: all resources used" : wh === "inside" ? "inside: unemployed resources" : "outside: not possible yet";
  label(ctx, text, pl.X(p.x) + 14, pl.Y(p.y) - 18, { color: col, size: 12.5, weight: 700, align: "left", halo: true });
  label(ctx, `year ${p.year}`, pl.x0 + pl.w - 4, pl.y0 + 12, { color: t.soft, size: 13, weight: 700, align: "right" });
  return pl;
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  draw(ctx, w * 1.1, h * 1.15, { ...DEF, A: 120, B: 95, year: 3 }, t);
}

export default function Ppc() {
  const theme = useSimTheme();
  const [p, set, resetP] = useSimParams<P>(DEF, { A: [20, 400], B: [20, 400], x: [0, 400], y: [0, 400], year: [0, 50] });
  const plot = useRef<Plot | null>(null);
  const drag = useRef(false);
  const render = (ctx: Ctx, w: number, h: number) => { plot.current = draw(ctx, w, h, p, theme); };
  const onDown = (pt: { x: number; y: number }) => { const pl = plot.current; if (pl && Math.hypot(pt.x - pl.X(p.x), pt.y - pl.Y(p.y)) < 30) { drag.current = true; return true; } return false; };
  const onMove = (pt: { x: number; y: number }, down: boolean) => {
    const pl = plot.current;
    if (!down || !drag.current || !pl) return;
    let x = Math.max(0, Math.round(pl.invX(pt.x))), y = Math.max(0, Math.round(pl.invY(pt.y)));
    // Snap onto the curve when close
    const yc = yOn(p, x);
    if (x <= p.A && Math.abs(y - yc) < 3) y = Math.round(yc * 10) / 10;
    x = Math.min(x, 400); y = Math.min(y, 400);
    set({ x, y });
  };
  const onUp = () => { drag.current = false; };
  /** A year passes: investing in machines grows the economy's capacity. */
  const nextYear = () => {
    const used = Math.min(1, Math.pow(p.x / p.A, k(p)) + Math.pow(p.y / p.B, k(p)));
    const share = p.y / Math.max(1, p.B);
    const g = (0.01 + 0.12 * share) * used;
    set({ A: +(p.A * (1 + g)).toFixed(2), B: +(p.B * (1 + g)).toFixed(2), year: p.year + 1 });
  };
  const wh = where(p);
  const oc = p.x + 10 <= p.A ? yOn(p, p.x) - yOn(p, p.x + 10) : NaN;
  const challenges = [
    { id: "in", title: "Choose a point that shows unemployed resources", detail: "The economy could make more of both.", done: wh === "inside" && p.x > 5 && p.y > 5 },
    { id: "out", title: "Choose a point the economy can't reach yet", detail: "What would it take to get there?", done: wh === "outside" },
    { id: "reach", title: "Grow the economy until 110 consumer goods and 90 machines is possible", detail: "Let years pass. Investing in machines helps.", done: Math.pow(110 / p.A, k(p)) + Math.pow(90 / p.B, k(p)) <= 1.0 },
    { id: "fast", title: "Double the economy's capacity in 10 years or fewer", detail: "Compare a high-investment point with a high-consumption one.", done: p.A >= 2 * p.A0 && p.year <= 10 },
  ];
  return (
    <SimShell
      id="ppc"
      challenges={challenges}
      onReset={() => resetP()}
      record={() => ({ year: p.year, "consumer goods": p.x, machines: p.y, "max consumer goods": p.A, "max machines": p.B, "opportunity cost of next 10": +(oc || NaN).toFixed(2) })}
      ask={() => `PPC for consumer goods (max ${fmt(p.A, 1)}m) and machines (max ${fmt(p.B, 1)}m), ${p.straight ? "straight line (constant opportunity cost)" : "bowed out (increasing opportunity cost)"}, year ${p.year}. Chosen point: ${p.x} consumer goods and ${p.y} machines, which is ${wh} the curve. The next 10 consumer goods would cost ${isFinite(oc) ? fmt(oc, 1) : "–"} machines.`}
      stage={<Stage label="Production possibility curve" render={render} onDown={onDown} onMove={onMove} onUp={onUp} cursor="crosshair" />}
      overlay={
        <Readouts>
          <Readout label="your point" value={wh === "on" ? "efficient" : wh === "inside" ? "inefficient" : "unattainable"} color={wh === "on" ? theme.c.green : wh === "inside" ? theme.c.amber : theme.c.red} />
          <Readout label="cost of 10 more consumer goods" value={isFinite(oc) ? `${fmt(oc, 1)} machines` : "–"} color={theme.c.orange} />
          <Readout label="year" value={String(p.year)} />
        </Readouts>
      }
      controls={
        <>
          <Group title="Choose what to produce">
            <Slider label="Consumer goods" value={p.x} min={0} max={Math.round(Math.max(140, p.A * 1.2))} step={1} onChange={(x) => set({ x })} />
            <Slider label="Machines (capital goods)" value={p.y} min={0} max={Math.round(Math.max(110, p.B * 1.2))} step={1} onChange={(y) => set({ y })} hint="Or drag the point. It snaps onto the curve when close." />
            <Btn onClick={() => set({ y: +yOn(p, Math.min(p.x, p.A)).toFixed(1) })}>Use all resources (move onto the curve)</Btn>
          </Group>
          <Group title="Over time">
            <div className="flex gap-2"><Btn tone="primary" onClick={nextYear}>Next year</Btn><Btn onClick={() => set({ A: p.A0, B: p.B0, year: 0 })}>Back to year 0</Btn></div>
            <p className="text-[11.5px] text-lp-mute">Each year the economy grows by more if it makes more machines (and uses all its resources).</p>
          </Group>
          <Group title="Shape">
            <Switch label="Straight line (constant opportunity cost)" checked={p.straight} onChange={(straight) => set({ straight })} hint="Real PPCs bow outwards: resources aren't equally good at making everything." />
            <Slider label="Technology: consumer goods" value={p.A} min={20} max={400} step={1} onChange={(A) => set({ A })} />
            <Slider label="Technology: machines" value={p.B} min={20} max={400} step={1} onChange={(B) => set({ B })} />
          </Group>
        </>
      }
      learn={
        <>
          <H>Scarcity and choice</H>
          <p>Resources (land, labour, capital, enterprise) are limited, so making more of one thing means making less of another. The PPC shows the most an economy can make of two goods with all its resources, used efficiently.</p>
          <H>Opportunity cost</H>
          <Eq>opportunity cost = the next best alternative given up</Eq>
          <p>Moving along the curve, each extra 10 consumer goods costs some machines. The bowed shape means that cost rises: the resources moved last are the ones least suited to making consumer goods.</p>
          <H>Inside, on, outside</H>
          <p>Inside: unemployment or waste. On: efficient. Outside: impossible with today's resources and technology.</p>
          <H>Growth</H>
          <p>More or better resources (investment in capital, education, new technology) shift the whole curve outwards. Making more capital goods today means consuming less now, but it lets the economy grow faster: a choice between the present and the future.</p>
          <Try>run 10 years at 80 consumer goods, then reset and run 10 years at 30. Compare where the curve ends up.</Try>
        </>
      }
    />
  );
}
