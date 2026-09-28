import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Book,
  Brain,
  Briefcase,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  Rocket,
  Sparkles,
  Users,
  X,
  Award,
  History,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/landing/LandingNav";

const groups = [
  {
    label: "Core",
    items: [
      { title: "Overview", href: "/student-dashboard", icon: LayoutGrid },
      { title: "My Courses", href: "/my-courses", icon: GraduationCap },
      { title: "Classes", href: "/classes", icon: Users },
      { title: "Grades", href: "/grades", icon: Award },
    ],
  },
  {
    label: "Learning",
    items: [
      { title: "Learning Paths", href: "/learning-paths", icon: Book },
      { title: "Portfolio", href: "/portfolio", icon: Briefcase },
      { title: "AI Assistant", href: "/ai-learning-assistant", icon: Brain },
      { title: "Messages", href: "/messages", icon: MessageSquare },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "Thinking Replay", href: "/intel/thinking-replay", icon: History },
      { title: "Future Self", href: "/intel/future-self", icon: Rocket },
      { title: "Peer Benchmark", href: "/intel/peer-compare", icon: Users },
    ],
  },
];

const SidebarBody: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.email || "Student";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-6 pt-6">
        <Link to="/student-dashboard" onClick={onNavigate} aria-label="Refyn overview" className="text-white">
          <Wordmark className="text-[22px]" />
        </Link>
        {!onNavigate && (
          <span className="rounded-full border border-lp-blue/40 bg-lp-blue/15 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-lp-sky">
            Student
          </span>
        )}
      </div>

      <nav aria-label="Student" className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10.5px] font-medium uppercase tracking-[0.2em] text-lp-mute">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      end={item.href === "/student-dashboard"}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] transition-all duration-200",
                          isActive
                            ? "bg-gradient-to-r from-lp-blue/25 via-lp-blue/10 to-transparent font-medium text-white"
                            : "text-lp-soft hover:bg-white/[0.04] hover:text-white",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-lp-sky shadow-[0_0_12px_2px_rgba(124,180,255,0.7)]" />
                          )}
                          <Icon
                            className={cn(
                              "h-[18px] w-[18px] shrink-0 transition-colors",
                              isActive ? "text-lp-sky" : "text-lp-mute group-hover:text-lp-soft",
                            )}
                          />
                          <span className="truncate">{item.title}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Nudge towards the assistant */}
      <div className="px-3 pb-3">
        <div className="relative overflow-hidden rounded-2xl border border-lp-blue/30 bg-gradient-to-br from-lp-blue/20 via-lp-surface to-lp-surface p-4">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-60 blur-2xl"
            style={{ background: "radial-gradient(circle, rgba(63,233,255,0.5), transparent 70%)" }}
          />
          <p className="relative flex items-center gap-1.5 text-[13.5px] font-medium text-white">
            <Sparkles className="h-3.5 w-3.5 text-lp-cyan" /> Stuck on something?
          </p>
          <p className="relative mt-1 text-[12.5px] leading-snug text-lp-soft">Refyn will guide you through it, step by step.</p>
          <Link
            to="/ai-learning-assistant"
            onClick={onNavigate}
            className="relative mt-3 inline-flex h-8 items-center rounded-lg bg-lp-blue px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-[#2F6FE0]"
          >
            Ask Refyn
          </Link>
        </div>
      </div>

      <div className="border-t border-lp-line p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lp-blue to-[#1E3A8A] text-[12px] font-semibold text-white ring-2 ring-lp-blue/30">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-white">{displayName}</p>
            <p className="truncate text-[11.5px] text-lp-mute">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lp-mute transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Sidebar for every student page: fixed on desktop, a slide-out drawer on
 * smaller screens (opened by the floating menu button).
 */
const StudentSidebar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <aside
        data-legacy-dashboard-sidebar="true"
        className="relative z-[1] hidden h-screen w-[264px] shrink-0 self-start border-r border-lp-line bg-lp-deep font-ui lg:sticky lg:top-0 lg:block"
      >
        <SidebarBody />
      </aside>

      {/* Mobile: floating menu button + drawer */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="student-drawer"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-lp-blue text-white shadow-[0_12px_40px_-8px_rgba(59,130,246,0.8)] transition-transform active:scale-95 lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-lp-deep/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        id="student-drawer"
        aria-hidden={!open}
        className={cn(
          "fixed bottom-0 left-0 top-0 z-50 w-[86%] max-w-[300px] border-r border-lp-line bg-lp-deep font-ui shadow-2xl transition-[transform,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          open ? "translate-x-0" : "invisible -translate-x-full",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute right-3 top-5 flex h-9 w-9 items-center justify-center rounded-full text-lp-soft hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarBody onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
};

export default StudentSidebar;
