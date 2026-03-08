
-- Drop all existing policies on classes and class_members
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can delete own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can view own classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view joined classes" ON public.classes;
DROP POLICY IF EXISTS "Anyone can view class by join code" ON public.classes;

DROP POLICY IF EXISTS "Students can join classes" ON public.class_members;
DROP POLICY IF EXISTS "Students can leave classes" ON public.class_members;
DROP POLICY IF EXISTS "Teachers can view class members" ON public.class_members;
DROP POLICY IF EXISTS "Students can view own memberships" ON public.class_members;
DROP POLICY IF EXISTS "Teachers can remove students" ON public.class_members;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_class_teacher(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = _class_id AND teacher_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_class_member(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_members
    WHERE class_id = _class_id AND student_id = _user_id
  )
$$;

-- Classes policies (no cross-table references)
CREATE POLICY "Teachers can create classes" ON public.classes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own classes" ON public.classes
  FOR UPDATE TO authenticated USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own classes" ON public.classes
  FOR DELETE TO authenticated USING (auth.uid() = teacher_id);

-- Allow all authenticated users to SELECT classes (needed for join code lookup + own classes)
CREATE POLICY "Authenticated users can view classes" ON public.classes
  FOR SELECT TO authenticated USING (true);

-- Class members policies (use security definer to check classes)
CREATE POLICY "Students can join classes" ON public.class_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can leave classes" ON public.class_members
  FOR DELETE TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view class members" ON public.class_members
  FOR SELECT TO authenticated USING (public.is_class_teacher(auth.uid(), class_id));

CREATE POLICY "Students can view own memberships" ON public.class_members
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "Teachers can remove students" ON public.class_members
  FOR DELETE TO authenticated USING (public.is_class_teacher(auth.uid(), class_id));
