import { useState, useEffect, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { useBuckets } from '@/hooks/useBuckets'
import { useToday, isoOffset } from '@/hooks/useToday'
import { formatTime } from '@/hooks/useClock'
import { accent } from '@/lib/accent'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Block, DayPlan, Bucket } from '@/types'
import type { RichBlock } from '@/hooks/useBlocks'
import type { AccentSlot } from '@/types'

/* ------------------------------------------------------------------ */
/*  Week helpers                                                        */
/* ------------------------------------------------------------------ */

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMondayOfWeek(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => isoOffset(monday, i))
}

/* ------------------------------------------------------------------ */
/*  Consistency computation                                             */
/* ------------------------------------------------------------------ */

interface BucketScore {
  done: number
  countable: number  // done + missed (on committed days only)
  pct: number | null // null = no data
}

function computeScores(
  blocks: RichBlock[],
  plans: DayPlan[],
  buckets: Bucket[],
): { byBucket: Record<string, BucketScore>; overall: BucketScore } {
  const committedDates = new Set(plans.filter(p => p.committed_at).map(p => p.date))

  // Only blocks on committed days with terminal status
  const countable = blocks.filter(
    b => committedDates.has(b.date) && (b.status === 'done' || b.status === 'missed')
  )

  const overall: BucketScore = {
    done: countable.filter(b => b.status === 'done').length,
    countable: countable.length,
    pct: countable.length === 0 ? null : countable.filter(b => b.status === 'done').length / countable.length,
  }

  const byBucket: Record<string, BucketScore> = {}
  for (const bucket of buckets) {
    const bs = countable.filter(b => b.bucket_id === bucket.id)
    const done = bs.filter(b => b.status === 'done').length
    byBucket[bucket.id] = {
      done,
      countable: bs.length,
      pct: bs.length === 0 ? null : done / bs.length,
    }
  }

  return { byBucket, overall }
}

/* ------------------------------------------------------------------ */
/*  Consistency ring                                                    */
/* ------------------------------------------------------------------ */

