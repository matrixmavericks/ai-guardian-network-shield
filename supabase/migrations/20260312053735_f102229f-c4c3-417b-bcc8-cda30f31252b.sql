-- Fix infinite recursion in portfolio RLS by replacing cross-table policy lookups
-- with SECURITY DEFINER helper functions.

CREATE OR REPLACE FUNCTION public.is_portfolio_owner(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portfolio_projects pp
    WHERE pp.id = _project_id
      AND pp.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_portfolio_collaborator(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portfolio_collaborators pc
    WHERE pc.project_id = _project_id
      AND pc.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_portfolio_project_published(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portfolio_projects pp
    WHERE pp.id = _project_id
      AND pp.is_published = true
  )
$$;

-- portfolio_projects policies
DROP POLICY IF EXISTS "Collaborators can view projects" ON public.portfolio_projects;
DROP POLICY IF EXISTS "Collaborators can update projects" ON public.portfolio_projects;

CREATE POLICY "Collaborators can view projects"
ON public.portfolio_projects
FOR SELECT
TO authenticated
USING (public.is_portfolio_collaborator(auth.uid(), id));

CREATE POLICY "Collaborators can update projects"
ON public.portfolio_projects
FOR UPDATE
TO authenticated
USING (public.is_portfolio_collaborator(auth.uid(), id))
WITH CHECK (public.is_portfolio_collaborator(auth.uid(), id));

-- portfolio_collaborators policies
DROP POLICY IF EXISTS "Owner can manage collaborators" ON public.portfolio_collaborators;

CREATE POLICY "Owner can manage collaborators"
ON public.portfolio_collaborators
FOR ALL
TO authenticated
USING (public.is_portfolio_owner(auth.uid(), project_id))
WITH CHECK (public.is_portfolio_owner(auth.uid(), project_id));

-- portfolio_updates policies
DROP POLICY IF EXISTS "Collaborators can add updates" ON public.portfolio_updates;
DROP POLICY IF EXISTS "Collaborators can view updates" ON public.portfolio_updates;
DROP POLICY IF EXISTS "Public updates viewable via published project" ON public.portfolio_updates;

CREATE POLICY "Collaborators can add updates"
ON public.portfolio_updates
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_portfolio_collaborator(auth.uid(), project_id)
);

CREATE POLICY "Collaborators can view updates"
ON public.portfolio_updates
FOR SELECT
TO authenticated
USING (public.is_portfolio_collaborator(auth.uid(), project_id));

CREATE POLICY "Public updates viewable via published project"
ON public.portfolio_updates
FOR SELECT
TO anon, authenticated
USING (public.is_portfolio_project_published(project_id));