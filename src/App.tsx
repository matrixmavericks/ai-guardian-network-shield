
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

// Protected route component
const ProtectedRoute = ({ 
  children, 
  allowedRoles = ['admin', 'teacher', 'student'],
  redirectTo = '/login' 
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}) => {
  const { user, isLoading } = useAuth();
  
  // Show loading
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  // Check if user exists and has allowed role
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
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
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
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

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
