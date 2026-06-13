-- Outcome tracker: dated measurements of a chief goal's real value.
create table if not exists public.chief_goal_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chief_goal_id uuid not null references public.chief_goals(id) on delete cascade,
  date date not null,
  value numeric not null,
  created_at timestamptz not null default now(),
  unique (chief_goal_id, date)
);
alter table public.chief_goal_progress enable row level security;
create policy owner_only on public.chief_goal_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists chief_goal_progress_goal_date_idx
  on public.chief_goal_progress (chief_goal_id, date);
