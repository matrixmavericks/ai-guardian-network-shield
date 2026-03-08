
-- Track AI usage per request with token counts and estimated USD cost
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Teachers can view usage for their class students
CREATE POLICY "Teachers can view student usage"
  ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'teacher'::app_role)
    AND EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = ai_usage_logs.user_id AND c.teacher_id = auth.uid()
    )
  );

-- Users can view own usage
CREATE POLICY "Users can view own usage"
  ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all usage
CREATE POLICY "Admins can view all usage"
  ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System insert (service role from edge function)
CREATE POLICY "System can insert usage logs"
  ON public.ai_usage_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- AI usage quotas set by teachers per student (monthly USD limit)
CREATE TABLE public.ai_usage_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  monthly_limit_usd numeric(10,2) NOT NULL DEFAULT 5.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, teacher_id)
);

ALTER TABLE public.ai_usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage quotas for their students"
  ON public.ai_usage_quotas FOR ALL TO authenticated
  USING (
    auth.uid() = teacher_id
    AND EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = ai_usage_quotas.student_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = teacher_id
    AND EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = ai_usage_quotas.student_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own quotas"
  ON public.ai_usage_quotas FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all quotas"
  ON public.ai_usage_quotas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
