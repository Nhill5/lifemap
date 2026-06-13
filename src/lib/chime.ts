// Tiny end-of-timer feedback: a soft two-note chime via Web Audio + a haptic
// buzz where supported. No assets, no autoplay nag (built on a user gesture).

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    return ctx
  } catch {
    return null
  }
}

function beep(ac: AudioContext, freq: number, start: number, dur: number) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  // Quick attack, gentle release — a chime, not an alarm.
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(0.18, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(start)
  osc.stop(start + dur)
}

/** Two ascending notes. Safe to call anytime; silently no-ops if audio is blocked. */
export function chime() {
  const ac = audio()
  if (ac) {
    if (ac.state === 'suspended') ac.resume().catch(() => {})
    const t = ac.currentTime
    beep(ac, 660, t, 0.18)
    beep(ac, 880, t + 0.16, 0.28)
  }
  vibrate([120, 60, 120])
}

/** Haptic feedback where supported (Android/Chrome). iOS Safari ignores it. */
export function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch { /* ignore */ }
}

/** Prime the audio context from within a user gesture so later chimes can play. */
export function warmAudio() {
  const ac = audio()
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {})
}
