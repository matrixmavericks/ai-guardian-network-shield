import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ArrowLeft, Clock, CheckCircle2, XCircle, Sparkles, Zap, Crown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    icon: <Sparkles className="h-5 w-5" />,
    monthlyPrice: 150,
    yearlyPrice: 1350,
    yearlyMonthly: Math.round(1350 / 12),
    features: [
      "500 AI tokens per month",
      "AI Learning Assistant",
      "Access to public learning paths",
      "Basic quiz participation",
      "Portfolio (up to 3 projects)",
    ],
    color: "border-blue-200 bg-blue-50/50",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    id: "standard",
    name: "Standard",
    icon: <Zap className="h-5 w-5" />,
    monthlyPrice: 200,
    yearlyPrice: 1800,
    yearlyMonthly: Math.round(1800 / 12),
    popular: true,
    features: [
      "2,000 AI tokens per month",
      "Everything in Starter",
      "Adaptive learning profiles",
      "Unlimited quiz practice",
      "Portfolio (up to 10 projects)",
      "Priority AI responses",
    ],
    color: "border-primary bg-primary/5",
    badgeColor: "bg-primary/10 text-primary",
  },
  {
    id: "premium",
    name: "Premium",
    icon: <Crown className="h-5 w-5" />,
    monthlyPrice: 300,
    yearlyPrice: 2700,
    yearlyMonthly: Math.round(2700 / 12),
    features: [
      "5,000 AI tokens per month",
      "Everything in Standard",
      "AI-powered capstone grading",
      "Advanced analytics & insights",
      "Unlimited portfolio projects",
      "Custom learning path generation",
      "Early access to new features",
    ],
    color: "border-amber-200 bg-amber-50/50",
    badgeColor: "bg-amber-100 text-amber-700",
  },
];

const Register = () => {
  const [formData, setFormData] = useState({
    name: "", email: "", requested_role: "student",
  });
  const [selectedPlan, setSelectedPlan] = useState<string>("standard");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
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

      const isStudent = formData.requested_role === 'student';
      const paymentPlanValue = isStudent ? `${selectedPlan}_${billingCycle}` : null;

      const { error } = await supabase.from('registration_requests').insert({
        full_name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        requested_role: formData.requested_role,
        status: 'pending',
        payment_plan: paymentPlanValue,
      } as any);

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
      toast({ title: "Submission failed", description: error?.message || "Could not submit your request.", variant: "destructive" });
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
            Your registration request has been submitted. The administrator will contact you with payment details and approve your account.
          </p>
          <Button variant="outline" onClick={() => setRequestStatus('idle')}>Submit Another Request</Button>
        </div>
      );
    }
    if (requestStatus === 'approved') {
      return (
        <div className="text-center space-y-4 py-6">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h3 className="text-xl font-semibold">Request Approved!</h3>
          <p className="text-muted-foreground">Your registration has been approved. You can now create your account.</p>
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
          <p className="text-muted-foreground">Your registration request was not approved.</p>
          {rejectionReason && (
            <Alert variant="destructive"><AlertDescription>Reason: {rejectionReason}</AlertDescription></Alert>
          )}
          <Button variant="outline" onClick={() => setRequestStatus('idle')}>Submit a New Request</Button>
        </div>
      );
    }
    return null;
  };

  const isStudent = formData.requested_role === 'student';

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
        <div className={cn("w-full", isStudent && requestStatus === 'idle' ? "max-w-4xl" : "max-w-md")}>
          <Card>
            <CardHeader>
              <Button variant="ghost" className="w-fit p-0 mb-4" onClick={() => navigate("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
              </Button>
              <CardTitle className="text-2xl">Request Access</CardTitle>
              <CardDescription>Submit a registration request. An administrator will review and approve your request.</CardDescription>
            </CardHeader>
            <CardContent>
              {requestStatus !== 'idle' && requestStatus !== 'checking' ? (
                renderStatusCard()
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="name" placeholder="Enter your full name" value={formData.name} onChange={handleChange} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} required />
                      </div>
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

                    {isStudent && (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold">Choose Your Plan</Label>
                          <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted">
                            <Button
                              type="button"
                              variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
                              size="sm"
                              className="text-xs h-7 px-3"
                              onClick={() => setBillingCycle('monthly')}
                            >
                              Monthly
                            </Button>
                            <Button
                              type="button"
                              variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
                              size="sm"
                              className="text-xs h-7 px-3"
                              onClick={() => setBillingCycle('yearly')}
                            >
                              Yearly
                              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 bg-green-100 text-green-700">Save 25%</Badge>
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {PLANS.map((plan) => (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => setSelectedPlan(plan.id)}
                              className={cn(
                                "relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md",
                                plan.color,
                                selectedPlan === plan.id ? "ring-2 ring-primary shadow-md" : "opacity-80 hover:opacity-100"
                              )}
                            >
                              {plan.popular && (
                                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                                  Most Popular
                                </Badge>
                              )}
                              <div className="flex items-center gap-2 mb-3">
                                <span className={cn("p-1.5 rounded-lg", plan.badgeColor)}>{plan.icon}</span>
                                <span className="font-semibold">{plan.name}</span>
                              </div>
                              <div className="mb-3">
                                <span className="text-2xl font-bold">
                                  ₹{billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyMonthly}
                                </span>
                                <span className="text-sm text-muted-foreground">/mo</span>
                                {billingCycle === 'yearly' && (
                                  <p className="text-xs text-muted-foreground">₹{plan.yearlyPrice} billed yearly</p>
                                )}
                              </div>
                              <ul className="space-y-1.5">
                                {plan.features.map((f, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                    <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            </button>
                          ))}
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                          After your request is approved, the administrator will contact you with payment details for your selected plan.
                        </p>
                      </div>
                    )}

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
    </div>
  );
};

export default Register;
