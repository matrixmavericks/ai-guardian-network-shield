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
export interface AdminPlanConfig {
  id: string;
  name: string;
  baseMonthlyPrice: number;
  baseYearlyPrice: number;
  includedTeachers: number;
  includedStudents: number;
  perExtraTeacherMonthly: number;
  perExtraStudentMonthly: number;
  features: string[];
  volumeDiscounts: { minStudents: number; discount: number; label: string }[];
}

export const ADMIN_PLANS: Record<string, AdminPlanConfig> = {
  school_starter: {
    id: 'school_starter',
    name: 'School Starter',
    baseMonthlyPrice: 3000,
    baseYearlyPrice: 27000,
    includedTeachers: 5,
    includedStudents: 50,
    perExtraTeacherMonthly: 300,
    perExtraStudentMonthly: 80,
    features: [
      '5 teacher accounts included',
      '50 student accounts included',
      'School dashboard & branding',
      'Centralized class management',
      'Basic AI configuration',
      'Usage analytics & reporting',
    ],
    volumeDiscounts: [
      { minStudents: 100, discount: 10, label: '10% off' },
      { minStudents: 250, discount: 20, label: '20% off' },
      { minStudents: 500, discount: 30, label: '30% off' },
    ],
  },
  school_growth: {
    id: 'school_growth',
    name: 'School Growth',
    baseMonthlyPrice: 8000,
    baseYearlyPrice: 72000,
    includedTeachers: 15,
    includedStudents: 200,
    perExtraTeacherMonthly: 250,
    perExtraStudentMonthly: 60,
    features: [
      '15 teacher accounts included',
      '200 student accounts included',
      'Everything in Starter',
      'Advanced AI controls & content filtering',
      'Custom grading systems',
      'Parent portal access',
      'Priority support',
    ],
    volumeDiscounts: [
      { minStudents: 300, discount: 15, label: '15% off' },
      { minStudents: 500, discount: 25, label: '25% off' },
      { minStudents: 1000, discount: 35, label: '35% off' },
    ],
  },
  school_enterprise: {
    id: 'school_enterprise',
    name: 'School Enterprise',
    baseMonthlyPrice: 15000,
    baseYearlyPrice: 135000,
    includedTeachers: 50,
    includedStudents: 500,
    perExtraTeacherMonthly: 200,
    perExtraStudentMonthly: 40,
    features: [
      '50 teacher accounts included',
      '500 student accounts included',
      'Everything in Growth',
      'Custom AI model training',
      'Multi-campus support',
      'API access & LMS integration',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    volumeDiscounts: [
      { minStudents: 750, discount: 20, label: '20% off' },
      { minStudents: 1500, discount: 35, label: '35% off' },
      { minStudents: 3000, discount: 45, label: '45% off' },
    ],
  },
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
  // Admin
  school_starter_monthly: 'School Starter – ₹3,000/mo',
  school_starter_yearly: 'School Starter – ₹27,000/yr',
  school_growth_monthly: 'School Growth – ₹8,000/mo',
  school_growth_yearly: 'School Growth – ₹72,000/yr',
  school_enterprise_monthly: 'School Enterprise – ₹15,000/mo',
  school_enterprise_yearly: 'School Enterprise – ₹1,35,000/yr',
};
