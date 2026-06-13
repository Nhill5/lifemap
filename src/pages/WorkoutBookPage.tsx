import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { BackBar } from '@/components/layout/BackBar'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { useWorkoutHistory, type WorkoutSummary } from '@/hooks/useWorkoutHistory'
import { useWorkoutTemplates, type TemplateSummary } from '@/hooks/useWorkoutTemplates'
import { formatDateLabel } from '@/hooks/useToday'
import { useState, type CSSProperties } from 'react'

const cardStyle: CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: 'var(--r-md)', padding: '14px 16px',
}

function SessionRow({ w, onOpen }: { w: WorkoutSummary; onOpen: () => void }) {
  return (
    <button onClick={onOpen} style={{ ...cardStyle, width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>
          {w.name ?? 'Workout'}
          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-faint)', fontWeight: 500 }}>
            {formatDateLabel(w.date)}
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
          {w.exerciseCount} exercise{w.exerciseCount === 1 ? '' : 's'} · {w.setCount} set{w.setCount === 1 ? '' : 's'}
          {w.topSet && <span style={{ color: 'var(--fitness)' }}> · top {w.topSet.weight}{w.topSet.unit} {w.topSet.name}</span>}
        </div>
      </div>
      <span style={{ fontSize: 14, color: 'var(--text-faint)' }}>›</span>
    </button>
  )
}

function TemplateRow({ t, onStart, onDelete }: { t: TemplateSummary; onStart: () => void; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.exercises.length ? t.exercises.join(' · ') : 'No exercises'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        <Button size="sm" variant="primary" onClick={onStart}>Start</Button>
        {confirm ? (
          <>
            <button onClick={() => { setConfirm(false); onDelete() }} style={{ background: 'none', border: 'none', color: 'var(--warm)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
            <button onClick={() => setConfirm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>No</button>
          </>
        ) : (
          <button onClick={() => setConfirm(true)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
        )}
      </div>
    </div>
  )
}

export function WorkoutBookPage() {
  const navigate = useNavigate()
  const { workouts, loading } = useWorkoutHistory()
  const { templates, deleteTemplate } = useWorkoutTemplates()

  return (
    <AppShell>
      <BackBar to="/now" label="Now" />

      <div style={{ marginBottom: 20 }}>
        <Eyebrow style={{ marginBottom: 6, display: 'block' }}>Workout book</Eyebrow>
        <h2 style={{ fontFamily: 'var(--font-voice)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>
          Every session, every routine
        </h2>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Button variant="primary" onClick={() => navigate('/workout')} style={{ width: '100%' }}>
          Start today's workout →
        </Button>
      </div>

      {/* Routines */}
      {templates.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <Eyebrow style={{ marginBottom: 12, display: 'block' }}>Routines</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {templates.map(t => (
              <TemplateRow
                key={t.id}
                t={t}
                onStart={() => navigate(`/workout?template=${t.id}`)}
                onDelete={() => deleteTemplate(t.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <Eyebrow style={{ marginBottom: 12, display: 'block' }}>History</Eyebrow>
      {loading ? (
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
          Loading…
        </div>
      ) : workouts.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>
          No workouts logged yet. Start one above — it'll show up here so you can flip back and edit any session.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {workouts.map(w => (
            <SessionRow key={w.id} w={w} onOpen={() => navigate(`/workout/session/${w.id}`)} />
          ))}
        </div>
      )}
    </AppShell>
  )
}
