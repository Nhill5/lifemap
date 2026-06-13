import { useState, useEffect, useRef, useCallback } from 'react'
import { chime } from '@/lib/chime'

export interface Countdown {
  /** Whole seconds remaining (0 when idle or finished). */
  remaining: number
  /** Seconds the current run started from (for progress %). */
  total: number
  running: boolean
  /** True for one render-cycle's worth after hitting zero (until reset/start). */
  finished: boolean
  start: (seconds: number) => void
  pause: () => void
  resume: () => void
  reset: () => void
  /** Nudge the current run by ±seconds (e.g. +30). Clamped at 0. */
  adjust: (delta: number) => void
}

/**
 * A drift-free countdown anchored to a wall-clock end time, so it stays correct
 * across re-renders and tab throttling. Fires a chime + haptic at zero.
 *
 * `restore` seeds the timer once on mount (used by the global focus timer to
 * survive a reload): { endAt, total } means "running until endAt".
 */
export function useCountdown(opts?: {
  onFinish?: () => void
  restore?: { endAt: number; total: number } | null
}): Countdown {
  const onFinish = opts?.onFinish
  const restore = opts?.restore

  const [remaining, setRemaining] = useState(0)
  const [total, setTotal] = useState(0)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)

  const endAtRef = useRef<number | null>(null) // ms timestamp when running
  const pausedRef = useRef<number>(0)          // seconds left while paused
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTick = () => { if (tick.current) { clearInterval(tick.current); tick.current = null } }

  const stopAtZero = useCallback(() => {
    clearTick()
    endAtRef.current = null
    pausedRef.current = 0
    setRunning(false)
    setRemaining(0)
    setFinished(true)
    chime()
    onFinish?.()
  }, [onFinish])

  const loop = useCallback(() => {
    clearTick()
    tick.current = setInterval(() => {
      if (endAtRef.current == null) return
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) stopAtZero()
    }, 250)
  }, [stopAtZero])

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) return
    setFinished(false)
    setTotal(seconds)
    setRemaining(seconds)
    endAtRef.current = Date.now() + seconds * 1000
    setRunning(true)
    loop()
  }, [loop])

  const pause = useCallback(() => {
    if (endAtRef.current == null) return
    pausedRef.current = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
    clearTick()
    endAtRef.current = null
    setRunning(false)
    setRemaining(pausedRef.current)
  }, [])

  const resume = useCallback(() => {
    if (running || pausedRef.current <= 0) return
    endAtRef.current = Date.now() + pausedRef.current * 1000
    setRunning(true)
    loop()
  }, [running, loop])

  const reset = useCallback(() => {
    clearTick()
    endAtRef.current = null
    pausedRef.current = 0
    setRunning(false)
    setFinished(false)
    setRemaining(0)
    setTotal(0)
  }, [])

  const adjust = useCallback((delta: number) => {
    if (running && endAtRef.current != null) {
      endAtRef.current = Math.max(Date.now(), endAtRef.current + delta * 1000)
      setRemaining(Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)))
    } else if (pausedRef.current > 0) {
      pausedRef.current = Math.max(0, pausedRef.current + delta)
      setRemaining(pausedRef.current)
    }
    if (delta > 0) setTotal(t => t + delta)
  }, [running])

  // One-time restore (focus timer reload). Runs only on mount.
  useEffect(() => {
    if (!restore) return
    const left = Math.max(0, Math.round((restore.endAt - Date.now()) / 1000))
    if (left <= 0) return
    setTotal(restore.total)
    setRemaining(left)
    endAtRef.current = restore.endAt
    setRunning(true)
    loop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => clearTick, [])

  return { remaining, total, running, finished, start, pause, resume, reset, adjust }
}

/** mm:ss for a second count. */
export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
