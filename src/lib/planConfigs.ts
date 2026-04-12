import { Sparkles, Zap, Crown, GraduationCap, School, Building2 } from 'lucide-react';

// ─── Student Plans ───
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

export const STUDENT_PLANS: Record<string, PlanConfig> = {
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
      aiAssistant: true, adaptiveProfile: false, learningPaths: true,
      customLearningPaths: false, quizPractice: true, unlimitedQuizPractice: false,
      portfolio: true, unlimitedPortfolio: false, capstoneAiGrading: false,
      advancedAnalytics: false, priorityAi: false, earlyAccess: false,
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
      aiAssistant: true, adaptiveProfile: true, learningPaths: true,
      customLearningPaths: false, quizPractice: true, unlimitedQuizPractice: true,
      portfolio: true, unlimitedPortfolio: false, capstoneAiGrading: false,
      advancedAnalytics: false, priorityAi: true, earlyAccess: false,
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
      aiAssistant: true, adaptiveProfile: true, learningPaths: true,
      customLearningPaths: true, quizPractice: true, unlimitedQuizPractice: true,
      portfolio: true, unlimitedPortfolio: true, capstoneAiGrading: true,
      advancedAnalytics: true, priorityAi: true, earlyAccess: true,
    },
  },
};

// ─── Teacher Plans ───
export interface TeacherPlanConfig {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  maxClasses: number;
  maxStudentsPerClass: number;
  aiFeatures: string[];
}

export const TEACHER_PLANS: Record<string, TeacherPlanConfig> = {
  teacher_individual: {
    id: 'teacher_individual',
    name: 'Individual Teacher',
    monthlyPrice: 500,
    yearlyPrice: 4500,
    maxClasses: 3,
    maxStudentsPerClass: 30,
    features: [
      'Up to 3 classes',
      '30 students per class',
      'AI teaching plan generator',
      'Assignment & grading tools',
      'Class resource management',
      'Basic quiz creation',
      'Student progress tracking',
    ],
    aiFeatures: ['Teaching plan generation', 'Basic analytics'],
  },
  teacher_pro: {
    id: 'teacher_pro',
    name: 'Pro Teacher',
    monthlyPrice: 800,
    yearlyPrice: 7200,
    maxClasses: 10,
    maxStudentsPerClass: 50,
    features: [
      'Up to 10 classes',
      '50 students per class',
      'Everything in Individual',
      'AI-powered live quizzes',
      'Capstone & portfolio review',
      'Advanced analytics dashboard',
      'AI syllabus analysis',
      'Priority support',
    ],
    aiFeatures: ['Live quiz generation', 'Syllabus analysis', 'Advanced analytics'],
  },
  teacher_master: {
    id: 'teacher_master',
    name: 'Master Teacher',
    monthlyPrice: 1200,
    yearlyPrice: 10800,
    maxClasses: 999,
    maxStudentsPerClass: 100,
    features: [
      'Unlimited classes',
      '100 students per class',
      'Everything in Pro',
      'Custom model training',
      'AI risk analysis for students',
      'Learning path creation & assignment',
      'Curriculum integration',
      'White-label reporting',
    ],
    aiFeatures: ['Custom model training', 'Risk analysis', 'Full curriculum tools'],
  },
};

// ─── School Admin Plans ───
// Pure per-seat pricing — no bundled counts. Teachers & students are fully customizable.
export interface AdminPlanConfig {
  id: string;
  name: string;
  platformFeeMonthly: number; // base platform access fee
  platformFeeYearly: number;
  perTeacherMonthly: number;
  perStudentMonthly: number;
  features: string[];
  teacherDiscounts: { min: number; discount: number }[];
  studentDiscounts: { min: number; discount: number }[];
}

