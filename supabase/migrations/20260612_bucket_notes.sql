-- Bucket sketch notes (feature C).
-- A lightweight Excalidraw-style canvas attached to a bucket. The drawing is
-- stored as a JSON element list (strokes + text) in `scene`; multiple notes
-- per bucket are allowed.

create table if not exists public.bucket_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id)   on delete cascade,
  bucket_id  uuid not null references public.buckets(id) on delete cascade,
  title      text,
  scene      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bucket_notes_user_id   on public.bucket_notes(user_id);
create index if not exists idx_bucket_notes_bucket_id on public.bucket_notes(bucket_id);
alter table public.bucket_notes enable row level security;
do $$ begin
  create policy owner_only on public.bucket_notes
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
