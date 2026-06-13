import { type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { VoiceLine } from '@/components/ui/VoiceLine'
import { useWeeklyMirror } from '@/hooks/useWeeklyMirror'
import { accent, stateLabel } from '@/lib/accent'

export function WeeklyMirrorPage() {
  const navigate = useNavigate()
  const m = useWeeklyMirror()

  if (m.loading) {
    return (
      <AppShell>
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
          Loading…
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      {/* 1 — Headline */}
      <div className="reveal" style={{ marginBottom: 30, '--d': '0s' } as CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
          <Eyebrow>Weekly mirror · {m.rangeLabel}</Eyebrow>
          {m.lifeGpa != null && (
            <div className="gpa-pill">
              <span className="n">{m.lifeGpa.toFixed(1)}</span>
              <span className="l">Life GPA</span>
            </div>
          )}
        </div>
        <VoiceLine style={{ fontSize: 24 }}>{m.headline}</VoiceLine>
      </div>

      {/* 2 — Living panorama */}
      <div className="reveal" style={{ marginBottom: 32, '--d': '0.06s' } as CSSProperties}>
        <Eyebrow style={{ marginBottom: 12, display: 'block' }}>The panorama</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
          {m.panorama.map(cell => {
            const c = accent(cell.color)
            const filter = cell.state === 'wilting' ? 'saturate(0.32) brightness(0.85)'
              : cell.state === 'parked' ? 'grayscale(1) brightness(0.8)' : 'none'
            const opacity = cell.state === 'wilting' ? 0.82 : cell.state === 'parked' ? 0.55 : 1
            return (
              <div
                key={cell.id}
                className={`mini ${cell.state}`}
                onClick={() => navigate(`/buckets/${cell.id}`)}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--line)',
                  borderRadius: 'var(--r-md)', padding: '12px 14px', cursor: 'pointer',
                  filter, opacity, transition: 'transform 0.15s',
                } as CSSProperties}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 10px ${c}` }} />
                  <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cell.name}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-voice)', fontSize: 22, fontWeight: 600 }}>
                  {cell.pct != null ? `${Math.round(cell.pct * 100)}%` : '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {stateLabel(cell.state)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3 — The gap, named (the middle; always shown, never hidden) */}
      {m.gap && (
        <div
          className="reveal"
          style={{
            marginBottom: 32, '--d': '0.1s', padding: '18px 20px',
            borderRadius: 'var(--r-md)', background: 'var(--surface)',
            borderLeft: `3px solid ${accent(m.gap.color)}`, border: '1px solid var(--line)',
          } as CSSProperties}
        >
          <Eyebrow style={{ marginBottom: 8, display: 'block' }}>The gap</Eyebrow>
          <p style={{ fontFamily: 'var(--font-voice)', fontSize: 19, lineHeight: 1.35 }}>
            {m.gap.name} came up short — {Math.round(m.gap.pct * 100)}% of what you committed
            {m.gap.missed > 0 ? `, ${m.gap.missed} missed` : ''}. That's the gap.
          </p>
        </div>
      )}

      {/* 4 — The wins (end on wins, never on the gap) */}
      <div className="reveal" style={{ marginBottom: 32, '--d': '0.14s' } as CSSProperties}>
        <Eyebrow style={{ marginBottom: 12, display: 'block' }}>The wins</Eyebrow>
        {m.comeback && (
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fitness)', marginBottom: 10 }}>
            ✦ A comeback — you slipped and showed up.
          </div>
        )}
        {m.wins.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {m.wins.map(w => (
              <div key={w.name} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent(w.color), flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{w.name}</span>
                <span style={{ color: 'var(--text-dim)' }}>{w.done} done</span>
              </div>
            ))}
            <p style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 4 }}>
              {m.totalDone} block{m.totalDone === 1 ? '' : 's'} completed this week.
            </p>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>
            No completions logged yet — commit a day and the wins start landing.
          </p>
        )}
      </div>

      {/* 5 — One pattern, offered as a question */}
      {m.pattern && (
        <div className="reveal" style={{ marginBottom: 32, '--d': '0.18s' } as CSSProperties}>
          <Eyebrow style={{ marginBottom: 8, display: 'block' }}>One pattern</Eyebrow>
          <VoiceLine style={{ fontSize: 18, fontStyle: 'italic' }}>{m.pattern}</VoiceLine>
        </div>
      )}

      {/* 6 — Set the week ahead (end on the plan — agency) */}
      <div
        className="reveal"
        style={{
          '--d': '0.22s', padding: '20px 22px', borderRadius: 'var(--r-md)',
          background: 'linear-gradient(150deg, color-mix(in srgb, var(--fitness) 9%, var(--surface)), var(--surface))',
          border: '1px solid color-mix(in srgb, var(--fitness) 20%, transparent)',
        } as CSSProperties}
      >
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Set the week ahead</div>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 16 }}>
          The mirror showed you the truth. Now you decide what next week looks like.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="primary" onClick={() => navigate('/week')}>Plan the week →</Button>
          <Button onClick={() => navigate('/now')}>Back to now</Button>
        </div>
      </div>
    </AppShell>
  )
}
