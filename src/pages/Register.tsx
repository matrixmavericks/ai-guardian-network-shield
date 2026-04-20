import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ArrowLeft, Clock, CheckCircle2, XCircle, Sparkles, Zap, Crown, GraduationCap, School, Building2, Users, Percent } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STUDENT_PLANS, TEACHER_PLANS, ADMIN_PLANS, calcAdminMonthlyCost } from "@/lib/planConfigs";
import { Slider } from "@/components/ui/slider";

// ─── Plan card data ───
const STUDENT_PLAN_CARDS = [
  { id: "starter", icon: <Sparkles className="h-5 w-5" />, popular: false, color: "border-blue-200 bg-blue-50/50", badgeColor: "bg-blue-100 text-blue-700" },
  { id: "standard", icon: <Zap className="h-5 w-5" />, popular: true, color: "border-primary bg-primary/5", badgeColor: "bg-primary/10 text-primary" },
  { id: "premium", icon: <Crown className="h-5 w-5" />, popular: false, color: "border-amber-200 bg-amber-50/50", badgeColor: "bg-amber-100 text-amber-700" },
];

const TEACHER_PLAN_CARDS = [
  { id: "teacher_individual", icon: <GraduationCap className="h-5 w-5" />, popular: false, color: "border-emerald-200 bg-emerald-50/50", badgeColor: "bg-emerald-100 text-emerald-700" },
  { id: "teacher_pro", icon: <Zap className="h-5 w-5" />, popular: true, color: "border-violet-200 bg-violet-50/50", badgeColor: "bg-violet-100 text-violet-700" },
  { id: "teacher_master", icon: <Crown className="h-5 w-5" />, popular: false, color: "border-amber-200 bg-amber-50/50", badgeColor: "bg-amber-100 text-amber-700" },
];

const ADMIN_PLAN_CARDS = [
  { id: "school_starter", icon: <School className="h-5 w-5" />, popular: false, color: "border-sky-200 bg-sky-50/50", badgeColor: "bg-sky-100 text-sky-700" },
  { id: "school_growth", icon: <Building2 className="h-5 w-5" />, popular: true, color: "border-indigo-200 bg-indigo-50/50", badgeColor: "bg-indigo-100 text-indigo-700" },
  { id: "school_enterprise", icon: <Crown className="h-5 w-5" />, popular: false, color: "border-amber-200 bg-amber-50/50", badgeColor: "bg-amber-100 text-amber-700" },
];

