import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const { session, signInWithOtp } = useAuth()
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState<string | null>(null)

  if (session) return <Navigate to="/now" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await signInWithOtp(email.trim())
      setSent(true)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

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
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-voice)', fontSize: 18, marginBottom: 8 }}>Check your email</p>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.6 }}>
              We sent a sign-in link to <strong>{email}</strong>. Click it to continue — no password needed.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              style={{ marginTop: 20, background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              Email
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: 15, outline: 'none' }}
              />
            </label>

            {err && (
              <p style={{ fontSize: 13, color: 'var(--text-dim)', background: 'color-mix(in srgb, var(--fitness) 10%, transparent)', borderRadius: 'var(--r-sm)', padding: '8px 12px' }}>
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !email}
              style={{ padding: '12px 0', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--school)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy || !email ? 0.6 : 1, transition: 'opacity 0.15s' }}
            >
              {busy ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>

    </div>
  )
}
