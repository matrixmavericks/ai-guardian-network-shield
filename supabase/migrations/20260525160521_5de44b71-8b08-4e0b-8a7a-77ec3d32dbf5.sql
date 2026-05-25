
CREATE TABLE public.project_nelo_applicants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted','rejected')),
  letter_title TEXT,
  letter_body TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_nelo_normalized_name ON public.project_nelo_applicants(normalized_name);

ALTER TABLE public.project_nelo_applicants ENABLE ROW LEVEL SECURITY;

-- Public read so the secret search page works without login
CREATE POLICY "Public can read project nelo applicants"
ON public.project_nelo_applicants FOR SELECT
USING (true);

CREATE POLICY "Admins can insert project nelo applicants"
ON public.project_nelo_applicants FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update project nelo applicants"
ON public.project_nelo_applicants FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete project nelo applicants"
ON public.project_nelo_applicants FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_project_nelo_updated_at
BEFORE UPDATE ON public.project_nelo_applicants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
