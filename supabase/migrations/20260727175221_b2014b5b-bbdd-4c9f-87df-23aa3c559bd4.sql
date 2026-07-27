CREATE TABLE public.pilot_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text,
  nps_score int CHECK (nps_score BETWEEN 0 AND 10),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pilot_feedback TO authenticated;
GRANT ALL ON public.pilot_feedback TO service_role;

ALTER TABLE public.pilot_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback"
  ON public.pilot_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own feedback"
  ON public.pilot_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Master admin reads all feedback"
  ON public.pilot_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "School admin reads school feedback"
  ON public.pilot_feedback FOR SELECT TO authenticated
  USING (
    school_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.school_id = pilot_feedback.school_id
        AND sm.user_id = auth.uid()
        AND sm.school_role = 'admin'
    )
  );

CREATE INDEX pilot_feedback_school_created_idx ON public.pilot_feedback (school_id, created_at DESC);