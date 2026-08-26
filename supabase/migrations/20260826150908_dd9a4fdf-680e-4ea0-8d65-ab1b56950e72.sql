CREATE TABLE public.primary_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  grade_band TEXT,
  raw_note TEXT NOT NULL,
  refined_evidence TEXT,
  learner_profile TEXT[] DEFAULT '{}',
  next_step TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.primary_observations TO authenticated;
GRANT ALL ON public.primary_observations TO service_role;
ALTER TABLE public.primary_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own observations" ON public.primary_observations
  FOR ALL TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE INDEX idx_primary_observations_teacher ON public.primary_observations(teacher_id, created_at DESC);

CREATE TABLE public.primary_week_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  grade_band TEXT,
  unit_theme TEXT,
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.primary_week_plans TO authenticated;
GRANT ALL ON public.primary_week_plans TO service_role;
ALTER TABLE public.primary_week_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own week plans" ON public.primary_week_plans
  FOR ALL TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE INDEX idx_primary_week_plans_teacher ON public.primary_week_plans(teacher_id, created_at DESC);