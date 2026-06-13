import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface WorkoutSummary {
  id: string
  date: string
  name: string | null
  exerciseCount: number
  setCount: number
  topSet: { name: string; weight: number; unit: 'lb' | 'kg' } | null // heaviest set, for a glance
}

type Row = {
  id: string
  date: string
  name: string | null
  workout_exercises: {
    exercises: { name: string } | null
    workout_sets: { weight: number | null; unit: 'lb' | 'kg' }[]
  }[]
}

/** Past sessions, newest first — the "book" you can flip back through. */
export function useWorkoutHistory() {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    supabase
      .from('workouts')
      .select('id, date, name, workout_exercises(exercises(name), workout_sets(weight, unit))')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        const rows = (data ?? []) as unknown as Row[]
        setWorkouts(rows.map(w => {
          const exs = w.workout_exercises ?? []
          let setCount = 0
          let topSet: WorkoutSummary['topSet'] = null
          for (const we of exs) {
            const sets = we.workout_sets ?? []
            setCount += sets.length
            for (const s of sets) {
              if (s.weight != null && (!topSet || s.weight > topSet.weight)) {
                topSet = { name: we.exercises?.name ?? 'Exercise', weight: s.weight, unit: s.unit }
              }
            }
          }
          return {
            id: w.id,
            date: w.date,
            name: w.name,
            exerciseCount: exs.length,
            setCount,
            topSet,
          }
        }))
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [user, tick])

  return { workouts, loading, refetch }
}
