import type { CSSProperties, ReactNode } from 'react'

interface VoiceLineProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
}

export function VoiceLine({ children, style, className = '' }: VoiceLineProps) {
  return (
    <p className={`voice-line ${className}`} style={style}>
      {children}
    </p>
  )
}
