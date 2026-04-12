import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Re-export plan configs from centralized location
export { STUDENT_PLANS as PLAN_CONFIGS, TEACHER_PLANS, ADMIN_PLANS, ALL_PLAN_LABELS } from '@/lib/planConfigs';
export type { PlanConfig, TeacherPlanConfig, AdminPlanConfig } from '@/lib/planConfigs';
import { STUDENT_PLANS } from '@/lib/planConfigs';
import type { PlanConfig } from '@/lib/planConfigs';

export interface UserPlan {
  id: string;
  user_id: string;
  plan_id: string;
  billing_cycle: string;
  monthly_token_limit: number;
  tokens_used_this_month: number;
  token_reset_date: string;
  status: string;
  assigned_by: string | null;
}

export const useStudentPlan = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    if (!user) {
      setPlan(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      setPlan(data as UserPlan | null);
    } catch (err) {
      console.error('Error fetching user plan:', err);
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const config = plan ? STUDENT_PLANS[plan.plan_id] || STUDENT_PLANS.starter : null;
  const tokenUsagePercent = plan && plan.monthly_token_limit > 0
    ? Math.round((plan.tokens_used_this_month / plan.monthly_token_limit) * 100)
    : 0;
  const tokensRemaining = plan ? Math.max(0, plan.monthly_token_limit - plan.tokens_used_this_month) : 0;

  const hasFeature = (feature: keyof PlanConfig['featureFlags']): boolean => {
    if (!config) return false;
    return config.featureFlags[feature];
  };

  const canUseTokens = (amount: number = 1): boolean => {
    if (!plan) return false;
    return plan.tokens_used_this_month + amount <= plan.monthly_token_limit;
  };

  return {
    plan,
    config,
    isLoading,
    tokenUsagePercent,
    tokensRemaining,
    hasFeature,
    canUseTokens,
    refetch: fetchPlan,
  };
};
