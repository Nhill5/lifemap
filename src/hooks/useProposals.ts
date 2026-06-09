import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { weekRange, weekdayOf } from '@/lib/week'
import { addMinutes } from '@/hooks/useClock'
import type { AccentSlot } from '@/types'

export interface Proposal {
  subGoalId: string
  title: string
  bucketName: string | null
  bucketColor: AccentSlot | null
  /** fixed-day recurrence → pre-included (one commit brings it in); flexible → choose-which-days */
  fixedDay: boolean
  startTime: string | null   // null = untimed to-do
  endTime: string | null
  cadence: number            // flexible only (display)
  scheduledThisWeek: number  // flexible only (display)
}

type SubGoalRow = {
  id: string
  title: string
  cadence_per_week: number | null
  recurrence_days: number[] | null
  recurrence_time: string | null
  recurrence_duration_min: number | null
  buckets: { name: string; color: string } | null
}

type BlockRow = { sub_goal_id: string | null; date: string; status: string }

/** Default placement for a flexible cadence proposal — evening slots, stacked. */
function flexSlot(index: number): { startTime: string; endTime: string } {
  const startHour = Math.min(18 + index, 22)
  return { startTime: `${String(startHour).padStart(2, '0')}:00`, endTime: `${String(startHour + 1).padStart(2, '0')}:00` }
}

/**
 * Proposal engine (§9 step 3 + §25.5). Two kinds:
 *  - fixedDay: this weekday is in the sub-goal's recurrence_days → pre-included
 *    (materialized on commit, no per-item accept).
 *  - flexible: recurrence_days empty → cadence_per_week logic, choose-which-days.
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
        .select('id, title, cadence_per_week, recurrence_days, recurrence_time, recurrence_duration_min, buckets(name, color)')
        .eq('user_id', user.id).eq('status', 'active').eq('type', 'schedule_it')
      if (cancelled) return

      const subs = (subRes.data ?? []) as unknown as SubGoalRow[]
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

      const weekday = weekdayOf(date)
      const next: Proposal[] = []
      let flexIndex = 0
      for (const s of subs) {
        if ((onDate[s.id] ?? 0) > 0) continue // already on this day
        const bucketName = s.buckets?.name ?? null
        const bucketColor = (s.buckets?.color ?? null) as AccentSlot | null
        const days = s.recurrence_days ?? null

        if (days && days.length > 0) {
          // Fixed-day recurrence — only on matching weekdays, pre-included
          if (!days.includes(weekday)) continue
          const startTime = s.recurrence_time ? s.recurrence_time.slice(0, 5) : null
          const endTime = startTime ? addMinutes(startTime, s.recurrence_duration_min ?? 60) : null
          next.push({ subGoalId: s.id, title: s.title, bucketName, bucketColor, fixedDay: true, startTime, endTime, cadence: 0, scheduledThisWeek: 0 })
        } else {
          // Flexible cadence — propose when under N×/week
          const cadence = s.cadence_per_week ?? 0
          if (cadence <= 0) continue
          const scheduledThisWeek = weekCount[s.id] ?? 0
          if (cadence - scheduledThisWeek <= 0) continue
          const slot = flexSlot(flexIndex++)
          next.push({ subGoalId: s.id, title: s.title, bucketName, bucketColor, fixedDay: false, startTime: slot.startTime, endTime: slot.endTime, cadence, scheduledThisWeek })
        }
      }

      setProposals(next)
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [user, date, start, end, tick])

  function rowFor(p: Proposal, targetDate: string) {
    return {
      user_id: user!.id,
      sub_goal_id: p.subGoalId,
      source: 'sub_goal' as const,
      title: p.title,
      date: targetDate,
      start_time: p.startTime,
      end_time: p.endTime,
      status: 'planned' as const,
    }
  }

  async function accept(p: Proposal, targetDate: string = date) {
    if (!user) return
    await supabase.from('blocks').insert(rowFor(p, targetDate))
    refetch()
  }

  async function acceptMany(list: Proposal[], targetDate: string = date) {
    if (!user || list.length === 0) return
    await supabase.from('blocks').insert(list.map(p => rowFor(p, targetDate)))
    refetch()
  }

  /** Bring in all pre-included fixed-day items — called on day commit. Returns count. */
  async function materializeFixedDay(targetDate: string = date): Promise<number> {
    const fixed = proposals.filter(p => p.fixedDay)
    if (fixed.length) await acceptMany(fixed, targetDate)
    return fixed.length
  }

  const fixedDay = proposals.filter(p => p.fixedDay)
  const flexible = proposals.filter(p => !p.fixedDay)

  return { proposals, fixedDay, flexible, loading, accept, acceptMany, materializeFixedDay, refetch }
}
