import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Shield, User, GraduationCap, BookOpen, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const DemoRoleSwitcher = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const demoAccounts = [
    { role: 'admin', email: 'admin@example.com', password: 'password123', name: 'Admin User', icon: <Shield className="h-4 w-4" />, route: '/dashboard' },
    { role: 'teacher', email: 'teacher@example.com', password: 'password123', name: 'Teacher User', icon: <GraduationCap className="h-4 w-4" />, route: '/dashboard' },
    { role: 'student', email: 'student@example.com', password: 'password123', name: 'Student User', icon: <BookOpen className="h-4 w-4" />, route: '/student-dashboard' },
    { role: 'parent', email: 'parent@example.com', password: 'password123', name: 'Parent User', icon: <Users className="h-4 w-4" />, route: '/parent-dashboard' },
  ];

  const handleRoleSwitch = async (account: typeof demoAccounts[0]) => {
    try {
      await login(account.email, account.password);
      toast({ title: "Switched to " + account.role, description: `Now viewing as ${account.name}` });
      navigate(account.route);
    } catch {
      toast({ title: "Switch failed", description: "Could not switch to this role. Make sure demo accounts exist.", variant: "destructive" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Demo: {user?.role || 'Switch Role'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Demo Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {demoAccounts.map((account) => (
          <DropdownMenuItem key={account.role} onClick={() => handleRoleSwitch(account)} className="cursor-pointer" disabled={user?.role === account.role}>
            <span className="mr-2">{account.icon}</span>
            <span className="capitalize">{account.role}</span>
            {user?.role === account.role && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DemoRoleSwitcher;
