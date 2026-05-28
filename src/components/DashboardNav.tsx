import React from "react";
import { Button } from "@/components/ui/button";
import { Bell, Search, Settings, HelpCircle, User, Command } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ThemeSwitcher from "@/components/ThemeSwitcher";

const DashboardNav = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast({ title: "Signed out", description: "Session terminated." });
    navigate("/login");
  };

  const displayName = user?.fullName || user?.email || "Guest";
  const getInitials = () => {
    if (!displayName || displayName === "Guest") return "U";
    return displayName.split(" ").map((p) => p[0]).join("").toUpperCase().substring(0, 2);
  };

  return (
    <header
      className="sticky top-0 z-30 h-14 border-b backdrop-blur-xl"
      style={{
        background: "hsl(var(--background) / 0.7)",
        borderColor: "hsl(var(--border))",
      }}
    >
      <div className="h-full px-5 flex items-center justify-between gap-4">
        {/* Command palette trigger */}
        <button
          type="button"
          className="group flex items-center gap-2.5 h-9 w-full max-w-md rounded-md border px-3 text-left text-sm transition-colors hover:bg-[hsl(var(--muted))]"
          style={{
            background: "hsl(var(--muted) / 0.5)",
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Search anything — students, logs, settings…</span>
          <kbd
            className="hidden sm:inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono-tabular uppercase"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <Command className="h-3 w-3" /> K
          </kbd>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Live status pill */}
          <div
            className="hidden md:flex items-center gap-2 h-8 px-2.5 rounded-full border"
            style={{
              background: "hsl(var(--success) / 0.08)",
              borderColor: "hsl(var(--success) / 0.25)",
            }}
          >
            <span className="ref-status-dot" />
            <span className="text-[10px] font-mono-tabular uppercase tracking-[0.15em]" style={{ color: "hsl(var(--success))" }}>
              Live
            </span>
          </div>

          <ThemeSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-[18px] w-[18px]" />
                <span
                  className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ background: "hsl(var(--destructive))" }}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="ref-eyebrow">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-4 text-sm text-muted-foreground">No new notifications</div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon">
            <HelpCircle className="h-[18px] w-[18px]" />
          </Button>

          <div className="mx-1 h-6 w-px" style={{ background: "hsl(var(--border))" }} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2">
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                  style={{
                    background: "hsl(var(--primary) / 0.18)",
                    color: "hsl(var(--primary))",
                    border: "1px solid hsl(var(--primary) / 0.3)",
                  }}
                >
                  {getInitials()}
                </div>
                <div className="hidden md:block text-left leading-tight pr-1">
                  <div className="text-xs font-semibold">{displayName}</div>
                  <div className="text-[10px] font-mono-tabular uppercase tracking-widest text-muted-foreground">
                    {user?.role || "Guest"}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="ref-eyebrow">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem><User className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
              <DropdownMenuItem><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardNav;
