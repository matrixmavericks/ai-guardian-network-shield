
import React from "react";
import { Link, useNavigate } from "react-router-dom";
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
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const DashboardSidebar = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear auth data from storage
    localStorage.removeItem("aiConditioner_user");
    sessionStorage.removeItem("aiConditioner_user");
    
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
    to = "#" 
  }: { 
    icon: React.ElementType, 
    label: string, 
    active?: boolean,
    alert?: boolean,
    to?: string
  }) => {
    return (
      <Link 
        to={to}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
          active 
            ? "bg-blue-100 text-blue-700" 
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        <div className="relative">
          <Icon className={cn("h-5 w-5", active ? "text-blue-600" : "text-slate-500")} />
          {alert && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          )}
        </div>
        {!collapsed && <span>{label}</span>}
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
        <NavItem icon={LayoutDashboard} label="Dashboard" active to="/dashboard" />
        <NavItem icon={Network} label="Network" to="/dashboard" />
        <NavItem icon={Brain} label="AI Training" to="/ai-training" />
        <NavItem icon={Users} label="Users" to="/dashboard" />
        <NavItem icon={BarChart3} label="Analytics" to="/dashboard" />
        <NavItem icon={AlertCircle} label="Alerts" alert to="/dashboard" />
        <NavItem icon={Settings} label="Settings" to="/dashboard" />
        <NavItem icon={HelpCircle} label="Help & Support" to="/dashboard" />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
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
