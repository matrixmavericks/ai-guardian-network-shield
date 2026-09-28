-- Which chat models the AI gateway actually serves for this app. The ai-chat
-- function probes the catalogue every few hours and records results here, so
-- the model picker can hide models that aren't live. Written with the service
-- role only; signed-in users may read it.

create table if not exists public.ai_model_availability (
  model text primary key,
  available boolean not null,
  gateway_id text,
  detail text,
  checked_at timestamptz not null default now()
);

alter table public.ai_model_availability enable row level security;

drop policy if exists "Signed-in users can read model availability" on public.ai_model_availability;
create policy "Signed-in users can read model availability"
  on public.ai_model_availability for select to authenticated
  using (true);
