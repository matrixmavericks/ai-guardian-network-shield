import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

const USER_ROLES: UserRole[] = ['admin', 'teacher', 'student', 'parent'];

const isUserRole = (role: string): role is UserRole => USER_ROLES.includes(role as UserRole);

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setIsLoading(false);
        return;
      }

      const fallbackRoles = isUserRole(user.role) ? [user.role] : [];

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        const fetchedRoles = data?.map((entry) => entry.role as UserRole) || [];
        setRoles(fetchedRoles.length > 0 ? fetchedRoles : fallbackRoles);
      } catch (error) {
        console.error('Error fetching user roles:', error);
        setRoles(fallbackRoles);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  const hasRole = (role: UserRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isTeacher = hasRole('teacher');
  const isStudent = hasRole('student');
  const isParent = hasRole('parent');

  return {
    roles,
    hasRole,
    isAdmin,
    isTeacher,
    isStudent,
    isParent,
    isLoading,
  };
};