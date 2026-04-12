import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PlanConfig {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyTokenLimit: number;
  features: string[];
  featureFlags: {
    aiAssistant: boolean;
    adaptiveProfile: boolean;
    learningPaths: boolean;
    customLearningPaths: boolean;
    quizPractice: boolean;
    unlimitedQuizPractice: boolean;
    portfolio: boolean;
    unlimitedPortfolio: boolean;
    capstoneAiGrading: boolean;
    advancedAnalytics: boolean;
    priorityAi: boolean;
    earlyAccess: boolean;
  };
  portfolioLimit: number;
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 150,
    yearlyPrice: 1350,
    monthlyTokenLimit: 500,
    portfolioLimit: 3,
    features: [
      '500 AI tokens/month',
      'AI Learning Assistant',
      'Public learning paths',
      'Basic quiz participation',
      'Portfolio (up to 3 projects)',
    ],
    featureFlags: {
      aiAssistant: true,
      adaptiveProfile: false,
      learningPaths: true,
      customLearningPaths: false,
      quizPractice: true,
      unlimitedQuizPractice: false,
      portfolio: true,
      unlimitedPortfolio: false,
      capstoneAiGrading: false,
      advancedAnalytics: false,
      priorityAi: false,
      earlyAccess: false,
    },
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    monthlyPrice: 200,
    yearlyPrice: 1800,
    monthlyTokenLimit: 2000,
    portfolioLimit: 10,
    features: [
      '2,000 AI tokens/month',
      'Everything in Starter',
      'Adaptive learning profiles',
      'Unlimited quiz practice',
      'Portfolio (up to 10 projects)',
      'Priority AI responses',
    ],
    featureFlags: {
      aiAssistant: true,
      adaptiveProfile: true,
      learningPaths: true,
      customLearningPaths: false,
      quizPractice: true,
      unlimitedQuizPractice: true,
      portfolio: true,
      unlimitedPortfolio: false,
      capstoneAiGrading: false,
      advancedAnalytics: false,
      priorityAi: true,
      earlyAccess: false,
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 300,
    yearlyPrice: 2700,
    monthlyTokenLimit: 5000,
    portfolioLimit: 999,
    features: [
      '5,000 AI tokens/month',
      'Everything in Standard',
      'AI-powered capstone grading',
      'Advanced analytics & insights',
      'Unlimited portfolio projects',
      'Custom learning path generation',
      'Early access to new features',
    ],
    featureFlags: {
      aiAssistant: true,
      adaptiveProfile: true,
      learningPaths: true,
      customLearningPaths: true,
      quizPractice: true,
      unlimitedQuizPractice: true,
      portfolio: true,
      unlimitedPortfolio: true,
      capstoneAiGrading: true,
      advancedAnalytics: true,
      priorityAi: true,
      earlyAccess: true,
    },
  },
};

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

  const config = plan ? PLAN_CONFIGS[plan.plan_id] || PLAN_CONFIGS.starter : null;
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
