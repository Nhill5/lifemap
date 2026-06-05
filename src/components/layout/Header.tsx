import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'

interface HeaderProps {
  gpa?: number | null
  showGpa?: boolean
}

export function Header({ gpa, showGpa = true }: HeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="top">
      <div className="wordmark" onClick={() => navigate('/now')}>
        <div className="mark" />
        <b>
          Life<i>Map</i>
        </b>
      </div>

      <div className="top-right">
        {showGpa && gpa != null && (
          <div className="gpa-pill" onClick={() => navigate('/mirror/weekly')}>
            <span className="n">{gpa.toFixed(1)}</span>
            <span className="l">Life&nbsp;GPA · this week</span>
          </div>
        )}
        <button
          className="icon-btn"
          title="Evening mirror"
          onClick={() => navigate('/mirror/evening')}
        >
          <Icon name="moon" size={17} />
        </button>
        <button
          className="icon-btn"
          title="Settings"
          onClick={() => navigate('/settings')}
        >
          <Icon name="settings" size={17} />
        </button>
      </div>
    </header>
  )
}
