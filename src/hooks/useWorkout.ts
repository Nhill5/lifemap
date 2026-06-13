import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToday } from '@/hooks/useToday'

export interface SessionSet {
  id: string
  set_number: number
  reps: number | null
  weight: number | null
  unit: 'lb' | 'kg'
}

export interface SessionExercise {
  weId: string          // workout_exercises.id
  exerciseId: string
  name: string
  sortOrder: number
  sets: SessionSet[]
  lastSets: SessionSet[] // most recent prior session's sets (know what to beat)
  prBest: number         // best weight ever logged before today (0 = no history)
}

type WeRow = {
  id: string
  exercise_id: string
  sort_order: number
  exercises: { name: string } | null
  workout_sets: SessionSet[]
}

type PriorRow = {
  exercise_id: string
  workouts: { date: string; name: string | null } | null
  workout_sets: { reps: number | null; weight: number | null; unit: 'lb' | 'kg'; set_number: number; id: string }[]
}

/** Sets from the most recent (latest-dated) session among the given rows. */
function latestSets(rows: PriorRow[]): SessionSet[] {
  let latestDate = ''
  let out: SessionSet[] = []
  for (const p of rows) {
    const d = p.workouts?.date ?? ''
    if (d > latestDate) {
      latestDate = d
      out = [...p.workout_sets].sort((a, b) => a.set_number - b.set_number)
    }
  }
  return out
}

export interface UseWorkoutOpts {
  /** Bind the session to a planned gym block (today). */
  blockId?: string
  /** Open a specific existing session by id — the "edit a past workout" path. */
  sessionId?: string
}

