-- Allow teachers to insert teacher roles for other users
CREATE POLICY "Teachers can promote users to teacher"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'teacher'::app_role)
    AND role = 'teacher'::app_role
  );

-- Allow teachers to view all roles (needed for UserManagement)
CREATE POLICY "Teachers can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role));