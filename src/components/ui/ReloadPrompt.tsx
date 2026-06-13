import { type CSSProperties } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Surfaces a "new version — reload" banner when a fresh deploy is available,
 * so the installed PWA can't get trapped behind a stale cached service worker.
 * Actively polls for updates (on launch, every 60s, and when the app is
 * brought back to the foreground) since iOS standalone PWAs check lazily.
 */
export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      if (!reg) return
      const check = () => { reg.update().catch(() => {}) }
      check()
      setInterval(check, 60_000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  if (!needRefresh) return null

  return (
    <div
      style={{
        position: 'fixed', left: 16, right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom))',
        zIndex: 9999, maxWidth: 460, margin: '0 auto',
        background: 'var(--surface)', border: '1px solid var(--line-strong)',
        borderRadius: 'var(--r-md)', padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        boxShadow: '0 8px 30px -8px rgba(0,0,0,0.5)',
      } as CSSProperties}
    >
      <span style={{ fontSize: 14, color: 'var(--text)' }}>A new version is ready.</span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          background: 'var(--school)', color: '#fff', border: 'none',
          borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}
      >
        Reload
      </button>
    </div>
  )
}
