import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { useBuckets } from '@/hooks/useBuckets'
import { useBlocks, type RichBlock, type EditBlockParams } from '@/hooks/useBlocks'
import { useDayPlan } from '@/hooks/useDayPlan'
import { useProposals } from '@/hooks/useProposals'
import { useToday, isoOffset, formatDateLabel } from '@/hooks/useToday'
import { useClock, timeToMinutes, formatTimeRange } from '@/hooks/useClock'
import { accent } from '@/lib/accent'
import { WEEKDAYS_MON_FIRST, RECUR_DAILY, RECUR_WEEKDAYS } from '@/lib/week'
import { materializeRecurrence } from '@/lib/recurrence'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Bucket } from '@/types'

function sameSet(a: number[], b: number[]) {
  return a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i])
}

const HOUR_START = 6
const HOUR_END   = 23
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START)

function formatHour(h: number): string {
  if (h === 12) return '12 PM'
  if (h === 0)  return '12 AM'
  return h > 12 ? `${h - 12} PM` : `${h} AM`
}

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
/*  Generic toggle row — 44px tap target                                */
/* ------------------------------------------------------------------ */

function ToggleRow({ value, onChange, label, sub }: { value: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', minHeight: 44, boxSizing: 'border-box',
        background: value ? 'color-mix(in srgb, var(--work) 12%, var(--bg))' : 'var(--bg)',
        border: `1px solid ${value ? 'color-mix(in srgb, var(--work) 45%, transparent)' : 'var(--line)'}`,
        borderRadius: 'var(--r-sm)', cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        style={{ width: 20, height: 20, accentColor: 'var(--work)', cursor: 'pointer', flexShrink: 0 }} />
      <span style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.3 }}>
        {label}{sub && <span style={{ color: 'var(--text-dim)' }}> — {sub}</span>}
      </span>
    </label>
  )
}

