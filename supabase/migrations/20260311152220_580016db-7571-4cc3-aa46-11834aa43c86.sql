
CREATE TABLE public.portfolio_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.portfolio_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_comments ENABLE ROW LEVEL SECURITY;

-- Teachers can insert comments on student projects they can see
CREATE POLICY "Teachers can insert comments"
  ON public.portfolio_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

-- Teachers can view their own comments
CREATE POLICY "Teachers can view own comments"
  ON public.portfolio_comments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Students can view public comments on their projects
CREATE POLICY "Students can view public comments on own projects"
  ON public.portfolio_comments FOR SELECT
  TO authenticated
  USING (
    is_private = false
    AND EXISTS (
      SELECT 1 FROM portfolio_projects pp
      WHERE pp.id = portfolio_comments.project_id
      AND pp.user_id = auth.uid()
    )
  );

-- Teachers can update their own comments
CREATE POLICY "Teachers can update own comments"
  ON public.portfolio_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Teachers can delete their own comments
CREATE POLICY "Teachers can delete own comments"
  ON public.portfolio_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
