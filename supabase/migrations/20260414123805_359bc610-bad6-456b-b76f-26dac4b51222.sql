
-- Courses catalog
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  curriculum_type text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  level text NOT NULL DEFAULT 'standard',
  description text NOT NULL DEFAULT '',
  syllabus_content text,
  icon_emoji text DEFAULT '📚',
  estimated_hours integer DEFAULT 100,
  is_official boolean DEFAULT true,
  created_by uuid,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view courses" ON public.courses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers and admins can create courses" ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin') OR auth.uid() = created_by
  );

CREATE POLICY "Creators can update own courses" ON public.courses
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

-- Course topics (syllabus hierarchy)
CREATE TABLE public.course_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  parent_topic_id uuid REFERENCES public.course_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  topic_order integer NOT NULL DEFAULT 0,
  estimated_hours numeric DEFAULT 2,
  topic_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_topics_course ON public.course_topics(course_id);
CREATE INDEX idx_course_topics_parent ON public.course_topics(parent_topic_id);

ALTER TABLE public.course_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view topics" ON public.course_topics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Course creators can manage topics" ON public.course_topics
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_topics.course_id AND (c.created_by = auth.uid() OR has_role(auth.uid(), 'admin')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_topics.course_id AND (c.created_by = auth.uid() OR has_role(auth.uid(), 'admin')))
  );

-- Student course enrollment
CREATE TABLE public.student_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  progress integer DEFAULT 0,
  mastery_score numeric DEFAULT 0,
  study_time_minutes integer DEFAULT 0,
  last_studied_at timestamptz,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_student_courses_user ON public.student_courses(user_id);

ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own enrollments" ON public.student_courses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Students can enroll themselves" ON public.student_courses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own enrollments" ON public.student_courses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Students can unenroll" ON public.student_courses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Per-topic mastery tracking
CREATE TABLE public.student_topic_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.course_topics(id) ON DELETE CASCADE,
  mastery_level integer DEFAULT 0,
  questions_attempted integer DEFAULT 0,
  questions_correct integer DEFAULT 0,
  study_time_minutes integer DEFAULT 0,
  last_studied_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

CREATE INDEX idx_student_mastery_user_course ON public.student_topic_mastery(user_id, course_id);

ALTER TABLE public.student_topic_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own mastery" ON public.student_topic_mastery
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Students can track own mastery" ON public.student_topic_mastery
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own mastery" ON public.student_topic_mastery
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Flashcards per topic
CREATE TABLE public.course_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.course_topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  difficulty integer DEFAULT 1,
  next_review_at timestamptz DEFAULT now(),
  review_count integer DEFAULT 0,
  ease_factor numeric DEFAULT 2.5,
  interval_days integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_flashcards_user_topic ON public.course_flashcards(user_id, topic_id);

ALTER TABLE public.course_flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own flashcards" ON public.course_flashcards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Students can create flashcards" ON public.course_flashcards
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own flashcards" ON public.course_flashcards
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Students can delete own flashcards" ON public.course_flashcards
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Study resources per topic (cheatsheets, past papers, etc.)
CREATE TABLE public.course_study_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.course_topics(id) ON DELETE CASCADE,
  resource_type text NOT NULL DEFAULT 'cheatsheet',
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  is_ai_generated boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_resources_course ON public.course_study_resources(course_id);

ALTER TABLE public.course_study_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view study resources" ON public.course_study_resources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Creators can manage resources" ON public.course_study_resources
  FOR ALL TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can create own resources" ON public.course_study_resources
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
