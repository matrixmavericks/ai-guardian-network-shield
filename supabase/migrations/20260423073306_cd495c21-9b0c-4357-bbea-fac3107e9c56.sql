-- 1) Drop security_keys table — secrets must not be stored in app tables
DROP TABLE IF EXISTS public.security_keys CASCADE;

-- 2) Restrict user_plans UPDATE — remove user self-update, keep admin/service control
DROP POLICY IF EXISTS "Users can update own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can update their own plan" ON public.user_plans;

-- (Admin ALL policy and Users-can-view policy from the original migration remain in place.)

-- 3) Remove teacher → teacher promotion policy (privilege escalation vector)
DROP POLICY IF EXISTS "Teachers can promote users to teacher" ON public.user_roles;