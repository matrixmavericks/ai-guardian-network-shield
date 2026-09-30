-- Per-chat context library for the AI assistant: uploaded files (with their
-- extracted text), notes, Google Drive imports, saved replies and generated
-- files. The assistant reads from it on every reply, so content no longer
-- falls out of the conversation after a few dozen messages.

create table if not exists public.chat_context_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_chat_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'file' check (kind in ('file', 'note', 'google', 'output', 'message')),
  name text not null check (char_length(name) between 1 and 300),
  mime text,
  size_bytes bigint,
  storage_path text,
  source_url text,
  content text not null default '',
  char_count integer generated always as (char_length(content)) stored,
  pinned boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_context_items_session_idx on public.chat_context_items (session_id, created_at);
create index if not exists chat_context_items_user_idx on public.chat_context_items (user_id, created_at desc);

alter table public.chat_context_items enable row level security;

drop policy if exists "Owners read their chat context" on public.chat_context_items;
create policy "Owners read their chat context"
  on public.chat_context_items for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Owners add chat context to their own chats" on public.chat_context_items;
create policy "Owners add chat context to their own chats"
  on public.chat_context_items for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.ai_chat_sessions s where s.id = session_id and s.user_id = auth.uid())
  );

drop policy if exists "Owners update their chat context" on public.chat_context_items;
create policy "Owners update their chat context"
  on public.chat_context_items for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Owners delete their chat context" on public.chat_context_items;
create policy "Owners delete their chat context"
  on public.chat_context_items for delete to authenticated
  using (user_id = auth.uid());

drop trigger if exists update_chat_context_items_updated_at on public.chat_context_items;
create trigger update_chat_context_items_updated_at
  before update on public.chat_context_items
  for each row execute function public.update_updated_at_column();

grant select, insert, update, delete on public.chat_context_items to authenticated;

-- Original files, private, one folder per user: <user_id>/<session_id>/<file>
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-files', 'chat-files', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;

drop policy if exists "Chat files: owners read" on storage.objects;
create policy "Chat files: owners read"
  on storage.objects for select to authenticated
  using (bucket_id = 'chat-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Chat files: owners upload" on storage.objects;
create policy "Chat files: owners upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Chat files: owners update" on storage.objects;
create policy "Chat files: owners update"
  on storage.objects for update to authenticated
  using (bucket_id = 'chat-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Chat files: owners delete" on storage.objects;
create policy "Chat files: owners delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'chat-files' and (storage.foldername(name))[1] = auth.uid()::text);
