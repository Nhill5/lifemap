-- Optional free-text description/notes per task occurrence (shown on the Day view).
alter table public.blocks add column if not exists description text;
