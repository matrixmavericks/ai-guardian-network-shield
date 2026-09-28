import { convertPercentageToGrade, getGPA, getGradeBoundaries, type GradingSystem } from "@/services/gradingService";

export type GradedWork = {
  id: string;
  /** 0–100 */
  pct: number;
  grade: number;
  max: number;
  feedback: string | null;
  gradedAt: string;
  title: string;
  subject: string;
  className: string | null;
};

export type Upcoming = { id: string; title: string; subject: string; className: string | null; due: string };

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export const byDate = (a: GradedWork, b: GradedWork) => new Date(a.gradedAt).getTime() - new Date(b.gradedAt).getTime();

/** Recent average minus the one before it (last 3 vs the 3 before), when there's enough work. */
export const trendOf = (items: GradedWork[]) => {
  const s = [...items].sort(byDate).map((g) => g.pct);
  if (s.length < 2) return null;
  const n = Math.min(3, Math.floor(s.length / 2));
  return avg(s.slice(-n)) - avg(s.slice(-2 * n, -n));
};

export const standing = (pct: number) =>
  pct >= 85 ? { label: "Excelling", tone: "green" as const } : pct >= 70 ? { label: "On track", tone: "blue" as const } : pct >= 55 ? { label: "Building", tone: "amber" as const } : { label: "Needs support", tone: "red" as const };

export type SubjectStat = { subject: string; pct: number; count: number; trend: number | null; series: number[]; last: string };

export const subjectStats = (items: GradedWork[]): SubjectStat[] => {
  const map = new Map<string, GradedWork[]>();
  for (const g of items) map.set(g.subject, [...(map.get(g.subject) || []), g]);
  return [...map.entries()]
    .map(([subject, list]) => {
      const sorted = [...list].sort(byDate);
      return { subject, pct: avg(list.map((g) => g.pct)), count: list.length, trend: trendOf(list), series: sorted.map((g) => g.pct), last: sorted[sorted.length - 1].gradedAt };
    })
    .sort((a, b) => b.pct - a.pct);
};

/** Grade label in the chosen system, e.g. "6" (IB), "A-" (letter), "B" (IGCSE). */
export const gradeIn = (pct: number, system: GradingSystem | null) => (system ? convertPercentageToGrade(pct, system) : `${Math.round(pct)}%`);

export const scaleNote = (system: GradingSystem | null) =>
  !system ? "" : system.code === "ib" ? "on the MYP 1–7 scale" : system.code === "us_letter" ? "letter grade" : system.code === "igcse" ? "IGCSE grade" : "letter band";

export const gpaOf = (items: GradedWork[], system: GradingSystem | null) => {
  if (!system || system.scale_config?.type !== "us_letter" || !items.length) return null;
  return avg(items.map((g) => getGPA(g.pct, system) ?? 0));
};

/** Grade bands of the system, best first, with how many pieces landed in each. */
export const distribution = (items: GradedWork[], system: GradingSystem | null) => {
  if (!system) return [];
  const bands = getGradeBoundaries(system);
  return bands.map((b, i) => {
    const upper = i === 0 ? 101 : bands[i - 1].min;
    return { label: b.label, min: b.min, count: items.filter((g) => g.pct >= b.min && g.pct < upper).length };
  });
};

/** Average needed over the next `n` pieces to finish at `target`%. */
export const neededFor = (items: GradedWork[], target: number, n: number) => {
  const sum = items.reduce((a, g) => a + g.pct, 0);
  return (target * (items.length + n) - sum) / n;
};

export const PALETTE = ["#7CB4FF", "#34D399", "#FBBF24", "#F472B6", "#A78BFA", "#3FE9FF", "#F2706A", "#5EEAD4"];

export const colorFor = (subject: string, subjects: string[]) => PALETTE[Math.max(0, subjects.indexOf(subject)) % PALETTE.length];

export const toneHex = { green: "#34D399", blue: "#7CB4FF", amber: "#FBBF24", red: "#F2706A" } as const;

export const toneOf = (pct: number): keyof typeof toneHex => (pct >= 85 ? "green" : pct >= 70 ? "blue" : pct >= 55 ? "amber" : "red");

export const toCsv = (items: GradedWork[], system: GradingSystem | null) => {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [...items].sort(byDate).map((g) =>
    [g.gradedAt.slice(0, 10), g.subject, g.className ?? "", g.title, `${g.grade}/${g.max}`, g.pct.toFixed(1), gradeIn(g.pct, system), g.feedback ?? ""].map((v) => esc(String(v))).join(","),
  );
  return [["Date", "Subject", "Class", "Assignment", "Score", "Percent", system?.name ?? "Grade", "Feedback"].map(esc).join(","), ...rows].join("\n");
};
