
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StudentDashboard from "./pages/StudentDashboard";
import StudentInterface from "./components/StudentInterface";
import AITrainingWizard from "./components/AITrainingWizard";
import AssignmentsPage from "./pages/AssignmentsPage";
import GradesPage from "./pages/GradesPage";
import SecurityKeysPage from "./pages/SecurityKeysPage";
import { useAuth } from "./contexts/AuthContext";

const queryClient = new QueryClient();

// Protected route component that checks role
const ProtectedRoute = ({ 
  children, 
  allowedRoles = ["admin", "teacher", "student"] 
}: { 
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'admin' || user.role === 'teacher') {
      return <Navigate to="/dashboard" />;
    } else if (user.role === 'student') {
      return <Navigate to="/student-dashboard" />;
    }
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            
            {/* Admin and Teacher Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/assignments" 
              element={
                <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                  <AssignmentsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/security-keys" 
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <SecurityKeysPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ai-training" 
              element={
                <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                  <AITrainingWizard />
                </ProtectedRoute>
              } 
            />
            
            {/* Student Routes */}
            <Route 
              path="/student-dashboard" 
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student" 
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentInterface />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/grades" 
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <GradesPage />
                </ProtectedRoute>
              } 
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
