import React from "react";
import { CircleFigure, GraphFigure, NumberLineFigure, ParallelFigure, PolygonFigure, SolidFigure, TriangleFigure, type CircleSpec, type GraphSpec, type NumberLineSpec, type ParallelSpec, type PolygonSpec, type SolidSpec, type TriangleSpec } from "./geometry";
import { CircuitFigure, FbdFigure, LensFigure, type CircuitSpec, type FbdSpec, type LensSpec } from "./science";
import { ChartFigure, ClimateFigure, PpcFigure, PyramidFigure, SupplyDemandFigure, TimelineFigure, type ChartSpec, type ClimateSpec, type PpcSpec, type PyramidSpec, type SupplyDemandSpec, type TimelineSpec } from "./humanities";

export type DiagramSpec =
  | TriangleSpec
  | PolygonSpec
  | CircleSpec
  | ParallelSpec
  | SolidSpec
  | NumberLineSpec
  | GraphSpec
  | FbdSpec
  | CircuitSpec
  | LensSpec
  | SupplyDemandSpec
  | PpcSpec
  | ChartSpec
  | ClimateSpec
  | TimelineSpec
  | PyramidSpec;

export type DiagramKind = DiagramSpec["kind"];

const RENDER: Record<DiagramKind, React.FC<{ spec: never; accent: string }>> = {
  triangle: TriangleFigure as never,
  polygon: PolygonFigure as never,
  circle: CircleFigure as never,
  parallel: ParallelFigure as never,
  solid: SolidFigure as never,
  numberline: NumberLineFigure as never,
  graph: GraphFigure as never,
  fbd: FbdFigure as never,
  circuit: CircuitFigure as never,
  lens: LensFigure as never,
  supplydemand: SupplyDemandFigure as never,
  ppc: PpcFigure as never,
  chart: ChartFigure as never,
  climate: ClimateFigure as never,
  timeline: TimelineFigure as never,
  pyramid: PyramidFigure as never,
};

export const isDiagram = (v: unknown): v is DiagramSpec => !!v && typeof v === "object" && typeof (v as { kind?: unknown }).kind === "string" && (v as { kind: string }).kind in RENDER;

class Boundary extends React.Component<{ children: React.ReactNode; fallback: (msg: string) => React.ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { error: e?.message || "Couldn't draw this diagram." };
  }
  componentDidUpdate(prev: { children: React.ReactNode }) {
    if (prev.children !== this.props.children && this.state.error) this.setState({ error: null });
  }
  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}

/** Draws any diagram spec as crisp SVG. Unknown or impossible specs show a small note instead of crashing. */
export const DiagramView: React.FC<{ spec: unknown; accent?: string; className?: string }> = ({ spec, accent = "#2563EB", className }) => {
  if (!isDiagram(spec)) {
    return <div className={className} style={{ padding: 12, fontSize: 12, color: "#6B7280", border: "1px dashed #D1D5DB", borderRadius: 8 }}>Diagram unavailable</div>;
  }
  const Figure = RENDER[spec.kind];
  return (
    <Boundary
      fallback={(msg) => (
        <div className={className} style={{ padding: 12, fontSize: 12, color: "#B45309", border: "1px dashed #FCD34D", borderRadius: 8, background: "#FFFBEB" }}>
          {msg}
        </div>
      )}
    >
      <div className={className}>
        <Figure spec={spec as never} accent={accent} />
      </div>
    </Boundary>
  );
};

/* ---------- Catalogue: names, subjects and worked examples ---------- */

export type CatalogItem = { kind: DiagramKind; name: string; blurb: string; subjects: ("math" | "physics" | "humanities")[]; example: DiagramSpec };

