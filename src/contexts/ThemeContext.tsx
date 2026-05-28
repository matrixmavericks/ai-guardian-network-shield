import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeId = "minimalist" | "light" | "dark" | "techy";

export const THEMES: { id: ThemeId; label: string; description: string; swatch: string[] }[] = [
  { id: "minimalist", label: "Minimalist", description: "Calm paper-white, monochrome, generous space", swatch: ["#fafaf7", "#1a1a1a", "#6b7280"] },
  { id: "light", label: "Aurora Light", description: "Soft sky gradients, friendly and bright", swatch: ["#f0f7ff", "#3b82f6", "#a855f7"] },
  { id: "dark", label: "Midnight", description: "Deep navy with electric indigo accents", swatch: ["#0a0a1a", "#4f46e5", "#22d3ee"] },
  { id: "techy", label: "Neon Grid", description: "Cyberpunk terminal, neon green on black", swatch: ["#000000", "#00ff9d", "#ff00aa"] },
];

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "light", setTheme: () => {} });
const STORAGE_KEY = "refyn-theme";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return stored && THEMES.some(t => t.id === stored) ? stored : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    // Keep tailwind .dark class in sync for components relying on it
    if (theme === "dark" || theme === "techy") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return <Ctx.Provider value={{ theme, setTheme: setThemeState }}>{children}</Ctx.Provider>;
};

export const useTheme = () => useContext(Ctx);
