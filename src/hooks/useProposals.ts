import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { weekRange } from '@/lib/week'
import type { AccentSlot } from '@/types'

export interface Proposal {
  subGoalId: string
  title: string
  bucketName: string | null
  bucketColor: AccentSlot | null
  cadence: number
  scheduledThisWeek: number
  remaining: number
  startTime: string
  endTime: string
}

type SubGoalRow = {
  id: string
  title: string
  cadence_per_week: number | null
  buckets: { name: string; color: string } | null
}

type BlockRow = { sub_goal_id: string | null; date: string; status: string }

/** Default placement for a proposed block — evening slots, stacked. */
function slotFor(index: number): { startTime: string; endTime: string } {
  const startHour = Math.min(18 + index, 22)
  return {
    startTime: `${String(startHour).padStart(2, '0')}:00`,
    endTime: `${String(startHour + 1).padStart(2, '0')}:00`,
  }
}

/**
 * Proposal engine (focused v1, spec §9 step 3): for each active schedule-it
 * sub-goal, compare this week's scheduled count against its weekly cadence.
 * If under cadence and nothing is scheduled for `date` yet, propose a block.
 */
export function useProposals(date: string) {
  const { user } = useAuth()
  const { start, end } = weekRange(date)

  const [proposals, setProposals] = useState<Proposal[]>([])
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
        .select('id, title, cadence_per_week, buckets(name, color)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('type', 'schedule_it')
      if (cancelled) return

      const subs = ((subRes.data ?? []) as unknown as SubGoalRow[])
        .filter(s => (s.cadence_per_week ?? 0) > 0)
      const subIds = subs.map(s => s.id)

      const blocksRes = subIds.length
        ? await supabase.from('blocks').select('sub_goal_id, date, status')
            .eq('user_id', user.id).gte('date', start).lte('date', end)
            .in('status', ['planned', 'done']).in('sub_goal_id', subIds)
        : { data: [] as BlockRow[] }
      if (cancelled) return

      const blocks = (blocksRes.data ?? []) as BlockRow[]
      const weekCount: Record<string, number> = {}
      const onDate: Record<string, number> = {}
      for (const b of blocks) {
        if (!b.sub_goal_id) continue
        weekCount[b.sub_goal_id] = (weekCount[b.sub_goal_id] ?? 0) + 1
        if (b.date === date) onDate[b.sub_goal_id] = (onDate[b.sub_goal_id] ?? 0) + 1
      }

      const next: Proposal[] = []
      for (const s of subs) {
        const cadence = s.cadence_per_week ?? 0
        const scheduledThisWeek = weekCount[s.id] ?? 0
        const remaining = cadence - scheduledThisWeek
        if (remaining <= 0) continue
        if ((onDate[s.id] ?? 0) > 0) continue // already on this day
        const slot = slotFor(next.length)
        next.push({
          subGoalId: s.id,
          title: s.title,
          bucketName: s.buckets?.name ?? null,
          bucketColor: (s.buckets?.color ?? null) as AccentSlot | null,
          cadence,
          scheduledThisWeek,
          remaining,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })
      }

      setProposals(next)
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [user, date, start, end, tick])

  async function accept(p: Proposal, targetDate: string = date) {
    if (!user) return
    await supabase.from('blocks').insert({
      user_id: user.id,
      sub_goal_id: p.subGoalId,
      source: 'sub_goal',
      title: p.title,
      date: targetDate,
      start_time: p.startTime,
      end_time: p.endTime,
      status: 'planned',
    })
    refetch()
  }

  async function acceptAll(targetDate: string = date) {
    if (!user || proposals.length === 0) return
    await supabase.from('blocks').insert(
      proposals.map(p => ({
        user_id: user.id,
        sub_goal_id: p.subGoalId,
        source: 'sub_goal' as const,
        title: p.title,
        date: targetDate,
        start_time: p.startTime,
        end_time: p.endTime,
        status: 'planned' as const,
      })),
    )
    refetch()
  }

  return { proposals, loading, accept, acceptAll, refetch }
}
