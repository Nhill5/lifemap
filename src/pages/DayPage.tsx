import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { useBuckets } from '@/hooks/useBuckets'
import { useBlocks, type RichBlock, type EditBlockParams } from '@/hooks/useBlocks'
import { useDayPlan } from '@/hooks/useDayPlan'
import { useToday, isoOffset, formatDateLabel } from '@/hooks/useToday'
import { useClock, timeToMinutes, formatTime } from '@/hooks/useClock'
import { accent } from '@/lib/accent'
import type { Bucket } from '@/types'

/* ------------------------------------------------------------------ */
/*  Timeline constants                                                  */
/* ------------------------------------------------------------------ */

const HOUR_START = 6   // 6 AM
const HOUR_END   = 23  // 11 PM
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START)

function formatHour(h: number): string {
  if (h === 12) return '12 PM'
  if (h === 0)  return '12 AM'
  return h > 12 ? `${h - 12} PM` : `${h} AM`
}

/* ------------------------------------------------------------------ */
/*  Shared input style                                                  */
/* ------------------------------------------------------------------ */

const inputStyle: CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--line)',
  borderRadius: 'var(--r-sm)', padding: '9px 12px', color: 'var(--text)',
  fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  colorScheme: 'dark',
}

/* ------------------------------------------------------------------ */
/*  Add-block form                                                      */
/* ------------------------------------------------------------------ */

interface AddBlockFormProps {
  buckets: Bucket[]
  onAdd: (title: string, bucketId: string | null, start: string, end: string) => Promise<void>
  onCancel: () => void
}

