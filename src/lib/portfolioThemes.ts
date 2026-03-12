// Shared theme presets for portfolio project pages
export const PORTFOLIO_THEMES = [
  { id: "default", label: "Default", bg: "bg-background", accent: "border-primary/20", headerBg: "", textClass: "" },
  { id: "midnight", label: "Midnight", bg: "bg-slate-950", accent: "border-blue-500/30", headerBg: "bg-gradient-to-br from-slate-900 to-blue-950", textClass: "text-slate-100" },
  { id: "sunset", label: "Sunset", bg: "bg-orange-50 dark:bg-orange-950/20", accent: "border-orange-400/30", headerBg: "bg-gradient-to-br from-orange-100 to-rose-100 dark:from-orange-900/30 dark:to-rose-900/30", textClass: "" },
  { id: "forest", label: "Forest", bg: "bg-emerald-50 dark:bg-emerald-950/20", accent: "border-emerald-500/30", headerBg: "bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30", textClass: "" },
  { id: "lavender", label: "Lavender", bg: "bg-violet-50 dark:bg-violet-950/20", accent: "border-violet-400/30", headerBg: "bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30", textClass: "" },
  { id: "minimal", label: "Minimal", bg: "bg-neutral-50 dark:bg-neutral-950", accent: "border-neutral-300/50", headerBg: "bg-neutral-100 dark:bg-neutral-900", textClass: "" },
] as const;

export type PortfolioThemeId = typeof PORTFOLIO_THEMES[number]["id"];

export const getTheme = (id: string) =>
  PORTFOLIO_THEMES.find(t => t.id === id) || PORTFOLIO_THEMES[0];
