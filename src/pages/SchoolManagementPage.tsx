import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardNav from '@/components/DashboardNav';
import { useToast } from '@/components/ui/use-toast';
import {
  School, Plus, Settings2, Users, Brain, Trash2, UserPlus,
  Shield, BookOpen, RefreshCw, Building2, Globe, Mail, MapPin,
  CreditCard, TrendingUp, ArrowUpRight, IndianRupee, CheckCircle2,
  Palette, Link2, Crown, Zap
} from 'lucide-react';
import { ADMIN_PLANS, calcAdminMonthlyCost, type AdminPlanConfig } from '@/lib/planConfigs';

const AI_MODELS = [
  'google/gemini-2.5-pro', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite',
  'google/gemini-3-flash-preview', 'google/gemini-3.1-pro-preview',
  'openai/gpt-5', 'openai/gpt-5-mini', 'openai/gpt-5-nano', 'openai/gpt-5.2',
];

interface SchoolData {
  id: string; name: string; description: string; logo_url: string | null;
  domain: string | null; contact_email: string | null; address: string | null;
  created_at: string; subdomain?: string | null; theme_config?: any;
  memberCount?: number; classCount?: number;
}

interface SchoolAISettings {
  id?: string; school_id: string; allowed_ai_models: string[];
  max_daily_prompts_per_student: number; max_monthly_cost_usd: number;
  blocked_keywords: string[]; process_mode_enabled: boolean;
  allow_student_chat: boolean; allow_capstone_ai_grading: boolean;
  allow_learning_path_generation: boolean; custom_system_prompt: string;
  grade_level_restrictions: string[]; subject_restrictions: string[];
}

const WEBSITE_ADMIN_EMAIL = "info.aiconditioner@gmail.com";

// ─── Plan tier feature gates ───
const PLAN_FEATURES: Record<string, { customDomain: boolean; whiteLabel: boolean; multiCampus: boolean; apiAccess: boolean; customTraining: boolean }> = {
  school_starter: { customDomain: false, whiteLabel: false, multiCampus: false, apiAccess: false, customTraining: false },
  school_growth: { customDomain: true, whiteLabel: false, multiCampus: false, apiAccess: false, customTraining: false },
  school_enterprise: { customDomain: true, whiteLabel: true, multiCampus: true, apiAccess: true, customTraining: true },
};