function AddBlockForm({ buckets, onAdd, onCancel }: AddBlockFormProps) {
  const [title, setTitle]       = useState('')
  const [bucketId, setBucketId] = useState<string>('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime]     = useState('10:00')
  const [saving, setSaving]       = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  async function handleAdd() {
    if (!title.trim() || !startTime || !endTime) return
    setSaving(true)
    try {
      await onAdd(title.trim(), bucketId || null, startTime, endTime)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--r-md)',
        padding: '18px 18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <Eyebrow style={{ marginBottom: 4 }}>Add block</Eyebrow>

      <input
        ref={titleRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Block title"
        maxLength={80}
        style={inputStyle}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
      />

      <select
        value={bucketId}
        onChange={e => setBucketId(e.target.value)}
        style={{ ...inputStyle, cursor: 'pointer' }}
      >
        <option value="">No bucket (external)</option>
        {buckets.map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Start</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>End</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Button
          variant="primary"
          disabled={!title.trim() || saving}
          onClick={handleAdd}
          style={{ flex: 1 }}
        >
          {saving ? 'Adding…' : 'Add block'}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
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
  const [startTime, setStartTime] = useState(block.start_time)
  const [endTime, setEndTime]     = useState(block.end_time)
  const [saving, setSaving]       = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), bucketId: bucketId || null, startTime, endTime })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--r-md)',
        padding: '14px 14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        ...style,
      }}
    >
      <Eyebrow style={{ marginBottom: 2 }}>Edit block</Eyebrow>

      <input
        ref={titleRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Block title"
        maxLength={80}
        style={inputStyle}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
      />

      <select
        value={bucketId}
        onChange={e => setBucketId(e.target.value)}
        style={{ ...inputStyle, cursor: 'pointer' }}
      >
        <option value="">No bucket</option>
        {buckets.map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Start</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>End</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <Button variant="primary" disabled={!title.trim() || saving} onClick={handleSave} style={{ flex: 1 }}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
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

  // date from URL or today
  const dateParam = params.get('date') ?? today
  const isToday = dateParam === today

  const blocksHook = useBlocks(dateParam)
  const dayPlan = useDayPlan(dateParam)
  const buckets = useBuckets()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  function navigate_date(offset: number) {
    const newDate = isoOffset(dateParam, offset)
    setParams(newDate === today ? {} : { date: newDate })
  }

  async function handleAddBlock(title: string, bucketId: string | null, start: string, end: string) {
    await blocksHook.addBlock({ title, bucketId, startTime: start, endTime: end })
    setShowAddForm(false)
  }

  // Bucket lookup by id
  const bucketById = Object.fromEntries(buckets.map(b => [b.id, b]))

  const isLoading = blocksHook.loading || dayPlan.loading

  return (
    <AppShell>
      {/* Date navigation */}
      <div
        className="reveal"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 28, '--d': '0s',
        } as CSSProperties}
      >
        <button
          onClick={() => navigate_date(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 22, cursor: 'pointer', padding: '4px 8px' }}
          aria-label="Previous day"
        >‹</button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-voice)', fontSize: 20, fontWeight: 500 }}>
            {isToday ? 'Today' : formatDateLabel(dateParam)}
          </div>
          {isToday && (
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
              {formatDateLabel(today)}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate_date(1)}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 22, cursor: 'pointer', padding: '4px 8px' }}
          aria-label="Next day"
        >›</button>
      </div>

      {isLoading ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
          Loading…
        </div>
      ) : (
        <>
          {/* Timeline */}
          <div className="day-wrap reveal" style={{ '--d': '0.06s' } as CSSProperties}>
            <div className="tl">
              {HOURS.map(hour => {
                const hourBlocks = blocksHook.blocks.filter(
                  b => Math.floor(timeToMinutes(b.start_time) / 60) === hour
                )
                // Now-line: render it at the top of the current hour row
                const showNowLine = isToday && Math.floor(nowMinutes / 60) === hour

                return (
                  <div key={hour} className="tl-row" style={{ minHeight: 56 + hourBlocks.length * 68 }}>
                    <div className="tl-hour">{formatHour(hour)}</div>
                    <div className="tl-track">
                      {showNowLine && (
                        <div
                          className="now-line"
                          style={{ top: `${((nowMinutes % 60) / 60) * 56}px`, position: 'absolute', left: 0, right: 0 }}
                        >
                          <div className="now-lbl">NOW</div>
                        </div>
                      )}
                      {hourBlocks.map((block, i) => {
                        const c = block.bucket_color ? accent(block.bucket_color) : 'var(--text-faint)'
                        const bucket = block.bucket_id ? bucketById[block.bucket_id] : null
                        const isCurrentBlock = isToday &&
                          timeToMinutes(block.start_time) <= nowMinutes &&
                          nowMinutes < timeToMinutes(block.end_time)

                        const blockMargin: CSSProperties = {
                          position: 'relative',
                          left: 0,
                          right: 0,
                          top: 0,
                          margin: `${i === 0 ? 4 : 0}px 8px ${i < hourBlocks.length - 1 ? 6 : 4}px`,
                        }

                        if (editingId === block.id) {
                          return (
                            <InlineEditForm
                              key={block.id}
                              block={block}
                              buckets={buckets}
                              onSave={async (p) => {
                                await blocksHook.editBlock(block, p)
                                setEditingId(null)
                              }}
                              onCancel={() => setEditingId(null)}
                              style={blockMargin}
                            />
                          )
                        }

                        return (
                          <div
                            key={block.id}
                            className={`tl-block ${block.status} ${isCurrentBlock ? 'now' : ''}`}
                            style={{ '--c': c, ...blockMargin } as CSSProperties}
                          >
                            {bucket && <div className="bk">{bucket.name}</div>}
                            <div className="bt">{block.title}</div>
                            <div className="bs">
                              {formatTime(block.start_time)} – {formatTime(block.end_time)}
                            </div>

                            {/* Status actions */}
                            {block.status === 'planned' && (
                              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                <button
                                  onClick={e => { e.stopPropagation(); blocksHook.setStatus(block.id, 'done') }}
                                  style={blockActionBtn}
                                >
                                  Done ✓
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); blocksHook.setStatus(block.id, 'missed') }}
                                  style={{ ...blockActionBtn, color: 'var(--text-faint)' }}
                                >
                                  Missed
                                </button>
                              </div>
                            )}
                            {block.status === 'done' && (
                              <button
                                onClick={e => { e.stopPropagation(); blocksHook.setStatus(block.id, 'planned') }}
                                style={{ ...blockActionBtn, marginTop: 8 }}
                              >
                                Undo
                              </button>
                            )}

                            {/* Edit + Delete */}
                            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                              <button
                                onClick={e => { e.stopPropagation(); setEditingId(block.id); setDeletingId(null) }}
                                style={blockActionBtn}
                              >
                                Edit
                              </button>
                              {deletingId === block.id ? (
                                <>
                                  <span style={{ fontSize: 11, color: 'var(--text-faint)', alignSelf: 'center' }}>Drop?</span>
                                  <button
                                    onClick={async e => { e.stopPropagation(); setDeletingId(null); await blocksHook.dropBlock(block) }}
                                    style={{ ...blockActionBtn, color: 'var(--warm)' }}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); setDeletingId(null) }}
                                    style={blockActionBtn}
                                  >
                                    No
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={e => { e.stopPropagation(); setDeletingId(block.id); setEditingId(null) }}
                                  style={{ ...blockActionBtn, color: 'var(--text-faint)' }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Add block */}
          {showAddForm ? (
            <div className="reveal" style={{ '--d': '0.1s', marginTop: 24 } as CSSProperties}>
              <AddBlockForm
                buckets={buckets}
                onAdd={handleAddBlock}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                width: '100%', marginTop: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'none', border: '1px dashed var(--line)',
                borderRadius: 'var(--r-md)', padding: '12px',
                color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
              Add block
            </button>
          )}

          {/* Commit strip */}
          {!dayPlan.isCommitted && blocksHook.blocks.length > 0 && (
            <div
              className="reveal"
              style={{
                '--d': '0.15s',
                marginTop: 28,
                padding: '18px 22px',
                background: 'linear-gradient(150deg, color-mix(in srgb, var(--fitness) 10%, var(--surface)), var(--surface))',
                border: '1px solid color-mix(in srgb, var(--fitness) 22%, transparent)',
                borderRadius: 'var(--r-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              } as CSSProperties}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {blocksHook.blocks.length} block{blocksHook.blocks.length > 1 ? 's' : ''} planned
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
                  Commit to make it real.
                </div>
              </div>
              <Button
                variant="primary"
                onClick={dayPlan.commit}
                disabled={dayPlan.committing}
              >
                {dayPlan.committing ? 'Committing…' : 'Commit day ✓'}
              </Button>
            </div>
          )}

          {dayPlan.isCommitted && (
            <div
              className="reveal"
              style={{
                '--d': '0.15s',
                marginTop: 28,
                textAlign: 'center',
                padding: '12px',
                fontSize: 13,
                color: 'var(--text-faint)',
              } as CSSProperties}
            >
              ✓ Plan committed · {blocksHook.blocks.length} block{blocksHook.blocks.length > 1 ? 's' : ''}
            </div>
          )}

          {/* Empty state */}
          {!showAddForm && blocksHook.blocks.length === 0 && (
            <div
              className="reveal"
              style={{
                '--d': '0.1s',
                textAlign: 'center',
                marginTop: 60,
                color: 'var(--text-faint)',
                fontSize: 14,
              } as CSSProperties}
            >
              Nothing planned {isToday ? 'today' : 'for this day'}.
              <br />
              <button
                onClick={() => setShowAddForm(true)}
                style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
              >
                Add your first block →
              </button>
            </div>
          )}
        </>
      )}

      {/* Quick nav to Now */}
      {!isToday && (
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button
            onClick={() => navigate('/now')}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Back to Now
          </button>
        </div>
      )}
    </AppShell>
  )
}

const blockActionBtn: CSSProperties = {
  background: 'none',
  border: '1px solid var(--line)',
  borderRadius: 100,
  padding: '3px 10px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-dim)',
  cursor: 'pointer',
  fontFamily: 'inherit',
}
