// Colour themes for any subject name (class, path, project tag), matching the
// MYP subject cards where the subject is one of those.

type Theme = { gradient: string; accent: string };

const THEMES: [RegExp, Theme][] = [
  [/bio|life|ecolog/i, { gradient: "linear-gradient(135deg, #10B981 0%, #059669 45%, #065F46 100%)", accent: "#34D399" }],
  [/chem/i, { gradient: "linear-gradient(135deg, #A855F7 0%, #7C3AED 45%, #4C1D95 100%)", accent: "#C084FC" }],
  [/phys/i, { gradient: "linear-gradient(135deg, #6366F1 0%, #4338CA 45%, #1E1B4B 100%)", accent: "#A5B4FC" }],
  [/science|lab/i, { gradient: "linear-gradient(135deg, #14B8A6 0%, #0E7490 50%, #083344 100%)", accent: "#5EEAD4" }],
  [/math|algebra|calc|geometr|statist/i, { gradient: "linear-gradient(135deg, #F43F5E 0%, #E11D48 45%, #881337 100%)", accent: "#FDA4AF" }],
  [/english|language|literat|writing|french|spanish|hindi/i, { gradient: "linear-gradient(135deg, #3B82F6 0%, #2563EB 45%, #1E3A8A 100%)", accent: "#93C5FD" }],
  [/histor/i, { gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 45%, #78350F 100%)", accent: "#FCD34D" }],
  [/individ|societ|geograph|econom|global/i, { gradient: "linear-gradient(135deg, #14B8A6 0%, #0D9488 45%, #134E4A 100%)", accent: "#5EEAD4" }],
  [/comput|coding|design|tech|program/i, { gradient: "linear-gradient(135deg, #06B6D4 0%, #0284C7 45%, #0C4A6E 100%)", accent: "#67E8F9" }],
  [/art|music|drama|film/i, { gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 45%, #831843 100%)", accent: "#F9A8D4" }],
  [/physical|sport|health|pe\b/i, { gradient: "linear-gradient(135deg, #84CC16 0%, #65A30D 45%, #365314 100%)", accent: "#BEF264" }],
];

const FALLBACK: Theme[] = [
  { gradient: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 50%, #1E1B4B 100%)", accent: "#7CB4FF" },
  { gradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 50%, #2E1065 100%)", accent: "#C4B5FD" },
  { gradient: "linear-gradient(135deg, #0EA5E9 0%, #0369A1 50%, #082F49 100%)", accent: "#7DD3FC" },
  { gradient: "linear-gradient(135deg, #F97316 0%, #C2410C 50%, #431407 100%)", accent: "#FDBA74" },
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const themeFor = (subject?: string | null): Theme => {
  const s = subject || "";
  return THEMES.find(([re]) => re.test(s))?.[1] ?? FALLBACK[hash(s) % FALLBACK.length];
};

/** "MYP 5 Biology" -> "BI", "Extended Mathematics" -> "EM" */
export const monogram = (name: string) => {
  const words = name.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !/^(myp|and|the|for)$/i.test(w));
  const letters = words.length >= 2 ? words[0][0] + words[1][0] : (words[0] || name).slice(0, 2);
  return letters.toUpperCase();
};