export default function SchoolManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [adminPlan, setAdminPlan] = useState<any>(null);
  const [seatLimits, setSeatLimits] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('billing');

  const isMasterAdmin = user?.email === WEBSITE_ADMIN_EMAIL;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchSchools(), fetchAdminPlan()]);
    setLoading(false);
  };

  const fetchAdminPlan = async () => {
    if (!user?.id) return;
    // Fetch the admin's personal plan
    const { data: planData } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);
    if (planData && planData.length > 0) setAdminPlan(planData[0]);

    // Fetch seat limits from any school the admin owns
    const { data: mySchools } = await supabase
      .from('school_members')
      .select('school_id')
      .eq('user_id', user.id)
      .eq('school_role', 'admin');
    if (mySchools && mySchools.length > 0) {
      const { data: seats } = await supabase
        .from('school_seat_limits')
        .select('*')
        .eq('school_id', mySchools[0].school_id)
        .maybeSingle();
      setSeatLimits(seats);
    }
  };

  const fetchSchools = async () => {
    let schoolsData: any[] = [];
    if (isMasterAdmin) {
      const { data } = await supabase.from('schools').select('*').order('created_at', { ascending: false });
      schoolsData = data || [];
    } else {
      const { data: myMemberships } = await supabase
        .from('school_members').select('school_id').eq('user_id', user?.id || '');
      const ids = (myMemberships || []).map((m: any) => m.school_id);
      if (ids.length > 0) {
        const { data } = await supabase.from('schools').select('*').in('id', ids).order('created_at', { ascending: false });
        schoolsData = data || [];
      }
    }
    const [{ data: members }, { data: classes }] = await Promise.all([
      supabase.from('school_members').select('school_id'),
      supabase.from('classes').select('school_id'),
    ]);
    setSchools(schoolsData.map((s: any) => ({
      ...s,
      memberCount: (members || []).filter((m: any) => m.school_id === s.id).length,
      classCount: (classes || []).filter((c: any) => c.school_id === s.id).length,
    })));
  };

  const unlimitedPlanConfig: AdminPlanConfig = {
    id: 'unlimited', name: 'Unlimited (Master Admin)', platformFeeMonthly: 0, platformFeeYearly: 0,
    perTeacherMonthly: 0, perStudentMonthly: 0,
    features: ['All features unlocked', 'Unlimited seats', 'Full platform access', 'Master admin controls'],
    teacherDiscounts: [], studentDiscounts: [],
  };
  const currentPlanConfig = adminPlan ? (ADMIN_PLANS[adminPlan.plan_id] || unlimitedPlanConfig) : null;
  const planFeatures = adminPlan ? (PLAN_FEATURES[adminPlan.plan_id] || PLAN_FEATURES.school_enterprise) : null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <Building2 className="h-8 w-8 text-primary" />
                  School Management
                </h1>
                <p className="text-muted-foreground mt-1">Manage your admin plan, billing, and school ecosystems</p>
              </div>
              <Button onClick={fetchAll} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : selectedSchool ? (
              <SchoolDetail school={selectedSchool} onBack={() => { setSelectedSchool(null); fetchAll(); }} userId={user?.id || ''} planFeatures={planFeatures} />
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="billing">My Plan & Billing</TabsTrigger>
                  <TabsTrigger value="schools">My Schools</TabsTrigger>
                </TabsList>

                {/* ─── BILLING TAB ─── */}
                <TabsContent value="billing" className="space-y-6">
                  <AdminBillingView adminPlan={adminPlan} seatLimits={seatLimits} currentPlanConfig={currentPlanConfig} planFeatures={planFeatures} />
                </TabsContent>

                {/* ─── SCHOOLS TAB ─── */}
                <TabsContent value="schools" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Your Schools</h2>
                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                      <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="h-4 w-4" /> Create School</Button>
                      </DialogTrigger>
                      <CreateSchoolDialog
                        userId={user?.id || ''}
                        planFeatures={planFeatures}
                        seatLimits={seatLimits}
                        adminPlanId={adminPlan?.plan_id}
                        billingCycle={adminPlan?.billing_cycle}
                        onCreated={() => { fetchAll(); setShowCreateDialog(false); }}
                      />
                    </Dialog>
                  </div>

                  {schools.length === 0 ? (
                    <Card>
                      <CardContent className="py-16 text-center">
                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Schools Yet</h3>
                        <p className="text-muted-foreground mb-4">Create your first school to start managing classes, teachers, and students.</p>
                        <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" /> Create School</Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {schools.map(school => (
                        <Card key={school.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedSchool(school)}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">{school.name}</CardTitle>
                                <CardDescription className="mt-1 line-clamp-2">{school.description || 'No description'}</CardDescription>
                              </div>
                              <School className="h-6 w-6 text-primary shrink-0" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {school.memberCount} members</span>
                              <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" /> {school.classCount} classes</span>
                            </div>
                            {school.subdomain && (
                              <Badge variant="outline" className="mt-3"><Globe className="h-3 w-3 mr-1" />{school.subdomain}.refyntech.us</Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ============ ADMIN BILLING VIEW ============

function AdminBillingView({
  adminPlan, seatLimits, currentPlanConfig, planFeatures,
}: {
  adminPlan: any; seatLimits: any; currentPlanConfig: AdminPlanConfig | null; planFeatures: any;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeNote, setUpgradeNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  const cost = seatLimits && adminPlan
    ? calcAdminMonthlyCost(adminPlan.plan_id, seatLimits.teacher_seats, seatLimits.student_seats, adminPlan.billing_cycle === 'yearly')
    : null;

  const submitUpgradeRequest = async () => {
    setSubmitting(true);
    const { error } = await supabase.from('registration_requests').insert({
      full_name: `[UPGRADE REQUEST]`,
      email: 'upgrade@request',
      requested_role: 'admin',
      status: 'pending',
      payment_plan: adminPlan?.plan_id ? `${adminPlan.plan_id}_${adminPlan.billing_cycle}` : null,
      seat_config: { teachers: seatLimits?.teacher_seats || 0, students: seatLimits?.student_seats || 0, note: upgradeNote },
    } as any);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Request submitted', description: 'The platform administrator will review your upgrade request.' });
      setShowUpgradeDialog(false); setUpgradeNote('');
    }
    setSubmitting(false);
  };

  const provisionNow = async () => {
    if (!user?.id) return;
    setProvisioning(true);
    try {
      // Look up the approved registration request
      const { data: reqData } = await supabase
        .from('registration_requests')
        .select('payment_plan, seat_config, requested_role, status')
        .eq('email', (user.email || '').toLowerCase())
        .in('status', ['completed', 'approved'])
        .limit(1);

      if (!reqData || reqData.length === 0) {
        toast({ title: 'No approved request found', description: 'Your registration request may still be pending approval.', variant: 'destructive' });
        setProvisioning(false);
        return;
      }

      const req = reqData[0];
      const paymentPlan = req.payment_plan;
      const seatConfig = req.seat_config as { teachers: number; students: number } | null;

      if (!paymentPlan) {
        toast({ title: 'No plan found', description: 'Your registration request does not include a payment plan.', variant: 'destructive' });
        setProvisioning(false);
        return;
      }

      const planParts = paymentPlan.split('_');
      const planId = planParts.slice(0, -1).join('_') || 'school_starter';
      const billingCycle = planParts[planParts.length - 1] || 'monthly';

      // Create user_plan
      await supabase.from('user_plans').insert({
        user_id: user.id,
        plan_id: planId,
        billing_cycle: billingCycle,
        monthly_token_limit: 99999,
        tokens_used_this_month: 0,
        status: 'active',
      } as any);

      // Create school if seatConfig exists and no school yet
      if (seatConfig) {
        const { data: existingSchools } = await supabase
          .from('school_members').select('school_id').eq('user_id', user.id).limit(1);

        if (!existingSchools || existingSchools.length === 0) {
          const userName = user.fullName || user.email?.split('@')[0] || 'Admin';
          const { data: schoolData } = await supabase.from('schools').insert({
            name: `${userName}'s School`,
            created_by: user.id,
            contact_email: user.email || null,
          } as any).select().single();

          if (schoolData) {
            const schoolId = (schoolData as any).id;
            await Promise.all([
              supabase.from('school_members').insert({ school_id: schoolId, user_id: user.id, school_role: 'admin' } as any),
              supabase.from('school_ai_settings').insert({ school_id: schoolId } as any),
              supabase.from('school_seat_limits').insert({
                school_id: schoolId, plan_id: planId, billing_cycle: billingCycle,
                teacher_seats: seatConfig.teachers || 0, student_seats: seatConfig.students || 0,
                teachers_used: 0, students_used: 0,
              } as any),
            ]);
          }
        }
      }

      toast({ title: 'Plan activated!', description: 'Your admin plan and school have been set up. Refreshing...' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setProvisioning(false);
  };

  if (!adminPlan) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Admin Plan Found</h3>
          <p className="text-muted-foreground mb-4">Your admin plan may not have been provisioned yet. Click below to activate it from your approved registration.</p>
          <Button onClick={provisionNow} disabled={provisioning} className="gap-2">
            {provisioning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {provisioning ? 'Activating...' : 'Activate My Plan'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const planTierIcon = adminPlan.plan_id === 'school_enterprise' ? <Crown className="h-5 w-5" /> :
    adminPlan.plan_id === 'school_growth' ? <Zap className="h-5 w-5" /> : <School className="h-5 w-5" />;

  const planTierColor = adminPlan.plan_id === 'school_enterprise' ? 'from-amber-50 to-orange-50 border-amber-300' :
    adminPlan.plan_id === 'school_growth' ? 'from-indigo-50 to-violet-50 border-indigo-300' : 'from-sky-50 to-blue-50 border-sky-300';

  return (
    <div className="space-y-6">
      {/* Plan header */}
      <Card className={`bg-gradient-to-br ${planTierColor}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/80 shadow-sm">{planTierIcon}</div>
              <div>
                <CardTitle className="text-xl">{currentPlanConfig?.name || adminPlan.plan_id.replace(/_/g, ' ')} Plan</CardTitle>
                <CardDescription className="capitalize">{adminPlan.billing_cycle} billing • Status: <Badge variant="outline" className="ml-1 capitalize">{adminPlan.status}</Badge></CardDescription>
              </div>
            </div>
            <Button variant="outline" className="gap-1" onClick={() => setShowUpgradeDialog(true)}>
              <ArrowUpRight className="h-4 w-4" /> Upgrade / Change
            </Button>
          </div>
        </CardHeader>
        {cost && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Platform Fee', value: cost.platform, sub: '/month' },
                { label: 'Teacher Cost', value: cost.teacherCost, sub: `${seatLimits?.teacher_seats || 0} seats` },
                { label: 'Student Cost', value: cost.studentCost, sub: `${seatLimits?.student_seats || 0} seats` },
                { label: 'Total Monthly', value: cost.total, sub: `₹${(cost.total * 12).toLocaleString('en-IN')}/yr`, highlight: true },
              ].map((item, i) => (
                <div key={i} className={`rounded-xl border p-4 text-center ${item.highlight ? 'bg-primary/5 border-primary/30' : 'bg-white'}`}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className="text-xl font-bold mt-1">₹{item.value.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Seat usage */}
      {seatLimits && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Teacher Seats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold">{seatLimits.teachers_used || 0}</span>
                <span className="text-muted-foreground text-lg mb-0.5">/ {seatLimits.teacher_seats}</span>
              </div>
              <Progress value={Math.min(100, ((seatLimits.teachers_used || 0) / Math.max(1, seatLimits.teacher_seats)) * 100)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{seatLimits.teacher_seats - (seatLimits.teachers_used || 0)} seats remaining</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Student Seats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold">{seatLimits.students_used || 0}</span>
                <span className="text-muted-foreground text-lg mb-0.5">/ {seatLimits.student_seats}</span>
              </div>
              <Progress value={Math.min(100, ((seatLimits.students_used || 0) / Math.max(1, seatLimits.student_seats)) * 100)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{seatLimits.student_seats - (seatLimits.students_used || 0)} seats remaining</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Features included */}
      {currentPlanConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Features Included in Your Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentPlanConfig.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />{f}
                </li>
              ))}
            </ul>
            {planFeatures && (
              <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { label: 'Custom Domain', enabled: planFeatures.customDomain },
                  { label: 'White Label', enabled: planFeatures.whiteLabel },
                  { label: 'Multi-Campus', enabled: planFeatures.multiCampus },
                  { label: 'API Access', enabled: planFeatures.apiAccess },
                  { label: 'Custom AI Training', enabled: planFeatures.customTraining },
                ].map((feat, i) => (
                  <div key={i} className={`text-center rounded-lg border p-2 ${feat.enabled ? 'bg-green-50 border-green-200' : 'bg-muted/50 opacity-50'}`}>
                    <p className="text-[10px] font-semibold">{feat.enabled ? '✓' : '✗'} {feat.label}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compare plans */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Compare All Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(ADMIN_PLANS).map(plan => {
              const isCurrent = adminPlan?.plan_id === plan.id;
              const exampleCost = calcAdminMonthlyCost(plan.id, seatLimits?.teacher_seats || 5, seatLimits?.student_seats || 50, false);
              const icon = plan.id === 'school_enterprise' ? <Crown className="h-5 w-5 text-amber-600" /> :
                plan.id === 'school_growth' ? <Zap className="h-5 w-5 text-indigo-600" /> : <School className="h-5 w-5 text-sky-600" />;
              return (
                <div key={plan.id} className={`rounded-xl border-2 p-5 transition-all ${isCurrent ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg' : 'border-muted hover:border-muted-foreground/30'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">{icon}<span className="font-bold">{plan.name}</span></div>
                    {isCurrent && <Badge className="bg-primary text-primary-foreground text-[10px]">Current</Badge>}
                  </div>
                  <div className="mb-3">
                    <span className="text-2xl font-bold">₹{exampleCost.total.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-muted-foreground">/mo est.</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-0.5 mb-3">
                    <p>Platform: ₹{plan.platformFeeMonthly.toLocaleString('en-IN')}/mo</p>
                    <p>Per teacher: ₹{plan.perTeacherMonthly}/mo</p>
                    <p>Per student: ₹{plan.perStudentMonthly}/mo</p>
                  </div>
                  <ul className="space-y-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Plan Change</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Describe what you'd like to change — plan tier, seat count, billing cycle, etc.</p>
          <Textarea value={upgradeNote} onChange={e => setUpgradeNote(e.target.value)} placeholder="e.g. Upgrade to Enterprise with 20 teachers and 500 students..." rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>Cancel</Button>
            <Button onClick={submitUpgradeRequest} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ CREATE SCHOOL DIALOG ============

function CreateSchoolDialog({ userId, planFeatures, seatLimits, adminPlanId, billingCycle, onCreated }: {
  userId: string; planFeatures: any; seatLimits: any; adminPlanId?: string; billingCycle?: string; onCreated: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', description: '', domain: '', contact_email: '', address: '', subdomain: '' });
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [accentColor, setAccentColor] = useState('#8b5cf6');
  const [saving, setSaving] = useState(false);

  const canSetSubdomain = planFeatures?.customDomain;

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    // Validate subdomain
    const subdomainValue = form.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (canSetSubdomain && subdomainValue) {
      const { data: existing } = await supabase.from('schools').select('id').eq('subdomain', subdomainValue).limit(1);
      if (existing && existing.length > 0) {
        toast({ title: 'Subdomain taken', description: `"${subdomainValue}.refyntech.us" is already in use.`, variant: 'destructive' });
        setSaving(false);
        return;
      }
    }

    const { data, error } = await supabase.from('schools').insert({
      name: form.name, description: form.description, domain: form.domain || null,
      contact_email: form.contact_email || null, address: form.address || null,
      created_by: userId,
      subdomain: canSetSubdomain && subdomainValue ? subdomainValue : null,
      theme_config: { primaryColor, accentColor },
    } as any).select().single();

    if (error) {
      toast({ title: 'Error creating school', description: error.message, variant: 'destructive' });
    } else if (data) {
      const schoolId = (data as any).id;
      // Create default AI settings, add creator as admin, copy seat limits
      await Promise.all([
        supabase.from('school_ai_settings').insert({ school_id: schoolId } as any),
        supabase.from('school_members').insert({ school_id: schoolId, user_id: userId, school_role: 'admin' } as any),
        seatLimits ? supabase.from('school_seat_limits').insert({
          school_id: schoolId, plan_id: adminPlanId || 'school_starter',
          billing_cycle: billingCycle || 'monthly',
          teacher_seats: seatLimits.teacher_seats, student_seats: seatLimits.student_seats,
          teachers_used: 0, students_used: 0,
        } as any) : Promise.resolve(),
      ]);
      toast({ title: 'School created!', description: `${form.name} is ready.` });
      onCreated();
    }
    setSaving(false);
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Create New School</DialogTitle></DialogHeader>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div><Label>School Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Lincoln High School" /></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Contact Email</Label><Input value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="admin@school.edu" /></div>
          <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St" /></div>
        </div>

        {/* Custom Subdomain */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Custom Subdomain</Label>
            {!canSetSubdomain && <Badge variant="secondary" className="text-[10px]">Growth+ plan required</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <Input
              value={form.subdomain}
              onChange={e => setForm(p => ({ ...p, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              placeholder="yourschool"
              disabled={!canSetSubdomain}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">.refyntech.us</span>
          </div>
          {canSetSubdomain && form.subdomain && (
            <p className="text-xs text-muted-foreground">Your school will be accessible at <strong>{form.subdomain}.refyntech.us</strong></p>
          )}
        </div>

        {/* Theme */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">School Theme</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Primary Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0" />
                <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="text-xs h-8" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Accent Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0" />
                <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="text-xs h-8" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 rounded flex-1" style={{ backgroundColor: primaryColor }} />
            <div className="h-8 rounded flex-1" style={{ backgroundColor: accentColor }} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>{saving ? 'Creating...' : 'Create School'}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============ SCHOOL DETAIL VIEW ============

function SchoolDetail({ school, onBack, userId, planFeatures }: { school: SchoolData; onBack: () => void; userId: string; planFeatures: any }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [aiSettings, setAiSettings] = useState<SchoolAISettings | null>(null);
  const [seatLimits, setSeatLimits] = useState<any>(null);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('member');
  const [newKeyword, setNewKeyword] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [assignClassId, setAssignClassId] = useState('');
  const [unassignedClasses, setUnassignedClasses] = useState<any[]>([]);
  const [trainingData, setTrainingData] = useState<any[]>([]);

  useEffect(() => { fetchDetail(); }, [school.id]);

  const fetchDetail = async () => {
    setLoading(true);
    const [{ data: mems }, { data: cls }, { data: settings }, { data: profiles }, { data: allCls }, { data: tData }, { data: seats }] = await Promise.all([
      supabase.from('school_members').select('*').eq('school_id', school.id),
      supabase.from('classes').select('*').eq('school_id', school.id),
      supabase.from('school_ai_settings').select('*').eq('school_id', school.id).maybeSingle(),
      supabase.from('profiles').select('user_id, full_name, email'),
      supabase.from('classes').select('*'),
      supabase.from('model_training_data').select('*').order('created_at', { ascending: false }),
      supabase.from('school_seat_limits').select('*').eq('school_id', school.id).maybeSingle(),
    ]);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    setMembers((mems || []).map((m: any) => ({ ...m, profile: profileMap.get(m.user_id) })));
    setClasses(cls || []);
    setAllProfiles(profiles || []);
    setUnassignedClasses((allCls || []).filter((c: any) => !c.school_id));
    setTrainingData(tData || []);
    setSeatLimits(seats || null);
    if (settings) setAiSettings(settings as any);
    else {
      const { data: newSettings } = await supabase.from('school_ai_settings').insert({ school_id: school.id } as any).select().single();
      setAiSettings(newSettings as any);
    }
    setLoading(false);
  };

  const addMember = async () => {
    const profile = allProfiles.find((p: any) => p.email === addMemberEmail);
    if (!profile) { toast({ title: 'User not found', variant: 'destructive' }); return; }
    if (seatLimits) {
      const isTeacherAdd = addMemberRole === 'teacher' || addMemberRole === 'admin';
      const currentTeachers = members.filter(m => m.school_role === 'teacher' || m.school_role === 'admin').length;
      const currentStudents = members.filter(m => m.school_role === 'member').length;
      if (isTeacherAdd && currentTeachers >= seatLimits.teacher_seats) {
        toast({ title: 'Teacher seat limit reached', description: `Your plan allows ${seatLimits.teacher_seats} teacher seats.`, variant: 'destructive' }); return;
      }
      if (!isTeacherAdd && currentStudents >= seatLimits.student_seats) {
        toast({ title: 'Student seat limit reached', description: `Your plan allows ${seatLimits.student_seats} student seats.`, variant: 'destructive' }); return;
      }
    }
    const { error } = await supabase.from('school_members').insert({ school_id: school.id, user_id: profile.user_id, school_role: addMemberRole } as any);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      if (seatLimits) {
        const isTeacher = addMemberRole === 'teacher' || addMemberRole === 'admin';
        await supabase.from('school_seat_limits').update(
          isTeacher ? { teachers_used: (seatLimits.teachers_used || 0) + 1 } : { students_used: (seatLimits.students_used || 0) + 1 } as any
        ).eq('school_id', school.id);
      }
      toast({ title: 'Member added' }); setAddMemberEmail(''); fetchDetail();
    }
  };

  const removeMember = async (memberId: string) => {
    await supabase.from('school_members').delete().eq('id', memberId);
    toast({ title: 'Member removed' }); fetchDetail();
  };

  const assignClass = async () => {
    if (!assignClassId) return;
    await supabase.from('classes').update({ school_id: school.id } as any).eq('id', assignClassId);
    toast({ title: 'Class assigned' }); setAssignClassId(''); fetchDetail();
  };

  const unassignClass = async (classId: string) => {
    await supabase.from('classes').update({ school_id: null } as any).eq('id', classId);
    toast({ title: 'Class unassigned' }); fetchDetail();
  };

  const updateAISettings = async (updates: Partial<SchoolAISettings>) => {
    if (!aiSettings?.id) return;
    const { error } = await supabase.from('school_ai_settings').update(updates as any).eq('id', aiSettings.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setAiSettings(prev => prev ? { ...prev, ...updates } : prev); toast({ title: 'Settings updated' }); }
  };

  const addBlockedKeyword = () => {
    if (!newKeyword.trim() || !aiSettings) return;
    updateAISettings({ blocked_keywords: [...(aiSettings.blocked_keywords || []), newKeyword.trim()] });
    setNewKeyword('');
  };

  const removeBlockedKeyword = (kw: string) => {
    if (!aiSettings) return;
    updateAISettings({ blocked_keywords: aiSettings.blocked_keywords.filter(k => k !== kw) });
  };

  const addSubjectRestriction = () => {
    if (!newSubject.trim() || !aiSettings) return;
    updateAISettings({ subject_restrictions: [...(aiSettings.subject_restrictions || []), newSubject.trim().toLowerCase()] });
    setNewSubject('');
  };

  const removeSubjectRestriction = (subj: string) => {
    if (!aiSettings) return;
    updateAISettings({ subject_restrictions: aiSettings.subject_restrictions.filter(s => s !== subj) });
  };

  const toggleTrainingData = (tdId: string) => {
    if (!aiSettings) return;
    const current = (aiSettings as any).custom_model_training_data_ids || [];
    const updated = current.includes(tdId) ? current.filter((id: string) => id !== tdId) : [...current, tdId];
    updateAISettings({ custom_model_training_data_ids: updated } as any);
  };

  const toggleModel = (model: string) => {
    if (!aiSettings) return;
    const current = aiSettings.allowed_ai_models || [];
    updateAISettings({ allowed_ai_models: current.includes(model) ? current.filter(m => m !== model) : [...current, model] });
  };

  const deleteSchool = async () => {
    if (!confirm(`Delete "${school.name}"? This will remove all members and settings.`)) return;
    await supabase.from('schools').delete().eq('id', school.id);
    toast({ title: 'School deleted' }); onBack();
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const teachersUsed = members.filter(m => m.school_role === 'teacher' || m.school_role === 'admin').length;
  const studentsUsed = members.filter(m => m.school_role === 'member').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2 text-sm">← Back</Button>
          <h2 className="text-2xl font-bold flex items-center gap-2"><School className="h-6 w-6 text-primary" />{school.name}</h2>
          <p className="text-muted-foreground">{school.description || 'No description'}</p>
          <div className="flex gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
            {school.subdomain && <Badge variant="outline"><Globe className="h-3 w-3 mr-1" />{school.subdomain}.refyntech.us</Badge>}
            {school.contact_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{school.contact_email}</span>}
            {school.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{school.address}</span>}
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={deleteSchool}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="ai-settings">AI Settings</TabsTrigger>
          <TabsTrigger value="ai-models">AI Models</TabsTrigger>
        </TabsList>

        {/* MEMBERS TAB */}
        <TabsContent value="members" className="space-y-4">
          {seatLimits && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Teacher Seats</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-2xl font-bold">{teachersUsed}</span>
                    <span className="text-muted-foreground text-sm">/ {seatLimits.teacher_seats}</span>
                  </div>
                  <Progress value={Math.min(100, (teachersUsed / Math.max(1, seatLimits.teacher_seats)) * 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{Math.max(0, seatLimits.teacher_seats - teachersUsed)} remaining</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-violet-50/50 to-pink-50/50">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Student Seats</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-2xl font-bold">{studentsUsed}</span>
                    <span className="text-muted-foreground text-sm">/ {seatLimits.student_seats}</span>
                  </div>
                  <Progress value={Math.min(100, (studentsUsed / Math.max(1, seatLimits.student_seats)) * 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{Math.max(0, seatLimits.student_seats - studentsUsed)} remaining</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Create New Account */}
          <CreateSchoolUserCard schoolId={school.id} seatLimits={seatLimits} teachersUsed={teachersUsed} studentsUsed={studentsUsed} onCreated={fetchDetail} />

          {/* Add Existing User */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-5 w-5" /> Add Existing User</CardTitle>
              <CardDescription>Add a user who already has an account on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)} placeholder="User email" className="flex-1" />
                <Select value={addMemberRole} onValueChange={setAddMemberRole}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="member">Student</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addMember} disabled={!addMemberEmail}>Add</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Members ({members.length})</CardTitle></CardHeader>
            <CardContent>
              {members.length === 0 ? <p className="text-muted-foreground text-sm">No members yet.</p> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {members.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.profile?.full_name || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.profile?.email || '—'}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{m.school_role}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(m.joined_at).toLocaleDateString()}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Assign Existing Class</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Select value={assignClassId} onValueChange={setAssignClassId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select unassigned class..." /></SelectTrigger>
                  <SelectContent>
                    {unassignedClasses.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name} — {c.subject}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Button onClick={assignClass} disabled={!assignClassId}>Assign</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">School Classes ({classes.length})</CardTitle></CardHeader>
            <CardContent>
              {classes.length === 0 ? <p className="text-muted-foreground text-sm">No classes assigned.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Subject</TableHead><TableHead>Join Code</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {classes.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell><Badge variant="outline">{c.subject}</Badge></TableCell>
                        <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{c.join_code}</code></TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => unassignClass(c.id)}>Unassign</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI SETTINGS TAB */}
        <TabsContent value="ai-settings" className="space-y-4">
          {aiSettings && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Shield className="h-5 w-5" /> Feature Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleRow label="AI Chat for Students" desc="Allow students to use the AI learning assistant" checked={aiSettings.allow_student_chat} onChange={v => updateAISettings({ allow_student_chat: v })} />
                  <ToggleRow label="Process Teaching Mode" desc="Enable guided prompts that teach instead of giving answers" checked={aiSettings.process_mode_enabled} onChange={v => updateAISettings({ process_mode_enabled: v })} />
                  <ToggleRow label="Capstone AI Grading" desc="Allow AI to provide automated feedback on capstone submissions" checked={aiSettings.allow_capstone_ai_grading} onChange={v => updateAISettings({ allow_capstone_ai_grading: v })} />
                  <ToggleRow label="Learning Path Generation" desc="Allow AI to generate personalized learning paths" checked={aiSettings.allow_learning_path_generation} onChange={v => updateAISettings({ allow_learning_path_generation: v })} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-5 w-5" /> Usage Limits</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Max Daily Prompts per Student</Label>
                      <Input type="number" value={aiSettings.max_daily_prompts_per_student} onChange={e => updateAISettings({ max_daily_prompts_per_student: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label>Max Monthly Cost (USD)</Label>
                      <Input type="number" step="0.01" value={aiSettings.max_monthly_cost_usd} onChange={e => updateAISettings({ max_monthly_cost_usd: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Blocked Keywords</CardTitle>
                  <CardDescription>Keywords blocked in student prompts for this school</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-3">
                    <Input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="Add keyword..." onKeyDown={e => e.key === 'Enter' && addBlockedKeyword()} />
                    <Button onClick={addBlockedKeyword} size="sm">Add</Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(aiSettings.blocked_keywords || []).map(kw => (
                      <Badge key={kw} variant="destructive" className="gap-1 cursor-pointer" onClick={() => removeBlockedKeyword(kw)}>{kw} ×</Badge>
                    ))}
                    {(aiSettings.blocked_keywords || []).length === 0 && <p className="text-sm text-muted-foreground">No blocked keywords.</p>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Subject Filtering</CardTitle>
                  <CardDescription>Restrict AI to specific subjects only. Leave empty for all subjects.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-3">
                    <Select value={newSubject} onValueChange={setNewSubject}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select subject..." /></SelectTrigger>
                      <SelectContent>
                        {['math', 'science', 'english', 'history', 'programming', 'writing', 'languages', 'art', 'music', 'geography'].filter(s => !(aiSettings.subject_restrictions || []).includes(s)).map(s => (
                          <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addSubjectRestriction} size="sm" disabled={!newSubject}>Add</Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(aiSettings.subject_restrictions || []).map((subj: string) => (
                      <Badge key={subj} variant="secondary" className="gap-1 cursor-pointer capitalize" onClick={() => removeSubjectRestriction(subj)}>{subj} ×</Badge>
                    ))}
                    {(aiSettings.subject_restrictions || []).length === 0 && <p className="text-sm text-muted-foreground">All subjects allowed.</p>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Custom System Prompt</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea value={aiSettings.custom_system_prompt} onChange={e => updateAISettings({ custom_system_prompt: e.target.value })} placeholder="Custom AI system prompt for this school..." rows={4} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* AI MODELS TAB */}
        <TabsContent value="ai-models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Brain className="h-5 w-5" /> Allowed AI Models</CardTitle>
              <CardDescription>Select which AI models students can access. Smaller models = lower cost.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {AI_MODELS.map(model => {
                  const isEnabled = aiSettings?.allowed_ai_models?.includes(model);
                  const [provider, name] = model.split('/');
                  return (
                    <div key={model} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div>
                        <div className="font-medium text-sm">{name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{provider}</div>
                      </div>
                      <Switch checked={isEnabled} onCheckedChange={() => toggleModel(model)} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          {planFeatures?.customTraining && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">School Training Datasets</CardTitle>
                <CardDescription>Link training data to customize AI responses for this school.</CardDescription>
              </CardHeader>
              <CardContent>
                {trainingData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No training data available.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {trainingData.map((td: any) => {
                      const isLinked = ((aiSettings as any)?.custom_model_training_data_ids || []).includes(td.id);
                      return (
                        <div key={td.id} className={`flex items-center justify-between p-3 border rounded-lg ${isLinked ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="capitalize text-xs">{td.subject}</Badge>
                              {td.approved ? <Badge className="text-xs bg-green-100 text-green-700">Approved</Badge> : <Badge variant="secondary" className="text-xs">Pending</Badge>}
                            </div>
                            <p className="text-sm truncate">{td.input_prompt}</p>
                          </div>
                          <Switch checked={isLinked} onCheckedChange={() => toggleTrainingData(td.id)} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div><Label className="text-sm font-medium">{label}</Label><p className="text-xs text-muted-foreground">{desc}</p></div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
