
-- Create storage bucket for class resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('class-resources', 'class-resources', true);

-- Create resource folders table
CREATE TABLE public.class_resource_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_folder_id uuid REFERENCES public.class_resource_folders(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.class_resource_folders ENABLE ROW LEVEL SECURITY;

-- Teachers can manage folders in their classes
CREATE POLICY "Teachers can manage class folders"
ON public.class_resource_folders FOR ALL TO authenticated
USING (is_class_teacher(auth.uid(), class_id))
WITH CHECK (is_class_teacher(auth.uid(), class_id));

-- Students can view folders in their classes
CREATE POLICY "Students can view class folders"
ON public.class_resource_folders FOR SELECT TO authenticated
USING (is_class_member(auth.uid(), class_id));

-- Create class resources table
CREATE TABLE public.class_resources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.class_resource_folders(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL,
  resource_type text NOT NULL DEFAULT 'file',
  title text NOT NULL,
  description text DEFAULT '',
  file_url text,
  file_name text,
  file_size bigint DEFAULT 0,
  mime_type text,
  external_url text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.class_resources ENABLE ROW LEVEL SECURITY;

-- Teachers can manage resources in their classes
CREATE POLICY "Teachers can manage class resources"
ON public.class_resources FOR ALL TO authenticated
USING (is_class_teacher(auth.uid(), class_id))
WITH CHECK (is_class_teacher(auth.uid(), class_id));

-- Students can view resources in their classes
CREATE POLICY "Students can view class resources"
ON public.class_resources FOR SELECT TO authenticated
USING (is_class_member(auth.uid(), class_id));

-- Student bookmarks table
CREATE TABLE public.student_resource_bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.class_resources(id) ON DELETE CASCADE,
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_id)
);

ALTER TABLE public.student_resource_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bookmarks"
ON public.student_resource_bookmarks FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Storage RLS for class-resources bucket
CREATE POLICY "Teachers can upload class resources"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'class-resources');

CREATE POLICY "Anyone can view class resources"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'class-resources');

CREATE POLICY "Teachers can delete class resources"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'class-resources' AND (storage.foldername(name))[1] IN (
  SELECT id::text FROM public.classes WHERE teacher_id = auth.uid()
));
