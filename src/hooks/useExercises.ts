import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Exercise } from '@/types'

/** Starter library (user_id null = global) + the user's own free-text adds. */
export function useExercises() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    supabase
      .from('exercises')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('name')
      .then(({ data }) => {
        if (cancelled) return
        setExercises((data ?? []) as Exercise[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, tick])

  async function addExercise(name: string): Promise<Exercise | null> {
    if (!user) return null
    const { data } = await supabase
      .from('exercises')
      .insert({ user_id: user.id, name: name.trim() })
      .select('*')
      .single()
    refetch()
    return (data ?? null) as Exercise | null
  }

  return { exercises, loading, addExercise, refetch }
}
