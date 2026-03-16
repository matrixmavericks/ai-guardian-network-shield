-- Allow admins to update classes (e.g. assign school_id)
CREATE POLICY "Admins can update all classes"
ON public.classes
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage school_members (insert/delete/update/select)
-- The ALL policy exists but let's make sure insert specifically works
-- Check if there's a missing insert policy for school_members
-- The existing ALL policy should cover it, but let's add explicit ones for safety

-- Allow admins to insert school members explicitly
CREATE POLICY "Admins can insert school members"
ON public.school_members
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete school members
CREATE POLICY "Admins can delete school members"
ON public.school_members
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to select school members  
CREATE POLICY "Admins can select school members"
ON public.school_members
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));