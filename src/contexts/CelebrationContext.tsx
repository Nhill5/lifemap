import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type { CelebrationOptions } from '@/types'

interface CelebrationContextValue {
  celebrate: (opts: CelebrationOptions) => void
}

const CelebrationContext = createContext<CelebrationContextValue | null>(null)

export function useCelebration() {
  const ctx = useContext(CelebrationContext)
  if (!ctx) throw new Error('useCelebration must be inside CelebrationProvider')
  return ctx
}

/* Full-screen bloom state — only moment/bloom tier takes the screen */
interface BloomState {
  tier: CelebrationOptions['tier']
  title: string
  sub?: string
  color: string
}

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [bloom, setBloom] = useState<BloomState | null>(null)
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const celebrate = useCallback((opts: CelebrationOptions) => {
    // soft / beat are handled inline by components — only moment/bloom take the overlay
    if (opts.tier === 'soft' || opts.tier === 'beat') return

    if (timerRef.current) clearTimeout(timerRef.current)
    setBloom({
      tier: opts.tier,
      title: opts.title,
      sub: opts.sub,
      color: opts.color ?? 'var(--fitness)',
    })
    setTimeout(() => setShow(true), 20)
  }, [])

  const dismiss = useCallback(() => {
    setShow(false)
    timerRef.current = setTimeout(() => setBloom(null), 450)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <CelebrationContext.Provider value={{ celebrate }}>
      {children}
      {bloom && <BloomOverlay state={bloom} show={show} onDismiss={dismiss} />}
    </CelebrationContext.Provider>
  )
}

/* ---- Bloom overlay component ---- */
function BloomOverlay({
  state,
  show,
  onDismiss,
}: {
  state: BloomState
  show: boolean
  onDismiss: () => void
}) {
  const tierLabel: Record<string, string> = { moment: 'Milestone', bloom: 'Level up' }
  const label = tierLabel[state.tier] ?? 'Nice'

  const particles = Array.from({ length: 16 }, (_, i) => {
    const ang = (i / 16) * Math.PI * 2 + (i % 2 ? 0.3 : 0)
    const dist = 180 + (i % 4) * 60
    return {
      dx: `${Math.cos(ang) * dist}px`,
      dy: `${Math.sin(ang) * dist}px`,
      delay: `${(i % 5) * 0.06}s`,
    }
  })

  return (
    <div
      className={`bloom-overlay ${show ? 'show' : ''}`}
      style={{ '--c': state.color } as CSSProperties}
      onClick={onDismiss}
    >
      <div className="bloom-burst" />
      {particles.map((pt, i) => (
        <div
          key={i}
          className="spark-particle"
          style={{
            left: '50%',
            top: '42%',
            '--dx': pt.dx,
            '--dy': pt.dy,
            animationDelay: pt.delay,
          } as CSSProperties}
        />
      ))}
      <div className="bloom-core">
        <div className="bloom-tier bloom-reveal" style={{ '--bd': '0.15s' } as CSSProperties}>
          {label}
        </div>
        <div className="bloom-title bloom-reveal" style={{ '--bd': '0.28s' } as CSSProperties}>
          {state.title}
        </div>
        {state.sub && (
          <div className="bloom-sub bloom-reveal" style={{ '--bd': '0.42s' } as CSSProperties}>
            {state.sub}
          </div>
        )}
        <div className="bloom-dismiss bloom-reveal" style={{ '--bd': '0.58s' } as CSSProperties}>
          <button
            className="btn accent"
            style={{ '--c': state.color } as CSSProperties}
            onClick={e => { e.stopPropagation(); onDismiss() }}
          >
            Keep going
          </button>
        </div>
      </div>
    </div>
  )
}

