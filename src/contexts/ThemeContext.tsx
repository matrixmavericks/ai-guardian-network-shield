import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeId = "command" | "atelier" | "graphite";

export const THEMES: {
  id: ThemeId;
  label: string;
  tagline: string;
  description: string;
  swatch: string[];
  mode: "dark" | "light";
}[] = [
  {
    id: "command",
    label: "Command",
    tagline: "Mission-control dark",
    description: "Deep slate operations surface with electric blue accents.",
    swatch: ["#020617", "#0f172a", "#2563eb", "#38bdf8"],
    mode: "dark",
  },
  {
    id: "atelier",
    label: "Atelier",
    tagline: "Editorial light",
    description: "Warm off-white paper with ink contrast and quiet structure.",
    swatch: ["#f7f5f0", "#e8e4dc", "#171717", "#3b82f6"],
    mode: "light",
  },
  {
    id: "graphite",
    label: "Graphite",
    tagline: "Pure precision",
    description: "Near-black monochrome with razor-thin lines and zero noise.",
    swatch: ["#000000", "#0a0a0a", "#1f1f1f", "#fafafa"],
    mode: "dark",
  },
];

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "command", setTheme: () => {} });
const STORAGE_KEY = "refyn-theme-v2";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "command";
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return stored && THEMES.some((t) => t.id === stored) ? stored : "command";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    const meta = THEMES.find((t) => t.id === theme);
    if (meta?.mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return <Ctx.Provider value={{ theme, setTheme: setThemeState }}>{children}</Ctx.Provider>;
};

export const useTheme = () => useContext(Ctx);
