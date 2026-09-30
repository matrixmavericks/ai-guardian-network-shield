import type { DeckDesign } from "./types";

// Deck themes. Each has on-screen web fonts (Google Fonts) and PowerPoint-safe
// fonts for the .pptx export, which can't rely on web fonts being installed.

export type Theme = {
  id: string;
  name: string;
  dark: boolean;
  bg: string;
  /** CSS background for slides (can be a gradient); pptx uses bgSolid */
  bgCss: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  heading: string;
  body: string;
  headingWeight: number;
  headingCase?: "none" | "uppercase";
  pptHeading: string;
  pptBody: string;
  /** decorative style */
  motif: "glow" | "grid" | "blob" | "rule" | "none";
};

export const THEMES: Theme[] = [
  { id: "midnight", name: "Midnight", dark: true, bg: "#0B1020", bgCss: "radial-gradient(120% 90% at 85% 10%, #1B2A5C 0%, #0B1020 55%)", surface: "#141B34", text: "#F4F6FB", muted: "#9AA7C2", accent: "#6D8BFF", accent2: "#3FE9FF", heading: "Space Grotesk", body: "Inter", headingWeight: 600, pptHeading: "Segoe UI Semibold", pptBody: "Segoe UI", motif: "glow" },
  { id: "paper", name: "Paper", dark: false, bg: "#FBF8F2", bgCss: "#FBF8F2", surface: "#FFFFFF", text: "#1F2328", muted: "#6B6F76", accent: "#D9480F", accent2: "#0B7285", heading: "Fraunces", body: "Inter", headingWeight: 600, pptHeading: "Georgia", pptBody: "Calibri", motif: "rule" },
  { id: "aurora", name: "Aurora", dark: true, bg: "#140C2E", bgCss: "linear-gradient(135deg, #1B1036 0%, #16254F 50%, #0E3B4A 100%)", surface: "rgba(255,255,255,0.07)", text: "#FFFFFF", muted: "#C9C3E6", accent: "#B794F6", accent2: "#5EEAD4", heading: "Plus Jakarta Sans", body: "Plus Jakarta Sans", headingWeight: 700, pptHeading: "Segoe UI Bold", pptBody: "Segoe UI", motif: "blob" },
  { id: "classic", name: "Classic", dark: false, bg: "#FFFFFF", bgCss: "#FFFFFF", surface: "#F3F6FB", text: "#0F172A", muted: "#5B6475", accent: "#2563EB", accent2: "#F59E0B", heading: "Inter Tight", body: "Inter", headingWeight: 650, pptHeading: "Arial", pptBody: "Arial", motif: "grid" },
  { id: "forest", name: "Forest", dark: true, bg: "#0F2A1F", bgCss: "radial-gradient(110% 90% at 10% 0%, #1D4A36 0%, #0F2A1F 60%)", surface: "rgba(255,255,255,0.06)", text: "#F1F5EE", muted: "#B5C7B6", accent: "#9BE38B", accent2: "#F4D35E", heading: "DM Serif Display", body: "DM Sans", headingWeight: 400, pptHeading: "Georgia", pptBody: "Calibri", motif: "blob" },
  { id: "sunrise", name: "Sunrise", dark: false, bg: "#FFF4EA", bgCss: "linear-gradient(160deg, #FFF4EA 0%, #FFE3D3 100%)", surface: "#FFFFFF", text: "#3B1F1A", muted: "#8A5E52", accent: "#F2545B", accent2: "#F7B32B", heading: "Poppins", body: "Poppins", headingWeight: 600, pptHeading: "Trebuchet MS", pptBody: "Trebuchet MS", motif: "blob" },
  { id: "ocean", name: "Ocean", dark: false, bg: "#EAF4FF", bgCss: "linear-gradient(180deg, #F4F9FF 0%, #E2EFFF 100%)", surface: "#FFFFFF", text: "#0B2545", muted: "#4A6284", accent: "#1B6CF2", accent2: "#13C4A3", heading: "Outfit", body: "Outfit", headingWeight: 600, pptHeading: "Segoe UI Semibold", pptBody: "Segoe UI", motif: "glow" },
  { id: "mono", name: "Editorial", dark: true, bg: "#111111", bgCss: "#111111", surface: "#1C1C1C", text: "#FAFAFA", muted: "#A3A3A3", accent: "#FFD60A", accent2: "#FAFAFA", heading: "Archivo", body: "Inter", headingWeight: 800, headingCase: "uppercase", pptHeading: "Arial Black", pptBody: "Arial", motif: "rule" },
];

export const FONT_PAIRS = [
  { id: "theme", label: "Theme default" },
  { id: "Space Grotesk|Inter", label: "Space Grotesk + Inter", ppt: ["Segoe UI Semibold", "Segoe UI"] },
  { id: "Fraunces|Inter", label: "Fraunces + Inter", ppt: ["Georgia", "Calibri"] },
  { id: "Playfair Display|Source Sans 3", label: "Playfair + Source Sans", ppt: ["Georgia", "Calibri"] },
  { id: "Poppins|Poppins", label: "Poppins", ppt: ["Trebuchet MS", "Trebuchet MS"] },
  { id: "Outfit|Outfit", label: "Outfit", ppt: ["Segoe UI Semibold", "Segoe UI"] },
  { id: "Archivo|Inter", label: "Archivo + Inter", ppt: ["Arial Black", "Arial"] },
  { id: "Lexend|Lexend", label: "Lexend (easy reading)", ppt: ["Verdana", "Verdana"] },
] as const;

export const ACCENTS = ["#6D8BFF", "#2563EB", "#0EA5E9", "#14B8A6", "#22C55E", "#84CC16", "#F59E0B", "#F97316", "#EF4444", "#EC4899", "#A855F7", "#FFD60A"];

/** The theme with the deck's accent and font overrides applied. */
export function resolveTheme(design: DeckDesign): Theme {
  const base = THEMES.find((t) => t.id === design.theme) ?? THEMES[0];
  const t = { ...base };
  if (design.accent) t.accent = design.accent;
  const pair = FONT_PAIRS.find((p) => p.id === design.font);
  if (pair && "ppt" in pair) {
    const [h, b] = pair.id.split("|");
    t.heading = h;
    t.body = b;
    t.pptHeading = pair.ppt[0];
    t.pptBody = pair.ppt[1];
    t.headingCase = "none";
    t.headingWeight = h === "Archivo" ? 800 : h === "Playfair Display" || h === "Fraunces" ? 600 : 600;
  }
  return t;
}

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;700;800&family=DM+Serif+Display&family=DM+Sans:wght@400;500;700&family=Poppins:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Archivo:wght@600;800;900&family=Playfair+Display:wght@500;600;700&family=Source+Sans+3:wght@400;600&family=Lexend:wght@400;500;600&display=swap";

/** Load the deck fonts once (Google Fonts). */
export function loadDeckFonts(doc: Document = document) {
  if (doc.getElementById("refyn-deck-fonts")) return;
  const link = doc.createElement("link");
  link.id = "refyn-deck-fonts";
  link.rel = "stylesheet";
  link.href = FONT_URL;
  doc.head.appendChild(link);
}
export const DECK_FONT_URL = FONT_URL;

/** Readable text colour on an accent fill. */
export const onColor = (hex: string) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111111" : "#FFFFFF";
};
