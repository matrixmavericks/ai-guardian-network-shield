-- Add email column to profiles table so teachers can see it
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Allow teachers to delete roles (for removing student tag when promoting)
CREATE POLICY "Teachers can remove student role"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'teacher'::app_role)
    AND role IN ('student'::app_role, 'parent'::app_role)
  );