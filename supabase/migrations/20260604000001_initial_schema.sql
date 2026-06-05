-- LifeMap Phase 1 schema (§19)
-- Applied to cloud project icbqwrlndzuflnasffbl via Supabase MCP.
-- For local dev: supabase start && supabase db push
--
-- fitbit_tokens encryption plan (Fitbit PR):
--   access_token / refresh_token stored as TEXT here.
--   The Fitbit PR migration will convert to BYTEA and apply
--   pgsodium.crypto_aead_det_encrypt (symmetric AEAD, key in Supabase Vault).
--   Only Edge Functions with service_role call the decrypt wrapper;
--   RLS already prevents anon/user-level reads of raw column values.

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE public.bucket_state        AS ENUM ('thriving','steady','wilting','parked');
CREATE TYPE public.goal_status         AS ENUM ('active','achieved','abandoned','replaced');
CREATE TYPE public.sub_goal_type       AS ENUM ('schedule_it','track_it');
CREATE TYPE public.data_source         AS ENUM ('manual','fitbit','workout_logger');
CREATE TYPE public.task_status         AS ENUM ('todo','done','dropped');
CREATE TYPE public.block_status        AS ENUM ('planned','done','missed','moved');
CREATE TYPE public.block_source        AS ENUM ('sub_goal','task','external');
CREATE TYPE public.track_rating        AS ENUM ('hit','close','missed');
CREATE TYPE public.event_type          AS ENUM ('task','subgoal','milestone','chief_goal','unlock','comeback','PR');
CREATE TYPE public.accountability_dial AS ENUM ('gentle','balanced','drill');
CREATE TYPE public.journal_scope       AS ENUM ('day','week');
CREATE TYPE public.fitbit_metric       AS ENUM ('steps','sleep','resting_hr','active_minutes');
CREATE TYPE public.onboarding_state    AS ENUM ('not_started','buckets','goals','first_plan','complete');
CREATE TYPE public.notification_type   AS ENUM ('morning_kickoff','drift_catch','slip_catch','evening_mirror','celebration');
CREATE TYPE public.feature_unlock      AS ENUM ('week_zoom','month_zoom','bucket_depth','life_gpa');
CREATE TYPE public.weight_unit         AS ENUM ('lb','kg');
CREATE TYPE public.accent_slot         AS ENUM ('school','work','fitness','looks','hobby');

-- ============================================================
-- PROFILES  (id = auth.users.id)
-- ============================================================
CREATE TABLE public.profiles (
  id                   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone             text NOT NULL DEFAULT 'UTC',
  wake_time            time,
  sleep_time           time,
  accountability_dial  public.accountability_dial NOT NULL DEFAULT 'balanced',
  notification_windows jsonb,
  quiet_hours          jsonb,
  onboarding_state     public.onboarding_state NOT NULL DEFAULT 'not_started',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.profiles
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- BUCKETS
-- ============================================================
CREATE TABLE public.buckets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       public.accent_slot NOT NULL,
  state       public.bucket_state NOT NULL DEFAULT 'steady',
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX idx_buckets_user_id ON public.buckets(user_id);
ALTER TABLE public.buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.buckets
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- CHIEF GOALS
-- ============================================================
CREATE TABLE public.chief_goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id      uuid NOT NULL REFERENCES public.buckets(id)     ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id)          ON DELETE CASCADE,
  title          text NOT NULL,
  target_value   numeric,
  target_unit    text,
  baseline_value numeric,
  deadline       date,
  status         public.goal_status NOT NULL DEFAULT 'active',
  achieved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chief_goals_user_id   ON public.chief_goals(user_id);
CREATE INDEX idx_chief_goals_bucket_id ON public.chief_goals(bucket_id);
-- §19: one active chief goal per bucket
CREATE UNIQUE INDEX one_active_chief_goal_per_bucket
  ON public.chief_goals(bucket_id) WHERE (status = 'active');
ALTER TABLE public.chief_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.chief_goals
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- SUB GOALS
-- ============================================================
CREATE TABLE public.sub_goals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id        uuid NOT NULL REFERENCES public.buckets(id)      ON DELETE CASCADE,
  chief_goal_id    uuid          REFERENCES public.chief_goals(id)  ON DELETE SET NULL,
  user_id          uuid NOT NULL REFERENCES auth.users(id)           ON DELETE CASCADE,
  title            text NOT NULL,
  type             public.sub_goal_type NOT NULL,
  cadence_per_week int,
  daily_target     numeric,
  target_unit      text,
  data_source      public.data_source NOT NULL DEFAULT 'manual',
  status           public.goal_status NOT NULL DEFAULT 'active',
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sub_goals_user_id       ON public.sub_goals(user_id);
CREATE INDEX idx_sub_goals_bucket_id     ON public.sub_goals(bucket_id);
CREATE INDEX idx_sub_goals_chief_goal_id ON public.sub_goals(chief_goal_id);
ALTER TABLE public.sub_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.sub_goals
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE public.tasks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id      uuid REFERENCES public.buckets(id)     ON DELETE SET NULL,
  chief_goal_id  uuid REFERENCES public.chief_goals(id) ON DELETE SET NULL,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          text NOT NULL,
  status         public.task_status NOT NULL DEFAULT 'todo',
  due_date       date,
  rollover_count int NOT NULL DEFAULT 0,
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_user_id       ON public.tasks(user_id);
CREATE INDEX idx_tasks_bucket_id     ON public.tasks(bucket_id);
CREATE INDEX idx_tasks_chief_goal_id ON public.tasks(chief_goal_id);
CREATE INDEX idx_tasks_due_date      ON public.tasks(user_id, due_date);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.tasks
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- BLOCKS
-- ============================================================
CREATE TABLE public.blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  sub_goal_id uuid          REFERENCES public.sub_goals(id) ON DELETE SET NULL,
  task_id     uuid          REFERENCES public.tasks(id)     ON DELETE SET NULL,
  source      public.block_source NOT NULL,
  title       text NOT NULL,
  date        date NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  status      public.block_status NOT NULL DEFAULT 'planned'
);
CREATE INDEX idx_blocks_user_id     ON public.blocks(user_id);
CREATE INDEX idx_blocks_date        ON public.blocks(user_id, date);
CREATE INDEX idx_blocks_sub_goal_id ON public.blocks(sub_goal_id);
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.blocks
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- DAY PLANS
-- ============================================================
CREATE TABLE public.day_plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         date NOT NULL,
  committed_at timestamptz,
  UNIQUE (user_id, date)
);
CREATE INDEX idx_day_plans_user_id ON public.day_plans(user_id);
ALTER TABLE public.day_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.day_plans
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- TRACK LOGS
-- ============================================================
CREATE TABLE public.track_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  sub_goal_id uuid NOT NULL REFERENCES public.sub_goals(id) ON DELETE CASCADE,
  date        date NOT NULL,
  value       numeric,
  rating      public.track_rating,
  source      public.data_source NOT NULL DEFAULT 'manual',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_track_logs_user_id     ON public.track_logs(user_id);
