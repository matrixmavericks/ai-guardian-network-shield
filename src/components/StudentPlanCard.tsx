import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sparkles, Zap, Crown, CheckCircle2, ArrowUpRight, Lock } from 'lucide-react';
import { useStudentPlan, PLAN_CONFIGS, type PlanConfig } from '@/hooks/useStudentPlan';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const planIcons: Record<string, React.ReactNode> = {
  starter: <Sparkles className="h-5 w-5" />,
  standard: <Zap className="h-5 w-5" />,
  premium: <Crown className="h-5 w-5" />,
};

const planColors: Record<string, string> = {
  starter: 'border-blue-200 bg-blue-50/50',
  standard: 'border-purple-200 bg-purple-50/50',
  premium: 'border-amber-200 bg-amber-50/50',
};

const StudentPlanCard = () => {
  const { plan, config, tokenUsagePercent, tokensRemaining, isLoading } = useStudentPlan();
  const { user } = useAuth();
  const { toast } = useToast();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">Loading plan info...</CardContent>
      </Card>
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

  const availableUpgrades = Object.values(PLAN_CONFIGS).filter(
    p => p.monthlyTokenLimit > config.monthlyTokenLimit
  );

  const handleUpgradeRequest = async () => {
    if (!selectedUpgrade || !user) return;
    setUpgrading(true);
    try {
      // Submit upgrade request via registration_requests table
      const upgradeConfig = PLAN_CONFIGS[selectedUpgrade];
      await supabase.from('registration_requests').insert({
        full_name: user.fullName,
        email: user.email,
        requested_role: 'student',
        status: 'pending',
        payment_plan: `${selectedUpgrade}_${billingCycle}`,
      } as any);

      toast({
        title: "Upgrade request submitted!",
        description: `Your request to upgrade to ${upgradeConfig.name} has been sent. The admin will contact you with payment details.`,
      });
      setUpgradeOpen(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message?.includes('duplicate') 
          ? "You already have a pending upgrade request."
          : "Failed to submit upgrade request.",
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <>
      <Card className={cn("border-2", planColors[plan.plan_id] || "")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {planIcons[plan.plan_id]}
              <CardTitle className="text-lg">{config.name} Plan</CardTitle>
              <Badge variant="outline" className="text-xs capitalize">{plan.billing_cycle}</Badge>
            </div>
            {availableUpgrades.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setUpgradeOpen(true)}>
                <ArrowUpRight className="h-3 w-3 mr-1" /> Upgrade
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token Usage */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">AI Tokens Used</span>
              <span className="font-medium">
                {plan.tokens_used_this_month.toLocaleString()} / {plan.monthly_token_limit.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={tokenUsagePercent} 
              className={cn("h-2", tokenUsagePercent > 90 ? "[&>div]:bg-destructive" : tokenUsagePercent > 70 ? "[&>div]:bg-amber-500" : "")} 
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{tokensRemaining.toLocaleString()} remaining</span>
              <span>Resets in {daysUntilReset} days</span>
            </div>
          </div>

          {/* Features */}
          <div>
            <p className="text-sm font-medium mb-2">Plan Features</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {config.features.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Locked features preview */}
          {plan.plan_id !== 'premium' && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Unlock with upgrade:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {!config.featureFlags.adaptiveProfile && (
                  <Badge variant="secondary" className="text-xs">Adaptive Profiles</Badge>
                )}
                {!config.featureFlags.customLearningPaths && (
                  <Badge variant="secondary" className="text-xs">Custom Learning Paths</Badge>
                )}
                {!config.featureFlags.capstoneAiGrading && (
                  <Badge variant="secondary" className="text-xs">AI Capstone Grading</Badge>
                )}
                {!config.featureFlags.advancedAnalytics && (
                  <Badge variant="secondary" className="text-xs">Advanced Analytics</Badge>
                )}
                {!config.featureFlags.unlimitedPortfolio && (
                  <Badge variant="secondary" className="text-xs">Unlimited Portfolio</Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
          </DialogHeader>

          <div className="flex justify-center gap-1 mb-4 rounded-lg border p-1 bg-muted w-fit mx-auto">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
              size="sm" className="text-xs h-7"
              onClick={() => setBillingCycle('monthly')}
            >Monthly</Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
              size="sm" className="text-xs h-7"
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 bg-green-100 text-green-700">Save 25%</Badge>
            </Button>
          </div>

          <div className="space-y-3">
            {availableUpgrades.map(up => (
              <button
                key={up.id}
                type="button"
                onClick={() => setSelectedUpgrade(up.id)}
                className={cn(
                  "w-full rounded-xl border-2 p-4 text-left transition-all",
                  planColors[up.id],
                  selectedUpgrade === up.id ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"
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

          <p className="text-xs text-muted-foreground text-center">
            After submitting, the administrator will contact you with payment details for the upgrade.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>Cancel</Button>
            <Button onClick={handleUpgradeRequest} disabled={!selectedUpgrade || upgrading}>
              {upgrading ? "Submitting..." : "Request Upgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudentPlanCard;
