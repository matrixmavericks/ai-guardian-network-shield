-- Presentations made in Refyn Slides (the teacher deck builder). The deck
-- itself (slides, theme, speaker notes) is one JSON document; slide images live
-- in the private studio-media bucket under <user_id>/.

create table if not exists public.studio_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.ai_chat_sessions (id) on delete set null,
  title text not null default 'Untitled presentation' check (char_length(title) <= 300),
  deck jsonb not null default '{}'::jsonb,
  slide_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_decks_user_idx on public.studio_decks (user_id, updated_at desc);
create index if not exists studio_decks_session_idx on public.studio_decks (session_id);

alter table public.studio_decks enable row level security;

drop policy if exists "Owners read their decks" on public.studio_decks;
create policy "Owners read their decks" on public.studio_decks for select to authenticated using (user_id = auth.uid());
drop policy if exists "Owners create decks" on public.studio_decks;
create policy "Owners create decks" on public.studio_decks for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Owners update their decks" on public.studio_decks;
create policy "Owners update their decks" on public.studio_decks for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Owners delete their decks" on public.studio_decks;
create policy "Owners delete their decks" on public.studio_decks for delete to authenticated using (user_id = auth.uid());

drop trigger if exists update_studio_decks_updated_at on public.studio_decks;
create trigger update_studio_decks_updated_at before update on public.studio_decks
  for each row execute function public.update_updated_at_column();

grant select, insert, update, delete on public.studio_decks to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('studio-media', 'studio-media', false, 15728640)
on conflict (id) do update set public = false, file_size_limit = 15728640;

drop policy if exists "Studio media: owners read" on storage.objects;
create policy "Studio media: owners read" on storage.objects for select to authenticated
  using (bucket_id = 'studio-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Studio media: owners upload" on storage.objects;
create policy "Studio media: owners upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'studio-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Studio media: owners delete" on storage.objects;
create policy "Studio media: owners delete" on storage.objects for delete to authenticated
  using (bucket_id = 'studio-media' and (storage.foldername(name))[1] = auth.uid()::text);
