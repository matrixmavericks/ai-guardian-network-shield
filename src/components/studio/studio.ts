import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStoredState } from "@/components/assistant/storage";
import { getStudioConfig, type StudioConfig } from "@/lib/mispStudioConfigs";
import type { DiagramSpec } from "./diagrams";
import type { PrintKind, Printable } from "./worksheet";

export type SubjectKind = "math" | "physics" | "humanities";

export type StudioLook = {
  subject: SubjectKind;
  gradient: string;
  accent: string;
  /** one-tap starting points on the home page and in the maker */
  ideas: { title: string; topic: string; kind: PrintKind; diagrams: boolean; band?: string }[];
  /** short diagram requests for the Diagram lab */
  diagramIdeas: string[];
};

const LOOKS: Record<SubjectKind, Omit<StudioLook, "subject">> = {
  physics: {
    gradient: "linear-gradient(135deg, #06B6D4 0%, #2563EB 50%, #1E1B4B 100%)",
    accent: "#0891B2",
    ideas: [
      { title: "Forces & free-body diagrams", topic: "Resolving forces and drawing free-body diagrams, including objects on slopes", kind: "worksheet", diagrams: true },
      { title: "Series & parallel circuits", topic: "Current, potential difference and resistance in series and parallel circuits", kind: "worksheet", diagrams: true },
      { title: "Lenses & ray diagrams", topic: "Converging lenses: ray diagrams, image position and magnification", kind: "worksheet", diagrams: true },
      { title: "Motion graphs", topic: "Interpreting distance-time and velocity-time graphs, gradients and areas", kind: "test", diagrams: true },
      { title: "Energy & power exit ticket", topic: "Kinetic and gravitational potential energy, efficiency and power", kind: "exit", diagrams: false },
      { title: "Key physics equations", topic: "Core physics equations, symbols and units", kind: "flashcards", diagrams: false },
    ],
    diagramIdeas: ["Box on a 30° ramp with weight, normal force and friction", "Two bulbs in parallel with an ammeter in the main circuit and a 6 V battery", "Converging lens, f = 8 cm, object 20 cm away", "Velocity-time graph: accelerates to 12 m/s in 4 s, then constant for 6 s"],
  },
  math: {
    gradient: "linear-gradient(135deg, #A855F7 0%, #6D28D9 50%, #2E1065 100%)",
    accent: "#7C3AED",
    ideas: [
      { title: "Pythagoras & trigonometry", topic: "Finding missing sides and angles in right-angled triangles using Pythagoras and SOHCAHTOA", kind: "worksheet", diagrams: true },
      { title: "Circle theorems", topic: "Angle at the centre, angles in the same segment, cyclic quadrilaterals and tangents", kind: "worksheet", diagrams: true },
      { title: "Graphing quadratics", topic: "Sketching quadratics: roots, turning points, y-intercepts and completing the square", kind: "worksheet", diagrams: true },
      { title: "Sine & cosine rule test", topic: "Non-right-angled trigonometry: sine rule, cosine rule and area of a triangle", kind: "test", diagrams: true },
      { title: "Inequalities exit ticket", topic: "Solving linear inequalities and showing them on a number line", kind: "exit", diagrams: true },
      { title: "Volume & surface area", topic: "Volume and surface area of prisms, cylinders, cones and spheres", kind: "worksheet", diagrams: true },
    ],
    diagramIdeas: ["Triangle with sides 7 cm and 9 cm and an included angle of 40°, find x", "Cyclic quadrilateral ABCD with angle A = 72°", "Graph of y = x² − 4x + 3 showing roots and turning point", "Cone with radius 5 cm and height 12 cm"],
  },
  humanities: {
    gradient: "linear-gradient(135deg, #F59E0B 0%, #EA580C 50%, #7C2D12 100%)",
    accent: "#D97706",
    ideas: [
      { title: "Market equilibrium", topic: "Demand, supply and market equilibrium, with shifts and their causes", kind: "worksheet", diagrams: true },
      { title: "Indirect taxes & subsidies", topic: "The effect of indirect taxes and subsidies on markets and stakeholders", kind: "test", diagrams: true },
      { title: "Source analysis (OPCVL)", topic: "Evaluating historical sources using origin, purpose, content, value and limitation", kind: "worksheet", diagrams: false },
      { title: "Climate graphs", topic: "Reading and describing climate graphs for contrasting places", kind: "worksheet", diagrams: true },
      { title: "Causes of WW1 exit ticket", topic: "Long-term and short-term causes of the First World War", kind: "exit", diagrams: false },
      { title: "Economics key terms", topic: "Key microeconomics terms and definitions", kind: "flashcards", diagrams: false },
    ],
    diagramIdeas: ["Indirect tax on cigarettes showing tax revenue and deadweight loss", "Price ceiling on rent below equilibrium", "Climate graph for Mumbai", "Timeline of the Cold War 1945-1991"],
  },
};

export const subjectOf = (c: StudioConfig): SubjectKind => (/phys/i.test(c.title) ? "physics" : /math/i.test(c.title) ? "math" : "humanities");

export const lookFor = (c: StudioConfig): StudioLook => {
  const subject = subjectOf(c);
  return { subject, ...LOOKS[subject] };
};

export const useStudio = () => {
  const { user } = useAuth();
  const config = useMemo(() => getStudioConfig(user?.email), [user?.email]);
  const look = useMemo(() => (config ? lookFor(config) : null), [config]);
  const [band, setBand] = useStoredState<string>(user && config ? `refyn:${user.id}:studio:band` : null, config?.gradeBands[0]?.id ?? "");
  return { user, config, look, band: config?.gradeBands.some((b) => b.id === band) ? band : config?.gradeBands[0]?.id ?? "", setBand };
};

/* ---------- Library ---------- */

export type LibraryItem =
  | { id: string; type: "printable"; title: string; at: number; kind: PrintKind; doc: Printable; band?: string }
  | { id: string; type: "diagram"; title: string; at: number; spec: DiagramSpec }
  | { id: string; type: "tool"; title: string; at: number; tool: string; input: string; output: string; band?: string };

export const useLibrary = () => {
  const { user } = useAuth();
  const [items, setItems] = useStoredState<LibraryItem[]>(user ? `refyn:${user.id}:studio:library` : null, []);
  const save = useCallback(
    (item: LibraryItem) => setItems((prev) => [item, ...prev.filter((x) => x.id !== item.id)].slice(0, 120)),
    [setItems],
  );
  const remove = useCallback((id: string) => setItems((prev) => prev.filter((x) => x.id !== id)), [setItems]);
  return { items, save, remove };
};

/** Hand-off from the Diagram lab to the maker (same tab). */
export const PENDING_DIAGRAM = "refyn:studio:pending-diagram";
