import type { CSSProperties, ReactNode } from 'react'

interface EyebrowProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
}

export function Eyebrow({ children, style, className = '' }: EyebrowProps) {
  return <span className={`eyebrow ${className}`} style={style}>{children}</span>
}
