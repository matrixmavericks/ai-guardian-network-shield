-- Gems (custom AI assistants and role-play characters), Worlds (a space per
-- unit or subject: notes, files, flashcards, linked tasks, role-play scenes,
-- a guide Gem) and the Brain's concept cache.
-- Everything is private to its owner unless a teacher shares it with classes
-- they teach; class members can then use it (read-only).

create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  subject text check (subject is null or char_length(subject) <= 60),
  description text check (description is null or char_length(description) <= 4000),
  emoji text check (emoji is null or char_length(emoji) <= 16),
  color text not null default 'blue' check (color in ('blue', 'violet', 'aqua', 'amber', 'rose', 'emerald', 'orange', 'slate')),
  visibility text not null default 'private' check (visibility in ('private', 'classes')),
  class_ids uuid[] not null default '{}',
  guide_gem_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists worlds_owner_idx on public.worlds (owner_id, updated_at desc);

create table if not exists public.gems (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'assistant' check (kind in ('assistant', 'character')),
  name text not null check (char_length(name) between 1 and 60),
  tagline text check (tagline is null or char_length(tagline) <= 160),
  emoji text check (emoji is null or char_length(emoji) <= 16),
  color text not null default 'blue' check (color in ('blue', 'violet', 'aqua', 'amber', 'rose', 'emerald', 'orange', 'slate')),
  instructions text not null default '' check (char_length(instructions) <= 8000),
  starters text[] not null default '{}',
  -- [{id, name, chars, text}]: text extracted from uploaded files
  knowledge jsonb not null default '[]'::jsonb check (octet_length(knowledge::text) <= 600000),
  world_id uuid references public.worlds (id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('private', 'classes')),
  class_ids uuid[] not null default '{}',
  uses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gems_owner_idx on public.gems (owner_id, updated_at desc);

alter table public.worlds drop constraint if exists worlds_guide_gem_fkey;
alter table public.worlds add constraint worlds_guide_gem_fkey foreign key (guide_gem_id) references public.gems (id) on delete set null;

create table if not exists public.world_items (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('note', 'file', 'link', 'flashcards', 'task')),
  title text not null check (char_length(title) between 1 and 200),
  content text not null default '' check (char_length(content) <= 200000),
  data jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists world_items_world_idx on public.world_items (world_id, position);

create table if not exists public.world_scenes (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  setting text not null default '' check (char_length(setting) <= 4000),
  role text not null default '' check (char_length(role) <= 600),
  -- [{name, emoji, persona}]
  characters jsonb not null default '[]'::jsonb check (octet_length(characters::text) <= 20000),
  goals text[] not null default '{}',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists world_scenes_world_idx on public.world_scenes (world_id, position);

-- Who can see a World (and so its items, scenes and guide)
create or replace function public.can_view_world(_world uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.worlds w
    where w.id = _world
      and (w.owner_id = auth.uid()
        or (w.visibility = 'classes' and exists (
          select 1 from unnest(w.class_ids) c where public.is_class_member(auth.uid(), c) or public.is_class_teacher(auth.uid(), c))))
  );
$$;

-- Sharing is only to classes the owner teaches
create or replace function public.teaches_all(_classes uuid[])
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from unnest(_classes) c where not public.is_class_teacher(auth.uid(), c));
$$;

alter table public.worlds enable row level security;
drop policy if exists "Worlds: view" on public.worlds;
create policy "Worlds: view" on public.worlds for select to authenticated using (public.can_view_world(id));
drop policy if exists "Worlds: owner writes" on public.worlds;
create policy "Worlds: owner writes" on public.worlds for insert to authenticated
  with check (owner_id = auth.uid() and (visibility = 'private' or public.teaches_all(class_ids)));
drop policy if exists "Worlds: owner updates" on public.worlds;
create policy "Worlds: owner updates" on public.worlds for update to authenticated using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and (visibility = 'private' or public.teaches_all(class_ids)));
drop policy if exists "Worlds: owner deletes" on public.worlds;
create policy "Worlds: owner deletes" on public.worlds for delete to authenticated using (owner_id = auth.uid());

alter table public.gems enable row level security;
drop policy if exists "Gems: view" on public.gems;
create policy "Gems: view" on public.gems for select to authenticated using (
  owner_id = auth.uid()
  or (visibility = 'classes' and exists (select 1 from unnest(class_ids) c where public.is_class_member(auth.uid(), c) or public.is_class_teacher(auth.uid(), c)))
  or (world_id is not null and public.can_view_world(world_id))
);
drop policy if exists "Gems: owner writes" on public.gems;
create policy "Gems: owner writes" on public.gems for insert to authenticated
  with check (owner_id = auth.uid() and (visibility = 'private' or public.teaches_all(class_ids)));
drop policy if exists "Gems: owner updates" on public.gems;
create policy "Gems: owner updates" on public.gems for update to authenticated using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and (visibility = 'private' or public.teaches_all(class_ids)));
drop policy if exists "Gems: owner deletes" on public.gems;
create policy "Gems: owner deletes" on public.gems for delete to authenticated using (owner_id = auth.uid());

