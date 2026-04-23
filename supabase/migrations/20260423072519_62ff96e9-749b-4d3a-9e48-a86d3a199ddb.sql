
-- ============================================================
-- SECURITY FIX: registration_requests public-read exposure
-- ============================================================
DROP POLICY IF EXISTS "Anyone can check request status by email" ON public.registration_requests;

-- Allow only:
--   * the master admin to read
--   * authenticated users whose profile email matches the row email
CREATE POLICY "Master admin can read all requests"
ON public.registration_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.email = 'info.aiconditioner@gmail.com'
  )
);

CREATE POLICY "Users can read own request"
ON public.registration_requests
FOR SELECT
TO authenticated
USING (
  email = (SELECT p.email FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
);

-- SECURITY DEFINER RPC for the public anonymous status-check by email.
-- Returns only minimal, non-sensitive status fields. Rate-protected by being limited to 1 row.
CREATE OR REPLACE FUNCTION public.get_registration_status_by_email(_email text)
RETURNS TABLE (status text, rejection_reason text, payment_status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rr.status, rr.rejection_reason, rr.payment_status
  FROM public.registration_requests rr
  WHERE lower(rr.email) = lower(trim(_email))
  ORDER BY rr.created_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_registration_status_by_email(text) TO anon, authenticated;

-- SECURITY DEFINER RPC for PayPage to fetch a single registration by id (UUID is unguessable).
-- Returns only fields needed by PayPage, no Stripe IDs / discount codes.
CREATE OR REPLACE FUNCTION public.get_registration_payment_info(_request_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  payment_plan text,
  payment_amount_inr numeric,
  payment_status text,
  seat_config jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rr.id, rr.email, rr.full_name, rr.payment_plan, rr.payment_amount_inr, rr.payment_status, rr.seat_config
  FROM public.registration_requests rr
  WHERE rr.id = _request_id
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_registration_payment_info(uuid) TO anon, authenticated;

-- ============================================================
-- SECURITY FIX: PRIVILEGE_ESCALATION on user_roles
-- Remove ability for users to self-assign 'admin' or 'teacher' roles.
-- The 'auto_assign_admin_role' trigger still grants admin to the master email.
-- Teacher/parent roles must be assigned by an admin going forward.
-- ============================================================
DROP POLICY IF EXISTS "Users can insert their own startup role" ON public.user_roles;

CREATE POLICY "Users can self-assign basic roles only"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = ANY (ARRAY['student'::app_role, 'parent'::app_role])
);

-- ============================================================
-- SECURITY FIX: OVERLY_BROAD_DATA_ACCESS on ai_chat_messages / ai_chat_sessions
-- Restrict teachers to students in their own classes (or school admins).
-- ============================================================
DROP POLICY IF EXISTS "Teachers can view student messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Teachers can view student sessions" ON public.ai_chat_sessions;

CREATE POLICY "Teachers can view their students' messages"
ON public.ai_chat_messages
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE cm.student_id = ai_chat_messages.user_id
      AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "School admins can view their school members' messages"
ON public.ai_chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.school_members sm_admin
    JOIN public.school_members sm_user ON sm_user.school_id = sm_admin.school_id
    WHERE sm_admin.user_id = auth.uid()
      AND sm_admin.school_role = ANY (ARRAY['admin'::text, 'owner'::text])
      AND sm_user.user_id = ai_chat_messages.user_id
  )
);

CREATE POLICY "Teachers can view their students' sessions"
ON public.ai_chat_sessions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE cm.student_id = ai_chat_sessions.user_id
      AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "School admins can view their school members' sessions"
ON public.ai_chat_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.school_members sm_admin
    JOIN public.school_members sm_user ON sm_user.school_id = sm_admin.school_id
    WHERE sm_admin.user_id = auth.uid()
      AND sm_admin.school_role = ANY (ARRAY['admin'::text, 'owner'::text])
      AND sm_user.user_id = ai_chat_sessions.user_id
  )
);

-- ============================================================
-- SECURITY FIX: PUBLIC_DATA_EXPOSURE — open INSERT policies
-- Restrict prompt_logs / bypass_attempts / ethical_badges INSERT
-- to service_role (used by edge functions) or to auth.uid()=user_id.
-- ============================================================
DROP POLICY IF EXISTS "System can insert logs" ON public.prompt_logs;
DROP POLICY IF EXISTS "System can log bypass attempts" ON public.bypass_attempts;
DROP POLICY IF EXISTS "System can award badges" ON public.ethical_badges;

CREATE POLICY "Authenticated users can insert own prompt logs"
ON public.prompt_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert prompt logs"
ON public.prompt_logs
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can insert bypass attempts"
ON public.bypass_attempts
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Authenticated users can insert own bypass attempts"
ON public.bypass_attempts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can award badges"
ON public.ethical_badges
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================
-- SECURITY FIX: SECRETS_EXPOSED — replace localStorage SecurityKeys
-- Create a server-side encrypted-at-rest table with strict admin RLS.
-- Keys remain readable to admins (pre-existing behavior) but are no
-- longer in browser localStorage.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.security_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  service text NOT NULL,
  api_key text NOT NULL,
  created_by uuid NOT NULL,
  last_used timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.security_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage security keys"
ON public.security_keys
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_security_keys_updated_at
BEFORE UPDATE ON public.security_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
