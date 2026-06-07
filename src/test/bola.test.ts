/**
 * BOLA security gate — §24 checklist item #2
 *
 * Signs in as User A, attempts to read every table containing User B's data
 * directly via the PostgREST API (bypassing the UI entirely).
 * Every assertion must find 0 of User B's rows — RLS is the only defense.
 *
 * Approach: cloud project icbqwrlndzuflnasffbl.supabase.co
 * (Docker not running; service_role key present in .env)
 *
 * Run:  npm run test:bola
 * Env:  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

const URL  = process.env.VITE_SUPABASE_URL!
const ANON = process.env.VITE_SUPABASE_ANON_KEY!
const SVC  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

if (!URL || !ANON || !SVC) {
  throw new Error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in .env')
}

// Admin client — service_role, Node.js test only, never in the browser
const admin = createClient(URL, SVC, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TS       = Date.now()
const EMAIL_A  = `bola-a-${TS}@test.lifemap.local`
const EMAIL_B  = `bola-b-${TS}@test.lifemap.local`
const PASSWORD = `BolaTest-${TS}!`

let uidA: string
let uidB: string
let clientA: ReturnType<typeof createClient>

// IDs of User B's nested rows (no direct user_id — tested separately)
let workoutIdB: string
let workoutExerciseIdB: string

beforeAll(async () => {
  // Create both test users (email_confirm bypasses the magic-link flow)
  const [{ data: ua, error: errA }, { data: ub, error: errB }] = await Promise.all([
    admin.auth.admin.createUser({ email: EMAIL_A, password: PASSWORD, email_confirm: true }),
    admin.auth.admin.createUser({ email: EMAIL_B, password: PASSWORD, email_confirm: true }),
  ])
  if (errA) throw new Error(`createUser A: ${errA.message}`)
  if (errB) throw new Error(`createUser B: ${errB.message}`)
  uidA = ua.user!.id
  uidB = ub.user!.id

  // Sign in as User A — get a JWT scoped to uidA
  const base = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: signA, error: signErr } = await base.auth.signInWithPassword({ email: EMAIL_A, password: PASSWORD })
  if (signErr) throw new Error(`signIn A: ${signErr.message}`)

  clientA = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${signA.session!.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Seed ALL of User B's data via admin (bypasses RLS intentionally for test setup)
  const { data: bucket, error: bktErr } = await admin
    .from('buckets')
    .insert({ user_id: uidB, name: 'B-bucket', color: 'fitness', state: 'steady', sort_order: 0 })
    .select('id').single()
  if (bktErr) throw new Error(`seed bucket: ${bktErr.message}`)

  const { data: cg, error: cgErr } = await admin
    .from('chief_goals')
    .insert({ user_id: uidB, bucket_id: bucket!.id, title: 'B-chief-goal', status: 'active' })
    .select('id').single()
  if (cgErr) throw new Error(`seed chief_goal: ${cgErr.message}`)

  const { data: sg, error: sgErr } = await admin
    .from('sub_goals')
    .insert({ user_id: uidB, bucket_id: bucket!.id, chief_goal_id: cg!.id, title: 'B-sub-goal', type: 'schedule_it', data_source: 'manual', status: 'active' })
    .select('id').single()
  if (sgErr) throw new Error(`seed sub_goal: ${sgErr.message}`)

  await admin.from('tasks').insert({ user_id: uidB, bucket_id: bucket!.id, title: 'B-task', status: 'todo' })

  const { data: blk } = await admin
    .from('blocks')
    .insert({ user_id: uidB, sub_goal_id: sg!.id, source: 'sub_goal', title: 'B-block', date: '2026-06-04', start_time: '09:00', end_time: '10:00', status: 'planned' })
    .select('id').single()

  await admin.from('day_plans').insert({ user_id: uidB, date: '2026-06-04' })

  await admin.from('track_logs').insert({ user_id: uidB, sub_goal_id: sg!.id, date: '2026-06-04', rating: 'hit', source: 'manual' })

  await admin.from('chief_goal_progress').insert({ user_id: uidB, chief_goal_id: cg!.id, date: '2026-06-04', value: 210 })

  const { data: ex } = await admin
    .from('exercises')
    .insert({ user_id: uidB, name: 'B-squat' })
    .select('id').single()

  const { data: wo } = await admin
    .from('workouts')
    .insert({ user_id: uidB, block_id: blk!.id, date: '2026-06-04' })
    .select('id').single()
  workoutIdB = wo!.id

  const { data: we } = await admin
    .from('workout_exercises')
    .insert({ workout_id: workoutIdB, exercise_id: ex!.id, sort_order: 0 })
    .select('id').single()
  workoutExerciseIdB = we!.id

  await admin.from('workout_sets').insert({ workout_exercise_id: workoutExerciseIdB, set_number: 1, reps: 5, weight: 135, unit: 'lb' })
  await admin.from('fitbit_tokens').insert({ user_id: uidB, access_token: 'tok_b', refresh_token: 'ref_b', expires_at: new Date(Date.now() + 3_600_000).toISOString() })
  // Seed a token for User A too — to prove even the OWNER can't read tokens via the API
  await admin.from('fitbit_tokens').insert({ user_id: uidA, access_token: 'tok_a', refresh_token: 'ref_a', expires_at: new Date(Date.now() + 3_600_000).toISOString() })
  await admin.from('fitbit_data').insert({ user_id: uidB, date: '2026-06-04', metric: 'steps', value: 9000 })
  await admin.from('fitbit_connections').insert({ user_id: uidB, scopes: 'activity weight' })
  await admin.from('push_subscriptions').insert({ user_id: uidB, endpoint: `https://push.example/${TS}-b`, p256dh: 'p256dh_b', auth: 'auth_b' })
  await admin.from('journal_entries').insert({ user_id: uidB, date: '2026-06-04', scope: 'day', prompt: 'p', body: 'b' })
  await admin.from('events').insert({ user_id: uidB, type: 'task', weight: 1, payload: {} })
  await admin.from('unlocks').insert({ user_id: uidB, feature: 'week_zoom' })
  await admin.from('notifications_log').insert({ user_id: uidB, type: 'morning_kickoff', date: '2026-06-04' })
})

afterAll(async () => {
  if (uidA) await admin.auth.admin.deleteUser(uidA)
  if (uidB) await admin.auth.admin.deleteUser(uidB)
})

// Helper: read a table as User A, return all rows
async function asA(table: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await (clientA as ReturnType<typeof createClient>).from(table).select('*')
  expect(error, `${table} query error`).toBeNull()
  return (data ?? []) as Record<string, unknown>[]
}

// ─────────────────────────────────────────────────────────────
// BOLA assertions
// ─────────────────────────────────────────────────────────────
describe('BOLA — User A cannot access User B data via PostgREST API', () => {

  // Tables with direct user_id: assert User B's rows are invisible to User A
  const directTables = [
    'buckets', 'chief_goals', 'chief_goal_progress', 'sub_goals', 'tasks', 'blocks',
    'day_plans', 'track_logs', 'workouts',
    'fitbit_tokens', 'fitbit_data', 'fitbit_connections', 'journal_entries',
    'events', 'unlocks', 'notifications_log', 'push_subscriptions',
  ]

  for (const table of directTables) {
    it(`${table}: 0 of User B rows visible`, async () => {
      const rows = await asA(table)
      const leaked = rows.filter(r => r['user_id'] === uidB)
      expect(leaked, `${table} leaked ${leaked.length} row(s)`).toHaveLength(0)
    })
  }

  it('fitbit_tokens: even the OWNER cannot read tokens via the API (server-side only)', async () => {
    // User A has a seeded token row, but the locked-down RLS must expose 0 rows.
    const rows = await asA('fitbit_tokens')
    expect(rows, `owner saw ${rows.length} token row(s) — tokens must be service-role only`).toHaveLength(0)
  })

  it('profiles: User B profile not visible to User A', async () => {
    const rows = await asA('profiles')
    const leaked = rows.filter(r => r['id'] === uidB)
    expect(leaked, `profiles leaked ${leaked.length} row(s)`).toHaveLength(0)
  })

  it('exercises: User B custom exercises not visible to User A', async () => {
    const rows = await asA('exercises')
    const leaked = rows.filter(r => r['user_id'] === uidB)
    expect(leaked, `exercises leaked ${leaked.length} row(s)`).toHaveLength(0)
  })

  it('workout_exercises: User B rows not visible via sub-select RLS', async () => {
    const rows = await asA('workout_exercises')
    const leaked = rows.filter(r => r['workout_id'] === workoutIdB)
    expect(leaked, `workout_exercises leaked ${leaked.length} row(s)`).toHaveLength(0)
  })

  it('workout_sets: User B rows not visible via 2-level sub-select RLS', async () => {
    const rows = await asA('workout_sets')
    const leaked = rows.filter(r => r['workout_exercise_id'] === workoutExerciseIdB)
    expect(leaked, `workout_sets leaked ${leaked.length} row(s)`).toHaveLength(0)
  })
})