export const CATALOG: CatalogItem[] = [
  {
    kind: "triangle",
    name: "Triangle (solved exactly)",
    blurb: "Give any three measurements. Sides and angles are calculated, drawn to scale and labelled.",
    subjects: ["math", "physics"],
    example: { kind: "triangle", a: 7, b: 5, C: 48, unit: "cm", sideLabels: ["7 cm", "5 cm", "x"], angleLabels: [null, null, "48°"] },
  },
  {
    kind: "polygon",
    name: "Polygon / compound shape",
    blurb: "Any shape from coordinates, or a regular polygon. Side labels, right angles and equal-side ticks.",
    subjects: ["math"],
    example: { kind: "polygon", points: [[0, 0], [10, 0], [10, 4], [6, 4], [6, 8], [0, 8]], sideLabels: ["10 m", "4 m", "4 m", "4 m", "6 m", "8 m"], rightAngles: [0, 1, 2, 4, 5] },
  },
  {
    kind: "circle",
    name: "Circle theorems",
    blurb: "Points on the circumference, chords, radii, tangents and marked angles.",
    subjects: ["math"],
    example: {
      kind: "circle",
      points: [
        { name: "A", angle: 210 },
        { name: "B", angle: 330 },
        { name: "C", angle: 100 },
      ],
      segments: [
        ["A", "C"],
        ["B", "C"],
        ["A", "O"],
        ["B", "O"],
      ],
      angles: [
        { at: "O", from: "A", to: "B", label: "124°" },
        { at: "C", from: "A", to: "B", label: "x" },
      ],
    },
  },
  {
    kind: "parallel",
    name: "Parallel lines & transversal",
    blurb: "Corresponding, alternate and co-interior angles with labelled positions.",
    subjects: ["math"],
    example: { kind: "parallel", angle: 62, labels: { p2: "62°", q3: "x", q2: "y" } },
  },
  {
    kind: "solid",
    name: "3D solids",
    blurb: "Cuboid, prism, cylinder, cone, pyramid, sphere with hidden edges dashed.",
    subjects: ["math"],
    example: { kind: "solid", shape: "cylinder", labels: { radius: "4 cm", height: "11 cm" } },
  },
  {
    kind: "numberline",
    name: "Number line & inequalities",
    blurb: "Points, open and closed circles and intervals.",
    subjects: ["math"],
    example: { kind: "numberline", min: -5, max: 5, step: 1, intervals: [{ from: -2, to: 3, openFrom: true }] },
  },
  {
    kind: "graph",
    name: "Graphs of functions",
    blurb: "Plots real functions exactly (quadratics, trig, exponentials), plus points and line segments.",
    subjects: ["math", "physics"],
    example: { kind: "graph", x: [-4, 5], y: [-6, 8], functions: [{ expr: "x^2 - 2x - 3", label: "y = x² − 2x − 3" }, { expr: "2x - 3", dashed: true }], points: [{ x: 3, y: 0, label: "(3, 0)" }, { x: -1, y: 0, label: "(−1, 0)" }] },
  },
  {
    kind: "fbd",
    name: "Free-body diagram",
    blurb: "Forces as arrows sized by magnitude, on flat ground or a slope.",
    subjects: ["physics"],
    example: { kind: "fbd", incline: 25, forces: [{ label: "W", angle: 270, size: 1.3 }, { label: "R", angle: 115, size: 1.1 }, { label: "F", angle: 25, size: 0.7 }] },
  },
  {
    kind: "circuit",
    name: "Circuit diagram",
    blurb: "Standard symbols in series and parallel: cells, resistors, bulbs, meters, diodes, LDRs.",
    subjects: ["physics"],
    example: { kind: "circuit", series: [{ type: "ammeter", label: "A₁" }, { type: "switch" }], parallel: [[{ type: "bulb", label: "L₁" }], [{ type: "resistor", label: "4 Ω" }], [{ type: "voltmeter" }]], source: [{ type: "battery", label: "6 V" }] },
  },
  {
    kind: "lens",
    name: "Lens ray diagram",
    blurb: "Image position and size calculated from the lens formula, with principal rays.",
    subjects: ["physics"],
    example: { kind: "lens", lens: "converging", f: 10, u: 25, objectHeight: 4 },
  },
  {
    kind: "supplydemand",
    name: "Supply & demand",
    blurb: "Shifts, taxes, subsidies, price controls, and shaded surplus or deadweight loss.",
    subjects: ["humanities"],
    example: { kind: "supplydemand", tax: 2, shade: ["tax", "DWL"] },
  },
  {
    kind: "ppc",
    name: "Production possibility curve",
    blurb: "Efficient, inefficient and unattainable points, and PPC shifts.",
    subjects: ["humanities"],
    example: { kind: "ppc", xLabel: "Consumer goods", yLabel: "Capital goods", points: [{ label: "A", pos: "on", t: 0.3 }, { label: "B", pos: "inside", t: 0.5 }, { label: "C", pos: "outside", t: 0.7 }], shift: "out" },
  },
  {
    kind: "chart",
    name: "Bar, line or pie chart",
    blurb: "From your data, or blank axes for students to plot.",
    subjects: ["math", "physics", "humanities"],
    example: { kind: "chart", type: "bar", labels: ["2019", "2020", "2021", "2022", "2023"], series: [{ name: "GDP growth (%)", values: [3.9, -5.8, 9.7, 7.0, 8.2] }], yLabel: "GDP growth (%)" },
  },
  {
    kind: "climate",
    name: "Climate graph",
    blurb: "Monthly rainfall bars with a temperature line on twin axes.",
    subjects: ["humanities"],
    example: { kind: "climate", place: "Pune, India", temp: [21, 23, 26, 29, 30, 27, 25, 24, 25, 25, 23, 21], rain: [2, 1, 3, 13, 36, 150, 185, 135, 120, 75, 25, 6] },
  },
  {
    kind: "timeline",
    name: "Timeline",
    blurb: "Events spaced by date, alternating above and below the line.",
    subjects: ["humanities"],
    example: { kind: "timeline", events: [{ year: 1919, label: "Treaty of Versailles" }, { year: 1929, label: "Wall Street Crash" }, { year: 1933, label: "Hitler becomes Chancellor" }, { year: 1938, label: "Munich Agreement" }, { year: 1939, label: "Invasion of Poland" }] },
  },
  {
    kind: "pyramid",
    name: "Population pyramid",
    blurb: "Age-sex structure for any country.",
    subjects: ["humanities"],
    example: { kind: "pyramid", place: "India (approx.)", groups: ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70+"], male: [8.6, 9.2, 9.0, 8.1, 6.4, 4.9, 3.2, 1.9], female: [8.0, 8.5, 8.6, 7.8, 6.3, 4.9, 3.4, 2.2] },
  },
];

/** Compact schema the AI follows when it needs a figure. */
export const DIAGRAM_SCHEMA = `DIAGRAMS: when a question needs a figure, add "diagram": {...} using exactly one of these shapes (numbers are plain numbers, angles in degrees):
- {"kind":"triangle","a":7,"b":5,"C":48,"unit":"cm","sideLabels":["7 cm","5 cm","x"],"angleLabels":[null,null,"48°"]}  (a=BC, b=CA, c=AB; give any 3 values incl. a side; labels can be "auto", text, or null)
- {"kind":"polygon","points":[[0,0],[10,0],[10,4],[0,4]],"sideLabels":["10 m","4 m",null,null],"rightAngles":[0,1]} or {"kind":"polygon","sides":6,"sideLabels":["5 cm"]}
- {"kind":"circle","points":[{"name":"A","angle":210},{"name":"B","angle":330},{"name":"C","angle":100}],"segments":[["A","C"],["B","C"],["A","O"],["B","O"]],"angles":[{"at":"O","from":"A","to":"B","label":"124°"}],"tangents":["A"]}
- {"kind":"parallel","angle":62,"labels":{"p2":"62°","q3":"x"}}  (p = upper crossing, q = lower; 1 top-left, 2 top-right, 3 bottom-left, 4 bottom-right)
- {"kind":"solid","shape":"cuboid|cylinder|cone|prism|pyramid|sphere|hemisphere","labels":{"length":"8 cm","width":"3 cm","height":"5 cm","radius":"4 cm"}}
- {"kind":"numberline","min":-5,"max":5,"step":1,"points":[{"value":2,"open":true}],"intervals":[{"from":-2,"to":3,"openFrom":true}]}
- {"kind":"graph","x":[-5,5],"y":[-5,10],"functions":[{"expr":"x^2-2x-3","label":"y = x² − 2x − 3"}],"points":[{"x":3,"y":0,"label":"A"}],"segments":[{"from":[0,0],"to":[4,8]}],"xLabel":"time (s)","yLabel":"velocity (m/s)","blank":false}
- {"kind":"fbd","incline":25,"forces":[{"label":"W","angle":270,"size":1.3},{"label":"R","angle":115}]}  (angle 0=right, 90=up)
- {"kind":"circuit","series":[{"type":"ammeter"}],"parallel":[[{"type":"bulb","label":"L1"}],[{"type":"resistor","label":"4 Ω"}]],"source":[{"type":"battery","label":"6 V"}]}  (types: cell, battery, resistor, variable, bulb, switch, closed-switch, ammeter, voltmeter, motor, diode, led, ldr, thermistor, fuse, buzzer)
- {"kind":"lens","lens":"converging|diverging","f":10,"u":25,"objectHeight":4}
- {"kind":"supplydemand","shifts":[{"curve":"D","dir":"right"}],"tax":2,"subsidy":0,"ceiling":4,"floor":7,"shade":["CS","PS","DWL","tax"],"names":{"D":"AD","S":"SRAS"},"xLabel":"Real GDP","yLabel":"Price level"}  (price scale 0-10, equilibrium at 5)
- {"kind":"ppc","xLabel":"Consumer goods","yLabel":"Capital goods","points":[{"label":"A","pos":"on|inside|outside"}],"shift":"out|in"}
- {"kind":"chart","type":"bar|line|pie","labels":["2019","2020"],"series":[{"name":"GDP","values":[3.9,-5.8]}],"yLabel":"%","blank":false}
- {"kind":"climate","place":"Pune","temp":[12 numbers °C],"rain":[12 numbers mm]}
- {"kind":"timeline","events":[{"year":1919,"label":"Treaty of Versailles"}]}
- {"kind":"pyramid","groups":["0-9","10-19"],"male":[8.6,9.2],"female":[8.0,8.5]}
Never draw diagrams as ASCII art. Only include a diagram when the question needs one. For "draw/plot" questions set "blank":true on graph/chart so students draw it themselves.`;
