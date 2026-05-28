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
  const current = THEMES.find(t => t.id === theme)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon" title={`Theme: ${current.label}`}>
            <Palette className="h-5 w-5" />
          </Button>
        ) : (
          <Button variant="outline" className="gap-2">
            <Palette className="h-4 w-4" />
            <span>{current.label}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id as ThemeId)}
            className="flex items-start gap-3 py-2.5 cursor-pointer"
          >
            <div className="flex gap-0.5 mt-0.5 shrink-0 rounded overflow-hidden border border-border">
              {t.swatch.map((c, i) => (
                <div key={i} className="w-3 h-6" style={{ background: c }} />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium flex items-center gap-2">
                {t.label}
                {theme === t.id && <Check className="h-3.5 w-3.5 text-primary" />}
              </div>
              <div className="text-xs text-muted-foreground truncate">{t.description}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSwitcher;
