import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentInterface from './components/StudentInterface';
import GradesPage from './pages/GradesPage';
import SecurityKeysPage from './pages/SecurityKeysPage';
import Login from './pages/Login';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Signup from './pages/Signup';
import Register from './pages/Register';
import LearningPathsPage from './pages/LearningPathsPage';
import LearningPathDetail from './pages/LearningPathDetail';
import TeacherPlanGenerator from './components/TeacherPlanGenerator';
import UserManagement from './components/UserManagement';
import MessagesPage from './pages/MessagesPage';
import SettingsPage from './pages/SettingsPage';
import CreateLearningPathPage from './pages/CreateLearningPathPage';
import ParentDashboard from './pages/ParentDashboard';
import AdminMonitoring from './pages/AdminMonitoring';
import AIConfigurationPage from './pages/AIConfigurationPage';
import ModelTrainingPage from './pages/ModelTrainingPage';
import ClassesPage from './pages/ClassesPage';
import ClassDetailPage from './pages/ClassDetailPage';
import AIUsagePage from './pages/AIUsagePage';
import PortfolioPage from './pages/PortfolioPage';
import PortfolioProjectPage from './pages/PortfolioProjectPage';
import SharedPortfolioPage from './pages/SharedPortfolioPage';
import TeacherPortfolioReviewPage from './pages/TeacherPortfolioReviewPage';
import AdminOverviewPage from './pages/AdminOverviewPage';
import SchoolManagementPage from './pages/SchoolManagementPage';
import RegistrationRequestsPage from './pages/RegistrationRequestsPage';
import PlatformWorkflowPage from './pages/PlatformWorkflowPage';
import SchoolRoutes from './pages/SchoolRoutes';
import MyCoursesPage from './pages/MyCoursesPage';
import CourseStudyPage from './pages/CourseStudyPage';
import CreateCoursePage from './pages/CreateCoursePage';
import PayPage from './pages/PayPage';
import CheckoutReturn from './pages/CheckoutReturn';

const ProtectedRoute = ({ 
  children, 
  allowedRoles = ['admin', 'teacher', 'student', 'parent'],
  redirectTo = '/login' 
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pay/:requestId" element={<PayPage />} />
          <Route path="/checkout/return" element={<CheckoutReturn />} />

          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><Dashboard /></ProtectedRoute>} />
          <Route path="/admin-overview" element={<ProtectedRoute allowedRoles={['admin']}><AdminOverviewPage /></ProtectedRoute>} />
          <Route path="/school-management" element={<ProtectedRoute allowedRoles={['admin']}><SchoolManagementPage /></ProtectedRoute>} />
          <Route path="/security-keys" element={<ProtectedRoute allowedRoles={['admin']}><SecurityKeysPage /></ProtectedRoute>} />
          <Route path="/teacher-plan-generator" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherPlanGenerator /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="/registration-requests" element={<ProtectedRoute allowedRoles={['admin']}><RegistrationRequestsPage /></ProtectedRoute>} />
          <Route path="/platform-workflow" element={<ProtectedRoute allowedRoles={['admin']}><PlatformWorkflowPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/student-dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/ai-learning-assistant" element={<ProtectedRoute allowedRoles={['student', 'teacher']}><StudentInterface /></ProtectedRoute>} />
          <Route path="/grades" element={<ProtectedRoute><GradesPage /></ProtectedRoute>} />
          <Route path="/learning-paths" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><LearningPathsPage /></ProtectedRoute>} />
          <Route path="/learning-path/:id" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><LearningPathDetail /></ProtectedRoute>} />
          <Route path="/create-learning-path" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><CreateLearningPathPage /></ProtectedRoute>} />
          <Route path="/parent-dashboard" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />
          <Route path="/admin-monitoring" element={<ProtectedRoute allowedRoles={['admin']}><AdminMonitoring /></ProtectedRoute>} />
          <Route path="/ai-configuration" element={<ProtectedRoute allowedRoles={['admin']}><AIConfigurationPage /></ProtectedRoute>} />
          <Route path="/model-training" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><ModelTrainingPage /></ProtectedRoute>} />
          <Route path="/classes" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><ClassesPage /></ProtectedRoute>} />
          <Route path="/class/:id" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}><ClassDetailPage /></ProtectedRoute>} />
          <Route path="/ai-usage" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><AIUsagePage /></ProtectedRoute>} />
          <Route path="/student-portfolios" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><TeacherPortfolioReviewPage /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute allowedRoles={['student', 'teacher']}><PortfolioPage /></ProtectedRoute>} />
          <Route path="/portfolio/shared/:token" element={<SharedPortfolioPage />} />
          <Route path="/portfolio/:id" element={<ProtectedRoute allowedRoles={['student', 'teacher']}><PortfolioProjectPage /></ProtectedRoute>} />
          <Route path="/my-courses" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><MyCoursesPage /></ProtectedRoute>} />
          <Route path="/course/create" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><CreateCoursePage /></ProtectedRoute>} />
          <Route path="/course/:id" element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}><CourseStudyPage /></ProtectedRoute>} />

          {/* School subdomain routes - all features scoped to school */}
          <Route path="/s/:subdomain/*" element={<SchoolRoutes />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
