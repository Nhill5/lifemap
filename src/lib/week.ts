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
