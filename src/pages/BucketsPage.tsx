import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { BucketTile } from '@/components/ui/BucketTile'
import { useBucketPanorama } from '@/hooks/useBucketPanorama'

export function BucketsPage() {
  const navigate = useNavigate()
  const { rows, loading } = useBucketPanorama()

  return (
    <AppShell>
      <Eyebrow style={{ marginBottom: 6, display: 'block' }}>Your buckets</Eyebrow>
      <p style={{ fontFamily: 'var(--font-voice)', fontSize: 22, fontWeight: 500, marginBottom: 24 }}>
        The whole life, at a glance.
      </p>

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
