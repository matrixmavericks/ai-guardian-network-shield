import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Book,
  Brain,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  Shapes,
  ClipboardCheck,
  Gauge,
  GraduationCap,
  Layers,
  LayoutGrid,
  Library,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  NotebookPen,
  Radar,
  Rocket,
  Search,
  Sparkles,
  Table2,
  Users,
  X,
  Award,
  History,
  Presentation,
  FileStack,
  Target,
  ListChecks,
  WandSparkles,
  TrendingUp,
  Gem,
  Orbit,
  Globe2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isStudentId } from "@/lib/studentIds";
import { cn } from "@/lib/utils";
import AppearanceToggle from "@/components/student/AppearanceToggle";
import { modKey } from "@/lib/portalAppearance";
import CommandPalette, { type PaletteNav } from "@/components/portal/CommandPalette";
import { needsMarking, useTeacherData, waited } from "@/components/teacher/data";
import { Wordmark } from "@/components/landing/LandingNav";
import { NotificationBell, UnreadDot } from "@/components/notifications/NotificationBell";
import { getStudioConfig } from "@/lib/mispStudioConfigs";

type NavItem = { title: string; href: string; icon: React.ElementType; badge?: "marking" };
type NavGroup = { label: string; items: NavItem[] };

/** Gems, Worlds and the Brain, for students and teachers alike */
const SPACES: NavGroup = {
  label: "Spaces",
  items: [
    { title: "Brain", href: "/brain", icon: Orbit },
    { title: "Gems", href: "/gems", icon: Gem },
    { title: "Worlds", href: "/worlds", icon: Globe2 },
  ],
};

