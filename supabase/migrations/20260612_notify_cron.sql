-- Notifications scheduler (feature A).
-- Everything for web push already existed (push_subscriptions, notifications_log,
-- the send-notification Edge Function, the Settings UI) — except the trigger.
-- This wires pg_cron + pg_net to POST the notify-dispatch Edge Function every
-- 15 min; that function decides per-user whether a window just elapsed.
--
-- Secrets are NOT hard-coded here. The cron command reads them from Supabase
-- Vault so this migration is safe to commit. Create the secrets once (values
-- injected out-of-band, e.g. via execute_sql — never committed):
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<the NOTIFY_SECRET edge-function secret>', 'notify_secret');
--
-- The notify-dispatch + send-notification Edge Functions must have a matching
-- NOTIFY_SECRET function secret (plus VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY /
-- VAPID_SUBJECT) set via the dashboard or `supabase secrets set`.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotent: drop a prior copy of the job before (re)creating it.
select cron.unschedule('notify-dispatch')
where exists (select 1 from cron.job where jobname = 'notify-dispatch');

select cron.schedule(
  'notify-dispatch',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/notify-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'notify_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);
