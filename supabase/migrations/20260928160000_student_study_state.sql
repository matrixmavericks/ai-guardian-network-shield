-- Study progress for the built-in MYP subjects: one JSON document per student
-- (answers, read guides, flashcard ratings, saved items, study plans, streak).
-- The app merges it with the copy in the browser, so it works offline too.

create table if not exists public.student_study_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint student_study_state_size check (pg_column_size(state) <= 524288)
);

alter table public.student_study_state enable row level security;

drop policy if exists "Students can view own study state" on public.student_study_state;
create policy "Students can view own study state"
  on public.student_study_state for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Students can create own study state" on public.student_study_state;
create policy "Students can create own study state"
  on public.student_study_state for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Students can update own study state" on public.student_study_state;
create policy "Students can update own study state"
  on public.student_study_state for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Teachers can view their students' study state" on public.student_study_state;
create policy "Teachers can view their students' study state"
  on public.student_study_state for select to authenticated
  using (
    has_role(auth.uid(), 'teacher'::app_role)
    and exists (
      select 1
      from class_members cm
      join classes c on c.id = cm.class_id
      where cm.student_id = student_study_state.user_id
        and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "Admins can view all study state" on public.student_study_state;
create policy "Admins can view all study state"
  on public.student_study_state for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));
