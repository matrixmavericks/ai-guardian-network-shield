import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, TrendingUp, BookOpen, GraduationCap, Settings, UserPlus, Layers, Brain, MessageSquare, Book, Users, DollarSign, Briefcase, Activity, Building2, ClipboardList, Workflow } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolCheck } from '@/hooks/useSchoolCheck';

const DashboardSidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const isInSchool = useSchoolCheck();

  // When inside a school route, the SchoolSidebar is rendered by SchoolDashboardLayout
  if (isInSchool) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = user?.role || 'student';
  const displayName = user?.fullName || user?.email || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const getNavItems = () => {
    if (role === 'admin') {
      return [
        { title: "Overview", href: "/dashboard", icon: <TrendingUp className="h-5 w-5" /> },
        { title: "Admin Center", href: "/admin-overview", icon: <Shield className="h-5 w-5" /> },
        { title: "Monitoring", href: "/admin-monitoring", icon: <Activity className="h-5 w-5" /> },
        { title: "Schools", href: "/school-management", icon: <Building2 className="h-5 w-5" /> },
        { title: "Classes", href: "/classes", icon: <Users className="h-5 w-5" /> },
        { title: "User Management", href: "/users", icon: <UserPlus className="h-5 w-5" /> },
        { title: "AI Config", href: "/ai-configuration", icon: <Brain className="h-5 w-5" /> },
        { title: "AI Usage", href: "/ai-usage", icon: <DollarSign className="h-5 w-5" /> },
        { title: "Security Keys", href: "/security-keys", icon: <Shield className="h-5 w-5" /> },
        ...(user?.email === 'info.aiconditioner@gmail.com' ? [
          { title: "Registrations", href: "/registration-requests", icon: <ClipboardList className="h-5 w-5" /> },
          { title: "Platform Docs", href: "/platform-workflow", icon: <Workflow className="h-5 w-5" /> },
        ] : []),
        { title: "Settings", href: "/settings", icon: <Settings className="h-5 w-5" /> },
      ];
    } else if (role === 'teacher') {
      return [
        { title: "Overview", href: "/dashboard", icon: <TrendingUp className="h-5 w-5" /> },
        { title: "Classes", href: "/classes", icon: <Users className="h-5 w-5" /> },
        { title: "Grades", href: "/grades", icon: <GraduationCap className="h-5 w-5" /> },
        { title: "Learning Paths", href: "/learning-paths", icon: <Book className="h-5 w-5" /> },
        { title: "Teaching Plans", href: "/teacher-plan-generator", icon: <Layers className="h-5 w-5" /> },
        { title: "Student Portfolios", href: "/student-portfolios", icon: <Briefcase className="h-5 w-5" /> },
        { title: "Messages", href: "/messages", icon: <MessageSquare className="h-5 w-5" /> },
        { title: "AI Assistant", href: "/ai-learning-assistant", icon: <Brain className="h-5 w-5" /> },
        { title: "AI Usage", href: "/ai-usage", icon: <DollarSign className="h-5 w-5" /> },
      ];
    } else {
      return [
        { title: "Overview", href: "/student-dashboard", icon: <TrendingUp className="h-5 w-5" /> },
        { title: "My Courses", href: "/my-courses", icon: <GraduationCap className="h-5 w-5" /> },
        { title: "Classes", href: "/classes", icon: <Users className="h-5 w-5" /> },
        { title: "Grades", href: "/grades", icon: <GraduationCap className="h-5 w-5" /> },
        { title: "Learning Paths", href: "/learning-paths", icon: <Book className="h-5 w-5" /> },
        { title: "Portfolio", href: "/portfolio", icon: <Briefcase className="h-5 w-5" /> },
        { title: "AI Assistant", href: "/ai-learning-assistant", icon: <Brain className="h-5 w-5" /> },
        { title: "Messages", href: "/messages", icon: <MessageSquare className="h-5 w-5" /> },
      ];
    }
  };

  return (
    <div data-legacy-dashboard-sidebar="true" className="bg-white border-r border-slate-200 w-64 min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center">
          <Shield className="h-8 w-8 text-blue-600 mr-2" />
          <span className="font-bold text-slate-900 text-lg">Refyn Technologies</span>
        </div>
      </div>
      
      <div className="p-4 border-b">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
            {initial}
          </div>
          <div className="ml-3">
            <div className="font-medium">{displayName}</div>
            <div className="text-xs text-slate-500 capitalize">{role}</div>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {getNavItems().map((item, index) =>
            <li key={index}>
              <NavLink to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded-md text-sm ${isActive ? "bg-blue-100 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-100"}`
                }>
                <span className="mr-3">{item.icon}</span>
                {item.title}
              </NavLink>
            </li>
          )}
        </ul>
      </nav>
      
      <div className="p-4 border-t mt-auto">
        <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
          <LogOut className="mr-3 h-5 w-5" /> Logout
        </Button>
      </div>
    </div>
  );
};

export default DashboardSidebar;
