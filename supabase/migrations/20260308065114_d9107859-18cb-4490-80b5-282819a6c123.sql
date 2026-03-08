
-- Create assignment_submissions table
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.class_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  content TEXT DEFAULT '',
  file_url TEXT DEFAULT NULL,
  file_name TEXT DEFAULT NULL,
  grade INTEGER DEFAULT NULL,
  max_grade INTEGER NOT NULL DEFAULT 100,
  feedback TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  graded_by UUID DEFAULT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Enable RLS
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Students can view their own submissions
CREATE POLICY "Students can view own submissions"
  ON public.assignment_submissions FOR SELECT
  USING (auth.uid() = student_id);

-- Students can insert their own submissions
CREATE POLICY "Students can submit assignments"
  ON public.assignment_submissions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students can update their own ungraded submissions
CREATE POLICY "Students can update ungraded submissions"
  ON public.assignment_submissions FOR UPDATE
  USING (auth.uid() = student_id AND grade IS NULL)
  WITH CHECK (auth.uid() = student_id AND grade IS NULL);

-- Teachers can view submissions for their assignments
CREATE POLICY "Teachers can view submissions for their assignments"
  ON public.assignment_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_assignments ca
      WHERE ca.id = assignment_id AND ca.teacher_id = auth.uid()
    )
  );

-- Teachers can update (grade) submissions for their assignments
CREATE POLICY "Teachers can grade submissions"
  ON public.assignment_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.class_assignments ca
      WHERE ca.id = assignment_id AND ca.teacher_id = auth.uid()
    )
  );

-- Create storage bucket for submission files
INSERT INTO storage.buckets (id, name, public) VALUES ('submission-files', 'submission-files', false);

-- Storage RLS: students can upload to their own folder
CREATE POLICY "Students can upload submission files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'submission-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Students can view their own files
CREATE POLICY "Students can view own submission files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'submission-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Teachers can view all submission files
CREATE POLICY "Teachers can view submission files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'submission-files' AND has_role(auth.uid(), 'teacher'::app_role));

-- Enable realtime for submissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_submissions;
