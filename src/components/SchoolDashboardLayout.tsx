import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import SchoolSidebar from '@/components/SchoolSidebar';
import { Loader2 } from 'lucide-react';

const SchoolDashboardLayout = () => {
  const { user, isLoading } = useAuth();
  const { school, loading, schoolBasePath } = useSchool();

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`${schoolBasePath}/login`} replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SchoolSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default SchoolDashboardLayout;
