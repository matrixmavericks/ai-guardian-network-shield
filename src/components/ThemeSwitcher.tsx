import React from "react";
import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, THEMES, ThemeId } from "@/contexts/ThemeContext";

const ThemeSwitcher: React.FC<{ variant?: "icon" | "full" }> = ({ variant = "icon" }) => {
  const { theme, setTheme } = useTheme();
  const current = THEMES.find((t) => t.id === theme)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon" title={`Theme: ${current.label}`}>
            <Palette className="h-[18px] w-[18px]" />
          </Button>
        ) : (
          <Button variant="outline" className="gap-2 font-mono-tabular text-xs uppercase tracking-widest">
            <Palette className="h-4 w-4" />
            <span>{current.label}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-1">
        <DropdownMenuLabel className="ref-eyebrow px-3 pt-2 pb-1">Workspace Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => {
          const active = theme === t.id;
          return (
            <DropdownMenuItem
              key={t.id}
              onClick={() => setTheme(t.id as ThemeId)}
              className="flex items-stretch gap-3 p-2 cursor-pointer rounded-md"
            >
              <div className="flex rounded-md overflow-hidden border border-border shrink-0 h-12 w-12">
                <div className="flex-1 flex flex-col">
                  <div className="flex-1" style={{ background: t.swatch[0] }} />
                  <div className="flex-1" style={{ background: t.swatch[1] }} />
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex-1" style={{ background: t.swatch[2] }} />
                  <div className="flex-1" style={{ background: t.swatch[3] }} />
                </div>
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{t.label}</span>
                  <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-muted-foreground">
                    {t.tagline}
                  </span>
                  {active && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                </div>
                <div className="text-xs text-muted-foreground leading-snug mt-0.5">{t.description}</div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSwitcher;
