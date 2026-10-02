import type React from "react";
import type { Ctx } from "./kit/draw";
import type { SimTheme } from "./kit/core";

// Every simulation: what it is, which subject and topics it belongs to, and
// how to load it (each one is its own chunk, loaded when opened).

export type SimSubject = "physics" | "maths" | "economics" | "geography" | "biology" | "chemistry";
export type Level = "MYP 1-3" | "MYP 4-5" | "DP";

export const SUBJECTS: Record<SimSubject, { name: string; slug: string; color: string; pilot: boolean }> = {
  physics: { name: "Physics", slug: "physics", color: "#22d3ee", pilot: true },
  maths: { name: "Mathematics", slug: "extended-mathematics", color: "#a78bfa", pilot: true },
  economics: { name: "Economics", slug: "individuals-societies", color: "#fbbf24", pilot: true },
  geography: { name: "Geography", slug: "individuals-societies", color: "#34d399", pilot: true },
  biology: { name: "Biology", slug: "biology", color: "#4ade80", pilot: false },
  chemistry: { name: "Chemistry", slug: "chemistry", color: "#f472b6", pilot: false },
};

export type SimModule = { default: React.ComponentType; thumb: (ctx: Ctx, w: number, h: number, t: SimTheme) => void };
export type SimMeta = {
  id: string;
  title: string;
  tagline: string;
  subject: SimSubject;
  /** Topic ids in the built-in MYP content */
  topics: string[];
  levels: Level[];
  load: () => Promise<SimModule>;
};

