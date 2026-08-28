import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Shield, LogOut, TrendingUp, BookOpen, GraduationCap, Settings, UserPlus, Layers, Brain,
  MessageSquare, Book, Users, DollarSign, Briefcase, Activity, Building2, ClipboardList,
  Workflow, Code, Sparkles, Rocket, Radar, FlaskConical, Network, Mail, CalendarClock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolCheck } from '@/hooks/useSchoolCheck';

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const DashboardSidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const isInSchool = useSchoolCheck();

  if (isInSchool) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = user?.role || 'student';
  const displayName = user?.fullName || user?.email || 'User';
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isMaster = user?.email === 'info.aiconditioner@gmail.com';

  const groups: NavGroup[] = (() => {
    if (role === 'admin') {
      return [
        {
          label: 'Core',
          items: [
            { title: 'Overview', href: '/dashboard', icon: <TrendingUp className="h-4 w-4" /> },
            { title: 'Admin Center', href: '/admin-overview', icon: <Shield className="h-4 w-4" /> },
            { title: 'Monitoring', href: '/admin-monitoring', icon: <Activity className="h-4 w-4" /> },
          ],
        },
        {
          label: 'Entities',
          items: [
            { title: 'Schools', href: '/school-management', icon: <Building2 className="h-4 w-4" /> },
            { title: 'Classes', href: '/classes', icon: <Users className="h-4 w-4" /> },
            { title: 'Users', href: '/users', icon: <UserPlus className="h-4 w-4" /> },
          ],
        },
        {
          label: 'AI Governance',
          items: [
            { title: 'AI Config', href: '/ai-configuration', icon: <Brain className="h-4 w-4" /> },
            { title: 'AI Usage', href: '/ai-usage', icon: <DollarSign className="h-4 w-4" /> },
            { title: 'Security Keys', href: '/security-keys', icon: <Shield className="h-4 w-4" /> },
          ],
        },
        ...(isMaster
          ? [
              {
                label: 'Master',
                items: [
                  { title: 'Registrations', href: '/registration-requests', icon: <ClipboardList className="h-4 w-4" /> },
                  { title: 'Create Account', href: '/create-account', icon: <UserPlus className="h-4 w-4" /> },
                  { title: 'Pilot Analysis', href: '/pilot-analysis', icon: <Activity className="h-4 w-4" /> },
                  { title: 'Security & Data', href: '/security-overview', icon: <Shield className="h-4 w-4" /> },
                  { title: 'Source Code', href: '/source-code', icon: <Code className="h-4 w-4" /> },
                  { title: 'Project Nelo', href: '/project-nelo-admin', icon: <Sparkles className="h-4 w-4" /> },
                  { title: 'Legal & Policies', href: '/legal-admin', icon: <ClipboardList className="h-4 w-4" /> },
                  { title: 'Platform Docs', href: '/platform-docs', icon: <BookOpen className="h-4 w-4" /> },
                  { title: 'Workflow', href: '/platform-workflow', icon: <Workflow className="h-4 w-4" /> },
                ],
              },
            ]
          : []),
        {
          label: 'Intelligence',
          items: [
            { title: 'At-Risk Radar', href: '/intel/at-risk-radar', icon: <Radar className="h-4 w-4" /> },
            { title: 'Policy Sandbox', href: '/intel/policy-sandbox', icon: <FlaskConical className="h-4 w-4" /> },
            { title: 'Budget Optimizer', href: '/intel/budget-optimizer', icon: <DollarSign className="h-4 w-4" /> },
            { title: 'Refyn Graph', href: '/intel/refyn-graph', icon: <Network className="h-4 w-4" /> },
            { title: 'Curriculum Conflicts', href: '/intel/curriculum-conflict', icon: <CalendarClock className="h-4 w-4" /> },
          ],
        },
        {
          label: 'System',
          items: [{ title: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" /> }],
        },
      ];
    }
    if (role === 'teacher') {
      return [
        {
          label: 'Core',
          items: [
            { title: 'Overview', href: '/dashboard', icon: <TrendingUp className="h-4 w-4" /> },
            { title: 'Classes', href: '/classes', icon: <Users className="h-4 w-4" /> },
            { title: 'Grades', href: '/grades', icon: <GraduationCap className="h-4 w-4" /> },
          ],
        },
        {
          label: 'Teaching',
          items: [
            { title: 'Content Library', href: '/library', icon: <Book className="h-4 w-4" /> },
            { title: 'Learning Paths', href: '/learning-paths', icon: <Book className="h-4 w-4" /> },
            { title: 'Teaching Plans', href: '/teacher-plan-generator', icon: <Layers className="h-4 w-4" /> },
            { title: 'Student Portfolios', href: '/student-portfolios', icon: <Briefcase className="h-4 w-4" /> },
            { title: 'Messages', href: '/messages', icon: <MessageSquare className="h-4 w-4" /> },
          ],
        },
        {
          label: 'AI',
          items: [
            { title: 'AI Assistant', href: '/ai-learning-assistant', icon: <Brain className="h-4 w-4" /> },
            { title: 'AI Usage', href: '/ai-usage', icon: <DollarSign className="h-4 w-4" /> },
          ],
        },
        {
          label: 'Intelligence',
          items: [
            { title: 'Auto-Differentiate', href: '/intel/auto-iep', icon: <Layers className="h-4 w-4" /> },
            { title: 'Parent Briefs', href: '/intel/parent-brief', icon: <Mail className="h-4 w-4" /> },
            { title: 'Curriculum Conflicts', href: '/intel/curriculum-conflict', icon: <CalendarClock className="h-4 w-4" /> },
            { title: 'At-Risk Radar', href: '/intel/at-risk-radar', icon: <Radar className="h-4 w-4" /> },
          ],
        },
      ];
    }
    return [
      {
        label: 'Core',
        items: [
          { title: 'Overview', href: '/student-dashboard', icon: <TrendingUp className="h-4 w-4" /> },
          { title: 'My Courses', href: '/my-courses', icon: <GraduationCap className="h-4 w-4" /> },
          { title: 'Classes', href: '/classes', icon: <Users className="h-4 w-4" /> },
          { title: 'Grades', href: '/grades', icon: <GraduationCap className="h-4 w-4" /> },
        ],
      },
      {
        label: 'Learning',
        items: [
          { title: 'Learning Paths', href: '/learning-paths', icon: <Book className="h-4 w-4" /> },
          { title: 'Portfolio', href: '/portfolio', icon: <Briefcase className="h-4 w-4" /> },
          { title: 'AI Assistant', href: '/ai-learning-assistant', icon: <Brain className="h-4 w-4" /> },
          { title: 'Messages', href: '/messages', icon: <MessageSquare className="h-4 w-4" /> },
        ],
      },
      {
        label: 'Intelligence',
        items: [
          { title: 'Thinking Replay', href: '/intel/thinking-replay', icon: <Brain className="h-4 w-4" /> },
          { title: 'Future Self', href: '/intel/future-self', icon: <Rocket className="h-4 w-4" /> },
          { title: 'Peer Benchmark', href: '/intel/peer-compare', icon: <Users className="h-4 w-4" /> },
        ],
      },
    ];
  })();

  return (
    <aside
      data-legacy-dashboard-sidebar="true"
      className="w-64 shrink-0 min-h-screen flex flex-col border-r"
      style={{
        background: 'hsl(var(--sidebar-background))',
        color: 'hsl(var(--sidebar-foreground))',
        borderColor: 'hsl(var(--sidebar-border))',
      }}
    >
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: 'hsl(var(--primary))',
            boxShadow: '0 0 0 1px hsl(var(--primary) / 0.3), 0 8px 24px -8px hsl(var(--primary) / 0.5)',
          }}
        >
          <Shield className="h-4 w-4" style={{ color: 'hsl(var(--primary-foreground))' }} />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight" style={{ color: 'hsl(var(--sidebar-accent-foreground))' }}>
            Refyn
          </div>
          <div className="text-[10px] font-mono-tabular uppercase tracking-[0.22em] opacity-60">
            Governance OS
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="ref-eyebrow px-3 mb-1.5">{group.label}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/dashboard' || item.href === '/student-dashboard'}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                        isActive
                          ? 'font-medium'
                          : 'hover:bg-[hsl(var(--sidebar-accent))]'
                      }`
                    }
                    style={({ isActive }) =>
                      isActive
                        ? {
                            background: 'hsl(var(--sidebar-accent))',
                            color: 'hsl(var(--sidebar-accent-foreground))',
                          }
                        : undefined
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-r"
                            style={{ background: 'hsl(var(--primary))' }}
                          />
                        )}
                        <span
                          className="shrink-0"
                          style={{ color: isActive ? 'hsl(var(--primary))' : undefined }}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.title}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer profile + logout */}
      <div className="border-t p-3" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div
          className="flex items-center gap-2.5 p-2 rounded-md"
          style={{ background: 'hsl(var(--sidebar-accent) / 0.5)' }}
        >
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
            style={{
              background: 'hsl(var(--primary) / 0.18)',
              color: 'hsl(var(--primary))',
              border: '1px solid hsl(var(--primary) / 0.3)',
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--sidebar-accent-foreground))' }}>
              {displayName}
            </div>
            <div className="text-[10px] font-mono-tabular uppercase tracking-widest opacity-60 truncate">
              {role}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
