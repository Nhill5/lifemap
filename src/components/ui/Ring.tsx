import type { CSSProperties } from 'react'

interface RingProps {
  pct: number    // 0–100
  color: string  // e.g. 'var(--fitness)' or '#4FD6A0'
}

export function Ring({ pct, color }: RingProps) {
  return (
    <div
      className="ring"
      style={{ '--c': color, '--p': pct } as CSSProperties}
    />
  )
}
