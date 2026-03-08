
-- Student documents table for syllabi, report cards, etc.
CREATE TABLE public.student_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other',
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

-- Students can manage their own documents
CREATE POLICY "Students can insert own documents"
  ON public.student_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view own documents"
  ON public.student_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can delete own documents"
  ON public.student_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Teachers can view student documents (for adaptive profile)
CREATE POLICY "Teachers can view student documents"
  ON public.student_documents FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role));

-- Storage bucket for student documents
INSERT INTO storage.buckets (id, name, public) VALUES ('student-documents', 'student-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Students can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'student-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Students can view own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers can view student documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-documents' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role)));

CREATE POLICY "Students can delete own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'student-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
