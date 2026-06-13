import type { NotificationType } from '@/types'

/** Hard daily cap — the app rations itself so it structurally can't nag (§10). */
export const DAILY_BUDGET = 4

export type NotifTone = 'firm' | 'warm' | 'gentle'

/** Each type mapped to the day rhythm + the tone rule (§10, §21 voice). */
export const NOTIFICATION_TYPES: Record<NotificationType, { label: string; tone: NotifTone; desc: string }> = {
  morning_kickoff: { label: 'Morning kickoff', tone: 'firm', desc: 'Pulls you into planning the day.' },
  drift_catch: { label: 'Drift-catch', tone: 'firm', desc: 'The stick — fires at your drift time when you can still act.' },
  slip_catch: { label: 'Slip-catch', tone: 'warm', desc: 'The cascade interrupt — warm, never shaming.' },
  evening_mirror: { label: 'Evening mirror', tone: 'gentle', desc: 'A nudge into the 30-second review.' },
  celebration: { label: 'Celebration', tone: 'warm', desc: 'Dopamine delivery — wins and comebacks.' },
}

/** Whether another notification may be sent today given how many already went out. */
export function withinBudget(sentToday: number): boolean {
  return sentToday < DAILY_BUDGET
}

/** "HH:MM" inside [start, end] quiet window (handles overnight ranges). */
export function inQuietHours(nowHHMM: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false
  if (start <= end) return nowHHMM >= start && nowHHMM < end
  return nowHHMM >= start || nowHHMM < end // overnight, e.g. 22:00–07:00
}

/** VAPID public key (base64url) → Uint8Array for PushManager.subscribe. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
