import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToday, isoOffset } from '@/hooks/useToday'
import { computeConsistency, type ConsistencyResult, type ScoreBlock } from '@/lib/consistency'

const WINDOW = 14

type BlockRow = {
  date: string
  status: string
  tasks: { bucket_id: string | null } | null
  sub_goals: { bucket_id: string | null } | null
}

/** Rolling 14-day consistency (per-bucket + life GPA + comeback). */
export function useConsistency(): { result: ConsistencyResult | null; loading: boolean } {
  const { user } = useAuth()
  const today = useToday()
  const start = isoOffset(today, -(WINDOW - 1))

  const [result, setResult] = useState<ConsistencyResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    Promise.all([
      supabase
        .from('blocks')
        .select('date, status, tasks(bucket_id), sub_goals(bucket_id)')
        .eq('user_id', user.id)
        .gte('date', start).lte('date', today)
        .in('status', ['done', 'missed']),
      supabase
        .from('day_plans')
        .select('date, committed_at')
        .eq('user_id', user.id)
        .gte('date', start).lte('date', today),
      supabase
        .from('buckets')
        .select('id, state')
        .eq('user_id', user.id)
        .is('archived_at', null),
    ]).then(([blocksRes, plansRes, bucketsRes]) => {
      if (cancelled) return

      const blocks: ScoreBlock[] = ((blocksRes.data ?? []) as unknown as BlockRow[]).map(b => ({
        date: b.date,
        status: b.status,
        bucketId: b.tasks?.bucket_id ?? b.sub_goals?.bucket_id ?? null,
      }))
      const committedDates = new Set(
        ((plansRes.data ?? []) as { date: string; committed_at: string | null }[])
          .filter(p => p.committed_at).map(p => p.date),
      )
      const buckets = (bucketsRes.data ?? []) as { id: string; state: string }[]

      setResult(computeConsistency({ blocks, committedDates, buckets, today, windowDays: WINDOW }))
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [user, today, start])

  return { result, loading }
}
