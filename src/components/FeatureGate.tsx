import React from 'react';
import { useStudentPlan, PLAN_CONFIGS, type PlanConfig } from '@/hooks/useStudentPlan';
import { Lock, Sparkles, Zap, Crown, ArrowUpRight, Star, Rocket, TrendingUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface FeatureGateProps {
  feature: keyof PlanConfig['featureFlags'];
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  className?: string;
  /** compact = smaller inline badge, full = big overlay (default) */
  variant?: 'full' | 'compact';
}

const featureInfo: Record<string, {
  title: string;
  description: string;
  minPlan: string;
  icon: React.ReactNode;
  benefit: string;
  stats?: string;
}> = {
  aiAssistant: {
    title: 'AI Learning Assistant',
    description: 'Get personalized AI tutoring across all subjects with intelligent, context-aware responses that adapt to your learning style.',
    minPlan: 'starter',
    icon: <Sparkles className="h-8 w-8" />,
    benefit: 'Students using AI tutoring score 40% higher on average',
    stats: '10,000+ questions answered',
  },
  adaptiveProfile: {
    title: 'Adaptive Learning Profile',
    description: 'Our AI analyzes your strengths, weaknesses, and learning patterns to build a study strategy that\'s uniquely yours.',
    minPlan: 'standard',
    icon: <TrendingUp className="h-8 w-8" />,
    benefit: 'Personalized insights that help you study smarter, not harder',
    stats: '2x faster improvement',
  },
  learningPaths: {
    title: 'Learning Paths',
    description: 'Follow structured, expert-curated courses with interactive modules, quizzes, and real-world projects.',
    minPlan: 'starter',
    icon: <Rocket className="h-8 w-8" />,
    benefit: 'Structured learning leads to 3x better retention',
  },
  customLearningPaths: {
    title: 'Custom AI Learning Paths',
    description: 'Tell the AI what you want to learn and it creates a complete, personalized curriculum — with modules, quizzes, and resources — in seconds.',
    minPlan: 'premium',
    icon: <Crown className="h-8 w-8" />,
    benefit: 'Your own AI-generated curriculum, tailored to your exact goals',
    stats: 'Unique to Premium',
  },
  quizPractice: {
    title: 'Quiz Practice',
    description: 'Test your knowledge with interactive quizzes and track your performance over time.',
    minPlan: 'starter',
    icon: <Star className="h-8 w-8" />,
    benefit: 'Active recall boosts long-term memory by 150%',
  },
  unlimitedQuizPractice: {
    title: 'Unlimited Quiz Practice',
    description: 'No limits — retake any quiz as many times as you need. Practice makes perfect, and we mean it.',
    minPlan: 'standard',
    icon: <Zap className="h-8 w-8" />,
    benefit: 'Top students retake quizzes 3-5 times on average',
  },
  portfolio: {
    title: 'Student Portfolio',
    description: 'Showcase your best work in a beautiful, shareable portfolio that impresses teachers and future employers.',
    minPlan: 'starter',
    icon: <Shield className="h-8 w-8" />,
    benefit: 'Build your academic brand',
  },
  unlimitedPortfolio: {
    title: 'Unlimited Portfolio Projects',
    description: 'No project limits — add unlimited entries, media, and collaborators. Build an impressive body of work.',
    minPlan: 'premium',
    icon: <Crown className="h-8 w-8" />,
    benefit: 'Premium students showcase 5x more projects',
  },
  capstoneAiGrading: {
    title: 'AI Capstone Grading',
    description: 'Get instant, detailed AI feedback on your capstone projects with specific, actionable improvement suggestions — before your teacher even sees it.',
    minPlan: 'premium',
    icon: <Crown className="h-8 w-8" />,
    benefit: 'Students who use AI feedback score 25% higher on final submissions',
    stats: 'Instant feedback',
  },
  advancedAnalytics: {
    title: 'Advanced Analytics & Insights',
    description: 'Deep-dive into your learning patterns with AI-powered analytics, trend forecasts, and personalized study recommendations.',
    minPlan: 'premium',
    icon: <TrendingUp className="h-8 w-8" />,
    benefit: 'Know exactly where to focus your study time',
    stats: 'Data-driven learning',
  },
  priorityAi: {
    title: 'Priority AI Responses',
    description: 'Skip the queue — get faster, higher-quality AI responses with dedicated processing power.',
    minPlan: 'standard',
    icon: <Zap className="h-8 w-8" />,
    benefit: '3x faster response times during peak hours',
  },
  earlyAccess: {
    title: 'Early Access to New Features',
    description: 'Be the first to try cutting-edge features before anyone else. Shape the future of learning.',
    minPlan: 'premium',
    icon: <Rocket className="h-8 w-8" />,
    benefit: 'Be ahead of the curve',
  },
};

const planGradients: Record<string, { bg: string; border: string; glow: string; text: string; badge: string }> = {
  starter: {
    bg: 'from-blue-500/10 via-cyan-500/5 to-blue-600/10',
    border: 'border-blue-300/40',
    glow: 'shadow-blue-500/20',
    text: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  standard: {
    bg: 'from-purple-500/10 via-violet-500/5 to-purple-600/10',
    border: 'border-purple-300/40',
    glow: 'shadow-purple-500/20',
    text: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  premium: {
    bg: 'from-amber-500/10 via-orange-500/5 to-amber-600/10',
    border: 'border-amber-300/40',
    glow: 'shadow-amber-500/20',
    text: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
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
  variant = 'full',
}) => {
  const { hasFeature, plan, isLoading } = useStudentPlan();
  const navigate = useNavigate();

  if (isLoading) return <>{children}</>;

  if (!plan || !hasFeature(feature)) {
    const info: { title: string; description: string; minPlan: string; icon: React.ReactNode; benefit: string; stats?: string } = featureInfo[feature] || {
      title: fallbackTitle || 'Premium Feature',
      description: fallbackDescription || 'Upgrade your plan to unlock this feature.',
      minPlan: 'standard',
      icon: <Lock className="h-8 w-8" />,
      benefit: 'Unlock powerful features',
    };

    const colors = planGradients[info.minPlan] || planGradients.standard;
    const planConfig = PLAN_CONFIGS[info.minPlan];

    if (variant === 'compact') {
      return (
        <div className={cn(
          "relative rounded-xl border p-4 cursor-pointer group transition-all duration-300 hover:shadow-lg",
          colors.border, colors.glow,
          "bg-gradient-to-br", colors.bg,
          className
        )}
          onClick={() => navigate('/student-dashboard?tab=myplan')}
        >
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br", colors.bg, colors.text)}>
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{info.title}</p>
              <p className="text-xs text-muted-foreground truncate">{info.benefit}</p>
            </div>
            <Badge className={cn("shrink-0 text-[10px] border", colors.badge)}>
              {planIcons[info.minPlan]} {planConfig?.name}
            </Badge>
          </div>
        </div>
      );
    }

    return (
      <div className={cn(
        "relative rounded-2xl overflow-hidden animate-fade-in",
        className
      )}>
        {/* Blurred ghost content behind */}
        <div className="blur-[6px] opacity-[0.08] pointer-events-none select-none min-h-[350px]" aria-hidden>
          {children}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          {/* Background gradient */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-80",
            "from-background via-background/95 to-background/90"
          )} />

          {/* Decorative circles */}
          <div className={cn("absolute top-10 right-10 w-64 h-64 rounded-full blur-3xl opacity-20 bg-gradient-to-br", colors.bg)} />
          <div className={cn("absolute bottom-10 left-10 w-48 h-48 rounded-full blur-3xl opacity-15 bg-gradient-to-tr", colors.bg)} />

          {/* Content card */}
          <div className={cn(
            "relative z-20 max-w-lg w-full mx-6",
            "rounded-2xl border-2 p-8",
            "bg-gradient-to-br from-card/95 via-card to-card/90",
            "backdrop-blur-xl shadow-2xl",
            colors.border, colors.glow,
            "animate-scale-in"
          )}>
            {/* Floating icon */}
            <div className={cn(
              "mx-auto mb-6 h-20 w-20 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br shadow-xl",
              colors.bg, colors.glow, colors.text
            )}>
              {info.icon}
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-center mb-2 tracking-tight">{info.title}</h3>

            {/* Plan badge */}
            <div className="flex justify-center mb-4">
              <span className={cn(
                "inline-flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-full border shadow-sm",
                colors.badge
              )}>
                {planIcons[info.minPlan]}
                {planConfig?.name || 'Standard'} Plan & above
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground text-center mb-5 leading-relaxed max-w-sm mx-auto">
              {info.description}
            </p>

            {/* Benefit callout */}
            <div className={cn(
              "rounded-xl p-3 mb-6 flex items-center gap-3",
              "bg-gradient-to-r border",
              colors.bg, colors.border
            )}>
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", colors.text, "bg-background/80")}>
                <Star className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold">{info.benefit}</p>
                {info.stats && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{info.stats}</p>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={() => navigate('/student-dashboard?tab=myplan')}
                className={cn(
                  "w-full gap-2 font-semibold text-base h-12",
                  "shadow-lg hover:shadow-xl transition-all duration-300 hover-scale",
                  "bg-gradient-to-r from-primary to-primary/90"
                )}
              >
                <ArrowUpRight className="h-5 w-5" />
                Upgrade to {planConfig?.name || 'Standard'}
              </Button>
              {planConfig && (
                <p className="text-xs text-muted-foreground">
                  Starting at just <span className="font-bold text-foreground">₹{planConfig.monthlyPrice}/month</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default FeatureGate;
