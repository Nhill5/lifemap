import { useState, useEffect } from 'react'

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Returns current time as "HH:MM", updating every minute. */
export function useClock(): string {
  const [clock, setClock] = useState(nowHHMM)

  useEffect(() => {
    const tick = () => setClock(nowHHMM())
    let intervalId: ReturnType<typeof setInterval> | null = null

    const now = new Date()
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()

    const timeoutId = setTimeout(() => {
      tick()
      intervalId = setInterval(tick, 60_000)
    }, msToNextMinute)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId !== null) clearInterval(intervalId)
    }
  }, [])

  return clock
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 || 12
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}

/** Null-safe range for blocks that may be untimed (§25.4). */
export function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return 'Anytime'
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start)
}

export function addMinutes(hhmm: string, mins: number): string {
  const total = timeToMinutes(hhmm) + mins
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
