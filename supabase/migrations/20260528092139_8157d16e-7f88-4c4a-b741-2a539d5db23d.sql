
-- =====================================================================
-- 1) PROFILES: lock email column from self-update (closes admin bypass)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.prevent_profile_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Email cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_profile_email ON public.profiles;
CREATE TRIGGER lock_profile_email
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_email_change();

-- =====================================================================
-- 2) USER_PLANS: replace email-based admin check with proper role check
-- =====================================================================
DROP POLICY IF EXISTS "Admin can manage all plans" ON public.user_plans;
CREATE POLICY "Admins can manage all plans"
ON public.user_plans
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================================
-- 3) REGISTRATION_REQUESTS: add user_id + role-based admin
-- =====================================================================
ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Backfill user_id from profiles where possible (best effort)
UPDATE public.registration_requests rr
SET user_id = p.user_id
FROM public.profiles p
WHERE rr.user_id IS NULL
  AND lower(p.email) = lower(rr.email);

DROP POLICY IF EXISTS "Master admin can read all requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Only website admin can delete requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Only website admin can update requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Users can read own request" ON public.registration_requests;

CREATE POLICY "Admins can read all requests"
ON public.registration_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update requests"
ON public.registration_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete requests"
ON public.registration_requests
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Self-read: prefer user_id; fall back to verified email match
CREATE POLICY "Users can read own request"
ON public.registration_requests
FOR SELECT
TO authenticated
USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (user_id IS NULL AND email = (SELECT p.email FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1))
);

-- =====================================================================
-- 4) CLASSES: stop leaking join_code to every authenticated user
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can view classes" ON public.classes;

CREATE POLICY "Class participants and admins can view classes"
ON public.classes
FOR SELECT
TO authenticated
USING (
  teacher_id = auth.uid()
  OR public.is_class_member(auth.uid(), id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (school_id IS NOT NULL AND public.is_school_member(auth.uid(), school_id))
);

-- Safe RPC so students can still join via a code without enumerating all codes
CREATE OR REPLACE FUNCTION public.find_class_by_join_code(_code text)
RETURNS TABLE(id uuid, name text, subject text, teacher_id uuid, school_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.subject, c.teacher_id, c.school_id
  FROM public.classes c
  WHERE upper(c.join_code) = upper(trim(_code))
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.find_class_by_join_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_class_by_join_code(text) TO authenticated;

-- =====================================================================
-- 5) PROMPT_LOGS: scope teacher access to their own students only
-- =====================================================================
DROP POLICY IF EXISTS "Teachers can view student logs" ON public.prompt_logs;

CREATE POLICY "Teachers can view their students' logs"
ON public.prompt_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE cm.student_id = prompt_logs.user_id
      AND c.teacher_id = auth.uid()
  )
);

-- =====================================================================
-- 6) STUDENT_DOCUMENTS table: scope teacher access to their own students
-- =====================================================================
DROP POLICY IF EXISTS "Teachers can view student documents" ON public.student_documents;

CREATE POLICY "Teachers can view their students' documents"
ON public.student_documents
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.has_role(auth.uid(), 'teacher'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.student_id = student_documents.user_id
        AND c.teacher_id = auth.uid()
    )
  )
);

-- =====================================================================
-- 7) SCHOOLS: stop exposing contact_email/address to anonymous users
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can view schools with a subdomain" ON public.schools;

-- Safe branding-only RPC for subdomain landing/branding lookups
CREATE OR REPLACE FUNCTION public.get_school_branding(_subdomain text)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  logo_url text,
  subdomain text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.description, s.logo_url, s.subdomain
  FROM public.schools s
  WHERE s.subdomain IS NOT NULL
    AND lower(s.subdomain) = lower(trim(_subdomain))
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_school_branding(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_school_branding(text) TO anon, authenticated;

-- =====================================================================
-- 8) DISCOUNT_CODES: stop exposing full table to all authenticated
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated can validate codes" ON public.discount_codes;

CREATE OR REPLACE FUNCTION public.validate_discount_code(_code text)
RETURNS TABLE(
  valid boolean,
  discount_type text,
  discount_value numeric,
  applies_to_plans text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (dc.id IS NOT NULL
      AND dc.is_active
      AND (dc.expires_at IS NULL OR dc.expires_at > now())
      AND (dc.max_uses IS NULL OR dc.uses_count < dc.max_uses)
    ) AS valid,
    dc.discount_type,
    dc.discount_value,
    dc.applies_to_plans
  FROM public.discount_codes dc
  WHERE upper(dc.code) = upper(trim(_code))
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.validate_discount_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(text) TO authenticated;

-- =====================================================================
-- 9) STORAGE: make submission and capstone buckets private
-- =====================================================================
UPDATE storage.buckets SET public = false WHERE id IN ('submission-files','capstone-files');

-- Class-resources bucket: enforce class-membership on reads
DROP POLICY IF EXISTS "Anyone can view class resources" ON storage.objects;

CREATE POLICY "Class members can view class resources"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'class-resources'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM public.classes c WHERE c.teacher_id = auth.uid()
    )
    OR (storage.foldername(name))[1] IN (
      SELECT cm.class_id::text FROM public.class_members cm WHERE cm.student_id = auth.uid()
    )
  )
);

-- Class-resources uploads: only the teacher of that class
DROP POLICY IF EXISTS "Teachers can upload class resources" ON storage.objects;

CREATE POLICY "Teachers can upload to their class resources"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'class-resources'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM public.classes c WHERE c.teacher_id = auth.uid()
  )
);

-- Teachers can view student-documents files: only their own students
DROP POLICY IF EXISTS "Teachers can view student documents" ON storage.objects;

CREATE POLICY "Teachers can view their students' document files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      public.has_role(auth.uid(), 'teacher'::app_role)
      AND (storage.foldername(name))[1] IN (
        SELECT cm.student_id::text
        FROM public.class_members cm
        JOIN public.classes c ON c.id = cm.class_id
        WHERE c.teacher_id = auth.uid()
      )
    )
  )
);

-- Teachers can view submission-files: only for their own students
DROP POLICY IF EXISTS "Teachers can view submission files" ON storage.objects;

CREATE POLICY "Teachers can view their students' submission files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-files'
  AND public.has_role(auth.uid(), 'teacher'::app_role)
  AND (storage.foldername(name))[1] IN (
    SELECT cm.student_id::text
    FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE c.teacher_id = auth.uid()
  )
);

-- Teachers can view capstone-files: only for their own students
DROP POLICY IF EXISTS "Teachers can view student capstone files" ON storage.objects;

CREATE POLICY "Teachers can view their students' capstone files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'capstone-files'
  AND public.has_role(auth.uid(), 'teacher'::app_role)
  AND (storage.foldername(name))[1] IN (
    SELECT cm.student_id::text
    FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE c.teacher_id = auth.uid()
  )
);
