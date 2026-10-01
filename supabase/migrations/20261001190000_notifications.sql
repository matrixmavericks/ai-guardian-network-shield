-- In-app notifications. Rows are written only by the triggers and the hourly
-- reminder job below (security definer); people read, mark read and delete
-- their own. Delivered live through Supabase Realtime. A notification can
-- never block the action that caused it: every trigger swallows its own errors.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('task_set', 'task_due', 'task_marked', 'submission', 'reflection', 'message')),
  title text not null check (char_length(title) <= 300),
  body text check (body is null or char_length(body) <= 600),
  link text check (link is null or char_length(link) <= 300),
  data jsonb not null default '{}'::jsonb,
  -- One reminder per thing (e.g. due:<task>), so jobs can run repeatedly
  dedupe text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create unique index if not exists notifications_dedupe_idx on public.notifications (user_id, dedupe) where dedupe is not null;

alter table public.notifications enable row level security;
drop policy if exists "Notifications: read own" on public.notifications;
create policy "Notifications: read own" on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "Notifications: mark own read" on public.notifications;
create policy "Notifications: mark own read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Notifications: clear own" on public.notifications;
create policy "Notifications: clear own" on public.notifications for delete to authenticated using (user_id = auth.uid());
grant select, update, delete on public.notifications to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

create or replace function public.person_name(_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(trim(full_name), '') from public.profiles where user_id = _user limit 1), 'Someone');
$$;

-- A task is set: everyone in the class
create or replace function public.notify_task_set()
returns trigger language plpgsql security definer set search_path = public as $$
declare cname text;
begin
  begin
    select name into cname from public.classes where id = new.class_id;
    insert into public.notifications (user_id, kind, title, body, link, data, dedupe)
    select m.student_id, 'task_set', left('New task: ' || new.title, 300), cname, '/task/' || new.id,
           jsonb_build_object('task', new.id, 'due', new.due_date, 'class', cname), 'set:' || new.id
    from public.class_members m
    where m.class_id = new.class_id
    on conflict do nothing;
  exception when others then
    raise warning 'notify_task_set: %', sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists notify_task_set on public.class_assignments;
create trigger notify_task_set after insert on public.class_assignments for each row execute function public.notify_task_set();

-- Hand-ins (to the teacher), marks (to the student), reflections (to the teacher)
create or replace function public.notify_submission()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  begin
    select ca.id, ca.title, ca.teacher_id into a from public.class_assignments ca where ca.id = new.assignment_id;
    if a.id is null then
      return new;
    end if;

    if tg_op = 'INSERT' then
      insert into public.notifications (user_id, kind, title, link, data)
      values (a.teacher_id, 'submission', left(public.person_name(new.student_id) || ' handed in ' || a.title, 300), '/task/' || a.id,
              jsonb_build_object('task', a.id, 'student', new.student_id));
      return new;
    end if;

    if new.submitted_at is distinct from old.submitted_at and new.status = 'resubmitted' then
      insert into public.notifications (user_id, kind, title, link, data)
      values (a.teacher_id, 'submission', left(public.person_name(new.student_id) || ' resubmitted ' || a.title, 300), '/task/' || a.id,
              jsonb_build_object('task', a.id, 'student', new.student_id));
    end if;

    if (old.grade is null and new.grade is not null) or (old.status is distinct from 'graded' and new.status = 'graded') then
      insert into public.notifications (user_id, kind, title, body, link, data)
      values (new.student_id, 'task_marked', left('Marked: ' || a.title, 300),
              case when new.assessment ? 'targets' then 'Your levels, feedback and targets are ready.' else 'Your mark and feedback are ready.' end,
              '/task/' || a.id, jsonb_build_object('task', a.id));
    end if;

    if old.reflection is null and new.reflection is not null then
      insert into public.notifications (user_id, kind, title, body, link, data)
      values (a.teacher_id, 'reflection', left(public.person_name(new.student_id) || ' reflected on ' || a.title, 300), left(new.reflection, 600),
              '/task/' || a.id, jsonb_build_object('task', a.id, 'student', new.student_id));
    end if;
  exception when others then
    raise warning 'notify_submission: %', sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists notify_submission on public.assignment_submissions;
create trigger notify_submission after insert or update on public.assignment_submissions for each row execute function public.notify_submission();

-- Messages
create or replace function public.notify_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into public.notifications (user_id, kind, title, body, link, data)
    values (new.receiver_id, 'message', left('Message from ' || public.person_name(new.sender_id), 300), left(new.content, 600), '/messages',
            jsonb_build_object('from', new.sender_id));
  exception when others then
    raise warning 'notify_message: %', sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists notify_message on public.messages;
create trigger notify_message after insert on public.messages for each row execute function public.notify_message();

-- Hourly: tasks due in the next 24 hours that a student hasn't handed in
create or replace function public.remind_due_tasks()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into public.notifications (user_id, kind, title, body, link, data, dedupe)
  select m.student_id, 'task_due', left('Due soon: ' || a.title, 300), c.name, '/task/' || a.id,
         jsonb_build_object('task', a.id, 'due', a.due_date, 'class', c.name), 'due:' || a.id
  from public.class_assignments a
  join public.classes c on c.id = a.class_id
  join public.class_members m on m.class_id = a.class_id
  where a.due_date > now() and a.due_date <= now() + interval '24 hours'
    and not exists (select 1 from public.assignment_submissions s where s.assignment_id = a.id and s.student_id = m.student_id)
  on conflict do nothing;
  get diagnostics n = row_count;
  -- Keep the table small: drop read notifications after 90 days
  delete from public.notifications where read_at is not null and created_at < now() - interval '90 days';
  return n;
end $$;
revoke all on function public.remind_due_tasks() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('refyn-due-reminders');
exception when others then null;
end $$;
select cron.schedule('refyn-due-reminders', '5 * * * *', $$select public.remind_due_tasks();$$);
