import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Zap, Crown, CheckCircle2, ArrowUpRight, Lock, ArrowDownRight, XCircle, RefreshCw } from 'lucide-react';
import { useStudentPlan, PLAN_CONFIGS, type PlanConfig } from '@/hooks/useStudentPlan';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const planIcons: Record<string, React.ReactNode> = {
  starter: <Sparkles className="h-5 w-5 text-blue-500" />,
  standard: <Zap className="h-5 w-5 text-purple-500" />,
  premium: <Crown className="h-5 w-5 text-amber-500" />,
};

const planColors: Record<string, string> = {
  starter: 'border-blue-200 bg-blue-50/50',
  standard: 'border-purple-200 bg-purple-50/50',
  premium: 'border-amber-200 bg-amber-50/50',
};

const planGradients: Record<string, string> = {
  starter: 'from-blue-500/10 to-blue-600/5',
  standard: 'from-purple-500/10 to-purple-600/5',
  premium: 'from-amber-500/10 to-amber-600/5',
};

type ActionType = 'upgrade' | 'downgrade' | 'cancel' | 'extend';

const StudentPlanCard = () => {
  const { plan, config, tokenUsagePercent, tokensRemaining, isLoading } = useStudentPlan();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('upgrade');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [reason, setReason] = useState('');

  if (isLoading) {
    return (
      <Card><CardContent className="py-6 text-center text-muted-foreground">Loading plan info...</CardContent></Card>
    );
  }

  if (!plan || !config) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <p>No active plan found. Contact your administrator.</p>
        </CardContent>
      </Card>
    );
  }

  const resetDate = new Date(plan.token_reset_date);
  const daysUntilReset = Math.max(0, Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const availableUpgrades = Object.values(PLAN_CONFIGS).filter(p => p.monthlyTokenLimit > config.monthlyTokenLimit);
  const availableDowngrades = Object.values(PLAN_CONFIGS).filter(p => p.monthlyTokenLimit < config.monthlyTokenLimit);

  const openDialog = (type: ActionType) => {
    setActionType(type);
    setSelectedPlan(null);
    setReason('');
    setDialogOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      let paymentPlan = '';
      if (actionType === 'upgrade' && selectedPlan) {
        paymentPlan = `upgrade_to_${selectedPlan}_${billingCycle}`;
      } else if (actionType === 'downgrade' && selectedPlan) {
        paymentPlan = `downgrade_to_${selectedPlan}_${billingCycle}`;
      } else if (actionType === 'cancel') {
        paymentPlan = `cancel_${plan.plan_id}`;
      } else if (actionType === 'extend') {
        paymentPlan = `extend_${plan.plan_id}_${billingCycle}`;
      }

      await supabase.from('registration_requests').insert({
        full_name: user.fullName,
        email: user.email,
        requested_role: 'student',
        status: 'pending',
        payment_plan: `${paymentPlan}${reason ? ` | Reason: ${reason}` : ''}`,
      } as any);

      const titles: Record<ActionType, string> = {
        upgrade: 'Upgrade request submitted!',
        downgrade: 'Downgrade request submitted!',
        cancel: 'Cancellation request submitted!',
        extend: 'Extension request submitted!',
      };

      toast({ title: titles[actionType], description: 'The administrator will contact you with further details.' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message?.includes('duplicate')
          ? 'You already have a pending request.'
          : 'Failed to submit request.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const dialogConfig: Record<ActionType, { title: string; description: string; showPlans: boolean; plans: typeof availableUpgrades }> = {
    upgrade: { title: 'Upgrade Your Plan', description: 'Choose a higher plan to unlock more features and tokens.', showPlans: true, plans: availableUpgrades },
    downgrade: { title: 'Downgrade Your Plan', description: 'Switch to a lower plan. You\'ll keep access until the current billing period ends.', showPlans: true, plans: availableDowngrades },
    cancel: { title: 'Cancel Your Plan', description: 'We\'re sad to see you go. Your access continues until the current billing period ends.', showPlans: false, plans: [] },
    extend: { title: 'Extend Your Plan', description: 'Request to renew or extend your current plan.', showPlans: false, plans: [] },
  };

  const dc = dialogConfig[actionType];

  return (
    <>
      <Card className={cn('border-2 relative overflow-hidden', planColors[plan.plan_id] || '')}>
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none', planGradients[plan.plan_id])} />
        <CardHeader className="pb-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {planIcons[plan.plan_id]}
              <CardTitle className="text-lg">{config.name} Plan</CardTitle>
              <Badge variant="outline" className="text-xs capitalize">{plan.billing_cycle}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          {/* Token Usage */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">AI Tokens Used</span>
              <span className="font-medium">{plan.tokens_used_this_month.toLocaleString()} / {plan.monthly_token_limit.toLocaleString()}</span>
            </div>
            <Progress
              value={tokenUsagePercent}
              className={cn('h-2.5 rounded-full', tokenUsagePercent > 90 ? '[&>div]:bg-destructive' : tokenUsagePercent > 70 ? '[&>div]:bg-amber-500' : '[&>div]:bg-primary')}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{tokensRemaining.toLocaleString()} remaining</span>
              <span>Resets in {daysUntilReset} days</span>
            </div>
          </div>

          {/* Features */}
          <div>
            <p className="text-sm font-medium mb-2">Your Features</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {config.features.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Locked features preview - enticing */}
          {plan.plan_id !== 'premium' && (
            <div className="pt-3 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Lock className="h-3 w-3" /> You're missing out on:
              </p>
              <div className="space-y-2">
                {!config.featureFlags.adaptiveProfile && (
                  <LockedFeatureRow icon={<Zap className="h-3.5 w-3.5 text-purple-500" />} title="Adaptive Learning Profiles" desc="AI personalizes your study path" plan="Standard" />
                )}
                {!config.featureFlags.customLearningPaths && (
                  <LockedFeatureRow icon={<Crown className="h-3.5 w-3.5 text-amber-500" />} title="Custom AI Learning Paths" desc="Paths generated just for you" plan="Premium" />
                )}
                {!config.featureFlags.capstoneAiGrading && (
                  <LockedFeatureRow icon={<Crown className="h-3.5 w-3.5 text-amber-500" />} title="AI Capstone Grading" desc="Instant detailed feedback" plan="Premium" />
                )}
                {!config.featureFlags.advancedAnalytics && (
                  <LockedFeatureRow icon={<Crown className="h-3.5 w-3.5 text-amber-500" />} title="Advanced Analytics" desc="Deep insights into your learning" plan="Premium" />
                )}
                {!config.featureFlags.unlimitedPortfolio && (
                  <LockedFeatureRow icon={<Crown className="h-3.5 w-3.5 text-amber-500" />} title="Unlimited Portfolio" desc="Showcase all your work" plan="Premium" />
                )}
                {!config.featureFlags.priorityAi && (
                  <LockedFeatureRow icon={<Zap className="h-3.5 w-3.5 text-purple-500" />} title="Priority AI" desc="Faster, better responses" plan="Standard" />
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t flex flex-wrap gap-2">
            {availableUpgrades.length > 0 && (
              <Button size="sm" onClick={() => openDialog('upgrade')} className="gap-1.5 shadow-md shadow-primary/20">
                <ArrowUpRight className="h-3.5 w-3.5" /> Upgrade
              </Button>
            )}
            {availableDowngrades.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => openDialog('downgrade')} className="gap-1.5">
                <ArrowDownRight className="h-3.5 w-3.5" /> Downgrade
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => openDialog('extend')} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Extend
            </Button>
            <Button size="sm" variant="ghost" onClick={() => openDialog('cancel')} className="gap-1.5 text-destructive hover:text-destructive">
              <XCircle className="h-3.5 w-3.5" /> Cancel Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dc.title}</DialogTitle>
            <DialogDescription>{dc.description}</DialogDescription>
          </DialogHeader>

          {dc.showPlans && (
            <>
              <div className="flex justify-center gap-1 mb-3 rounded-lg border p-1 bg-muted w-fit mx-auto">
                <Button variant={billingCycle === 'monthly' ? 'default' : 'ghost'} size="sm" className="text-xs h-7" onClick={() => setBillingCycle('monthly')}>Monthly</Button>
                <Button variant={billingCycle === 'yearly' ? 'default' : 'ghost'} size="sm" className="text-xs h-7" onClick={() => setBillingCycle('yearly')}>
                  Yearly <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 bg-green-100 text-green-700">Save 25%</Badge>
                </Button>
              </div>

              <div className="space-y-3">
                {dc.plans.map(up => (
                  <button
                    key={up.id}
                    type="button"
                    onClick={() => setSelectedPlan(up.id)}
                    className={cn(
                      'w-full rounded-xl border-2 p-4 text-left transition-all',
                      planColors[up.id],
                      selectedPlan === up.id ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {planIcons[up.id]}
                        <span className="font-semibold">{up.name}</span>
                      </div>
                      <span className="text-lg font-bold">
                        ₹{billingCycle === 'monthly' ? up.monthlyPrice : Math.round(up.yearlyPrice / 12)}/mo
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {up.features.map((f, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </>
          )}

          {actionType === 'cancel' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Please tell us why you'd like to cancel so we can improve:</p>
              <Textarea placeholder="Your reason (optional)..." value={reason} onChange={e => setReason(e.target.value)} rows={3} />
            </div>
          )}

          {actionType === 'extend' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Request to renew your <strong>{config.name}</strong> plan. The admin will contact you with payment details.
              </p>
              <Textarea placeholder="Any notes (optional)..." value={reason} onChange={e => setReason(e.target.value)} rows={2} />
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            After submitting, the administrator will contact you with further details.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={submitting || (dc.showPlans && !selectedPlan)}
              variant={actionType === 'cancel' ? 'destructive' : 'default'}
            >
              {submitting ? 'Submitting...' : `Request ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const LockedFeatureRow = ({ icon, title, desc, plan }: { icon: React.ReactNode; title: string; desc: string; plan: string }) => (
  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
    {icon}
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium truncate">{title}</p>
      <p className="text-[10px] text-muted-foreground truncate">{desc}</p>
    </div>
    <Badge variant="secondary" className="text-[10px] shrink-0">{plan}</Badge>
  </div>
);

export default StudentPlanCard;
