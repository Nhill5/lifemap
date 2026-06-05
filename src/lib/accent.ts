import type { AccentSlot } from '@/types'

/* Returns the CSS variable reference for a bucket's accent color */
export function accent(slot: AccentSlot | string): string {
  return `var(--${slot})`
}

/* Validate that a string is a valid accent slot */
export function isAccentSlot(s: string): s is AccentSlot {
  return ['school', 'work', 'fitness', 'looks', 'hobby'].includes(s)
}

/* Format minutes from midnight to "9:41 AM" */
export function fmtTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const ap = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 || 12
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}

/* Format a BucketState label */
export function stateLabel(state: string): string {
  return state === 'parked' ? 'Resting' : state.charAt(0).toUpperCase() + state.slice(1)
}
