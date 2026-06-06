import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { useToday, isoOffset, formatDateLabel } from '@/hooks/useToday'
import { useClock, timeToMinutes, formatTime } from '@/hooks/useClock'
import { useBlocks, type RichBlock } from '@/hooks/useBlocks'
import { useDayPlan } from '@/hooks/useDayPlan'
import { useProposals, type Proposal } from '@/hooks/useProposals'
import { accent } from '@/lib/accent'

const ZOMBIE_THRESHOLD = 3

/* ------------------------------------------------------------------ */
/*  TriageCard — owns its own reschedule state                          */
/* ------------------------------------------------------------------ */

interface TriageCardProps {
  block: RichBlock
  today: string
  onCarry: (toDate: string) => Promise<void>
  onDrop: () => Promise<void>
}

function TriageCard({ block, today, onCarry, onDrop }: TriageCardProps) {
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [working, setWorking] = useState(false)

  const c = block.bucket_color ? accent(block.bucket_color) : 'var(--text-faint)'
  const isZombie = block.rollover_count >= ZOMBIE_THRESHOLD

  async function doCarry(date: string) {
    setWorking(true)
    try { await onCarry(date) } finally { setWorking(false) }
  }
  async function doDrop() {
    setWorking(true)
    try { await onDrop() } finally { setWorking(false) }
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: `1px solid ${isZombie ? 'color-mix(in srgb, var(--warm) 40%, transparent)' : 'var(--line)'}`,
        borderLeft: `3px solid ${c}`,
        borderRadius: 'var(--r-md)',
        padding: '14px 16px',
        opacity: working ? 0.45 : 1,
        transition: 'opacity 0.2s',
        pointerEvents: working ? 'none' : undefined,
      }}
    >
      {isZombie && (
        <div style={{ fontSize: 12, color: 'var(--warm)', fontWeight: 600, marginBottom: 8 }}>
          Moved {block.rollover_count} times — drop it?
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {block.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(block.start_time)} – {formatTime(block.end_time)}
            {block.bucket_name && (
              <span style={{ marginLeft: 7, color: c, fontWeight: 600 }}>· {block.bucket_name}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'nowrap' }}>
          <button
            onClick={() => doCarry(today)}
            style={triageBtnStyle}
          >
            Today
          </button>
          <button
            onClick={() => setRescheduling(r => !r)}
            style={triageBtnStyle}
          >
            Later
          </button>
          <button
            onClick={doDrop}
            style={{ ...triageBtnStyle, color: isZombie ? 'var(--warm)' : 'var(--text-faint)' }}
          >
            Drop
          </button>
        </div>
      </div>

      {rescheduling && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="date"
            value={rescheduleDate}
            min={today}
            onChange={e => setRescheduleDate(e.target.value)}
            style={{
              flex: 1, background: 'var(--bg)', border: '1px solid var(--line)',
              borderRadius: 'var(--r-sm)', padding: '6px 10px', color: 'var(--text)',
              fontSize: 13, fontFamily: 'inherit', outline: 'none', colorScheme: 'dark',
            }}
          />
          <Button
            size="sm"
            variant="primary"
            disabled={!rescheduleDate}
            onClick={() => { if (rescheduleDate) doCarry(rescheduleDate) }}
          >
            Move
          </Button>
        </div>
      )}
    </div>
  )
}

const triageBtnStyle: CSSProperties = {
  background: 'none',
  border: '1px solid var(--line)',
  borderRadius: 100,
  padding: '5px 11px',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-dim)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontFamily: 'inherit',
}

/* ------------------------------------------------------------------ */
/*  NextCard                                                            */
/* ------------------------------------------------------------------ */

