
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useUserRole } from './hooks/useUserRole';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentInterface from './components/StudentInterface';
import GradesPage from './pages/GradesPage';
import AssignmentsPage from './pages/AssignmentsPage';
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

// Protected route component
const ProtectedRoute = ({ 
  children, 
  allowedRoles = ['admin', 'teacher', 'student', 'parent'],
  redirectTo = '/login' 
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}) => {
  const { user, isLoading: authLoading } = useAuth();
  const { roles, isLoading: rolesLoading } = useUserRole();
  
  // Show loading
  if (authLoading || rolesLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  // Check if user exists
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }
  
  // Check if user has any of the allowed roles
  const hasRequiredRole = allowedRoles.some(role => roles.includes(role as any));
  if (!hasRequiredRole) {
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

          {/* Admin & Teacher Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/assignments" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                <AssignmentsPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/security-keys" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SecurityKeysPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/teacher-plan-generator" 
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherPlanGenerator />
              </ProtectedRoute>
            } 
          />

          {/* User Management */}
          <Route 
            path="/users" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            } 
          />

          {/* Settings */}
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />

          {/* Messages */}
          <Route 
            path="/messages" 
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            } 
          />

          {/* Student Routes */}
          <Route 
            path="/student-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/ai-learning-assistant" 
            element={
              <ProtectedRoute allowedRoles={['student', 'teacher']}>
                <StudentInterface />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/grades" 
            element={
              <ProtectedRoute>
                <GradesPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/learning-paths" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <LearningPathsPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/learning-path/:id" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <LearningPathDetail />
              </ProtectedRoute>
            } 
          />

          {/* Create custom learning path */}
          <Route 
            path="/create-learning-path" 
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <CreateLearningPathPage />
              </ProtectedRoute>
            } 
          />

          {/* Parent Routes */}
          <Route 
            path="/parent-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Admin Monitoring & Configuration */}
          <Route 
            path="/admin-monitoring" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminMonitoring />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/ai-configuration" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AIConfigurationPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/model-training" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <ModelTrainingPage />
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
