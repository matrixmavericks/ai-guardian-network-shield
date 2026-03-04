create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  subject text not null,
  difficulty text not null default 'beginner',
  estimated_hours integer not null default 1,
  tags text[] not null default '{}',
  modules jsonb not null default '[]'::jsonb,
  created_by uuid not null,
  is_public boolean not null default true,
  featured boolean not null default false,
  rating numeric(3,2) not null default 0,
  enrolled_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learning_paths enable row level security;

create policy "Users can view public learning paths"
on public.learning_paths
for select
to authenticated
using (is_public = true);

create policy "Users can view own learning paths"
on public.learning_paths
for select
to authenticated
using (auth.uid() = created_by);

create policy "Teachers and admins can create learning paths"
on public.learning_paths
for insert
to authenticated
with check (
  auth.uid() = created_by
  and (
    public.has_role(auth.uid(), 'teacher'::public.app_role)
    or public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

create policy "Creators can update learning paths"
on public.learning_paths
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "Admins can manage all learning paths"
on public.learning_paths
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create table if not exists public.learning_path_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  progress integer not null default 0,
  completed_modules text[] not null default '{}',
  bookmarked boolean not null default false,
  started_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, path_id)
);

alter table public.learning_path_progress enable row level security;

create policy "Users can view own learning path progress"
on public.learning_path_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own learning path progress"
on public.learning_path_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own learning path progress"
on public.learning_path_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own learning path progress"
on public.learning_path_progress
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists idx_learning_paths_created_by on public.learning_paths(created_by);
create index if not exists idx_learning_paths_public_subject on public.learning_paths(is_public, subject);
create index if not exists idx_learning_path_progress_user_id on public.learning_path_progress(user_id);
create index if not exists idx_learning_path_progress_path_id on public.learning_path_progress(path_id);

create trigger update_learning_paths_updated_at
before update on public.learning_paths
for each row
execute function public.update_updated_at_column();

create trigger update_learning_path_progress_updated_at
before update on public.learning_path_progress
for each row
execute function public.update_updated_at_column();