function NextCard({ block, onClick }: { block: RichBlock; onClick: () => void }) {
  const c = block.bucket_color ? accent(block.bucket_color) : 'var(--text-faint)'
  return (
    <div
      className="next reveal"
      style={{ '--c2': c } as CSSProperties}
      onClick={onClick}
    >
      <div>
        <div className="lead">Next</div>
      </div>
      <div className="nb" />
      <div className="body">
        <div className="t">{block.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(block.start_time)} – {formatTime(block.end_time)}
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>›</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ProposalCard — a proposed block from a sub-goal cadence             */
/* ------------------------------------------------------------------ */

function ProposalCard({ proposal, onAccept }: { proposal: Proposal; onAccept: () => Promise<void> }) {
  const [working, setWorking] = useState(false)
  const c = proposal.bucketColor ? accent(proposal.bucketColor) : 'var(--text-faint)'

  async function accept() {
    setWorking(true)
    try { await onAccept() } finally { setWorking(false) }
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderLeft: `3px solid ${c}`,
        borderRadius: 'var(--r-md)',
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        opacity: working ? 0.45 : 1,
        transition: 'opacity 0.2s',
        pointerEvents: working ? 'none' : undefined,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {proposal.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(proposal.startTime)} – {formatTime(proposal.endTime)}
          {proposal.bucketName && <span style={{ marginLeft: 7, color: c, fontWeight: 600 }}>· {proposal.bucketName}</span>}
          <span style={{ marginLeft: 7, color: 'var(--text-faint)' }}>
            {proposal.scheduledThisWeek}/{proposal.cadence} this week
          </span>
        </div>
      </div>
      <Button size="sm" variant="primary" onClick={accept}>Add</Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  NowPage                                                             */
/* ------------------------------------------------------------------ */

export function NowPage() {
  const navigate = useNavigate()
  const today = useToday()
  const yesterday = isoOffset(today, -1)
  const clock = useClock()
  const [heroDeleteConfirm, setHeroDeleteConfirm] = useState(false)

  const todayHook = useBlocks(today)
  const yesterdayHook = useBlocks(yesterday)
  const dayPlan = useDayPlan(today)
  const proposals = useProposals(today)

  const nowMinutes = timeToMinutes(clock)

  // Current block: overlaps with now, still actionable
  const currentBlock = todayHook.blocks.find(b => {
    if (b.status === 'missed' || b.status === 'moved') return false
    return timeToMinutes(b.start_time) <= nowMinutes && nowMinutes < timeToMinutes(b.end_time)
  }) ?? null

  // Future blocks: start after now, not missed/moved
  const futureBlocks = todayHook.blocks.filter(b => {
    if (b.status === 'missed' || b.status === 'moved') return false
    return timeToMinutes(b.start_time) > nowMinutes
  })

  // Triage: yesterday planned = never marked done or missed
  const triageBlocks = yesterdayHook.blocks.filter(b => b.status === 'planned')

  // Missed: planned but ended in the past
  const missedBlocks = todayHook.blocks.filter(
    b => b.status === 'planned' && timeToMinutes(b.end_time) < nowMinutes
  )

  const heroBlock = currentBlock ?? futureBlocks[0] ?? null
  const heroColor = heroBlock?.bucket_color ? accent(heroBlock.bucket_color) : 'var(--school)'

  let progressPct = 0
  if (currentBlock) {
    const start = timeToMinutes(currentBlock.start_time)
    const end = timeToMinutes(currentBlock.end_time)
    progressPct = Math.min(100, Math.max(0, ((nowMinutes - start) / (end - start)) * 100))
  }

  const isLoading = todayHook.loading || yesterdayHook.loading || dayPlan.loading

  if (isLoading) return (
    <AppShell>
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
        Loading…
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      {/* Header */}
      <div className="now-head reveal" style={{ '--d': '0s' } as CSSProperties}>
        <div className="date">
          {formatDateLabel(today)}
        </div>
        <div className="clock">{formatTime(clock)}</div>
      </div>

      {/* Triage */}
      {triageBlocks.length > 0 && (
        <div className="reveal" style={{ '--d': '0.05s', marginBottom: 28 } as CSSProperties}>
          <Eyebrow style={{ marginBottom: 12, display: 'block' }}>
            From yesterday · triage {triageBlocks.length} block{triageBlocks.length > 1 ? 's' : ''}
          </Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {triageBlocks.map(block => (
              <TriageCard
                key={block.id}
                block={block}
                today={today}
                onCarry={async (toDate) => {
                  await yesterdayHook.carryBlock(block, toDate)
                  todayHook.refetch()
                }}
                onDrop={async () => yesterdayHook.dropBlock(block)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Proposed from your goals — the proposal engine (spec §9) */}
      {!dayPlan.isCommitted && proposals.proposals.length > 0 && (
        <div className="reveal" style={{ '--d': '0.08s', marginBottom: 28 } as CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
            <Eyebrow style={{ display: 'block' }}>
              Proposed from your goals · {proposals.proposals.length}
            </Eyebrow>
            <button
              onClick={async () => { await proposals.acceptAll(today); todayHook.refetch() }}
              style={{
                background: 'none', border: 'none', color: 'var(--work)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}
            >
              Add all
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {proposals.proposals.map(p => (
              <ProposalCard
                key={p.subGoalId}
                proposal={p}
                onAccept={async () => { await proposals.accept(p, today); todayHook.refetch() }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Morning planning prompt */}
      {!dayPlan.isCommitted && !heroBlock && triageBlocks.length === 0 && proposals.proposals.length === 0 && (
        <div className="reveal propose" style={{ '--d': '0.1s' } as CSSProperties}>
          <p className="pp">
            Nothing on the schedule yet.<br />
            <b>Plan today and commit.</b>
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="primary" onClick={() => navigate('/day')}>
              Plan today →
            </Button>
          </div>
        </div>
      )}

      {/* Commit nudge (blocks exist but not committed) */}
      {!dayPlan.isCommitted && heroBlock && (
        <div
          className="reveal"
          style={{
            '--d': '0.05s',
            marginBottom: 20,
            padding: '12px 18px',
            background: 'var(--surface)',
            border: '1px dashed var(--line-strong)',
            borderRadius: 'var(--r-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          } as CSSProperties}
        >
          <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>
            Commit today's plan to lock it in
          </span>
          <Button size="sm" variant="primary" onClick={dayPlan.commit} disabled={dayPlan.committing}>
            {dayPlan.committing ? 'Committing…' : 'Commit'}
          </Button>
        </div>
      )}

      {/* Hero block */}
      {heroBlock && (
        <div
          className="hero-block reveal"
          style={{ '--c': heroColor, '--d': '0.12s' } as CSSProperties}
        >
          <div className="tag">
            <div className="dot" />
            {currentBlock ? 'Now' : 'Up next'}
            {heroBlock.bucket_name && ` · ${heroBlock.bucket_name}`}
          </div>

          <h1>{heroBlock.title}</h1>

          <div className="time">
            <b>{formatTime(heroBlock.start_time)}</b>
            {' – '}
            {formatTime(heroBlock.end_time)}
          </div>

          {currentBlock && (
            <>
              <div className="progress">
                <i style={{ width: `${progressPct}%` }} />
              </div>
              <div className="progress-meta">
                <span>{Math.round(progressPct)}% through</span>
                <span>
                  {Math.round(timeToMinutes(heroBlock.end_time) - nowMinutes)} min left
                </span>
              </div>
            </>
          )}

          <div className="hero-actions" style={{ marginTop: 20, flexWrap: 'wrap', gap: 10 }}>
            {heroBlock.status === 'planned' && (
              <Button
                variant="primary"
                onClick={() => todayHook.setStatus(heroBlock.id, 'done')}
              >
                Mark done ✓
              </Button>
            )}
            {heroBlock.status === 'done' && (
              <span style={{ fontSize: 14, color: heroColor, fontWeight: 600 }}>
                ✓ Done
              </span>
            )}
            <Button size="sm" onClick={() => navigate('/day')}>
              Edit →
            </Button>
            {heroDeleteConfirm ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>Drop this block?</span>
                <Button
                  size="sm"
                  onClick={async () => {
                    setHeroDeleteConfirm(false)
                    await todayHook.dropBlock(heroBlock)
                  }}
                >
                  Drop
                </Button>
                <Button size="sm" onClick={() => setHeroDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setHeroDeleteConfirm(true)}>
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Next cards — up to 2 upcoming after the hero */}
      {futureBlocks
        .slice(heroBlock && !currentBlock ? 1 : 0, heroBlock && !currentBlock ? 3 : 2)
        .map(block => (
          <NextCard key={block.id} block={block} onClick={() => navigate('/day')} />
        ))
      }

      {/* All clear */}
      {dayPlan.isCommitted && !heroBlock && triageBlocks.length === 0 && (
        <div
          className="reveal"
          style={{ textAlign: 'center', marginTop: 60, '--d': '0.1s' } as CSSProperties}
        >
          <div style={{ fontSize: 38, marginBottom: 16, opacity: 0.6 }}>✦</div>
          <p style={{ fontFamily: 'var(--font-voice)', fontSize: 22, color: 'var(--text-dim)' }}>
            All clear.
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-faint)', marginTop: 6 }}>
            Nothing else scheduled today.
          </p>
          <button
            onClick={() => navigate('/day')}
            style={{
              marginTop: 18, background: 'none', border: 'none',
              color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer',
              textDecoration: 'underline', fontFamily: 'inherit',
            }}
          >
            View the day →
          </button>
        </div>
      )}

      {/* Missed blocks nudge */}
      {dayPlan.isCommitted && missedBlocks.length > 0 && (
        <div
          className="reveal"
          style={{
            '--d': '0.2s',
            marginTop: 24,
            padding: '12px 18px',
            borderRadius: 'var(--r-md)',
            background: 'color-mix(in srgb, var(--warm) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--warm) 20%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          } as CSSProperties}
        >
          <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>
            {missedBlocks.length} block{missedBlocks.length > 1 ? 's' : ''} passed — mark done or missed
          </span>
          <button
            onClick={() => navigate('/day')}
            style={{
              background: 'none', border: 'none', color: 'var(--warm)',
              fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            Review →
          </button>
        </div>
      )}
    </AppShell>
  )
}
