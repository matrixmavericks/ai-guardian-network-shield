REVOKE ALL ON FUNCTION public.get_content_authors(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_content_authors(uuid[]) TO authenticated;