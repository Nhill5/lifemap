/* ============================================================
   LifeMap — domain types (mirrors §19 data model exactly)
   These become Supabase row types when the client is wired in PR #2.
   ============================================================ */

/* ---- Shared ---- */
export type BucketState = 'thriving' | 'steady' | 'wilting' | 'parked'
export type GoalStatus   = 'active' | 'achieved' | 'abandoned' | 'replaced'
export type SubGoalType  = 'schedule_it' | 'track_it'
export type DataSource   = 'manual' | 'fitbit' | 'workout_logger'
export type TaskStatus   = 'todo' | 'done' | 'dropped'
export type BlockStatus  = 'planned' | 'done' | 'missed' | 'moved' | 'dropped'
export type BlockSource  = 'sub_goal' | 'task' | 'external'
export type TrackRating  = 'hit' | 'close' | 'missed'
export type EventType    = 'task' | 'subgoal' | 'milestone' | 'chief_goal' | 'unlock' | 'comeback' | 'PR'
export type AccountabilityDial = 'gentle' | 'balanced' | 'drill'
export type JournalScope = 'day' | 'week'

/* ---- 5 canonical accent slot names (§21 palette) ---- */
export type AccentSlot = 'school' | 'work' | 'fitness' | 'looks' | 'hobby'

/* ---- Identity & settings ---- */
export interface Profile {
  id: string                        // = auth.users.id
  timezone: string
  wake_time: string | null          // HH:MM
  sleep_time: string | null
  accountability_dial: AccountabilityDial
  notification_windows: NotificationWindows | null
  quiet_hours: QuietHours | null
  onboarding_state: OnboardingState
  created_at: string
  updated_at: string
}

export interface NotificationWindows {
  morning_kickoff?: string          // HH:MM
  evening_mirror?: string
}

export interface QuietHours {
  start: string                     // HH:MM
  end: string
}

export type OnboardingState = 'not_started' | 'buckets' | 'goals' | 'first_plan' | 'complete'

/* ---- Core structure ---- */
export interface Bucket {
  id: string
  user_id: string
  name: string
  color: AccentSlot
  state: BucketState
  sort_order: number
  created_at: string
  archived_at: string | null
}

export interface ChiefGoal {
  id: string
  bucket_id: string
  user_id: string
  title: string
  target_value: number | null
  target_unit: string | null
  baseline_value: number | null
  deadline: string | null           // ISO date
  status: GoalStatus
  achieved_at: string | null
  created_at: string
}

export interface SubGoal {
  id: string
  bucket_id: string
  chief_goal_id: string | null
  user_id: string
  title: string
  type: SubGoalType
  cadence_per_week: number | null   // schedule_it only
  daily_target: number | null       // track_it only
  target_unit: string | null
  data_source: DataSource
  status: GoalStatus
  created_at: string
}

export interface Task {
  id: string
  bucket_id: string | null
  chief_goal_id: string | null
  user_id: string
  title: string
  status: TaskStatus
  due_date: string | null
  rollover_count: number            // zombie detection ≥ 3–4
  is_major: boolean                 // surfaces at week level (§25)
  completed_at: string | null
  created_at: string
}

export interface Block {
  id: string
  user_id: string
  sub_goal_id: string | null
  task_id: string | null
  source: BlockSource
  title: string
  date: string                      // ISO date
  start_time: string                // HH:MM
  end_time: string
  status: BlockStatus
}

/* ---- Commitment anchor ---- */
export interface DayPlan {
  id: string
  user_id: string
  date: string                      // ISO date
  committed_at: string | null       // null = not yet committed
}

/* ---- Logging & tracking ---- */
export interface TrackLog {
  id: string
  user_id: string
  sub_goal_id: string
  date: string
  value: number | null              // numeric (track_it with exact value)
  rating: TrackRating | null        // coarse hit/close/missed
  source: DataSource
  created_at: string
}

export interface Workout {
  id: string
  user_id: string
  block_id: string | null
  date: string
  created_at: string
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string
  sort_order: number
}

export interface WorkoutSet {
  id: string
  workout_exercise_id: string
  set_number: number
  reps: number | null
  weight: number | null
  unit: 'lb' | 'kg'
}

export interface Exercise {
  id: string
  user_id: string | null            // null = global starter library
  name: string
  muscle_group: string | null
}

export interface FitbitTokens {
  id: string
  user_id: string
  access_token: string              // encrypted, server-side only
  refresh_token: string
  expires_at: string
}

export type FitbitMetric = 'steps' | 'sleep' | 'resting_hr' | 'active_minutes'

export interface FitbitData {
  id: string
  user_id: string
  date: string
  metric: FitbitMetric
  value: number
  synced_at: string
}

/* ---- Reflection & dopamine ---- */
export interface JournalEntry {
  id: string
  user_id: string
  date: string
  scope: JournalScope
  prompt: string
  body: string
  linked_context: Record<string, unknown> | null
  created_at: string
}

export interface LMEvent {
  id: string
  user_id: string
  type: EventType
  weight: number                    // drives celebration intensity
  payload: Record<string, unknown>
  created_at: string
}

/* ---- Unlocks & notifications ---- */
export type FeatureUnlock = 'week_zoom' | 'month_zoom' | 'bucket_depth' | 'life_gpa'

export interface Unlock {
  id: string
  user_id: string
  feature: FeatureUnlock
  unlocked_at: string
}

export type NotificationType = 'morning_kickoff' | 'drift_catch' | 'slip_catch' | 'evening_mirror' | 'celebration'

export interface NotificationLog {
  id: string
  user_id: string
  type: NotificationType
  sent_at: string
  date: string                      // enforces daily budget
}

/* ---- UI-only types (not persisted) ---- */
export interface CelebrationOptions {
  tier: 'soft' | 'beat' | 'moment' | 'bloom'
  title: string
  sub?: string
  color?: string
}

export interface AppSettings {
  dial: AccountabilityDial
  motion: 'off' | 'calm' | 'full'
  atmos: boolean
  breathe: boolean
}
