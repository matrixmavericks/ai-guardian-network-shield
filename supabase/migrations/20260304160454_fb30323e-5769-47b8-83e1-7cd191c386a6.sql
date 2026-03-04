-- Allow authenticated users to self-assign only safe roles during initial setup
create policy "Users can insert their own startup role"
on public.user_roles
for insert
to authenticated
with check (
  auth.uid() = user_id
  and role in ('student'::public.app_role, 'teacher'::public.app_role, 'parent'::public.app_role)
);

-- Prevent duplicate role rows per user/role pair if missing
create unique index if not exists user_roles_user_id_role_key
on public.user_roles (user_id, role);