import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, TrendingUp, BookOpen, GraduationCap, Settings, Brain, MessageSquare, Book, Users, Briefcase, Building2, DollarSign, Layers, Shield, Megaphone, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';

const SchoolSidebar = () => {
  const { logout, user } = useAuth();
  const { school, schoolBasePath, primaryColor, isFeatureEnabled } = useSchool();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(`${schoolBasePath}`);
  };

  const role = user?.role || 'student';
  const displayName = user?.fullName || user?.email || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const base = schoolBasePath;

  const getNavItems = () => {
    const items: { title: string; href: string; icon: React.ReactNode }[] = [];

    if (role === 'admin') {
      items.push(
        { title: "Overview", href: `${base}/dashboard`, icon: <TrendingUp className="h-5 w-5" /> },
        { title: "School Admin", href: `${base}/admin`, icon: <Building2 className="h-5 w-5" /> },
        { title: "Announcements", href: `${base}/announcements`, icon: <Megaphone className="h-5 w-5" /> },
        { title: "Events", href: `${base}/events`, icon: <Calendar className="h-5 w-5" /> },
        { title: "Classes", href: `${base}/classes`, icon: <Users className="h-5 w-5" /> },
        { title: "AI Config", href: `${base}/ai-config`, icon: <Brain className="h-5 w-5" /> },
      );
    } else if (role === 'teacher') {
      items.push(
        { title: "Overview", href: `${base}/dashboard`, icon: <TrendingUp className="h-5 w-5" /> },
        { title: "Classes", href: `${base}/classes`, icon: <Users className="h-5 w-5" /> },
        { title: "Grades", href: `${base}/grades`, icon: <GraduationCap className="h-5 w-5" /> },
        { title: "Teaching Plans", href: `${base}/plans`, icon: <Layers className="h-5 w-5" /> },
        { title: "Student Portfolios", href: `${base}/student-portfolios`, icon: <Briefcase className="h-5 w-5" /> },
      );
    } else {
      items.push(
        { title: "Overview", href: `${base}/dashboard`, icon: <TrendingUp className="h-5 w-5" /> },
        { title: "Classes", href: `${base}/classes`, icon: <Users className="h-5 w-5" /> },
        { title: "Grades", href: `${base}/grades`, icon: <GraduationCap className="h-5 w-5" /> },
        { title: "Portfolio", href: `${base}/portfolio`, icon: <Briefcase className="h-5 w-5" /> },
      );
    }

    // Feature-gated items
    if (isFeatureEnabled('learning_paths')) {
      items.push({ title: "Learning Paths", href: `${base}/learning-paths`, icon: <Book className="h-5 w-5" /> });
    }
    if (isFeatureEnabled('ai_chat') && (role === 'student' || role === 'teacher')) {
      items.push({ title: "AI Assistant", href: `${base}/ai-assistant`, icon: <Brain className="h-5 w-5" /> });
    }

    items.push({ title: "Messages", href: `${base}/messages`, icon: <MessageSquare className="h-5 w-5" /> });

    return items;
  };

  return (
    <div className="bg-white border-r border-slate-200 w-64 min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          {school?.logo_url ? (
            <img src={school.logo_url} className="h-8 w-8 rounded-full object-contain" alt={school.name} />
          ) : (
            <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
              <Building2 className="h-4 w-4 text-white" />
            </div>
          )}
          <span className="font-bold text-slate-900 text-lg truncate">{school?.name || 'School'}</span>
        </div>
      </div>
      
      <div className="p-4 border-b">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: primaryColor }}>
            {initial}
          </div>
          <div className="ml-3">
            <div className="font-medium text-sm">{displayName}</div>
            <div className="text-xs text-slate-500 capitalize">{role}</div>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {getNavItems().map((item, index) => (
            <li key={index}>
              <NavLink to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded-md text-sm ${isActive ? 'font-medium' : 'text-slate-600 hover:bg-slate-100'}`
                }
                style={({ isActive }) => isActive ? { backgroundColor: `${primaryColor}20`, color: primaryColor } : {}}
              >
                <span className="mr-3">{item.icon}</span>
                {item.title}
              </NavLink>
            </li>
          ))}
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

export default SchoolSidebar;