export const ADMIN_PLANS: Record<string, AdminPlanConfig> = {
  school_starter: {
    id: 'school_starter',
    name: 'Starter',
    platformFeeMonthly: 1000,
    platformFeeYearly: 9000,
    perTeacherMonthly: 350,
    perStudentMonthly: 100,
    features: [
      'School dashboard & branding',
      'Centralized class management',
      'Basic AI configuration',
      'Usage analytics & reporting',
      'Email support',
    ],
    teacherDiscounts: [
      { min: 5, discount: 5 },
      { min: 10, discount: 10 },
      { min: 20, discount: 15 },
    ],
    studentDiscounts: [
      { min: 50, discount: 5 },
      { min: 100, discount: 10 },
      { min: 250, discount: 15 },
      { min: 500, discount: 25 },
    ],
  },
  school_growth: {
    id: 'school_growth',
    name: 'Growth',
    platformFeeMonthly: 2500,
    platformFeeYearly: 22500,
    perTeacherMonthly: 300,
    perStudentMonthly: 80,
    features: [
      'Everything in Starter',
      'Advanced AI controls & content filtering',
      'Custom grading systems',
      'Parent portal access',
      'Priority support',
      'Live quiz & assessment tools',
    ],
    teacherDiscounts: [
      { min: 5, discount: 8 },
      { min: 15, discount: 15 },
      { min: 30, discount: 22 },
    ],
    studentDiscounts: [
      { min: 100, discount: 10 },
      { min: 300, discount: 20 },
      { min: 500, discount: 30 },
      { min: 1000, discount: 40 },
    ],
  },
  school_enterprise: {
    id: 'school_enterprise',
    name: 'Enterprise',
    platformFeeMonthly: 5000,
    platformFeeYearly: 45000,
    perTeacherMonthly: 250,
    perStudentMonthly: 60,
    features: [
      'Everything in Growth',
      'Custom AI model training',
      'Multi-campus support',
      'API access & LMS integration',
      'Dedicated account manager',
      'SLA guarantee',
      'White-label options',
    ],
    teacherDiscounts: [
      { min: 10, discount: 10 },
      { min: 25, discount: 20 },
      { min: 50, discount: 30 },
    ],
    studentDiscounts: [
      { min: 200, discount: 15 },
      { min: 500, discount: 25 },
      { min: 1000, discount: 35 },
      { min: 2000, discount: 45 },
    ],
  },
};

// Helper: get volume discount for a count
export const getVolumeDiscount = (
  discounts: { min: number; discount: number }[],
  count: number
): number => {
  let best = 0;
  for (const d of discounts) {
    if (count >= d.min && d.discount > best) best = d.discount;
  }
  return best;
};

// Helper: calculate admin plan total monthly cost
export const calcAdminMonthlyCost = (
  planId: string,
  teacherCount: number,
  studentCount: number,
  yearly: boolean
): { platform: number; teacherCost: number; studentCost: number; teacherDiscount: number; studentDiscount: number; total: number } => {
  const plan = ADMIN_PLANS[planId];
  if (!plan) return { platform: 0, teacherCost: 0, studentCost: 0, teacherDiscount: 0, studentDiscount: 0, total: 0 };

  const platform = yearly ? Math.round(plan.platformFeeYearly / 12) : plan.platformFeeMonthly;
  const tDisc = getVolumeDiscount(plan.teacherDiscounts, teacherCount);
  const sDisc = getVolumeDiscount(plan.studentDiscounts, studentCount);

  const tRate = plan.perTeacherMonthly * (1 - tDisc / 100);
  const sRate = plan.perStudentMonthly * (1 - sDisc / 100);

  const teacherCost = Math.round(tRate * teacherCount);
  const studentCost = Math.round(sRate * studentCount);
  const total = platform + teacherCost + studentCost;

  return { platform, teacherCost, studentCost, teacherDiscount: tDisc, studentDiscount: sDisc, total };
};

// Backward compat
export const PLAN_CONFIGS = STUDENT_PLANS;

export const ALL_PLAN_LABELS: Record<string, string> = {
  // Student
  starter_monthly: 'Starter – ₹150/mo',
  starter_yearly: 'Starter – ₹1,350/yr',
  standard_monthly: 'Standard – ₹200/mo',
  standard_yearly: 'Standard – ₹1,800/yr',
  premium_monthly: 'Premium – ₹300/mo',
  premium_yearly: 'Premium – ₹2,700/yr',
  // Teacher
  teacher_individual_monthly: 'Individual Teacher – ₹500/mo',
  teacher_individual_yearly: 'Individual Teacher – ₹4,500/yr',
  teacher_pro_monthly: 'Pro Teacher – ₹800/mo',
  teacher_pro_yearly: 'Pro Teacher – ₹7,200/yr',
  teacher_master_monthly: 'Master Teacher – ₹1,200/mo',
  teacher_master_yearly: 'Master Teacher – ₹10,800/yr',
  // Admin (dynamic, label generated at runtime)
  school_starter_monthly: 'School Starter (custom)',
  school_starter_yearly: 'School Starter (custom)',
  school_growth_monthly: 'School Growth (custom)',
  school_growth_yearly: 'School Growth (custom)',
  school_enterprise_monthly: 'School Enterprise (custom)',
  school_enterprise_yearly: 'School Enterprise (custom)',
};