alter table public.world_items enable row level security;
drop policy if exists "World items: view" on public.world_items;
create policy "World items: view" on public.world_items for select to authenticated using (public.can_view_world(world_id));
drop policy if exists "World items: owner writes" on public.world_items;
create policy "World items: owner writes" on public.world_items for all to authenticated
  using (exists (select 1 from public.worlds w where w.id = world_id and w.owner_id = auth.uid()))
  with check (owner_id = auth.uid() and exists (select 1 from public.worlds w where w.id = world_id and w.owner_id = auth.uid()));

alter table public.world_scenes enable row level security;
drop policy if exists "World scenes: view" on public.world_scenes;
create policy "World scenes: view" on public.world_scenes for select to authenticated using (public.can_view_world(world_id));
drop policy if exists "World scenes: owner writes" on public.world_scenes;
create policy "World scenes: owner writes" on public.world_scenes for all to authenticated
  using (exists (select 1 from public.worlds w where w.id = world_id and w.owner_id = auth.uid()))
  with check (owner_id = auth.uid() and exists (select 1 from public.worlds w where w.id = world_id and w.owner_id = auth.uid()));

grant select, insert, update, delete on public.worlds, public.gems, public.world_items, public.world_scenes to authenticated;

do $$ begin
  create trigger update_worlds_updated_at before update on public.worlds for each row execute function public.update_updated_at_column();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger update_gems_updated_at before update on public.gems for each row execute function public.update_updated_at_column();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger update_world_items_updated_at before update on public.world_items for each row execute function public.update_updated_at_column();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger update_world_scenes_updated_at before update on public.world_scenes for each row execute function public.update_updated_at_column();
exception when duplicate_object then null; end $$;

-- Chats remember which Gem, World or scene they belong to
alter table public.ai_chat_sessions
  add column if not exists gem_id uuid references public.gems (id) on delete set null,
  add column if not exists world_id uuid references public.worlds (id) on delete set null,
  add column if not exists scene_id uuid references public.world_scenes (id) on delete set null;

-- World files: <world_id>/<uuid>-<name>; the World's viewers read, its owner writes
insert into storage.buckets (id, name, public, file_size_limit)
values ('world-files', 'world-files', false, 52428800)
on conflict (id) do nothing;
drop policy if exists "World files: viewers read" on storage.objects;
create policy "World files: viewers read" on storage.objects for select to authenticated using (
  bucket_id = 'world-files' and exists (select 1 from public.worlds w where w.id::text = (storage.foldername(name))[1] and public.can_view_world(w.id))
);
drop policy if exists "World files: owner adds" on storage.objects;
create policy "World files: owner adds" on storage.objects for insert to authenticated with check (
  bucket_id = 'world-files' and exists (select 1 from public.worlds w where w.id::text = (storage.foldername(name))[1] and w.owner_id = auth.uid())
);
drop policy if exists "World files: owner removes" on storage.objects;
create policy "World files: owner removes" on storage.objects for delete to authenticated using (
  bucket_id = 'world-files' and exists (select 1 from public.worlds w where w.id::text = (storage.foldername(name))[1] and w.owner_id = auth.uid())
);

-- The Brain: concepts extracted from each item, cached by content hash
create table if not exists public.brain_concepts (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null check (char_length(item_key) <= 120),
  hash text not null,
  concepts text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, item_key)
);
alter table public.brain_concepts enable row level security;
drop policy if exists "Brain concepts: own" on public.brain_concepts;
create policy "Brain concepts: own" on public.brain_concepts for select to authenticated using (user_id = auth.uid());
grant select on public.brain_concepts to authenticated;

-- Short text from a person's chats, files and World items, so the Brain can
-- find the ideas that link them (one call instead of one per chat)
create or replace function public.brain_snippets()
returns table (key text, kind text, title text, snippet text, parent text, at timestamptz)
language sql stable security definer set search_path = public as $$
  (select 'chat:' || s.id, 'chat', coalesce(s.title, 'Chat'),
          left(coalesce((select m.content from public.ai_chat_messages m where m.session_id = s.id and m.role = 'user' order by m.created_at limit 1), ''), 300),
          coalesce('gem:' || s.gem_id, 'world:' || s.world_id), s.updated_at
   from public.ai_chat_sessions s where s.user_id = auth.uid() order by s.updated_at desc limit 80)
  union all
  (select 'file:' || c.id, c.kind, c.name, left(coalesce(c.content, ''), 400), 'chat:' || c.session_id, c.created_at
   from public.chat_context_items c where c.user_id = auth.uid() order by c.created_at desc limit 100)
  union all
  (select 'witem:' || i.id, i.kind, i.title, left(i.content, 400), 'world:' || i.world_id, i.updated_at
   from public.world_items i where public.can_view_world(i.world_id) order by i.updated_at desc limit 120);
$$;
revoke all on function public.brain_snippets() from public, anon;
grant execute on function public.brain_snippets() to authenticated;
