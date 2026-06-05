import { useLocation, useNavigate } from 'react-router-dom'

const ZOOM_TABS = [
  { path: '/now',     label: 'Now' },
  { path: '/day',     label: 'Day' },
  { path: '/week',    label: 'Week' },
  { path: '/buckets', label: 'Buckets' },
]

export function ZoomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) =>
    pathname === path || (path === '/buckets' && pathname.startsWith('/buckets'))

  const currentLabel =
    ZOOM_TABS.find(t => isActive(t.path))?.label ??
    (pathname === '/mirror/weekly' ? 'Weekly Mirror' : null)

  return (
    <div className="nav-row">
      <nav className="seg">
        {ZOOM_TABS.map(tab => (
          <button
            key={tab.path}
            className={isActive(tab.path) ? 'on' : ''}
            onClick={() => navigate(tab.path)}
          >
            {tab.label}
          </button>
        ))}
        <button
          className={`mirror ${pathname === '/mirror/weekly' ? 'on' : ''}`}
          onClick={() => navigate('/mirror/weekly')}
        >
          Weekly Mirror
        </button>
      </nav>

      {currentLabel && (
        <div className="zoom-hint">
          <span>Zoom</span>
          <span className="you-are">
            · you are here:{' '}
            <b style={{ color: 'var(--text)' }}>{currentLabel}</b>
          </span>
        </div>
      )}
    </div>
  )
}
