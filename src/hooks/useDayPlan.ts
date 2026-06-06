import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DayPlan } from '@/types'

export function useDayPlan(date: string) {
  const { user } = useAuth()
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [committing, setCommitting] = useState(false)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    supabase
      .from('day_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle()
      .then(({ data }) => {
        setPlan(data as DayPlan | null)
        setLoading(false)
      })
  }, [user, date])

  const isCommitted = !!plan?.committed_at

  async function commit() {
    if (!user || committing) return
    setCommitting(true)
    const now = new Date().toISOString()
    try {
      if (plan?.id) {
        const { data } = await supabase
          .from('day_plans')
          .update({ committed_at: now })
          .eq('id', plan.id)
          .select()
          .single()
        if (data) setPlan(data as DayPlan)
      } else {
        const { data } = await supabase
          .from('day_plans')
          .insert({ user_id: user.id, date, committed_at: now })
          .select()
          .single()
        if (data) setPlan(data as DayPlan)
      }
    } finally {
      setCommitting(false)
    }
  }

  return { plan, loading, isCommitted, commit, committing }
}
