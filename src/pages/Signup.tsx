import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const prefilledEmail = searchParams.get('email') || '';
  const [formData, setFormData] = useState({
    email: prefilledEmail, password: "", confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvedRequest, setApprovedRequest] = useState<{ full_name: string; requested_role: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signUp } = useAuth();

  useEffect(() => {
    if (formData.email) {
      checkApproval(formData.email);
    } else {
      setChecking(false);
    }
  }, []);

  const checkApproval = async (email: string) => {
    setChecking(true);
    const { data } = await supabase
      .from('registration_requests')
      .select('full_name, requested_role, status')
      .eq('email', email.trim().toLowerCase())
      .eq('status', 'approved')
      .limit(1);

    if (data && data.length > 0) {
      setApprovedRequest({ full_name: data[0].full_name, requested_role: data[0].requested_role });
    } else {
      setApprovedRequest(null);
    }
    setChecking(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvedRequest) {
      toast({ title: "Not approved", description: "Your registration request hasn't been approved yet.", variant: "destructive" });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure your passwords match.", variant: "destructive" });
      return;
    }
    if (formData.password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(formData.email.trim(), formData.password, approvedRequest.full_name, approvedRequest.requested_role);

      // Mark the request as completed (keep payment_plan and seat_config for provisioning on first login)
      await supabase
        .from('registration_requests')
        .update({ status: 'completed' } as any)
        .eq('email', formData.email.trim().toLowerCase())
        .eq('status', 'approved');

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account, then log in.",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error?.message || "We couldn't create your account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Checking approval status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white shadow-sm py-4 px-6 md:px-10 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <Shield className="h-7 w-7 text-blue-600 mr-2" />
          <span className="text-lg font-bold text-slate-800">AI Conditioner</span>
        </Link>
        <div>
          <span className="text-slate-500 mr-2">Already have an account?</span>
          <Link to="/login"><Button variant="outline">Log In</Button></Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button variant="ghost" className="w-fit p-0 mb-4" onClick={() => navigate("/register")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>Your registration has been approved. Set up your password to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            {!approvedRequest ? (
              <div className="text-center py-6 space-y-4">
                <Alert variant="destructive">
                  <AlertDescription>
                    No approved registration request found for this email. Please submit a registration request first and wait for admin approval.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="check-email">Check another email</Label>
                  <Input
                    id="check-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                  />
                  <Button variant="outline" className="w-full" onClick={() => checkApproval(formData.email)}>
                    Check Approval Status
                  </Button>
                </div>
                <Button variant="link" onClick={() => navigate("/register")}>
                  Submit a Registration Request
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
                  <p className="font-medium text-green-800">✓ Approved as: {approvedRequest.requested_role === 'admin' ? 'School Administrator' : approvedRequest.requested_role}</p>
                  <p className="text-green-700">Name: {approvedRequest.full_name}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={formData.email} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" placeholder="Create a secure password (min 6 chars)" value={formData.password} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} required />
                </div>
                <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col text-center text-sm text-slate-500">
            <p>By creating an account, you agree to our <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
