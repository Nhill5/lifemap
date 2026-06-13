import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToday } from '@/hooks/useToday'
import { weekRange } from '@/lib/week'
import { materializeRecurrence, clearFutureOccurrences } from '@/lib/recurrence'
import type { Bucket, ChiefGoal, SubGoal, SubGoalType, TrackRating } from '@/types'

export interface ChiefGoalParams {
  title: string
  targetValue: number | null
  targetUnit: string | null
  baselineValue: number | null
  deadline: string | null
}

export interface SubGoalParams {
  title: string
  type: SubGoalType
  cadencePerWeek: number | null
  dailyTarget: number | null
  targetUnit: string | null
  recurrenceDays: number[] | null   // schedule_it: 0=Sun..6=Sat; null = flexible cadence
  recurrenceTime: string | null     // schedule_it: HH:MM; null = untimed
  recurrenceDurationMin: number | null
}

export interface TrackToday {
  value: number | null
  rating: TrackRating | null
}

export interface BucketDetail {
  bucket: Bucket | null
  chiefGoal: ChiefGoal | null
  subGoals: SubGoal[]
  loading: boolean
  /** today's track_log per track-it sub-goal id */
  trackToday: Record<string, TrackToday>
  /** this week's blocks scheduled (planned+done) per schedule-it sub-goal id */
  weekScheduled: Record<string, number>
  /** this week's blocks completed (done) per schedule-it sub-goal id */
  weekDone: Record<string, number>
  createOrUpdateChiefGoal(params: ChiefGoalParams): Promise<void>
  addSubGoal(params: SubGoalParams): Promise<void>
  editSubGoal(id: string, params: SubGoalParams): Promise<void>
  deleteSubGoal(id: string): Promise<void>
  refetch(): void
}

