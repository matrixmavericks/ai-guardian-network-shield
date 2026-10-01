-- The marking loop: a marked submission keeps its criterion levels, comments
-- and targets (assessment, set by the teacher), and the student's reflection on
-- them (reflection, set only by the student through save_reflection).

alter table public.assignment_submissions
  add column if not exists assessment jsonb,
  add column if not exists reflection text,
  add column if not exists reflected_at timestamptz;

alter table public.assignment_submissions drop constraint if exists assignment_submissions_reflection_size;
alter table public.assignment_submissions add constraint assignment_submissions_reflection_size check (reflection is null or char_length(reflection) <= 4000);

-- Grading fields (now including assessment) stay the teacher's; the
-- reflection stays the student's.
create or replace function public.protect_submission_grading()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;

  if exists (select 1 from public.class_assignments ca where ca.id = new.assignment_id and ca.teacher_id = auth.uid()) then
    -- Teachers mark; they don't write the student's reflection
    if tg_op = 'INSERT' then
      new.reflection := null;
      new.reflected_at := null;
    else
      new.reflection := old.reflection;
      new.reflected_at := old.reflected_at;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.grade := null;
    new.feedback := null;
    new.graded_at := null;
    new.graded_by := null;
    new.max_grade := 100;
    new.assessment := null;
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
    new.assessment := old.assessment;
    if new.status not in ('submitted', 'resubmitted') then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

-- Students can't update marked submissions (the update policy needs grade is
-- null), so the reflection goes through here: own submission, reflection only.
create or replace function public.save_reflection(_submission uuid, _text text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  stamp timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  update public.assignment_submissions
  set reflection = nullif(left(trim(_text), 4000), ''), reflected_at = stamp
  where id = _submission and student_id = auth.uid();
  if not found then
    raise exception 'Submission not found';
  end if;
  return stamp;
end;
$$;

revoke all on function public.save_reflection(uuid, text) from public, anon;
grant execute on function public.save_reflection(uuid, text) to authenticated;
