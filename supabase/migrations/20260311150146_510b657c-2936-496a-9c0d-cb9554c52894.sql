
-- Table to persist generated resource notes, quiz results, and other learning path activities
CREATE TABLE public.learning_path_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  path_id UUID REFERENCES public.learning_paths(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'resource_notes',
  activity_key TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, path_id, module_id, activity_type, activity_key)
);

ALTER TABLE public.learning_path_activities ENABLE ROW LEVEL SECURITY;

-- Students can manage their own activities
CREATE POLICY "Users can insert own activities"
  ON public.learning_path_activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own activities"
  ON public.learning_path_activities FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON public.learning_path_activities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Teachers can view student activities (for adaptive profile)
CREATE POLICY "Teachers can view student activities"
  ON public.learning_path_activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = learning_path_activities.user_id
        AND c.teacher_id = auth.uid()
    )
  );
