import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { AccentSlot, TrackRating } from '@/types'

export interface TrackItem {
  id: string            // sub_goal id
  title: string
  dailyTarget: number | null
  unit: string | null
  bucketColor: AccentSlot | null
  bucketName: string | null
  rating: TrackRating | null
  logId: string | null
}

type SubRow = {
  id: string
  title: string
  daily_target: number | null
  target_unit: string | null
  buckets: { name: string; color: string } | null
}

/**
 * Track-it sub-goals + today's coarse rating (hit / close / missed — §11).
 * Never asks for exact numbers; one tap per goal.
 */
export function useTrackIt(date: string) {
  const { user } = useAuth()
  const [items, setItems] = useState<TrackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    ;(async () => {
      const subRes = await supabase
        .from('sub_goals')
        .select('id, title, daily_target, target_unit, buckets(name, color)')
        .eq('user_id', user.id).eq('status', 'active').eq('type', 'track_it')
      if (cancelled) return

      const subs = (subRes.data ?? []) as unknown as SubRow[]
      const subIds = subs.map(s => s.id)

      const logRes = subIds.length
        ? await supabase.from('track_logs').select('id, sub_goal_id, rating')
            .eq('user_id', user.id).eq('date', date).in('sub_goal_id', subIds)
        : { data: [] as { id: string; sub_goal_id: string; rating: TrackRating | null }[] }
      if (cancelled) return

      const bySub: Record<string, { id: string; rating: TrackRating | null }> = {}
      for (const l of (logRes.data ?? []) as { id: string; sub_goal_id: string; rating: TrackRating | null }[]) {
        bySub[l.sub_goal_id] = { id: l.id, rating: l.rating }
      }

      setItems(subs.map(s => ({
        id: s.id,
        title: s.title,
        dailyTarget: s.daily_target,
        unit: s.target_unit,
        bucketColor: (s.buckets?.color ?? null) as AccentSlot | null,
        bucketName: s.buckets?.name ?? null,
        rating: bySub[s.id]?.rating ?? null,
        logId: bySub[s.id]?.id ?? null,
      })))
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [user, date, tick])

  async function setRating(item: TrackItem, rating: TrackRating) {
    if (!user) return
    if (item.logId) {
      await supabase.from('track_logs').update({ rating, value: null, source: 'manual' }).eq('id', item.logId)
    } else {
      await supabase.from('track_logs').insert({
        user_id: user.id, sub_goal_id: item.id, date, rating, source: 'manual',
      })
    }
    refetch()
  }

  return { items, loading, setRating, refetch }
}