CREATE INDEX idx_track_logs_sub_goal_id ON public.track_logs(sub_goal_id);
CREATE INDEX idx_track_logs_date        ON public.track_logs(user_id, date);
ALTER TABLE public.track_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.track_logs
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- EXERCISES  (user_id nullable = global starter library)
-- ============================================================
CREATE TABLE public.exercises (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  muscle_group text
);
CREATE INDEX idx_exercises_user_id ON public.exercises(user_id);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_global_or_own ON public.exercises
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY insert_own ON public.exercises
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY update_own ON public.exercises
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY delete_own ON public.exercises
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- WORKOUTS
-- ============================================================
CREATE TABLE public.workouts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  block_id   uuid          REFERENCES public.blocks(id) ON DELETE SET NULL,
  date       date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX idx_workouts_date    ON public.workouts(user_id, date);
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.workouts
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- WORKOUT EXERCISES  (RLS via sub-select through workouts)
-- ============================================================
CREATE TABLE public.workout_exercises (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id  uuid NOT NULL REFERENCES public.workouts(id)   ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id)  ON DELETE RESTRICT,
  sort_order  int NOT NULL DEFAULT 0
);
CREATE INDEX idx_workout_exercises_workout_id ON public.workout_exercises(workout_id);
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.workout_exercises
  USING  (workout_id IN (SELECT id FROM public.workouts WHERE user_id = auth.uid()))
  WITH CHECK (workout_id IN (SELECT id FROM public.workouts WHERE user_id = auth.uid()));

-- ============================================================
-- WORKOUT SETS  (RLS via 2-level sub-select)
-- ============================================================
CREATE TABLE public.workout_sets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id uuid NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number          int NOT NULL,
  reps                int,
  weight              numeric,
  unit                public.weight_unit NOT NULL DEFAULT 'lb'
);
CREATE INDEX idx_workout_sets_weid ON public.workout_sets(workout_exercise_id);
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.workout_sets
  USING (
    workout_exercise_id IN (
      SELECT we.id FROM public.workout_exercises we
      JOIN   public.workouts w ON w.id = we.workout_id
      WHERE  w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workout_exercise_id IN (
      SELECT we.id FROM public.workout_exercises we
      JOIN   public.workouts w ON w.id = we.workout_id
      WHERE  w.user_id = auth.uid()
    )
  );

-- ============================================================
-- FITBIT TOKENS
-- ============================================================
CREATE TABLE public.fitbit_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  text NOT NULL,
  refresh_token text NOT NULL,
  expires_at    timestamptz NOT NULL
);
ALTER TABLE public.fitbit_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.fitbit_tokens
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- FITBIT DATA
-- ============================================================
CREATE TABLE public.fitbit_data (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date      date NOT NULL,
  metric    public.fitbit_metric NOT NULL,
  value     numeric NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, metric)
);
CREATE INDEX idx_fitbit_data_user_id ON public.fitbit_data(user_id);
CREATE INDEX idx_fitbit_data_date    ON public.fitbit_data(user_id, date);
ALTER TABLE public.fitbit_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.fitbit_data
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- JOURNAL ENTRIES
-- ============================================================
CREATE TABLE public.journal_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           date NOT NULL,
  scope          public.journal_scope NOT NULL,
  prompt         text NOT NULL DEFAULT '',
  body           text NOT NULL DEFAULT '',
  linked_context jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_journal_entries_user_id ON public.journal_entries(user_id);
CREATE INDEX idx_journal_entries_date    ON public.journal_entries(user_id, date);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.journal_entries
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE public.events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       public.event_type NOT NULL,
  weight     int NOT NULL DEFAULT 1,
  payload    jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_user_id    ON public.events(user_id);
CREATE INDEX idx_events_created_at ON public.events(user_id, created_at DESC);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.events
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- UNLOCKS
-- ============================================================
CREATE TABLE public.unlocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature     public.feature_unlock NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature)
);
CREATE INDEX idx_unlocks_user_id ON public.unlocks(user_id);
ALTER TABLE public.unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.unlocks
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS LOG
-- ============================================================
CREATE TABLE public.notifications_log (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type    public.notification_type NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  date    date NOT NULL
);
CREATE INDEX idx_notifications_log_user_id ON public.notifications_log(user_id);
CREATE INDEX idx_notifications_log_date    ON public.notifications_log(user_id, date);
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_only ON public.notifications_log
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
