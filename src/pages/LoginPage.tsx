import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

type Mode = 'password' | 'signup' | 'magic'

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 15, outline: 'none', boxSizing: 'border-box', width: '100%',
}
const primaryBtn: React.CSSProperties = {
  padding: '12px 0', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--school)',
  color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
}
const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
}

export function LoginPage() {
  const { session, signInWithOtp, signInWithPassword, signUpWithPassword, resetPassword } = useAuth()
  const [mode, setMode]     = useState<Mode>('password')
  const [email, setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null) // "check your email" style

  if (session) return <Navigate to="/now" replace />

  function reset(next: Mode) {
    setMode(next); setErr(null); setNotice(null); setPassword('')
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true); setErr(null); setNotice(null)
    try { await fn() } catch (e) { setErr(e instanceof Error ? e.message : 'Something went wrong') } finally { setBusy(false) }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'password') {
      run(() => signInWithPassword(email.trim(), password))
    } else if (mode === 'signup') {
      run(async () => {
        const { needsConfirm } = await signUpWithPassword(email.trim(), password)
        if (needsConfirm) setNotice(`Account created. Confirm your email (${email}) to finish, then sign in.`)
        // else: session set → AuthContext redirects automatically
      })
    } else {
      run(async () => { await signInWithOtp(email.trim()); setNotice(`We sent a sign-in link to ${email}. Tap it to continue.`) })
    }
  }

  const forgot = () => {
    if (!email.trim()) { setErr('Enter your email first, then tap “Forgot password?”'); return }
    run(async () => { await resetPassword(email.trim()); setNotice(`Password reset link sent to ${email}.`) })
  }

  const title = mode === 'signup' ? 'Create your account' : mode === 'magic' ? 'Email me a link' : 'Welcome back'
  const cta   = busy ? 'Working…' : mode === 'signup' ? 'Create account' : mode === 'magic' ? 'Send magic link' : 'Sign in'
  const canSubmit = mode === 'magic' ? !!email : (!!email && password.length >= 6)

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '80px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, position: 'relative', zIndex: 1 }}>
      {/* Wordmark */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(145deg, var(--school), var(--hobby))', boxShadow: '0 0 32px -8px var(--school)', margin: '0 auto 20px', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 14, borderRadius: 5, background: 'var(--bg)' }} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-voice)', fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 10 }}>
          Life<i>Map</i>
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>A mirror, not a map.</p>
      </div>

      {/* Auth card */}
      <div style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '32px 28px' }}>
        <p style={{ fontFamily: 'var(--font-voice)', fontSize: 18, marginBottom: 18 }}>{title}</p>

        {notice ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.6 }}>{notice}</p>
            <button onClick={() => reset('password')} style={{ ...linkBtn, marginTop: 20, textDecoration: 'underline' }}>
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus autoComplete="email" style={inputStyle} />
            </label>

            {mode !== 'magic' && (
              <label style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                Password
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  required minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  style={inputStyle}
                />
              </label>
            )}

            {err && (
              <p style={{ fontSize: 13, color: 'var(--text-dim)', background: 'color-mix(in srgb, var(--warm) 12%, transparent)', borderRadius: 'var(--r-sm)', padding: '8px 12px' }}>{err}</p>
            )}

            <button type="submit" disabled={busy || !canSubmit} style={{ ...primaryBtn, cursor: busy ? 'wait' : 'pointer', opacity: busy || !canSubmit ? 0.6 : 1 }}>
              {cta}
            </button>

            {/* Mode switches */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 4 }}>
              {mode === 'password' && (
                <>
                  <button type="button" onClick={() => reset('signup')} style={linkBtn}>Create account</button>
                  <button type="button" onClick={forgot} style={linkBtn}>Forgot password?</button>
                  <button type="button" onClick={() => reset('magic')} style={linkBtn}>Email me a link instead</button>
                </>
              )}
              {mode === 'signup' && (
                <button type="button" onClick={() => reset('password')} style={linkBtn}>Already have an account? Sign in</button>
              )}
              {mode === 'magic' && (
                <button type="button" onClick={() => reset('password')} style={linkBtn}>Use a password instead</button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
