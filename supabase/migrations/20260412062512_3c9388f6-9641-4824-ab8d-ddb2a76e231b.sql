
-- Drop and recreate the startup role policy to include 'admin'
DROP POLICY IF EXISTS "Users can insert their own startup role" ON public.user_roles;

CREATE POLICY "Users can insert their own startup role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('student'::app_role, 'teacher'::app_role, 'parent'::app_role, 'admin'::app_role)
);
