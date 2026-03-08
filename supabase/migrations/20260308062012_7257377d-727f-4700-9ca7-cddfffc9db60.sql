
CREATE TABLE public.class_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TIMESTAMP WITH TIME ZONE,
  subject TEXT DEFAULT 'General',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own assignments
CREATE POLICY "Teachers can create assignments" ON public.class_assignments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own assignments" ON public.class_assignments
  FOR UPDATE TO authenticated USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own assignments" ON public.class_assignments
  FOR DELETE TO authenticated USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view own assignments" ON public.class_assignments
  FOR SELECT TO authenticated USING (auth.uid() = teacher_id);

-- Students can view assignments for classes they belong to
CREATE POLICY "Students can view class assignments" ON public.class_assignments
  FOR SELECT TO authenticated USING (
    public.is_class_member(auth.uid(), class_id)
  );
