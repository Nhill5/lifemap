/* Week helpers — Monday-anchored ISO weeks (matches WeekPage). */

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Monday (ISO week start) for any ISO date. */
export function mondayOf(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return fmt(d)
}

/** [Monday, Sunday] ISO bounds for the week containing isoDate. */
export function weekRange(isoDate: string): { start: string; end: string } {
  const start = mondayOf(isoDate)
  const d = new Date(start + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return { start, end: fmt(d) }
}

/* ------------------------------------------------------------------ */
/*  Weekday convention — THE single source of truth.                    */
/*  Canonical codes are JS getDay(): 0=Sun … 6=Sat. All recurrence      */
/*  logic uses these codes. Monday-first is a DISPLAY concern only —    */
/*  use WEEKDAYS_MON_FIRST to render; never re-derive the mapping.      */
/* ------------------------------------------------------------------ */

/** Canonical weekday code for an ISO date: 0=Sun … 6=Sat. */
export function weekdayOf(isoDate: string): number {
  return new Date(isoDate + 'T12:00:00').getDay()
}

/** Monday-first display order, carrying the canonical 0=Sun..6=Sat code. */
export const WEEKDAYS_MON_FIRST: { code: number; short: string }[] = [
  { code: 1, short: 'Mon' }, { code: 2, short: 'Tue' }, { code: 3, short: 'Wed' },
  { code: 4, short: 'Thu' }, { code: 5, short: 'Fri' }, { code: 6, short: 'Sat' },
  { code: 0, short: 'Sun' },
]

/** Repeat presets (canonical codes). */
export const RECUR_DAILY = [0, 1, 2, 3, 4, 5, 6]
export const RECUR_WEEKDAYS = [1, 2, 3, 4, 5]
