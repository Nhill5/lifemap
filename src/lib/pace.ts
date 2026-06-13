import type { ChiefGoal, ChiefGoalProgress } from '@/types'

export interface PaceResult {
  /** enough data (target + deadline + baseline) to compute a real pace */
  hasData: boolean
  current: number | null
  baseline: number | null
  target: number | null
  unit: string | null
  /** progress baseline → target, 0–100 */
  pct: number
  /** where you "should" be by now on a straight line, 0–100 */
  expectedPct: number
  onPace: boolean
  /** headline read, warm phrasing (never scolds) */
  label: string
  /** secondary read — projected landing vs deadline, or progress note */
  detail: string | null
  /** nudge shown when there isn't enough to compute */
  nudge: string | null
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso.slice(0, 10) + 'T12:00:00').getTime()
  const b = new Date(toIso.slice(0, 10) + 'T12:00:00').getTime()
  return Math.round((b - a) / 86_400_000)
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(iso: string): string {
  return new Date(iso.slice(0, 10) + 'T12:00:00')
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function spanLabel(days: number): string {
  const d = Math.abs(days)
  if (d < 10) return `${d} day${d === 1 ? '' : 's'}`
  if (d < 60) return `${Math.round(d / 7)} weeks`
  return `${Math.round(d / 30)} months`
}

function fmtVal(v: number, unit: string | null): string {
  const n = Number.isInteger(v) ? v.toString() : v.toFixed(1)
  return unit ? `${n} ${unit}` : n
}

/**
 * Pace read for a chief goal — the outcome-vs-input "needle".
 * `entries` should be ordered ascending by date (latest used as current).
 * Works for both directions (lose weight: target < baseline; grow: target > baseline).
 */
export function computePace(
  goal: ChiefGoal,
  entries: ChiefGoalProgress[],
  today: string,
): PaceResult {
  const target = goal.target_value
  const baseline = goal.baseline_value
  const unit = goal.target_unit
  const latest = entries.length ? entries[entries.length - 1].value : null
  const current = latest ?? baseline

  const base: PaceResult = {
    hasData: false, current, baseline, target, unit,
    pct: 0, expectedPct: 0, onPace: true, label: '', detail: null, nudge: null,
  }

  if (target == null || baseline == null || !goal.deadline) {
    return { ...base, nudge: 'Add a baseline, target value, and deadline to track outcome pace.' }
  }

  const denom = target - baseline
  if (denom === 0) {
    return { ...base, nudge: 'Target equals baseline — set a different target to track pace.' }
  }

  const cur = current ?? baseline
  const pct = Math.max(0, Math.min(100, ((cur - baseline) / denom) * 100))

  const start = goal.created_at
  const totalDays = daysBetween(start, goal.deadline)
  const elapsed = daysBetween(start, today)
  const daysLeft = daysBetween(today, goal.deadline)
  const expectedPct = totalDays > 0 ? Math.max(0, Math.min(100, (elapsed / totalDays) * 100)) : 0

  const onPace = pct + 0.5 >= expectedPct

  // Projected landing date at the current rate
  const moved = cur - baseline
  let detail: string | null = null
  if (pct >= 100) {
    detail = `Target reached — ${fmtVal(cur, unit)}.`
  } else if (elapsed <= 0 || moved === 0) {
    detail = daysLeft >= 0 ? `${spanLabel(daysLeft)} left to go.` : 'Past the deadline.'
  } else if (Math.sign(moved) !== Math.sign(denom)) {
    detail = `Currently moving away from ${fmtVal(target, unit)} — worth a look.`
  } else {
    const projectedFromStart = Math.round((denom * elapsed) / moved)
    const projectedDate = addDays(start, projectedFromStart)
    const slip = daysBetween(goal.deadline, projectedDate)
    if (slip > 3) {
      detail = `At this rate you'll get there around ${fmtDate(projectedDate)} — about ${spanLabel(slip)} past your deadline.`
    } else if (slip < -3) {
      detail = `At this rate you're ${spanLabel(slip)} ahead — landing around ${fmtDate(projectedDate)}.`
    } else {
      detail = `On track to land right around ${fmtDate(goal.deadline)}.`
    }
  }

  const label = pct >= 100
    ? `Reached: ${fmtVal(target, unit)}`
    : onPace
      ? `On pace for ${fmtVal(target, unit)} by ${fmtDate(goal.deadline)}`
      : `Behind pace for ${fmtVal(target, unit)} by ${fmtDate(goal.deadline)}`

  return {
    hasData: true, current: cur, baseline, target, unit,
    pct: Math.round(pct), expectedPct: Math.round(expectedPct),
    onPace, label, detail, nudge: null,
  }
}
