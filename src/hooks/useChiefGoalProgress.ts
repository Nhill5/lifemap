import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ChiefGoalProgress } from '@/types'

export function useChiefGoalProgress(chiefGoalId: string | null | undefined) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<ChiefGoalProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!user || !chiefGoalId) { setEntries([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    supabase
      .from('chief_goal_progress')
      .select('*')
      .eq('chief_goal_id', chiefGoalId)
      .order('date', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        setEntries((data ?? []) as ChiefGoalProgress[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, chiefGoalId, tick])

  /** Upsert today's (or any date's) measured value. */
  async function logValue(date: string, value: number) {
    if (!user || !chiefGoalId) return
    await supabase
      .from('chief_goal_progress')
      .upsert(
        { user_id: user.id, chief_goal_id: chiefGoalId, date, value },
        { onConflict: 'chief_goal_id,date' },
      )
    refetch()
  }

  const latest = entries.length ? entries[entries.length - 1] : null

  return { entries, latest, loading, logValue, refetch }
}
