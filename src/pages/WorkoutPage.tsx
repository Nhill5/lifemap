import { useState, type CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { BackBar } from '@/components/layout/BackBar'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { useToday, formatDateLabel } from '@/hooks/useToday'
import { useExercises } from '@/hooks/useExercises'
import { useWorkout, type SessionExercise } from '@/hooks/useWorkout'
import { useCelebration } from '@/contexts/CelebrationContext'

/* ------------------------------------------------------------------ */
/*  Exercise card — set table + new-set row + last-session "prev"       */
/* ------------------------------------------------------------------ */

function ExerciseCard({
  ex, onAddSet, onDeleteSet, onRemove,
}: {
  ex: SessionExercise
  onAddSet: (reps: number | null, weight: number | null, unit: 'lb' | 'kg') => Promise<boolean>
  onDeleteSet: (setId: string) => void
  onRemove: () => void
}) {
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb')
  const [saving, setSaving] = useState(false)

  const nextNum = (ex.sets.at(-1)?.set_number ?? 0) + 1
  const prevForNext = ex.lastSets.find(s => s.set_number === nextNum)
  const wNum = weight.trim() === '' ? null : Number(weight)
  const wouldPr = wNum != null && ex.prBest > 0 && wNum > ex.prBest

  async function save() {
    if (reps.trim() === '' && weight.trim() === '') return
    setSaving(true)
    try {
      await onAddSet(reps.trim() === '' ? null : Number(reps), wNum, unit)
      setReps(''); setWeight('')
    } finally { setSaving(false) }
  }

  function fmtPrev(s: { reps: number | null; weight: number | null; unit: string } | undefined) {
    if (!s) return '—'
    return `${s.reps ?? '—'} × ${s.weight ?? '—'}${s.weight != null ? ` ${s.unit}` : ''}`
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{ex.name}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {ex.prBest > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
              best {ex.prBest} {unit}
            </span>
          )}
          <button onClick={onRemove} aria-label="Remove exercise"
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit' }}>
            ✕
          </button>
        </div>
      </div>

      <div className="set-table">
        <div className="set-head">
          <span>#</span><span>Last time</span><span>Reps</span><span>Weight</span><span></span>
        </div>

        {ex.sets.map(s => (
          <div className="set-row" key={s.id}>
            <span className="set-n">{s.set_number}</span>
            <span className="set-prev">{fmtPrev(ex.lastSets.find(l => l.set_number === s.set_number))}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{s.reps ?? '—'}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{s.weight ?? '—'}{s.weight != null ? ` ${s.unit}` : ''}</span>
            <button onClick={() => onDeleteSet(s.id)} className="set-check" aria-label="Delete set"
              style={{ background: 'none', borderColor: 'var(--line)', color: 'var(--text-faint)' }}>
              ✕
            </button>
          </div>
        ))}

        {/* New set */}
        <div className="set-row">
          <span className="set-n">{nextNum}</span>
          <span className="set-prev">{fmtPrev(prevForNext)}</span>
          <input
            className="set-input" inputMode="numeric" placeholder="—"
            value={reps} onChange={e => setReps(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
          />
          <input
            className={`set-input ${wouldPr ? 'pr' : ''}`} inputMode="decimal" placeholder="—"
            value={weight} onChange={e => setWeight(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
          />
          <button className={`set-check ${reps || weight ? 'on' : ''}`} onClick={save} disabled={saving} aria-label="Save set">
            ✓
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {(['lb', 'kg'] as const).map(u => (
          <button key={u} onClick={() => setUnit(u)}
            style={{
              background: unit === u ? 'var(--text)' : 'none', color: unit === u ? 'var(--bg)' : 'var(--text-dim)',
              border: '1px solid var(--line)', borderRadius: 100, padding: '3px 12px', fontSize: 11,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {u}
          </button>
        ))}
        {wouldPr && (
          <span style={{ fontSize: 12, color: 'var(--fitness)', fontWeight: 600, alignSelf: 'center' }}>
            PR pace — beats {ex.prBest}
          </span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add-exercise picker                                                 */
/* ------------------------------------------------------------------ */

function AddExercise({ onPick }: { onPick: (exerciseId: string) => void }) {
  const { exercises, addExercise } = useExercises()
  const [sel, setSel] = useState('')
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  async function addNew() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const ex = await addExercise(newName.trim())
      if (ex) { onPick(ex.id); setNewName('') }
    } finally { setAdding(false) }
  }

  const inputStyle: CSSProperties = {
    background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
    padding: '9px 12px', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', colorScheme: 'dark',
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px dashed var(--line-strong)', borderRadius: 'var(--r-md)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Eyebrow>Add exercise</Eyebrow>
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={sel} onChange={e => setSel(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
          <option value="">From library…</option>
          {exercises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <Button disabled={!sel} onClick={() => { if (sel) { onPick(sel); setSel('') } }}>Add</Button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={newName} onChange={e => setNewName(e.target.value)} placeholder="…or type a new one"
          maxLength={60} style={{ ...inputStyle, flex: 1 }}
          onKeyDown={e => e.key === 'Enter' && addNew()}
        />
        <Button variant="primary" disabled={!newName.trim() || adding} onClick={addNew}>
          {adding ? '…' : 'Create'}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export function WorkoutPage() {
  const { blockId } = useParams<{ blockId?: string }>()
  const today = useToday()
  const wo = useWorkout(blockId)
  const { celebrate } = useCelebration()

  async function handleAddSet(ex: SessionExercise, reps: number | null, weight: number | null, unit: 'lb' | 'kg') {
    const isPr = await wo.addSet(ex, reps, weight, unit)
    if (isPr && weight != null) {
      celebrate({ tier: 'bloom', title: `New ${ex.name} PR`, sub: `${weight} ${unit}`, color: 'var(--fitness)' })
    }
    return isPr
  }

  return (
    <AppShell>
      <BackBar to="/now" label="Now" />

      <div style={{ marginBottom: 20 }}>
        <Eyebrow style={{ marginBottom: 6, display: 'block' }}>Workout</Eyebrow>
        <h2 style={{ fontFamily: 'var(--font-voice)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>
          {formatDateLabel(today)}
        </h2>
      </div>

      {wo.loading ? (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
          Loading…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {wo.exercises.map(ex => (
            <ExerciseCard
              key={ex.weId}
              ex={ex}
              onAddSet={(r, w, u) => handleAddSet(ex, r, w, u)}
              onDeleteSet={wo.deleteSet}
              onRemove={() => wo.removeExercise(ex.weId)}
            />
          ))}

          <AddExercise onPick={wo.addExercise} />

          {wo.exercises.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', marginTop: 8 }}>
              Add an exercise to start logging. Last session's numbers show up so you know what to beat.
            </p>
          )}
        </div>
      )}
    </AppShell>
  )
}
