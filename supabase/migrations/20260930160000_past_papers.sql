-- Past papers: a school's own copies of past IB papers, markschemes and subject
-- reports (bought from the IB store or downloaded from the Programme Resource
-- Centre). Teachers upload them; the text is extracted in the browser so the AI
-- can quote and cite real questions. Visible to the uploader and to teachers and
-- admins at the same school, never to students. Originals live in the private
-- past-papers bucket under <uploader_id>/.

create table if not exists public.past_papers (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  school_id uuid references public.schools (id) on delete cascade,
  subject_group text not null check (subject_group in (
    'sciences', 'mathematics', 'language-literature', 'individuals-societies', 'language-acquisition',
    'arts', 'design', 'phe', 'interdisciplinary', 'dp', 'other')),
  subject text not null check (char_length(subject) between 1 and 80),
  session text not null check (char_length(session) between 1 and 40),
  kind text not null check (kind in ('paper', 'markscheme', 'specimen', 'report', 'other')),
  title text not null check (char_length(title) between 1 and 200),
  content text not null default '' check (char_length(content) <= 600000),
  char_count integer generated always as (char_length(content)) stored,
  pages integer,
  file_path text,
  file_name text,
  created_at timestamptz not null default now()
);

create index if not exists past_papers_school_idx on public.past_papers (school_id, subject_group);
create index if not exists past_papers_uploader_idx on public.past_papers (uploaded_by, subject_group);

alter table public.past_papers enable row level security;

drop policy if exists "Past papers: read own or school's" on public.past_papers;
create policy "Past papers: read own or school's" on public.past_papers for select to authenticated using (
  uploaded_by = auth.uid()
  or public.has_role(auth.uid(), 'admin')
  or (
    school_id is not null
    and public.is_school_member(auth.uid(), school_id)
    and public.has_role(auth.uid(), 'teacher')
  )
);

drop policy if exists "Past papers: staff upload" on public.past_papers;
create policy "Past papers: staff upload" on public.past_papers for insert to authenticated with check (
  uploaded_by = auth.uid()
  and (public.has_role(auth.uid(), 'teacher') or public.has_role(auth.uid(), 'admin'))
  and (school_id is null or public.is_school_member(auth.uid(), school_id))
);

drop policy if exists "Past papers: uploader edits" on public.past_papers;
create policy "Past papers: uploader edits" on public.past_papers for update to authenticated
  using (uploaded_by = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (uploaded_by = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Past papers: uploader deletes" on public.past_papers;
create policy "Past papers: uploader deletes" on public.past_papers for delete to authenticated
  using (uploaded_by = auth.uid() or public.has_role(auth.uid(), 'admin'));

grant select, insert, update, delete on public.past_papers to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('past-papers', 'past-papers', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- Anyone who can see the row can open the original file
drop policy if exists "Past papers files: read" on storage.objects;
create policy "Past papers files: read" on storage.objects for select to authenticated using (
  bucket_id = 'past-papers'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.past_papers p where p.file_path = storage.objects.name)
  )
);
drop policy if exists "Past papers files: staff upload" on storage.objects;
create policy "Past papers files: staff upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'past-papers'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (public.has_role(auth.uid(), 'teacher') or public.has_role(auth.uid(), 'admin'))
);
drop policy if exists "Past papers files: owner deletes" on storage.objects;
create policy "Past papers files: owner deletes" on storage.objects for delete to authenticated using (
  bucket_id = 'past-papers'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin'))
);
