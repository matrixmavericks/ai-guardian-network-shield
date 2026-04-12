import React from 'react';
import { useParams, Routes, Route, Navigate } from 'react-router-dom';
import { SchoolProvider, useSchool } from '@/contexts/SchoolContext';
import { useAuth } from '@/contexts/AuthContext';
import SchoolPortalPage from '@/pages/SchoolPortalPage';
import SchoolLoginPage from '@/pages/SchoolLoginPage';
import SchoolDashboardLayout from '@/components/SchoolDashboardLayout';
import Dashboard from '@/pages/Dashboard';
import StudentDashboard from '@/pages/StudentDashboard';
import ClassesPage from '@/pages/ClassesPage';
import ClassDetailPage from '@/pages/ClassDetailPage';
import GradesPage from '@/pages/GradesPage';
import LearningPathsPage from '@/pages/LearningPathsPage';
import LearningPathDetail from '@/pages/LearningPathDetail';
import MessagesPage from '@/pages/MessagesPage';
import PortfolioPage from '@/pages/PortfolioPage';
import PortfolioProjectPage from '@/pages/PortfolioProjectPage';
import StudentInterface from '@/components/StudentInterface';
import TeacherPlanGenerator from '@/components/TeacherPlanGenerator';
import TeacherPortfolioReviewPage from '@/pages/TeacherPortfolioReviewPage';
import SchoolManagementPage from '@/pages/SchoolManagementPage';
import AIConfigurationPage from '@/pages/AIConfigurationPage';
import SchoolAnnouncementsPage from '@/pages/SchoolAnnouncementsPage';
import SchoolEventsPage from '@/pages/SchoolEventsPage';
import { Loader2, School } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SchoolGuard = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, isLoading } = useAuth();
  const { schoolBasePath } = useSchool();

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to={`${schoolBasePath}/login`} replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={`${schoolBasePath}/dashboard`} replace />;
  return <>{children}</>;
};

const SchoolDashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'student') return <StudentDashboard />;
  return <Dashboard />;
};

const SchoolContent = () => {
  const { loading, notFound, schoolBasePath } = useSchool();

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <School className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">School Not Found</h1>
        <Button onClick={() => window.location.href = '/'}>Go Home</Button>
      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<SchoolPortalPage />} />
      <Route path="login" element={<SchoolLoginPage />} />

      {/* Protected school-scoped routes */}
      <Route element={<SchoolDashboardLayout />}>
        <Route path="dashboard" element={<SchoolGuard><SchoolDashboardRedirect /></SchoolGuard>} />
        <Route path="classes" element={<SchoolGuard><ClassesPage /></SchoolGuard>} />
        <Route path="class/:id" element={<SchoolGuard><ClassDetailPage /></SchoolGuard>} />
        <Route path="grades" element={<SchoolGuard><GradesPage /></SchoolGuard>} />
        <Route path="learning-paths" element={<SchoolGuard><LearningPathsPage /></SchoolGuard>} />
        <Route path="learning-path/:id" element={<SchoolGuard><LearningPathDetail /></SchoolGuard>} />
        <Route path="messages" element={<SchoolGuard><MessagesPage /></SchoolGuard>} />
        <Route path="portfolio" element={<SchoolGuard allowedRoles={['student', 'teacher']}><PortfolioPage /></SchoolGuard>} />
        <Route path="portfolio/:id" element={<SchoolGuard allowedRoles={['student', 'teacher']}><PortfolioProjectPage /></SchoolGuard>} />
        <Route path="ai-assistant" element={<SchoolGuard allowedRoles={['student', 'teacher']}><StudentInterface /></SchoolGuard>} />
        <Route path="plans" element={<SchoolGuard allowedRoles={['teacher']}><TeacherPlanGenerator /></SchoolGuard>} />
        <Route path="student-portfolios" element={<SchoolGuard allowedRoles={['teacher', 'admin']}><TeacherPortfolioReviewPage /></SchoolGuard>} />
        <Route path="admin" element={<SchoolGuard allowedRoles={['admin']}><SchoolManagementPage /></SchoolGuard>} />
        <Route path="ai-config" element={<SchoolGuard allowedRoles={['admin']}><AIConfigurationPage /></SchoolGuard>} />
        <Route path="announcements" element={<SchoolGuard allowedRoles={['admin', 'teacher']}><SchoolAnnouncementsPage /></SchoolGuard>} />
        <Route path="events" element={<SchoolGuard allowedRoles={['admin', 'teacher']}><SchoolEventsPage /></SchoolGuard>} />
      </Route>
    </Routes>
  );
};

const SchoolRoutes = () => {
  const { subdomain } = useParams<{ subdomain: string }>();

  return (
    <SchoolProvider subdomain={subdomain || ''}>
      <SchoolContent />
    </SchoolProvider>
  );
};

export default SchoolRoutes;
