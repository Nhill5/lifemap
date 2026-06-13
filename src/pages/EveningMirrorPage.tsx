import { useState, useEffect, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { VoiceLine } from '@/components/ui/VoiceLine'
import { useToday, isoOffset, formatDateLabel } from '@/hooks/useToday'
import { formatTimeRange } from '@/hooks/useClock'
import { useBlocks, type RichBlock } from '@/hooks/useBlocks'
import { useTrackIt, type TrackItem } from '@/hooks/useTrackIt'
import { useJournal } from '@/hooks/useJournal'
import { useProposals } from '@/hooks/useProposals'
import { eveningLine } from '@/lib/honestLine'
import { accent } from '@/lib/accent'
import type { TrackRating } from '@/types'

const JOURNAL_PROMPT = 'One honest line about today.'

/* ------------------------------------------------------------------ */
/*  Block confirm row — assume-adherence; missed is dimmed, never red   */
/* ------------------------------------------------------------------ */

function BlockRow({ block, onToggle }: { block: RichBlock; onToggle: (missed: boolean) => void }) {
  const c = block.bucket_color ? accent(block.bucket_color) : 'var(--text-faint)'
  const missed = block.status === 'missed'
  const done = !missed // planned counts as done-intent

  return (
    <button
      onClick={() => onToggle(!missed ? true : false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderLeft: `3px solid ${missed ? 'var(--line-strong)' : c}`,
        borderRadius: 'var(--r-md)', padding: '11px 14px', cursor: 'pointer',
        opacity: missed ? 0.5 : 1, transition: 'opacity 0.18s', fontFamily: 'inherit',
      }}
    >
      <span
        style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700,
          background: done ? c : 'transparent',
          border: done ? 'none' : '1.5px solid var(--line-strong)',
          color: done ? 'var(--bg)' : 'transparent',
        }}
      >
        ✓
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 14, textDecoration: missed ? 'line-through' : 'none' }}>
          {block.title}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
          {formatTimeRange(block.start_time, block.end_time)}
          {block.bucket_name && <span style={{ marginLeft: 6, color: missed ? 'var(--text-faint)' : c, fontWeight: 600 }}>· {block.bucket_name}</span>}
        </span>
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{missed ? 'Missed' : 'Done'}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Track-it rating — hit / close / missed (missed = neutral, not red)  */
/* ------------------------------------------------------------------ */

const RATINGS: { key: TrackRating; label: string }[] = [
  { key: 'hit', label: 'Hit' },
  { key: 'close', label: 'Close' },
  { key: 'missed', label: 'Missed' },
]

