-- Personal project coach: keep the student's original report file (PDF or
-- Word) so feedback can be shown as annotations on the real document.
-- Private bucket, owner-only, under <user_id>/.

alter table public.pp_reviews add column if not exists file_path text;
alter table public.pp_reviews add column if not exists file_type text check (file_type in ('pdf', 'docx'));

insert into storage.buckets (id, name, public, file_size_limit)
values ('pp-files', 'pp-files', false, 31457280)
on conflict (id) do update set public = false, file_size_limit = 31457280;

drop policy if exists "PP files: owner reads" on storage.objects;
create policy "PP files: owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'pp-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "PP files: owner uploads" on storage.objects;
create policy "PP files: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'pp-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "PP files: owner deletes" on storage.objects;
create policy "PP files: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'pp-files' and (storage.foldername(name))[1] = auth.uid()::text);
