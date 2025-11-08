import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, Home, Users, Activity, Award, MessageSquare, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUser } from '@/services/localStorageService';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const ParentSidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { open } = useSidebar();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      title: "Dashboard",
      href: "/parent-dashboard",
      icon: Home
    },
    {
      title: "My Children",
      href: "/parent-dashboard?tab=children",
      icon: Users
    },
    {
      title: "Activity Log",
      href: "/parent-dashboard?tab=activity",
      icon: Activity
    },
    {
      title: "Achievements",
      href: "/parent-dashboard?tab=badges",
      icon: Award
    },
    {
      title: "Messages",
      href: "/messages",
      icon: MessageSquare
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings
    }
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
          <Shield className="h-8 w-8 text-primary shrink-0" />
          {open && <span className="font-bold text-xl">AI Conditioner</span>}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {open && (
          <div className="px-3 py-2 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground font-bold shrink-0">
                {user?.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="font-medium truncate">{user?.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
              </div>
            </div>
          </div>
        )}
        
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) => 
                        isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                          : ""
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
              <LogOut className="h-5 w-5 text-destructive" />
              <span className="text-destructive">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default ParentSidebar;
