export type SchoolMembershipRole = 'admin' | 'teacher' | 'member';

const STUDENT_PLAN_LEVELS: Record<string, number> = {
  starter: 1,
  standard: 2,
  premium: 3,
};

const TEACHER_PLAN_LEVELS: Record<string, number> = {
  teacher_individual: 1,
  teacher_pro: 2,
  teacher_master: 3,
};

const ADMIN_PLAN_LEVELS: Record<string, number> = {
  school_starter: 1,
  school_growth: 2,
  school_enterprise: 3,
};

export const getMonthlyTokenLimitForPlan = (planId: string) => {
  const tokenLimits: Record<string, number> = {
    starter: 500,
    standard: 2000,
    premium: 5000,
  };

  return tokenLimits[planId] ?? 99999;
};

export const resolvePlanForSchoolMembership = (schoolPlanId: string, schoolRole: SchoolMembershipRole) => {
  const planMap: Record<string, Record<SchoolMembershipRole, { planId: string; monthlyTokenLimit: number }>> = {
    school_starter: {
      admin: { planId: 'school_starter', monthlyTokenLimit: 99999 },
      teacher: { planId: 'teacher_individual', monthlyTokenLimit: 99999 },
      member: { planId: 'starter', monthlyTokenLimit: 500 },
    },
    school_growth: {
      admin: { planId: 'school_growth', monthlyTokenLimit: 99999 },
      teacher: { planId: 'teacher_pro', monthlyTokenLimit: 99999 },
      member: { planId: 'standard', monthlyTokenLimit: 2000 },
    },
    school_enterprise: {
      admin: { planId: 'school_enterprise', monthlyTokenLimit: 99999 },
      teacher: { planId: 'teacher_master', monthlyTokenLimit: 99999 },
      member: { planId: 'premium', monthlyTokenLimit: 5000 },
    },
  };

  return planMap[schoolPlanId]?.[schoolRole] ?? null;
};

export const shouldUpgradePlan = (currentPlanId: string, targetPlanId: string, schoolRole: SchoolMembershipRole) => {
  if (currentPlanId === targetPlanId) return false;

  const rankMap = schoolRole === 'member'
    ? STUDENT_PLAN_LEVELS
    : schoolRole === 'teacher'
      ? TEACHER_PLAN_LEVELS
      : ADMIN_PLAN_LEVELS;

  const currentRank = rankMap[currentPlanId];
  const targetRank = rankMap[targetPlanId];

  if (!targetRank) return false;
  if (!currentRank) return true;

  return currentRank < targetRank;
};
