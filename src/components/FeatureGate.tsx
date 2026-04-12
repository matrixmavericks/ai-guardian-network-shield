import React from 'react';
import { useStudentPlan, PLAN_CONFIGS, type PlanConfig } from '@/hooks/useStudentPlan';
import { Lock, Sparkles, Zap, Crown, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface FeatureGateProps {
  feature: keyof PlanConfig['featureFlags'];
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  className?: string;
}

const featureInfo: Record<string, { title: string; description: string; minPlan: string }> = {
  aiAssistant: {
    title: 'AI Learning Assistant',
    description: 'Get personalized AI tutoring across all subjects with intelligent, context-aware responses.',
    minPlan: 'starter',
  },
  adaptiveProfile: {
    title: 'Adaptive Learning Profile',
    description: 'AI analyzes your strengths, weaknesses, and learning style to create a personalized study strategy just for you.',
    minPlan: 'standard',
  },
  learningPaths: {
    title: 'Learning Paths',
    description: 'Follow structured, expert-curated courses with interactive modules and quizzes.',
    minPlan: 'starter',
  },
  customLearningPaths: {
    title: 'Custom Learning Paths',
    description: 'Generate AI-powered learning paths tailored to your exact goals and curriculum needs.',
    minPlan: 'premium',
  },
  quizPractice: {
    title: 'Quiz Practice',
    description: 'Test your knowledge with live quizzes and track your performance over time.',
    minPlan: 'starter',
  },
  unlimitedQuizPractice: {
    title: 'Unlimited Quiz Practice',
    description: 'Practice without limits — retake quizzes as many times as you need to master every topic.',
    minPlan: 'standard',
  },
  portfolio: {
    title: 'Student Portfolio',
    description: 'Showcase your best work in a beautiful, shareable portfolio.',
    minPlan: 'starter',
  },
  unlimitedPortfolio: {
    title: 'Unlimited Portfolio Projects',
    description: 'No project limits — build an impressive portfolio with unlimited entries and media.',
    minPlan: 'premium',
  },
  capstoneAiGrading: {
    title: 'AI Capstone Grading',
    description: 'Get instant, detailed AI feedback on your capstone projects with actionable improvement suggestions.',
    minPlan: 'premium',
  },
  advancedAnalytics: {
    title: 'Advanced Analytics & Insights',
    description: 'Deep-dive into your learning patterns with AI-powered analytics, trend forecasts, and personalized recommendations.',
    minPlan: 'premium',
  },
  priorityAi: {
    title: 'Priority AI Responses',
    description: 'Skip the queue — get faster, higher-quality AI responses with priority processing.',
    minPlan: 'standard',
  },
  earlyAccess: {
    title: 'Early Access to New Features',
    description: 'Be the first to try cutting-edge features before anyone else.',
    minPlan: 'premium',
  },
};

const planBadgeColors: Record<string, string> = {
  starter: 'bg-blue-100 text-blue-700 border-blue-200',
  standard: 'bg-purple-100 text-purple-700 border-purple-200',
  premium: 'bg-amber-100 text-amber-700 border-amber-200',
};

const planIcons: Record<string, React.ReactNode> = {
  starter: <Sparkles className="h-4 w-4" />,
  standard: <Zap className="h-4 w-4" />,
  premium: <Crown className="h-4 w-4" />,
};

const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallbackTitle,
  fallbackDescription,
  className,
}) => {
  const { hasFeature, plan, isLoading } = useStudentPlan();
  const navigate = useNavigate();

  if (isLoading) return <>{children}</>;

  // No plan = no access
  if (!plan || !hasFeature(feature)) {
    const info = featureInfo[feature] || {
      title: fallbackTitle || 'Premium Feature',
      description: fallbackDescription || 'Upgrade your plan to unlock this feature.',
      minPlan: 'standard',
    };

    return (
      <div className={cn(
        "relative rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-muted/30 via-background to-muted/50 overflow-hidden",
        className
      )}>
        {/* Blurred preview hint */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center max-w-md px-6 py-8">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">{info.title}</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{info.description}</p>
            <div className="flex items-center justify-center gap-2 mb-5">
              <span className={cn(
                "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border",
                planBadgeColors[info.minPlan]
              )}>
                {planIcons[info.minPlan]}
                Available on {PLAN_CONFIGS[info.minPlan]?.name || 'Standard'} & above
              </span>
            </div>
            <Button
              onClick={() => navigate('/student-dashboard?tab=myplan')}
              className="gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
            >
              <ArrowUpRight className="h-4 w-4" />
              View Upgrade Options
            </Button>
          </div>
        </div>

        {/* Ghost content placeholder */}
        <div className="opacity-[0.04] pointer-events-none select-none p-8 min-h-[300px]" aria-hidden>
          {children}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default FeatureGate;