function TimeFields({ start, end, setStart, setEnd }: { start: string; end: string; setStart: (v: string) => void; setEnd: (v: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div>
        <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Start</label>
        <input type="time" value={start} onChange={e => setStart(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>End</label>
        <input type="time" value={end} onChange={e => setEnd(e.target.value)} style={inputStyle} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add-block form — time is OPTIONAL (§25.4), untimed by default        */
/* ------------------------------------------------------------------ */

export interface AddSubmit {
  title: string
  bucketId: string | null
  timed: boolean
  start: string
  end: string
  isMajor: boolean
  days: number[]   // empty = one-off; non-empty = recurring (requires a bucket)
}

interface AddBlockFormProps {
  buckets: Bucket[]
  onSubmit: (p: AddSubmit) => Promise<void>
  onCancel: () => void
}

function AddBlockForm({ buckets, onSubmit, onCancel }: AddBlockFormProps) {
  const [title, setTitle]       = useState('')
  const [bucketId, setBucketId] = useState<string>('')
  const [timed, setTimed]       = useState(false)        // default: untimed to-do, never auto-stamped
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime]     = useState('10:00')
  const [isMajor, setIsMajor]     = useState(false)
  const [days, setDays]           = useState<number[]>([])  // repeat
  const [saving, setSaving]       = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  const repeating = days.length > 0
  const needsBucket = repeating && !bucketId
  const toggleDay = (code: number) => setDays(d => d.includes(code) ? d.filter(x => x !== code) : [...d, code])

  async function handleAdd() {
    if (!title.trim()) return
    if (timed && (!startTime || !endTime)) return
    if (needsBucket) return
    setSaving(true)
    try {
      await onSubmit({ title: title.trim(), bucketId: bucketId || null, timed, start: startTime, end: endTime, isMajor, days: [...days].sort() })
    } finally { setSaving(false) }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Eyebrow style={{ marginBottom: 4 }}>Add to today</Eyebrow>

      <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)} placeholder="What is it?" maxLength={80} style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleAdd()} />

      <select value={bucketId} onChange={e => setBucketId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
        <option value="">{repeating ? 'Pick a bucket (required to repeat)' : 'No bucket (external)'}</option>
        {buckets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>

      <ToggleRow value={timed} onChange={setTimed} label="Set a time" sub={timed ? (repeating ? 'time it recurs at' : 'a timed block') : 'untimed to-do'} />
      {timed && <TimeFields start={startTime} end={endTime} setStart={setStartTime} setEnd={setEndTime} />}

      {/* Repeat — turns this into a recurring schedule-it sub-goal */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, color: 'var(--text-faint)' }}>Repeat</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([
            { label: 'None', active: !repeating, on: () => setDays([]) },
            { label: 'Daily', active: sameSet(days, RECUR_DAILY), on: () => setDays([...RECUR_DAILY]) },
            { label: 'Weekdays', active: sameSet(days, RECUR_WEEKDAYS), on: () => setDays([...RECUR_WEEKDAYS]) },
          ]).map(p => (
            <button key={p.label} type="button" onClick={p.on}
              style={{ ...pillBtn, minHeight: 36, ...(p.active ? { borderColor: 'var(--work)', color: 'var(--text)', background: 'color-mix(in srgb, var(--work) 12%, var(--bg))' } : {}) }}>
              {p.label}
            </button>
          ))}
        </div>
        {repeating && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {WEEKDAYS_MON_FIRST.map(d => {
              const on = days.includes(d.code)
              return (
                <button key={d.code} type="button" onClick={() => toggleDay(d.code)}
                  style={{ ...pillBtn, padding: '6px 9px', minHeight: 36, ...(on ? { borderColor: 'var(--work)', color: 'var(--text)', background: 'color-mix(in srgb, var(--work) 14%, var(--bg))' } : {}) }}>
                  {d.short}
                </button>
              )
            })}
          </div>
        )}
        {needsBucket && <p style={{ fontSize: 12, color: 'var(--warm)', margin: 0 }}>Pick a bucket — repeating items live in a bucket.</p>}
      </div>

      {!repeating && <MajorToggleRow value={isMajor} onChange={setIsMajor} />}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Button variant="primary" disabled={!title.trim() || saving || needsBucket} onClick={handleAdd} style={{ flex: 1 }}>
          {saving ? 'Adding…' : repeating ? 'Add repeating' : 'Add'}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

function MajorToggleRow({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <ToggleRow value={value} onChange={onChange} label="Major task" sub="plan at week level" />
}

/* ------------------------------------------------------------------ */
/*  Inline edit form                                                    */
/* ------------------------------------------------------------------ */

interface InlineEditFormProps {
  block: RichBlock
  buckets: Bucket[]
  onSave: (params: EditBlockParams) => Promise<void>
  onCancel: () => void
  style?: CSSProperties
}

function InlineEditForm({ block, buckets, onSave, onCancel, style }: InlineEditFormProps) {
  const [title, setTitle]         = useState(block.title)
  const [bucketId, setBucketId]   = useState<string>(block.bucket_id ?? '')
  const [timed, setTimed]         = useState(!!block.start_time)
  const [startTime, setStartTime] = useState(block.start_time ?? '09:00')
  const [endTime, setEndTime]     = useState(block.end_time ?? '10:00')
  const [isMajor, setIsMajor]     = useState(block.is_major)
  const [saving, setSaving]       = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  async function handleSave() {
    if (!title.trim()) return
    if (timed && (!startTime || !endTime)) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), bucketId: bucketId || null, startTime: timed ? startTime : null, endTime: timed ? endTime : null, isMajor })
    } finally { setSaving(false) }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)', padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      <Eyebrow style={{ marginBottom: 2 }}>Edit</Eyebrow>

      <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" maxLength={80} style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleSave()} />

      <select value={bucketId} onChange={e => setBucketId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
        <option value="">No bucket</option>
        {buckets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>

      <ToggleRow value={timed} onChange={setTimed} label="Set a time" sub={timed ? 'a timed block' : 'untimed to-do'} />
      {timed && <TimeFields start={startTime} end={endTime} setStart={setStartTime} setEnd={setEndTime} />}

      <MajorToggleRow value={isMajor} onChange={setIsMajor} />

      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <Button variant="primary" disabled={!title.trim() || saving} onClick={handleSave} style={{ flex: 1 }}>{saving ? 'Saving…' : 'Save'}</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  DayPage                                                             */
/* ------------------------------------------------------------------ */

export function DayPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const today = useToday()
  const clock = useClock()
  const nowMinutes = timeToMinutes(clock)

  const dateParam = params.get('date') ?? today
  const isToday = dateParam === today

  const { user } = useAuth()
  const blocksHook = useBlocks(dateParam)
  const dayPlan = useDayPlan(dateParam)
  const proposals = useProposals(dateParam)
  const buckets = useBuckets()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [committing, setCommitting]   = useState(false)

  function navigate_date(offset: number) {
    const newDate = isoOffset(dateParam, offset)
    setParams(newDate === today ? {} : { date: newDate })
  }

  // Repeat selected → create a recurring schedule-it sub-goal under the bucket,
  // and drop today's occurrence in immediately if today matches.
  async function createRecurringSubGoal(p: AddSubmit) {
    if (!user || !p.bucketId) return
    const { data: cg } = await supabase
      .from('chief_goals').select('id').eq('bucket_id', p.bucketId).eq('status', 'active').maybeSingle()
    const durationMin = p.timed ? Math.max(15, timeToMinutes(p.end) - timeToMinutes(p.start)) : null
    const { data: sg } = await supabase.from('sub_goals').insert({
      user_id: user.id,
      bucket_id: p.bucketId,
      chief_goal_id: cg?.id ?? null,
      title: p.title,
      type: 'schedule_it',
      cadence_per_week: p.days.length,
      recurrence_days: p.days,
      recurrence_time: p.timed ? p.start : null,
      recurrence_duration_min: durationMin,
      data_source: 'manual',
      status: 'active',
    }).select('id').single()
    if (!sg) return

    // Place the task on EVERY chosen weekday across the horizon, right now —
    // set it once, it's on the calendar for all those days (no per-day commit).
    await materializeRecurrence({
      userId: user.id, subGoalId: sg.id, title: p.title,
      days: p.days, time: p.timed ? p.start : null, durationMin, fromDate: dateParam,
    })
  }

  async function handleAdd(p: AddSubmit) {
    if (p.days.length > 0 && p.bucketId) {
      await createRecurringSubGoal(p)
      blocksHook.refetch()
      proposals.refetch()
    } else {
      await blocksHook.addBlock({
        title: p.title, bucketId: p.bucketId,
        startTime: p.timed ? p.start : null, endTime: p.timed ? p.end : null,
        isMajor: p.isMajor,
      })
    }
    setShowAddForm(false)
  }

  // A single commit brings in any pre-included fixed-day recurrences too (§25.5)
  async function handleCommit() {
    setCommitting(true)
    try {
      await proposals.materializeFixedDay(dateParam)
      blocksHook.refetch()
      await dayPlan.commit()
    } finally { setCommitting(false) }
  }

  const bucketById = Object.fromEntries(buckets.map(b => [b.id, b]))
  const isLoading = blocksHook.loading || dayPlan.loading

  const timedBlocks = blocksHook.blocks.filter(b => b.start_time)
  const untimedBlocks = blocksHook.blocks.filter(b => !b.start_time)
  const fixedDayCount = proposals.fixedDay.length

  /* Renders a block as either the inline editor or a card (timed or untimed). */
  function renderBlock(block: RichBlock, style: CSSProperties) {
    if (editingId === block.id) {
      return (
        <InlineEditForm
          key={block.id}
          block={block}
          buckets={buckets}
          onSave={async (p) => { await blocksHook.editBlock(block, p); setEditingId(null) }}
          onCancel={() => setEditingId(null)}
          style={style}
        />
      )
    }
    const c = block.bucket_color ? accent(block.bucket_color) : 'var(--text-faint)'
    const bucket = block.bucket_id ? bucketById[block.bucket_id] : null
    const isCurrent = isToday && !!block.start_time && !!block.end_time &&
      timeToMinutes(block.start_time) <= nowMinutes && nowMinutes < timeToMinutes(block.end_time)

    // Size the card to its length so longer events read longer on the grid.
    const durMin = block.start_time && block.end_time ? timeToMinutes(block.end_time) - timeToMinutes(block.start_time) : 0
    const durStyle: CSSProperties = durMin > 60 ? { minHeight: Math.round((durMin / 60) * 56) } : {}

    return (
      <div key={block.id} className={`tl-block ${block.status} ${isCurrent ? 'now' : ''}`} style={{ '--c': c, ...style, ...durStyle } as CSSProperties}>
        {bucket && <div className="bk">{bucket.name}</div>}
        <div className="bt">{block.title}</div>
        <div className="bs">{formatTimeRange(block.start_time, block.end_time)}</div>

        {block.status === 'planned' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={e => { e.stopPropagation(); blocksHook.setStatus(block.id, 'done') }} style={blockActionBtn}>Done ✓</button>
            <button onClick={e => { e.stopPropagation(); blocksHook.setStatus(block.id, 'missed') }} style={{ ...blockActionBtn, color: 'var(--text-faint)' }}>Missed</button>
          </div>
        )}
        {block.status === 'done' && (
          <button onClick={e => { e.stopPropagation(); blocksHook.setStatus(block.id, 'planned') }} style={{ ...blockActionBtn, marginTop: 8 }}>Undo</button>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <button onClick={e => { e.stopPropagation(); setEditingId(block.id); setDeletingId(null) }} style={blockActionBtn}>Edit</button>
          {deletingId === block.id ? (
            <>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', alignSelf: 'center' }}>Drop?</span>
              <button onClick={async e => { e.stopPropagation(); setDeletingId(null); await blocksHook.dropBlock(block) }} style={{ ...blockActionBtn, color: 'var(--warm)' }}>Yes</button>
              <button onClick={e => { e.stopPropagation(); setDeletingId(null) }} style={blockActionBtn}>No</button>
            </>
          ) : (
            <button onClick={e => { e.stopPropagation(); setDeletingId(block.id); setEditingId(null) }} style={{ ...blockActionBtn, color: 'var(--text-faint)' }}>Delete</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      {/* Date navigation */}
      <div className="reveal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, '--d': '0s' } as CSSProperties}>
        <button onClick={() => navigate_date(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 22, cursor: 'pointer', padding: '4px 8px' }} aria-label="Previous day">‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-voice)', fontSize: 20, fontWeight: 500 }}>{isToday ? 'Today' : formatDateLabel(dateParam)}</div>
          {isToday && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{formatDateLabel(today)}</div>}
        </div>
        <button onClick={() => navigate_date(1)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 22, cursor: 'pointer', padding: '4px 8px' }} aria-label="Next day">›</button>
      </div>

      {isLoading ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>Loading…</div>
      ) : (
        <>
          {/* Anytime today — untimed to-dos */}
          {untimedBlocks.length > 0 && (
            <div className="reveal" style={{ marginBottom: 18, '--d': '0.04s' } as CSSProperties}>
              <Eyebrow style={{ marginBottom: 10, display: 'block' }}>Anytime today</Eyebrow>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {untimedBlocks.map(b => renderBlock(b, {}))}
              </div>
            </div>
          )}

          {/* Timeline — timed blocks */}
          <div className="day-wrap reveal" style={{ '--d': '0.06s' } as CSSProperties}>
            <div className="tl">
              {HOURS.map(hour => {
                const hourBlocks = timedBlocks.filter(b => Math.floor(timeToMinutes(b.start_time!) / 60) === hour)
                const showNowLine = isToday && Math.floor(nowMinutes / 60) === hour
                return (
                  <div key={hour} className="tl-row" style={{ minHeight: 56 + hourBlocks.length * 68 }}>
                    <div className="tl-hour">{formatHour(hour)}</div>
                    <div className="tl-track">
                      {showNowLine && (
                        <div className="now-line" style={{ top: `${((nowMinutes % 60) / 60) * 56}px`, position: 'absolute', left: 0, right: 0 }}>
                          <div className="now-lbl">NOW</div>
                        </div>
                      )}
                      {hourBlocks.map((block, i) => renderBlock(block, {
                        position: 'relative', left: 0, right: 0, top: 0,
                        margin: `${i === 0 ? 4 : 0}px 8px ${i < hourBlocks.length - 1 ? 6 : 4}px`,
                      }))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Add */}
          {showAddForm ? (
            <div className="reveal" style={{ '--d': '0.1s', marginTop: 24 } as CSSProperties}>
              <AddBlockForm buckets={buckets} onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />
            </div>
          ) : (
            <button onClick={() => setShowAddForm(true)} style={{ width: '100%', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'none', border: '1px dashed var(--line)', borderRadius: 'var(--r-md)', padding: '12px', color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
              Add to today
            </button>
          )}

          {/* Commit strip — also brings in pre-included recurrences */}
          {!dayPlan.isCommitted && (blocksHook.blocks.length > 0 || fixedDayCount > 0) && (
            <div className="reveal" style={{ '--d': '0.15s', marginTop: 28, padding: '18px 22px', background: 'linear-gradient(150deg, color-mix(in srgb, var(--fitness) 10%, var(--surface)), var(--surface))', border: '1px solid color-mix(in srgb, var(--fitness) 22%, transparent)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 } as CSSProperties}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {blocksHook.blocks.length} item{blocksHook.blocks.length === 1 ? '' : 's'} planned
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
                  {fixedDayCount > 0 ? `+${fixedDayCount} recurring will be added on commit.` : 'Commit to make it real.'}
                </div>
              </div>
              <Button variant="primary" onClick={handleCommit} disabled={committing}>
                {committing ? 'Committing…' : 'Commit day ✓'}
              </Button>
            </div>
          )}

          {dayPlan.isCommitted && (
            <div className="reveal" style={{ '--d': '0.15s', marginTop: 28, textAlign: 'center', padding: '12px', fontSize: 13, color: 'var(--text-faint)' } as CSSProperties}>
              ✓ Plan committed · {blocksHook.blocks.length} item{blocksHook.blocks.length === 1 ? '' : 's'}
            </div>
          )}

          {/* Empty state */}
          {!showAddForm && blocksHook.blocks.length === 0 && fixedDayCount === 0 && (
            <div className="reveal" style={{ '--d': '0.1s', textAlign: 'center', marginTop: 60, color: 'var(--text-faint)', fontSize: 14 } as CSSProperties}>
              Nothing planned {isToday ? 'today' : 'for this day'}.
              <br />
              <button onClick={() => setShowAddForm(true)} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                Add your first thing →
              </button>
            </div>
          )}
        </>
      )}

      {!isToday && (
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button onClick={() => navigate('/now')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>← Back to Now</button>
        </div>
      )}
    </AppShell>
  )
}

const blockActionBtn: CSSProperties = {
  background: 'none', border: '1px solid var(--line)', borderRadius: 100,
  padding: '3px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)',
  cursor: 'pointer', fontFamily: 'inherit',
}
