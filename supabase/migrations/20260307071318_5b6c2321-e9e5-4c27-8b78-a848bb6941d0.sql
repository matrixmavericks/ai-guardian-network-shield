
-- Drop old insert policy that only allows teachers/admins
DROP POLICY IF EXISTS "Teachers and admins can create learning paths" ON public.learning_paths;

-- New insert policy: any authenticated user can create their own learning paths
CREATE POLICY "Authenticated users can create own learning paths"
ON public.learning_paths
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);
