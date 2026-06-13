import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { BackBar } from '@/components/layout/BackBar'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { RestTimer } from '@/components/ui/RestTimer'
import { formatDateLabel } from '@/hooks/useToday'
import { useExercises } from '@/hooks/useExercises'
import { useWorkout, type SessionExercise, type SessionSet } from '@/hooks/useWorkout'
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates'
import { useCelebration } from '@/contexts/CelebrationContext'

const NAME_PRESETS = ['Upper', 'Lower', 'Push', 'Pull', 'Full body', 'Legs']

/* ------------------------------------------------------------------ */
/*  Name bar — quick presets (Upper/Lower/…) or a custom name           */
/* ------------------------------------------------------------------ */

function NameBar({ name, onRename }: { name: string | null; onRename: (n: string | null) => void }) {
  const [editing, setEditing] = useState(false)
  const [custom, setCustom] = useState('')

  if (!editing) {
    return (
      <button
        onClick={() => { setCustom(name ?? ''); setEditing(true) }}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
          color: name ? 'var(--fitness)' : 'var(--text-faint)', fontSize: 13, fontWeight: 600,
        }}
      >
        {name ? `${name} ✎` : '+ Name this workout'}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {NAME_PRESETS.map(p => (
          <button
            key={p}
            onClick={() => { onRename(p); setEditing(false) }}
            style={{
              background: name === p ? 'var(--fitness)' : 'none', color: name === p ? 'var(--bg)' : 'var(--text-dim)',
              border: '1px solid var(--line)', borderRadius: 100, padding: '5px 12px', fontSize: 12,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {p}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={custom} onChange={e => setCustom(e.target.value)} placeholder="Custom name…"
          maxLength={40} autoFocus
          style={{
            flex: 1, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
            padding: '8px 11px', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
            boxSizing: 'border-box', colorScheme: 'dark',
          }}
          onKeyDown={e => { if (e.key === 'Enter') { onRename(custom); setEditing(false) } }}
        />
        <Button size="sm" variant="primary" onClick={() => { onRename(custom); setEditing(false) }}>Save</Button>
        <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
      {name && (
        <button
          onClick={() => { onRename(null); setEditing(false) }}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Clear name
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Exercise card — set table + new-set row + last-session "prev"       */
/*  Logged sets are tap-to-edit (reps / weight / unit).                 */
/* ------------------------------------------------------------------ */

function fmtPrev(s: { reps: number | null; weight: number | null; unit: string } | undefined) {
  if (!s) return '—'
  return `${s.reps ?? '—'} × ${s.weight ?? '—'}${s.weight != null ? ` ${s.unit}` : ''}`
}

function EditableSetRow({
  set, prev, onSave, onDelete,
}: {
  set: SessionSet
  prev: SessionSet | undefined
  onSave: (reps: number | null, weight: number | null, unit: 'lb' | 'kg') => Promise<void>
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [reps, setReps] = useState(set.reps?.toString() ?? '')
  const [weight, setWeight] = useState(set.weight?.toString() ?? '')
  const [unit, setUnit] = useState<'lb' | 'kg'>(set.unit)
  const [saving, setSaving] = useState(false)

  function begin() {
    setReps(set.reps?.toString() ?? '')
    setWeight(set.weight?.toString() ?? '')
    setUnit(set.unit)
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    try {
      await onSave(
        reps.trim() === '' ? null : Number(reps),
        weight.trim() === '' ? null : Number(weight),
        unit,
      )
      setEditing(false)
    } finally { setSaving(false) }
  }

  if (!editing) {
    return (
      <div className="set-row">
        <span className="set-n">{set.set_number}</span>
        <span className="set-prev">{fmtPrev(prev)}</span>
        <button onClick={begin} style={cellBtn} aria-label="Edit reps">
          {set.reps ?? '—'}
        </button>
        <button onClick={begin} style={cellBtn} aria-label="Edit weight">
          {set.weight ?? '—'}{set.weight != null ? ` ${set.unit}` : ''}
        </button>
        <button onClick={onDelete} className="set-check" aria-label="Delete set"
          style={{ background: 'none', borderColor: 'var(--line)', color: 'var(--text-faint)' }}>
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="set-row">
      <span className="set-n">{set.set_number}</span>
      <button onClick={() => setUnit(u => u === 'lb' ? 'kg' : 'lb')} className="set-prev"
        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, textAlign: 'left', padding: 0 }}>
        tap {unit} ⇄
      </button>
      <input className="set-input" inputMode="numeric" value={reps} autoFocus
        onChange={e => setReps(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} />
      <input className="set-input" inputMode="decimal" value={weight}
        onChange={e => setWeight(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} />
      <button className="set-check on" onClick={save} disabled={saving} aria-label="Save edit">✓</button>
    </div>
  )
}

const cellBtn: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 14, color: 'var(--text)',
  textAlign: 'left', padding: 0,
}

function ExerciseCard({
  ex, onAddSet, onEditSet, onDeleteSet, onRemove, onRest,
}: {
  ex: SessionExercise
  onAddSet: (reps: number | null, weight: number | null, unit: 'lb' | 'kg') => Promise<boolean>
  onEditSet: (setId: string, reps: number | null, weight: number | null, unit: 'lb' | 'kg') => Promise<void>
  onDeleteSet: (setId: string) => void
  onRemove: () => void
  onRest: () => void
}) {
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb')
  const [saving, setSaving] = useState(false)

  const nextNum = (ex.sets.length ? ex.sets[ex.sets.length - 1].set_number : 0) + 1
  const prevForNext = ex.lastSets.find(s => s.set_number === nextNum)
  const wNum = weight.trim() === '' ? null : Number(weight)
  const wouldPr = wNum != null && ex.prBest > 0 && wNum > ex.prBest

  async function save() {
    if (reps.trim() === '' && weight.trim() === '') return
    setSaving(true)
    try {
      await onAddSet(reps.trim() === '' ? null : Number(reps), wNum, unit)
      setReps(''); setWeight('')
      onRest() // a logged set is the natural moment to start the rest clock
    } finally { setSaving(false) }
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
          <EditableSetRow
            key={s.id}
            set={s}
            prev={ex.lastSets.find(l => l.set_number === s.set_number)}
            onSave={(r, w, u) => onEditSet(s.id, r, w, u)}
            onDelete={() => onDeleteSet(s.id)}
          />
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
/*  Template controls — start from a routine / save the current one     */
/* ------------------------------------------------------------------ */

function TemplateControls({
  hasExercises, onStart, onSave,
}: {
  hasExercises: boolean
  onStart: (templateId: string) => Promise<void>
  onSave: (name: string) => Promise<boolean>
}) {
  const { templates } = useWorkoutTemplates()
  const [sel, setSel] = useState('')
  const [savingName, setSavingName] = useState('')
  const [showSave, setShowSave] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const inputStyle: CSSProperties = {
    background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
    padding: '8px 11px', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', colorScheme: 'dark',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {templates.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={sel} onChange={e => setSel(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
            <option value="">Start from a routine…</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name} · {t.exercises.length} exercises</option>
            ))}
          </select>
          <Button
            disabled={!sel || busy}
            onClick={async () => { setBusy(true); try { await onStart(sel); setSel('') } finally { setBusy(false) } }}
          >
            Load
          </Button>
        </div>
      )}

      {hasExercises && (
        showSave ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={savingName} onChange={e => setSavingName(e.target.value)} placeholder="Routine name (e.g. Upper A)"
              maxLength={40} autoFocus style={{ ...inputStyle, flex: 1 }}
            />
            <Button
              variant="primary" disabled={!savingName.trim() || busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const ok = await onSave(savingName.trim())
                  if (ok) { setSaved(true); setShowSave(false); setSavingName(''); setTimeout(() => setSaved(false), 2000) }
                } finally { setBusy(false) }
              }}
            >
              Save
            </Button>
            <Button onClick={() => setShowSave(false)}>Cancel</Button>
          </div>
        ) : (
          <button
            onClick={() => setShowSave(true)}
            style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {saved ? 'Saved as routine ✓' : '＋ Save these as a routine'}
          </button>
        )
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export function WorkoutPage() {
  const { blockId, sessionId } = useParams<{ blockId?: string; sessionId?: string }>()
  const [params, setParams] = useSearchParams()
  const wo = useWorkout({ blockId, sessionId })
  const { celebrate } = useCelebration()
  const [restNonce, setRestNonce] = useState(0) // bump to (re)start the rest timer

  // Arrived from the book's "Start" on a routine (?template=…). Apply it once
  // the session is loaded, then strip the param so a refresh can't re-apply it.
  const appliedTemplate = useRef(false)
  const templateParam = params.get('template')
  useEffect(() => {
    if (wo.loading || !templateParam || appliedTemplate.current) return
    appliedTemplate.current = true
    wo.startFromTemplate(templateParam).then(() => {
      params.delete('template')
      setParams(params, { replace: true })
    })
  }, [wo.loading, templateParam]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAddSet(ex: SessionExercise, reps: number | null, weight: number | null, unit: 'lb' | 'kg') {
    const isPr = await wo.addSet(ex, reps, weight, unit)
    if (isPr && weight != null) {
      celebrate({ tier: 'bloom', title: `New ${ex.name} PR`, sub: `${weight} ${unit}`, color: 'var(--fitness)' })
    }
    return isPr
  }

  async function handleEditSet(ex: SessionExercise, setId: string, reps: number | null, weight: number | null, unit: 'lb' | 'kg') {
    const isPr = await wo.updateSet(ex, setId, { reps, weight, unit })
    if (isPr && weight != null) {
      celebrate({ tier: 'bloom', title: `New ${ex.name} PR`, sub: `${weight} ${unit}`, color: 'var(--fitness)' })
    }
  }

  const editingPast = !!sessionId

  return (
    <AppShell>
      <BackBar to={editingPast ? '/workouts' : '/now'} label={editingPast ? 'Workout book' : 'Now'} />

      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Eyebrow style={{ marginBottom: 6, display: 'block' }}>{wo.name ? wo.name : 'Workout'}</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-voice)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>
            {formatDateLabel(wo.date)}
          </h2>
          <div style={{ marginTop: 6 }}>
            <NameBar name={wo.name} onRename={wo.rename} />
          </div>
        </div>
        {!editingPast && (
          <a href="/workouts" style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', marginTop: 2 }}>
            Workout book →
          </a>
        )}
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
              onEditSet={(id, r, w, u) => handleEditSet(ex, id, r, w, u)}
              onDeleteSet={wo.deleteSet}
              onRemove={() => wo.removeExercise(ex.weId)}
              onRest={() => setRestNonce(n => n + 1)}
            />
          ))}

          <AddExercise onPick={wo.addExercise} />

          <TemplateControls
            hasExercises={wo.exercises.length > 0}
            onStart={wo.startFromTemplate}
            onSave={wo.saveAsTemplate}
          />

          {wo.exercises.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', marginTop: 8 }}>
              Add an exercise to start logging. Last session's numbers show up so you know what to beat.
            </p>
          )}
        </div>
      )}

      <RestTimer nonce={restNonce} />
    </AppShell>
  )
}
