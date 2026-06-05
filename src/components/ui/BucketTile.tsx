import type { CSSProperties } from 'react'
import type { Bucket, ChiefGoal, SubGoal } from '@/types'

interface BucketTileProps {
  bucket: Bucket
  chiefGoal: ChiefGoal | null
  subGoals: SubGoal[]
  chiefPct: number     // 0–100 pace to goal
  paceLabel: string
  span?: boolean
  onClick?: () => void
}

function stateLabel(s: string): string {
  return s === 'parked' ? 'Resting' : s.charAt(0).toUpperCase() + s.slice(1)
}

export function BucketTile({
  bucket,
  chiefGoal,
  subGoals,
  chiefPct,
  paceLabel,
  span,
  onClick,
}: BucketTileProps) {
  const color = `var(--${bucket.color})`
  const parked = bucket.state === 'parked'

  const subSummary = subGoals
    .map(s =>
      s.type === 'schedule_it' && s.cadence_per_week
        ? `${s.title} ${s.cadence_per_week}×/wk`
        : s.title,
    )
    .join(' · ')

  return (
    <div
      className={`bucket ${bucket.state}${span ? ' span' : ''}`}
      style={{ '--a': color } as CSSProperties}
      onClick={onClick}
    >
      <div className="b-top">
        <div className="b-name">
          <span className="d" />
          {bucket.name}
        </div>
        <div className="state">{stateLabel(bucket.state)}</div>
      </div>

      <div className="goal">{chiefGoal?.title ?? 'No chief goal yet'}</div>

      <div className="sub">
        {parked
          ? "Paused on purpose — doesn't count against you."
          : subSummary || 'No sub-goals yet'}
      </div>

      {!parked && chiefGoal && (
        <>
          <div className="bar">
            <i style={{ width: `${chiefPct}%` }} />
          </div>
          <div className="bar-meta">
            <span>{paceLabel}</span>
            <span>{chiefPct}%</span>
          </div>
        </>
      )}
    </div>
  )
}
