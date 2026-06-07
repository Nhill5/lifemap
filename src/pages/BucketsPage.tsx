import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { BucketTile } from '@/components/ui/BucketTile'
import { useBucketPanorama } from '@/hooks/useBucketPanorama'
import { useConsistency } from '@/hooks/useConsistency'

export function BucketsPage() {
  const navigate = useNavigate()
  const { rows, loading } = useBucketPanorama()
  const { result } = useConsistency()

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <Eyebrow style={{ marginBottom: 6, display: 'block' }}>Your buckets</Eyebrow>
          <p style={{ fontFamily: 'var(--font-voice)', fontSize: 22, fontWeight: 500 }}>
            The whole life, at a glance.
          </p>
        </div>
        {result && (
          <div className="gpa-pill" title="Rolling 14-day consistency — what you committed to, parked buckets aside">
            <span className="n">{result.lifeGpa != null ? result.lifeGpa.toFixed(1) : '—'}</span>
            <span className="l">Life GPA</span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 48, color: 'var(--text-faint)', fontSize: 14 }}>
          No buckets yet.
        </div>
      ) : (
        <div className="buckets-grid">
          {rows.map(({ bucket, chiefGoal, subGoals, chiefPct, paceLabel }, i) => (
            <BucketTile
              key={bucket.id}
              bucket={bucket}
              chiefGoal={chiefGoal}
              subGoals={subGoals}
              chiefPct={chiefPct}
              paceLabel={paceLabel}
              span={rows.length % 2 === 1 && i === rows.length - 1}
              onClick={() => navigate(`/buckets/${bucket.id}`)}
            />
          ))}
        </div>
      )}
    </AppShell>
  )
}
