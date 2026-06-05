import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'

interface BackBarProps {
  to: string
  label: string
  title?: string
  subtitle?: string
}

export function BackBar({ to, label, title, subtitle }: BackBarProps) {
  const navigate = useNavigate()

  return (
    <div
      className="back-bar reveal"
      style={{ '--d': '0.02s' } as CSSProperties}
    >
      <button className="back-btn" onClick={() => navigate(to)}>
        <span className="chev">
          <Icon name="chevron-left" size={16} />
        </span>
        {label}
      </button>
      {title && (
        <div>
          <div
            style={{
              fontFamily: 'var(--font-voice)',
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{subtitle}</div>
          )}
        </div>
      )}
    </div>
  )
}
