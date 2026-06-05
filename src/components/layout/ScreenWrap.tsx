import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ScreenWrapProps {
  routeKey: string
  children: ReactNode
}

export function ScreenWrap({ routeKey, children }: ScreenWrapProps) {
  const [seen, setSeen] = useState(false)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSeen(false)
    rafRef.current = requestAnimationFrame(() =>
      requestAnimationFrame(() => setSeen(true))
    )
    timerRef.current = setTimeout(() => setSeen(true), 80)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [routeKey])

  return (
    <div className={`screen-wrap ${seen ? 'seen' : ''}`}>
      {children}
    </div>
  )
}
