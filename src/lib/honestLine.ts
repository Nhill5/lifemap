/**
 * The Evening Mirror's ONE honest line (§9, §21 voice spec).
 * Surfaces exactly one observation. Warm at slips, never scolds at night —
 * recovery time. Names the truth plainly; never vague, never red.
 */
export interface EveningStats {
  totalBlocks: number
  doneBlocks: number
  missedBlocks: number
  trackTotal: number
  trackHit: number
  /** a specific win to name, if any (e.g. "Strength training") */
  highlight?: string | null
}

export function eveningLine(s: EveningStats): string {
  const { totalBlocks, doneBlocks, missedBlocks, trackTotal, trackHit } = s
  const nothingPlanned = totalBlocks === 0 && trackTotal === 0
  const allBlocks = totalBlocks > 0 && doneBlocks === totalBlocks
  const allTargets = trackTotal === 0 || trackHit === trackTotal

  if (nothingPlanned) {
    return "Nothing was on the books today. Tomorrow's a fresh page."
  }
  if (allBlocks && allTargets && trackTotal > 0) {
    return 'Every block, every target. That’s a day you can bank.'
  }
  if (allBlocks) {
    return 'You cleared the whole schedule. Bank it.'
  }
  if (doneBlocks > 0 && missedBlocks > 0) {
    return `${doneBlocks} of ${totalBlocks} blocks landed. The rest keep till tomorrow — no cascade.`
  }
  if (doneBlocks === 0 && totalBlocks > 0) {
    return 'A quiet one. Rest is part of the plan — back at it tomorrow.'
  }
  if (trackTotal > 0 && trackHit > 0) {
    return `${trackHit} of ${trackTotal} targets hit. Steady.`
  }
  return 'Logged. Reviewing beats reconstructing — see you tomorrow.'
}
