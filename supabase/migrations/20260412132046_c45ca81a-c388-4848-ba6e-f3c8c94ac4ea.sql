-- School announcements
CREATE TABLE public.school_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public announcements visible to all"
ON public.school_announcements FOR SELECT
TO anon, authenticated
USING (is_public = true);

CREATE POLICY "School members can view all announcements"
ON public.school_announcements FOR SELECT
TO authenticated
USING (public.is_school_member(auth.uid(), school_id));

CREATE POLICY "School admins can manage announcements"
ON public.school_announcements FOR ALL
TO authenticated
USING (public.is_school_member(auth.uid(), school_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')))
WITH CHECK (public.is_school_member(auth.uid(), school_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));

CREATE TRIGGER update_school_announcements_updated_at
BEFORE UPDATE ON public.school_announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- School events
CREATE TABLE public.school_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public events visible to all"
ON public.school_events FOR SELECT
TO anon, authenticated
USING (is_public = true);

CREATE POLICY "School members can view all events"
ON public.school_events FOR SELECT
TO authenticated
USING (public.is_school_member(auth.uid(), school_id));

CREATE POLICY "School admins can manage events"
ON public.school_events FOR ALL
TO authenticated
USING (public.is_school_member(auth.uid(), school_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')))
WITH CHECK (public.is_school_member(auth.uid(), school_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));

CREATE TRIGGER update_school_events_updated_at
BEFORE UPDATE ON public.school_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
