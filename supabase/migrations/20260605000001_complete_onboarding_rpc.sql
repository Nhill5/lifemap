-- Atomically inserts buckets + chief_goals + marks onboarding complete.
-- Idempotent: returns silently if onboarding_state is already 'complete'.
-- Retryable: deletes any partial state before re-inserting (cascade cleans goals).
--
-- p_buckets shape: [{name, color, sort_order, goal_title, goal_deadline?}]

CREATE OR REPLACE FUNCTION public.complete_onboarding(p_buckets jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Idempotency: already complete → no-op
  IF EXISTS (
    SELECT 1 FROM profiles WHERE id = v_uid AND onboarding_state = 'complete'
  ) THEN
    RETURN;
  END IF;

  -- Clean up any partial previous attempt
  -- (ON DELETE CASCADE on chief_goals.bucket_id handles goal cleanup)
  DELETE FROM buckets WHERE user_id = v_uid;

  -- Single CTE: insert buckets, capture IDs, insert goals — one statement
  WITH new_buckets AS (
    INSERT INTO buckets (user_id, name, color, state, sort_order)
    SELECT
      v_uid,
      b->>'name',
      (b->>'color')::accent_slot,
      'steady',
      (b->>'sort_order')::int
    FROM jsonb_array_elements(p_buckets) b
    RETURNING id, sort_order
  )
  INSERT INTO chief_goals (user_id, bucket_id, title, deadline, status)
  SELECT
    v_uid,
    nb.id,
    b->>'goal_title',
    NULLIF(b->>'goal_deadline', '')::date,
    'active'::goal_status
  FROM jsonb_array_elements(p_buckets) b
  JOIN new_buckets nb ON nb.sort_order = (b->>'sort_order')::int;

  UPDATE profiles
  SET onboarding_state = 'complete', updated_at = now()
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding(jsonb) TO authenticated;
