import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AppSettings } from '@/types'

const STORAGE_KEY = 'lm.settings'

const DEFAULTS: AppSettings = {
  dial: 'balanced',
  motion: 'full',
  atmos: true,
  breathe: true,
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULTS
}

interface SettingsContextValue {
  settings: AppSettings
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(load)

  const setSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--motion', settings.motion === 'calm' ? '0.7' : settings.motion === 'off' ? '0' : '1')
    document.body.classList.toggle('no-motion', settings.motion === 'off')
    document.body.classList.toggle('no-atmos', !settings.atmos)
    document.body.classList.toggle('no-breathe', !settings.breathe)
  }, [settings.motion, settings.atmos, settings.breathe])

  return (
    <SettingsContext.Provider value={{ settings, setSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider')
  return ctx
}
