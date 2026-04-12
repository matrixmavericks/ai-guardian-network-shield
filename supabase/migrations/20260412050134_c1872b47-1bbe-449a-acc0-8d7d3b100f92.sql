
-- Create user_plans table
CREATE TABLE public.user_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id TEXT NOT NULL DEFAULT 'starter',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  monthly_token_limit INTEGER NOT NULL DEFAULT 500,
  tokens_used_this_month INTEGER NOT NULL DEFAULT 0,
  token_reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  status TEXT NOT NULL DEFAULT 'active',
  assigned_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Only one active plan per user
CREATE UNIQUE INDEX idx_user_plans_active ON public.user_plans (user_id) WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Students can view their own plan
CREATE POLICY "Users can view own plan"
  ON public.user_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin can manage all plans
CREATE POLICY "Admin can manage all plans"
  ON public.user_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.email = 'info.aiconditioner@gmail.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.email = 'info.aiconditioner@gmail.com'
    )
  );

-- Teachers can view plans of their class students
CREATE POLICY "Teachers can view student plans"
  ON public.user_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = user_plans.user_id AND c.teacher_id = auth.uid()
    )
  );

-- Users can update their own plan (for upgrade requests)
CREATE POLICY "Users can update own plan"
  ON public.user_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert own plan
CREATE POLICY "Users can insert own plan"
  ON public.user_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_plans_updated_at
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
