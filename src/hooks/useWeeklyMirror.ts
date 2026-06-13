import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToday } from '@/hooks/useToday'
import { weekRange } from '@/lib/week'
import { computeConsistency, type ScoreBlock } from '@/lib/consistency'
import type { AccentSlot } from '@/types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface PanoramaCell {
  id: string
  name: string
  color: AccentSlot
  state: string
  pct: number | null
}

export interface WeeklyMirror {
  loading: boolean
  rangeLabel: string
  lifeGpa: number | null
  headline: string
  panorama: PanoramaCell[]
  gap: { name: string; color: AccentSlot; pct: number; missed: number } | null
  wins: { name: string; color: AccentSlot; done: number }[]
  comeback: boolean
  totalDone: number
  pattern: string | null
}

type BlockRow = {
  date: string
  status: string
  tasks: { bucket_id: string | null } | null
  sub_goals: { bucket_id: string | null } | null
}

const empty: WeeklyMirror = {
  loading: true, rangeLabel: '', lifeGpa: null, headline: '',
  panorama: [], gap: null, wins: [], comeback: false, totalDone: 0, pattern: null,
}

export function useWeeklyMirror(): WeeklyMirror {
  const { user } = useAuth()
  const today = useToday()
  const { start, end } = weekRange(today)
  const [state, setState] = useState<WeeklyMirror>(empty)

  useEffect(() => {
    if (!user) { setState({ ...empty, loading: false }); return }
    let cancelled = false
    setState(s => ({ ...s, loading: true }))

    Promise.all([
      supabase.from('blocks')
        .select('date, status, tasks(bucket_id), sub_goals(bucket_id)')
        .eq('user_id', user.id).gte('date', start).lte('date', end)
        .in('status', ['done', 'missed']),
      supabase.from('day_plans').select('date, committed_at')
        .eq('user_id', user.id).gte('date', start).lte('date', end),
      supabase.from('buckets').select('id, name, color, state')
        .eq('user_id', user.id).is('archived_at', null).order('sort_order'),
    ]).then(([blocksRes, plansRes, bucketsRes]) => {
      if (cancelled) return

      const rawBlocks = (blocksRes.data ?? []) as unknown as BlockRow[]
      const blocks: ScoreBlock[] = rawBlocks.map(b => ({
        date: b.date, status: b.status,
        bucketId: b.tasks?.bucket_id ?? b.sub_goals?.bucket_id ?? null,
      }))
      const committedDates = new Set(
        ((plansRes.data ?? []) as { date: string; committed_at: string | null }[])
          .filter(p => p.committed_at).map(p => p.date),
      )
      const buckets = (bucketsRes.data ?? []) as { id: string; name: string; color: AccentSlot; state: string }[]

      // Weekly scores (windowDays=8 ensures the window covers the loaded week)
      const c = computeConsistency({ blocks, committedDates, buckets, today, windowDays: 8 })

      const countable = blocks.filter(b => committedDates.has(b.date))
      const panorama: PanoramaCell[] = buckets.map(b => ({
        id: b.id, name: b.name, color: b.color, state: b.state,
        pct: c.byBucket[b.id]?.pct ?? null,
      }))

      // The gap — one: lowest non-parked bucket with data and an actual shortfall
      let gap: WeeklyMirror['gap'] = null
      for (const b of buckets) {
        if (b.state === 'parked') continue
        const s = c.byBucket[b.id]
        if (!s || s.pct == null || s.pct >= 1) continue
        const missed = s.countable - s.done
        if (!gap || s.pct < gap.pct) gap = { name: b.name, color: b.color, pct: s.pct, missed }
      }

      // Wins — buckets with completions, most first
      const wins = buckets
        .map(b => ({ name: b.name, color: b.color, done: c.byBucket[b.id]?.done ?? 0 }))
        .filter(w => w.done > 0)
        .sort((a, b) => b.done - a.done)

      const totalDone = countable.filter(b => b.status === 'done').length

      // One pattern, offered as a question — where slips concentrate by weekday
      const missByDay: Record<number, number> = {}
      for (const b of countable) {
        if (b.status !== 'missed') continue
        const d = new Date(b.date + 'T12:00:00').getDay()
        missByDay[d] = (missByDay[d] ?? 0) + 1
      }
      let pattern: string | null = null
      const worst = Object.entries(missByDay).sort((a, b) => b[1] - a[1])[0]
      if (worst && worst[1] >= 2) {
        pattern = `Most of this week's slips landed on ${WEEKDAYS[Number(worst[0])]}s — protect that day next week?`
      }

      // Headline — softens on a bad week, never hides the gap
      let headline: string
      if (c.lifeGpa == null) {
        headline = 'A fresh week. Commit a day to start the mirror.'
      } else if (c.lifeGpa >= 3.4) {
        headline = `A strong week — life GPA ${c.lifeGpa.toFixed(1)}. The inputs are showing up.`
      } else if (c.lifeGpa >= 2.4) {
        headline = gap ? `A solid week, with one gap worth naming.` : 'A solid, steady week.'
      } else {
        headline = 'A hard week — and the gap’s in plain sight. Next week starts now.'
      }

      const rangeLabel = `${new Date(start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(end + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

      setState({
        loading: false, rangeLabel, lifeGpa: c.lifeGpa, headline,
        panorama, gap, wins, comeback: c.comeback, totalDone, pattern,
      })
    })

    return () => { cancelled = true }
  }, [user, today, start, end])

  return state
}
