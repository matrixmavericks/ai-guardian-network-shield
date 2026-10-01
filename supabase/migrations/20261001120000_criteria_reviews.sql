-- Assessment coach (students) and marking copilot (teachers): criterion-based
-- reviews of MYP work. Everything is private to its owner. Original files live
-- in the existing private pp-files bucket under <owner_id>/.

create table if not exists public.task_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'My work' check (char_length(title) <= 200),
  subject_group text not null,
  year integer not null default 5 check (year between 1 and 5),
  criteria text[] not null,
  task jsonb not null default '{}'::jsonb,
  file_path text,
  file_type text check (file_type in ('pdf', 'docx')),
  words integer,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists task_reviews_user_idx on public.task_reviews (user_id, created_at desc);
alter table public.task_reviews enable row level security;
drop policy if exists "Task reviews: owner" on public.task_reviews;
create policy "Task reviews: owner" on public.task_reviews for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.task_reviews to authenticated;

create table if not exists public.marking_sets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  subject_group text not null,
  year integer not null default 5 check (year between 1 and 5),
  criteria text[] not null,
  task jsonb not null default '{}'::jsonb,
  assignment_id uuid,
  insights jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marking_sets_teacher_idx on public.marking_sets (teacher_id, updated_at desc);
alter table public.marking_sets enable row level security;
drop policy if exists "Marking sets: teacher" on public.marking_sets;
create policy "Marking sets: teacher" on public.marking_sets for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and (public.has_role(auth.uid(), 'teacher') or public.has_role(auth.uid(), 'admin')));
grant select, insert, update, delete on public.marking_sets to authenticated;
drop trigger if exists update_marking_sets_updated_at on public.marking_sets;
create trigger update_marking_sets_updated_at before update on public.marking_sets for each row execute function public.update_updated_at_column();

create table if not exists public.marking_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.marking_sets (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  student_name text not null check (char_length(student_name) between 1 and 120),
  student_id uuid,
  submission_id uuid,
  file_path text,
  file_type text check (file_type in ('pdf', 'docx')),
  text text not null default '',
  status text not null default 'queued' check (status in ('queued', 'working', 'done', 'error')),
  error text,
  result jsonb not null default '{}'::jsonb,
  overrides jsonb not null default '{}'::jsonb,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marking_items_set_idx on public.marking_items (set_id, created_at);
create index if not exists marking_items_teacher_idx on public.marking_items (teacher_id, created_at desc);
alter table public.marking_items enable row level security;
drop policy if exists "Marking items: teacher" on public.marking_items;
create policy "Marking items: teacher" on public.marking_items for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and exists (select 1 from public.marking_sets s where s.id = set_id and s.teacher_id = auth.uid()));
grant select, insert, update, delete on public.marking_items to authenticated;
drop trigger if exists update_marking_items_updated_at on public.marking_items;
create trigger update_marking_items_updated_at before update on public.marking_items for each row execute function public.update_updated_at_column();
