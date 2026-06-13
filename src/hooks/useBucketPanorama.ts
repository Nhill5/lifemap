import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToday } from '@/hooks/useToday'
import { weekRange } from '@/lib/week'
import type { Bucket, ChiefGoal, SubGoal } from '@/types'

export interface PanoramaBucket {
  bucket: Bucket
  chiefGoal: ChiefGoal | null
  subGoals: SubGoal[]
  chiefPct: number    // weekly input adherence, 0–100
  paceLabel: string
}

export function useBucketPanorama() {
  const { user } = useAuth()
  const today = useToday()
  const { start, end } = weekRange(today)

  const [rows, setRows] = useState<PanoramaBucket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    ;(async () => {
      const [bucketsRes, chiefRes, subRes] = await Promise.all([
        supabase.from('buckets').select('*').eq('user_id', user.id).is('archived_at', null).order('sort_order'),
        supabase.from('chief_goals').select('*').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('sub_goals').select('*').eq('user_id', user.id).eq('status', 'active'),
      ])
      if (cancelled) return

      const buckets = (bucketsRes.data ?? []) as Bucket[]
      const chiefs = (chiefRes.data ?? []) as ChiefGoal[]
      const subs = (subRes.data ?? []) as SubGoal[]

      // This week's done blocks, mapped to their sub-goal's bucket
      const subIds = subs.map(s => s.id)
      const blocksRes = subIds.length
        ? await supabase.from('blocks').select('sub_goal_id, status')
            .eq('user_id', user.id).gte('date', start).lte('date', end)
            .eq('status', 'done').in('sub_goal_id', subIds)
        : { data: [] as { sub_goal_id: string | null; status: string }[] }
      if (cancelled) return

      const subToBucket: Record<string, string> = {}
      for (const s of subs) subToBucket[s.id] = s.bucket_id
      const doneByBucket: Record<string, number> = {}
      for (const b of (blocksRes.data ?? []) as { sub_goal_id: string | null }[]) {
        if (!b.sub_goal_id) continue
        const bid = subToBucket[b.sub_goal_id]
        if (bid) doneByBucket[bid] = (doneByBucket[bid] ?? 0) + 1
      }

      const panorama: PanoramaBucket[] = buckets.map(bucket => {
        const chiefGoal = chiefs.find(c => c.bucket_id === bucket.id) ?? null
        const subGoals = subs.filter(s => s.bucket_id === bucket.id)
        const target = subGoals
          .filter(s => s.type === 'schedule_it' && s.cadence_per_week)
          .reduce((sum, s) => sum + (s.cadence_per_week ?? 0), 0)
        const done = doneByBucket[bucket.id] ?? 0

        let chiefPct = 0
        let paceLabel: string
        if (target > 0) {
          chiefPct = Math.min(100, Math.round((done / target) * 100))
          paceLabel = `${done} / ${target} this week`
        } else if (chiefGoal?.deadline) {
          paceLabel = daysLeftLabel(chiefGoal.deadline, today)
        } else {
          paceLabel = 'No cadence yet'
        }

        return { bucket, chiefGoal, subGoals, chiefPct, paceLabel }
      })

      setRows(panorama)
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [user, today, start, end])

  return { rows, loading }
}

function daysLeftLabel(deadline: string, today: string): string {
  const d = new Date(deadline + 'T12:00:00').getTime()
  const t = new Date(today + 'T12:00:00').getTime()
  const days = Math.round((d - t) / 86_400_000)
  if (days < 0) return 'Past deadline'
  if (days === 0) return 'Due today'
  if (days < 14) return `${days} days left`
  if (days < 60) return `${Math.round(days / 7)} weeks left`
  return `${Math.round(days / 30)} months left`
}
