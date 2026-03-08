-- Allow teachers to assign and view learning paths for students in their own classes
CREATE POLICY "Teachers can assign paths to class students"
ON public.learning_path_progress
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE cm.student_id = learning_path_progress.user_id
      AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view paths for class students"
ON public.learning_path_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE cm.student_id = learning_path_progress.user_id
      AND c.teacher_id = auth.uid()
  )
);