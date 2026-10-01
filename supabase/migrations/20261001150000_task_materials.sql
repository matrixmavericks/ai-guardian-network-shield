-- The full task students see: instructions, the worksheet itself, resources and
-- a rubric, alongside the short description assignments already had. Access
-- follows the existing class_assignments policies (class members read, the
-- teacher who set it writes).

alter table public.class_assignments
  add column if not exists instructions text,
  add column if not exists worksheet text,
  add column if not exists resources jsonb not null default '[]'::jsonb,
  add column if not exists rubric jsonb;

alter table public.class_assignments drop constraint if exists class_assignments_worksheet_size;
alter table public.class_assignments add constraint class_assignments_worksheet_size check (worksheet is null or char_length(worksheet) <= 300000);
alter table public.class_assignments drop constraint if exists class_assignments_instructions_size;
alter table public.class_assignments add constraint class_assignments_instructions_size check (instructions is null or char_length(instructions) <= 60000);

-- Task files live under <class_id>/<assignment_id>/<file>. The class's teacher
-- (or an admin) manages them; the class's students can read them.
insert into storage.buckets (id, name, public, file_size_limit)
values ('task-files', 'task-files', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "Task files: class can read" on storage.objects;
create policy "Task files: class can read" on storage.objects for select to authenticated using (
  bucket_id = 'task-files' and (
    exists (select 1 from public.class_members m where m.class_id::text = (storage.foldername(name))[1] and m.student_id = auth.uid())
    or exists (select 1 from public.classes c where c.id::text = (storage.foldername(name))[1] and c.teacher_id = auth.uid())
    or public.has_role(auth.uid(), 'admin')
  )
);

drop policy if exists "Task files: teacher can add" on storage.objects;
create policy "Task files: teacher can add" on storage.objects for insert to authenticated with check (
  bucket_id = 'task-files' and (
    exists (select 1 from public.classes c where c.id::text = (storage.foldername(name))[1] and c.teacher_id = auth.uid())
    or public.has_role(auth.uid(), 'admin')
  )
);

drop policy if exists "Task files: teacher can change" on storage.objects;
create policy "Task files: teacher can change" on storage.objects for update to authenticated using (
  bucket_id = 'task-files' and (
    exists (select 1 from public.classes c where c.id::text = (storage.foldername(name))[1] and c.teacher_id = auth.uid())
    or public.has_role(auth.uid(), 'admin')
  )
);

drop policy if exists "Task files: teacher can remove" on storage.objects;
create policy "Task files: teacher can remove" on storage.objects for delete to authenticated using (
  bucket_id = 'task-files' and (
    exists (select 1 from public.classes c where c.id::text = (storage.foldername(name))[1] and c.teacher_id = auth.uid())
    or public.has_role(auth.uid(), 'admin')
  )
);
