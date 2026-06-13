-- recurrence_days: 0=Sun .. 6=Sat (JS getDay). NULL/empty = flexible (cadence_per_week).
-- recurrence_time NULL = untimed (to-do); set = timed block.
alter table public.sub_goals
  add column if not exists recurrence_days smallint[],
  add column if not exists recurrence_time time,
  add column if not exists recurrence_duration_min smallint;
