
-- 1) Add visibility + school_id to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- visibility values: 'public' | 'school' | 'class'
-- 'public'   = anyone authenticated (default for seeded official courses)
-- 'school'   = only members of school_id
-- 'class'    = only students in classes that link this course (via class_courses)

-- 2) class_courses: many-to-many link between classes and courses
CREATE TABLE IF NOT EXISTS public.class_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  added_by UUID NOT NULL,
  auto_enroll BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, course_id)
);

ALTER TABLE public.class_courses ENABLE ROW LEVEL SECURITY;

-- Teachers manage their class's course links
CREATE POLICY "Teachers manage class courses"
  ON public.class_courses FOR ALL TO authenticated
  USING (public.is_class_teacher(auth.uid(), class_id))
  WITH CHECK (public.is_class_teacher(auth.uid(), class_id));

-- Class members (students) can view course links for their classes
CREATE POLICY "Class members view class courses"
  ON public.class_courses FOR SELECT TO authenticated
  USING (public.is_class_member(auth.uid(), class_id) OR public.is_class_teacher(auth.uid(), class_id));

-- School admins manage class_courses for classes within their school
CREATE POLICY "School admins manage class courses"
  ON public.class_courses FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_courses.class_id
        AND c.school_id IS NOT NULL
        AND public.is_school_member(auth.uid(), c.school_id)
        AND EXISTS (
          SELECT 1 FROM public.school_members sm
          WHERE sm.user_id = auth.uid() AND sm.school_id = c.school_id
            AND sm.school_role IN ('admin','owner')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_courses.class_id
        AND c.school_id IS NOT NULL
        AND public.is_school_member(auth.uid(), c.school_id)
        AND EXISTS (
          SELECT 1 FROM public.school_members sm
          WHERE sm.user_id = auth.uid() AND sm.school_id = c.school_id
            AND sm.school_role IN ('admin','owner')
        )
    )
  );

-- 3) Update courses SELECT policy so 'school' visibility works
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
CREATE POLICY "View courses by visibility"
  ON public.courses FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR (visibility = 'school' AND school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
    OR (visibility = 'class' AND EXISTS (
        SELECT 1 FROM public.class_courses cc
        JOIN public.class_members cm ON cm.class_id = cc.class_id
        WHERE cc.course_id = courses.id AND cm.student_id = auth.uid()
      ))
    OR (visibility = 'class' AND EXISTS (
        SELECT 1 FROM public.class_courses cc
        JOIN public.classes c ON c.id = cc.class_id
        WHERE cc.course_id = courses.id AND c.teacher_id = auth.uid()
      ))
    OR auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 4) Allow school admins to manage student_courses (for bulk enrollment)
CREATE POLICY "School admins manage school student enrollments"
  ON public.student_courses FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.school_members sm_student
      JOIN public.school_members sm_admin
        ON sm_admin.school_id = sm_student.school_id
      WHERE sm_student.user_id = student_courses.user_id
        AND sm_admin.user_id = auth.uid()
        AND sm_admin.school_role IN ('admin','owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.school_members sm_student
      JOIN public.school_members sm_admin
        ON sm_admin.school_id = sm_student.school_id
      WHERE sm_student.user_id = student_courses.user_id
        AND sm_admin.user_id = auth.uid()
        AND sm_admin.school_role IN ('admin','owner')
    )
  );

-- 5) Allow teachers to enroll their class students into linked courses
CREATE POLICY "Teachers enroll their class students"
  ON public.student_courses FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.student_id = student_courses.user_id
        AND c.teacher_id = auth.uid()
    )
  );

-- 6) Allow school admins to add students into classes within their school
CREATE POLICY "School admins manage class membership"
  ON public.class_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.school_members sm
        ON sm.school_id = c.school_id
      WHERE c.id = class_members.class_id
        AND c.school_id IS NOT NULL
        AND sm.user_id = auth.uid()
        AND sm.school_role IN ('admin','owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.school_members sm
        ON sm.school_id = c.school_id
      WHERE c.id = class_members.class_id
        AND c.school_id IS NOT NULL
        AND sm.user_id = auth.uid()
        AND sm.school_role IN ('admin','owner')
    )
  );

-- 7) Helper: school_id of a class (for quick lookups)
CREATE INDEX IF NOT EXISTS idx_class_courses_class ON public.class_courses(class_id);
CREATE INDEX IF NOT EXISTS idx_class_courses_course ON public.class_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_school ON public.courses(school_id);
CREATE INDEX IF NOT EXISTS idx_courses_visibility ON public.courses(visibility);