export function useBucketDetail(bucketId: string | undefined): BucketDetail {
  const { user } = useAuth()
  const today = useToday()
  const { start, end } = weekRange(today)

  const [bucket, setBucket] = useState<Bucket | null>(null)
  const [chiefGoal, setChiefGoal] = useState<ChiefGoal | null>(null)
  const [subGoals, setSubGoals] = useState<SubGoal[]>([])
  const [trackToday, setTrackToday] = useState<Record<string, TrackToday>>({})
  const [weekScheduled, setWeekScheduled] = useState<Record<string, number>>({})
  const [weekDone, setWeekDone] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!user || !bucketId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    ;(async () => {
      const [bucketRes, chiefRes, subRes] = await Promise.all([
        supabase.from('buckets').select('*').eq('id', bucketId).maybeSingle(),
        supabase.from('chief_goals').select('*').eq('bucket_id', bucketId).eq('status', 'active').maybeSingle(),
        supabase.from('sub_goals').select('*').eq('bucket_id', bucketId).eq('status', 'active').order('created_at'),
      ])
      if (cancelled) return

      const subs = (subRes.data ?? []) as SubGoal[]
      const subIds = subs.map(s => s.id)

      // Today's track logs + this week's blocks for these sub-goals (only if any exist)
      const [trackRes, blocksRes] = await Promise.all([
        subIds.length
          ? supabase.from('track_logs').select('sub_goal_id, value, rating')
              .eq('user_id', user.id).eq('date', today).in('sub_goal_id', subIds)
          : Promise.resolve({ data: [] as { sub_goal_id: string; value: number | null; rating: TrackRating | null }[] }),
        subIds.length
          ? supabase.from('blocks').select('sub_goal_id, status')
              .eq('user_id', user.id).gte('date', start).lte('date', end)
              .in('status', ['planned', 'done', 'missed']).in('sub_goal_id', subIds)
          : Promise.resolve({ data: [] as { sub_goal_id: string | null; status: string }[] }),
      ])
      if (cancelled) return

      const track: Record<string, TrackToday> = {}
      for (const t of (trackRes.data ?? []) as { sub_goal_id: string; value: number | null; rating: TrackRating | null }[]) {
        track[t.sub_goal_id] = { value: t.value, rating: t.rating }
      }

      const scheduled: Record<string, number> = {}
      const done: Record<string, number> = {}
      for (const b of (blocksRes.data ?? []) as { sub_goal_id: string | null; status: string }[]) {
        if (!b.sub_goal_id) continue
        if (b.status === 'planned' || b.status === 'done') {
          scheduled[b.sub_goal_id] = (scheduled[b.sub_goal_id] ?? 0) + 1
        }
        if (b.status === 'done') {
          done[b.sub_goal_id] = (done[b.sub_goal_id] ?? 0) + 1
        }
      }

      setBucket((bucketRes.data ?? null) as Bucket | null)
      setChiefGoal((chiefRes.data ?? null) as ChiefGoal | null)
      setSubGoals(subs)
      setTrackToday(track)
      setWeekScheduled(scheduled)
      setWeekDone(done)
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [user, bucketId, today, start, end, tick])

  async function createOrUpdateChiefGoal(p: ChiefGoalParams) {
    if (!user || !bucketId) return
    const fields = {
      title: p.title,
      target_value: p.targetValue,
      target_unit: p.targetUnit,
      baseline_value: p.baselineValue,
      deadline: p.deadline,
    }
    if (chiefGoal) {
      await supabase.from('chief_goals').update(fields).eq('id', chiefGoal.id)
    } else {
      await supabase.from('chief_goals').insert({
        user_id: user.id, bucket_id: bucketId, status: 'active', ...fields,
      })
    }
    refetch()
  }

  async function addSubGoal(p: SubGoalParams) {
    if (!user || !bucketId) return
    const schedule = p.type === 'schedule_it'
    const { data: inserted } = await supabase.from('sub_goals').insert({
      user_id: user.id,
      bucket_id: bucketId,
      chief_goal_id: chiefGoal?.id ?? null,
      title: p.title,
      type: p.type,
      cadence_per_week: schedule ? p.cadencePerWeek : null,
      daily_target: p.type === 'track_it' ? p.dailyTarget : null,
      target_unit: p.type === 'track_it' ? p.targetUnit : null,
      recurrence_days: schedule ? p.recurrenceDays : null,
      recurrence_time: schedule ? p.recurrenceTime : null,
      recurrence_duration_min: schedule ? p.recurrenceDurationMin : null,
      data_source: 'manual',
      status: 'active',
    }).select('id').single()

    // Fill the calendar across the horizon so it shows on every chosen day.
    if (inserted && schedule && p.recurrenceDays && p.recurrenceDays.length > 0) {
      await materializeRecurrence({
        userId: user.id, subGoalId: inserted.id, title: p.title,
        days: p.recurrenceDays, time: p.recurrenceTime, durationMin: p.recurrenceDurationMin, fromDate: today,
      })
    }
    refetch()
  }

  async function editSubGoal(id: string, p: SubGoalParams) {
    if (!user) return
    const schedule = p.type === 'schedule_it'
    await supabase.from('sub_goals').update({
      title: p.title,
      type: p.type,
      cadence_per_week: schedule ? p.cadencePerWeek : null,
      daily_target: p.type === 'track_it' ? p.dailyTarget : null,
      target_unit: p.type === 'track_it' ? p.targetUnit : null,
      recurrence_days: schedule ? p.recurrenceDays : null,
      recurrence_time: schedule ? p.recurrenceTime : null,
      recurrence_duration_min: schedule ? p.recurrenceDurationMin : null,
    }).eq('id', id)

    // Re-sync future occurrences to the edited pattern (done/missed kept).
    await clearFutureOccurrences(id, today)
    if (schedule && p.recurrenceDays && p.recurrenceDays.length > 0) {
      await materializeRecurrence({
        userId: user.id, subGoalId: id, title: p.title,
        days: p.recurrenceDays, time: p.recurrenceTime, durationMin: p.recurrenceDurationMin, fromDate: today,
      })
    }
    refetch()
  }

  async function deleteSubGoal(id: string) {
    // Soft-delete: keep the row for history, drop it from active views,
    // and clear its future (un-done) occurrences from the calendar.
    await supabase.from('sub_goals').update({ status: 'abandoned' }).eq('id', id)
    await clearFutureOccurrences(id, today)
    refetch()
  }

  return {
    bucket, chiefGoal, subGoals, loading,
    trackToday, weekScheduled, weekDone,
    createOrUpdateChiefGoal, addSubGoal, editSubGoal, deleteSubGoal, refetch,
  }
}
