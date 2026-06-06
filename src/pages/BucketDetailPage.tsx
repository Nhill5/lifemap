import { useState, type CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { BackBar } from '@/components/layout/BackBar'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { MeterTile, type MeterData } from '@/components/ui/MeterTile'
import { useBucketDetail, type ChiefGoalParams, type SubGoalParams } from '@/hooks/useBucketDetail'
import { useProposals, type Proposal } from '@/hooks/useProposals'
import { useChiefGoalProgress } from '@/hooks/useChiefGoalProgress'
import { useToday } from '@/hooks/useToday'
import { computePace } from '@/lib/pace'
import { stateLabel } from '@/lib/accent'
import type { ChiefGoal, SubGoal, SubGoalType } from '@/types'

/* ------------------------------------------------------------------ */
/*  Shared input style                                                  */
/* ------------------------------------------------------------------ */

const inputStyle: CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--line)',
  borderRadius: 'var(--r-sm)', padding: '9px 12px', color: 'var(--text)',
  fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  colorScheme: 'dark',
}

const pillBtn: CSSProperties = {
  background: 'none', border: '1px solid var(--line)', borderRadius: 100,
  padding: '4px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)',
  cursor: 'pointer', fontFamily: 'inherit',
}

/* ------------------------------------------------------------------ */
/*  Chief-goal editor                                                   */
/* ------------------------------------------------------------------ */

function ChiefGoalEditor({
  chiefGoal, color, onSave, onCancel,
}: {
  chiefGoal: ChiefGoal | null
  color: string
  onSave: (p: ChiefGoalParams) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle]       = useState(chiefGoal?.title ?? '')
  const [target, setTarget]     = useState(chiefGoal?.target_value?.toString() ?? '')
  const [unit, setUnit]         = useState(chiefGoal?.target_unit ?? '')
  const [baseline, setBaseline] = useState(chiefGoal?.baseline_value?.toString() ?? '')
  const [deadline, setDeadline] = useState(chiefGoal?.deadline ?? '')
  const [saving, setSaving]     = useState(false)

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        targetValue: target.trim() === '' ? null : Number(target),
        targetUnit: unit.trim() || null,
        baselineValue: baseline.trim() === '' ? null : Number(baseline),
        deadline: deadline || null,
      })
    } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Eyebrow>Chief goal</Eyebrow>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="The outcome you're working toward"
        maxLength={120}
        autoFocus
        style={inputStyle}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Target value</label>
          <input type="number" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. 180" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Unit</label>
          <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="lbs, $, …" maxLength={16} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Baseline (start)</label>
          <input type="number" inputMode="decimal" value={baseline} onChange={e => setBaseline(e.target.value)} placeholder="e.g. 220" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Deadline</label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary" disabled={!title.trim() || saving} onClick={save} style={{ flex: 1, '--c': color } as CSSProperties}>
          {saving ? 'Saving…' : 'Save chief goal'}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Outcome needle — the chief-goal pace tracker (PR #9)                */
/* ------------------------------------------------------------------ */

function OutcomeBlock({ goal, color, today }: { goal: ChiefGoal; color: string; today: string }) {
  const { entries, logValue } = useChiefGoalProgress(goal.id)
  const pace = computePace(goal, entries, today)
  const [val, setVal] = useState('')
  const [saving, setSaving] = useState(false)

  async function log() {
    if (val.trim() === '') return
    setSaving(true)
    try {
      await logValue(today, Number(val))
      setVal('')
    } finally { setSaving(false) }
  }

  const accentColor = pace.hasData ? (pace.onPace ? color : 'var(--warm)') : 'var(--text-faint)'

  return (
    <div style={{ marginTop: 4, marginBottom: 18 }}>
      {pace.nudge ? (
        <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: '0 0 12px', lineHeight: 1.45 }}>
          {pace.nudge}
        </p>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: accentColor, marginBottom: 8 }}>
            {pace.label}
          </div>

          {/* Needle: progress fill + faint "should be here" marker */}
          <div className="bd-bar" style={{ position: 'relative' }}>
            <i style={{ width: `${pace.pct}%`, background: accentColor }} />
            <span
              title="Where a straight line to the deadline would put you"
              style={{
                position: 'absolute', top: -2, bottom: -2, left: `${pace.expectedPct}%`,
                width: 2, background: 'var(--text-faint)', opacity: 0.7, borderRadius: 2,
              }}
            />
          </div>

          <div className="bd-pace-note" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>
              {pace.current != null ? `Now ${pace.current}${pace.unit ? ` ${pace.unit}` : ''}` : '—'}
              {' · '}{pace.pct}% there
            </span>
            <span style={{ color: 'var(--text-faint)' }}>baseline {pace.baseline} → {pace.target}</span>
          </div>
          {pace.detail && (
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '8px 0 0', lineHeight: 1.45 }}>
              {pace.detail}
            </p>
          )}
        </>
      )}

      {/* Manual entry */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, maxWidth: 320 }}>
        <input
          type="number"
          inputMode="decimal"
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={pace.current != null ? `Today's value (now ${pace.current})` : "Today's value"}
          style={inputStyle}
          onKeyDown={e => e.key === 'Enter' && log()}
        />
        <Button size="sm" variant="primary" disabled={val.trim() === '' || saving} onClick={log}>
          {saving ? '…' : 'Log'}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-goal form (add / edit)                                          */