function TrackRow({ item, onRate }: { item: TrackItem; onRate: (r: TrackRating) => void }) {
  const c = item.bucketColor ? accent(item.bucketColor) : 'var(--fitness)'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-md)', padding: '11px 14px', flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          {item.dailyTarget != null ? `${item.dailyTarget}${item.unit ? ` ${item.unit}` : ''} / day` : 'daily'}
          {item.bucketName && <span style={{ marginLeft: 6, color: c, fontWeight: 600 }}>· {item.bucketName}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {RATINGS.map(r => {
          const on = item.rating === r.key
          const onColor = r.key === 'hit' ? c : r.key === 'close' ? 'var(--text-dim)' : 'var(--text-faint)'
          return (
            <button
              key={r.key}
              onClick={() => onRate(r.key)}
              style={{
                background: on ? `color-mix(in srgb, ${onColor} 18%, var(--bg))` : 'none',
                border: `1px solid ${on ? onColor : 'var(--line)'}`,
                color: on ? 'var(--text)' : 'var(--text-dim)',
                borderRadius: 100, padding: '6px 13px', minHeight: 38, fontSize: 12.5,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {r.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export function EveningMirrorPage() {
  const navigate = useNavigate()
  const today = useToday()
  const tomorrow = isoOffset(today, 1)

  const blocksHook = useBlocks(today)
  const track = useTrackIt(today)
  const journal = useJournal(today, 'day')
  const tomorrowProposals = useProposals(tomorrow)

  const [body, setBody] = useState('')
  useEffect(() => { if (journal.entry) setBody(journal.entry.body) }, [journal.entry])

  const [finishing, setFinishing] = useState(false)

  // Consider committed-ish blocks only (exclude moved/dropped)
  const dayBlocks = blocksHook.blocks.filter(b => b.status !== 'moved')
  const missedBlocks = dayBlocks.filter(b => b.status === 'missed').length
  const doneBlocks = dayBlocks.length - missedBlocks
  const trackHit = track.items.filter(i => i.rating === 'hit').length

  const line = eveningLine({
    totalBlocks: dayBlocks.length,
    doneBlocks,
    missedBlocks,
    trackTotal: track.items.length,
    trackHit,
  })

  async function finish() {
    setFinishing(true)
    try {
      await blocksHook.confirmPlannedAsDone()
      if (body.trim()) await journal.save(JOURNAL_PROMPT, body.trim())
      navigate('/now')
    } finally { setFinishing(false) }
  }

  const isLoading = blocksHook.loading || track.loading

  return (
    <AppShell>
      {/* Header */}
      <div className="reveal" style={{ marginBottom: 24, '--d': '0s' } as CSSProperties}>
        <Eyebrow style={{ marginBottom: 6, display: 'block' }}>Evening mirror</Eyebrow>
        <h2 style={{ fontFamily: 'var(--font-voice)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>
          {formatDateLabel(today)}
        </h2>
      </div>

      {isLoading ? (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
          Loading…
        </div>
      ) : (
        <>
          {/* The one honest line — the payoff, computed live */}
          <div className="reveal" style={{ marginBottom: 28, '--d': '0.05s' } as CSSProperties}>
            <VoiceLine style={{ fontSize: 21 }}>{line}</VoiceLine>
            <p style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 6 }}>
              {doneBlocks} of {dayBlocks.length} block{dayBlocks.length === 1 ? '' : 's'}
              {track.items.length > 0 && ` · ${trackHit} of ${track.items.length} target${track.items.length === 1 ? '' : 's'} hit`}
            </p>
          </div>

          {/* Confirm the day */}
          {dayBlocks.length > 0 && (
            <div className="reveal" style={{ marginBottom: 24, '--d': '0.08s' } as CSSProperties}>
              <Eyebrow style={{ marginBottom: 10, display: 'block' }}>
                Confirm the day · tap to flag a miss
              </Eyebrow>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dayBlocks.map(b => (
                  <BlockRow
                    key={b.id}
                    block={b}
                    onToggle={(missed) => blocksHook.setStatus(b.id, missed ? 'missed' : 'done')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Track-it ratings */}
          {track.items.length > 0 && (
            <div className="reveal" style={{ marginBottom: 24, '--d': '0.1s' } as CSSProperties}>
              <Eyebrow style={{ marginBottom: 10, display: 'block' }}>How'd the targets go?</Eyebrow>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {track.items.map(i => (
                  <TrackRow key={i.id} item={i} onRate={(r) => track.setRating(i, r)} />
                ))}
              </div>
            </div>
          )}

          {/* Light journal */}
          <div className="reveal" style={{ marginBottom: 24, '--d': '0.12s' } as CSSProperties}>
            <div className="journal-prompt">{JOURNAL_PROMPT}</div>
            <textarea
              className="journal-field"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Optional — a sentence is plenty."
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Glance at tomorrow */}
          <div
            className="reveal"
            style={{
              marginBottom: 28, '--d': '0.14s', padding: '14px 18px',
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 12,
            } as CSSProperties}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Tomorrow's already forming</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
                {tomorrowProposals.proposals.length > 0
                  ? `${tomorrowProposals.proposals.length} proposed from your goals`
                  : 'A fresh page'}
              </div>
            </div>
            <button
              onClick={() => navigate(`/day?date=${tomorrow}`)}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
            >
              Glance →
            </button>
          </div>

          {/* Finish */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button variant="primary" onClick={finish} disabled={finishing} style={{ flex: 1 }}>
              {finishing ? 'Saving…' : 'Confirm the day ✓'}
            </Button>
            <button
              onClick={() => navigate('/now')}
              style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Skip
            </button>
          </div>
        </>
      )}
    </AppShell>
  )
}
