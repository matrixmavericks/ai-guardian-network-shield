
-- 1) Drop client self-assign policy (roles now assigned server-side only)
DROP POLICY IF EXISTS "Users can self-assign basic roles only" ON public.user_roles;

-- 2) Server-side role provisioning trigger on auth.users
CREATE OR REPLACE FUNCTION public.assign_role_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  approved_role public.app_role;
  meta_role text;
  final_role public.app_role;
BEGIN
  -- Master admin override
  IF NEW.email = 'info.aiconditioner@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Approved registration request wins (any elevated role must be admin-approved)
  SELECT rr.requested_role::public.app_role
  INTO approved_role
  FROM public.registration_requests rr
  WHERE lower(rr.email) = lower(NEW.email)
    AND rr.status IN ('approved', 'completed')
    AND rr.requested_role IN ('admin', 'teacher', 'student', 'parent')
  ORDER BY rr.reviewed_at DESC NULLS LAST, rr.created_at DESC
  LIMIT 1;

  IF approved_role IS NOT NULL THEN
    final_role := approved_role;
  ELSE
    -- No approved request: only accept safe roles from metadata; default to student
    meta_role := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'student');
    IF meta_role IN ('student', 'parent') THEN
      final_role := meta_role::public.app_role;
    ELSE
      final_role := 'student';
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, final_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.assign_role_on_signup();
