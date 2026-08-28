ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS grade_level text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS grade_level text;

CREATE OR REPLACE FUNCTION public.get_content_authors(_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM public.profiles p
  WHERE p.user_id = ANY(_ids)
$$;

GRANT EXECUTE ON FUNCTION public.get_content_authors(uuid[]) TO authenticated;