import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, LogIn } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { Separator } from "@/components/ui/separator";

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      navigateByRole(user.role);
    }
  }, [user]);

  const navigateByRole = (role: string) => {
    if (role === 'admin') navigate("/dashboard");
    else if (role === 'teacher') navigate("/dashboard");
    else if (role === 'student') navigate("/student-dashboard");
    else if (role === 'parent') navigate("/parent-dashboard");
    else navigate("/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const loggedInUser = await login(email, password);
      toast({
        title: "Login successful",
        description: `Welcome back, ${loggedInUser.fullName}!`,
      });
      navigateByRole(loggedInUser.role);
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white shadow-sm py-4 px-6 md:px-10 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <Shield className="h-7 w-7 text-blue-600 mr-2" />
          <span className="text-lg font-bold text-slate-800">AI Conditioner</span>
        </Link>
        <div>
          <span className="text-slate-500 mr-2">Don't have an account?</span>
          <Link to="/register">
            <Button variant="outline">Sign Up</Button>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Log in to your AI Conditioner account</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email" required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password" required 
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? "Logging In..." : "Log In"}
                <LogIn className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
          <CardFooter className="text-center text-sm text-slate-500">
            <p>By logging in, you agree to our <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
