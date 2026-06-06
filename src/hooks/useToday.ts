import { useState, useEffect } from 'react'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns today's ISO date (YYYY-MM-DD). Updates at midnight. */
export function useToday(): string {
  const [today, setToday] = useState(todayIso)

  useEffect(() => {
    const now = new Date()
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
    const timer = setTimeout(() => setToday(todayIso()), msUntilMidnight)
    return () => clearTimeout(timer)
  }, [today])

  return today
}

export function isoOffset(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
