import type { SubjectKind } from "./studio";
import type { Worksheet } from "./worksheet";

/** A finished example per subject, shown before the first generation. */
export const SAMPLE: Record<SubjectKind, Worksheet> = {
  math: {
    kind: "worksheet",
    title: "Trigonometry in any triangle",
    subtitle: "MYP 4-5 Extended · Sine rule, cosine rule and area",
    instructions: "Give answers to 3 significant figures unless told otherwise. Show all your working.",
    timeMinutes: 35,
    sections: [
      {
        id: "s1",
        title: "Warm up",
        questions: [
          { id: "q1", type: "mcq", prompt: "Which rule would you use to find side x?", marks: 1, options: ["Pythagoras", "Sine rule", "Cosine rule", "SOHCAHTOA"], answer: "C", diagram: { kind: "triangle", a: 7, b: 5, C: 48, unit: "cm", sideLabels: ["7 cm", "5 cm", "x"], angleLabels: [null, null, "48°"] } },
          { id: "q2", type: "fill", prompt: "In any triangle, a² = b² + c² − 2bc × ___ .", marks: 1, answer: "cos A" },
        ],
      },
      {
        id: "s2",
        title: "Practice",
        questions: [
          {
            id: "q3",
            type: "working",
            prompt: "Angle O is the angle at the centre of the circle. Find the size of angle x, giving a reason.",
            marks: 3,
            lines: 5,
            diagram: { kind: "circle", points: [{ name: "A", angle: 210 }, { name: "B", angle: 330 }, { name: "C", angle: 100 }], segments: [["A", "C"], ["B", "C"], ["A", "O"], ["B", "O"]], angles: [{ at: "O", from: "A", to: "B", label: "124°" }, { at: "C", from: "A", to: "B", label: "x" }] },
            answer: "x = 62°, the angle at the centre is twice the angle at the circumference.",
          },
          { id: "q4", type: "short", prompt: "Explain why the graph of y = x² − 2x − 3 crosses the x-axis twice.", marks: 2, lines: 3, diagram: { kind: "graph", x: [-3, 5], y: [-5, 6], functions: [{ expr: "x^2 - 2x - 3", label: "y = x² − 2x − 3" }], points: [{ x: -1, y: 0, label: "(−1, 0)" }, { x: 3, y: 0, label: "(3, 0)" }] }, answer: "The discriminant (−2)² − 4(1)(−3) = 16 > 0, so there are two real roots." },
        ],
      },
    ],
    extension: "A triangle has sides 8 cm, 11 cm and 15 cm. Is it acute, right-angled or obtuse? Prove it.",
  },
  physics: {
    kind: "worksheet",
    title: "Forces, circuits and lenses",
    subtitle: "MYP 4-5 · Mixed review",
    instructions: "Use g = 9.8 N/kg. Include units in every answer.",
    timeMinutes: 30,
    sections: [
      {
        id: "s1",
        title: "Forces",
        questions: [
          {
            id: "q1",
            type: "short",
            prompt: "A 4 kg box rests on a 25° slope. Name the three forces shown and explain why the box does not slide.",
            marks: 3,
            lines: 4,
            diagram: { kind: "fbd", incline: 25, forces: [{ label: "W", angle: 270, size: 1.3 }, { label: "R", angle: 115, size: 1.1 }, { label: "F", angle: 25, size: 0.7 }] },
            answer: "Weight, normal reaction and friction; friction balances the component of weight down the slope.",
          },
        ],
      },
      {
        id: "s2",
        title: "Circuits and light",
        questions: [
          { id: "q2", type: "working", prompt: "The battery is 6 V and the resistor is 4 Ω. Calculate the current through the resistor.", marks: 2, lines: 4, diagram: { kind: "circuit", series: [{ type: "ammeter", label: "A₁" }, { type: "switch" }], parallel: [[{ type: "bulb", label: "L₁" }], [{ type: "resistor", label: "4 Ω" }]], source: [{ type: "battery", label: "6 V" }] }, answer: "I = V/R = 6/4 = 1.5 A" },
          { id: "q3", type: "mcq", prompt: "The object is 25 cm from a converging lens of focal length 10 cm. The image is:", marks: 1, options: ["virtual and upright", "real, inverted and smaller", "real, inverted and larger", "at infinity"], answer: "B", diagram: { kind: "lens", lens: "converging", f: 10, u: 25, objectHeight: 4 } },
        ],
      },
    ],
    extension: "Where would you place the object so the image is the same size as the object? Explain using the ray diagram.",
  },
  humanities: {
    kind: "worksheet",
    title: "Taxes, markets and welfare",
    subtitle: "DP Economics SL · Microeconomics",
    instructions: "Refer to the diagrams in your answers and use economic terms precisely.",
    timeMinutes: 35,
    sections: [
      {
        id: "s1",
        title: "Diagram analysis",
        questions: [
          { id: "q1", type: "short", prompt: "Using the diagram, explain the effect of an indirect tax on consumers and producers.", marks: 4, lines: 5, diagram: { kind: "supplydemand", tax: 2, shade: ["tax", "DWL"] }, answer: "Price for consumers rises to Pc, producers receive Pp, quantity falls to Q₂; tax revenue and deadweight loss shown." },
          { id: "q2", type: "match", prompt: "Match each term to its definition.", marks: 3, pairs: [["Deadweight loss", "Loss of total welfare from under-production"], ["Incidence", "How the burden of a tax is shared"], ["Subsidy", "A payment to producers that lowers costs"]] },
        ],
      },
      {
        id: "s2",
        title: "Data response",
        questions: [
          { id: "q3", type: "short", prompt: "Describe the pattern of rainfall in Pune and suggest one impact on farmers.", marks: 3, lines: 4, diagram: { kind: "climate", place: "Pune, India", temp: [21, 23, 26, 29, 30, 27, 25, 24, 25, 25, 23, 21], rain: [2, 1, 3, 13, 36, 150, 185, 135, 120, 75, 25, 6] }, answer: "Very little rain Nov-Apr, heavy monsoon Jun-Sep peaking in July; crops depend on monsoon timing." },
        ],
      },
    ],
    extension: "Evaluate whether a sugar tax is the best way to reduce obesity in India.",
  },
};
