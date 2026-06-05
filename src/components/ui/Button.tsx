import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'accent'
  size?: 'default' | 'sm'
  accentColor?: string
  children: ReactNode
}

export function Button({
  variant = 'default',
  size = 'default',
  accentColor,
  className = '',
  style,
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    'btn',
    variant === 'primary' ? 'primary' : '',
    variant === 'accent'  ? 'accent'  : '',
    size === 'sm'         ? 'sm'       : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const s: CSSProperties = {
    ...(variant === 'accent' && accentColor ? { '--c': accentColor } as CSSProperties : {}),
    ...style,
  }

  return (
    <button className={cls} style={s} {...rest}>
      {children}
    </button>
  )
}
