-- Allow public read access to schools table for portal pages
CREATE POLICY "Anyone can view schools with a subdomain"
ON public.schools
FOR SELECT
TO anon, authenticated
USING (subdomain IS NOT NULL);
