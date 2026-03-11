
-- Make capstone-files bucket public for downloads
UPDATE storage.buckets SET public = true WHERE id = 'capstone-files';

-- Create portfolio-media storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-media', 'portfolio-media', true);

-- Portfolio media storage policies
CREATE POLICY "Users can upload own portfolio media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view portfolio media"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'portfolio-media');

CREATE POLICY "Users can delete own portfolio media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'portfolio-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Portfolio projects table
CREATE TABLE public.portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  capstone_submission_id UUID REFERENCES public.capstone_submissions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  share_token TEXT UNIQUE DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 12),
  is_published BOOLEAN NOT NULL DEFAULT false,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  external_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own projects"
  ON public.portfolio_projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own projects"
  ON public.portfolio_projects FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.portfolio_projects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.portfolio_projects FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student projects"
  ON public.portfolio_projects FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = portfolio_projects.user_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Published projects viewable by share token"
  ON public.portfolio_projects FOR SELECT TO anon, authenticated
  USING (is_published = true);

-- Portfolio updates/reflections
CREATE TABLE public.portfolio_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.portfolio_projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  update_type TEXT NOT NULL DEFAULT 'reflection',
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own updates"
  ON public.portfolio_updates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own updates"
  ON public.portfolio_updates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own updates"
  ON public.portfolio_updates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student updates"
  ON public.portfolio_updates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_projects pp
      JOIN class_members cm ON cm.student_id = pp.user_id
      JOIN classes c ON c.id = cm.class_id
      WHERE pp.id = portfolio_updates.project_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Public updates viewable via published project"
  ON public.portfolio_updates FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolio_projects pp
      WHERE pp.id = portfolio_updates.project_id
        AND pp.is_published = true
    )
  );
