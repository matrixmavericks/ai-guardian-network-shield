
-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'General',
  description TEXT DEFAULT '',
  join_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  teacher_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class_members table
CREATE TABLE public.class_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Classes policies
CREATE POLICY "Teachers can create classes" ON public.classes FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update own classes" ON public.classes FOR UPDATE TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own classes" ON public.classes FOR DELETE TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can view own classes" ON public.classes FOR SELECT TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Students can view joined classes" ON public.classes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.class_members WHERE class_members.class_id = classes.id AND class_members.student_id = auth.uid())
);
CREATE POLICY "Anyone can view class by join code" ON public.classes FOR SELECT TO authenticated USING (true);

-- Class members policies
CREATE POLICY "Students can join classes" ON public.class_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can leave classes" ON public.class_members FOR DELETE TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Teachers can view class members" ON public.class_members FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.classes WHERE classes.id = class_members.class_id AND classes.teacher_id = auth.uid())
);
CREATE POLICY "Students can view own memberships" ON public.class_members FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Teachers can remove students" ON public.class_members FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.classes WHERE classes.id = class_members.class_id AND classes.teacher_id = auth.uid())
);
