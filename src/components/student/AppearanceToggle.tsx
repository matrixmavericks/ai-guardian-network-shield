import React from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/lib/portalAppearance";

/** Sun / moon button that flips the student portal between light and dark. */
const AppearanceToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { mode, toggle } = useAppearance();
  const light = mode === "light";
  const label = light ? "Switch to dark mode" : "Switch to light mode";
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-lp-mute transition-colors hover:bg-white/[0.06] hover:text-white",
        className,
      )}
    >
      <Sun className={cn("absolute h-4 w-4 transition-all duration-500", light ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100")} />
      <Moon className={cn("absolute h-4 w-4 transition-all duration-500", light ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")} />
    </button>
  );
};

export default AppearanceToggle;
