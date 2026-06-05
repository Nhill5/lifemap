import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from './Header'
import { ZoomNav } from './ZoomNav'
import { ScreenWrap } from './ScreenWrap'

const WIDE_ROUTES    = ['/week']
const NO_NAV_ROUTES  = ['/login', '/onboarding']

interface AppShellProps {
  children: ReactNode
  gpa?: number | null
}

export function AppShell({ children, gpa }: AppShellProps) {
  const { pathname } = useLocation()
  const wide  = WIDE_ROUTES.some(r => pathname.startsWith(r))
  const noNav = NO_NAV_ROUTES.some(r => pathname.startsWith(r))

  return (
    <div className={`app ${wide ? 'wide' : ''}`}>
      <Header gpa={gpa} showGpa={!noNav} />
      {!noNav && <ZoomNav />}
      <ScreenWrap routeKey={pathname}>
        {children}
      </ScreenWrap>
    </div>
  )
}
