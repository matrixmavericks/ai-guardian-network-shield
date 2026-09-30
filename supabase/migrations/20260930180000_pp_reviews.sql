-- Personal project coach: a student's feedback reviews of their own report
-- drafts (owner-only), and anonymous similarity fingerprints used to spot
-- overlap between reports at the same school. Fingerprints are hashes of
-- 8-word phrases, never text, and only the pp-feedback function can read them.

create table if not exists public.pp_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  school_id uuid references public.schools (id) on delete set null,
  title text not null default 'Personal project report' check (char_length(title) <= 200),
  file_name text check (char_length(file_name) <= 200),
  pages integer,
  words integer,
  recording_minutes integer not null default 0 check (recording_minutes between 0 and 15),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pp_reviews_user_idx on public.pp_reviews (user_id, created_at desc);

alter table public.pp_reviews enable row level security;

drop policy if exists "PP reviews: owner reads" on public.pp_reviews;
create policy "PP reviews: owner reads" on public.pp_reviews for select to authenticated using (user_id = auth.uid());
drop policy if exists "PP reviews: owner creates" on public.pp_reviews;
create policy "PP reviews: owner creates" on public.pp_reviews for insert to authenticated
  with check (user_id = auth.uid() and (school_id is null or public.is_school_member(auth.uid(), school_id)));
drop policy if exists "PP reviews: owner updates" on public.pp_reviews;
create policy "PP reviews: owner updates" on public.pp_reviews for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "PP reviews: owner deletes" on public.pp_reviews;
create policy "PP reviews: owner deletes" on public.pp_reviews for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.pp_reviews to authenticated;

create table if not exists public.pp_fingerprints (
  review_id uuid primary key references public.pp_reviews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  school_id uuid references public.schools (id) on delete cascade,
  hashes integer[] not null,
  created_at timestamptz not null default now()
);

create index if not exists pp_fingerprints_school_idx on public.pp_fingerprints (school_id, created_at desc);

-- No policies: only the service role (the pp-feedback function) can use it
alter table public.pp_fingerprints enable row level security;