const Register = () => {
  const [formData, setFormData] = useState({ name: "", email: "", requested_role: "student" });
  const [selectedPlan, setSelectedPlan] = useState<string>("standard");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [studentCount, setStudentCount] = useState<number>(100);
  const [teacherCount, setTeacherCount] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'submitted' | 'checking' | 'approved' | 'rejected' | 'pending'>('idle');
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (role: string) => {
    setFormData(prev => ({ ...prev, requested_role: role }));
    if (role === 'student') setSelectedPlan('standard');
    else if (role === 'teacher') setSelectedPlan('teacher_pro');
    else setSelectedPlan('school_growth');
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

      const paymentPlanValue = `${selectedPlan}_${billingCycle}`;
      const seatConfig = role === 'admin' ? { teachers: teacherCount, students: studentCount } : null;

      const { data: inserted, error } = await supabase.from('registration_requests').insert({
        full_name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        requested_role: formData.requested_role,
        status: 'pending',
        payment_plan: paymentPlanValue,
        seat_config: seatConfig,
      } as any).select('id').single();

      if (error) {
        if (error.code === '23505') {
          setRequestStatus('pending');
          toast({ title: "Request already pending", description: "You already have a pending registration request." });
          return;
        }
        throw error;
      }

      toast({ title: "Request submitted!", description: "Redirecting to secure payment..." });
      // Send the user straight to Stripe-powered checkout
      navigate(`/pay/${inserted.id}`);
      return;
    } catch (error: any) {
      toast({ title: "Submission failed", description: error?.message || "Could not submit your request.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin cost calc using centralized helper
  const adminCost = calcAdminMonthlyCost(selectedPlan, teacherCount, studentCount, billingCycle === 'yearly');

  const renderStatusCard = () => {
    if (requestStatus === 'submitted' || requestStatus === 'pending') {
      return (
        <div className="text-center space-y-4 py-6">
          <Clock className="h-16 w-16 text-amber-500 mx-auto" />
          <h3 className="text-xl font-semibold">Request Pending</h3>
          <p className="text-muted-foreground">Your registration request has been submitted. The administrator will contact you with payment details and approve your account.</p>
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
          <Button onClick={() => navigate(`/signup?email=${encodeURIComponent(formData.email)}`)}>Create Your Account</Button>
        </div>
      );
    }
    if (requestStatus === 'rejected') {
      return (
        <div className="text-center space-y-4 py-6">
          <XCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h3 className="text-xl font-semibold">Request Rejected</h3>
          <p className="text-muted-foreground">Your registration request was not approved.</p>
          {rejectionReason && <Alert variant="destructive"><AlertDescription>Reason: {rejectionReason}</AlertDescription></Alert>}
          <Button variant="outline" onClick={() => setRequestStatus('idle')}>Submit a New Request</Button>
        </div>
      );
    }
    return null;
  };

  const role = formData.requested_role;
  const showPlans = requestStatus === 'idle' || requestStatus === 'checking';

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
        <div className={cn("w-full", showPlans ? "max-w-5xl" : "max-w-md")}>
          <Card>
            <CardHeader>
              <Button variant="ghost" className="w-fit p-0 mb-4" onClick={() => navigate("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
              </Button>
              <CardTitle className="text-2xl">Request Access</CardTitle>
              <CardDescription>Submit a registration request. An administrator will review and approve your request.</CardDescription>
            </CardHeader>
            <CardContent>
              {!showPlans ? renderStatusCard() : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-5">
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
                      <Label htmlFor="role">I am a...</Label>
                      <Select value={role} onValueChange={handleRoleChange}>
                        <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="admin">School Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* ─── Billing toggle ─── */}
                    <div className="flex items-center justify-between pt-2">
                      <Label className="text-base font-semibold">Choose Your Plan</Label>
                      <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted">
                        <Button type="button" variant={billingCycle === 'monthly' ? 'default' : 'ghost'} size="sm" className="text-xs h-7 px-3" onClick={() => setBillingCycle('monthly')}>Monthly</Button>
                        <Button type="button" variant={billingCycle === 'yearly' ? 'default' : 'ghost'} size="sm" className="text-xs h-7 px-3" onClick={() => setBillingCycle('yearly')}>
                          Yearly
                          <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 bg-green-100 text-green-700">Save 25%</Badge>
                        </Button>
                      </div>
                    </div>

                    {/* ─── STUDENT PLANS ─── */}
                    {role === 'student' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {STUDENT_PLAN_CARDS.map((card) => {
                          const p = STUDENT_PLANS[card.id];
                          return (
                            <button key={card.id} type="button" onClick={() => setSelectedPlan(card.id)}
                              className={cn(
                                "relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md",
                                card.color,
                                selectedPlan === card.id ? "ring-2 ring-primary shadow-md" : "opacity-80 hover:opacity-100"
                              )}>
                              {card.popular && <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">Most Popular</Badge>}
                              <div className="flex items-center gap-2 mb-3">
                                <span className={cn("p-1.5 rounded-lg", card.badgeColor)}>{card.icon}</span>
                                <span className="font-semibold">{p.name}</span>
                              </div>
                              <div className="mb-3">
                                <span className="text-2xl font-bold">₹{billingCycle === 'monthly' ? p.monthlyPrice : Math.round(p.yearlyPrice / 12)}</span>
                                <span className="text-sm text-muted-foreground">/mo</span>
                                {billingCycle === 'yearly' && <p className="text-xs text-muted-foreground">₹{p.yearlyPrice} billed yearly</p>}
                              </div>
                              <ul className="space-y-1.5">
                                {p.features.map((f, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                    <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />{f}
                                  </li>
                                ))}
                              </ul>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* ─── TEACHER PLANS ─── */}
                    {role === 'teacher' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {TEACHER_PLAN_CARDS.map((card) => {
                            const p = TEACHER_PLANS[card.id];
                            return (
                              <button key={card.id} type="button" onClick={() => setSelectedPlan(card.id)}
                                className={cn(
                                  "relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md",
                                  card.color,
                                  selectedPlan === card.id ? "ring-2 ring-primary shadow-md" : "opacity-80 hover:opacity-100"
                                )}>
                                {card.popular && <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[10px]">Best Value</Badge>}
                                <div className="flex items-center gap-2 mb-3">
                                  <span className={cn("p-1.5 rounded-lg", card.badgeColor)}>{card.icon}</span>
                                  <span className="font-semibold text-sm">{p.name}</span>
                                </div>
                                <div className="mb-3">
                                  <span className="text-2xl font-bold">₹{billingCycle === 'monthly' ? p.monthlyPrice : Math.round(p.yearlyPrice / 12)}</span>
                                  <span className="text-sm text-muted-foreground">/mo</span>
                                  {billingCycle === 'yearly' && <p className="text-xs text-muted-foreground">₹{p.yearlyPrice} billed yearly</p>}
                                </div>
                                <ul className="space-y-1.5">
                                  {p.features.map((f, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                      <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />{f}
                                    </li>
                                  ))}
                                </ul>
                                {p.aiFeatures.length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">AI Features</p>
                                    <div className="flex flex-wrap gap-1">
                                      {p.aiFeatures.map((af, i) => (
                                        <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{af}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          <GraduationCap className="h-3 w-3 inline mr-1" />
                          Teachers get full access to all student-facing features. Want to purchase student accounts for your class? Consider a School Administrator plan instead.
                        </p>
                      </div>
                    )}

                    {/* ─── ADMIN / SCHOOL PLANS ─── */}
                    {role === 'admin' && (
                      <div className="space-y-5">
                        {/* Seat configurator */}
                        <div className="rounded-xl border bg-gradient-to-r from-indigo-50/80 to-violet-50/80 p-5 space-y-4">
                          <h4 className="font-semibold text-sm flex items-center gap-2"><Users className="h-4 w-4 text-indigo-600" />Configure Your School</h4>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium">Teachers</Label>
                                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs font-bold">{teacherCount}</Badge>
                              </div>
                              <Slider value={[teacherCount]} onValueChange={([v]) => setTeacherCount(v)} min={1} max={100} step={1} />
                              <div className="flex justify-between text-[10px] text-muted-foreground"><span>1</span><span>25</span><span>50</span><span>100</span></div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium">Students</Label>
                                <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs font-bold">{studentCount}</Badge>
                              </div>
                              <Slider value={[studentCount]} onValueChange={([v]) => setStudentCount(v)} min={10} max={3000} step={10} />
                              <div className="flex justify-between text-[10px] text-muted-foreground"><span>10</span><span>500</span><span>1,500</span><span>3,000</span></div>
                            </div>
                          </div>

                          {/* Show discounts for selected plan */}
                          {(() => {
                            const cost = calcAdminMonthlyCost(selectedPlan, teacherCount, studentCount, billingCycle === 'yearly');
                            const hasDiscount = cost.teacherDiscount > 0 || cost.studentDiscount > 0;
                            return hasDiscount ? (
                              <div className="flex flex-wrap gap-2">
                                {cost.teacherDiscount > 0 && (
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
                                    <Percent className="h-3 w-3" />{cost.teacherDiscount}% teacher discount
                                  </div>
                                )}
                                {cost.studentDiscount > 0 && (
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
                                    <Percent className="h-3 w-3" />{cost.studentDiscount}% student discount
                                  </div>
                                )}
                              </div>
                            ) : null;
                          })()}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {ADMIN_PLAN_CARDS.map((card) => {
                            const p = ADMIN_PLANS[card.id];
                            const cost = calcAdminMonthlyCost(card.id, teacherCount, studentCount, billingCycle === 'yearly');
                            return (
                              <button key={card.id} type="button" onClick={() => setSelectedPlan(card.id)}
                                className={cn(
                                  "relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md",
                                  card.color,
                                  selectedPlan === card.id ? "ring-2 ring-primary shadow-md" : "opacity-80 hover:opacity-100"
                                )}>
                                {card.popular && <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px]">Most Popular</Badge>}
                                <div className="flex items-center gap-2 mb-3">
                                  <span className={cn("p-1.5 rounded-lg", card.badgeColor)}>{card.icon}</span>
                                  <span className="font-semibold text-sm">{p.name}</span>
                                </div>
                                <div className="mb-1">
                                  <span className="text-2xl font-bold">₹{cost.total.toLocaleString('en-IN')}</span>
                                  <span className="text-sm text-muted-foreground">/mo</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground mb-3 space-y-0.5">
                                  <p>Platform: ₹{cost.platform.toLocaleString('en-IN')}</p>
                                  <p>{teacherCount} teachers: ₹{cost.teacherCost.toLocaleString('en-IN')}{cost.teacherDiscount > 0 && <span className="text-green-600 font-semibold"> (-{cost.teacherDiscount}%)</span>}</p>
                                  <p>{studentCount} students: ₹{cost.studentCost.toLocaleString('en-IN')}{cost.studentDiscount > 0 && <span className="text-green-600 font-semibold"> (-{cost.studentDiscount}%)</span>}</p>
                                </div>
                                <ul className="space-y-1.5">
                                  {p.features.map((f, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                      <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />{f}
                                    </li>
                                  ))}
                                </ul>
                                <div className="mt-3 pt-3 border-t text-[10px] text-muted-foreground space-y-0.5">
                                  <p>Per teacher: ₹{p.perTeacherMonthly}/mo</p>
                                  <p>Per student: ₹{p.perStudentMonthly}/mo</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground text-center">
                      After your request is approved, the administrator will contact you with payment details for your selected plan.
                    </p>

                    <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
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
