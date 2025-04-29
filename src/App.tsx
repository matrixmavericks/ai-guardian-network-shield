
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StudentInterface from "./components/StudentInterface";
import AITrainingWizard from "./components/AITrainingWizard";

const queryClient = new QueryClient();

// Simple auth check function
const isAuthenticated = () => {
  return localStorage.getItem("aiConditioner_user") || sessionStorage.getItem("aiConditioner_user");
};

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  
  useEffect(() => {
    const auth = isAuthenticated();
    setAuthenticated(!!auth);
    setChecking(false);
  }, []);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return authenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student" 
            element={
              <ProtectedRoute>
                <StudentInterface />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ai-training" 
            element={
              <ProtectedRoute>
                <AITrainingWizard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
