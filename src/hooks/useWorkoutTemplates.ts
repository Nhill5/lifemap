import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface TemplateSummary {
  id: string
  name: string
  exercises: string[] // exercise names, in order
}

type Row = {
  id: string
  name: string
  workout_template_exercises: { sort_order: number; exercises: { name: string } | null }[]
}

/** Saved routines (Upper A, Lower B, …) you can start a session from. */
export function useWorkoutTemplates() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    supabase
      .from('workout_templates')
      .select('id, name, workout_template_exercises(sort_order, exercises(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        const rows = (data ?? []) as unknown as Row[]
        setTemplates(rows.map(t => ({
          id: t.id,
          name: t.name,
          exercises: [...(t.workout_template_exercises ?? [])]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(te => te.exercises?.name ?? 'Exercise'),
        })))
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [user, tick])

  async function deleteTemplate(id: string) {
    await supabase.from('workout_templates').delete().eq('id', id)
    refetch()
  }

  return { templates, loading, deleteTemplate, refetch }
}