export function useWorkout(opts: UseWorkoutOpts = {}) {
  const { blockId, sessionId } = opts
  const { user } = useAuth()
  const today = useToday()

  const [workoutId, setWorkoutId] = useState<string | null>(sessionId ?? null)
  const [name, setName] = useState<string | null>(null)
  const [date, setDate] = useState<string>(today)
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    ;(async () => {
      // Resolve the session: explicit id → by block → today's blockless workout.
      let wid: string | null = null
      let woName: string | null = null
      let woDate = today
      if (sessionId) {
        const { data } = await supabase.from('workouts').select('id, name, date')
          .eq('user_id', user.id).eq('id', sessionId).maybeSingle()
        wid = (data?.id ?? null) as string | null
        woName = (data?.name ?? null) as string | null
        woDate = (data?.date ?? today) as string
      } else {
        const q = supabase.from('workouts').select('id, name, date').eq('user_id', user.id)
        // Bare /workout continues today's latest blockless session (there can be
        // more than one a day now that routines start their own session).
        const woRes = blockId
          ? await q.eq('block_id', blockId).maybeSingle()
          : await q.eq('date', today).is('block_id', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
        wid = (woRes.data?.id ?? null) as string | null
        woName = (woRes.data?.name ?? null) as string | null
        woDate = (woRes.data?.date ?? today) as string
      }
      if (cancelled) return

      setWorkoutId(wid)
      setName(woName)
      setDate(woDate)

      if (!wid) { setExercises([]); setLoading(false); return }

      const weRes = await supabase
        .from('workout_exercises')
        .select('id, exercise_id, sort_order, exercises(name), workout_sets(id, set_number, reps, weight, unit)')
        .eq('workout_id', wid)
        .order('sort_order')
      if (cancelled) return

      const weRows = (weRes.data ?? []) as unknown as WeRow[]
      const exIds = [...new Set(weRows.map(w => w.exercise_id))]

      // Prior history for these exercises (date < this session's date) → last
      // session + all-time best. Anchoring on the session date (not "today")
      // keeps "last time" correct when editing an older workout.
      const priorRes = exIds.length
        ? await supabase
            .from('workout_exercises')
            .select('exercise_id, workouts!inner(date, name), workout_sets(id, set_number, reps, weight, unit)')
            .eq('workouts.user_id', user.id)
            .lt('workouts.date', woDate)
            .in('exercise_id', exIds)
        : { data: [] as PriorRow[] }
      if (cancelled) return

      const priorByEx: Record<string, PriorRow[]> = {}
      for (const r of (priorRes.data ?? []) as unknown as PriorRow[]) {
        ;(priorByEx[r.exercise_id] ??= []).push(r)
      }

      const session: SessionExercise[] = weRows.map(w => {
        const priors = priorByEx[w.exercise_id] ?? []
        // PR is all-time, across every session that ever included this exercise.
        let prBest = 0
        for (const p of priors) {
          for (const s of p.workout_sets) {
            if (s.weight != null && s.weight > prBest) prBest = s.weight
          }
        }
        // "Last time" prefers the same named workout (your split day) — so
        // reopening "Upper A" shows last Upper A. But if there's no history under
        // this name yet (e.g. first time you load a saved routine), fall back to
        // the most recent session that included this exercise, so the latest
        // weight/reps always carry forward.
        const sameName = woName ? priors.filter(p => (p.workouts?.name ?? null) === woName) : []
        let lastSets = latestSets(sameName)
        if (lastSets.length === 0) lastSets = latestSets(priors)
        return {
          weId: w.id,
          exerciseId: w.exercise_id,
          name: w.exercises?.name ?? 'Exercise',
          sortOrder: w.sort_order,
          sets: [...(w.workout_sets ?? [])].sort((a, b) => a.set_number - b.set_number),
          lastSets,
          prBest,
        }
      })

      setExercises(session)
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [user, today, blockId, sessionId, tick])

  /** Create the workout row on first use; links + confirms the gym block. */
  async function ensureWorkout(): Promise<string | null> {
    if (!user) return null
    if (workoutId) return workoutId
    const { data } = await supabase
      .from('workouts')
      .insert({ user_id: user.id, date: today, block_id: blockId ?? null })
      .select('id')
      .single()
    const wid = (data?.id ?? null) as string | null
    if (wid) setWorkoutId(wid)
    // Logging the session IS the "did you train" confirmation (§17)
    if (wid && blockId) await supabase.from('blocks').update({ status: 'done' }).eq('id', blockId)
    return wid
  }

  /** Rename the session (Upper/Lower/Push/Pull/…). Creates the row if needed. */
  async function rename(next: string | null) {
    const wid = await ensureWorkout()
    if (!wid) return
    const clean = next?.trim() || null
    await supabase.from('workouts').update({ name: clean }).eq('id', wid)
    setName(clean)
    refetch() // re-scope "last time" to the new name (your split day)
  }

  async function addExercise(exerciseId: string) {
    if (!user) return
    const wid = await ensureWorkout()
    if (!wid) return
    await supabase.from('workout_exercises').insert({
      workout_id: wid, exercise_id: exerciseId, sort_order: exercises.length,
    })
    refetch()
  }

  async function removeExercise(weId: string) {
    await supabase.from('workout_exercises').delete().eq('id', weId)
    refetch()
  }

  function isPrWeight(ex: SessionExercise, weight: number | null): boolean {
    return weight != null && ex.prBest > 0 && weight > ex.prBest
  }

  /** Add a set. Returns true if it's a new PR (beats all prior history). */
  async function addSet(ex: SessionExercise, reps: number | null, weight: number | null, unit: 'lb' | 'kg'): Promise<boolean> {
    const nextNum = (ex.sets.length ? ex.sets[ex.sets.length - 1].set_number : 0) + 1
    await supabase.from('workout_sets').insert({
      workout_exercise_id: ex.weId, set_number: nextNum, reps, weight, unit,
    })
    refetch()
    return isPrWeight(ex, weight)
  }

  /** Edit an already-logged set in place. Returns true if the new weight is a PR. */
  async function updateSet(
    ex: SessionExercise, setId: string,
    patch: { reps?: number | null; weight?: number | null; unit?: 'lb' | 'kg' },
  ): Promise<boolean> {
    await supabase.from('workout_sets').update(patch).eq('id', setId)
    refetch()
    return patch.weight !== undefined ? isPrWeight(ex, patch.weight ?? null) : false
  }

  async function deleteSet(setId: string) {
    await supabase.from('workout_sets').delete().eq('id', setId)
    refetch()
  }

  /**
   * Pre-fill this session's exercises from a saved routine — AND seed each
   * exercise with last time's full set scheme (reps/weight/unit), so the day
   * opens fully populated and you just adjust the numbers you beat. Last time is
   * the same-named day if it exists, else the most recent session with the lift.
   */
  async function startFromTemplate(templateId: string) {
    if (!user) return
    const wid = await ensureWorkout()
    if (!wid) return
    const { data } = await supabase
      .from('workout_template_exercises')
      .select('exercise_id, sort_order')
      .eq('template_id', templateId)
      .order('sort_order')
    const rows = (data ?? []) as { exercise_id: string; sort_order: number }[]
    if (rows.length === 0) return

    const base = exercises.length
    const { data: insertedWe } = await supabase.from('workout_exercises').insert(
      rows.map((r, i) => ({ workout_id: wid, exercise_id: r.exercise_id, sort_order: base + i })),
    ).select('id, exercise_id')

    // A template often implies the name (e.g. "Upper A"); adopt it if unnamed.
    let effectiveName = name
    if (!name) {
      const { data: tpl } = await supabase.from('workout_templates').select('name').eq('id', templateId).maybeSingle()
      if (tpl?.name) { await supabase.from('workouts').update({ name: tpl.name }).eq('id', wid); effectiveName = tpl.name as string }
    }

    // Seed sets from last time for each exercise.
    const exIds = rows.map(r => r.exercise_id)
    const { data: priorData } = await supabase
      .from('workout_exercises')
      .select('exercise_id, workouts!inner(date, name), workout_sets(set_number, reps, weight, unit)')
      .eq('workouts.user_id', user.id)
      .lt('workouts.date', today)
      .in('exercise_id', exIds)
    type PR = { exercise_id: string; workouts: { date: string; name: string | null } | null; workout_sets: { set_number: number; reps: number | null; weight: number | null; unit: 'lb' | 'kg' }[] }
    const byEx: Record<string, PR[]> = {}
    for (const r of (priorData ?? []) as unknown as PR[]) (byEx[r.exercise_id] ??= []).push(r)
    const pickLast = (exId: string) => {
      const all = byEx[exId] ?? []
      const sameName = effectiveName ? all.filter(r => (r.workouts?.name ?? null) === effectiveName) : []
      const pool = sameName.length ? sameName : all
      let latest = ''; let sets: PR['workout_sets'] = []
      for (const r of pool) { const d = r.workouts?.date ?? ''; if (d > latest) { latest = d; sets = r.workout_sets ?? [] } }
      return [...sets].sort((a, b) => a.set_number - b.set_number)
    }
    const seed: { workout_exercise_id: string; set_number: number; reps: number | null; weight: number | null; unit: 'lb' | 'kg' }[] = []
    for (const we of (insertedWe ?? []) as { id: string; exercise_id: string }[]) {
      for (const s of pickLast(we.exercise_id)) {
        seed.push({ workout_exercise_id: we.id, set_number: s.set_number, reps: s.reps, weight: s.weight, unit: s.unit })
      }
    }
    if (seed.length) await supabase.from('workout_sets').insert(seed)

    refetch()
  }

  /** Save the current exercise list as a reusable named routine. */
  async function saveAsTemplate(templateName: string): Promise<boolean> {
    if (!user || exercises.length === 0) return false
    const { data: tpl } = await supabase
      .from('workout_templates')
      .insert({ user_id: user.id, name: templateName.trim() })
      .select('id')
      .single()
    const tid = (tpl?.id ?? null) as string | null
    if (!tid) return false
    await supabase.from('workout_template_exercises').insert(
      exercises.map((ex, i) => ({ template_id: tid, exercise_id: ex.exerciseId, sort_order: i })),
    )
    return true
  }

  return {
    workoutId, name, date, exercises, loading,
    rename, addExercise, removeExercise,
    addSet, updateSet, deleteSet,
    startFromTemplate, saveAsTemplate, refetch,
  }
}
