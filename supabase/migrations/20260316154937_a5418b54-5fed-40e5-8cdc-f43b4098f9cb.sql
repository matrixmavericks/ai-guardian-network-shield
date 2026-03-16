
-- 1. Create schools table first (no policies yet)
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  logo_url text,
  domain text,
  contact_email text,
  address text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create school_members table
CREATE TABLE public.school_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  school_role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, user_id)
);

-- 3. Create helper function
CREATE OR REPLACE FUNCTION public.is_school_member(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE user_id = _user_id AND school_id = _school_id
  )
$$;

-- 4. Create school_ai_settings table
CREATE TABLE public.school_ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE UNIQUE,
  allowed_ai_models text[] DEFAULT ARRAY['google/gemini-2.5-flash'],
  max_daily_prompts_per_student int DEFAULT 50,
  max_monthly_cost_usd numeric DEFAULT 20.00,
  blocked_keywords text[] DEFAULT '{}',
  process_mode_enabled boolean DEFAULT true,
  allow_student_chat boolean DEFAULT true,
  allow_capstone_ai_grading boolean DEFAULT true,
  allow_learning_path_generation boolean DEFAULT true,
  custom_system_prompt text DEFAULT '',
  custom_model_training_data_ids uuid[] DEFAULT '{}',
  grade_level_restrictions text[] DEFAULT '{}',
  subject_restrictions text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_ai_settings ENABLE ROW LEVEL SECURITY;

-- 6. Schools policies
CREATE POLICY "Admins can manage all schools" ON public.schools
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "School members can view their school" ON public.schools
  FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), id));

-- 7. School members policies
CREATE POLICY "Admins can manage all school members" ON public.school_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view own school members" ON public.school_members
  FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_members.school_id));

-- 8. School AI settings policies
CREATE POLICY "Admins can manage all school AI settings" ON public.school_ai_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "School members can view their school settings" ON public.school_ai_settings
  FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_ai_settings.school_id));

-- 9. Add school_id to classes
ALTER TABLE public.classes ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;

-- 10. Triggers
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_ai_settings_updated_at BEFORE UPDATE ON public.school_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
