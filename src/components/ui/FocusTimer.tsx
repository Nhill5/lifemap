import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useCountdown, fmtClock } from '@/hooks/useCountdown'
import { warmAudio } from '@/lib/chime'
import { useAuth } from '@/contexts/AuthContext'

/* App-wide focus timer. Mounted once at the root (App.tsx) so it keeps running
   as you move between pages. Three modes: Pomodoro (focus/break cycles), a
   custom countdown, and a stopwatch. The countdown run is snapshotted to
   localStorage so a full reload restores it. */

type Mode = 'pomodoro' | 'timer' | 'stopwatch'
const SNAP_KEY = 'lm-focus-snapshot'
const TIMER_PRESETS = [5, 10, 15, 25, 45] // minutes
const POMO_FOCUS = 25 * 60
const POMO_BREAK = 5 * 60

interface Snapshot { mode: Mode; endAt: number; total: number; phase: 'focus' | 'break'; round: number }

function readSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(SNAP_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Snapshot
    return s.endAt > Date.now() ? s : null
  } catch { return null }
}

export function FocusTimer() {
  const { user } = useAuth()
  const snap = useRef(readSnapshot()).current

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>(snap?.mode === 'stopwatch' ? 'pomodoro' : (snap?.mode ?? 'pomodoro'))
  const [phase, setPhase] = useState<'focus' | 'break'>(snap?.phase ?? 'focus')
  const [round, setRound] = useState(snap?.round ?? 1)
  const [customMin, setCustomMin] = useState(25)

  const cd = useCountdown({
    restore: snap && snap.mode !== 'stopwatch' ? { endAt: snap.endAt, total: snap.total } : null,
  })

  // Stopwatch — its own count-up clock (useCountdown only counts down).
  const [swElapsed, setSwElapsed] = useState(0)
  const [swRunning, setSwRunning] = useState(false)
  const swStart = useRef<number | null>(null)
  useEffect(() => {
    if (!swRunning) return
    const id = setInterval(() => {
      if (swStart.current != null) setSwElapsed(Math.floor((Date.now() - swStart.current) / 1000))
    }, 250)
    return () => clearInterval(id)
  }, [swRunning])

  // Persist the countdown run so a reload can restore it.
  useEffect(() => {
    try {
      if ((mode === 'pomodoro' || mode === 'timer') && cd.running && cd.remaining > 0) {
        const s: Snapshot = { mode, endAt: Date.now() + cd.remaining * 1000, total: cd.total, phase, round }
        localStorage.setItem(SNAP_KEY, JSON.stringify(s))
      } else if (!cd.running) {
        localStorage.removeItem(SNAP_KEY)
      }
    } catch { /* ignore */ }
  }, [cd.running, cd.remaining, cd.total, mode, phase, round])

  // Pomodoro auto-advance: focus → break → focus, counting rounds.
  useEffect(() => {
    if (!cd.finished || mode !== 'pomodoro') return
    if (phase === 'focus') {
      setPhase('break')
      cd.start(POMO_BREAK)
    } else {
      setPhase('focus')
      setRound(r => r + 1)
      cd.start(POMO_FOCUS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cd.finished])

  function startPomodoro() {
    warmAudio(); setPhase('focus'); setRound(1); cd.start(POMO_FOCUS)
  }
  function startTimer() {
    warmAudio(); cd.start(Math.max(1, Math.round(customMin * 60)))
  }
  function startStopwatch() {
    warmAudio(); swStart.current = Date.now() - swElapsed * 1000; setSwRunning(true)
  }
  function stopStopwatch() { setSwRunning(false) }
  function resetStopwatch() { setSwRunning(false); setSwElapsed(0); swStart.current = null }

  function switchMode(m: Mode) {
    cd.reset(); setSwRunning(false)
    setMode(m)
  }

  const countdownActive = (mode === 'pomodoro' || mode === 'timer') && (cd.running || cd.remaining > 0)
  const stopwatchActive = mode === 'stopwatch' && (swRunning || swElapsed > 0)
  const anyActive = countdownActive || stopwatchActive

  const display = mode === 'stopwatch' ? fmtClock(swElapsed) : fmtClock(cd.remaining)
  const label = mode === 'stopwatch' ? 'Stopwatch' : mode === 'pomodoro' ? `${phase === 'focus' ? 'Focus' : 'Break'} · round ${round}` : 'Timer'
  const pct = mode !== 'stopwatch' && cd.total > 0 ? Math.round((cd.remaining / cd.total) * 100) : 0
  const accent = mode === 'pomodoro' && phase === 'break' ? 'var(--looks)' : 'var(--work)'

  // Only for signed-in users — no timer chrome on login/onboarding.
  if (!user) return null

  // Collapsed: a pill. Shows live time when something's running.
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Focus timer"
        style={{
          position: 'fixed', left: 16, bottom: 16, zIndex: 55,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface)', border: `1px solid ${anyActive ? accent : 'var(--line-strong)'}`,
          borderRadius: 100, padding: anyActive ? '7px 14px' : '9px', cursor: 'pointer',
          boxShadow: '0 6px 22px rgba(0,0,0,0.3)', fontFamily: 'inherit',
          color: anyActive ? accent : 'var(--text-dim)',
        }}
      >
        <span style={{ fontSize: 15, lineHeight: 1 }}>⏱</span>
        {anyActive && (
          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 14 }}>{display}</span>
        )}
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed', left: 16, bottom: 16, zIndex: 55,
        width: 'min(320px, calc(100vw - 32px))',
        background: 'var(--surface)', border: '1px solid var(--line-strong)',
        borderRadius: 'var(--r-md)', padding: 14, boxShadow: '0 10px 36px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', fontWeight: 600 }}>
          Focus timer
        </span>
        <button onClick={() => setOpen(false)} aria-label="Collapse" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>—</button>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['pomodoro', 'timer', 'stopwatch'] as Mode[]).map(m => (
          <button key={m} onClick={() => switchMode(m)}
            style={{
              flex: 1, padding: '6px 4px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              borderRadius: 'var(--r-sm)', border: '1px solid var(--line)',
              background: mode === m ? 'var(--text)' : 'none', color: mode === m ? 'var(--bg)' : 'var(--text-dim)',
              textTransform: 'capitalize',
            }}>
            {m}
          </button>
        ))}
      </div>

      {/* Clock face */}
      <div style={{ textAlign: 'center', padding: '6px 0' }}>
        <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 44, letterSpacing: '-0.02em', color: anyActive ? accent : 'var(--text)' }}>
          {display}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{label}</div>
        {mode !== 'stopwatch' && cd.total > 0 && (
          <div style={{ height: 5, background: 'var(--line)', borderRadius: 100, overflow: 'hidden', marginTop: 10 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: accent, transition: 'width 0.25s linear' }} />
          </div>
        )}
      </div>

      {/* Controls per mode */}
      {mode === 'timer' && !countdownActive && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {TIMER_PRESETS.map(p => (
            <button key={p} onClick={() => setCustomMin(p)}
              style={{ ...pillBtn, ...(customMin === p ? { borderColor: 'var(--work)', color: 'var(--work)' } : {}) }}>
              {p}m
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {mode === 'stopwatch' ? (
          <>
            {!swRunning
              ? <Btn onClick={startStopwatch} primary>{swElapsed > 0 ? 'Resume' : 'Start'}</Btn>
              : <Btn onClick={stopStopwatch}>Pause</Btn>}
            <Btn onClick={resetStopwatch} dim>Reset</Btn>
          </>
        ) : countdownActive ? (
          <>
            {cd.running ? <Btn onClick={cd.pause}>Pause</Btn> : <Btn onClick={cd.resume} primary>Resume</Btn>}
            <Btn onClick={() => cd.adjust(60)} dim>+1m</Btn>
            <Btn onClick={() => { cd.reset(); setPhase('focus'); setRound(1) }} dim>Reset</Btn>
          </>
        ) : (
          <Btn onClick={mode === 'pomodoro' ? startPomodoro : startTimer} primary>
            {mode === 'pomodoro' ? 'Start focus' : `Start ${customMin}m`}
          </Btn>
        )}
      </div>
    </div>
  )
}

function Btn({ children, onClick, primary, dim }: { children: React.ReactNode; onClick: () => void; primary?: boolean; dim?: boolean }) {
  return (
    <button onClick={onClick}
      style={{
        flex: 1, padding: '9px 8px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        borderRadius: 'var(--r-sm)', border: '1px solid var(--line)',
        background: primary ? 'var(--text)' : 'none',
        color: primary ? 'var(--bg)' : dim ? 'var(--text-faint)' : 'var(--text-dim)',
      }}>
      {children}
    </button>
  )
}

const pillBtn: CSSProperties = {
  background: 'none', border: '1px solid var(--line)', borderRadius: 100,
  padding: '5px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)',
  cursor: 'pointer', fontFamily: 'inherit',
}
