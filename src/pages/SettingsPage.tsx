import { AppShell } from '@/components/layout/AppShell'
import { useSettings } from '@/contexts/SettingsContext'
import type { AccountabilityDial } from '@/types'

export function SettingsPage() {
  const { settings, setSetting } = useSettings()

  return (
    <AppShell>
      <div style={{ maxWidth: 540 }}>
        <div style={{ marginBottom: 32 }}>
          <h2
            style={{
              fontFamily: 'var(--font-voice)',
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              marginBottom: 6,
            }}
          >
            Settings
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
            More settings coming as features ship.
          </p>
        </div>

        {/* Accountability dial */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-lg)',
            padding: '22px 24px',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              color: 'var(--text-faint)',
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            Accountability dial
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.5 }}>
            Controls how hard the mirror pushes when you're on-track and drifting.
            Slip &amp; recovery moments stay warm no matter what.
          </p>
          <div className="seg-pills">
            {(['gentle', 'balanced', 'drill'] as AccountabilityDial[]).map(opt => (
              <div
                key={opt}
                className={`seg-pill ${settings.dial === opt ? 'on' : ''}`}
                data-v={opt}
                onClick={() => setSetting('dial', opt)}
                style={settings.dial === opt ? { background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' } : {}}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </div>
            ))}
          </div>
        </div>

        {/* Motion */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-lg)',
            padding: '22px 24px',
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              color: 'var(--text-faint)',
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            Motion
          </div>
          <div className="seg-pills">
            {(['off', 'calm', 'full'] as const).map(opt => (
              <div
                key={opt}
                className={`seg-pill ${settings.motion === opt ? 'on' : ''}`}
                data-v={opt}
                onClick={() => setSetting('motion', opt)}
                style={settings.motion === opt ? { background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' } : {}}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
