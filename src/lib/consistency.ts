/**
 * Consistency engine (§6). NO STREAKS. A rolling ratio over a ~14-day window of
 * what you *committed* to. One miss barely moves it; it degrades gracefully and
 * never resets to zero — no cliff, no cascade. Parked buckets are excluded.
 *
 * Measures the same thing the mirror shows: did you do what you said you would.
 */

export interface ScoreBlock {
  date: string
  status: string          // 'planned' | 'done' | 'missed' | ...
  bucketId: string | null
}

export interface BucketScore {
  done: number
  countable: number       // done + missed on committed days
  pct: number | null      // null = no committed data yet
}

export interface ConsistencyResult {
  overall: BucketScore
  byBucket: Record<string, BucketScore>
  /** weighted rollup, parked excluded, on a 0–4.0 GPA scale (null = no data) */
  lifeGpa: number | null
  comeback: boolean       // slipped on the last active day, showed up today
  todayDone: number
  todayMissed: number
}

export function pctToGpa(pct: number): number {
  return Math.round(pct * 4 * 10) / 10
}

function blankScore(): BucketScore {
  return { done: 0, countable: 0, pct: null }
}

function finalize(done: number, countable: number): BucketScore {
  return { done, countable, pct: countable === 0 ? null : done / countable }
}

export function computeConsistency(params: {
  blocks: ScoreBlock[]
  committedDates: Set<string>
  buckets: { id: string; state: string }[]
  today: string
  windowDays?: number
}): ConsistencyResult {
  const { blocks, committedDates, buckets, today, windowDays = 14 } = params

  // Window: today and the previous windowDays-1 days
  const start = (() => {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - (windowDays - 1))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  // Countable = committed days, terminal status, inside the window
  const countable = blocks.filter(b =>
    b.date >= start && b.date <= today &&
    committedDates.has(b.date) &&
    (b.status === 'done' || b.status === 'missed'),
  )

  // Overall (all buckets)
  const overall = finalize(
    countable.filter(b => b.status === 'done').length,
    countable.length,
  )

  // Per bucket
  const byBucket: Record<string, BucketScore> = {}
  for (const bucket of buckets) {
    const bs = countable.filter(b => b.bucketId === bucket.id)
    byBucket[bucket.id] = finalize(bs.filter(b => b.status === 'done').length, bs.length)
  }

  // Life GPA: weighted by countable volume, parked buckets excluded
  const parked = new Set(buckets.filter(b => b.state === 'parked').map(b => b.id))
  let wSum = 0
  let wTotal = 0
  for (const bucket of buckets) {
    if (parked.has(bucket.id)) continue
    const s = byBucket[bucket.id]
    if (s.pct == null) continue
    wSum += s.pct * s.countable
    wTotal += s.countable
  }
  const lifeGpa = wTotal === 0 ? null : pctToGpa(wSum / wTotal)

  // Comeback: the last active committed day (before today) was a clear slip
  // (a miss, nothing done) and today you showed up with at least one done.
  const todayBlocks = blocks.filter(b => b.date === today && committedDates.has(today))
  const todayDone = todayBlocks.filter(b => b.status === 'done').length
  const todayMissed = todayBlocks.filter(b => b.status === 'missed').length

  const priorActiveDates = [...new Set(
    countable.filter(b => b.date < today).map(b => b.date),
  )].sort().reverse()
  let comeback = false
  if (todayDone > 0 && priorActiveDates.length > 0) {
    const last = priorActiveDates[0]
    const lastDone = countable.filter(b => b.date === last && b.status === 'done').length
    const lastMissed = countable.filter(b => b.date === last && b.status === 'missed').length
    comeback = lastDone === 0 && lastMissed > 0
  }

  return { overall, byBucket, lifeGpa, comeback, todayDone, todayMissed }
}

export { blankScore }