export const SIMS: SimMeta[] = [
  // Physics
  { id: "projectile", title: "Projectile motion", tagline: "Launch anything on any planet, with or without air resistance.", subject: "physics", topics: ["phy-speed", "phy-newton"], levels: ["MYP 4-5", "DP"], load: () => import("./physics/projectile") },
  { id: "pendulum", title: "Pendulum and SHM", tagline: "Period, energy and the small-angle approximation.", subject: "physics", topics: ["phy-energy-work", "phy-efficiency"], levels: ["MYP 4-5", "DP"], load: () => import("./physics/pendulum") },
  { id: "forces", title: "Forces on a slope", tagline: "Free-body diagrams, friction and Newton's second law.", subject: "physics", topics: ["phy-newton"], levels: ["MYP 1-3", "MYP 4-5", "DP"], load: () => import("./physics/forces") },
  { id: "waves", title: "Waves on a string", tagline: "Transverse, longitudinal, superposition and standing waves.", subject: "physics", topics: ["phy-wave-props", "phy-light-sound"], levels: ["MYP 1-3", "MYP 4-5", "DP"], load: () => import("./physics/waves") },
  { id: "interference", title: "Ripple tank interference", tagline: "Two sources, path difference and the pattern they make.", subject: "physics", topics: ["phy-wave-props", "phy-light-sound"], levels: ["MYP 4-5", "DP"], load: () => import("./physics/interference") },
  { id: "circuits", title: "Circuit lab", tagline: "Series and parallel circuits with meters and glowing bulbs.", subject: "physics", topics: ["phy-circuits"], levels: ["MYP 1-3", "MYP 4-5", "DP"], load: () => import("./physics/circuits") },
  { id: "gas", title: "Gas in a box", tagline: "Particles, pressure, temperature and the gas laws.", subject: "physics", topics: ["phy-thermal", "chem-states"], levels: ["MYP 4-5", "DP"], load: () => import("./physics/gas") },
  { id: "orbits", title: "Orbits and gravity", tagline: "Kepler's laws, escape speed and orbital energy.", subject: "physics", topics: ["phy-newton", "phy-energy-work"], levels: ["DP"], load: () => import("./physics/orbits") },
  // Mathematics
  { id: "transformations", title: "Transforming functions", tagline: "Stretch, shift and reflect any graph.", subject: "maths", topics: ["math-functions-notation", "math-quadratics"], levels: ["MYP 4-5", "DP"], load: () => import("./maths/transformations") },
  { id: "quadratics", title: "Quadratic explorer", tagline: "Vertex, roots and the discriminant, all three forms.", subject: "maths", topics: ["math-quadratics"], levels: ["MYP 4-5", "DP"], load: () => import("./maths/quadratics") },
  { id: "linear", title: "Straight-line graphs", tagline: "Gradient, intercept, parallel and perpendicular lines.", subject: "maths", topics: ["math-linear-graphs", "math-linear"], levels: ["MYP 1-3", "MYP 4-5"], load: () => import("./maths/linear") },
  { id: "trig", title: "Unit circle and trig graphs", tagline: "Watch sine and cosine come out of a turning circle.", subject: "maths", topics: ["math-trig"], levels: ["MYP 4-5", "DP"], load: () => import("./maths/trig") },
  { id: "probability", title: "Chance lab", tagline: "Coins, dice and spinners: frequency meets probability.", subject: "maths", topics: ["math-probability"], levels: ["MYP 1-3", "MYP 4-5", "DP"], load: () => import("./maths/probability") },
  { id: "normal", title: "Normal distribution", tagline: "Areas, z-scores and what samples really look like.", subject: "maths", topics: ["math-statistics"], levels: ["MYP 4-5", "DP"], load: () => import("./maths/normal") },
  { id: "sequences", title: "Sequences and series", tagline: "Arithmetic and geometric growth, sums and limits.", subject: "maths", topics: ["math-sequences"], levels: ["MYP 4-5", "DP"], load: () => import("./maths/sequences") },
  { id: "calculus", title: "Derivative and area", tagline: "From secant to tangent, from rectangles to the integral.", subject: "maths", topics: ["math-functions-notation"], levels: ["DP"], load: () => import("./maths/calculus") },
  // Economics
  { id: "market", title: "Market simulator", tagline: "Supply, demand, shocks, taxes and price controls.", subject: "economics", topics: ["is-supply-demand", "is-scarcity"], levels: ["MYP 1-3", "MYP 4-5", "DP"], load: () => import("./economics/market") },
  { id: "elasticity", title: "Elasticity and revenue", tagline: "Why some price rises earn more and some earn less.", subject: "economics", topics: ["is-supply-demand"], levels: ["MYP 4-5", "DP"], load: () => import("./economics/elasticity") },
  { id: "ppc", title: "Production possibilities", tagline: "Scarcity, choice, opportunity cost and growth.", subject: "economics", topics: ["is-scarcity"], levels: ["MYP 1-3", "MYP 4-5", "DP"], load: () => import("./economics/ppc") },
  { id: "adas", title: "AD/AS macroeconomy", tagline: "Output, the price level, gaps and policy.", subject: "economics", topics: [], levels: ["DP"], load: () => import("./economics/adas") },
  // Geography
  { id: "population", title: "Population pyramid", tagline: "Fertility, life expectancy and migration over decades.", subject: "geography", topics: ["is-population", "is-urbanisation"], levels: ["MYP 1-3", "MYP 4-5", "DP"], load: () => import("./geography/population") },
  { id: "climate", title: "Climate model", tagline: "Greenhouse gases, feedbacks and warming over time.", subject: "geography", topics: ["is-climate", "is-sdgs"], levels: ["MYP 1-3", "MYP 4-5", "DP"], load: () => import("./geography/climate") },
  { id: "tectonics", title: "Plate boundaries", tagline: "What happens where plates meet, pull apart or slide.", subject: "geography", topics: ["is-tectonics"], levels: ["MYP 1-3", "MYP 4-5"], load: () => import("./geography/tectonics") },
  // Biology
  { id: "osmosis", title: "Diffusion and osmosis", tagline: "Particles, membranes and where the water goes.", subject: "biology", topics: ["bio-transport"], levels: ["MYP 1-3", "MYP 4-5"], load: () => import("./biology/osmosis") },
  { id: "enzymes", title: "Enzyme activity", tagline: "Temperature, pH and substrate: find the optimum.", subject: "biology", topics: ["bio-enzymes"], levels: ["MYP 4-5", "DP"], load: () => import("./biology/enzymes") },
  { id: "ecosystem", title: "Predator and prey", tagline: "Populations that rise and fall together.", subject: "biology", topics: ["bio-ecosystems"], levels: ["MYP 1-3", "MYP 4-5", "DP"], load: () => import("./biology/ecosystem") },
  // Chemistry
  { id: "rates", title: "Rates of reaction", tagline: "Collision theory: temperature, concentration, catalysts.", subject: "chemistry", topics: ["chem-rates"], levels: ["MYP 4-5", "DP"], load: () => import("./chemistry/rates") },
  { id: "atom", title: "Build an atom", tagline: "Protons, neutrons and electrons: elements, ions, isotopes.", subject: "chemistry", topics: ["chem-atoms", "chem-periodic"], levels: ["MYP 1-3", "MYP 4-5"], load: () => import("./chemistry/atom") },
  { id: "titration", title: "Titration and pH", tagline: "Neutralisation curves and indicators, drop by drop.", subject: "chemistry", topics: ["chem-acids"], levels: ["MYP 4-5", "DP"], load: () => import("./chemistry/titration") },
];

export const simById = (id?: string) => SIMS.find((s) => s.id === id);
export const simsForTopic = (topicId: string) => SIMS.filter((s) => s.topics.includes(topicId));
