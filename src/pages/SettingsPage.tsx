import { useEffect, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { useSettings } from '@/contexts/SettingsContext'
import { useFitbit } from '@/hooks/useFitbit'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { NOTIFICATION_TYPES, DAILY_BUDGET } from '@/lib/notifications'
import type { AccountabilityDial, NotificationType } from '@/types'

function fmtSleep(min: number): string {
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

const cardStyle: CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: 'var(--r-lg)', padding: '22px 24px', marginBottom: 16,
}
const labelStyle: CSSProperties = {
  fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em',
  color: 'var(--text-faint)', fontWeight: 600, marginBottom: 14,
}

export function SettingsPage() {
  const { settings, setSetting } = useSettings()
  const fitbit = useFitbit()
  const [params, setParams] = useSearchParams()

  // Returning from the Fitbit OAuth callback (?fitbit=connected|error)
  useEffect(() => {
    const f = params.get('fitbit')
    if (f === 'connected') { fitbit.refetch() }
    if (f) { params.delete('fitbit'); setParams(params, { replace: true }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const metricRows: { key: keyof typeof fitbit.metrics; label: string; fmt: (v: number) => string }[] = [
    { key: 'steps', label: 'Steps', fmt: v => v.toLocaleString() },
    { key: 'resting_hr', label: 'Resting HR', fmt: v => `${v} bpm` },
    { key: 'sleep', label: 'Sleep', fmt: fmtSleep },
    { key: 'active_minutes', label: 'Active', fmt: v => `${v} min` },
  ]

  // Account / password
  const { user, setPassword } = useAuth()
  const [pwd, setPwd] = useState('')
  const [pwdBusy, setPwdBusy] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<string | null>(null)
  const [pwdErr, setPwdErr] = useState<string | null>(null)

  async function savePassword() {
    if (pwd.length < 6) { setPwdErr('At least 6 characters'); return }
    setPwdBusy(true); setPwdErr(null); setPwdMsg(null)
    try {
      await setPassword(pwd)
      setPwd('')
      setPwdMsg('Password saved. You can sign in with email + password next time.')
    } catch (e) {
      setPwdErr(e instanceof Error ? e.message : 'Could not set password')
    } finally { setPwdBusy(false) }
  }

  // Notifications
  const notif = useNotifications()
  const [morning, setMorning] = useState('07:30')
  const [evening, setEvening] = useState('21:00')
  const [quietStart, setQuietStart] = useState('22:00')
  const [quietEnd, setQuietEnd] = useState('07:00')
  const [savedPrefs, setSavedPrefs] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('notification_windows, quiet_hours').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        const nw = (data?.notification_windows ?? null) as { morning_kickoff?: string; evening_mirror?: string } | null
        const qh = (data?.quiet_hours ?? null) as { start?: string; end?: string } | null
        if (nw?.morning_kickoff) setMorning(nw.morning_kickoff)
        if (nw?.evening_mirror) setEvening(nw.evening_mirror)
        if (qh?.start) setQuietStart(qh.start)
        if (qh?.end) setQuietEnd(qh.end)
      })
  }, [user])

  async function savePrefs() {
    if (!user) return
    await supabase.from('profiles').update({
      notification_windows: { morning_kickoff: morning, evening_mirror: evening },
      quiet_hours: { start: quietStart, end: quietEnd },
    }).eq('id', user.id)
    setSavedPrefs(true)
    setTimeout(() => setSavedPrefs(false), 2000)
  }

  const timeInput: CSSProperties = {
    background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
    padding: '7px 10px', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
    outline: 'none', colorScheme: 'dark',
  }

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

        {/* Account — set a password */}
        <div style={cardStyle}>
          <div style={labelStyle}>Account</div>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.5 }}>
            {user?.email && <>Signed in as <strong>{user.email}</strong>. </>}
            Set a password to sign in instantly next time — no magic-link email.
          </p>
          {pwdErr && <p style={{ fontSize: 13, color: 'var(--warm)', marginBottom: 10 }}>{pwdErr}</p>}
          {pwdMsg && <p style={{ fontSize: 13, color: 'var(--fitness)', marginBottom: 10 }}>{pwdMsg}</p>}
          <div style={{ display: 'flex', gap: 8, maxWidth: 360 }}>
            <input
              type="password" value={pwd} onChange={e => setPwd(e.target.value)}
              placeholder="New password (min 6)" minLength={6} autoComplete="new-password"
              style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '9px 12px', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              onKeyDown={e => e.key === 'Enter' && savePassword()}
            />
            <Button variant="primary" onClick={savePassword} disabled={pwd.length < 6 || pwdBusy}>
              {pwdBusy ? 'Saving…' : 'Set password'}
            </Button>
          </div>
        </div>

        {/* Fitbit */}
        <div style={cardStyle}>
          <div style={labelStyle}>Fitbit</div>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.5 }}>
            Auto-flows steps, sleep, resting HR, and active minutes. Weight feeds your
            fitness chief-goal needle. Tokens are stored encrypted, server-side only.
          </p>

          {fitbit.error && (
            <p style={{ fontSize: 13, color: 'var(--warm)', marginBottom: 12 }}>{fitbit.error}</p>
          )}

          {!fitbit.connected ? (
            <Button variant="primary" onClick={fitbit.connect}>Connect Fitbit</Button>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, color: 'var(--fitness)', fontWeight: 600 }}>✓ Connected</span>
                {fitbit.connection?.last_sync_at && (
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    last synced {new Date(fitbit.connection.last_sync_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <div className="rail" style={{ marginBottom: 16 }}>
                {metricRows.map(m => (
                  <div key={m.key} className="meter" style={{ minWidth: 120 }}>
                    <div className="info">
                      <span className="v">{fitbit.metrics[m.key] != null ? m.fmt(fitbit.metrics[m.key]!) : '—'}</span>
                      <span className="k">{m.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={fitbit.sync} disabled={fitbit.syncing}>
                {fitbit.syncing ? 'Syncing…' : 'Sync now'}
              </Button>
            </>
          )}
        </div>

        {/* Notifications */}
        <div style={cardStyle}>
          <div style={labelStyle}>Notifications</div>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.5 }}>
            At most {DAILY_BUDGET} a day — the app rations itself so it can't nag.
            Install to your Home Screen for push on iOS.
          </p>

          {notif.error && <p style={{ fontSize: 13, color: 'var(--warm)', marginBottom: 12 }}>{notif.error}</p>}

          {!notif.supported ? (
            <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 16 }}>
              This browser doesn't support web push.
            </p>
          ) : notif.subscribed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: 'var(--fitness)', fontWeight: 600 }}>✓ Push enabled</span>
              <Button onClick={notif.disable} disabled={notif.busy}>Turn off</Button>
            </div>
          ) : (
            <div style={{ marginBottom: 18 }}>
              <Button variant="primary" onClick={notif.enable} disabled={notif.busy}>
                {notif.busy ? 'Enabling…' : 'Enable notifications'}
              </Button>
            </div>
          )}

          {/* Timing windows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Morning kickoff
              <input type="time" value={morning} onChange={e => setMorning(e.target.value)} style={{ ...timeInput, display: 'block', marginTop: 5, width: '100%', boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Evening mirror
              <input type="time" value={evening} onChange={e => setEvening(e.target.value)} style={{ ...timeInput, display: 'block', marginTop: 5, width: '100%', boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Quiet hours start
              <input type="time" value={quietStart} onChange={e => setQuietStart(e.target.value)} style={{ ...timeInput, display: 'block', marginTop: 5, width: '100%', boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Quiet hours end
              <input type="time" value={quietEnd} onChange={e => setQuietEnd(e.target.value)} style={{ ...timeInput, display: 'block', marginTop: 5, width: '100%', boxSizing: 'border-box' }} />
            </label>
          </div>
          <Button onClick={savePrefs}>{savedPrefs ? 'Saved ✓' : 'Save timing'}</Button>

          {/* What it spends the budget on */}
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(Object.keys(NOTIFICATION_TYPES) as NotificationType[]).map(t => (
              <div key={t} style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
                <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{NOTIFICATION_TYPES[t].label}</span>
                {' · '}<span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{NOTIFICATION_TYPES[t].tone}</span>
                {' — '}{NOTIFICATION_TYPES[t].desc}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
