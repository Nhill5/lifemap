-- Workout book (feature B).
-- Adds a name to each session (Upper/Lower/Push/Pull/…) and reusable templates
-- (a named routine = an ordered list of exercises you can start a session from).

-- ── 1. Name a workout ───────────────────────────────────────────────
alter table public.workouts add column if not exists name text;

-- ── 2. Reusable templates ───────────────────────────────────────────
create table if not exists public.workout_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_workout_templates_user_id on public.workout_templates(user_id);
alter table public.workout_templates enable row level security;
do $$ begin
  create policy owner_only on public.workout_templates
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

create table if not exists public.workout_template_exercises (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id)         on delete restrict,
  sort_order  int not null default 0
);
create index if not exists idx_workout_template_exercises_template_id
  on public.workout_template_exercises(template_id);
alter table public.workout_template_exercises enable row level security;
-- RLS via sub-select through the owning template (mirrors workout_exercises).
do $$ begin
  create policy owner_only on public.workout_template_exercises
    using (template_id in (select id from public.workout_templates where user_id = auth.uid()))
    with check (template_id in (select id from public.workout_templates where user_id = auth.uid()));
exception when duplicate_object then null; end $$;
