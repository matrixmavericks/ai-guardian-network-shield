import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ArrowLeft, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "", email: "", requested_role: "student",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'submitted' | 'checking' | 'approved' | 'rejected' | 'pending'>('idle');
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const checkExistingRequest = async (email: string) => {
    const { data, error } = await supabase
      .from('registration_requests')
      .select('status, rejection_reason')
      .eq('email', email.trim().toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return data[0];
  };

  const handleCheckStatus = async () => {
    if (!formData.email) {
      toast({ title: "Enter your email", description: "Please enter your email to check request status.", variant: "destructive" });
      return;
    }
    setRequestStatus('checking');
    const existing = await checkExistingRequest(formData.email);
    if (!existing) {
      setRequestStatus('idle');
      toast({ title: "No request found", description: "No registration request found for this email.", variant: "destructive" });
    } else if (existing.status === 'approved') {
      setRequestStatus('approved');
    } else if (existing.status === 'rejected') {
      setRequestStatus('rejected');
      setRejectionReason(existing.rejection_reason || "No reason provided.");
    } else {
      setRequestStatus('pending');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({ title: "Missing information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if there's already a pending request
      const existing = await checkExistingRequest(formData.email);
      if (existing?.status === 'pending') {
        setRequestStatus('pending');
        toast({ title: "Request already pending", description: "You already have a pending registration request." });
        return;
      }
      if (existing?.status === 'approved') {
        setRequestStatus('approved');
        toast({ title: "Already approved!", description: "Your request was approved. You can now create your account." });
        return;
      }

      const { error } = await supabase.from('registration_requests').insert({
        full_name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        requested_role: formData.requested_role,
        status: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          setRequestStatus('pending');
          toast({ title: "Request already pending", description: "You already have a pending registration request." });
          return;
        }
        throw error;
      }

      setRequestStatus('submitted');
      toast({ title: "Request submitted!", description: "Your registration request has been sent for admin approval." });
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error?.message || "Could not submit your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusCard = () => {
    if (requestStatus === 'submitted' || requestStatus === 'pending') {
      return (
        <div className="text-center space-y-4 py-6">
          <Clock className="h-16 w-16 text-amber-500 mx-auto" />
          <h3 className="text-xl font-semibold">Request Pending</h3>
          <p className="text-muted-foreground">
            Your registration request has been submitted and is awaiting admin approval. 
            You'll be able to create your account once approved.
          </p>
          <p className="text-sm text-muted-foreground">Check back later to see if your request has been approved.</p>
          <Button variant="outline" onClick={() => setRequestStatus('idle')}>Submit Another Request</Button>
        </div>
      );
    }
    if (requestStatus === 'approved') {
      return (
        <div className="text-center space-y-4 py-6">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h3 className="text-xl font-semibold">Request Approved!</h3>
          <p className="text-muted-foreground">
            Your registration has been approved by the administrator. You can now create your account.
          </p>
          <Button onClick={() => navigate(`/signup?email=${encodeURIComponent(formData.email)}`)}>
            Create Your Account
          </Button>
        </div>
      );
    }
    if (requestStatus === 'rejected') {
      return (
        <div className="text-center space-y-4 py-6">
          <XCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h3 className="text-xl font-semibold">Request Rejected</h3>
          <p className="text-muted-foreground">
            Your registration request was not approved.
          </p>
          {rejectionReason && (
            <Alert variant="destructive">
              <AlertDescription>Reason: {rejectionReason}</AlertDescription>
            </Alert>
          )}
          <Button variant="outline" onClick={() => setRequestStatus('idle')}>Submit a New Request</Button>
        </div>
      );
    }
    return null;
  };

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
            <Button variant="ghost" className="w-fit p-0 mb-4" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
            </Button>
            <CardTitle className="text-2xl">Request Access</CardTitle>
            <CardDescription>
              Submit a registration request. An administrator will review and approve your request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requestStatus !== 'idle' && requestStatus !== 'checking' ? (
              renderStatusCard()
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" placeholder="Enter your full name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Requested Role</Label>
                    <Select value={formData.requested_role} onValueChange={(v) => setFormData(prev => ({ ...prev, requested_role: v }))}>
                      <SelectTrigger id="role"><SelectValue placeholder="Select your role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">School Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Registration Request"}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or check status</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={handleCheckStatus} disabled={requestStatus === 'checking'}>
                  {requestStatus === 'checking' ? "Checking..." : "Check Request Status"}
                </Button>
              </>
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

export default Register;
