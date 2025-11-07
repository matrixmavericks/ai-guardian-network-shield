import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, Home, Users, Activity, Award, MessageSquare, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUser } from '@/services/localStorageService';

const ParentSidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      title: "Dashboard",
      href: "/parent-dashboard",
      icon: <Home className="h-5 w-5" />
    },
    {
      title: "My Children",
      href: "/parent-dashboard?tab=children",
      icon: <Users className="h-5 w-5" />
    },
    {
      title: "Activity Log",
      href: "/parent-dashboard?tab=activity",
      icon: <Activity className="h-5 w-5" />
    },
    {
      title: "Achievements",
      href: "/parent-dashboard?tab=badges",
      icon: <Award className="h-5 w-5" />
    },
    {
      title: "Messages",
      href: "/messages",
      icon: <MessageSquare className="h-5 w-5" />
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />
    }
  ];

  return (
    <div className="bg-white border-r border-slate-200 w-64 min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center">
          <Shield className="h-8 w-8 text-blue-600 mr-2" />
          <span className="font-bold text-xl text-slate-900">AI Conditioner</span>
        </div>
      </div>
      
      <div className="p-4 border-b">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
            {user?.name.charAt(0)}
          </div>
          <div className="ml-3">
            <div className="font-medium">{user?.name}</div>
            <div className="text-xs text-slate-500 capitalize">{user?.role}</div>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item, index) => (
            <li key={index}>
              <NavLink
                to={item.href}
                className={({ isActive }) => 
                  `flex items-center px-4 py-2 rounded-md text-sm ${
                    isActive 
                      ? "bg-blue-100 text-blue-700 font-medium" 
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <span className="mr-3">{item.icon}</span>
                {item.title}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t mt-auto">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default ParentSidebar;
