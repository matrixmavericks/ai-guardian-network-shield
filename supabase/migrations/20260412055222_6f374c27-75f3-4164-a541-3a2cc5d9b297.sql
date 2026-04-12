
-- Add seat_config to registration_requests
ALTER TABLE public.registration_requests
ADD COLUMN IF NOT EXISTS seat_config jsonb DEFAULT NULL;

-- Create school_seat_limits table
CREATE TABLE public.school_seat_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_id text NOT NULL DEFAULT 'school_starter',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  teacher_seats integer NOT NULL DEFAULT 0,
  student_seats integer NOT NULL DEFAULT 0,
  teachers_used integer NOT NULL DEFAULT 0,
  students_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id)
);

ALTER TABLE public.school_seat_limits ENABLE ROW LEVEL SECURITY;

-- Website admin (has admin role) can manage all seat limits
CREATE POLICY "Admins can manage all seat limits"
ON public.school_seat_limits
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- School members can view their school's seat limits
CREATE POLICY "School members can view seat limits"
ON public.school_seat_limits
FOR SELECT
TO authenticated
USING (public.is_school_member(auth.uid(), school_id));

-- Trigger for updated_at
CREATE TRIGGER update_school_seat_limits_updated_at
BEFORE UPDATE ON public.school_seat_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
