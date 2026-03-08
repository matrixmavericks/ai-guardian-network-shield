-- Allow students to view learning paths specifically assigned to them,
-- including non-public paths created by teachers.
CREATE POLICY "Users can view assigned learning paths"
ON public.learning_paths
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.learning_path_progress lpp
    WHERE lpp.path_id = learning_paths.id
      AND lpp.user_id = auth.uid()
  )
);