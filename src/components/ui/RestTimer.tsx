import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useCountdown, fmtClock } from '@/hooks/useCountdown'
import { warmAudio } from '@/lib/chime'

const PRESETS = [60, 90, 120, 180]
const STORE_KEY = 'lm-rest-default'

function loadDefault(): number {
  try {
    const v = Number(localStorage.getItem(STORE_KEY))
    return PRESETS.includes(v) ? v : 90
  } catch { return 90 }
}

/**
 * Rest-between-sets timer for the workout page. `nonce` bumps each time a set is
 * logged → the timer (re)starts from the chosen preset. Sits as a slim bar at
 * the bottom; skip or +30s as needed.
 */
export function RestTimer({ nonce }: { nonce: number }) {
  const cd = useCountdown()
  const [dur, setDur] = useState(loadDefault)
  const lastNonce = useRef(nonce)

  // A logged set → start resting.
  useEffect(() => {
    if (nonce !== lastNonce.current) {
      lastNonce.current = nonce
      if (nonce > 0) { warmAudio(); cd.start(dur) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce])

  function pick(seconds: number) {
    setDur(seconds)
    try { localStorage.setItem(STORE_KEY, String(seconds)) } catch { /* ignore */ }
    warmAudio()
    cd.start(seconds)
  }

  const active = cd.running || cd.remaining > 0
  const pct = cd.total > 0 ? Math.round((cd.remaining / cd.total) * 100) : 0

  return (
    <div
      style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 16,
        width: 'min(560px, calc(100vw - 24px))', zIndex: 60,
        background: 'var(--surface)', border: '1px solid var(--line-strong)',
        borderRadius: 'var(--r-md)', padding: '10px 14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', fontWeight: 600 }}>
        Rest
      </span>

      {active ? (
        <>
          {/* progress + remaining */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 18, color: 'var(--fitness)', minWidth: 52 }}>
              {fmtClock(cd.remaining)}
            </span>
            <div style={{ flex: 1, height: 6, background: 'var(--line)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--fitness)', transition: 'width 0.25s linear' }} />
            </div>
          </div>
          <button onClick={() => cd.adjust(30)} style={btn}>+30s</button>
          <button onClick={cd.reset} style={{ ...btn, color: 'var(--text-faint)' }}>Skip</button>
        </>
      ) : (
        <>
          <span style={{ fontSize: 13, color: 'var(--text-dim)', marginRight: 'auto' }}>
            Tap to rest
          </span>
          {PRESETS.map(p => (
            <button key={p} onClick={() => pick(p)}
              style={{ ...btn, ...(p === dur ? { borderColor: 'var(--fitness)', color: 'var(--fitness)' } : {}) }}>
              {fmtClock(p)}
            </button>
          ))}
        </>
      )}
    </div>
  )
}

const btn: CSSProperties = {
  background: 'none', border: '1px solid var(--line)', borderRadius: 100,
  padding: '5px 11px', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)',
  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
}
