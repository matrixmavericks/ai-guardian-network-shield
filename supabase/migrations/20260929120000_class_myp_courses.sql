-- Links a class to one or more of the built-in IB MYP subject courses
-- (biology, chemistry, physics, maths, english, history, societies).
-- Students in the class see the course in My Subjects with the teacher's
-- current focus unit; the teacher sees the class's progress on the course.

create table if not exists public.class_myp_courses (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_slug text not null check (subject_slug ~ '^[a-z-]{2,40}$'),
  focus_unit_ids text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, subject_slug)
);

create index if not exists class_myp_courses_class_idx on public.class_myp_courses (class_id);

alter table public.class_myp_courses enable row level security;

drop policy if exists "Class teachers, members and admins can view course links" on public.class_myp_courses;
create policy "Class teachers, members and admins can view course links"
  on public.class_myp_courses for select to authenticated
  using (
    public.is_class_teacher(auth.uid(), class_id)
    or public.is_class_member(auth.uid(), class_id)
    or public.has_role(auth.uid(), 'admin'::app_role)
  );

drop policy if exists "Class teachers can add course links" on public.class_myp_courses;
create policy "Class teachers can add course links"
  on public.class_myp_courses for insert to authenticated
  with check (public.is_class_teacher(auth.uid(), class_id) or public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Class teachers can update course links" on public.class_myp_courses;
create policy "Class teachers can update course links"
  on public.class_myp_courses for update to authenticated
  using (public.is_class_teacher(auth.uid(), class_id) or public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.is_class_teacher(auth.uid(), class_id) or public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Class teachers can remove course links" on public.class_myp_courses;
create policy "Class teachers can remove course links"
  on public.class_myp_courses for delete to authenticated
  using (public.is_class_teacher(auth.uid(), class_id) or public.has_role(auth.uid(), 'admin'::app_role));

drop trigger if exists update_class_myp_courses_updated_at on public.class_myp_courses;
create trigger update_class_myp_courses_updated_at
  before update on public.class_myp_courses
  for each row execute function public.update_updated_at_column();
