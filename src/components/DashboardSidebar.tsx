
import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Shield, 
  LayoutDashboard, 
  Network, 
  Users, 
  Brain, 
  Settings, 
  BarChart3, 
  AlertCircle,
  LogOut,
  HelpCircle,
  GraduationCap,
  BookOpen,
  FileText,
  Key,
  PenTool
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const DashboardSidebar = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    // Use the context logout function
    logout();
    
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    
    // Navigate to login page
    navigate("/login");
  };

  const NavItem = ({ 
    icon: Icon, 
    label, 
    active = false, 
    alert = false,
    to = "#",
    onClick
  }: { 
    icon: React.ElementType, 
    label: string, 
    active?: boolean,
    alert?: boolean,
    to?: string,
    onClick?: () => void
  }) => {
    const isActive = active || location.pathname === to;
    
    const content = (
      <div className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
        isActive 
          ? "bg-blue-100 text-blue-700" 
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      )}>
        <div className="relative">
          <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-slate-500")} />
          {alert && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          )}
        </div>
        {!collapsed && <span>{label}</span>}
      </div>
    );
    
    if (onClick) {
      return (
        <button onClick={onClick} className="w-full text-left">
          {content}
        </button>
      );
    }
    
    return (
      <Link to={to}>
        {content}
      </Link>
    );
  };

  return (
    <div 
      className={cn(
        "bg-white border-r border-slate-200 flex flex-col h-screen transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600 flex-shrink-0" />
          {!collapsed && <span className="font-bold text-slate-900">AI Conditioner</span>}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Show different navigation based on user role */}
        {user?.role === 'admin' && (
          <>
            <NavItem icon={LayoutDashboard} label="Admin Dashboard" to="/dashboard" />
            <NavItem icon={Network} label="Network Settings" to="/dashboard?tab=network" />
            <NavItem icon={Users} label="Users" to="/dashboard?tab=users" />
            <NavItem icon={Brain} label="AI Training" to="/ai-training" />
            <NavItem icon={PenTool} label="Assignments" to="/assignments" />
            <NavItem icon={BarChart3} label="Analytics" to="/dashboard?tab=analytics" />
            <NavItem icon={AlertCircle} label="Alerts" alert to="/dashboard?tab=alerts" />
            <NavItem icon={Key} label="Security Keys" to="/security-keys" />
          </>
        )}

        {user?.role === 'teacher' && (
          <>
            <NavItem icon={LayoutDashboard} label="Teacher Dashboard" to="/dashboard" />
            <NavItem icon={PenTool} label="Assignments" to="/assignments" />
            <NavItem icon={FileText} label="Grade Submissions" to="/dashboard?tab=grades" />
            <NavItem icon={Brain} label="AI Training" to="/ai-training" />
            <NavItem icon={BarChart3} label="Student Analytics" to="/dashboard?tab=analytics" />
          </>
        )}

        {user?.role === 'student' && (
          <>
            <NavItem icon={LayoutDashboard} label="Student Dashboard" to="/student-dashboard" />
            <NavItem icon={FileText} label="Assignments" to="/student-dashboard?tab=assignments" />
            <NavItem icon={BarChart3} label="Grades & Progress" to="/grades" />
            <NavItem icon={BookOpen} label="AI Learning Assistant" to="/student" />
          </>
        )}
        
        <div className="pt-4 mt-4 border-t border-slate-200">
          <p className={cn("text-xs font-medium text-slate-500 mb-2", collapsed && "sr-only")}>
            System
          </p>
          <NavItem icon={Settings} label="Settings" to="/dashboard?tab=settings" />
          <NavItem icon={HelpCircle} label="Help & Support" to="/dashboard?tab=help" />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        {user && !collapsed && (
          <div className="mb-3 flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium mr-2">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div className="text-sm">
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-slate-500 capitalize">{user.role}</div>
            </div>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && <span>Log out</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? ">" : "<"}
        </Button>
      </div>
    </div>
  );
};

export default DashboardSidebar;
