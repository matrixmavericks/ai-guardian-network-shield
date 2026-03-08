import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search,
  ListFilter,
  RefreshCw,
  Shield,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  department: string | null;
  grade_level: string | null;
  created_at: string;
  roles: string[];
  roleIds: { id: string; role: string }[];
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin';

  const promoteToTeacher = async (targetUserId: string, userName: string) => {
    try {
      const { error } = await supabase.from('user_roles').insert({
        user_id: targetUserId,
        role: 'teacher' as any,
      });
      if (error) {
        if (error.code === '23505') {
          toast({ title: "Already a teacher", description: `${userName} already has the teacher role.` });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Promoted to teacher", description: `${userName} is now a teacher.` });
        fetchUsers();
      }
    } catch (err: any) {
      console.error('Error promoting user:', err);
      toast({ title: "Failed to promote user", description: err.message, variant: "destructive" });
    }
  };

  const removeRole = async (roleRecordId: string, userName: string, roleName: string) => {
    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleRecordId);
      if (error) throw error;
      toast({ title: "Role removed", description: `Removed ${roleName} role from ${userName}.` });
      fetchUsers();
    } catch (err: any) {
      console.error('Error removing role:', err);
      toast({ title: "Failed to remove role", description: err.message, variant: "destructive" });
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRoles = (roles || []).filter(r => r.user_id === profile.user_id);
        
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: (profile as any).email || null,
          avatar_url: profile.avatar_url,
          department: profile.department,
          grade_level: profile.grade_level,
          created_at: profile.created_at || new Date().toISOString(),
          roles: userRoles.map(r => r.role),
          roleIds: userRoles.map(r => ({ id: r.id, role: r.role })),
        };
      });

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast({ title: "Error loading users", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.roles.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = !roleFilter || user.roles.includes(roleFilter);
    
    return matchesSearch && matchesRole;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-blue-100 text-blue-700';
      case 'teacher': return 'bg-purple-100 text-purple-700';
      case 'student': return 'bg-green-100 text-green-700';
      case 'parent': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const colSpan = isTeacherOrAdmin ? 6 : 5;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Button variant="outline" onClick={fetchUsers} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>Registered users with their assigned roles</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or email..." 
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <ListFilter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setRoleFilter(null)}>All Users</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleFilter('admin')}>Admins</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleFilter('teacher')}>Teachers</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleFilter('student')}>Students</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleFilter('parent')}>Parents</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Grade / Dept</TableHead>
                  <TableHead>Joined</TableHead>
                  {isTeacherOrAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
                      {searchQuery || roleFilter ? 'No users match your filters' : 'No users found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium mr-2 text-sm">
                            {getInitials(user.full_name)}
                          </div>
                          <span className="font-medium">{user.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? user.roleIds.map(({ id, role }) => (
                            <span key={id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs capitalize ${getRoleColor(role)}`}>
                              {role}
                              {isTeacherOrAdmin && (role === 'student' || role === 'parent') && user.roles.length > 1 && (
                                <button
                                  onClick={() => removeRole(id, user.full_name, role)}
                                  className="hover:opacity-70 ml-0.5"
                                  title={`Remove ${role} role`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </span>
                          )) : (
                            <span className="text-xs text-muted-foreground">No role</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.grade_level || user.department || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </TableCell>
                      {isTeacherOrAdmin && (
                        <TableCell>
                          <div className="flex gap-1">
                            {!user.roles.includes('teacher') && !user.roles.includes('admin') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => promoteToTeacher(user.user_id, user.full_name)}
                              >
                                <Shield className="h-3 w-3 mr-1" /> Make Teacher
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;