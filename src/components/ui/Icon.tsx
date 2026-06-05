interface IconProps {
  name: string
  size?: number
  stroke?: number
}

export function Icon({ name, size = 18, stroke = 1.8 }: IconProps) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor' as const,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'chevron-left':
      return <svg {...p}><polyline points="15 18 9 12 15 6" /></svg>
    case 'chevron-right':
      return <svg {...p}><polyline points="9 18 15 12 9 6" /></svg>
    case 'plus':
      return <svg {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
    case 'moon':
      return <svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
    case 'grid':
      return (
        <svg {...p}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      )
    case 'menu':
      return (
        <svg {...p}>
          <circle cx="5" cy="12" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="19" cy="12" r="1.4" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...p}>
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="8" y1="2.5" x2="8" y2="6" />
          <line x1="16" y1="2.5" x2="16" y2="6" />
        </svg>
      )
    case 'dumbbell':
      return (
        <svg {...p}>
          <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
          <path d="M4 9 9 4M15 20l5-5" />
          <path d="M2.5 7.5 7.5 2.5M16.5 21.5 21.5 16.5" />
        </svg>
      )
    case 'spark':
      return (
        <svg {...p}>
          <path d="M12 3v18M3 12h18" />
          <path
            d="M12 3c.6 5.4 3.6 8.4 9 9-5.4.6-8.4 3.6-9 9-.6-5.4-3.6-8.4-9-9 5.4-.6 8.4-3.6 9-9z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      )
    case 'settings':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    default:
      return null
  }
}
