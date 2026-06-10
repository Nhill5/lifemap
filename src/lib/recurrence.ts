import { supabase } from '@/lib/supabase'
import { isoOffset } from '@/hooks/useToday'
import { addMinutes } from '@/hooks/useClock'
import { weekdayOf } from '@/lib/week'

/** How far ahead a recurring sub-goal fills the calendar (~8 weeks). */
export const RECUR_HORIZON_DAYS = 56

/**
 * Place a schedule-it sub-goal's occurrences on every matching weekday across
 * the horizon — so a recurring task lands on the Day calendar for all its days
 * the moment it's created, with no per-day step. Dedupes against existing
 * blocks for the same sub-goal/date. Untimed when `time` is null.
 */
export async function materializeRecurrence(params: {
  userId: string
  subGoalId: string
  title: string
  days: number[] | null         // 0=Sun..6=Sat
  time: string | null           // 'HH:MM' or null (untimed)
  durationMin: number | null
  fromDate: string              // ISO start (inclusive)
  horizonDays?: number
}): Promise<number> {
  const { userId, subGoalId, title, days, time, durationMin, fromDate, horizonDays = RECUR_HORIZON_DAYS } = params
  if (!days || days.length === 0) return 0

  const startTime = time ? time.slice(0, 5) : null
  const endTime = startTime ? addMinutes(startTime, durationMin ?? 60) : null

  const { data: existing } = await supabase.from('blocks').select('date').eq('sub_goal_id', subGoalId)
  const have = new Set((existing ?? []).map(b => (b as { date: string }).date))

  const rows: {
    user_id: string; sub_goal_id: string; source: 'sub_goal'; title: string
    date: string; start_time: string | null; end_time: string | null; status: 'planned'
  }[] = []
  for (let i = 0; i <= horizonDays; i++) {
    const d = isoOffset(fromDate, i)
    if (days.includes(weekdayOf(d)) && !have.has(d)) {
      rows.push({ user_id: userId, sub_goal_id: subGoalId, source: 'sub_goal', title, date: d, start_time: startTime, end_time: endTime, status: 'planned' })
    }
  }
  if (rows.length) await supabase.from('blocks').insert(rows)
  return rows.length
}

/** Remove future auto-generated (still-planned) occurrences of a sub-goal,
 *  leaving done/missed history intact. Used before re-syncing on edit/delete. */
export async function clearFutureOccurrences(subGoalId: string, fromDate: string): Promise<void> {
  await supabase.from('blocks').delete()
    .eq('sub_goal_id', subGoalId).eq('source', 'sub_goal').eq('status', 'planned').gte('date', fromDate)
}