function ConsistencyRing({ score, color, label }: { score: BucketScore; color: string; label: string }) {
  const pct = score.pct === null ? 0 : Math.round(score.pct * 100)
  return (
    <div className="meter">
      <div
        className="ring"
        style={{ '--p': pct, '--c': color } as CSSProperties}
      >
        <div style={{ position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {score.pct === null ? '—' : `${pct}%`}
        </div>
      </div>
      <div className="info">
        <div className="v">
          {score.pct === null ? 'No data' : `${score.done} / ${score.countable}`}
        </div>
        <div className="k">{label}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  WeekPage                                                            */
/* ------------------------------------------------------------------ */

type TaskRow = { id: string; bucket_id: string | null; rollover_count: number; is_major: boolean; buckets: { id: string; name: string; color: string } | null }

export function WeekPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const today = useToday()
  const buckets = useBuckets()

  const [weekOffset, setWeekOffset] = useState(0)  // 0 = current week, -1 = last, etc.

  const weekMonday = getMondayOfWeek(isoOffset(today, weekOffset * 7))
  const days = weekDates(weekMonday)
  const weekEnd = days[6]

  const [blocks, setBlocks] = useState<RichBlock[]>([])
  const [plans, setPlans] = useState<DayPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    setLoading(true)

    Promise.all([
      supabase
        .from('blocks')
        .select('*, tasks(id, bucket_id, rollover_count, is_major, buckets(id, name, color))')
        .eq('user_id', user.id)
        .gte('date', weekMonday)
        .lte('date', weekEnd)
        .in('status', ['planned', 'done', 'missed', 'moved'])
        .order('start_time'),
      supabase
        .from('day_plans')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekMonday)
        .lte('date', weekEnd),
    ]).then(([blocksRes, plansRes]) => {
      const raw = (blocksRes.data ?? []) as (Block & { tasks: TaskRow | null })[]
      const richBlocks: RichBlock[] = raw.map(b => {
        const { tasks, ...blockFields } = b
        const bucket = tasks?.buckets ?? null
        return {
          ...blockFields,
          bucket_id: tasks?.bucket_id ?? null,
          bucket_color: (bucket?.color ?? null) as AccentSlot | null,
          bucket_name: bucket?.name ?? null,
          rollover_count: tasks?.rollover_count ?? 0,
          is_major: tasks?.is_major ?? false,
        }
      })
      setBlocks(richBlocks)
      setPlans((plansRes.data ?? []) as DayPlan[])
      setLoading(false)
    })
  }, [user, weekMonday, weekEnd])

  // Week shows MAJOR tasks only — high-altitude intent, not minute detail (§25).
  // Day view keeps the full timeline; rings below still score every block.
  const majorBlocks = blocks.filter(b => b.is_major)

  // Group major blocks by date for the grid
  const blocksByDate: Record<string, RichBlock[]> = {}
  for (const d of days) blocksByDate[d] = []
  for (const b of majorBlocks) {
    if (blocksByDate[b.date]) blocksByDate[b.date].push(b)
  }

  const { byBucket, overall } = computeScores(blocks, plans, buckets)

  // Week label
  const weekStart = new Date(weekMonday + 'T12:00:00')
  const weekEndDate = new Date(weekEnd + 'T12:00:00')
  const weekLabel = weekOffset === 0
    ? 'This week'
    : weekOffset === -1
    ? 'Last week'
    : `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <AppShell>
      {/* Week navigation */}
      <div
        className="reveal"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, '--d': '0s',
        } as CSSProperties}
      >
        <button
          onClick={() => setWeekOffset(o => o - 1)}
          style={navBtnStyle}
          aria-label="Previous week"
        >‹</button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-voice)', fontSize: 18, fontWeight: 500 }}>
            {weekLabel}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
            {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' – '}
            {weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>

        <button
          onClick={() => setWeekOffset(o => Math.min(0, o + 1))}
          style={{ ...navBtnStyle, opacity: weekOffset === 0 ? 0.3 : 1 }}
          disabled={weekOffset === 0}
          aria-label="Next week"
        >›</button>
      </div>

      {/* Consistency rings */}
      {!loading && (
        <div className="reveal" style={{ '--d': '0.06s' } as CSSProperties}>
          <Eyebrow style={{ marginBottom: 12, display: 'block' }}>
            Consistency · {weekLabel.toLowerCase()}
            {overall.pct === null && ' · no committed days yet'}
          </Eyebrow>

          <div className="rail" style={{ marginBottom: 32 }}>
            {/* Overall ring */}
            <ConsistencyRing
              score={overall}
              color="var(--text)"
              label="Overall"
            />
            {/* Per-bucket rings */}
            {buckets.map(bucket => (
              <ConsistencyRing
                key={bucket.id}
                score={byBucket[bucket.id] ?? { done: 0, countable: 0, pct: null }}
                color={accent(bucket.color)}
                label={bucket.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Week grid — major tasks only */}
      {!loading && (
        <Eyebrow style={{ marginBottom: 10, display: 'block' }}>
          Major tasks · week intent
        </Eyebrow>
      )}
      <div className="week-grid-wrap reveal" style={{ '--d': '0.1s' } as CSSProperties}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(7, minmax(${Math.max(90, Math.floor(100 / 7))}px, 1fr))`,
            minWidth: 560,
            gap: 1,
            borderRadius: 'var(--r-md)',
            overflow: 'hidden',
            border: '1px solid var(--line)',
          }}
        >
          {/* Day headers */}
          {days.map((date, i) => {
            const d = new Date(date + 'T12:00:00')
            const isToday_day = date === today
            const planForDay = plans.find(p => p.date === date)
            return (
              <div
                key={date}
                className={`wg-dayhead ${isToday_day ? 'today' : ''}`}
                style={{
                  padding: '10px 8px 8px',
                  background: isToday_day ? 'rgba(230, 168, 120, 0.04)' : 'var(--surface)',
                  cursor: 'pointer',
                  borderRight: i < 6 ? '1px solid var(--line)' : 'none',
                }}
                onClick={() => navigate(`/day?date=${date}`)}
              >
                <div className="dn">{DAY_ABBR[i]}</div>
                <div className="dd">{d.getDate()}</div>
                {planForDay?.committed_at && (
                  <div style={{ fontSize: 10, color: 'var(--fitness)', marginTop: 2, fontWeight: 600 }}>✓</div>
                )}
              </div>
            )
          })}

          {/* Block chips per day */}
          {days.map((date, i) => {
            const dayBlocks = blocksByDate[date] ?? []
            const isToday_day = date === today

            return (
              <div
                key={date}
                style={{
                  background: isToday_day ? 'rgba(230, 168, 120, 0.025)' : 'var(--bg)',
                  borderTop: '1px solid var(--line)',
                  borderRight: i < 6 ? '1px solid var(--line)' : 'none',
                  padding: '6px 4px',
                  minHeight: 80,
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/day?date=${date}`)}
              >
                {loading ? (
                  <div style={{ height: 40 }} />
                ) : dayBlocks.length === 0 ? (
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-faint)', paddingTop: 12 }}>—</div>
                ) : (
                  dayBlocks.map(block => {
                    const c = block.bucket_color ? accent(block.bucket_color) : 'var(--text-faint)'
                    return (
                      <div
                        key={block.id}
                        style={{
                          '--c': c,
                          position: 'relative',
                          marginBottom: 3,
                          padding: '4px 6px',
                          borderRadius: 7,
                          background: `color-mix(in srgb, ${c} 15%, var(--surface))`,
                          borderLeft: `3px solid ${c}`,
                          opacity: block.status === 'done' ? 0.5 : block.status === 'missed' ? 0.4 : 1,
                        } as CSSProperties}
                      >
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {block.title}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatTime(block.start_time)}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Empty state for whole week */}
      {!loading && majorBlocks.length === 0 && (
        <div
          className="reveal"
          style={{
            '--d': '0.15s',
            textAlign: 'center',
            marginTop: 32,
            fontSize: 14,
            color: 'var(--text-faint)',
          } as CSSProperties}
        >
          {blocks.length === 0
            ? 'No blocks this week.'
            : 'No major tasks this week.'}
          <br />
          <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>
            {blocks.length === 0
              ? ''
              : 'Mark a task “Major” on the Day view to plan it here.'}
          </span>
          <br />
          <button
            onClick={() => navigate('/day')}
            style={{
              marginTop: 12, background: 'none', border: 'none',
              color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer',
              textDecoration: 'underline', fontFamily: 'inherit',
            }}
          >
            {blocks.length === 0 ? 'Plan today →' : 'Go to Day →'}
          </button>
        </div>
      )}
    </AppShell>
  )
}

const navBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-dim)',
  fontSize: 22,
  cursor: 'pointer',
  padding: '4px 8px',
}
