export function LoginPage() {
  return (
    <div
      style={{
        maxWidth: 420,
        margin: '0 auto',
        padding: '80px 28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(145deg, var(--school), var(--hobby))',
            boxShadow: '0 0 32px -8px var(--school)',
            margin: '0 auto 20px',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 14,
              borderRadius: 5,
              background: 'var(--bg)',
            }}
          />
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-voice)',
            fontSize: 36,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            marginBottom: 10,
          }}
        >
          Life<i>Map</i>
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>
          A mirror, not a map.
        </p>
      </div>

      {/* PR #2 will render real auth UI here */}
      <div
        style={{
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          padding: '32px 28px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-voice)',
            fontStyle: 'italic',
            fontSize: 17,
            color: 'var(--text-dim)',
            lineHeight: 1.5,
          }}
        >
          Auth coming in PR #2 — Supabase magic-link + OAuth
        </p>
      </div>
    </div>
  )
}
