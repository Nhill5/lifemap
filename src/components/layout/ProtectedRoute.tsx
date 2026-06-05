import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps { children: ReactNode }

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading, profile, profileLoading } = useAuth()
  const { pathname } = useLocation()

  if (loading || profileLoading) return null
  if (!session) return <Navigate to="/login" replace />
  if (profile?.onboarding_state !== 'complete' && pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}