/* ------------------------------------------------------------------ */

function SubGoalForm({
  initial, onSave, onCancel,
}: {
  initial: SubGoal | null
  onSave: (p: SubGoalParams) => Promise<void>
  onCancel: () => void
}) {
  const [type, setType]       = useState<SubGoalType>(initial?.type ?? 'schedule_it')
  const [title, setTitle]     = useState(initial?.title ?? '')
  const [cadence, setCadence] = useState(initial?.cadence_per_week?.toString() ?? '3')
  const [target, setTarget]   = useState(initial?.daily_target?.toString() ?? '')
  const [unit, setUnit]       = useState(initial?.target_unit ?? '')
  const [saving, setSaving]   = useState(false)

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        type,
        cadencePerWeek: type === 'schedule_it' ? (cadence.trim() === '' ? null : Number(cadence)) : null,
        dailyTarget: type === 'track_it' ? (target.trim() === '' ? null : Number(target)) : null,
        targetUnit: type === 'track_it' ? (unit.trim() || null) : null,
      })
    } finally { setSaving(false) }
  }

  return (
    <div
      style={{
        background: 'var(--surface)', border: '1px solid var(--line-strong)',
        borderRadius: 'var(--r-md)', padding: '14px', display: 'flex',
        flexDirection: 'column', gap: 10, marginTop: 8,
      }}
    >
      <Eyebrow>{initial ? 'Edit sub-goal' : 'New sub-goal'}</Eyebrow>

      {/* Type toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setType('schedule_it')}
          style={{ ...pillBtn, flex: 1, padding: '9px 12px', minHeight: 40,
            ...(type === 'schedule_it' ? { borderColor: 'var(--work)', color: 'var(--text)', background: 'color-mix(in srgb, var(--work) 12%, var(--bg))' } : {}) }}
        >
          Schedule-it
        </button>
        <button
          onClick={() => setType('track_it')}
          style={{ ...pillBtn, flex: 1, padding: '9px 12px', minHeight: 40,
            ...(type === 'track_it' ? { borderColor: 'var(--fitness)', color: 'var(--text)', background: 'color-mix(in srgb, var(--fitness) 12%, var(--bg))' } : {}) }}
        >
          Track-it
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: 0, lineHeight: 1.4 }}>
        {type === 'schedule_it'
          ? 'Becomes calendar blocks on a weekly cadence (e.g. gym 4×/week).'
          : 'Becomes a daily meter with a target (e.g. 190g protein/day).'}
      </p>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder={type === 'schedule_it' ? 'e.g. Strength training' : 'e.g. Protein'}
        maxLength={80}
        autoFocus
        style={inputStyle}
      />

      {type === 'schedule_it' ? (
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Times per week</label>
          <input type="number" inputMode="numeric" min={1} max={21} value={cadence} onChange={e => setCadence(e.target.value)} style={inputStyle} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Daily target</label>
            <input type="number" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. 190" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Unit</label>
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="g, oz, min…" maxLength={16} style={inputStyle} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary" disabled={!title.trim() || saving} onClick={save} style={{ flex: 1 }}>
          {saving ? 'Saving…' : initial ? 'Save' : 'Add sub-goal'}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Schedule-it row                                                     */
/* ------------------------------------------------------------------ */

function ScheduleRow({
  sub, scheduled, done, proposal, onEdit, onDelete, onScheduleToday,
}: {
  sub: SubGoal
  scheduled: number
  done: number
  proposal: Proposal | undefined
  onEdit: () => void
  onDelete: () => void
  onScheduleToday: (p: Proposal) => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const cadence = sub.cadence_per_week ?? 0

  return (
    <div style={rowStyle}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{sub.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {cadence}×/wk · {done} done, {scheduled} scheduled this week
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {proposal && (
          <button onClick={() => onScheduleToday(proposal)} style={{ ...pillBtn, color: 'var(--text)', borderColor: 'var(--work)' }}>
            Schedule today →
          </button>
        )}
        <button onClick={onEdit} style={pillBtn}>Edit</button>
        {confirmDel ? (
          <>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Remove?</span>
            <button onClick={() => { setConfirmDel(false); onDelete() }} style={{ ...pillBtn, color: 'var(--warm)' }}>Yes</button>
            <button onClick={() => setConfirmDel(false)} style={pillBtn}>No</button>
          </>
        ) : (
          <button onClick={() => setConfirmDel(true)} style={{ ...pillBtn, color: 'var(--text-faint)' }}>Delete</button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Track-it row                                                        */
/* ------------------------------------------------------------------ */

function TrackRow({
  sub, onEdit, onDelete,
}: {
  sub: SubGoal
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  return (
    <div style={rowStyle}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{sub.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {sub.daily_target != null
            ? `${sub.daily_target}${sub.target_unit ? ` ${sub.target_unit}` : ''} / day`
            : 'No daily target set'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        <button onClick={onEdit} style={pillBtn}>Edit</button>
        {confirmDel ? (
          <>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Remove?</span>
            <button onClick={() => { setConfirmDel(false); onDelete() }} style={{ ...pillBtn, color: 'var(--warm)' }}>Yes</button>
            <button onClick={() => setConfirmDel(false)} style={pillBtn}>No</button>
          </>
        ) : (
          <button onClick={() => setConfirmDel(true)} style={{ ...pillBtn, color: 'var(--text-faint)' }}>Delete</button>
        )}
      </div>
    </div>
  )
}

const rowStyle: CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
  background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: 'var(--r-md)', padding: '12px 14px',
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export function BucketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const today = useToday()
  const detail = useBucketDetail(id)
  const proposals = useProposals(today)

  const [editingChief, setEditingChief] = useState(false)
  const [addingSub, setAddingSub]       = useState(false)
  const [editingSubId, setEditingSubId] = useState<string | null>(null)

  const { bucket, chiefGoal, subGoals, loading } = detail
  const color = bucket ? `var(--${bucket.color})` : 'var(--text-faint)'

  if (loading) {
    return (
      <AppShell>
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
          Loading…
        </div>
      </AppShell>
    )
  }

  if (!bucket) {
    return (
      <AppShell>
        <BackBar to="/buckets" label="Buckets" />
        <div style={{ textAlign: 'center', marginTop: 48, color: 'var(--text-faint)' }}>Bucket not found.</div>
      </AppShell>
    )
  }

  const scheduleSubs = subGoals.filter(s => s.type === 'schedule_it')
  const trackSubs    = subGoals.filter(s => s.type === 'track_it')

  // Weekly input adherence for the hero bar
  const target = scheduleSubs.reduce((sum, s) => sum + (s.cadence_per_week ?? 0), 0)
  const doneTotal = scheduleSubs.reduce((sum, s) => sum + (detail.weekDone[s.id] ?? 0), 0)
  const adherence = target > 0 ? Math.min(100, Math.round((doneTotal / target) * 100)) : 0

  // Proposals keyed by sub-goal for the "Schedule today" buttons
  const proposalBySub: Record<string, Proposal> = {}
  for (const p of proposals.proposals) proposalBySub[p.subGoalId] = p

  // Track-it meters from today's logs
  const meters: MeterData[] = trackSubs.map(s => {
    const log = detail.trackToday[s.id]
    const tgt = s.daily_target ?? 0
    const value = log?.value ?? null
    let pct = 0
    if (value != null && tgt > 0) {
      pct = Math.min(100, Math.round((value / tgt) * 100))
    } else if (value == null && log?.rating) {
      pct = log.rating === 'hit' ? 100 : log.rating === 'close' ? 60 : 0
    }
    const valueStr = value != null
      ? `${value}${tgt ? ` / ${tgt}` : ''}${s.target_unit ? ` ${s.target_unit}` : ''}`
      : log?.rating
        ? log.rating
        : `0${tgt ? ` / ${tgt}` : ''}${s.target_unit ? ` ${s.target_unit}` : ''}`
    return { id: s.id, bucket: bucket.color, label: s.title, value: valueStr, pct }
  })

  async function handleScheduleToday(p: Proposal) {
    await proposals.accept(p, today)
    detail.refetch()
  }

  return (
    <AppShell>
      <BackBar to="/buckets" label="Buckets" />

      {/* Chief-goal hero */}
      <div
        className={`bd-hero reveal ${bucket.state === 'thriving' ? 'breathe' : ''}`}
        style={{ '--c': color, '--d': '0.05s' } as CSSProperties}
      >
        <div className="bd-top">
          <div className="bd-name"><span className="d" />{bucket.name}</div>
          <div className="bd-state">{stateLabel(bucket.state)}</div>
        </div>

        {editingChief ? (
          <ChiefGoalEditor
            chiefGoal={chiefGoal}
            color={color}
            onSave={async (p) => { await detail.createOrUpdateChiefGoal(p); setEditingChief(false) }}
            onCancel={() => setEditingChief(false)}
          />
        ) : chiefGoal ? (
          <>
            <div className="bd-chief-label">Chief goal · the outcome</div>
            <div className="bd-chief">{chiefGoal.title}</div>

            {/* Outcome needle + pace read */}
            <OutcomeBlock goal={chiefGoal} color={color} today={today} />

            {/* Weekly inputs — the controllable half (inputs & outcome police each other) */}
            {target > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 6 }}>
                  Inputs this week
                </div>
                <div className="bd-bar"><i style={{ width: `${adherence}%` }} /></div>
                <div className="bd-pace-note">
                  {doneTotal} of {target} weekly inputs done · {adherence}%
                </div>
              </div>
            )}

            <button
              onClick={() => setEditingChief(true)}
              style={{ ...pillBtn, marginTop: 16 }}
            >
              Edit chief goal
            </button>
          </>
        ) : (
          <>
            <div className="bd-chief" style={{ color: 'var(--text-dim)' }}>No chief goal yet</div>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>
              A bucket without a chief goal is just a folder. Name the outcome you're working toward.
            </p>
            <Button variant="primary" onClick={() => setEditingChief(true)} style={{ '--c': color } as CSSProperties}>
              Name a chief goal
            </Button>
          </>
        )}
      </div>

      {/* Track-it meters */}
      {meters.length > 0 && (
        <div className="reveal" style={{ '--d': '0.1s', marginTop: 30 } as CSSProperties}>
          <Eyebrow style={{ marginBottom: 12, display: 'block' }}>Today · track-it meters</Eyebrow>
          <div className="rail">
            {meters.map(m => <MeterTile key={m.id} m={m} />)}
          </div>
        </div>
      )}

      {/* Schedule-it sub-goals */}
      <div className="reveal" style={{ '--d': '0.14s', marginTop: 14 } as CSSProperties}>
        <Eyebrow style={{ marginBottom: 12, display: 'block' }}>Schedule-it · weekly cadence</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {scheduleSubs.length === 0 && !addingSub && (
            <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: '0 0 4px' }}>
              No recurring inputs yet — add one to feed your daily plan.
            </p>
          )}
          {scheduleSubs.map(s => (
            editingSubId === s.id ? (
              <SubGoalForm
                key={s.id}
                initial={s}
                onSave={async (p) => { await detail.editSubGoal(s.id, p); setEditingSubId(null) }}
                onCancel={() => setEditingSubId(null)}
              />
            ) : (
              <ScheduleRow
                key={s.id}
                sub={s}
                scheduled={detail.weekScheduled[s.id] ?? 0}
                done={detail.weekDone[s.id] ?? 0}
                proposal={proposalBySub[s.id]}
                onEdit={() => { setEditingSubId(s.id); setAddingSub(false) }}
                onDelete={() => detail.deleteSubGoal(s.id)}
                onScheduleToday={handleScheduleToday}
              />
            )
          ))}
        </div>
      </div>

      {/* Track-it sub-goals (definitions) */}
      {trackSubs.length > 0 && (
        <div className="reveal" style={{ '--d': '0.16s', marginTop: 24 } as CSSProperties}>
          <Eyebrow style={{ marginBottom: 12, display: 'block' }}>Track-it · daily targets</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {trackSubs.map(s => (
              editingSubId === s.id ? (
                <SubGoalForm
                  key={s.id}
                  initial={s}
                  onSave={async (p) => { await detail.editSubGoal(s.id, p); setEditingSubId(null) }}
                  onCancel={() => setEditingSubId(null)}
                />
              ) : (
                <TrackRow
                  key={s.id}
                  sub={s}
                  onEdit={() => { setEditingSubId(s.id); setAddingSub(false) }}
                  onDelete={() => detail.deleteSubGoal(s.id)}
                />
              )
            ))}
          </div>
        </div>
      )}

      {/* Add sub-goal */}
      <div style={{ marginTop: 16 }}>
        {addingSub ? (
          <SubGoalForm
            initial={null}
            onSave={async (p) => { await detail.addSubGoal(p); setAddingSub(false); proposals.refetch() }}
            onCancel={() => setAddingSub(false)}
          />
        ) : (
          <button
            onClick={() => { setAddingSub(true); setEditingSubId(null) }}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'none', border: '1px dashed var(--line)',
              borderRadius: 'var(--r-md)', padding: '12px',
              color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            Add sub-goal
          </button>
        )}
      </div>
    </AppShell>
  )
}
