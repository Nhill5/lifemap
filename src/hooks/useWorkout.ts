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
  workouts: { date: string } | null
  workout_sets: { reps: number | null; weight: number | null; unit: 'lb' | 'kg'; set_number: number; id: string }[]
}

export function useWorkout(blockId?: string) {
  const { user } = useAuth()
  const today = useToday()

  const [workoutId, setWorkoutId] = useState<string | null>(null)
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    ;(async () => {
      // Find the session: by block if provided, else today's blockless workout
      const q = supabase.from('workouts').select('id').eq('user_id', user.id)
      const woRes = blockId
        ? await q.eq('block_id', blockId).maybeSingle()
        : await q.eq('date', today).is('block_id', null).maybeSingle()
      if (cancelled) return

      const wid = (woRes.data?.id ?? null) as string | null
      setWorkoutId(wid)

      if (!wid) { setExercises([]); setLoading(false); return }

      const weRes = await supabase
        .from('workout_exercises')
        .select('id, exercise_id, sort_order, exercises(name), workout_sets(id, set_number, reps, weight, unit)')
        .eq('workout_id', wid)
        .order('sort_order')
      if (cancelled) return

      const weRows = (weRes.data ?? []) as unknown as WeRow[]
      const exIds = [...new Set(weRows.map(w => w.exercise_id))]

      // Prior history for these exercises (date < today) → last session + all-time best
      const priorRes = exIds.length
        ? await supabase
            .from('workout_exercises')
            .select('exercise_id, workouts!inner(date), workout_sets(id, set_number, reps, weight, unit)')
            .eq('workouts.user_id', user.id)
            .lt('workouts.date', today)
            .in('exercise_id', exIds)
        : { data: [] as PriorRow[] }
      if (cancelled) return

      const priorByEx: Record<string, PriorRow[]> = {}
      for (const r of (priorRes.data ?? []) as unknown as PriorRow[]) {
        ;(priorByEx[r.exercise_id] ??= []).push(r)
      }

      const session: SessionExercise[] = weRows.map(w => {
        const priors = priorByEx[w.exercise_id] ?? []
        let prBest = 0
        let latestDate = ''
        let lastSets: SessionSet[] = []
        for (const p of priors) {
          for (const s of p.workout_sets) {
            if (s.weight != null && s.weight > prBest) prBest = s.weight
          }
          const d = p.workouts?.date ?? ''
          if (d > latestDate) {
            latestDate = d
            lastSets = [...p.workout_sets].sort((a, b) => a.set_number - b.set_number)
          }
        }
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
  }, [user, today, blockId, tick])

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

  /** Add a set. Returns true if it's a new PR (beats all prior history). */
  async function addSet(ex: SessionExercise, reps: number | null, weight: number | null, unit: 'lb' | 'kg'): Promise<boolean> {
    const nextNum = (ex.sets.at(-1)?.set_number ?? 0) + 1
    await supabase.from('workout_sets').insert({
      workout_exercise_id: ex.weId, set_number: nextNum, reps, weight, unit,
    })
    refetch()
    return weight != null && ex.prBest > 0 && weight > ex.prBest
  }

  async function deleteSet(setId: string) {
    await supabase.from('workout_sets').delete().eq('id', setId)
    refetch()
  }

  return { workoutId, exercises, loading, addExercise, removeExercise, addSet, deleteSet, refetch }
}
