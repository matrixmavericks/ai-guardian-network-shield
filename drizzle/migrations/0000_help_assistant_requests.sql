-- The public help assistant (edge function help-assistant) counts requests per
-- visitor so it can cap AI use: about 10 questions per visitor per hour, and a
-- daily ceiling for the whole site. Only a salted hash of the visitor's IP is
-- kept, never the address. Nobody reads or writes this table except the
-- function (service role), and rows older than two days are cleared out.

create table if not exists public.help_assistant_requests (
  id bigint generated always as identity primary key,
  visitor text not null check (char_length(visitor) = 64),
  created_at timestamptz not null default now()
);
grant all on public.help_assistant_requests to service_role;
create index if not exists help_assistant_requests_visitor_idx on public.help_assistant_requests (visitor, created_at desc);
create index if not exists help_assistant_requests_created_idx on public.help_assistant_requests (created_at);

alter table public.help_assistant_requests enable row level security;
-- No policies: only the service role (which bypasses RLS) touches it.
revoke all on public.help_assistant_requests from anon, authenticated;