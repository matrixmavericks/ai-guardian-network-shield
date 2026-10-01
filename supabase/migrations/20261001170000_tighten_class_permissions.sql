-- Close permission gaps found on 1 Oct 2026 (none had been used: checked first).
-- 1. Only teachers and admins create classes.
-- 2. Assignments can only be created in, or moved into, the teacher's own classes.
-- 3. Joining a class needs its join code (join_class), not just a class id.
-- 4. Only the assignment's teacher (or an admin, or the server) sets grades,
--    feedback and grading status on submissions.

drop policy if exists "Teachers can create classes" on public.classes;
create policy "Teachers can create classes" on public.classes for insert to authenticated
  with check (auth.uid() = teacher_id and (public.has_role(auth.uid(), 'teacher') or public.has_role(auth.uid(), 'admin')));

drop policy if exists "Teachers can create assignments" on public.class_assignments;
create policy "Teachers can create assignments" on public.class_assignments for insert to authenticated
  with check (auth.uid() = teacher_id and (public.is_class_teacher(auth.uid(), class_id) or public.has_role(auth.uid(), 'admin')));

drop policy if exists "Teachers can update own assignments" on public.class_assignments;
create policy "Teachers can update own assignments" on public.class_assignments for update to authenticated
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id and (public.is_class_teacher(auth.uid(), class_id) or public.has_role(auth.uid(), 'admin')));

-- Students joined by inserting their own membership for any class id; now the
-- code is checked here. School admins keep their own enrolment policy.
drop policy if exists "Students can join classes" on public.class_members;

create or replace function public.join_class(_code text)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  found_id uuid;
  found_name text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  select c.id, c.name into found_id, found_name
  from public.classes c
  where upper(c.join_code) = upper(trim(_code))
  limit 1;
  if found_id is null then
    return;
  end if;
  insert into public.class_members (class_id, student_id)
  values (found_id, auth.uid())
  on conflict (class_id, student_id) do nothing;
  return query select found_id, found_name;
end;
$$;

revoke all on function public.join_class(text) from public, anon;
grant execute on function public.join_class(text) to authenticated;

-- Grading fields belong to the teacher. Students can still hand in and
-- resubmit; anything they send for grade, feedback or grading status is
-- replaced with what was there before (or nothing, for a new submission).
create or replace function public.protect_submission_grading()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The server (service role) and the assignment's teacher or an admin may set anything
  if auth.uid() is null
    or public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.class_assignments ca where ca.id = new.assignment_id and ca.teacher_id = auth.uid())
  then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.grade := null;
    new.feedback := null;
    new.graded_at := null;
    new.graded_by := null;
    new.max_grade := 100;
    if new.status not in ('submitted', 'resubmitted') then
      new.status := 'submitted';
    end if;
  else
    new.assignment_id := old.assignment_id;
    new.student_id := old.student_id;
    new.grade := old.grade;
    new.feedback := old.feedback;
    new.graded_at := old.graded_at;
    new.graded_by := old.graded_by;
    new.max_grade := old.max_grade;
    if new.status not in ('submitted', 'resubmitted') then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_submission_grading on public.assignment_submissions;
create trigger protect_submission_grading
  before insert or update on public.assignment_submissions
  for each row execute function public.protect_submission_grading();