const STUDENT_GROUPS: NavGroup[] = [
  {
    label: "Core",
    items: [
      { title: "Overview", href: "/student-dashboard", icon: LayoutGrid },
      { title: "My Subjects", href: "/my-courses", icon: GraduationCap },
      { title: "Classes", href: "/classes", icon: Users },
      { title: "Grades", href: "/grades", icon: Award },
      { title: "Progress", href: "/progress", icon: TrendingUp },
    ],
  },
  SPACES,
  {
    label: "Learning",
    items: [
      { title: "Learning Paths", href: "/learning-paths", icon: Book },
      { title: "Portfolio", href: "/portfolio", icon: Briefcase },
      { title: "Personal Project", href: "/personal-project", icon: Target },
      { title: "Assessment coach", href: "/assessment-coach", icon: ListChecks },
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

const TEACHER_GROUPS: NavGroup[] = [
  {
    label: "Core",
    items: [
      { title: "Overview", href: "/dashboard", icon: LayoutGrid },
      { title: "Marking", href: "/marking", icon: ClipboardCheck, badge: "marking" },
      { title: "Marking copilot", href: "/marking-copilot", icon: WandSparkles },
      { title: "Gradebook", href: "/grades", icon: Table2 },
      { title: "Class progress", href: "/progress", icon: TrendingUp },
      { title: "Classes", href: "/classes", icon: Users },
    ],
  },
  SPACES,
  {
    label: "Teaching",
    items: [
      { title: "Planner", href: "/teacher-plan-generator", icon: NotebookPen },
      { title: "Presentations", href: "/decks", icon: Presentation },
      { title: "Past papers", href: "/past-papers", icon: FileStack },
      { title: "Personal Project", href: "/personal-project", icon: Target },
      { title: "MYP Courses", href: "/my-courses", icon: GraduationCap },
      { title: "Content Library", href: "/library", icon: Library },
      { title: "Learning Paths", href: "/learning-paths", icon: Book },
      { title: "Portfolios", href: "/student-portfolios", icon: Briefcase },
      { title: "Messages", href: "/messages", icon: MessageSquare },
    ],
  },
  {
    label: "AI & insights",
    items: [
      { title: "AI Assistant", href: "/ai-learning-assistant", icon: Brain },
      { title: "Differentiate", href: "/intel/auto-iep", icon: Layers },
      { title: "Parent Briefs", href: "/intel/parent-brief", icon: Mail },
      { title: "At-Risk Radar", href: "/intel/at-risk-radar", icon: Radar },
      { title: "Workload & Clashes", href: "/intel/curriculum-conflict", icon: CalendarClock },
      { title: "AI Usage", href: "/ai-usage", icon: Gauge },
    ],
  },
];

const isTeacherRole = (role?: string) => role === "teacher";

/** Pilot "Studio" teachers get their Studio first, and the class overview under Core. */
const groupsFor = (teacher: boolean, email?: string | null): { groups: NavGroup[]; home: string } => {
  if (!teacher) return { groups: STUDENT_GROUPS, home: "/student-dashboard" };
  const studio = getStudioConfig(email);
  if (!studio) return { groups: TEACHER_GROUPS, home: "/dashboard" };
  const core = TEACHER_GROUPS[0].items.map((i) => (i.href === "/dashboard" ? { ...i, title: "Class overview", href: "/teaching" } : i));
  return {
    home: "/studio",
    groups: [
      {
        label: studio.title,
        items: [
          { title: "Studio", href: "/studio", icon: studio.HeroIcon as React.ElementType },
          { title: "Create printables", href: "/studio/create", icon: FilePlus2 },
          { title: "Diagram lab", href: "/studio/diagrams", icon: Shapes },
          { title: "Library", href: "/studio/library", icon: Library },
        ],
      },
      { label: "Core", items: core },
      ...TEACHER_GROUPS.slice(1),
    ],
  };
};

/** Items that also count as active for a nav entry (detail pages live under their list). */
const alsoActive = (href: string, pathname: string) =>
  (href === "/my-courses" && /^\/(subjects|course)\//.test(pathname)) ||
  (href === "/classes" && pathname.startsWith("/class/")) ||
  (href === "/learning-paths" && /^\/(learning-path\/|create-learning-path)/.test(pathname)) ||
  (href === "/portfolio" && pathname.startsWith("/portfolio/")) ||
  (href === "/studio" && pathname.startsWith("/studio/tool/")) ||
  (href === "/gems" && pathname.startsWith("/gems/")) ||
  (href === "/worlds" && pathname.startsWith("/world/"));

/** Shows the marking backlog; only mounted for teachers so students never load class data. */
const MarkingBadge: React.FC = () => {
  const { data } = useTeacherData();
  const n = data.submissions.filter(needsMarking).length;
  if (!n) return null;
  return <span className="ml-auto rounded-full bg-lp-blue px-1.5 py-px text-[10.5px] font-semibold tabular-nums text-white">{n > 99 ? "99+" : n}</span>;
};

const MarkingCard: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { data, loading } = useTeacherData();
  const queue = data.submissions.filter(needsMarking);
  const oldest = queue.map((s) => s.submitted_at).sort()[0];
  if (loading && !data.classes.length) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-lp-blue/30 bg-gradient-to-br from-lp-blue/20 via-lp-surface to-lp-surface p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-60 blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(63,233,255,0.5), transparent 70%)" }}
      />
      {queue.length ? (
        <>
          <p className="relative flex items-center gap-1.5 text-[13.5px] font-medium text-white">
            <ClipboardCheck className="h-3.5 w-3.5 text-lp-cyan" /> {queue.length} to mark
          </p>
          <p className="relative mt-1 text-[12.5px] leading-snug text-lp-soft">Oldest has waited {oldest ? waited(oldest) : "a while"}. Keyboard-first marking with AI drafts.</p>
          <Link to="/marking" onClick={onNavigate} className="relative mt-3 inline-flex h-8 items-center rounded-lg bg-lp-blue px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-[#2F6FE0]">
            Start marking
          </Link>
        </>
      ) : (
        <>
          <p className="relative flex items-center gap-1.5 text-[13.5px] font-medium text-white">
            <CheckCircle2 className="h-3.5 w-3.5 text-lp-green" /> All caught up
          </p>
          <p className="relative mt-1 text-[12.5px] leading-snug text-lp-soft">Nothing waiting to be marked. Plan what comes next.</p>
          <Link to="/teacher-plan-generator" onClick={onNavigate} className="relative mt-3 inline-flex h-8 items-center rounded-lg bg-lp-blue px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-[#2F6FE0]">
            Open planner
          </Link>
        </>
      )}
    </div>
  );
};

const SidebarBody: React.FC<{ onNavigate?: () => void; onSearch: () => void }> = ({ onNavigate, onSearch }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const teacher = isTeacherRole(user?.role);
  const { groups, home } = groupsFor(teacher, user?.email);
  const displayName = user?.fullName || user?.email || (teacher ? "Teacher" : "Student");
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
      <div className="flex items-center justify-between px-5 pb-4 pt-6">
        <Link to={home} onClick={onNavigate} aria-label="Refyn overview" className="text-white">
          <Wordmark className="text-[22px]" />
        </Link>
        <div className={cn("flex items-center gap-2", onNavigate && "mr-11")}>
          {!onNavigate && (
            <span className="rounded-full border border-lp-blue/40 bg-lp-blue/15 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-lp-sky">
              {teacher ? "Teacher" : "Student"}
            </span>
          )}
          <NotificationBell placement="sidebar" />
        </div>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 w-full items-center gap-2 rounded-xl border border-lp-line bg-lp-surface/60 px-3 text-[13px] text-lp-mute transition-colors hover:border-lp-sky/40 hover:text-lp-soft"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">{teacher ? "Search or jump to…" : "Search Refyn…"}</span>
          <kbd className="rounded-md border border-lp-line px-1.5 text-[10.5px] font-medium">{modKey()} K</kbd>
        </button>
      </div>

      <nav aria-label={teacher ? "Teacher" : "Student"} className={cn("flex-1 overflow-y-auto px-3 pb-4", teacher ? "space-y-5" : "space-y-6")}>
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
                      end={item.href === home}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 text-[14px] transition-all duration-200",
                          teacher ? "h-9" : "h-10",
                          isActive || alsoActive(item.href, pathname)
                            ? "bg-gradient-to-r from-lp-blue/25 via-lp-blue/10 to-transparent font-medium text-white"
                            : "text-lp-soft hover:bg-white/[0.04] hover:text-white",
                        )
                      }
                    >
                      {({ isActive: exact }) => {
                        const isActive = exact || alsoActive(item.href, pathname);
                        return (
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
                            {item.badge === "marking" && <MarkingBadge />}
                          </>
                        );
                      }}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Nudge: the assistant for students, the marking queue for teachers (hidden on short screens) */}
      <div className={cn("px-3 pb-3", teacher ? "[@media(max-height:1040px)]:hidden" : "[@media(max-height:940px)]:hidden")}>
        {teacher ? (
          <MarkingCard onNavigate={onNavigate} />
        ) : (
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
        )}
      </div>

      <div className="border-t border-lp-line p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lp-blue to-[#1E3A8A] text-[12px] font-semibold text-white ring-2 ring-lp-blue/30">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-white">{displayName}</p>
            <p className="truncate text-[11.5px] text-lp-mute">{isStudentId(user?.fullName ?? "") ? "Student ID" : user?.email}</p>
          </div>
          <AppearanceToggle />
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
 * Portal sidebar for students and teachers: fixed on desktop, a slide-out
 * drawer on smaller screens, plus the ⌘K command palette.
 */
