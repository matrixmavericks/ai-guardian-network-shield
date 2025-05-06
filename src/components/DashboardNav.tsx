
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Bell, 
  Search, 
  Settings, 
  HelpCircle, 
  User
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const DashboardNav = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  const handleLogout = () => {
    logout();
    
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    
    // Navigate to login page
    navigate("/login");
  };

  // Get initials for avatar
  const getInitials = () => {
    if (!user || !user.name) return "U";
    return user.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            type="search" 
            placeholder="Search..." 
            className="w-full pl-9 bg-slate-50 border-slate-200"
          />
        </div>
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                <div className="p-3 hover:bg-slate-100 cursor-pointer">
                  <div className="font-medium mb-1">New Bypass Attempt Detected</div>
                  <div className="text-sm text-slate-500">A user attempted to use a VPN to access AI services.</div>
                  <div className="text-xs text-slate-400 mt-1">2 hours ago</div>
                </div>
                <div className="p-3 hover:bg-slate-100 cursor-pointer">
                  <div className="font-medium mb-1">System Update Available</div>
                  <div className="text-sm text-slate-500">A new version of AI Conditioner is ready to install.</div>
                  <div className="text-xs text-slate-400 mt-1">1 day ago</div>
                </div>
                <div className="p-3 hover:bg-slate-100 cursor-pointer">
                  <div className="font-medium mb-1">New User Registered</div>
                  <div className="text-sm text-slate-500">Jane Smith has created a teacher account.</div>
                  <div className="text-xs text-slate-400 mt-1">3 days ago</div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center font-medium">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                  {getInitials()}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium">{user?.name || "Guest"}</div>
                  <div className="text-xs text-slate-500">{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Not logged in"}</div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardNav;
