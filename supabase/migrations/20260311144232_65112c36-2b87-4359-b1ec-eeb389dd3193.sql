
-- Create capstone submissions table
CREATE TABLE public.capstone_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  text_content text DEFAULT '',
  external_link text DEFAULT '',
  file_url text,
  file_name text,
  status text NOT NULL DEFAULT 'submitted',
  ai_feedback jsonb DEFAULT '{}'::jsonb,
  ai_score integer,
  teacher_id uuid,
  teacher_feedback text,
  teacher_score integer,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.capstone_submissions ENABLE ROW LEVEL SECURITY;

-- Students can submit their own capstones
CREATE POLICY "Students can insert own capstones" ON public.capstone_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Students can view own capstones
CREATE POLICY "Students can view own capstones" ON public.capstone_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Students can update unreviewed capstones
CREATE POLICY "Students can update own unreviewed capstones" ON public.capstone_submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND teacher_score IS NULL)
  WITH CHECK (auth.uid() = user_id AND teacher_score IS NULL);

-- Teachers can view capstones for students in their classes
CREATE POLICY "Teachers can view student capstones" ON public.capstone_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = capstone_submissions.user_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Teachers can update capstones (for grading/feedback)
CREATE POLICY "Teachers can grade capstones" ON public.capstone_submissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = capstone_submissions.user_id
        AND c.teacher_id = auth.uid()
    )
  );

-- System can update capstones (for AI feedback)
CREATE POLICY "System can update AI feedback" ON public.capstone_submissions
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for capstone files
INSERT INTO storage.buckets (id, name, public) VALUES ('capstone-files', 'capstone-files', false);

-- Storage policies for capstone files
CREATE POLICY "Users can upload capstone files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'capstone-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own capstone files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'capstone-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers can view student capstone files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'capstone-files'
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

-- Enable realtime for capstone submissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.capstone_submissions;