const StudentSidebar = () => {
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const teacher = isTeacherRole(user?.role);
  const paletteNav = useMemo<PaletteNav[]>(
    () => groupsFor(teacher, user?.email).groups.flatMap((g) => g.items.map((i) => ({ title: i.title, href: i.href, icon: i.icon, group: g.label }))),
    [teacher, user?.email],
  );

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

  const search = () => {
    setOpen(false);
    setPaletteOpen(true);
  };

  return (
    <>
      <aside
        data-legacy-dashboard-sidebar="true"
        className="lp-chrome relative z-[1] hidden h-screen w-[264px] shrink-0 self-start border-r border-lp-line bg-lp-deep font-ui lg:sticky lg:top-0 lg:block"
      >
        <SidebarBody onSearch={search} />
      </aside>

      {/* Mobile: floating menu button + drawer */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="student-drawer"
        className="lp-chrome fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-lp-blue text-white shadow-[0_12px_40px_-8px_rgba(59,130,246,0.8)] transition-transform active:scale-95 lg:hidden"
      >
        <Menu className="h-6 w-6" />
        <UnreadDot className="-right-1 -top-1" />
      </button>
      <div
        className={cn(
          "lp-chrome fixed inset-0 z-50 bg-lp-deep/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        id="student-drawer"
        aria-hidden={!open}
        className={cn(
          "lp-chrome fixed bottom-0 left-0 top-0 z-50 w-[86%] max-w-[300px] border-r border-lp-line bg-lp-deep font-ui shadow-2xl transition-[transform,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
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
        <SidebarBody onNavigate={() => setOpen(false)} onSearch={search} />
      </aside>

      <CommandPalette nav={paletteNav} role={teacher ? "teacher" : "student"} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
};

export default StudentSidebar;
