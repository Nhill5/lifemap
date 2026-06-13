-- §22: Fitbit tokens are server-side only.
drop policy if exists owner_only on public.fitbit_tokens;

create table if not exists public.fitbit_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  scopes text
);
alter table public.fitbit_connections enable row level security;
create policy owner_only on public.fitbit_connections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
