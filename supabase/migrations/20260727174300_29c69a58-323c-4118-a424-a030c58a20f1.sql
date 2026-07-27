
CREATE TABLE public.pilot_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  teachers int NOT NULL DEFAULT 0,
  students int NOT NULL DEFAULT 0,
  classes int NOT NULL DEFAULT 0,
  wau int NOT NULL DEFAULT 0,
  dau int NOT NULL DEFAULT 0,
  prompts_7d int NOT NULL DEFAULT 0,
  prompts_total int NOT NULL DEFAULT 0,
  flagged_7d int NOT NULL DEFAULT 0,
  bypass_7d int NOT NULL DEFAULT 0,
  learning_paths_total int NOT NULL DEFAULT 0,
  learning_path_completion_pct numeric NOT NULL DEFAULT 0,
  capstones_total int NOT NULL DEFAULT 0,
  capstones_avg_score numeric NOT NULL DEFAULT 0,
  tokens_7d bigint NOT NULL DEFAULT 0,
  cost_7d_usd numeric NOT NULL DEFAULT 0,
  teacher_hours_saved numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, snapshot_date)
);

GRANT SELECT ON public.pilot_metrics TO authenticated;
GRANT ALL ON public.pilot_metrics TO service_role;

ALTER TABLE public.pilot_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and school admins can view pilot metrics"
  ON public.pilot_metrics FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.school_id = pilot_metrics.school_id
        AND sm.user_id = auth.uid()
        AND sm.school_role = 'admin'
    )
  );

CREATE INDEX idx_pilot_metrics_school_date ON public.pilot_metrics(school_id, snapshot_date DESC);
